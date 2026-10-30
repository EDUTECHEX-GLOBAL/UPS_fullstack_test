// routes/processAdminRoutes.js
import express from "express";
import { protectProcessAdmin } from "../middleware/processAdminAuth.js";
import { verifyApplicationByProcessAdmin } from "../controllers/applicationVerificationController.js";
import {
  registerProcessAdmin,
  verifyProcessAdminOtp,
  resendProcessAdminOtp,
  sendProcessAdminForgotPasswordOtp,
  verifyProcessAdminForgotPasswordOtp,
  resetProcessAdminForgotPassword,
  loginProcessAdmin,
  approveProcessAdmin,
  rejectProcessAdmin,
  getPendingProcessAdmins,
  getPendingProcessAdminCount,
  getAllProcessAdmins,        // ← ADD THIS IMPORT
  getProcessAdminProfile,
  logoutProcessAdmin,
  verifyProcessAdminToken,
    deactivateProcessAdmin,   
} from "../controllers/processAdminController.js";

const router = express.Router();

// Public
router.post("/register",    registerProcessAdmin);
router.post("/verify-otp",  verifyProcessAdminOtp);
router.post("/resend-otp",  resendProcessAdminOtp);
router.post("/forgot-password/send-otp", sendProcessAdminForgotPasswordOtp);
router.post("/forgot-password/verify-otp", verifyProcessAdminForgotPasswordOtp);
router.post("/forgot-password/reset", resetProcessAdminForgotPassword);
router.post("/login",       loginProcessAdmin);

// Admin actions
router.get("/all",          getAllProcessAdmins);     // ← ADD THIS ROUTE
router.get("/pending-count", getPendingProcessAdminCount);
router.get("/pending",      getPendingProcessAdmins);
router.post("/approve/:id", approveProcessAdmin);
router.patch("/deactivate/:id", deactivateProcessAdmin);  // ← ADD
router.post("/reject/:id",  rejectProcessAdmin);

// Private
router.post("/verify-application", protectProcessAdmin, verifyApplicationByProcessAdmin);
router.get("/me",           getProcessAdminProfile);
router.post("/logout",      logoutProcessAdmin);
router.get("/verify",       verifyProcessAdminToken);

export default router;
