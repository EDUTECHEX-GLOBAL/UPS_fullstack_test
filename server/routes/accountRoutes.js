import express from "express";
import {
  createFirstYearAccount,
  sendStudentOtp,
  verifyEmailOtp,
  loginAccount,
  verifyOtp,
  getCurrentAccount,
  verifyToken,
  forgotPasswordRequestOtp,
  forgotPasswordReset,
  getUserNotifications,
  markNotificationRead,
  parsePassportUpload,
  parsePassport,
  deletePassport,
  parseAadhaar,
  parseCV,          
} from "../controllers/accountController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import { passportUpload, validateFileUpload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// ================================
// 🔓 Public Routes
// ================================
router.post("/register",                     createFirstYearAccount);
router.post("/send-otp",                     sendStudentOtp);
router.post("/send-email-otp",               sendStudentOtp);
router.post("/resend-otp",                   sendStudentOtp);
router.post("/verify-email-otp",              verifyEmailOtp);
router.post(
  "/parse-passport",
  passportUpload.single("passport"),
  parsePassportUpload
);
router.post("/login",                        loginAccount);
router.post("/verify-otp",                   verifyOtp);
router.post("/verify-token",                 verifyToken);
router.post("/forgot-password/request-otp", forgotPasswordRequestOtp);
router.post("/forgot-password/reset",        forgotPasswordReset);
router.get("/me",                            authMiddleware, getCurrentAccount);
router.get("/current",                       authMiddleware, getCurrentAccount);


// ================================
// ðŸ”” Notifications
// ================================
router.get("/notifications",            authMiddleware, getUserNotifications);
router.post("/notifications/mark-read", authMiddleware, markNotificationRead);

// ================================
// ðŸ›‚ Passport Routes
// POST /api/students/passport/parse
// Fills: name, DOB, gender, country, citizenshipStatus, primaryLanguage.
// Parsed birth-place values are returned only as document data.
// ================================
router.post(
  "/passport/parse",
  authMiddleware,
  passportUpload.single("passport"),
  validateFileUpload,
  parsePassport
);

router.delete("/passport", authMiddleware, deletePassport);

// ================================
// ðŸªª Aadhaar / Govt ID Route
// POST /api/students/aadhaar/parse
// Fills: addressLine1, addressLine2, city, state,
//        zipCode, country, phone, preferredPhoneType
//        + firstName, lastName, birthDate, gender if on front
// ================================
router.post(
  "/aadhaar/parse",
  authMiddleware,
  passportUpload.single("aadhaar"),
  validateFileUpload,
  parseAadhaar
);

// ================================
// ðŸ“„ CV / RÃ©sumÃ© Route â€” NEW
// POST /api/students/cv/parse
// Fills ALL sections:
//   Parsed account data: firstName, lastName, birthDate, gender,
//               phone, address, country, primaryLanguage
//   Education â†’ cvEducation[] (degree, institution, GPA, years)
//   Testing   â†’ cvTesting   { sat, act, gre, toefl, ielts, apScores[] }
//   Activitiesâ†’ cvActivities[] (role, organization, years)
// ================================
router.post(
  "/cv/parse",
  authMiddleware,
  passportUpload.single("cv"),   // reuses same S3 upload middleware
  validateFileUpload,
  parseCV
);

export default router;
