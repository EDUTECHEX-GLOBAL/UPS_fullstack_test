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

const sendViaBrevoSMTP = async ({ to, subject, html, text, replyTo, attachments }) => {
  const finalHtml = ensureSupportContact(html);
  const finalReplyTo = replyTo || process.env.SUPPORT_EMAIL || SENDER_ADDR;

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
    attachments,
  });
};

// ORIGINAL FUNCTION (backward compatible)
export const sendEmail = async (to, subject, html) => {
  try {
    const response = await sendViaBrevoSMTP({ to, subject, html });
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
  sendOTPEmail,
  emailTemplates,
  sendBatchEmails,
};

export default emailService;
