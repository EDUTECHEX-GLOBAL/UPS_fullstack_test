import TestScores from '../model/testmodel.js';
import { getPresignedUrl } from '../../middleware/uploadMiddleware.js';

const getUserId = (req) =>
  req.user?.id || req.user?.userId || req.user?._id || req.userId || null;

// Only accept S3 keys that live in this user's own test-scores folder
const isOwnReportKey = (key, userId) =>
  typeof key === 'string' &&
  userId &&
  key.startsWith(`test-scores/${String(userId)}/`);

// -----------------------------------------------------
// GET /test-scores
// -----------------------------------------------------
export const getTestScores = async (req, res) => {
  try {
    const userId = getUserId(req);
    const details = await TestScores.findOne({ userId }).lean();

    if (!details) {
      return res
        .status(200)
        .json({ success: true, data: null, message: 'No test scores found.' });
    }

    // Regenerate fresh presigned URLs from stored S3 keys
    for (const t of details.tests || []) {
      if (t.reportFile?.s3Key) {
        try {
          t.reportFile.fileUrl = await getPresignedUrl(t.reportFile.s3Key, 86400);
        } catch (e) {
          console.error('Presign error:', e);
        }
      }
    }

    res.status(200).json({ success: true, data: details });
  } catch (error) {
    console.error('Error fetching test scores:', error);
    res
      .status(500)
      .json({ success: false, message: 'Server Error', error: error.message });
  }
};

// -----------------------------------------------------
// POST /test-scores/upload   (S3, PDF only, one file)
// Route: auth -> withUpload(testScoreUpload) -> validateFileUpload -> this
// Does NOT touch the AllDocument / Documents collections.
// -----------------------------------------------------
export const uploadTestScoreReport = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: 'No file uploaded' });
    }

    res.status(200).json({
      success: true,
      message: 'Score report uploaded successfully',
      file: {
        fileName: file.originalname,
        originalName: file.originalname,
        fileUrl: file.location || '',
        s3Key: file.key || '',
        bucket: file.bucket || '',
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error uploading test score report:', error);
    res
      .status(500)
      .json({ success: false, message: 'Server Error', error: error.message });
  }
};

// -----------------------------------------------------
// POST /test-scores
// -----------------------------------------------------
export const saveTestScores = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authenticated user ID not found.' });
    }

    const parseJsonField = (value, fallback) => {
      if (typeof value !== 'string') return value ?? fallback;
      try { return JSON.parse(value); } catch { return fallback; }
    };

    // Parse body parameters (supports JSON and FormData bodies)
    let hasNotTaken = req.body.hasNotTaken;
    if (typeof hasNotTaken === 'string') {
      hasNotTaken = hasNotTaken === 'true';
    } else {
      hasNotTaken = Boolean(hasNotTaken);
    }

    let tests = parseJsonField(req.body.tests, []);
    if (!Array.isArray(tests)) {
      tests = [];
    }

    // Accept both the flattened representation and the form's structured
    // fields. The flattened list remains the canonical persisted format.
    if (tests.length === 0 && !hasNotTaken) {
      const languageTest = parseJsonField(req.body.languageTest, null);
      const additionalTests = parseJsonField(req.body.additionalTests, []);
      const structuredTests = [];
      if (languageTest?.exam) {
        structuredTests.push({ ...languageTest, id: 'lang_test', category: 'language' });
      }
      structuredTests.push(...(Array.isArray(additionalTests) ? additionalTests : []).filter((test) => test?.exam).map((test) => ({ ...test, category: 'additional' })));
      tests = structuredTests;
    }

    const str = (v) => String(v ?? '').trim();

    const sanitizedTests = hasNotTaken
      ? []
      : tests
          .filter((t) => t && t.exam && String(t.exam).trim() !== '')
          .map((test, index) => {
            const testId = test.id || String(Date.now() + index);

            // Only accept a reportFile that points at THIS user's own S3 folder.
            // fileUrl is never trusted from the client; it is regenerated on read.
            let reportFile = null;
            if (test.reportFile && typeof test.reportFile === 'object') {
              if (isOwnReportKey(test.reportFile.s3Key, userId)) {
                reportFile = {
                  fileName: str(test.reportFile.fileName || test.reportFile.originalName),
                  originalName: str(test.reportFile.originalName || test.reportFile.fileName),
                  fileUrl: '',
                  s3Key: test.reportFile.s3Key,
                  bucket: str(test.reportFile.bucket),
                  mimeType: str(test.reportFile.mimeType) || 'application/pdf',
                  size: Number(test.reportFile.size) || 0,
                  uploadedAt: test.reportFile.uploadedAt || new Date()
                };
              }
            }

            const verification = test.verification || {
              status: 'Pending',
              extractedScore: null,
              extractedTestDate: null,
              matched: false
            };

            const rawSelected = Array.isArray(test.selectedUniversities)
              ? test.selectedUniversities
              : Array.isArray(test.eligibleUniversities)
              ? test.eligibleUniversities
              : [];

            const selectedUniversities = rawSelected
              .map((u) => ({
                university: String(
                  u.university || u.name || (typeof u === 'string' ? u : '')
                ).trim(),
                country: String(u.country || '').trim(),
                network: String(u.network || '').trim(),
                degreeLevels: String(u.degreeLevels || u.degree || '').trim(),
                minScoreRequired: Number(u.minScoreRequired || 0)
              }))
              .filter((u) => u.university !== '');

            return {
              id: testId,
              // Older saved tests may not include a category. Keep the schema
              // value valid when editing those records and preserve the
              // language test's stable id used by the form.
              category: test.category === 'language' || String(test.id || '') === 'lang_test'
                ? 'language'
                : 'additional',
              exam: str(test.exam),
              score: str(test.score),
              testDate: test.testDate || '',

              // English section scores
              readingScore: str(test.readingScore),
              listeningScore: str(test.listeningScore),
              speakingScore: str(test.speakingScore),
              writingScore: str(test.writingScore),

              // Duolingo
              literacyScore: str(test.literacyScore),
              comprehensionScore: str(test.comprehensionScore),
              conversationScore: str(test.conversationScore),
              productionScore: str(test.productionScore),

              // GRE
              verbalScore: str(test.verbalScore),
              quantitativeScore: str(test.quantitativeScore),
              analyticalWritingScore: str(test.analyticalWritingScore),

              // GMAT
              dataInsightsScore: str(test.dataInsightsScore),

              // SAT / ACT
              readingWritingScore: str(test.readingWritingScore),
              mathScore: str(test.mathScore),
              englishScore: str(test.englishScore),
              scienceScore: str(test.scienceScore),

              // GRE Subject
              subjectName: str(test.subjectName),

              // MCAT
              chemicalPhysicalScore: str(test.chemicalPhysicalScore),
              carsScore: str(test.carsScore),
              biologicalBiochemicalScore: str(test.biologicalBiochemicalScore),
              psychologicalSocialScore: str(test.psychologicalSocialScore),

              // GATE
              paperSubject: str(test.paperSubject),
              gateRank: str(test.gateRank),

              // Percentiles
              percentile: str(test.percentile),
              varcPercentile: str(test.varcPercentile),
              dilrPercentile: str(test.dilrPercentile),
              qaPercentile: str(test.qaPercentile),

              allIndiaRank: str(test.allIndiaRank),
              sjtBand: str(test.sjtBand),

              reportFile,
              selectedUniversities,
              eligibleUniversities: selectedUniversities,
              verification
            };
          });

    const updatedDetails = await TestScores.findOneAndUpdate(
      { userId },
      { hasNotTaken, tests: sanitizedTests, userId, status: 'Completed' },
      { new: true, upsert: true, runValidators: true }
    );

    // Return fresh signed links so a newly uploaded report is immediately
    // available to the review page.
    for (const test of updatedDetails.tests || []) {
      if (test.reportFile?.s3Key) {
        try {
          test.reportFile.fileUrl = await getPresignedUrl(test.reportFile.s3Key, 86400);
        } catch (error) {
          console.error('Presign error after saving test scores:', error);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Test scores saved successfully',
      data: updatedDetails
    });
  } catch (error) {
    console.error('Error saving test scores:', error);
    res
      .status(500)
      .json({ success: false, message: 'Server Error', error: error.message });
  }
};
