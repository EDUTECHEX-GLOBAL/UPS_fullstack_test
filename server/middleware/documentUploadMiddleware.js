// server/middleware/documentMiddleware.js
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import { fileURLToPath } from "url";
import { buildFileUrl, resolveS3FileKey } from "../utils/s3FileKey.js";

// =====================================================
// Resolve __dirname (ESM)
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

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

// =====================================================
// S3 STORAGE CONFIG FOR DOCUMENTS
// =====================================================
const s3Storage = multerS3({
  s3,
  bucket: BUCKET_NAME,
  // Server-side encryption for each uploaded file
  serverSideEncryption: "AES256",
  metadata: (req, file, cb) => {
    cb(null, { fieldName: file.fieldname });
  },
  key: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();

    const cleanName = file.originalname
      .replace(ext, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 40);

    const s3Key = `documents/${timestamp}-${random}-${cleanName}${ext}`;
    console.log("📁 S3 Document Key:", s3Key);
    cb(null, s3Key);
  },
});

// =====================================================
// FILE FILTER (PDF, IMAGES, DOCS)
// =====================================================
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  // ✅ MIME TYPE CHECK
  if (!allowedMimeTypes.includes(file.mimetype)) {
    req.fileValidationError = "Only PDF, JPG, PNG, DOC, and DOCX files are allowed.";
    return cb(null, false);
  }

  // ✅ EXTENSION CHECK
  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    req.fileValidationError = "Only .pdf, .jpg, .jpeg, .png, .doc, and .docx files are allowed";
    return cb(null, false);
  }

  cb(null, true);
};

// =====================================================
// MULTER INSTANCE WITH S3
// =====================================================
export const documentUpload = multer({
  storage: s3Storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// =====================================================
// FILE URL HELPER - S3 URL
// =====================================================
export const getDocumentFileUrl = (s3Key) => {
  // If full key provided, use it; else prefix with documents/
  const normalizedKey = resolveS3FileKey(s3Key);
  if (!normalizedKey) return "";
  const key = normalizedKey.includes("/") ? normalizedKey : `documents/${normalizedKey}`;
  return buildFileUrl(key);
};

// =====================================================
// DELETE FILE FROM S3
// =====================================================
export const deleteDocumentFile = async (s3Key) => {
  if (!s3Key) return false;

  const key = s3Key.includes("/") ? s3Key : `documents/${s3Key}`;

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
    console.log("🗑️ Deleted S3 document:", key);
    return true;
  } catch (err) {
    console.error("❌ S3 document delete error:", err);
    return false;
  }
};

// =====================================================
// VALIDATION MIDDLEWARE
// =====================================================
export const validateDocumentFileUpload = (req, res, next) => {
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

// =====================================================
// DOCUMENT UPLOAD DIR (S3 path reference)
// =====================================================
export const DOCUMENT_UPLOAD_DIR = `s3://${BUCKET_NAME}/documents`;

// =====================================================
// DEFAULT EXPORT
// =====================================================
export default {
  documentUpload,
  getDocumentFileUrl,
  deleteDocumentFile,
  DOCUMENT_UPLOAD_DIR,
  validateDocumentFileUpload,
};
