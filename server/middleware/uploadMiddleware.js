// server/middleware/uploadMiddleware.js
import multer from "multer";
import multerS3 from "multer-s3";
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";
import { fileURLToPath } from "url";

// =====================================================
// Resolve __dirname for ES Modules
// =====================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================================================
// S3 CLIENT SETUP
// =====================================================
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET;

// =====================================================
// FILE FILTER (MIME CHECK) - general documents
// NOTE: rejections use cb(null, false) so the request reaches
// validateFileUpload / the controller and returns a clean 400
// (cb(error) would send it to Express's error handler as a 500).
// =====================================================
const fileFilter = (req, file, cb) => {
  console.log("🔍 Checking file:", file.originalname, "MIME:", file.mimetype);

  const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    req.fileValidationError =
      "Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX";
    console.log("❌ File rejected:", req.fileValidationError);
    return cb(null, false);
  }

  const allowedExtensions = /\.(pdf|jpg|jpeg|png|doc|docx)$/i;
  if (!allowedExtensions.test(file.originalname)) {
    req.fileValidationError = "Unsupported file extension";
    console.log("❌ File extension rejected:", file.originalname);
    return cb(null, false);
  }

  console.log("✅ File accepted:", file.originalname);
  cb(null, true);
};

// =====================================================
// PDF-ONLY FILTER (test score reports)
// =====================================================
const pdfOnlyFilter = (req, file, cb) => {
  const isPdf =
    file.mimetype === "application/pdf" && /\.pdf$/i.test(file.originalname);

  if (!isPdf) {
    req.fileValidationError = "Only PDF files are accepted";
    console.log("❌ File rejected (PDF only):", file.originalname);
    return cb(null, false);
  }

  cb(null, true);
};

// =====================================================
// CREATE S3 STORAGE FOR SPECIFIC FOLDER
// userScoped = true -> keys look like  folder/<userId>/<timestamp>-<rand>.ext
// (requires authMiddleware to run BEFORE multer so req.user exists)
// =====================================================
const createS3Storage = (folderName, userScoped = false) => {
  return multerS3({
    s3,
    bucket: BUCKET_NAME,
    // Server-side encryption for each uploaded file
    serverSideEncryption: "AES256",
    // Store correct Content-Type so PDFs/images preview instead of downloading
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const userId = req.user?.id || req.user?.userId || req.userId;
      const prefix =
        userScoped && userId ? `${folderName}/${userId}` : folderName;
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${prefix}/${timestamp}-${random}${ext}`;
      console.log(`📁 S3 Key: ${filename}`);
      cb(null, filename);
    },
  });
};

// =====================================================
// CREATE UPLOADER FOR SPECIFIC FOLDER
// =====================================================
export const createUploader = (
  folderName,
  maxSizeMB = 10,
  { filter = fileFilter, userScoped = false } = {}
) => {
  return multer({
    storage: createS3Storage(folderName, userScoped),
    fileFilter: filter,
    limits: {
      fileSize: maxSizeMB * 1024 * 1024,
    },
  });
};

// =====================================================
// PRE-CONFIGURED UPLOADERS
// =====================================================
export const passportUpload = createUploader("passport", 10);
export const photographUpload = createUploader("photograph", 2);
export const educationUpload = createUploader("education", 10);
export const nationalIdUpload = createUploader("nationalId", 10);
export const allDocumentUpload = createUploader("all-documents", 15);
export const additionalDocumentUpload = createUploader("additional-documents", 15);
export const helpdeskUpload = createUploader("helpdesk", 5);

// Test score reports: PDF only, stored under test-scores/<userId>/
export const testScoreUpload = createUploader("test-scores", 10, {
  filter: pdfOnlyFilter,
  userScoped: true,
});

// Default upload (education folder for backward compatibility)
export const upload = createUploader;

// =====================================================
// GENERATE PRESIGNED URL
// =====================================================
export const getPresignedUrl = async (s3Key, expiresInSeconds = 3600) => {
  if (!s3Key) {
    console.warn("⚠️ getPresignedUrl called with empty s3Key");
    return null;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: expiresInSeconds,
    });

    return signedUrl;
  } catch (err) {
    console.error("❌ Failed to generate presigned URL:", err);
    throw err;
  }
};

// =====================================================
// FILE URL HELPER (backward compatibility, education folder only)
// Prefer getPresignedUrl(s3Key) for everything else.
// =====================================================
export const getFileUrl = async (filename, expiresInSeconds = 3600) => {
  const s3Key = `education/${filename}`;
  return await getPresignedUrl(s3Key, expiresInSeconds);
};

export const getDynamicFileUrl = async (s3Key, expiresInSeconds = 3600) => {
  return await getPresignedUrl(s3Key, expiresInSeconds);
};

// =====================================================
// DELETE FILE FROM S3
// Pass a full key (contains "/") or filename + folder.
// =====================================================
export const deleteFile = async (filename, folder = "education") => {
  if (!filename) return false;

  const key = filename.includes("/") ? filename : `${folder}/${filename}`;

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
    console.log("🗑️ S3 File deleted:", key);
    return true;
  } catch (err) {
    console.error("❌ S3 File deletion error:", err);
    return false;
  }
};

export const deleteFileFromFolder = async (filename, folder = "education") => {
  return await deleteFile(filename, folder);
};

// =====================================================
// MULTER ERROR HANDLER WRAPPER
// Wrap an uploader's .single("file") so size limits / S3 errors
// return clean JSON instead of a generic 500.
// Usage: router.post(path, auth, withUpload(testScoreUpload), validateFileUpload, handler)
// =====================================================
export const withUpload = (uploader, fieldName = "file") => (req, res, next) => {
  uploader.single(fieldName)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "File exceeds the size limit"
          : err.message;
      return res.status(400).json({ success: false, message });
    }
    if (err) {
      console.error("Upload error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
    next();
  });
};

// =====================================================
// FILE VALIDATION MIDDLEWARE
// =====================================================
export const validateFileUpload = (req, res, next) => {
  if (req.fileValidationError) {
    return res.status(400).json({
      success: false,
      message: req.fileValidationError,
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  next();
};

export const getFilePath = (filename, folder = "education") => {
  return `${folder}/${filename}`;
};

export const UPLOAD_DIR = `s3://${BUCKET_NAME}/education`;

// =====================================================
// BACKWARD COMPATIBILITY STUBS
// =====================================================
export const ensureDirectoryExists = (folderName) => {
  console.log(
    `ℹ️ ensureDirectoryExists called for "${folderName}" — skipped (using S3)`
  );
  return `s3://${BUCKET_NAME}/${folderName}`;
};

export const quickValidateFile = async (filePathOrKey, fileType) => {
  if (!filePathOrKey) {
    return { valid: false, message: "No file path or S3 key provided" };
  }
  console.log(
    `ℹ️ quickValidateFile called for type "${fileType}" — basic check only (S3 mode)`
  );
  return { valid: true, message: "File reference exists (S3 mode)" };
};

export const checkUploadPermissions = () => {
  console.log(
    "ℹ️ checkUploadPermissions called — skipped (using S3, no local dirs needed)"
  );
};

export const validateUploadedDocument = async (filePath, expectedType) => {
  console.log(
    `ℹ️ validateUploadedDocument called for type "${expectedType}" — basic check (S3 mode)`
  );
  return {
    valid: true,
    confidence: 1,
    expectedType,
    message: "Validation skipped in S3 mode — file already uploaded",
  };
};

export const validateUploadedDocumentInFolder = async (
  filePath,
  expectedType,
  folder = "education"
) => {
  console.log(
    `ℹ️ validateUploadedDocumentInFolder called for "${folder}/${expectedType}" — basic check (S3 mode)`
  );
  return {
    valid: true,
    confidence: 1,
    expectedType,
    message: "Validation skipped in S3 mode — file already uploaded",
  };
};

// =====================================================
// DEFAULT EXPORT
// =====================================================
export default {
  upload: createUploader,
  passportUpload,
  photographUpload,
  educationUpload,
  nationalIdUpload,
  allDocumentUpload,
  additionalDocumentUpload,
  helpdeskUpload,
  testScoreUpload,
  withUpload,
  getFileUrl,
  getDynamicFileUrl,
  getPresignedUrl,
  deleteFile,
  deleteFileFromFolder,
  validateFileUpload,
  getFilePath,
  UPLOAD_DIR,
  ensureDirectoryExists,
  quickValidateFile,
  checkUploadPermissions,
  validateUploadedDocument,
  validateUploadedDocumentInFolder,
};