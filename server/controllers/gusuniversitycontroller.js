// controllers/gusuniversitycontroller.js

import mongoose from 'mongoose';
import Account from '../models/accountModel.js';
import Overview from '../models/overviewModel.js';

import { sendEmailEnhanced, emailTemplates } from '../utils/sendEmail.js';
import { buildFileUrl } from '../utils/s3FileKey.js';
import {
  fetchEnrollmentList,
  getBachelorApplicationDetail,
  getScoreEligibleBachelorUniversities,
} from '../Enrollment/controllers/enrollmentAdminController.js';
import ProgramSelection from '../Enrollment/model/programmodel.js';
import UniversitySelection from '../Enrollment/model/universityselectionmodel.js';
import TestScores from '../Enrollment/model/testmodel.js';
import FirstYearReview from '../Enrollment/model/reviewmodel.js';

const DOC_FOLDER_MAP = {
    cv: 'documents/cv',
    passport: 'documents/personal',
    cert9th: 'documents/certificates',
    cert10th: 'documents/certificates',
    cert11th: 'documents/certificates',
    cert12th: 'documents/certificates',
    testScores: 'documents/optional',
};

const resolveFileUrl = (fieldObj, folder = '') => {
    if (fieldObj?.fileUrl && /^\/uploads\//.test(fieldObj.fileUrl)) return fieldObj.fileUrl;
    if (fieldObj?.fileUrl && /^https?:\/\//i.test(fieldObj.fileUrl)) return fieldObj.fileUrl;
    if (fieldObj?.fileUrl && /^\/api\/files\//.test(fieldObj.fileUrl)) return fieldObj.fileUrl;
    if (!fieldObj?.fileKey) return fieldObj?.fileUrl || null;
    const { fileKey } = fieldObj;
    if (fileKey) {
        return buildFileUrl(fileKey);
    }
    return null;
};

const fmtDate = (d) => {
    if (!d) return '';
    try { return new Date(d).toISOString().split('T')[0]; }
    catch { return ''; }
};

const toObjectId = (id) => {
    if (!id) return null;
    const s = id.toString().trim();
    if (!mongoose.Types.ObjectId.isValid(s)) return null;
    return new mongoose.Types.ObjectId(s);
};

const normalizeCountry = (value) => String(value || '').trim().toLocaleLowerCase();
const getSelectedStudyCountries = (program = {}) => {
    const selection = program.programSelection || {};
    const countries = Array.isArray(selection.selectedCountries) && selection.selectedCountries.length
        ? selection.selectedCountries
        : Array.isArray(program.selectedCountries) && program.selectedCountries.length
            ? program.selectedCountries
            : [selection.countryName || program.countryName].filter(Boolean);
    return new Set(countries.map(normalizeCountry).filter(Boolean));
};

const getApplicationProgressBucket = (application = {}) => {
    const applicationStatus = String(application.applicationStatus || '').trim().toLowerCase();
    const overviewStatus = String(application.overviewStatus || '').trim().toLowerCase();
    const universitySelectionStatus = String(application.universitySelectionStatus || '').trim().toLowerCase();
    if (
        applicationStatus === 'approved' ||
        (application.programApprovalStatus === 'approved' && universitySelectionStatus === 'completed')
    ) return 'approved';
    if (String(application.programApprovalStatus || '').trim().toLowerCase() === 'approved' || application.isProgramApproved === true) return 'awaiting';
    if (
        Number(application.completionPercentage) >= 100 ||
        application.isCompleted === true ||
        overviewStatus === 'completed' ||
        ['completed', 'submitted for approval', 'under review'].includes(applicationStatus)
    ) return 'completed';
    if (
        Number(application.completionPercentage) > 0 ||
        overviewStatus === 'in_progress' ||
        ['changes requested', 'rejected'].includes(applicationStatus)
    ) return 'inprogress';
    return 'incomplete';
};

export const saveGusUniversitySelection = async (req, res) => {
  try {
    const userId = String(req.body?.studentId || '').trim();
    const requested = req.body?.selectedUniversities;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'A valid student ID is required.' });
    }
    if (!Array.isArray(requested) || requested.length < 1 || requested.length > 5) {
      return res.status(400).json({ success: false, message: 'Select between 1 and 5 universities.' });
    }

    const [program, tests] = await Promise.all([
      ProgramSelection.findOne({ userId }).lean(),
      TestScores.findOne({ userId }).lean(),
    ]);
    if (!program && !tests) return res.status(404).json({ success: false, message: 'Student application was not found.' });
    if (program && program.programApprovalStatus !== 'approved') {
      return res.status(403).json({ success: false, message: 'The application must be approved before selecting universities.' });
    }

    const selectedCountries = getSelectedStudyCountries(program || {});
    const eligible = (tests?.tests || []).flatMap(getScoreEligibleBachelorUniversities)
      .filter((university) => !selectedCountries.size || selectedCountries.has(normalizeCountry(university.country)));
    const eligibleByKey = new Map();
    eligible.forEach((university) => {
      const key = `${university.university.toLowerCase()}|${university.country.toLowerCase()}`;
      const options = eligibleByKey.get(key) || [];
      if (!options.some((option) => option.minScoreRequired === university.minScoreRequired)) options.push(university);
      eligibleByKey.set(key, options);
    });
    const selected = [];
    const seen = new Set();
    for (const item of requested) {
      const name = String(item?.universityName || '').trim();
      const country = String(item?.country || '').trim();
      const key = `${name.toLowerCase()}|${country.toLowerCase()}`;
      const requestedMinimum = Number(item?.minScoreRequired);
      const matches = eligibleByKey.get(key) || [];
      const match = matches.find((university) => !Number.isFinite(requestedMinimum) || requestedMinimum === university.minScoreRequired);
      if (!name || !country || !match) {
        return res.status(400).json({ success: false, message: `University is not eligible for the student's test score: ${name || 'unknown'}.` });
      }
      if (seen.has(key)) return res.status(400).json({ success: false, message: 'Each university can only be selected once.' });
      seen.add(key);
      selected.push({
        universityId: `${name}|${country}`,
        universityName: match.university,
        country: match.country,
        programName: match.programName || '',
        minScoreRequired: match.minScoreRequired,
        degree: 'Bachelor',
      });
    }

    const programType = program?.programSelection?.programType || program?.programType || 'UG';
    const countries = [...new Set(selected.map((university) => university.country))];
    const selection = await UniversitySelection.findOneAndUpdate(
      { userId },
      {
        userId,
        programType,
        selectedCountry: countries.length === 1 ? countries[0] : '',
        selectedUniversities: selected,
        status: 'selected',
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json({ success: true, message: 'University selections saved.', data: selection });
  } catch (error) {
    console.error('saveGusUniversitySelection Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save university selections.' });
  }
};

const resolveDoc = (fieldObj, folder = '') => {
    const hasFile = !!(
        (fieldObj?.fileKey && fieldObj.fileKey.trim() !== '') ||
        (fieldObj?.fileUrl && fieldObj.fileUrl.trim() !== '') ||
        (fieldObj?.fileName && fieldObj.fileName.trim() !== '')
    );
    if (!hasFile) {
        return { uploaded: false, status: 'not_uploaded', fileName: null, fileKey: null, fileUrl: null, originalName: null, fileType: null, fileSize: null, uploadedAt: null };
    }
    return {
        uploaded: true,
        status: fieldObj.documentStatus || 'pending',
        fileName: fieldObj.fileName || null,
        fileKey: fieldObj.fileKey || null,
        fileUrl: resolveFileUrl(fieldObj, folder),
        originalName: fieldObj.originalName || fieldObj.fileName || null,
        fileType: fieldObj.fileType || null,
        fileSize: fieldObj.fileSize || null,
        uploadedAt: fieldObj.uploadedAt || null,
    };
};

const REQUIRED_FIELDS = [
    'cv', 'passport',
    'cert9th', 'cert10th', 'cert11th', 'cert12th',
];

const calcCompletionPct = (docRec) => {
    if (!docRec) return 0;
    const uploadedCount = REQUIRED_FIELDS.filter((field) => {
        const obj = docRec[field];
        return !!(
            (typeof obj?.fileName === 'string' && obj.fileName.trim()) ||
            (typeof obj?.fileUrl === 'string' && obj.fileUrl.trim()) ||
            (typeof obj?.fileKey === 'string' && obj.fileKey.trim())
        );
    }).length;

    // The GUS panel lists uploaded documents only, so report the completion of
    // that displayed set instead of dividing it by hidden, unuploaded slots.
    return uploadedCount > 0 ? 100 : 0;
};

const mapDocuments = (docRec) => {
    const empty = {
        cvUploaded: false, cvStatus: 'not_uploaded', cvMeta: null,
        passportUploaded: false, passportStatus: 'not_uploaded', passportMeta: null,
        cert9thUploaded: false, cert9thStatus: 'not_uploaded', cert9thMeta: null, cert9thExpectedDate: null,
        cert10thUploaded: false, cert10thStatus: 'not_uploaded', cert10thMeta: null, cert10thExpectedDate: null,
        cert11thUploaded: false, cert11thStatus: 'not_uploaded', cert11thMeta: null, cert11thExpectedDate: null,
        cert12thUploaded: false, cert12thStatus: 'not_uploaded', cert12thMeta: null, cert12thExpectedDate: null,
        testScoresUploaded: false, testScoresMeta: null,
        portfolioLink: '',
        docsCompletionPct: 0,
        docsCompleted: false,
    };
    if (!docRec) return empty;

    const cv = resolveDoc(docRec.cv, DOC_FOLDER_MAP.cv);
    const passport = resolveDoc(docRec.passport, DOC_FOLDER_MAP.passport);
    const cert9th = resolveDoc(docRec.cert9th, DOC_FOLDER_MAP.cert9th);
    const cert10th = resolveDoc(docRec.cert10th, DOC_FOLDER_MAP.cert10th);
    const cert11th = resolveDoc(docRec.cert11th, DOC_FOLDER_MAP.cert11th);
    const cert12th = resolveDoc(docRec.cert12th, DOC_FOLDER_MAP.cert12th);
    const testScores = resolveDoc(docRec.testScores, DOC_FOLDER_MAP.testScores);

    const meta = (r) => {
        if (!r.uploaded) return null;
        return { fileName: r.fileName, fileKey: r.fileKey, originalName: r.originalName, fileType: r.fileType, fileSize: r.fileSize, uploadedAt: r.uploadedAt, fileUrl: r.fileUrl };
    };

    return {
        cvUploaded: cv.uploaded, cvStatus: cv.status, cvMeta: meta(cv),
        passportUploaded: passport.uploaded, passportStatus: passport.status, passportMeta: meta(passport),
        cert9thUploaded: cert9th.uploaded, cert9thStatus: cert9th.status, cert9thMeta: meta(cert9th), cert9thExpectedDate: docRec.cert9th_expectedDate || null,
        cert10thUploaded: cert10th.uploaded, cert10thStatus: cert10th.status, cert10thMeta: meta(cert10th), cert10thExpectedDate: docRec.cert10th_expectedDate || null,
        cert11thUploaded: cert11th.uploaded, cert11thStatus: cert11th.status, cert11thMeta: meta(cert11th), cert11thExpectedDate: docRec.cert11th_expectedDate || null,
        cert12thUploaded: cert12th.uploaded, cert12thStatus: cert12th.status, cert12thMeta: meta(cert12th), cert12thExpectedDate: docRec.cert12th_expectedDate || null,
        testScoresUploaded: testScores.uploaded, testScoresMeta: meta(testScores),
        portfolioLink: docRec.portfolioLink || '',
        docsCompletionPct: calcCompletionPct(docRec),
        docsCompleted: docRec.isCompleted || false,
    };
};

/* =====================================================
   GET ALL GUS UNIVERSITY APPLICATIONS
===================================================== */
export const getGusUniversityApplications = async (req, res) => {
    try {
        const { page = 1, limit = 50, status, search, type, programType } = req.query;
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.max(parseInt(limit, 10) || 50, 1);
        const skip = (pageNum - 1) * limitNum;

        const reqType = type || programType || 'bachelors';

        // GUS status tabs represent application completion, not the separate
        // university/program approval state stored in programApprovalStatus.
        let filtered = await fetchEnrollmentList(reqType, 'all', search);
        if (status && status !== 'all') {
            const requestedBucket = String(status).trim().toLowerCase();
            if (['approved', 'completed', 'incomplete', 'inprogress'].includes(requestedBucket)) {
                filtered = filtered.filter((application) => getApplicationProgressBucket(application) === requestedBucket);
            }
        }

        filtered.sort(
            (a, b) =>
                new Date(b.submittedAt || b.updatedAt || b.createdAt || 0) -
                new Date(a.submittedAt || a.updatedAt || a.createdAt || 0)
        );

        const total = filtered.length;
        const applications = filtered.slice(skip, skip + limitNum);

        return res.status(200).json({
            success: true,
            data: applications,
            pagination: {
                total,
                page: pageNum,
                pages: Math.ceil(total / limitNum),
                limit: limitNum,
            },
        });
    } catch (error) {
        console.error('getGusUniversityApplications Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch GUS University applications.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

/* =====================================================
   GET SINGLE APPLICATION DETAIL
===================================================== */
export const getGusUniversityApplicationById = async (req, res) => {
  try {
    const { studentId } = req.params;
    req.params.userId = studentId;

    const originalJson = res.json;
    res.json = function (data) {
      if (data && data.success && data.data && data.data.documents) {
        const rawDocs = data.data.documents;
        
        const mapIfPresent = (...keys) => {
          for (const key of keys) {
            const doc = rawDocs[key];
            if (!doc) continue;
            const fileName = doc.fileName || doc.originalName || doc.file || '';
            const fileUrl = doc.fileUrl || doc.url || '';
            const fileKey = doc.fileKey || doc.s3Key || '';
            if (!fileName && !fileUrl && !fileKey) continue;
            return {
              fileName,
              originalName: doc.originalName || doc.file || fileName,
              fileUrl,
              fileKey,
              fileType: doc.fileType || doc.mimeType || '',
              fileSize: doc.fileSize || doc.size || 0,
              uploadedAt: doc.uploadedAt || null,
              documentStatus: doc.documentStatus || (doc.status === 'Uploaded' ? 'pending' : 'pending')
            };
          }
          return null;
        };

        let testScoresDoc = mapIfPresent('doc-test') || mapIfPresent('doc-testScores') || mapIfPresent('testScores');
        
        if (!testScoresDoc && data.data) {
          const testsArr = (data.data.scores?.tests && data.data.scores.tests.length)
            ? data.data.scores.tests
            : (data.data.testScores || []);
            
          const firstReport = testsArr.find(t => t.reportFile && (t.reportFile.fileName || t.reportFile.fileUrl || typeof t.reportFile === 'string'));
          if (firstReport) {
            const rf = firstReport.reportFile;
            const fileName = typeof rf === 'string' ? rf : (rf.fileName || rf.originalname || rf.name || '');
            const fileUrl = typeof rf === 'string' ? `/uploads/test-scores/${rf}` : (rf.fileUrl || '');
            const fileKey = typeof rf === 'string' ? '' : (rf.s3Key || rf.fileKey || '');
            if (fileName || fileUrl) {
              testScoresDoc = {
                fileName,
                fileUrl,
                fileKey,
                documentStatus: 'approved'
              };
            }
          }
        }

        const personalPassport = data.data.personal?.passportDoc;
        if (personalPassport && !rawDocs.passport) rawDocs.passport = personalPassport;
        const translatedDocs = {
          passport: mapIfPresent('passport', 'doc-passport'),
          cv: mapIfPresent('cv', 'doc-cv'),
          cert9th: mapIfPresent('cert9th', 'grade9', 'doc-9th'),
          cert10th: mapIfPresent('cert10th', 'grade10', 'doc-10th'),
          cert11th: mapIfPresent('cert11th', 'grade11', 'doc-11th'),
          cert12th: mapIfPresent('cert12th', 'grade12', 'doc-12th'),
          testScores: testScoresDoc,
        };

        const docRecToMap = { ...rawDocs };
        Object.entries(translatedDocs).forEach(([key, value]) => {
          if (value) docRecToMap[key] = value;
        });
        data.data.documents = mapDocuments(docRecToMap);
      }
      return originalJson.call(this, data);
    };

    return getBachelorApplicationDetail(req, res);
  } catch (error) {
    console.error('getGusUniversityApplicationById Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch application detail.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/* =====================================================
   GET STATS SUMMARY
===================================================== */
export const getGusUniversityStats = async (req, res) => {
    try {
        const apps = await fetchEnrollmentList('bachelors', 'all', '').catch(() => []);
        const total = apps.length;
        const approved = apps.filter(a => getApplicationProgressBucket(a) === 'approved').length;
        const awaitingUniversities = apps.filter(a => getApplicationProgressBucket(a) === 'awaiting').length;
        const completed = apps.filter(a => getApplicationProgressBucket(a) === 'completed').length;
        const incomplete = apps.filter(a => a.overviewStatus === 'rejected' || a.programApprovalStatus === 'rejected').length;
        const underReview = total - completed - approved - awaitingUniversities - incomplete;

        return res.status(200).json({
            success: true,
            stats: { total, approved, completed, awaitingUniversities, incomplete, underReview: underReview > 0 ? underReview : 0 },
        });
    } catch (error) {
        console.error('getGusUniversityStats Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch stats.',
            error: error.message,
        });
    }
};

/* =====================================================
   SEND DOCUMENT RE-UPLOAD EMAIL
===================================================== */
export const sendDocumentReuploadEmail = async (req, res) => {
    try {
        const { studentId, studentName, studentEmail, documentLabel, reason, adminNotes } = req.body;

        if (!studentEmail || !documentLabel) {
            return res.status(400).json({
                success: false,
                message: 'studentEmail and documentLabel are required.',
            });
        }

        const template = emailTemplates.documentCorrection({
            studentName: studentName || 'Student',
            documentName: documentLabel,
            documentType: documentLabel,
            reason: reason || 'other',
            adminNotes: adminNotes || '',
            deadlineDays: 7,
        });

        const result = await sendEmailEnhanced({
            to: studentEmail,
            subject: template.subject,
            html: template.html,
        });

        if (!result.success) {
            console.error('Email send failed:', result.error);
            return res.status(500).json({
                success: false,
                message: `Failed to send email: ${result.error}`,
            });
        }

        return res.status(200).json({
            success: true,
            message: `Email sent successfully to ${studentEmail}`,
            messageId: result.messageId,
        });

    } catch (error) {
        console.error('sendDocumentReuploadEmail Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to send email.' });
    }
};

/* =====================================================
   APPROVE PROGRAM SELECTION
===================================================== */
export const approveProgramSelection = async (req, res) => {
    try {
        const { studentId } = req.body;
        if (!studentId) {
            return res.status(400).json({ success: false, message: 'studentId is required' });
        }

        const account = await Account.findById(studentId);
        if (!account) {
            return res.status(404).json({ success: false, message: 'Student account not found.' });
        }

        const approvedAt = new Date();
        const programType = account.applyingFor || 'bachelors';
        const program = await ProgramSelection.findOneAndUpdate(
            { userId: account._id },
            {
                $set: {
                    programType,
                    programApprovalStatus: 'approved',
                    approvedAt,
                    approvedBy: req.user?.name || req.user?.email || 'Process Admin',
                },
                $setOnInsert: {
                    userId: account._id,
                    programSelection: { programType, selectedCountries: [], countryName: '' },
                    selectedCountries: [],
                    countryName: '',
                    status: 'Completed',
                },
            },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );

        const sel = program.programSelection || {};
        const primaryCountry = sel.countryName || (Array.isArray(sel.selectedCountries) && sel.selectedCountries[0]);
        if (primaryCountry) {
          await UniversitySelection.findOneAndUpdate(
            { userId: program.userId },
            {
              $setOnInsert: {
                userId: program.userId,
                programType: sel.programType || program.programType,
                selectedCountry: primaryCountry,
                selectedUniversities: [],
                status: 'selected'
              }
            },
            { upsert: true, new: true }
          );
        }

        await Account.updateOne(
            { _id: account._id },
            { $set: { applicationStatus: 'University Selection Pending', isLocked: false } }
        );
        account.applicationStatus = 'University Selection Pending';
        account.isLocked = false;
        await FirstYearReview.findOneAndUpdate(
          { userId: account._id },
          { $set: { userId: account._id, status: 'In Review', submittedAt: account.submittedAt || new Date() } },
          { upsert: true, new: true }
        );

        return res.json({
            success: true,
            message: 'Program approved. The student can now select universities.',
            data: program,
            applicationStatus: account.applicationStatus
        });
    } catch (error) {
        console.error('approveProgramSelection Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to approve program selection.' });
    }
};

export const approveGusUniversitySelection = async (req, res) => {
  try {
    const studentId = String(req.body?.studentId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: 'A valid student ID is required.' });
    }
    const account = await Account.findById(studentId);
    if (!account) return res.status(404).json({ success: false, message: 'Student account not found.' });

    const [program, selection] = await Promise.all([
      ProgramSelection.findOne({ userId: account._id }).lean(),
      UniversitySelection.findOne({ userId: account._id }),
    ]);
    if (!program || program.programApprovalStatus !== 'approved') {
      return res.status(409).json({ success: false, message: 'Approve the program before approving university selections.' });
    }
    if (!selection || !Array.isArray(selection.selectedUniversities) ||
        selection.selectedUniversities.length < 1 || selection.selectedUniversities.length > 5) {
      return res.status(400).json({ success: false, message: 'Save between 1 and 5 universities before final approval.' });
    }

    selection.status = 'Completed';
    await selection.save();
    account.applicationStatus = 'Approved';
    account.isLocked = true;
    await account.save();
    await FirstYearReview.findOneAndUpdate(
      { userId: account._id },
      { $set: { userId: account._id, status: 'Approved', submittedAt: account.submittedAt || new Date() } },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'University selection approved. The student can now access the dashboard.',
      applicationStatus: account.applicationStatus,
    });
  } catch (error) {
    console.error('approveGusUniversitySelection Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve university selections.' });
  }
};
