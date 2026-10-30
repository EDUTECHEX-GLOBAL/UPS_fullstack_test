import { loadMedicalBundle, medicalSummary, mapMedicalDocuments } from './applicationVerificationController.js';
import { sendEmailEnhanced } from '../utils/sendEmail.js';

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const sendApplicationToUniversity = async (req, res) => {
  try {
    const { applicationId } = req.body;
    if (!applicationId) {
      return res.status(400).json({ success: false, message: 'applicationId is required.' });
    }

    if (!applicationId.startsWith('MED-')) {
      return res.status(400).json({ success: false, message: 'Only medical applications are supported for university verification.' });
    }

    const bundle = await loadMedicalBundle(applicationId);
    if (!bundle) {
      return res.status(404).json({ success: false, message: 'Verification application not found.' });
    }

    const { overview, personal, academic, course } = bundle;

    // Resending is allowed

    const universityEmail = 'bondajagatharavind@gmail.com';

    const summary = medicalSummary(bundle);
    const studentName = summary.studentName;
    const studentEmail = summary.email;
    const programName = course.courseApplied || '';
    const universityName = course.university || '';

    // Generate PDF
    const pdfData = {
      applicationId,
      personal: personal || {},
      academic: academic || {},
      course: course || {}
    };
    const pdfBuffer = await Promise.resolve(Buffer.from(""));

    const subject = `Application Document Verification - ${applicationId} - ${studentName}`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
        <p>Dear Admissions Team,</p>
        <p>Please find below the application submitted by the student for your review.</p>
        
        <h3>Application Details</h3>
        <ul>
          <li><strong>Student Name:</strong> ${escapeHtml(studentName)}</li>
          <li><strong>Application ID:</strong> ${escapeHtml(applicationId)}</li>
          <li><strong>University:</strong> ${escapeHtml(universityName)}</li>
          <li><strong>Program:</strong> ${escapeHtml(programName)}</li>
          <li><strong>Student Email:</strong> ${escapeHtml(studentEmail)}</li>
        </ul>
        
        <p>The complete application document is attached to this email for your review.</p>
        <p>Kindly review the application and reply to this email with your decision or any additional requirements.</p>
        
        <p>Regards,<br>Admissions Team<br>UPS Platform</p>
      </div>
    `;

    const mappedDocs = mapMedicalDocuments(bundle.documents).filter(doc => doc.uploaded && doc.fileUrl);

    const attachments = [{
      filename: `Application_${applicationId}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }];

    mappedDocs.forEach(doc => {
      let ext = 'pdf'; // Default extension
      if (doc.fileUrl && doc.fileUrl.includes('.')) {
        const parts = doc.fileUrl.split('?')[0].split('.');
        if (parts.length > 1) ext = parts[parts.length - 1];
      }
      let filename = doc.fileName || `${doc.label}.${ext}`;
      // Prefix filename with label to avoid deduplication issues if the student uploads the same file for multiple fields
      let cleanLabel = doc.label.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
      if (doc.fileName) {
        filename = `${cleanLabel}_${doc.fileName}`;
      }
      if (!filename.includes('.')) filename = `${filename}.${ext}`;
      let attachmentUrl = doc.fileUrl;
      if (attachmentUrl.startsWith('/')) {
        const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
        attachmentUrl = `${baseUrl}${attachmentUrl}`;
      }
      attachments.push({
        filename: filename,
        path: attachmentUrl
      });
    });

    const result = await sendEmailEnhanced({
      to: universityEmail,
      subject,
      html,
      attachments
    });

    if (!result || !result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send application to university.',
        error: result ? result.error : 'Unknown email error'
      });
    }

    const updatedOverview = await MedicalOverview.findOneAndUpdate(
      { _id: overview._id },
      {
        $set: {
          universitySubmissionStatus: 'sent',
          universitySubmittedAt: new Date(),
          universitySubmittedEmail: universityEmail,
          universitySubmissionMessageId: result.messageId || ''
        }
      },
      { new: true }
    ).lean();

    return res.status(200).json({
      success: true,
      message: 'Application and documents sent successfully to the university.',
      data: updatedOverview
    });

  } catch (error) {
    console.error('sendApplicationToUniversity Error:', error);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};
