import express from "express";
import { body } from "express-validator";

import {
  loginAdmin,
  getAdminProfile,
  logoutAdmin,
  updateAdminProfile,
  changePassword,
  createInitialAdmin,
  forgotAdminPassword,
  verifyAdminResetOtp,
  resetAdminPassword,
} from "../controllers/adminController.js";

import authenticateAdmin from "../middleware/adminAuthMiddleware.js";

const router = express.Router();

const loginValidation = [
  body("email").isEmail().withMessage("Please provide a valid email address"),
  body("password").notEmpty().withMessage("Password is required"),
];

router.post("/login", loginValidation, loginAdmin);
router.post("/setup", createInitialAdmin);
router.post("/forgot-password", forgotAdminPassword);
router.post("/verify-reset-otp", verifyAdminResetOtp);
router.post("/reset-password", resetAdminPassword);

// Protect only the routes owned by this router. A router-level
// `router.use(authenticateAdmin)` would also intercept sibling routers mounted
// below /api/admin (dashboard, users, universities, verification).
router.get("/profile", authenticateAdmin, getAdminProfile);
router.post("/logout", authenticateAdmin, logoutAdmin);
router.put("/profile", authenticateAdmin, updateAdminProfile);
router.put("/change-password", authenticateAdmin, changePassword);

export default router;
