import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

// Required Render env vars:
//   BREVO_API_KEY   = Brevo SMTP key
//   BREVO_SMTP_USER = Brevo SMTP login
//   EMAIL_FROM_NAME = UPS Platform
//   EMAIL_FROM_ADDR = support@ups.edutechex.com
//   SUPPORT_EMAIL   = edutechexcollege@gmail.com
const SENDER_NAME = process.env.EMAIL_FROM_NAME || "UPS Platform";
const SENDER_ADDR = process.env.EMAIL_FROM_ADDR || "support@ups.edutechex.com";
const SUPPORT_ADDR = process.env.SUPPORT_EMAIL || "edutechexcollege@gmail.com";
const SMTP_USER = process.env.BREVO_SMTP_USER || "ae0fed001@smtp-brevo.com";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_PATH = path.join(__dirname, "../assets/edutech-logo.png");
const PASSWORD_RESET_LOGO_PATH = path.join(__dirname, "../src/assets/Edutech-logo.png");
const WHITE_LOGO_PATH = path.join(__dirname, "../src/assets/Edutech-logo-white.png");
const from = `"${SENDER_NAME}" <${SENDER_ADDR}>`;
const supportContactHtml = `<p>Questions? Contact us at <a href="mailto:${SUPPORT_ADDR}">${SUPPORT_ADDR}</a></p>`;

const ensureSupportContact = (html = "") => {
  if (!html || html.includes("Questions? Contact us at")) return html;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${supportContactHtml}</body>`);
  }
  return `${html}${supportContactHtml}`;
};

console.log("Email Config Check:");
console.log("   BREVO_API_KEY   :", process.env.BREVO_API_KEY ? "SET" : "MISSING");
console.log("   BREVO_SMTP_USER :", process.env.BREVO_SMTP_USER ? "SET" : "MISSING");
console.log("   EMAIL_FROM_NAME :", SENDER_NAME);
console.log("   EMAIL_FROM_ADDR :", SENDER_ADDR);
console.log("   SUPPORT_EMAIL   :", SUPPORT_ADDR);
console.log("   FROM_EMAIL      :", from);

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: SMTP_USER,
    pass: process.env.BREVO_API_KEY,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error("SMTP Server Verify Failed:", error.message);
    console.error("SMTP Code:", error.code);
    console.error("SMTP Response:", error.response);
    console.error("SMTP Command:", error.command);
    console.error("SMTP Full Error:", error);
    return;
  }

  console.log("SMTP Server Ready");
});

const logSmtpError = (error) => {
  console.error("SMTP Email failed:", error.message);
  console.error("SMTP Code:", error.code);
  console.error("SMTP Response:", error.response);
  console.error("SMTP Command:", error.command);
};

const sendViaBrevoSMTP = async ({ to, subject, html, text, replyTo, attachments = [] }) => {
  const finalHtml = ensureSupportContact(html);
  const finalReplyTo = replyTo || process.env.SUPPORT_EMAIL || SENDER_ADDR;

  const finalAttachments = Array.isArray(attachments) ? [...attachments] : [];
  if (finalHtml.includes("cid:edutechex-logo") && !finalAttachments.some((a) => a.cid === "edutechex-logo")) {
    const logoFile = fs.existsSync(WHITE_LOGO_PATH)
      ? WHITE_LOGO_PATH
      : fs.existsSync(PASSWORD_RESET_LOGO_PATH)
      ? PASSWORD_RESET_LOGO_PATH
      : fs.existsSync(LOGO_PATH)
      ? LOGO_PATH
      : null;
    if (logoFile) {
      finalAttachments.push({
        filename: "edutech-logo.png",
        path: logoFile,
        cid: "edutechex-logo",
      });
    }
  }

  console.log("Sender:", {
    name: SENDER_NAME,
    email: SENDER_ADDR,
    replyTo: finalReplyTo,
  });

  return await transporter.sendMail({
    from,
    to,
    subject,
    html: finalHtml,
    text: text || finalHtml.replace(/<[^>]*>/g, ""),
    replyTo: finalReplyTo,
    attachments: finalAttachments,
  });
};

// ORIGINAL FUNCTION (backward compatible)
export const sendEmail = async (to, subject, html, attachments = []) => {
  try {
    const response = await sendViaBrevoSMTP({ to, subject, html, attachments });
    console.log("Email sent successfully to:", to);
    console.log("Message ID:", response.messageId);
    return {
      success: true,
      messageId: response.messageId,
      recipient: to,
      subject,
    };
  } catch (error) {
    logSmtpError(error);
    return {
      success: false,
      error: error.response || error.message,
      recipient: to,
      subject,
    };
  }
};

// ENHANCED FUNCTION
export const sendEmailEnhanced = async (options) => {
  try {
    if (!options || typeof options !== "object" || !options.to) {
      console.error("Invalid options passed to sendEmailEnhanced");
      return { success: false, error: "Invalid email options" };
    }

    const { to, subject, html, text, replyTo, attachments } = options;

    if (!to || !subject || !html) {
      console.error("Missing required email parameters", { to, subject });
      return {
        success: false,
        error: "Missing required parameters (to, subject, html)",
      };
    }

    const response = await sendViaBrevoSMTP({ to, subject, html, text, replyTo, attachments });
    console.log("Email sent to:", to, "| Subject:", subject);
    return {
      success: true,
      messageId: response.messageId,
      recipient: to,
      subject,
    };
  } catch (error) {
    logSmtpError(error);
    return {
      success: false,
      error: error.response || error.message,
      recipient: options?.to,
      subject: options?.subject,
    };
  }
};

export const sendPasswordResetOTPEmail = async (to, firstName, otp) => {
  const safeName = String(firstName || "there").replace(/[&<>\"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '\"': "&quot;",
    "'": "&#39;",
  }[char]));
  const attachments = fs.existsSync(PASSWORD_RESET_LOGO_PATH)
    ? [{ filename: "Edutech-logo.png", path: PASSWORD_RESET_LOGO_PATH, cid: "edutechex-logo" }]
    : [];
  const html = `
    <!doctype html>
    <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:24px 12px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#172033;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <tr><td align="center" style="padding:24px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
          ${attachments.length ? '<img src="cid:edutechex-logo" alt="EDUTECHEX" width="190" style="display:block;width:190px;max-width:100%;height:auto;border:0;">' : '<strong style="font-size:22px;color:#263b8f;">EDUTECHEX</strong>'}
        </td></tr>
        <tr><td style="padding:28px 28px 32px;">
          <h1 style="margin:0 0 20px;font-size:26px;line-height:1.25;color:#172033;">Password Reset Code</h1>
          <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">Hi ${safeName},</p>
          <p style="margin:0 0 12px;font-size:16px;line-height:1.6;">Use this code to reset your password:</p>
          <div style="margin:18px 0 22px;padding:16px 12px;background:#f1f5f9;border-radius:10px;text-align:center;font-size:34px;line-height:1.2;font-weight:700;letter-spacing:7px;color:#263b8f;">${otp}</div>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">This code expires in <strong>10 minutes</strong>.</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">If you didn’t request a password reset, you can ignore this email.</p>
        </td></tr>
      </table>
    </body></html>`;
  return sendEmailEnhanced({
    to,
    subject: "College App - Reset Your Password",
    html,
    attachments,
  });
};

// OTP EMAIL FUNCTION
export const sendOTPEmail = async (to, otp, purpose = "verification") => {
  const subject = `Your OTP for ${purpose}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 5px 5px 0 0;">
        <h1 style="color: white; margin: 0; text-align: center;">OTP Verification</h1>
      </div>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; border: 1px solid #ddd;">
        <p>Your One-Time Password for <strong>${purpose}</strong>:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #667eea; background: #f0f0ff; padding: 15px 30px; border-radius: 8px; border: 2px dashed #667eea;">
            ${otp}
          </span>
        </div>
        <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
          <p style="margin: 0;">Valid for <strong>10 minutes</strong> only.</p>
          <p style="margin: 5px 0 0;">Do not share this OTP with anyone.</p>
        </div>
        <p>If you did not request this OTP, please ignore this email.</p>
        ${supportContactHtml}
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #6c757d; font-size: 14px;">
          <p>Best regards,<br><strong>Admissions Office</strong><br>University Admissions System</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return await sendEmailEnhanced({ to, subject, html });
};

// EMAIL TEMPLATES
export const emailTemplates = {
  documentCorrection: (data) => {
    const {
      studentName,
      documentName,
      documentType,
      reason,
      adminNotes,
      deadlineDays = 7,
    } = data;

    let reasonText, instructions, subject;

    switch (reason?.toLowerCase().replace(/ /g, "_")) {
      case "incorrect_format":
        subject = `Action Required: Incorrect Format for ${documentType}`;
        reasonText = "Incorrect document format";
        instructions = `
          <ol>
            <li>Convert your document to PDF format</li>
            <li>Re-upload the corrected document through your application portal</li>
            <li>Ensure all information is clearly readable</li>
          </ol>`;
        break;
      case "suspicious_document":
      case "fake_document":
        subject = `Important: Document Verification Required for ${documentType}`;
        reasonText = "Document authenticity verification required";
        instructions = `
          <ol>
            <li>Upload a clear, authentic copy of the document</li>
            <li>Ensure all details are visible and not altered</li>
            <li>If applicable, provide additional supporting documents</li>
            <li>Re-upload through your application portal</li>
          </ol>
          <p><strong>Important:</strong> Submitting fraudulent documents may result in application rejection.</p>`;
        break;
      case "blurry":
        subject = `Action Required: Unreadable Document - ${documentType}`;
        reasonText = "Document is blurry or unreadable";
        instructions = `
          <ol>
            <li>Take a clear photo or scan of the document</li>
            <li>Ensure all text is legible</li>
            <li>Re-upload the clear version through your application portal</li>
          </ol>`;
        break;
      case "incomplete":
        subject = `Action Required: Incomplete Document - ${documentType}`;
        reasonText = "Document is incomplete or missing pages";
        instructions = `
          <ol>
            <li>Ensure all pages of the document are included</li>
            <li>Check that all required information is present</li>
            <li>Re-upload the complete document through your application portal</li>
          </ol>`;
        break;
      case "wrong_document":
        subject = `Action Required: Wrong Document Uploaded - ${documentType}`;
        reasonText = "Incorrect document type uploaded";
        instructions = `
          <ol>
            <li>Check the required document type in your application portal</li>
            <li>Upload the correct document type</li>
            <li>Ensure it meets all specified requirements</li>
          </ol>`;
        break;
      default:
        subject = `Action Required: ${documentType} Document Review`;
        reasonText = reason || "Document requires review and correction";
        instructions = `
          <ol>
            <li>Review the document requirements in your application portal</li>
            <li>Upload a corrected version of the document</li>
            <li>Ensure all required information is included</li>
          </ol>`;
    }

    return {
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Document Correction Required</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 5px 5px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">Document Correction Required</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; border: 1px solid #ddd;">
            <p>Dear <strong>${studentName}</strong>,</p>
            <p>Your uploaded document has been reviewed and requires correction to proceed with your application.</p>
            <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #856404;">Document Details</h3>
              <p><strong>Document:</strong> ${documentName}</p>
              <p><strong>Type:</strong> ${documentType}</p>
              <p><strong>Issue:</strong> ${reasonText}</p>
              ${adminNotes ? `<p><strong>Admin Notes:</strong> ${adminNotes}</p>` : ""}
            </div>
            <h3 style="color: #2c3e50;">Required Actions</h3>
            ${instructions}
            <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
              <p><strong>Deadline:</strong> Please complete the correction within <strong>${deadlineDays} days</strong>.</p>
              <p><strong>Portal:</strong> Log in to your application portal to re-upload the document.</p>
            </div>
            ${supportContactHtml}
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #6c757d; font-size: 14px;">
              <p>Best regards,<br><strong>Admissions Office</strong><br>University Admissions System</p>
            </div>
          </div>
        </body>
        </html>`,
    };
  },

  documentVerified: (data) => {
    const { studentName, documentName, documentType } = data;
    return {
      subject: `Document Verified: ${documentType}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 20px; border-radius: 5px 5px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">Document Verified Successfully</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; border: 1px solid #ddd;">
            <p>Dear <strong>${studentName}</strong>,</p>
            <p>We are pleased to inform you that your document has been successfully verified and approved.</p>
            <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="margin-top: 0; color: #155724;">Verification Details</h3>
              <p><strong>Document:</strong> ${documentName}</p>
              <p><strong>Type:</strong> ${documentType}</p>
              <p><strong>Status:</strong> Verified and Approved</p>
              <p><strong>Verified On:</strong> ${new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}</p>
            </div>
            <p>This document is now part of your application and will be considered during the admission process.</p>
            <p>Thank you for your cooperation and timely submission.</p>
            ${supportContactHtml}
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #6c757d; font-size: 14px;">
              <p>Best regards,<br><strong>Admissions Office</strong><br>University Admissions System</p>
            </div>
          </div>
        </body>
        </html>`,
    };
  },

  sendDocumentLink: (data) => {
    const { studentName, documentName, documentType, documentUrl, status, remarks } = data;
    return {
      subject: `Document Shared: ${documentName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 5px 5px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">Document Shared</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; border: 1px solid #ddd;">
            <p>Dear <strong>${studentName}</strong>,</p>
            <p>Here is your requested document information:</p>
            <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
              <h3 style="margin-top: 0; color: #0056b3;">Document Information</h3>
              <p><strong>Document:</strong> ${documentName}</p>
              <p><strong>Type:</strong> ${documentType}</p>
              <p><strong>Status:</strong> ${status}</p>
              ${remarks ? `<p><strong>Remarks:</strong> ${remarks}</p>` : ""}
              <p><strong>Download Link:</strong> <a href="${documentUrl}" style="color: #007bff; text-decoration: none;">Click here to download</a></p>
            </div>
            <p>You can also access this document through your application portal.</p>
            ${supportContactHtml}
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #6c757d; font-size: 14px;">
              <p>Best regards,<br><strong>Admissions Office</strong><br>University Admissions System</p>
            </div>
          </div>
        </body>
        </html>`,
    };
  },

  accountApproved: (data) => {
    const { studentName = "Student", loginUrl } = data;
    const finalLoginUrl = loginUrl || `${(process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "")}/sign-in`;
    return {
      subject: "Your Account Has Been Approved - EduTechEx UPS Platform",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Approved</title>
        </head>
        <body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);max-width:92%;">
                <tr>
                  <td style="background:linear-gradient(135deg,#0284c7,#0369a1);padding:36px 40px;text-align:center;">
                    <div style="background:#ffffff;padding:12px 28px;border-radius:12px;display:inline-block;margin:0 auto 14px;box-shadow:0 4px 14px rgba(0,0,0,0.12);">
                      <img src="cid:edutechex-logo" alt="EDUTECHEX" width="180" style="display:block;max-width:180px;height:auto;margin:0 auto;" />
                    </div>
                    <p style="color:rgba(255,255,255,0.95);margin:0;font-size:14px;font-weight:600;letter-spacing:0.3px;">Account Approved Successfully ✅</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px 40px;">
                    <p style="color:#1e293b;font-size:16px;margin:0 0 16px;font-weight:600;">Dear <strong>${studentName}</strong>,</p>
                    <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 20px;">
                      Great news! Your account has been reviewed and <strong style="color:#0284c7;">approved by the Admin</strong>. You are now officially cleared to log in and start using your student portal.
                    </p>
                    <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:16px 20px;border-radius:6px;margin:0 0 28px;">
                      <p style="color:#166534;font-size:14px;font-weight:600;margin:0 0 4px;">Status: Active & Approved</p>
                      <p style="color:#15803d;font-size:13px;line-height:1.5;margin:0;">
                        You can now log in using your registered email and password to access your dashboard, complete your enrollment, and submit your applications.
                      </p>
                    </div>
                    <div style="text-align:center;margin:32px 0;">
                      <a href="${finalLoginUrl}" target="_blank" style="background:#0284c7;color:#ffffff;text-decoration:none;padding:14px 32px;font-size:15px;font-weight:600;border-radius:8px;display:inline-block;box-shadow:0 4px 12px rgba(2,132,199,0.3);">
                        Log In to Your Account →
                      </a>
                    </div>
                    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:24px 0 0;">
                      If the button above does not work, copy and paste this link into your browser:<br>
                      <a href="${finalLoginUrl}" style="color:#0284c7;word-break:break-all;">${finalLoginUrl}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 40px 28px;text-align:center;border-top:1px solid #f1f5f9;background:#fafafa;">
                    <p style="color:#64748b;font-size:12px;margin:0 0 4px;">Questions? Contact us at <a href="mailto:${SUPPORT_ADDR}" style="color:#0284c7;">${SUPPORT_ADDR}</a></p>
                    <p style="color:#94a3b8;font-size:11px;margin:0;">© 2026 EduTechEx UPS Platform. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>`,
    };
  },
};

// SEND ACCOUNT APPROVAL EMAIL HELPER
export const sendAccountApprovalEmail = async ({ to, studentName, loginUrl }) => {
  const finalLoginUrl = loginUrl || `${(process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "")}/sign-in`;
  const template = emailTemplates.accountApproved({ studentName, loginUrl: finalLoginUrl });

  const attachments = [];
  if (fs.existsSync(LOGO_PATH)) {
    attachments.push({
      filename: "edutech-logo.png",
      path: LOGO_PATH,
      cid: "edutechex-logo",
    });
  }

  return await sendEmailEnhanced({
    to,
    subject: template.subject,
    html: template.html,
    attachments,
  });
};

// BATCH EMAILS
export const sendBatchEmails = async (emails) => {
  const results = [];
  for (const email of emails) {
    try {
      const result = await sendEmailEnhanced(email);
      results.push({
        to: email.to,
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      });
    } catch (error) {
      results.push({ to: email.to, success: false, error: error.message });
    }
  }
  return results;
};

const emailService = {
  sendEmail,
  sendEmailEnhanced,
  sendPasswordResetOTPEmail,
  sendOTPEmail,
  sendAccountApprovalEmail,
  emailTemplates,
  sendBatchEmails,
};

export default emailService;
