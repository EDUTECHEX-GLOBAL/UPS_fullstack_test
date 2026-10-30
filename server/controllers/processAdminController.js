// backend/controllers/processAdminController.js
import ProcessAdmin from "../models/processAdminModel.js";
import { sendEmail } from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";
import { createProcessAdminRequestNotification } from "./notificationController.js";

// =====================================================
// HELPERS
// =====================================================

const generateToken = (processAdmin) => {
  return jwt.sign(
    {
      id: processAdmin._id,
      email: processAdmin.email,
      role: processAdmin.role,
    },
    process.env.JWT_SECRET || "your-secret-key-2026",
    { expiresIn: "7d" }
  );
};

const isValidEmailAddress = (value) => /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,}$/i.test(value);

// =====================================================
// EMAIL TEMPLATES
// =====================================================

// ✅ FIX: This function was MISSING — caused the 500 error on register & resend-otp
const buildOtpEmail = (firstName, otp) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:linear-gradient(135deg,#14b8a6,#0d9488);padding:32px 40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">EdutechEX — Process Admin</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">Email Verification</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#374151;font-size:15px;margin:0 0 16px;">Hi <strong>${firstName}</strong>,</p>
            <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 24px;">
              Use the OTP below to verify your email address. It is valid for <strong>10 minutes</strong>.
            </p>
            <div style="background:#f0fdf9;border:2px dashed #14b8a6;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
              <p style="color:#0d9488;font-size:36px;font-weight:800;letter-spacing:12px;margin:0;font-family:monospace;">
                ${otp}
              </p>
            </div>
            <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">
              If you did not request this, please ignore this email. Do not share this OTP with anyone.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 28px;text-align:center;border-top:1px solid #f1f5f9;">
            <p style="color:#cbd5e1;font-size:11px;margin:0;">© 2026 EdutechEX. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const buildPendingApprovalEmail = (firstName) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:linear-gradient(135deg,#14b8a6,#0d9488);padding:32px 40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">EdutechEX — Process Admin</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">Registration Received</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#374151;font-size:15px;margin:0 0 16px;">Hi <strong>${firstName}</strong>,</p>
            <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 16px;">
              Your email has been verified successfully. 🎉
            </p>
            <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 24px;">
              Your account is now <strong>pending admin approval</strong>. You will receive another email once your account has been reviewed and activated.
            </p>
            <div style="background:#f0fdf9;border-left:4px solid #14b8a6;border-radius:8px;padding:14px 18px;">
              <p style="color:#0d9488;font-size:13px;margin:0;font-weight:600;">⏳ Typical approval time: 1–2 business days</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 28px;text-align:center;border-top:1px solid #f1f5f9;">
            <p style="color:#cbd5e1;font-size:11px;margin:0;">© 2026 EdutechEX. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const buildApprovedEmail = (firstName) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:linear-gradient(135deg,#14b8a6,#0d9488);padding:32px 40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">EdutechEX — Process Admin</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">Account Approved ✅</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#374151;font-size:15px;margin:0 0 16px;">Hi <strong>${firstName}</strong>,</p>
            <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 16px;">
              Great news! Your Process Admin account has been <strong style="color:#14b8a6;">approved</strong>.
            </p>
            <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0;">
              You can now log in to the EdutechEX Process Admin Dashboard using your registered email and password.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 28px;text-align:center;border-top:1px solid #f1f5f9;">
            <p style="color:#cbd5e1;font-size:11px;margin:0;">© 2026 EdutechEX. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const buildPasswordResetEmail = (firstName, otp) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:linear-gradient(135deg,#14b8a6,#0d9488);padding:32px 40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">EdutechEX Process Admin</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">Password Reset</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#374151;font-size:15px;margin:0 0 16px;">Hi <strong>${firstName}</strong>,</p>
            <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 24px;">
              Use this OTP to reset your Process Admin password. It is valid for <strong>10 minutes</strong>.
            </p>
            <div style="background:#f0fdf9;border:2px dashed #14b8a6;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
              <p style="color:#0d9488;font-size:36px;font-weight:800;letter-spacing:12px;margin:0;font-family:monospace;">
                ${otp}
              </p>
            </div>
            <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">
              If you did not request a password reset, please ignore this email. Do not share this OTP.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 28px;text-align:center;border-top:1px solid #f1f5f9;">
            <p style="color:#cbd5e1;font-size:11px;margin:0;">EdutechEX. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const buildRejectedEmail = (firstName, reason) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:linear-gradient(135deg,#ef4444,#b91c1c);padding:32px 40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">EdutechEX — Process Admin</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">Account Not Approved</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#374151;font-size:15px;margin:0 0 16px;">Hi <strong>${firstName}</strong>,</p>
            <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 16px;">
              After reviewing your Process Admin application, we were unable to approve your account at this time.
            </p>
            <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:8px;padding:14px 18px;margin:0 0 20px;">
              <p style="color:#b91c1c;font-size:13px;margin:0;font-weight:600;">Reason: ${reason || "Not specified"}</p>
            </div>
            <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0;">
              If you believe this is an error, please contact your administrator.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 28px;text-align:center;border-top:1px solid #f1f5f9;">
            <p style="color:#cbd5e1;font-size:11px;margin:0;">© 2026 EdutechEX. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// =====================================================
// @desc    Register new Process Admin
// @route   POST /api/process-admin/register
// @access  Public
// =====================================================
export const registerProcessAdmin = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    }

    const existing = await ProcessAdmin.findOne({ email: email.toLowerCase() });

    if (existing) {
      // Already registered but OTP not verified — resend OTP
      if (!existing.isEmailVerified) {
        const otp = existing.generateOTP();
        await existing.save();
        await sendEmail(existing.email, "Your EdutechEX OTP Code", buildOtpEmail(existing.firstName, otp));
        return res.json({
          success: true,
          message: "Account exists but email not verified. A new OTP has been sent.",
          step: "verify_otp",
          email: existing.email,
        });
      }
      return res.status(400).json({ success: false, message: "Email already registered." });
    }

    const processAdmin = new ProcessAdmin({
      email,
      password,
      firstName,
      lastName,
      status: "pending_verification",
    });

    const otp = processAdmin.generateOTP();
    await processAdmin.save();

    await sendEmail(email, "Your EdutechEX OTP Code", buildOtpEmail(firstName, otp));

    console.log(`✅ Process admin registered: ${email}`);

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email for the OTP.",
      step: "verify_otp",
      email,
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Email already registered." });
    }
    return res.status(500).json({ success: false, message: "Server error during registration." });
  }
};

// =====================================================
// @desc    Verify OTP
// @route   POST /api/process-admin/verify-otp
// @access  Public
// =====================================================
export const verifyProcessAdminOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required." });
    }

    const processAdmin = await ProcessAdmin.findOne({ email: email.toLowerCase() });

    if (!processAdmin) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }

    if (processAdmin.isEmailVerified) {
      return res.status(400).json({ success: false, message: "Email already verified." });
    }

    const result = processAdmin.verifyOTP(otp);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.reason });
    }

    processAdmin.isEmailVerified = true;
    processAdmin.status = "pending_approval";
    processAdmin.clearOTP();
    await processAdmin.save();

    createProcessAdminRequestNotification(processAdmin).catch(console.error);

    await sendEmail(
      email,
      "Registration Received — Pending Approval",
      buildPendingApprovalEmail(processAdmin.firstName)
    );

    console.log(`✅ OTP verified for: ${email} — now pending approval`);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. Your account is pending admin approval.",
      data: {
        _id: processAdmin._id,
        status: processAdmin.status,
        isApproved: processAdmin.isApproved,
        approvedAt: processAdmin.approvedAt,
      },
    });
  } catch (error) {
    console.error("❌ OTP verification error:", error);
    return res.status(500).json({ success: false, message: "Server error during OTP verification." });
  }
};

// =====================================================
// @desc    Resend OTP
// @route   POST /api/process-admin/resend-otp
// @access  Public
// =====================================================
export const resendProcessAdminOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const processAdmin = await ProcessAdmin.findOne({ email: email.toLowerCase() });

    if (!processAdmin) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }

    if (processAdmin.isEmailVerified) {
      return res.status(400).json({ success: false, message: "Email already verified." });
    }

    // 60-second cooldown — prevent spam
    if (processAdmin.otpExpiry) {
      const cooldownEnd = new Date(processAdmin.otpExpiry).getTime() - 9 * 60 * 1000;
      if (Date.now() < cooldownEnd) {
        return res.status(429).json({
          success: false,
          message: "Please wait before requesting a new OTP.",
        });
      }
    }

    const otp = processAdmin.generateOTP();
    await processAdmin.save();

    await sendEmail(email, "Your new EdutechEX OTP Code", buildOtpEmail(processAdmin.firstName, otp));

    return res.status(200).json({ success: true, message: "A new OTP has been sent to your email." });
  } catch (error) {
    console.error("❌ Resend OTP error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// =====================================================
// @desc    Send forgot password OTP
// @route   POST /api/process-admin/forgot-password/send-otp
// @access  Public
// =====================================================
export const sendProcessAdminForgotPasswordOtp = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim();

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }
    if (!isValidEmailAddress(email)) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address." });
    }

    const processAdmin = await ProcessAdmin.findOne({ email: email.toLowerCase() });

    if (!processAdmin) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }

    if (processAdmin.otpExpiry) {
      const cooldownEnd = new Date(processAdmin.otpExpiry).getTime() - 9 * 60 * 1000;
      if (Date.now() < cooldownEnd) {
        return res.status(429).json({
          success: false,
          message: "Please wait before requesting a new OTP.",
        });
      }
    }

    const otp = processAdmin.generateOTP();
    await processAdmin.save();

    await sendEmail(
      processAdmin.email,
      "Reset your EdutechEX Process Admin password",
      buildPasswordResetEmail(processAdmin.firstName, otp)
    );

    return res.status(200).json({
      success: true,
      message: "Password reset OTP has been sent to your email.",
      email: processAdmin.email,
    });
  } catch (error) {
    console.error("Forgot password OTP error:", error);
    return res.status(500).json({ success: false, message: "Server error while sending OTP." });
  }
};

// =====================================================
// @desc    Verify forgot password OTP
// @route   POST /api/process-admin/forgot-password/verify-otp
// @access  Public
// =====================================================
export const verifyProcessAdminForgotPasswordOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required." });
    }

    const processAdmin = await ProcessAdmin.findOne({ email: email.toLowerCase() });

    if (!processAdmin) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }

    const result = processAdmin.verifyOTP(otp);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.reason });
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified. You can reset your password now.",
    });
  } catch (error) {
    console.error("Forgot password OTP verification error:", error);
    return res.status(500).json({ success: false, message: "Server error during OTP verification." });
  }
};

// =====================================================
// @desc    Reset forgot password
// @route   POST /api/process-admin/forgot-password/reset
// @access  Public
// =====================================================
export const resetProcessAdminForgotPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "Email, OTP, and new password are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    }

    const processAdmin = await ProcessAdmin.findOne({ email: email.toLowerCase() });

    if (!processAdmin) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }

    const result = processAdmin.verifyOTP(otp);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.reason });
    }

    processAdmin.password = newPassword;
    processAdmin.clearOTP();
    processAdmin.loginAttempts = 0;
    processAdmin.lockUntil = null;
    await processAdmin.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful. Please log in with your new password.",
    });
  } catch (error) {
    console.error("Forgot password reset error:", error);
    return res.status(500).json({ success: false, message: "Server error while resetting password." });
  }
};

// =====================================================
// @desc    Login (only approved accounts)
// @route   POST /api/process-admin/login
// @access  Public
// =====================================================
export const loginProcessAdmin = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please provide email and password." });
    }
    if (!isValidEmailAddress(email)) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address." });
    }

    console.log("\n🔐 ===== PROCESS ADMIN LOGIN ATTEMPT =====");
    console.log("Email:", email);

    const processAdmin = await ProcessAdmin.findOne({ email: email.toLowerCase() });

    if (!processAdmin) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    // Account locked check
    if (processAdmin.isLocked()) {
      const minutesLeft = Math.ceil((processAdmin.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${minutesLeft} minute(s).`,
      });
    }

    // Email not verified
    if (!processAdmin.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Email not verified. Please complete OTP verification.",
        step: "verify_otp",
        email: processAdmin.email,
      });
    }

    // Not approved yet
    if (!processAdmin.isApproved || processAdmin.status !== "active") {
      if (processAdmin.status === "rejected") {
        return res.status(403).json({
          success: false,
          message: `Your account was rejected. Reason: ${processAdmin.rejectionReason || "Please contact the administrator."}`,
          step: "rejected",
        });
      }
      return res.status(403).json({
        success: false,
        message: "Your account is pending admin approval.",
        step: "pending_approval",
      });
    }

    // Password check
    const isMatch = await processAdmin.comparePassword(password);
    if (!isMatch) {
      await processAdmin.incrementLoginAttempts();
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    // Success
    await processAdmin.resetLoginAttempts();
    processAdmin.lastLogin = new Date();
    await processAdmin.save();

    const token = generateToken(processAdmin);

    console.log("✅ Login successful for:", email);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      processAdmin: {
        id: processAdmin._id,
        email: processAdmin.email,
        firstName: processAdmin.firstName,
        lastName: processAdmin.lastName,
        role: processAdmin.role,
        lastLogin: processAdmin.lastLogin,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    return res.status(500).json({ success: false, message: "Server error during login." });
  }
};

// =====================================================
// @desc    Approve a process admin
// @route   POST /api/process-admin/approve/:id
// @access  Private (Super Admin)
// =====================================================
export const approveProcessAdmin = async (req, res) => {
  try {
    const processAdmin = await ProcessAdmin.findById(req.params.id);

    if (!processAdmin) {
      return res.status(404).json({ success: false, message: "Process admin not found." });
    }

    if (!processAdmin.isEmailVerified) {
      return res.status(400).json({ success: false, message: "Email not verified yet." });
    }

    processAdmin.isApproved = true;
    processAdmin.status     = "active";
    processAdmin.approvedAt = new Date();
    processAdmin.approvedBy = req.body.approvedBy || "SuperAdmin";
    await processAdmin.save();

    await sendEmail(
      processAdmin.email,
      "Your EdutechEX Account Has Been Approved",
      buildApprovedEmail(processAdmin.firstName)
    );

    const updated = await ProcessAdmin.findById(req.params.id)
      .select("-password -otp -otpExpiry");

    return res.status(200).json({
      success: true,
      message: `Process admin ${processAdmin.email} approved successfully.`,
      data: updated,
    });
  } catch (error) {
    console.error("❌ Approval error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// =====================================================
// @desc    Reject a process admin
// @route   POST /api/process-admin/reject/:id
// @access  Private (Super Admin)
// =====================================================
export const rejectProcessAdmin = async (req, res) => {
  try {
    const { reason } = req.body;
    const processAdmin = await ProcessAdmin.findById(req.params.id);

    if (!processAdmin) {
      return res.status(404).json({ success: false, message: "Process admin not found." });
    }

    processAdmin.isApproved      = false;
    processAdmin.status          = "rejected";
    processAdmin.rejectionReason = reason || "Not specified";
    await processAdmin.save();

    await sendEmail(
      processAdmin.email,
      "Your EdutechEX Process Admin Application Was Not Approved",
      buildRejectedEmail(processAdmin.firstName, processAdmin.rejectionReason)
    );

    const updated = await ProcessAdmin.findById(req.params.id)
      .select("-password -otp -otpExpiry");

    return res.status(200).json({
      success: true,
      message: "Process admin rejected.",
      data: updated,
    });
  } catch (error) {
    console.error("❌ Rejection error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// =====================================================
// @desc    Get all pending approvals
// @route   GET /api/process-admin/pending
// @access  Private (Super Admin)
// =====================================================
export const getPendingProcessAdmins = async (req, res) => {
  try {
    const pending = await ProcessAdmin.find({ status: "pending_approval" })
      .select("-password -otp -otpExpiry")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: pending.length, data: pending });
  } catch (error) {
    console.error("❌ Fetch pending error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// =====================================================
// @desc    Get pending process admin count only
// @route   GET /api/process-admin/pending-count
// @access  Private (Super Admin)
// =====================================================
export const getPendingProcessAdminCount = async (req, res) => {
  try {
    const count = await ProcessAdmin.countDocuments({ status: "pending_approval" });
    return res.status(200).json({ success: true, count });
  } catch (error) {
    console.error("Fetch pending process admin count error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// =====================================================
// @desc    Get ALL process admins (all statuses)
// @route   GET /api/process-admin/all
// @access  Private (Super Admin)
// =====================================================
export const getAllProcessAdmins = async (req, res) => {
  try {
    const admins = await ProcessAdmin.find()
      .select("-password -otp -otpExpiry")
      .sort({ createdAt: -1 });

    console.log(`📋 Total process admins found: ${admins.length}`);

    return res.status(200).json({
      success: true,
      count: admins.length,
      data: admins,
    });
  } catch (error) {
    console.error("❌ Fetch all error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// =====================================================
// @desc    Get current process admin profile
// @route   GET /api/process-admin/me
// @access  Private
// =====================================================
export const getProcessAdminProfile = async (req, res) => {
  try {
    const processAdmin = await ProcessAdmin.findById(req.processAdmin.id).select(
      "-password -otp -otpExpiry"
    );

    if (!processAdmin) {
      return res.status(404).json({ success: false, message: "Admin not found." });
    }

    return res.status(200).json({ success: true, processAdmin });
  } catch (error) {
    console.error("❌ Get profile error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// =====================================================
// @desc    Logout
// @route   POST /api/process-admin/logout
// @access  Private
// =====================================================
export const logoutProcessAdmin = (req, res) => {
  return res.status(200).json({ success: true, message: "Logged out successfully." });
};

// =====================================================
// @desc    Verify token
// @route   GET /api/process-admin/verify
// @access  Private
// =====================================================
export const verifyProcessAdminToken = (req, res) => {
  return res.status(200).json({
    success: true,
    processAdmin: {
      id: req.processAdmin.id,
      email: req.processAdmin.email,
      role: req.processAdmin.role,
    },
  });
};

// =====================================================
// @desc    Deactivate / Reactivate a process admin
// @route   PATCH /api/process-admin/deactivate/:id
// @access  Private (Super Admin)
// =====================================================
export const deactivateProcessAdmin = async (req, res) => {
  try {
    const processAdmin = await ProcessAdmin.findById(req.params.id);

    if (!processAdmin) {
      return res.status(404).json({ success: false, message: "Process admin not found." });
    }

    // Toggle: active → suspended, suspended → active
    const newStatus   = processAdmin.status === "active" ? "suspended" : "active";
    const newIsActive = newStatus === "active";

    processAdmin.status   = newStatus;
    processAdmin.isActive = newIsActive;
    await processAdmin.save();

    return res.status(200).json({
      success: true,
      message: `Process admin ${newStatus === "active" ? "reactivated" : "deactivated"} successfully.`,
      data: {
        _id:      processAdmin._id,
        status:   processAdmin.status,
        isActive: processAdmin.isActive,
      },
    });
  } catch (error) {
    console.error("❌ Deactivate error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
