import ContactSubmission from '../models/contactmodel.js';
import { sendEmailEnhanced } from '../utils/sendEmail.js';

const cleanText = (value) => typeof value === 'string' ? value.trim() : '';
const EMAIL_PATTERN = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i;
const NAME_PATTERN = /^[\p{L}\s]+$/u;
const ALLOWED_COUNTRIES = new Set(['USA', 'UK', 'Canada', 'Australia', 'Germany', 'New Zealand']);
const ALLOWED_PROGRAM_LEVELS = new Set(["Bachelor's Degree", "Master's Degree", 'Doctorate / PhD', 'Diploma / Certificate']);
const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

export const submitContactMessage = async (req, res) => {
  try {
    const fullName = cleanText(req.body?.fullName);
    const email = cleanText(req.body?.email).toLowerCase();
    const phone = cleanText(req.body?.phone);
    const country = cleanText(req.body?.country);
    const programLevel = cleanText(req.body?.programLevel);
    const message = cleanText(req.body?.message);

    if (!fullName || !email || !phone || !message) {
      return res.status(400).json({ success: false, message: 'Please provide your name, email, phone number, and message.' });
    }
    if (fullName.length > 120 || email.length > 254 || phone.length > 40 || country.length > 100 || programLevel.length > 100 || message.length > 5000) {
      return res.status(400).json({ success: false, message: 'One or more fields exceed the allowed length.' });
    }
    if (fullName.length < 2 || !NAME_PATTERN.test(fullName)) {
      return res.status(400).json({ success: false, message: 'Enter a valid name using letters and spaces only.' });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address, including a valid domain.' });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Enter a 10-digit phone number.' });
    }
    if (country && !ALLOWED_COUNTRIES.has(country)) {
      return res.status(400).json({ success: false, message: 'Select a country from the provided list.' });
    }
    if (programLevel && !ALLOWED_PROGRAM_LEVELS.has(programLevel)) {
      return res.status(400).json({ success: false, message: 'Select a program level from the provided list.' });
    }
    const messageWords = message.match(/\p{L}{2,}/gu) || [];
    if (/[^\p{L}\s]/u.test(message)) {
      return res.status(400).json({ success: false, message: 'Only letters and spaces are allowed. Numbers, punctuation and special characters are not allowed.' });
    }
    if (message.length < 10 || messageWords.length < 2) {
      return res.status(400).json({ success: false, message: 'Enter a message of at least 10 characters with a few words.' });
    }

    const submission = await ContactSubmission.create({ fullName, email, phone, country, programLevel, message });
    const notification = await sendEmailEnhanced({
      to: process.env.CONTACT_EMAIL || process.env.SUPPORT_EMAIL || 'edutechexcollege@gmail.com',
      replyTo: email,
      subject: `New university application enquiry from ${fullName}`,
      text: [
        `Name: ${fullName}`, `Email: ${email}`, `Phone: ${phone}`,
        `Country of interest: ${country || 'Not specified'}`,
        `Program level: ${programLevel || 'Not specified'}`, '', message,
      ].join('\n'),
      html: `<h2>New university application enquiry</h2>
        <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
        <p><strong>Country of interest:</strong> ${escapeHtml(country || 'Not specified')}</p>
        <p><strong>Program level:</strong> ${escapeHtml(programLevel || 'Not specified')}</p>
        <p><strong>Message:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
        <p>Submission ID: ${submission._id}</p>`,
    });
    if (!notification.success) console.error('Contact enquiry notification email failed:', notification.error);
    return res.status(201).json({
      success: true,
      message: 'Your message was received. Our counsellor will contact you shortly.',
      data: { id: submission._id, submittedAt: submission.createdAt },
    });
  } catch (error) {
    console.error('submitContactMessage error:', error);
    return res.status(500).json({ success: false, message: 'Unable to send your message right now. Please try again.' });
  }
};
