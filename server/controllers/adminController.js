import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import Admin from "../models/Admin.js";
import { sendOTPEmail } from "../utils/sendEmail.js";

const ALLOWED_ADMIN_EMAIL = "edutechexcollege@gmail.com";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const isAllowedAdminEmail = (email = "") =>
  normalizeEmail(email) === ALLOWED_ADMIN_EMAIL;

const generateToken = (admin) =>
  jwt.sign(
    {
      id: admin._id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

const buildAdminResponse = (admin) => ({
  id: admin._id,
  email: admin.email,
  name: admin.name,
  role: admin.role,
  lastLogin: admin.lastLogin,
});

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const rejectUnauthorizedAdminEmail = (res) =>
  res.status(403).json({
    success: false,
    message: "This email is not authorized for admin access.",
  });

// ---------------------------------------------------------------------------
// POST /api/admin/login
// ---------------------------------------------------------------------------
export const loginAdmin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const email = normalizeEmail(req.body.email || "");
    const password = req.body.password || "";

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    if (!isAllowedAdminEmail(email)) {
      return rejectUnauthorizedAdminEmail(res);
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin account not found. Please create/set password first.",
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Admin account is inactive.",
      });
    }

    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken(admin);

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      token,
      admin: buildAdminResponse(admin),
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// POST /api/admin/setup
// ---------------------------------------------------------------------------
export const createInitialAdmin = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email || "");
    const name = (req.body.name || "Super Admin").trim();
    const password = req.body.password || "";

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    if (!isAllowedAdminEmail(email)) {
      return rejectUnauthorizedAdminEmail(res);
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const existingAdmin = await Admin.findOne({});
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Admin account already exists.",
      });
    }

    const admin = await Admin.create({
      name,
      email,
      password,
      role: "super_admin",
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Admin account created successfully.",
      admin: buildAdminResponse(admin),
    });
  } catch (error) {
    console.error("Admin setup error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// POST /api/admin/forgot-password
// ---------------------------------------------------------------------------
export const forgotAdminPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email || "");

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    if (!isAllowedAdminEmail(email)) {
      return rejectUnauthorizedAdminEmail(res);
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin account not found. Please create/set password first.",
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Admin account is inactive.",
      });
    }

    const otp = generateOtp();
    admin.resetOtpHash = await bcrypt.hash(otp, 10);
    admin.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    admin.resetOtpVerified = false;
    admin.resetOtpVerifiedExpires = undefined;
    await admin.save();

    const emailResult = await sendOTPEmail(email, otp, "admin password reset");
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset OTP has been sent to your email.",
    });
  } catch (error) {
    console.error("Admin forgot password error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// POST /api/admin/verify-reset-otp
// ---------------------------------------------------------------------------
export const verifyAdminResetOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email || "");
    const otp = (req.body.otp || "").trim();

    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required." });
    }

    if (!isAllowedAdminEmail(email)) {
      return rejectUnauthorizedAdminEmail(res);
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin account not found. Please create/set password first.",
      });
    }

    if (!admin.resetOtpHash || !admin.resetOtpExpires) {
      return res.status(400).json({
        success: false,
        message: "No password reset OTP found. Please request a new OTP.",
      });
    }

    if (admin.resetOtpExpires.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    const isOtpValid = await bcrypt.compare(otp, admin.resetOtpHash);
    if (!isOtpValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    admin.resetOtpVerified = true;
    admin.resetOtpVerifiedExpires = new Date(Date.now() + 10 * 60 * 1000);
    await admin.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified. You can reset your password now.",
    });
  } catch (error) {
    console.error("Admin reset OTP verification error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// POST /api/admin/reset-password
// ---------------------------------------------------------------------------
export const resetAdminPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email || "");
    const newPassword = req.body.newPassword || "";

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email and new password are required.",
      });
    }

    if (!isAllowedAdminEmail(email)) {
      return rejectUnauthorizedAdminEmail(res);
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin account not found. Please create/set password first.",
      });
    }

    if (
      !admin.resetOtpVerified ||
      !admin.resetOtpVerifiedExpires ||
      admin.resetOtpVerifiedExpires.getTime() < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "OTP verification has expired. Please verify a new OTP.",
      });
    }

    admin.password = newPassword;
    admin.resetOtpHash = undefined;
    admin.resetOtpExpires = undefined;
    admin.resetOtpVerified = false;
    admin.resetOtpVerifiedExpires = undefined;
    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful. Please log in with your new password.",
    });
  } catch (error) {
    console.error("Admin reset password error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// GET /api/admin/profile  (protected)
// ---------------------------------------------------------------------------
export const getAdminProfile = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      admin: buildAdminResponse(req.admin),
    });
  } catch (error) {
    console.error("Get admin profile error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// POST /api/admin/logout  (protected)
// ---------------------------------------------------------------------------
export const logoutAdmin = (_req, res) =>
  res.status(200).json({ success: true, message: "Admin logged out successfully" });

// ---------------------------------------------------------------------------
// PUT /api/admin/profile  (protected)
// ---------------------------------------------------------------------------
export const updateAdminProfile = async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    req.admin.name = name;
    await req.admin.save();

    return res.status(200).json({
      success: true,
      message: "Admin profile updated successfully",
      admin: buildAdminResponse(req.admin),
    });
  } catch (error) {
    console.error("Update admin profile error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// PUT /api/admin/change-password  (protected)
// ---------------------------------------------------------------------------
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide current and new password",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const isPasswordValid = await req.admin.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Current password is incorrect" });
    }

    req.admin.password = newPassword;
    await req.admin.save();

    return res
      .status(200)
      .json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
