import AdditionalDocument from '../model/additionaldocumentmodel.js';
import FirstYearProgramSelection from '../model/programmodel.js';
import EnrollmentDocuments from '../model/documentmodel.js';
import EducationDetails from '../model/educationmodel.js';
import AllDocument from '../../models/AllDocumentModel.js';
import { getPresignedUrl, deleteFile } from '../../middleware/uploadMiddleware.js';
import { extractS3Key } from './universityreviewcontroller.js';

// Normalize studyType values across different frontend representations
const normalizeStudyType = (typeStr) => {
  if (!typeStr) return 'Bachelor';
  const key = String(typeStr).trim().toLowerCase();
  if (key.includes('med') || key === 'mbbs') return 'Medical';
  if (key.includes('master') || key === 'pg' || key === 'masters') return 'Master';
  return 'Bachelor';
};

// Study-specific checklist items. CV and photo are shared across all study types.
const DOCUMENT_CONFIGS = {
  Bachelor: [
    {
      documentType: 'lor',
      documentName: 'Recommendation Letter (LOR)',
      required: true,
      conditional: false,
      description: 'Academic or character recommendation from a teacher or principal.'
    },
    {
      documentType: 'sop',
      documentName: 'Statement of Purpose / Motivation Letter',
      required: true,
      conditional: false,
      description: 'Personal essay outlining your academic goals and motivation.'
    },
    {
      documentType: 'schoolLeavingCert',
      documentName: 'School Leaving Certificate',
      required: false,
      conditional: false,
      description: 'Official leaving or completion certificate from high school.'
    },
    {
      documentType: 'transferCert',
      documentName: 'Transfer Certificate',
      required: false,
      conditional: false,
      description: 'Official transfer document issued by your previous institution.'
    },
    {
      documentType: 'portfolio',
      documentName: 'Portfolio',
      required: false,
      conditional: true,
      conditionText: 'Recommended for Fine Arts, Architecture, and Design applicants.',
      description: 'Collection of creative work or design projects.'
    },
    {
      documentType: 'gapCert',
      documentName: 'Gap Certificate / Gap Explanation',
      required: false,
      conditional: true,
      conditionText: 'Required if you have a gap of 1+ year(s) after high school.',
      description: 'Affidavit or letter explaining any study gap period.'
    },
    {
      documentType: 'financialDocs',
      documentName: 'Financial Documents',
      required: false,
      conditional: true,
      conditionText: 'Required for student visa and financial aid verification.',
      description: 'Bank statements or sponsorship declaration.'
    },
    {
      documentType: 'otherUnivDoc',
      documentName: 'Other University-Specific Document',
      required: false,
      conditional: false,
      description: 'Any additional document requested by your target university.'
    }
  ],
  Medical: [
    {
      documentType: 'medicalFitness',
      documentName: 'Medical Fitness Certificate',
      required: true,
      conditional: false,
      description: 'Signed fitness certificate from a registered medical practitioner.'
    },
    {
      documentType: 'vaccinationRecord',
      documentName: 'Vaccination / Immunization Record',
      required: true,
      conditional: false,
      description: 'Official immunization chart (Hepatitis B, MMR, COVID-19, etc.).'
    },
    {
      documentType: 'lor',
      documentName: 'Recommendation Letter (LOR)',
      required: true,
      conditional: false,
      description: 'Recommendation letter from a science professor or physician.'
    },
    {
      documentType: 'sop',
      documentName: 'Statement of Purpose / Motivation Letter',
      required: true,
      conditional: false,
      description: 'Statement explaining your motivation to pursue medicine.'
    },
    {
      documentType: 'gapCert',
      documentName: 'Gap Certificate / Gap Explanation',
      required: false,
      conditional: true,
      conditionText: 'Required if you have a gap after high school/secondary school.',
      description: 'Affidavit or explanation for academic gap period.'
    },
    {
      documentType: 'financialDocs',
      documentName: 'Financial Documents',
      required: false,
      conditional: true,
      conditionText: 'Required for visa processing and financial proof.',
      description: 'Bank statement or financial guarantee document.'
    },
    {
      documentType: 'otherMedicalDoc',
      documentName: 'Other Medical-Specific Document',
      required: false,
      conditional: false,
      description: 'Hospital internship or clinical observation certificates.'
    },
    {
      documentType: 'otherUnivDoc',
      documentName: 'Other University-Specific Document',
      required: false,
      conditional: false,
      description: 'Any specific form requested by the medical university.'
    }
  ],
  Master: [
    {
      documentType: 'bachelorDegree',
      documentName: "Bachelor's Degree Certificate",
      required: true,
      conditional: false,
      description: "Official Bachelor's degree diploma or graduation certificate."
    },
    {
      documentType: 'bachelorTranscript',
      documentName: "Bachelor's Transcript",
      required: true,
      conditional: false,
      description: 'Official academic transcript containing grade history.'
    },
    {
      documentType: 'consolidatedMarksheet',
      documentName: "Consolidated Bachelor's Mark Sheet",
      required: false,
      conditional: false,
      description: 'Consolidated statement of marks for all semesters.'
    },
    {
      documentType: 'semesterMarksheets',
      documentName: 'Semester-wise Mark Sheets',
      required: false,
      conditional: false,
      description: 'Individual semester or annual mark sheets.'
    },
    {
      documentType: 'provisionalCert',
      documentName: 'Provisional Degree Certificate',
      required: false,
      conditional: false,
      description: 'Provisional certificate if final degree is awaiting convocation.'
    },
    {
      documentType: 'lor',
      documentName: 'Recommendation Letter (LOR)',
      required: true,
      conditional: false,
      description: 'Letters of recommendation from university professors or employers.'
    },
    {
      documentType: 'sop',
      documentName: 'Statement of Purpose (SOP)',
      required: true,
      conditional: false,
      description: 'Comprehensive SOP highlighting research interest and career goals.'
    },
    {
      documentType: 'workExpCert',
      documentName: 'Work Experience Certificate',
      required: false,
      conditional: true,
      conditionText: 'Recommended for MBA and Executive Master programs.',
      description: 'Relieving letter or work experience certificate from employer.'
    },
    {
      documentType: 'internshipCert',
      documentName: 'Internship Certificate',
      required: false,
      conditional: false,
      description: 'Certificate of completion for undergraduate internships.'
    },
    {
      documentType: 'researchProposal',
      documentName: 'Research Proposal',
      required: false,
      conditional: true,
      conditionText: 'Required for MS by Research and Thesis Master programs.',
      description: 'Detailed proposal of research topic and methodology.'
    },
    {
      documentType: 'portfolio',
      documentName: 'Portfolio',
      required: false,
      conditional: true,
      conditionText: 'Recommended for Design, Arts, and Architecture applicants.',
      description: 'Portfolio of professional or academic projects.'
    },
    {
      documentType: 'gapCert',
      documentName: 'Gap Certificate / Gap Explanation',
      required: false,
      conditional: true,
      conditionText: 'Required if there is a gap between graduation and application.',
      description: 'Explanation letter or affidavit for gap years.'
    },
    {
      documentType: 'financialDocs',
      documentName: 'Financial Documents',
      required: false,
      conditional: true,
      conditionText: 'Required for visa processing and financial proof.',
      description: 'Bank statements or financial affidavit.'
    },
    {
      documentType: 'otherUnivDoc',
      documentName: 'Other University-Specific Document',
      required: false,
      conditional: false,
      description: 'Any additional document specified by the graduate school.'
    }
  ]
};

const COMMON_DOCUMENT_CONFIG = [
  {
    documentType: 'cv',
    documentName: 'CV / Resume',
    required: true,
    conditional: false,
    description: 'Upload your current curriculum vitae or resume.'
  },
  {
    documentType: 'photo',
    documentName: 'Photograph',
    required: true,
    conditional: false,
    description: 'Upload a recent passport-style photograph.'
  }
];

const getAuthenticatedUserId = (req) => {
  return req.userId || req.user?.id || req.user?.userId || req.user?._id || null;
};

// 1. GET /config - Return checklist configuration for study type
export const getAdditionalDocumentsConfig = async (req, res) => {
  try {
    let studyType = req.query.studyType;
    
    // Auto-detect from student's program selection if studyType not provided in query
    if (!studyType) {
      const userId = getAuthenticatedUserId(req);
      if (userId) {
        const progDoc = await FirstYearProgramSelection.findOne({ userId }).lean();
        if (progDoc?.programType) {
          studyType = progDoc.programType;
        }
      }
    }

    const normalizedType = normalizeStudyType(studyType);
    const config = [...COMMON_DOCUMENT_CONFIG, ...(DOCUMENT_CONFIGS[normalizedType] || DOCUMENT_CONFIGS.Bachelor)];

    return res.status(200).json({
      success: true,
      studyType: normalizedType,
      documents: config
    });
  } catch (error) {
    console.error('getAdditionalDocumentsConfig error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch document configuration.', error: error.message });
  }
};

// 2. GET / - Return uploaded additional documents for authenticated user
export const getAdditionalDocuments = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User authentication required.' });
    }

    let studyType = req.query.studyType;
    if (!studyType) {
      const progDoc = await FirstYearProgramSelection.findOne({ userId }).lean();
      if (progDoc?.programType) {
        studyType = progDoc.programType;
      }
    }
    const normalizedType = normalizeStudyType(studyType);
    const config = [...COMMON_DOCUMENT_CONFIG, ...(DOCUMENT_CONFIGS[normalizedType] || DOCUMENT_CONFIGS.Bachelor)];

    const [uploadedDocs, legacyDocuments, enrollmentDocuments, educationDetails] = await Promise.all([
      AdditionalDocument.find({ userId, studyType: normalizedType }).lean(),
      AllDocument.findOne({ userId }).sort({ createdAt: -1 }).lean(),
      EnrollmentDocuments.findOne({ userId }).lean(),
      EducationDetails.findOne({ userId }).lean()
    ]);

    const configuredTypes = new Set(config.map((item) => item.documentType));
    const classifyLegacyDocument = (documentType, file) => {
      const name = String(file?.originalName || file?.fileName || '').toLowerCase();
      if (/(?:bachelor|undergraduate|\bug\b).*(?:transcript|marksheet)|(?:transcript|marksheet).*(?:bachelor|undergraduate|\bug\b)/i.test(name)) return 'bachelorTranscript';
      if (/(?:bachelor|undergraduate|\bug\b).*(?:certificate|degree)|(?:certificate|degree).*(?:bachelor|undergraduate|\bug\b)/i.test(name)) return 'bachelorDegree';
      if (/transfer.*(?:certificate|cert)|(?:certificate|cert).*transfer/i.test(name)) return 'transferCert';
      return documentType;
    };

    // Map uploaded records by documentType
    const uploadedMap = {};
    for (const doc of uploadedDocs) {
      let fileUrl = doc.file?.fileUrl || null;
      const s3Key = extractS3Key(doc.file);
      if (s3Key) {
        try {
          fileUrl = await getPresignedUrl(s3Key, 86400);
        } catch (err) {
          console.error('Presigned URL error for additional doc:', err);
        }
      }
      const normalizedDocumentKey = doc.documentType === 'doc-cv' ? 'cv'
        : doc.documentType === 'doc-photo' ? 'photo' : doc.documentType;
      const displayDocumentKey = classifyLegacyDocument(normalizedDocumentKey, doc.file);
      uploadedMap[displayDocumentKey] = {
        _id: doc._id,
        status: doc.status || 'Uploaded',
        file: doc.file ? {
          originalName: doc.file.originalName || doc.file.fileName,
          fileName: doc.file.fileName,
          fileUrl,
          s3Key: doc.file.s3Key,
          size: doc.file.size ? (doc.file.size / (1024 * 1024)).toFixed(2) + ' MB' : '',
          mimeType: doc.file.mimeType,
          uploadedAt: doc.file.uploadedAt
        } : null,
        updatedAt: doc.updatedAt
      };
    }

    // Degree and transcript files uploaded in the Education step are stored on
    // EducationDetails, not AdditionalDocument. Let those files satisfy the
    // matching checklist items so students are not asked to upload them twice.
    const educationChecklistFiles = normalizedType === 'Master'
      ? [
          ['bachelorDegree', educationDetails?.masterDetails?.degreeDoc],
          ['bachelorTranscript', educationDetails?.masterDetails?.transcriptDoc]
        ]
      : normalizedType === 'Medical'
        ? [['medicalAcademicDocument', educationDetails?.medicalDetails?.academicDoc]]
        : [
            ['cert12th', educationDetails?.bachelorDetails?.certificateDoc],
            ['collegeTranscript', educationDetails?.transferDetails?.transcriptDoc]
          ];
    for (const [documentType, file] of educationChecklistFiles) {
      if (!configuredTypes.has(documentType) || uploadedMap[documentType] || !file ||
          !(file.fileName || file.originalName || file.fileKey || file.s3Key || file.fileUrl)) continue;
      const s3Key = extractS3Key(file);
      let fileUrl = file.fileUrl || '';
      if (s3Key) {
        try { fileUrl = await getPresignedUrl(s3Key, 86400); }
        catch (error) { console.error(`Presigned URL error for education ${documentType}:`, error); }
      }
      uploadedMap[documentType] = {
        _id: null,
        status: 'Uploaded',
        file: {
          originalName: file.originalName || file.fileName || `${documentType} file`,
          fileName: file.fileName || file.originalName || `${documentType} file`,
          fileUrl,
          s3Key: s3Key || file.fileKey || '',
          size: file.size || file.fileSize
            ? `${((file.size || file.fileSize) / (1024 * 1024)).toFixed(2)} MB`
            : '',
          mimeType: file.mimeType || file.fileType || '',
          uploadedAt: file.uploadedAt || null
        },
        updatedAt: file.uploadedAt || null
      };
    }

    // Common documents may have been uploaded during account creation or in
    // the original enrollment document flow. Keep showing those files until
    // the student replaces them through this checklist.
    const legacySources = [
      legacyDocuments?.uploadedDocuments || {},
      enrollmentDocuments?.documents || {}
    ];
    // Older document upload mappings stored degree/transcript files in the
    // CV or grade 12 slots. Route recognizable filenames to their real cards.
    for (const source of legacySources) {
      for (const [sourceKey, file] of Object.entries(source)) {
        if (!file || !(file.fileName || file.originalName || file.s3Key || file.fileKey || file.fileUrl)) continue;
        const targetKey = classifyLegacyDocument(sourceKey, file);
        if (targetKey === sourceKey || !configuredTypes.has(targetKey) || uploadedMap[targetKey]) continue;
        const s3Key = extractS3Key(file);
        let fileUrl = file.fileUrl || '';
        if (s3Key) {
          try { fileUrl = await getPresignedUrl(s3Key, 86400); }
          catch (error) { console.error(`Presigned URL error for legacy ${targetKey}:`, error); }
        }
        uploadedMap[targetKey] = {
          _id: null,
          status: 'Uploaded',
          file: {
            originalName: file.originalName || file.fileName || `${targetKey} file`,
            fileName: file.fileName || file.originalName || `${targetKey} file`,
            fileUrl,
            s3Key,
            size: file.size || file.fileSize ? `${((file.size || file.fileSize) / (1024 * 1024)).toFixed(2)} MB` : '',
            mimeType: file.mimeType || file.fileType || '',
            uploadedAt: file.uploadedAt || null
          },
          updatedAt: file.uploadedAt || null
        };
      }
    }
    const legacyAliases = { cv: ['cv', 'doc-cv', 'resume'], photo: ['photo', 'doc-photo', 'photograph'] };
    for (const [documentType, aliases] of Object.entries(legacyAliases)) {
      if (uploadedMap[documentType]) continue;
      const file = legacySources.flatMap((source) => aliases.map((alias) => source?.[alias])).find((candidate) =>
        candidate && classifyLegacyDocument(documentType, candidate) === documentType &&
        (candidate.fileName || candidate.originalName || candidate.s3Key || candidate.fileKey || candidate.fileUrl)
      );
      if (!file) continue;
      const s3Key = extractS3Key(file);
      let fileUrl = file.fileUrl || '';
      if (s3Key) {
        try { fileUrl = await getPresignedUrl(s3Key, 86400); }
        catch (error) { console.error(`Presigned URL error for legacy ${documentType}:`, error); }
      }
      uploadedMap[documentType] = {
        _id: null,
        status: 'Uploaded',
        file: {
          originalName: file.originalName || file.fileName || `${documentType} file`,
          fileName: file.fileName || file.originalName || `${documentType} file`,
          fileUrl,
          s3Key,
          size: file.size || file.fileSize
            ? `${((file.size || file.fileSize) / (1024 * 1024)).toFixed(2)} MB`
            : '',
          mimeType: file.mimeType || file.fileType || '',
          uploadedAt: file.uploadedAt || null
        },
        updatedAt: file.uploadedAt || null
      };
    }

    // Merge configuration with user upload status
    const result = config.map(item => {
      const uploaded = uploadedMap[item.documentType] || null;
      return {
        ...item,
        status: uploaded ? uploaded.status : 'Not Uploaded',
        file: uploaded?.file || null,
        docId: uploaded?._id || null,
        updatedAt: uploaded?.updatedAt || null
      };
    });

    return res.status(200).json({
      success: true,
      studyType: normalizedType,
      documents: result
    });
  } catch (error) {
    console.error('getAdditionalDocuments error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch additional documents.', error: error.message });
  }
};

// 3. POST /upload - Upload/save an additional document
export const uploadAdditionalDocument = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User authentication required.' });
    }

    const { documentType, documentName, studyType, required, conditional, conditionText, applicationId } = req.body;
    const file = req.file;

    if (!documentType || !file) {
      return res.status(400).json({ success: false, message: 'Missing document type or file upload.' });
    }

    const normalizedType = normalizeStudyType(studyType);
    const normalizedDocumentType = String(documentType).trim().toLowerCase();
    const documentConfig = [...COMMON_DOCUMENT_CONFIG, ...(DOCUMENT_CONFIGS[normalizedType] || DOCUMENT_CONFIGS.Bachelor)]
      .find((item) => item.documentType.toLowerCase() === normalizedDocumentType);
    if (!documentConfig) {
      if (file.key) await deleteFile(file.key).catch(() => {});
      return res.status(400).json({ success: false, message: 'Invalid document type for this application.' });
    }
    const extension = String(file.originalname || '').split('.').pop().toLowerCase();
    const isPhoto = normalizedDocumentType === 'photo' || normalizedDocumentType === 'doc-photo';
    const validPhoto = ['jpg', 'jpeg', 'png'].includes(extension) && String(file.mimetype || '').startsWith('image/');
    const validResume = ['pdf', 'doc', 'docx'].includes(extension);
    if (isPhoto && (!validPhoto || file.size > 2 * 1024 * 1024)) {
      if (file.key) await deleteFile(file.key).catch(() => {});
      return res.status(400).json({ success: false, message: 'Photograph must be JPG, JPEG, or PNG and no larger than 2MB.' });
    }
    if ((normalizedDocumentType === 'cv' || normalizedDocumentType === 'doc-cv') && !validResume) {
      if (file.key) await deleteFile(file.key).catch(() => {});
      return res.status(400).json({ success: false, message: 'CV / Resume must be a PDF, DOC, or DOCX file.' });
    }
    const fileMetadata = {
      originalName: file.originalname,
      fileName: file.originalname,
      fileUrl: file.location || '',
      s3Key: file.key || '',
      bucket: file.bucket || '',
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date()
    };

    const isRequired = required === 'true' || required === true;
    const isConditional = conditional === 'true' || conditional === true;
    const canonicalDocumentType = documentConfig.documentType;
    const previousRecord = await AdditionalDocument.findOne({
      userId,
      studyType: normalizedType,
      documentType: canonicalDocumentType
    }).lean();

    const docRecord = await AdditionalDocument.findOneAndUpdate(
      { userId, studyType: normalizedType, documentType: canonicalDocumentType },
      {
        userId,
        applicationId: applicationId || '',
        studyType: normalizedType,
        documentType: canonicalDocumentType,
        documentName: documentName || documentConfig.documentName,
        required: isRequired,
        conditional: isConditional,
        conditionText: conditionText || '',
        status: 'Uploaded',
        file: fileMetadata
      },
      { new: true, upsert: true, runValidators: true }
    );

    const previousS3Key = extractS3Key(previousRecord?.file);
    if (previousS3Key && previousS3Key !== fileMetadata.s3Key) {
      try { await deleteFile(previousS3Key); }
      catch (error) { console.error('Unable to remove replaced additional document from S3:', error); }
    }

    let freshUrl = fileMetadata.fileUrl;
    if (fileMetadata.s3Key) {
      try {
        freshUrl = await getPresignedUrl(fileMetadata.s3Key, 3600);
      } catch (err) {
        console.error('Error generating presigned URL:', err);
      }
    }

    return res.status(200).json({
      success: true,
      message: `${docRecord.documentName} uploaded successfully.`,
      document: {
        _id: docRecord._id,
        documentType: docRecord.documentType,
        documentName: docRecord.documentName,
        studyType: docRecord.studyType,
        status: docRecord.status,
        file: {
          originalName: fileMetadata.originalName,
          fileName: fileMetadata.fileName,
          fileUrl: freshUrl,
          s3Key: fileMetadata.s3Key,
          size: fileMetadata.size ? (fileMetadata.size / (1024 * 1024)).toFixed(2) + ' MB' : '',
          mimeType: fileMetadata.mimeType,
          uploadedAt: fileMetadata.uploadedAt
        }
      }
    });
  } catch (error) {
    console.error('uploadAdditionalDocument error:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload document.', error: error.message });
  }
};

// 4. PUT /:id - Replace / Update document
export const updateAdditionalDocument = async (req, res) => {
  return uploadAdditionalDocument(req, res);
};

// 5. DELETE /:id - Delete additional document
export const deleteAdditionalDocument = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User authentication required.' });
    }

    let docRecord = await AdditionalDocument.findOne({ _id: id, userId });
    if (!docRecord) {
      // Fallback search by documentType for this user
      docRecord = await AdditionalDocument.findOne({ documentType: id, userId });
    }

    if (!docRecord) {
      return res.status(404).json({ success: false, message: 'Document record not found.' });
    }

    if (docRecord.file?.s3Key) {
      try {
        await deleteFile(docRecord.file.s3Key);
      } catch (err) {
        console.error('Failed to delete file from S3:', err);
      }
    }

    await AdditionalDocument.deleteOne({ _id: docRecord._id });

    return res.status(200).json({
      success: true,
      message: `${docRecord.documentName} deleted successfully.`,
      documentType: docRecord.documentType
    });
  } catch (error) {
    console.error('deleteAdditionalDocument error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete document.', error: error.message });
  }
};

