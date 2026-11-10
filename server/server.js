// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import compression from "compression";
import path from "path";
import fs from 'fs';
import { fileURLToPath } from 'url';
import { S3Client, HeadBucketCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import connectDB from "./config/db.js";
import {
  isS3NoSuchKeyError,
  resolveS3FileKey,
} from "./utils/s3FileKey.js";
import accountRoutes from "./routes/accountRoutes.js";
import generalRoutes from "./routes/generalRoutes.js";
import responsibilitiesRoutes from "./routes/responsibilitiesRoutes.js";
import writingRoutes from "./routes/writingRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import transferRoutes from "./routes/transferRoutes.js";
import extendedProfileRoutes from "./routes/extendedProfileRoutes.js";
import educationtestRoutes from "./routes/educationtestRoutes.js";
import writingtestRoutes from "./routes/writingtestRoutes.js";
import adminUserRoutes from "./routes/adminuserroutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import overviewRoutes from "./routes/overviewRoutes.js";
import studentUniversityRoutes from "./routes/studentUniversityRoutes.js";
import studentCountryUniversityCountryRoutes from "./routes/studentCountryUniversityCountryRoutes.js";
import programSearchIndexRoutes from "./routes/programSearchIndexRoutes.js";
import authenticateToken from "./middleware/authMiddleware.js";
import {
  getStudentProgramSections,
  searchStudentPrograms,
  searchStudentUniversities,
} from "./controllers/studentUniversityController.js";
import bachelorsRoutes from "./routes/bachelorsRoutes.js";
import userProfileRoutes from "./routes/userprofileroutes.js";
import processAdminRoutes from "./routes/processAdminRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import analyticsRoutes from './routes/studentanalyticsroutes.js';
import processAdminDashboardRoutes from "./routes/processAdminDashboardRoutes.js";
import adminDashboardRoutes from "./routes/admindashboardroutes.js";
import adminVerificationRoutes from "./routes/adminVerificationRoutes.js";
import universityVerificationRoutes from "./routes/UniversityVerificationroutes.js";
import helpdeskRoutes from "./routes/helpdeskRoutes.js";
import supportprocessRoutes from "./routes/supportprocessRoutes.js";
import { sendEmail } from "./utils/sendEmail.js";
// Enrollment routes
import enrollmentPersonalRoutes from "./Enrollment/routes/personalroutes.js";
import enrollmentEducationRoutes from "./Enrollment/routes/educationroutes.js";
import enrollmentProgramRoutes from "./Enrollment/routes/programroutes.js";
import enrollmentTestRoutes from "./Enrollment/routes/testroutes.js";
import enrollmentDocumentRoutes from "./Enrollment/routes/documentroutes.js";
import enrollmentAdditionalDocumentRoutes from "./Enrollment/routes/additionaldocumentroutes.js";
import enrollmentUniversitySelectionRoutes from "./Enrollment/routes/universityselectionroutes.js";
import enrollmentUniversityReviewRoutes from "./Enrollment/routes/universityreviewroutes.js";
import enrollmentReviewRoutes from "./Enrollment/routes/reviewroutes.js";
import applicationConsistencyRoutes from "./Enrollment/routes/ApplicationConsistencyroutes.js";
import enrollmentDashboardRoutes from "./Enrollment/routes/dashboardroutes.js";
import enrollmentAdminRoutes from "./Enrollment/routes/enrollmentAdminRoutes.js";
import {
  saveDraftApplication,
  submitForApproval,
  getApplicationStatus,
  resubmitApplication
} from "./Enrollment/controllers/reviewcontroller.js";
import authMiddleware from "./middleware/authMiddleware.js";

import gusuniversityroutes from "./routes/gusuniversityroutes.js";
import medicaluniversityroutes from "./routes/medicaluniversityroutes.js";
import masterUniversityRoutes from "./routes/masterUniversityRoutes.js";
import contactRoutes from "./routes/contactroutes.js";
dotenv.config();
// =====================================================
// INITIALIZE
// =====================================================
const app = express();
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
let s3LastError = null;
const checkS3Connection = async () => {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    console.log(`✅ S3 Bucket Connected: ${BUCKET_NAME}`);
    s3LastError = null;
    return true;
  } catch (err) {
    const statusCode = err.$metadata?.httpStatusCode;
    let hint = "Check your AWS credentials and IAM permissions.";
    if (statusCode === 403) {
      hint = "HTTP 403 Forbidden: Invalid AWS Access Key ID / Secret, or the IAM user lacks s3:ListBucket / s3:HeadBucket permissions for bucket '" + BUCKET_NAME + "'.";
    } else if (statusCode === 404) {
      hint = "HTTP 404 Not Found: Bucket '" + BUCKET_NAME + "' does not exist in your AWS account.";
    } else if (statusCode === 301) {
      hint = "HTTP 301 Redirect: Bucket '" + BUCKET_NAME + "' is located in a different AWS region than '" + process.env.AWS_REGION + "'.";
    } else if (err.code === 'ENOTFOUND') {
      hint = "DNS / Network Error: Could not resolve S3 endpoint. Check internet connection.";
    }

    s3LastError = {
      message: err.message || err.name,
      code: err.name || err.Code || err.code,
      statusCode: statusCode || null,
      hint,
    };

    console.error(`❌ S3 Bucket Connection Failed!`);
    console.error(`   → Status  : ${statusCode || 'Unknown'}`);
    console.error(`   → Error   : ${err.message}`);
    console.error(`   → Reason  : ${hint}`);
    console.error(`   → Bucket  : ${BUCKET_NAME}`);
    console.error(`   → Region  : ${process.env.AWS_REGION}`);
    console.error(`   → Key Set : ${!!process.env.AWS_ACCESS_KEY_ID}`);
    console.error(`   → Secret  : ${!!process.env.AWS_SECRET_ACCESS_KEY}`);
    return false;
  }
};
// =====================================================
// CONNECT TO DB
// =====================================================
connectDB();
// =====================================================
// CORS
// =====================================================
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:4200",
    "https://college-frontend-two.vercel.app",
    "https://college-frontend-theta.vercel.app" // ✅ ADD THIS ALSO
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(compression());
// =====================================================
// CACHE HEADERS FOR STABLE LOOKUPS
// =====================================================
const cacheStableLookups = (req, res, next) => {
  if (req.method !== "GET") return next();
  const stablePrefixes = [
    "/api/student/program-index/major-areas",
    "/api/student/program-index/programs",
    "/api/student-country-universities/countries",
  ];
  if (stablePrefixes.some((prefix) => req.originalUrl.startsWith(prefix))) {
    res.setHeader("Cache-Control", "private, max-age=300");
  }
  next();
};
app.use(cacheStableLookups);
// =====================================================
// BODY PARSER
// =====================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
// =====================================================
// REQUEST LOGGING
// =====================================================
app.use((req, res, next) => {
  console.log(`\n📨 ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  console.log('Headers:', {
    authorization: req.headers.authorization ? 'Bearer [PRESENT]' : 'None',
    'content-type': req.headers['content-type']
  });
  next();
});
// =====================================================
// STATIC: /uploads — local first, S3 fallback
// =====================================================
const uploadsLocalPath = path.join(__dirname, 'uploads');
const uploadsAltPath = path.join(process.cwd(), 'uploads');
const uploadsDir = fs.existsSync(uploadsLocalPath)
  ? uploadsLocalPath
  : fs.existsSync(uploadsAltPath) ? uploadsAltPath : null;
if (uploadsDir) {
  console.log('📁 Local uploads folder found at:', uploadsDir);
  app.use('/uploads', express.static(uploadsDir));
  console.log('✅ Serving local uploads from disk');
} else {
  console.log('⚠️  No local uploads folder — /uploads requests will redirect to S3');
}
app.use('/uploads', (req, res) => {
  const s3Key = req.path.replace(/^\//, '');
  const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
  console.log(`🔀 Redirecting to S3: /uploads${req.path} → ${s3Url}`);
  return res.redirect(302, s3Url);
});
// =====================================================
// S3 FILE PROXY
// =====================================================
app.use('/api/files', async (req, res) => {
  const rawKey = req.path.replace(/^\/+/, '');
  const fileKey = resolveS3FileKey(rawKey);
  try {
    if (!fileKey) {
      return res.status(400).json({
        success: false,
        message: 'No S3 key provided',
      });
    }
    const fileName = fileKey.split('/').pop();
    const ext = fileName.split('.').pop().toLowerCase();
    const mimeTypes = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    const forceDownload = req.query.download === 'true';
    const isPreviewable = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) && !forceDownload;
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ResponseContentType: mimeTypes[ext] || 'application/octet-stream',
      ResponseContentDisposition: `${isPreviewable ? 'inline' : 'attachment'}; filename="${fileName}"`,
    });
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.redirect(302, signedUrl);
  } catch (err) {
    console.error('S3 signed URL error:', {
      key: fileKey,
      message: err.message,
      code: err.Code || err.code,
      status: err.$metadata?.httpStatusCode,
    });
    return res.status(isS3NoSuchKeyError(err) ? 404 : 500).json({
      success: false,
      message: isS3NoSuchKeyError(err) ? 'File not found in S3' : 'Failed to create file URL',
      fileKey,
    });
  }
});
// =====================================================
// STATIC: /logos
// =====================================================
const logosPath = path.join(__dirname, "public", "logos");
const altLogosPath = path.join(process.cwd(), "public", "logos");
if (fs.existsSync(logosPath)) {
  app.use("/logos", express.static(logosPath));
} else if (fs.existsSync(altLogosPath)) {
  app.use("/logos", express.static(altLogosPath));
}
// =====================================================
// DEBUG ENDPOINTS
// =====================================================
app.get('/api/test', (req, res) =>
  res.json({ success: true, message: '✅ API is working', timestamp: new Date().toISOString() })
);
app.get('/api/debug/s3', async (req, res) => {
  const connected = await checkS3Connection();
  res.json({
    connected,
    bucket: BUCKET_NAME,
    region: process.env.AWS_REGION,
    accessKeySet: !!process.env.AWS_ACCESS_KEY_ID,
    secretKeySet: !!process.env.AWS_SECRET_ACCESS_KEY,
    lastError: s3LastError,
    message: connected ? '✅ S3 is working correctly' : '❌ S3 connection failed',
  });
});
app.get('/api/debug/s3/:key', (req, res) => {
  const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${req.params.key}`;
  res.json({ key: req.params.key, bucket: BUCKET_NAME, region: process.env.AWS_REGION, s3Url });
});
// =====================================================
// IMPROVED DEBUG — shows ALL registered routes
// =====================================================
app.get('/api/routes', (req, res) => {
  const routes = [];
  const extractRoutes = (stack, basePath = '') => {
    stack.forEach(layer => {
      if (layer.route) {
        routes.push({
          path: basePath + layer.route.path,
          methods: Object.keys(layer.route.methods).join(', ').toUpperCase(),
        });
      } else if (layer.name === 'router' && layer.handle.stack) {
        const routerPath = basePath + (layer.regexp.source
          .replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/').replace(/\^/g, '').replace(/\?/g, '')
          .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ':param'));
        extractRoutes(layer.handle.stack, routerPath);
      }
    });
  };
  extractRoutes(app._router.stack);
  // Return ALL routes so nothing is hidden
  res.json({
    success: true,
    total: routes.length,
    routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
  });
});
// =====================================================
// ADMIN ROUTES
// =====================================================
// Public admin auth routes and protected admin account routes.
// Route-level authentication in adminRoutes prevents sibling interception.
app.use("/api/admin", adminRoutes);
// Protected admin feature routers, each isolated under one namespace.
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/verification", adminVerificationRoutes);
app.use("/api/admin/university-verification", universityVerificationRoutes);
app.get("/api/student/program-sections", getStudentProgramSections);
app.get("/api/student/programs", searchStudentPrograms);
app.get("/api/student/universities", searchStudentUniversities);
app.use("/api/student/program-index", authenticateToken, programSearchIndexRoutes);
app.use("/api/student/universities", studentUniversityRoutes);
app.use("/api/student-country-universities", studentCountryUniversityCountryRoutes);
console.log('Admin routes mounted at /api/admin');
// =====================================================
// USER ROUTES
// =====================================================
app.use("/api/user", userProfileRoutes);
console.log('✅ User routes mounted at /api/user');
// =====================================================
// PROCESS ADMIN ROUTES
// =====================================================
app.use("/api/process-admin/dashboard", processAdminDashboardRoutes);
app.use("/api/process-admin", processAdminRoutes);
console.log('✅ Process admin routes mounted');
// =====================================================
// ANALYTICS
// =====================================================
app.use('/api/analytics', analyticsRoutes);
console.log('✅ Analytics routes mounted at /api/analytics');
// =====================================================
// MASTER PREVIEW — HARDCODED PING (remove after confirmed working)
// Visit: GET http://localhost:5000/api/master-preview/ping
// 200 = routing works | 404 = server.js changes not saved
// =====================================================
app.get('/api/master-preview/ping', (req, res) => {
  res.json({ success: true, message: '✅ master-preview router is reachable' });
});
// =====================================================
// MASTER APPLICATION ROUTES
// ⚠️  /api/master-preview MUST be mounted before /api/master-personal
// =====================================================

console.log('✅ All master/* routes mounted');
// =====================================================
// APPLICATION ROUTES
// =====================================================
app.use("/api/application/process-admin/gus-university", gusuniversityroutes);
app.use("/api/application/process-admin/medical-university", medicaluniversityroutes);
app.use("/api/master-university", masterUniversityRoutes);
app.use("/api/application/process-admin/master-university", masterUniversityRoutes);

console.log('✅ Application routes mounted');
// =====================================================
// ALL OTHER API ROUTES
// =====================================================
app.use("/api/helpdesk", helpdeskRoutes);
app.use("/api/support-process", supportprocessRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/students", accountRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/bachelors", bachelorsRoutes);
// =====================================================
// ENROLLMENT ROUTES
// =====================================================
app.use("/api/enrollment/personal", enrollmentPersonalRoutes);
app.use("/api/enrollment/education", enrollmentEducationRoutes);
app.use("/api/enrollment/program-selection", enrollmentProgramRoutes);
app.use("/api/enrollment/test-scores", enrollmentTestRoutes);
app.use("/api/enrollment/documents", enrollmentDocumentRoutes);
app.use("/api/enrollment/additional-documents", enrollmentAdditionalDocumentRoutes);
app.use("/api/additional-documents", enrollmentAdditionalDocumentRoutes);
app.use("/api/enrollment/university-selection", enrollmentUniversitySelectionRoutes);
app.use("/api/enrollment/university-review", enrollmentUniversityReviewRoutes);
app.use("/api/enrollment/review", enrollmentReviewRoutes);
app.use("/api/enrollment/application-consistency", applicationConsistencyRoutes);
app.use("/api/enrollment/dashboard", enrollmentDashboardRoutes);

// Direct enrollment application workflow endpoints
app.post("/api/enrollment/save-draft", authMiddleware, saveDraftApplication);
app.post("/api/enrollment/submit-for-approval", authMiddleware, submitForApproval);
app.get("/api/enrollment/application-status", authMiddleware, getApplicationStatus);
app.post("/api/enrollment/resubmit", authMiddleware, resubmitApplication);

console.log('✅ Enrollment routes mounted at /api/enrollment/*');

// ENROLLMENT ADMIN — process-admin views by program type
app.use("/api/enrollment-admin", enrollmentAdminRoutes);
console.log('✅ Enrollment admin routes mounted at /api/enrollment-admin');


app.use("/api/general", generalRoutes);


app.use("/api/students", responsibilitiesRoutes);
app.use("/api/overview", overviewRoutes);
app.use("/api/writing", writingRoutes);
app.use("/api/transfer", transferRoutes);
app.use("/api/profile", extendedProfileRoutes);
app.use("/api/education-transfer", educationtestRoutes);
app.use("/api/writingtest", writingtestRoutes);
console.log('✅ All API routes mounted successfully');
// =====================================================
// ROOT & HEALTH ENDPOINTS
// =====================================================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "EduTechEx API is running...",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    storage: { type: "AWS S3", bucket: BUCKET_NAME, region: process.env.AWS_REGION },
    masterPreviewRoutes: {
      preview: "GET  /api/master-preview",
      submit: "POST /api/master-preview/submit",
      resendEmail: "POST /api/master-preview/resend-email",
      downloadPDF: "GET  /api/master-preview/download-pdf",
      downloadHTML: "GET  /api/master-preview/download-html",
    },
  });
});
app.get("/api/health", async (req, res) => {
  const s3Connected = await checkS3Connection();
  res.status(200).json({
    success: true, message: "Server is healthy",
    uptime: process.uptime(), timestamp: new Date().toISOString(),
    services: { api: "Running", s3: s3Connected ? `Connected (${BUCKET_NAME})` : "❌ Disconnected" }
  });
});
app.get("/api/status", (req, res) =>
  res.status(200).json({
    success: true, message: "All systems operational",
    services: { database: "Connected", api: "Running", cors: "Enabled", storage: `AWS S3 (${BUCKET_NAME})` },
    timestamp: new Date().toISOString(),
  })
);
// Temporary Brevo integration test route.
app.get("/api/test-brevo", async (req, res) => {
  try {
    const result = await sendEmail(
      process.env.BREVO_TEST_EMAIL || "YOUR_TEST_EMAIL@gmail.com",
      "Brevo Test",
      "<h1>Brevo Working</h1>"
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});
// =====================================================
// 404 HANDLER
// =====================================================
app.use((req, res) => {
  console.log(`❌ 404 - ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    suggestion: "Visit GET /api/routes to see all registered routes",
  });
});
// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================
app.use((err, req, res, next) => {
  console.error("\n🔴 GLOBAL ERROR CAUGHT:");
  console.error("   Message     :", err.message);
  console.error("   Name        :", err.name);
  console.error("   Code        :", err.code || err.Code);
  console.error("   HTTP Status :", err.$metadata?.httpStatusCode || err.status);
  if (err.storageErrors?.length)
    console.error("   StorageErrors:", JSON.stringify(err.storageErrors, null, 2));
  console.error("   Stack       :", err.stack);
  if (err.name === "JsonWebTokenError")
    return res.status(401).json({ success: false, message: "Invalid token" });
  if (err.name === "TokenExpiredError")
    return res.status(401).json({ success: false, message: "Token expired" });
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: "Validation Error", errors: messages });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({ success: false, message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` });
  }
  if (err.code === "LIMIT_FILE_SIZE")
    return res.status(400).json({ success: false, message: "File too large. Max size is 10MB." });
  if (err.name === "MulterError")
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  if (err.storageErrors || err.$metadata || err.Code)
    return res.status(500).json({
      success: false,
      message: "S3 upload failed. Please try again.",
      ...(process.env.NODE_ENV === "development" && { detail: err.message, code: err.Code || err.code }),
    });
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Something went wrong!",
    ...(process.env.NODE_ENV === "development" && { error: err.stack }),
  });
});
// =====================================================
// START SERVER
// =====================================================
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, async () => {
    const s3Connected = await checkS3Connection();
    console.log(`
╔════════════════════════════════════════════╗
║          🚀 EduTechEx API Server           ║
╚════════════════════════════════════════════╝
📡 Server Status:
   ✅ Port        : ${PORT}
   ✅ Environment : ${process.env.NODE_ENV || "development"}
   ✅ URL         : http://localhost:${PORT}
☁️  Storage (AWS S3):
   ${s3Connected ? '✅' : '❌'} Bucket : ${BUCKET_NAME}
   ${s3Connected ? '✅' : '❌'} Region : ${process.env.AWS_REGION}
   ${s3Connected ? '✅' : '❌'} Status : ${s3Connected ? 'Connected ✅' : 'FAILED ❌ — Check .env!'}
📋 Master Preview:
   ✅ GET  /api/master-preview
   ✅ POST /api/master-preview/submit
   ✅ POST /api/master-preview/resend-email
   ✅ GET  /api/master-preview/download-pdf
   ✅ GET  /api/master-preview/download-html
🔧 Debug:
   ✅ GET /api/test
   ✅ GET /api/routes
   ✅ GET /api/debug/s3
   ✅ GET /api/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
    if (!s3Connected) {
      console.error(`⚠️  WARNING: S3 NOT connected! File uploads will FAIL. Check your .env.`);
    }
  });
}
export default app;
