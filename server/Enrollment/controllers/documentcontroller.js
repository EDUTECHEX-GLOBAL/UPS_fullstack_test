import Documents from '../model/documentmodel.js';
import AllDocument from '../../models/AllDocumentModel.js';
import { getPresignedUrl, deleteFile } from '../../middleware/uploadMiddleware.js';
import { extractS3Key } from './universityreviewcontroller.js';

const UI_TO_DB_DOCUMENT_MAP = {
  "doc-passport": "passport",
  "passport": "passport",
  "doc-photo": "photo",
  "doc-cv": "cv",
  "doc-9th": "grade9",
  "doc-10th": "grade10",
  "doc-11th": "grade11",
  "doc-12th": "grade12",
  "education_certificate": "grade12",
  // Keep post-secondary documents distinct from CV and grade 12 uploads.
  "college_transcript": "collegeTranscript",
  "ug_transcript": "undergraduateTranscript",
  "ug_degree": "bachelorDegree",
  "medical_academic_doc": "medicalAcademicDocument",
  "score_report": "cv"
};

const getAuthenticatedUserId = (req) => {
  return (
    req.userId ||
    req.user?.id ||
    req.user?.userId ||
    req.user?._id ||
    null
  );
};

// NEW: pull the studentTempId/sessionId used during the pre-login document
// extract step, so we can find + claim the orphaned AllDocument record.
// We check the JWT payload first (if you add it there at login/signup),
// then fall back to a query param the client can send explicitly.
const getStudentTempId = (req) => {
  return (
    req.user?.studentTempId ||
    req.query?.studentTempId ||
    req.headers['x-student-temp-id'] ||
    null
  );
};

const getDocumentFieldData = (uploadedDocuments, uiId, dbField) => {
  if (!uploadedDocuments) return null;

  if (uploadedDocuments[dbField]) {
    return uploadedDocuments[dbField];
  }

  if (uploadedDocuments[uiId]) {
    return uploadedDocuments[uiId];
  }

  return null;
};

// NEW: centralizes the "find AllDocument records for this user" logic,
// including claiming any orphaned (userId: null) records by userId,
// email, or studentTempId so they stop being orphaned going forward.
const findAndClaimAllDocuments = async ({ userId, email, studentTempId }) => {
  let allDocs = [];

  if (userId) {
    allDocs = await AllDocument.find({ userId }).sort({ createdAt: 1 }).lean();
  }

  if (allDocs.length === 0 && email) {
    allDocs = await AllDocument.find({ "extractedData.email": email.toLowerCase() })
      .sort({ createdAt: 1 })
      .lean();
  }

  if (allDocs.length === 0 && studentTempId) {
    allDocs = await AllDocument.find({ studentTempId }).sort({ createdAt: 1 }).lean();
  }

  // Claim any record that isn't yet linked to this userId
  for (const doc of allDocs) {
    if (doc.userId && doc.userId.toString() !== userId?.toString()) {
      console.warn("AllDocument user mismatch", {
        authenticatedUserId: userId,
        documentUserId: doc.userId
      });
      continue;
    }

    if (!doc.userId && userId) {
      await AllDocument.updateOne({ _id: doc._id }, { $set: { userId } });
      doc.userId = userId;
    }
  }

  return allDocs;
};

export const getDocuments = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const email = req.user?.email;
    const studentTempId = getStudentTempId(req);

    if (!userId && !email) {
      return res.status(401).json({ success: false, message: 'Authenticated user ID not found' });
    }

    console.log("========== DOCUMENT DEBUG ==========");
    console.log("=== DIAGNOSTIC LOG (documentcontroller.js) ===");
    console.log("REQ.USER:", req.user);
    console.log("REQ.USER ID:", req.userId);
    console.log("REQ.USER.ID:", req.user?.id);
    console.log("REQ.USER.USERID:", req.user?.userId);
    console.log("REQ.USER EMAIL:", req.user?.email);
    console.log("AUTHENTICATED USER ID:", userId);
    console.log("AUTHENTICATED EMAIL:", email);
    console.log("STUDENT TEMP ID:", studentTempId);

    const allDocs = await findAndClaimAllDocuments({ userId, email, studentTempId });

    console.log('GET USER ID:', userId);
    console.log('GET ALLDOCUMENT COUNT:', allDocs.length);

    console.log(
      'GET RAW UPLOADED DOCUMENTS:',
      allDocs.map(doc => ({
        id: doc._id,
        userId: doc.userId,
        uploadedDocuments: doc.uploadedDocuments
      }))
    );

    const mergedUploadedDocuments = {};
    let grade12Status = 'pending';
    let expectedMonth = '';
    let expectedYear = '';

    for (const doc of allDocs) {
      if (!doc.uploadedDocuments) continue;

      for (const [key, value] of Object.entries(doc.uploadedDocuments)) {
        if (value && typeof value === "object" && value.fileName) {
          mergedUploadedDocuments[key] = value;
        }
      }

      if (doc.grade12Status) grade12Status = doc.grade12Status;
      if (doc.expectedMonth) expectedMonth = doc.expectedMonth;
      if (doc.expectedYear) expectedYear = doc.expectedYear;
    }

    console.log(
      'GET MERGED DOCUMENTS:',
      JSON.stringify(mergedUploadedDocuments, null, 2)
    );

    const documents = {};
    for (const uiId of Object.keys(UI_TO_DB_DOCUMENT_MAP)) {
      documents[uiId] = {
        status: "Pending",
        file: null,
        size: null,
        fileUrl: null,
        s3Key: null,
        mimeType: null,
        uploadedAt: null,
        extractionStatus: null
      };
    }

    for (const [uiId, dbField] of Object.entries(UI_TO_DB_DOCUMENT_MAP)) {
      const fieldData = getDocumentFieldData(mergedUploadedDocuments, uiId, dbField);

      if (fieldData && (fieldData.fileName || fieldData.fileUrl || fieldData.s3Key)) {
        let freshFileUrl = fieldData.fileUrl || null;
        const s3Key = extractS3Key(fieldData);
        if (s3Key) {
          try {
            freshFileUrl = await getPresignedUrl(s3Key, 86400);
          } catch (urlError) {
            console.error('Presigned URL error:', urlError);
          }
        }

        documents[uiId] = {
          status: "Uploaded",
          file: fieldData.originalName || fieldData.fileName,
          size: fieldData.size ? (fieldData.size / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown Size',
          fileUrl: freshFileUrl,
          s3Key: fieldData.s3Key,
          mimeType: fieldData.mimeType,
          uploadedAt: fieldData.uploadedAt,
          extractionStatus: fieldData.extractionStatus
        };
      }
    }

    const firstYearDocs = await Documents.findOne({ userId });

    const payload = {
      documents,
      grade12Status,
      expectedMonth,
      expectedYear,
      status: firstYearDocs?.status || 'Pending'
    };

    console.log(
      'GET FINAL DOCUMENTS:',
      JSON.stringify(documents, null, 2)
    );

    console.log(
      "FINAL UI DOCUMENT STATUS:",
      Object.fromEntries(
        Object.entries(documents).map(([id, doc]) => [id, doc.status])
      )
    );

    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

export const saveDocuments = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { documents } = req.body;

    const updatedDetails = await Documents.findOneAndUpdate(
      { userId },
      { documents, userId, status: 'Completed' },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ success: true, message: "Documents saved successfully", data: updatedDetails });
  } catch (error) {
    console.error("Error saving documents:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

const mapUiIdToDbField = (uiId) => {
  return UI_TO_DB_DOCUMENT_MAP[uiId] || null;
};

export const uploadDocument = async (req, res) => {
  try {
    const rawUserId = getAuthenticatedUserId(req);
    const normalizedUserId = rawUserId?.toString();
    const email = req.user?.email;
    const studentTempId = getStudentTempId(req);
    const { docId } = req.body;
    const file = req.file;

    if (!normalizedUserId) {
      return res.status(401).json({ success: false, message: "Authenticated user ID is missing." });
    }

    if (!docId || !file) {
      return res.status(400).json({ success: false, message: "Missing document ID or file." });
    }

    const dbField = mapUiIdToDbField(docId);
    if (!dbField) {
      return res.status(400).json({ success: false, message: "Invalid document ID." });
    }

    console.log("========== UPLOAD DOCUMENT DEBUG ==========");
    console.log('UPLOAD USER ID:', normalizedUserId);
    console.log('UPLOAD EMAIL:', email);
    console.log('UPLOAD STUDENT TEMP ID:', studentTempId);
    console.log('UPLOAD DOC ID:', docId);
    console.log('UPLOAD DB FIELD:', dbField);
    console.log('UPLOAD FILE:', {
      originalname: file?.originalname,
      key: file?.key,
      location: file?.location,
      size: file?.size,
      mimetype: file?.mimetype
    });

    // Try to find (and claim) an existing record before creating a new one,
    // so per-field uploads land on the SAME AllDocument record that the
    // initial /all-documents/extract step created pre-login.
    let appDocs = await AllDocument.findOne({ userId: normalizedUserId });

    if (!appDocs && email) {
      appDocs = await AllDocument.findOne({ "extractedData.email": email.toLowerCase() });
    }

    if (!appDocs && studentTempId) {
      appDocs = await AllDocument.findOne({ studentTempId });
    }

    if (!appDocs) {
      appDocs = new AllDocument({
        userId: normalizedUserId,
        studentTempId: studentTempId || undefined,
        uploadedDocuments: {},
        grade12Status: 'pending' // Required field
      });
    }

    // Always (re)claim the record for this authenticated user
    appDocs.userId = normalizedUserId;

    console.log("APP DOC BEFORE SAVE:", {
      id: appDocs._id,
      userId: appDocs.userId,
      email: appDocs.extractedData?.email,
      uploadedDocuments: appDocs.uploadedDocuments
    });

    const fileMetadata = {
      documentType: dbField,
      fileName: file.originalname,
      originalName: file.originalname,
      fileUrl: file.location || '',
      s3Key: file.key || '',
      bucket: file.bucket || '',
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
      extractionStatus: 'pending',
      extractedTextPreview: ''
    };

    if (!appDocs.uploadedDocuments) {
      appDocs.uploadedDocuments = {};
    }

    appDocs.uploadedDocuments[dbField] = fileMetadata;
    appDocs.markModified('uploadedDocuments');
    await appDocs.save();

    const savedDoc = await AllDocument.findById(appDocs._id).lean();
    console.log('SAVED ALLDOCUMENT:', savedDoc);

    const verifyByUser = await AllDocument.find({ userId: normalizedUserId }).lean();
    console.log("VERIFY BY USER ID:", verifyByUser);

    const verifyByEmail = email
      ? await AllDocument.find({ "extractedData.email": email.toLowerCase() }).lean()
      : [];
    console.log("VERIFY BY EMAIL:", verifyByEmail);

    res.status(200).json({
      success: true,
      message: "Document uploaded successfully.",
      file: {
        fileName: fileMetadata.fileName || fileMetadata.originalName,
        originalName: fileMetadata.originalName,
        fileUrl: fileMetadata.fileUrl,
        fileKey: fileMetadata.s3Key,
        size: fileMetadata.size,
        fileSize: fileMetadata.size,
        mimeType: fileMetadata.mimeType,
        uploadedAt: fileMetadata.uploadedAt
      },
      data: {
        docId,
        dbField,
        document: {
          status: "Uploaded",
          file: fileMetadata.originalName || fileMetadata.fileName,
          size: fileMetadata.size ? (fileMetadata.size / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown Size',
          fileUrl: fileMetadata.fileUrl,
          s3Key: fileMetadata.s3Key,
          mimeType: fileMetadata.mimeType,
          uploadedAt: fileMetadata.uploadedAt,
          extractionStatus: fileMetadata.extractionStatus
        }
      }
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

export const removeDocument = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const email = req.user?.email;
    const studentTempId = getStudentTempId(req);
    const { docId } = req.params;

    const dbField = mapUiIdToDbField(docId);
    if (!dbField) {
      return res.status(400).json({ success: false, message: "Invalid document ID." });
    }

    let allDocs = [];
    if (userId) {
      allDocs = await AllDocument.find({ userId }).sort({ createdAt: -1 });
    }
    if (allDocs.length === 0 && email) {
      allDocs = await AllDocument.find({ "extractedData.email": email.toLowerCase() }).sort({ createdAt: -1 });
    }
    if (allDocs.length === 0 && studentTempId) {
      allDocs = await AllDocument.find({ studentTempId }).sort({ createdAt: -1 });
    }

    let appDocs = allDocs.length > 0 ? allDocs[0] : null;

    if (!appDocs) {
      return res.status(404).json({ success: false, message: "User document record not found." });
    }

    if (!appDocs.userId && userId) {
      appDocs.userId = userId;
    }

    if (appDocs.uploadedDocuments) {
      // Handle dbField
      if (appDocs.uploadedDocuments[dbField]) {
        appDocs.uploadedDocuments[dbField] = null;
        appDocs.markModified(`uploadedDocuments.${dbField}`);
      }
      // Handle legacy uiId just in case
      if (appDocs.uploadedDocuments[docId]) {
        appDocs.uploadedDocuments[docId] = null;
        appDocs.markModified(`uploadedDocuments.${docId}`);
      }
      await appDocs.save();
    }

    res.status(200).json({ success: true, message: "Document removed successfully." });
  } catch (error) {
    console.error("Error removing document:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};
