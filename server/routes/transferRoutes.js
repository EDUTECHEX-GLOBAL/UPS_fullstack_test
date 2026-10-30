import express from "express";
import * as transferController from "../controllers/transferController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * ========================================
 * 🔐 AUTHENTICATION ROUTES
 * ========================================
 */
router.post("/register", transferController.registerTransferStudent);
router.post("/login", transferController.loginTransferStudent);

/**
 * ========================================
 * 🔓 FORGOT PASSWORD ROUTES (NO AUTH NEEDED)
 * ========================================
 */
// Request OTP for password reset - WITH ERROR HANDLING
router.post("/forgot-password/request-otp", 
  transferController.forgotPasswordRequestOtp,
  (error, req, res, next) => {
    console.error('🚨 500 ERROR - /api/transfer/forgot-password/request-otp');
    console.error('📧 EMAIL:', req.body.email || 'NOT PROVIDED');
    console.error('💥 ERROR STACK:', error.stack);
    console.error('📦 REQUEST BODY:', req.body);
    console.error('=====================================');
    
    res.status(500).json({ 
      message: 'Server error sending OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
);

// Verify OTP for password reset (separate from email verification)
router.post("/forgot-password/verify-otp", transferController.verifyOTPForPasswordReset);

// Reset password after OTP verification
router.post("/forgot-password/reset", transferController.forgotPasswordReset);

/**
 * ========================================
 * 📧 OTP ROUTES (EMAIL VERIFICATION)
 * ========================================
 */
router.post("/send-otp", transferController.sendOTP);
router.post("/verify-otp", transferController.verifyOTP); // For email verification

/**
 * ========================================
 * 👤 PROFILE ROUTES (PROTECTED)
 * ========================================
 */
// ✅ IMPORTANT: More specific routes (without params) MUST come BEFORE parameterized routes

// Get current user profile (from JWT token) - for Dashboard
router.get("/profile", authenticateToken, transferController.getCurrentTransferStudentProfile);

// ✅ NEW: Update current user profile (from JWT token) - for ExtendedProfile & ProfileForm
router.put("/profile", authenticateToken, transferController.updateCurrentTransferStudentProfile);

// Get specific profile by ID (Admin route)
router.get("/profile/:id", authenticateToken, transferController.getTransferStudentProfile);

// Update specific profile by ID (Admin route)
router.put("/profile/:id", authenticateToken, transferController.updateTransferStudent);

// Delete specific profile by ID (Admin route)
router.delete("/profile/:id", authenticateToken, transferController.deleteTransferStudent);

/**
 * ========================================
 * 🧑‍💼 ADMIN ROUTES
 * ========================================
 */
router.get("/admin/all", authenticateToken, transferController.getAllTransferStudents);

/**
 * ========================================
 * 🧭 ROUTE SUMMARY
 * ========================================
 * 🔐 AUTHENTICATION:
 * POST   /api/transfer/register                    - Register new transfer student
 * POST   /api/transfer/login                       - Login transfer student
 * 
 * 🔓 FORGOT PASSWORD:
 * POST   /api/transfer/forgot-password/request-otp - Request OTP for password reset ⭐ ERROR HANDLING ADDED
 * POST   /api/transfer/forgot-password/verify-otp  - Verify OTP for password reset
 * POST   /api/transfer/forgot-password/reset       - Reset password after OTP verification
 * 
 * 📧 EMAIL VERIFICATION:
 * POST   /api/transfer/send-otp                    - Send OTP for email verification
 * POST   /api/transfer/verify-otp                  - Verify OTP for email verification
 * 
 * 👤 PROFILE (PROTECTED):
 * GET    /api/transfer/profile           🔒        - Get current user profile (Dashboard)
 * PUT    /api/transfer/profile           🔒        - Update current user profile (ExtendedProfile/ProfileForm)
 * 
 * 👤 ADMIN PROFILE MANAGEMENT:
 * GET    /api/transfer/profile/:id       🔒        - Get student profile by ID (Admin)
 * PUT    /api/transfer/profile/:id       🔒        - Update student profile by ID (Admin)
 * DELETE /api/transfer/profile/:id       🔒        - Delete student account (Admin)
 * 
 * 🧑‍💼 ADMIN:
 * GET    /api/transfer/admin/all         🔒        - Get all transfer students (Admin)
 * ========================================
 */

// GLOBAL ERROR HANDLER for ALL Transfer routes (logs + safe response)
router.use((error, req, res, next) => {
  console.error('🚨 GLOBAL 500 ERROR - Transfer Routes');
  console.error('📍 URL:', req.originalUrl);
  console.error('📝 Method:', req.method);
  console.error('📧 Email (if any):', req.body?.email || 'N/A');
  console.error('💥 ERROR:', error.message);
  console.error('📦 STACK:', error.stack);
  console.error('=====================================');
  
  res.status(500).json({ 
    message: 'Server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    path: req.originalUrl
  });
});

// Log route registration
console.log('✅ Transfer routes loaded successfully WITH ERROR HANDLING');
console.log('📋 Available routes:');
console.log('   🔐 AUTHENTICATION:');
console.log('   POST   /api/transfer/register');
console.log('   POST   /api/transfer/login');
console.log('');
console.log('   🔓 FORGOT PASSWORD:');
console.log('   POST   /api/transfer/forgot-password/request-otp ⭐ ERROR HANDLING ADDED');
console.log('   POST   /api/transfer/forgot-password/verify-otp');
console.log('   POST   /api/transfer/forgot-password/reset');
console.log('');
console.log('   📧 EMAIL VERIFICATION:');
console.log('   POST   /api/transfer/send-otp');
console.log('   POST   /api/transfer/verify-otp');
console.log('');
console.log('   👤 PROFILE (PROTECTED):');
console.log('   GET    /api/transfer/profile (protected)');
console.log('   PUT    /api/transfer/profile (protected) ← ExtendedProfile');
console.log('   GET    /api/transfer/profile/:id (protected)');
console.log('   PUT    /api/transfer/profile/:id (protected)');
console.log('   DELETE /api/transfer/profile/:id (protected)');
console.log('');
console.log('   🧑‍💼 ADMIN:');
console.log('   GET    /api/transfer/admin/all (protected)');

export default router;
