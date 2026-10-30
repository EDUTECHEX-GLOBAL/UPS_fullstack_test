import Overview from '../models/overviewModel.js';
import Account from '../models/accountModel.js';
import { sendEmail, sendEmailEnhanced } from '../utils/sendEmail.js';
import { buildFileUrl } from '../utils/s3FileKey.js';
import mongoose from 'mongoose';
import ProgramSelection from '../Enrollment/model/programmodel.js';
import PersonalDetails from '../Enrollment/model/personalmodel.js';
import EducationDetails from '../Enrollment/model/educationmodel.js';
import Documents from '../Enrollment/model/documentmodel.js';
import AdditionalDocument from '../Enrollment/model/additionaldocumentmodel.js';
import TestScores from '../Enrollment/model/testmodel.js';
import { compileReviewSummary, generateApplicationPDFBuffer, buildVerificationEmailPayload, buildApprovalEmailPayload, getCanonicalDocKey } from '../Enrollment/controllers/universityreviewcontroller.js';

const DOCUMENT_FIELDS = [
  ['cv', 'CV'],
  ['photo', 'Photograph'],
  ['passport', 'Passport'],
  ['transcript', 'Academic Transcript'],
  ['diploma', 'Diploma'],
  ['cert9th', 'Certificate 9th', 'cert9th_expectedDate'],
  ['cert10th', 'Certificate 10th', 'cert10th_expectedDate'],
  ['cert11th', 'Certificate 11th', 'cert11th_expectedDate'],
  ['cert12th', 'Certificate 12th', 'cert12th_expectedDate'],
  ['testScores', 'Test Scores'],
  ['languageProficiency', 'Language Proficiency'],
  ['recommendationLetter', 'Recommendation Letter'],
];

const resolveDocumentUrl = (document) => {
  if (!document) return '';
  if (typeof document === 'string') return document;
  if (document.fileUrl) return document.fileUrl;
  if (document.fileKey) return buildFileUrl(document.fileKey);
  if (document.s3Key) return buildFileUrl(document.s3Key);
  return '';
};

const mapDocuments = (record = {}) => DOCUMENT_FIELDS.map(([key, label, expectedDateKey]) => {
  const document = record?.[key];
  const fileUrl = resolveDocumentUrl(document);
  const isString = typeof document === 'string';
  const docObj = isString ? {} : (document || {});

  const uploaded = Boolean(fileUrl || docObj.fileKey || docObj.fileName);
  const expectedDate = expectedDateKey ? record?.[expectedDateKey] || null : null;
  const expected = !uploaded && Boolean(expectedDate);

  let fileName = '';
  if (uploaded) {
    if (isString) {
      fileName = fileUrl.split('/').pop() || label;
    } else {
      fileName = docObj.originalName || docObj.fileName || label;
    }
  }

  return {
    key,
    label,
    uploaded,
    expected,
    expectedDate,
    status: uploaded ? (docObj.documentStatus || docObj.status || 'uploaded') : (expected ? 'expected' : 'not_uploaded'),
    fileName,
    originalName: isString ? '' : (docObj.originalName || ''),
    fileType: docObj.fileType || docObj.mimeType || '',
    fileSize: docObj.fileSize || docObj.size || 0,
    uploadedAt: docObj.uploadedAt || null,
    fileKey: docObj.fileKey || '',
    fileUrl,
  };
});
const getActor = actor => actor?.email || actor?.id?.toString() || actor?._id?.toString() || 'unknown';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[character]);
const decisionEmail = (status, reason = '') => {
  const labels = {
    approved: 'approved',
    rejected: 'not approved',
    changes_requested: 'requires changes'
  };
  const label = labels[status] || 'updated';
  return {
    subject: `Your application verification ${label}`,
    statusLabel: label,
    reason: String(reason ?? '').trim()
  };
};
const buildDecisionEmailHtml = (status, reason = '', applicationId = '') => {
  const message = decisionEmail(status, reason);
  const reasonSection = message.reason
    ? `<p>${escapeHtml(message.reason).replace(/\r?\n/g, '<br>')}</p>`
    : '';
  const applicationSection = applicationId
    ? `<p>Application ID: <strong>${escapeHtml(applicationId)}</strong></p>`
    : '';
  return `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
    <p>Your application verification ${escapeHtml(message.statusLabel)}.</p>
    ${reasonSection}
    ${applicationSection}
    <p>Please sign in to your account to view your application details.</p>
  </div>`;
};
const pickText = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};
const buildSelectedCoursePayload = (selectedCourse = {}) => {
  if (!selectedCourse || typeof selectedCourse !== 'object') return null;
  const universityName = pickText(selectedCourse.universityName, selectedCourse.university);
  const programName = pickText(selectedCourse.programName, selectedCourse.title, selectedCourse.name);
  if (!universityName && !programName) return null;
  return {
    programId: pickText(selectedCourse.programId, selectedCourse.id, selectedCourse._id),
    programName,
    title: selectedCourse.title || '',
    name: selectedCourse.name || '',
    universityId: pickText(selectedCourse.universityId),
    universityName,
    university: typeof selectedCourse.university === 'string' ? selectedCourse.university : '',
    universityLogo: selectedCourse.universityLogo || '',
    campus: selectedCourse.campus || '',
    country: selectedCourse.country || '',
    intakeMonth: selectedCourse.intakeMonth || '',
    intakeYear: selectedCourse.intakeYear || '',
    intake: pickText(selectedCourse.intake, selectedCourse.intakeMonth, selectedCourse.startDate, selectedCourse.intakeName),
    applicationFee: selectedCourse.applicationFee ?? 0,
    tuitionFee: selectedCourse.tuitionFee ?? 0,
    degreeLevel: pickText(selectedCourse.degree, selectedCourse.level, selectedCourse.degreeLevel, selectedCourse.studyLevel, selectedCourse.programDetails?.level),
    studyMode: pickText(selectedCourse.studyMode, selectedCourse.mode, selectedCourse.programDetails?.studyMode),
    duration: pickText(selectedCourse.duration, selectedCourse.programDuration, selectedCourse.length, selectedCourse.programDetails?.duration),
  };
};
const buildSelectedProgrammePayload = (university = {}, course = {}) => ({
  universityId: pickText(university.universityId, course.universityId),
  universityName: pickText(university.universityName, university.name, course.universityName, course.university),
  programId: pickText(course.programId, course.id, course._id),
  programName: pickText(course.programName, course.title, course.name),
  title: course.title || '',
  name: course.name || '',
  university: typeof course.university === 'string' ? course.university : '',
  universityLogo: course.universityLogo || university.universityLogo || '',
  campus: course.campus || university.campus || '',
  country: pickText(course.country, course.countryName, university.country),
  location: pickText(course.location, university.location, university.city, university.state),
  intakeMonth: course.intakeMonth || '',
  intakeYear: course.intakeYear || '',
  intake: pickText(course.intake, course.intakeMonth, course.startDate, course.intakeName),
  applicationFee: course.applicationFee ?? 0,
  tuitionFee: course.tuitionFee ?? 0,
  degreeLevel: pickText(course.degree, course.level, course.degreeLevel, course.studyLevel, course.programDetails?.level),
  studyMode: pickText(course.studyMode, course.mode, course.programDetails?.studyMode),
  duration: pickText(course.duration, course.programDuration, course.length, course.programDetails?.duration),
});
const getApplicationUniversities = overview => Array.isArray(overview?.applicationUniversities) ? overview.applicationUniversities : [];
const getSelectedProgrammes = (overview = {}) => {
  const programmes = getApplicationUniversities(overview).flatMap((university = {}) => {
    const selectedCourses = Array.isArray(university.selectedCourses) ? university.selectedCourses : [];
    return selectedCourses.map(course => buildSelectedProgrammePayload(university, course));
  }).filter(programme => programme.universityName || programme.programName);

  if (programmes.length) return programmes;
  const fallbackCourse = buildSelectedCoursePayload(overview?.selectedCourse || {});
  return fallbackCourse ? [fallbackCourse] : [];
};
const getUniversityCount = programmes => new Set(
  programmes.map(programme => pickText(programme.universityName, programme.university)).filter(Boolean)
).size;
const buildSelectionSummary = overview => {
  const selectedCourse = buildSelectedCoursePayload(overview?.selectedCourse || {});
  const selectedProgrammes = getSelectedProgrammes(overview);
  const firstProgramme = selectedProgrammes[0] || selectedCourse || {};
  const universityCount = getUniversityCount(selectedProgrammes);
  const programmeCount = selectedProgrammes.length;
  const universityName = programmeCount > 1 && universityCount > 1
    ? `${universityCount} universities selected`
    : pickText(firstProgramme.universityName, firstProgramme.university, selectedCourse?.universityName, selectedCourse?.university);
  const programName = programmeCount > 1
    ? `${programmeCount} programmes selected`
    : pickText(firstProgramme.programName, firstProgramme.title, firstProgramme.name, selectedCourse?.programName, selectedCourse?.title, selectedCourse?.name);

  return {
    selectedCourse,
    selectedProgrammes,
    applicationUniversities: getApplicationUniversities(overview),
    universityCount,
    programmeCount,
    universityName,
    programName,
  };
};
const REQUIRED_DOCUMENT_FIELDS = ['cv', 'photo', 'passport', 'transcript', 'diploma', 'cert9th', 'cert10th', 'cert11th', 'cert12th'];
const hasDocumentFile = document => Boolean(document?.fileName?.trim() || document?.fileKey?.trim() || document?.fileUrl?.trim());
const getDocumentCompletionPercentage = record => {
  if (!record) return 0;
  const completed = REQUIRED_DOCUMENT_FIELDS.filter(field =>
    hasDocumentFile(record[field]) || Boolean(String(record[`${field}_expectedDate`] || '').trim())
  ).length;
  return Math.round((completed / REQUIRED_DOCUMENT_FIELDS.length) * 100);
};
const getCompletionState = ({ overview, language, documents }) => ({
  overviewStatusComplete: ['completed', 'submitted'].includes(overview?.applicationStatus),
  overviewProgressComplete: Number(overview?.progress?.percentage) === 100,
  languageComplete: Boolean(language?.isCompleted) || Number(language?.completionPercentage) === 100,
  documentCompletionPercentage: getDocumentCompletionPercentage(documents),
});
const loadApplicationBundleFromOverview = async overview => {
  if (!overview) return null;
  const userId = overview.userId;
  let userObjId = userId;
  if (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) {
    userObjId = new mongoose.Types.ObjectId(userId);
  }
  const userQuery = { $or: [{ userId }, { userId: userObjId }, { userId: String(userId) }] };

  const [account, personal, education, commonDocs, addDocs, testScores] = await Promise.all([
    mongoose.Types.ObjectId.isValid(userId) ? Account.findById(userId).select('firstName lastName email phone').lean().catch(() => null) : null,
    PersonalDetails.findOne(userQuery).lean().catch(() => null),
    EducationDetails.findOne(userQuery).lean().catch(() => null),
    Documents.findOne(userQuery).lean().catch(() => null),
    AdditionalDocument.find(userQuery).lean().catch(() => []),
    TestScores.findOne(userQuery).lean().catch(() => null)
  ]);

  const docsObj = { ...(commonDocs?.documents || {}) };
  if (Array.isArray(addDocs) && addDocs.length > 0) {
    addDocs.forEach(d => {
      if (d.documentType || d.documentName) {
        const key = (d.documentType || d.documentName).toLowerCase().replace(/[^a-z0-9]/g, '');
        docsObj[key] = {
          fileName: d.file?.originalName || d.file?.fileName || d.documentName,
          fileUrl: d.file?.fileUrl || d.file?.s3Key || '',
          status: d.status || 'uploaded',
          uploadedAt: d.updatedAt
        };
      }
    });
  }

  return {
    overview,
    account: account || {},
    personal: personal || {},
    education: education || {},
    documents: docsObj,
    testScores: testScores || {}
  };
};

const normalizeApplicationType = (str = '') => {
  if (!str) return '';
  const s = String(str).toLowerCase().trim();
  if (s.includes('med') || s.includes('mbbs') || s.includes('doctor') || s.includes('dental')) return 'medical';
  if (s.includes('master') || s.includes('postgrad') || s === 'pg' || s.includes('m.s.') || s.includes('m.sc') || s.includes('mba')) return 'master';
  if (s.includes('bach') || s.includes('undergrad') || s === 'ug' || s.includes('b.s.') || s.includes('b.sc') || s.includes('b.a.')) return 'bachelor';
  return '';
};

export const determineApplicationType = (progOrOverview = {}, summary = null) => {
  if (progOrOverview?.applicationType) {
    const norm = normalizeApplicationType(progOrOverview.applicationType);
    if (norm) return norm;
  }

  const rawProgramType = progOrOverview?.programType 
    || progOrOverview?.programSelection?.programType 
    || summary?.studyType 
    || summary?.programSelection?.programType 
    || '';
  const fromProgramType = normalizeApplicationType(rawProgramType);
  if (fromProgramType) return fromProgramType;

  const selectedCourse = progOrOverview?.selectedCourse;
  if (selectedCourse) {
    const courseType = normalizeApplicationType(
      selectedCourse.degreeLevel || selectedCourse.level || selectedCourse.degree || selectedCourse.programName || selectedCourse.title || selectedCourse.name
    );
    if (courseType) return courseType;
  }

  const unis = summary?.universitySelection?.selectedUniversities || progOrOverview?.applicationUniversities || [];
  for (const u of unis) {
    const progs = Array.isArray(u.selectedPrograms) && u.selectedPrograms.length > 0
      ? u.selectedPrograms
      : (Array.isArray(u.selectedCourses) ? u.selectedCourses : [u.programName || u.degree || '']);
    for (const p of progs) {
      const pStr = typeof p === 'string' ? p : (p.programName || p.title || p.name || p.degreeLevel || p.degree || '');
      const pType = normalizeApplicationType(pStr);
      if (pType) return pType;
    }
  }

  if (Array.isArray(summary?.educationSummary)) {
    for (const edu of summary.educationSummary) {
      const eduType = normalizeApplicationType(edu.programApplyingFor || edu.intendedMajor);
      if (eduType) return eduType;
    }
  }

  return 'bachelor';
};

const loadApplicationBundle = async applicationId => {
  const rawId = String(applicationId || '').replace(/^ENR-/, '');
  const overview = await Overview.findOne({
    processAdminVerified: true,
    $or: [
      { verificationApplicationId: applicationId },
      { applicationId: applicationId },
      { applicationId: rawId },
      { verificationApplicationId: rawId }
    ],
  }).sort({ processAdminVerifiedAt: -1 }).lean();
  return loadApplicationBundleFromOverview(overview);
};
const summaryFromBundle = bundle => {
  const { overview, account, personal } = bundle;
  const selection = buildSelectionSummary(overview);
  const fullName = [personal.title, personal.firstName || account.firstName, personal.lastName || account.lastName].filter(Boolean).join(' ') || 'Unknown';
  const appType = determineApplicationType(overview);
  return {
    applicationId: overview.verificationApplicationId || overview.applicationId,
    studentName: fullName,
    email: personal.email || account.email || '',
    phone: personal.mobile || account.phone || '',
    university: selection.universityName || '',
    programme: selection.programName || '',
    universityCount: selection.universityCount,
    programmeCount: selection.programmeCount,
    applicationType: appType,
    selectedProgrammes: selection.selectedProgrammes,
    applicationUniversities: selection.applicationUniversities,
    submittedAt: personal.updatedAt || overview.updatedAt || overview.createdAt,
    verifiedAt: overview.processAdminVerifiedAt,
    verificationStatus: overview.verificationStatus || 'pending_admin_review',
  };
};

const loadMasterBundle = async applicationId => {
  const preview = await Promise.resolve(null);
  if (!preview) return null;
  const detail = await Promise.resolve({});
  return detail ? { preview, detail } : null;
};

const MEDICAL_DOCUMENT_FIELDS = [
  ['photo', 'Passport Photo'],
  ['signature', 'Signature'],
  ['idProof', 'Government ID / National ID'],
  ['birthCertificate', 'Birth Certificate'],
  ['passport', 'Passport'],
  ['ninthMarksheet', '9th Marksheet'],
  ['tenthMarksheet', '10th Marksheet'],
  ['eleventhMarksheet', '11th Marksheet'],
  ['twelfthMarksheet', '12th Marksheet'],
  ['neetScorecard', 'NEET Scorecard'],
  ['categoryCert', 'Category / Caste Certificate'],
  ['ewsCertificate', 'EWS Certificate'],
  ['domicileCertificate', 'Domicile / Residence Certificate'],
  ['disabilityCertificate', 'PwD / Disability Certificate'],
  ['englishProficiencyCertificate', 'English Language Proficiency Certificate'],
  ['ucatScorecard', 'UCAT Scorecard'],
  ['universitySupportingDocuments', 'University-Specific Supporting Documents'],
  ['otherSupportingDocuments', 'Other Supporting Documents']
];
export const mapMedicalDocuments = (record = {}) => MEDICAL_DOCUMENT_FIELDS.map(([key, label]) => {
  const document = record?.[key];
  const fileUrl = resolveDocumentUrl(document);
  const isString = typeof document === 'string';
  const docObj = isString ? {} : (document || {});

  const uploaded = Boolean(fileUrl || docObj.fileKey || docObj.fileName);

  let fileName = '';
  if (uploaded) {
    if (isString) {
      fileName = fileUrl.split('/').pop() || label;
    } else {
      fileName = docObj.originalName || docObj.fileName || label;
    }
  }

  return {
    key,
    label,
    uploaded,
    expected: false,
    expectedDate: null,
    status: uploaded ? 'uploaded' : 'not_uploaded',
    fileName,
    fileUrl
  };
});
const joinParts = (...values) => values.map((value) => String(value || "").trim()).filter(Boolean).join(", ");
const normalizeMedicalPersonalDetails = (personal) => {
  if (!personal) return {};
  const raw = personal;
  const fullName = raw.fullName || [raw.firstName, raw.middleName, raw.lastName].map((value) => String(value || "").trim()).filter(Boolean).join(" ");
  const permAddress = raw.permAddress || joinParts(raw.permanentAddressLine1, raw.permanentAddressLine2, raw.permanentCity, raw.permanentState, raw.permanentCountry, raw.permanentPostalCode);
  const corrAddress = raw.corrAddress || joinParts(raw.correspondenceAddressLine1, raw.correspondenceAddressLine2, raw.correspondenceCity, raw.correspondenceState, raw.correspondenceCountry, raw.correspondencePostalCode);
  const parentOccupation = raw.parentOccupation || raw.occupation || "";
  const parentIncome = raw.parentIncome || raw.income || "";
  return {
    ...raw, fullName, idNumber: raw.idNumber || raw.nationalIdNumber || raw.aadhaarNumber || raw.passportNumber || "",
    permAddress, corrAddress, parentOccupation, parentIncome, occupation: parentOccupation, income: parentIncome,
  };
};

export const loadMedicalBundle = async applicationId => {
  const overview = await Promise.resolve(null).lean();
  if (!overview) return null;
  const userId = overview.userId;
  const [medicalAccount, accountModel, personal, academic, course, documents, masterDocs] = await Promise.all([
    Promise.resolve(null).lean(), Account.findById(userId).lean(), Promise.resolve(null).lean(), Promise.resolve(null).lean(), Promise.resolve(null).lean(), Promise.resolve(null).lean(), Promise.resolve(null),
  ]);
  const account = medicalAccount || accountModel || {};

  const mergedDocs = documents ? { ...documents } : {};
  if (masterDocs) {
    if (!mergedDocs.photo && masterDocs.photo) mergedDocs.photo = masterDocs.photo;
    if (!mergedDocs.idProof && masterDocs.passport) mergedDocs.idProof = masterDocs.passport;
    if (!mergedDocs.passport && masterDocs.passport) mergedDocs.passport = masterDocs.passport;
    if (!mergedDocs.tenthMarksheet && masterDocs.cert10th) mergedDocs.tenthMarksheet = masterDocs.cert10th;
    if (!mergedDocs.twelfthMarksheet && (masterDocs.cert12th || masterDocs.cert11th)) mergedDocs.twelfthMarksheet = masterDocs.cert12th || masterDocs.cert11th;
    if (!mergedDocs.neetScorecard && masterDocs.testScores) mergedDocs.neetScorecard = masterDocs.testScores;
  }

  return { overview, account, personal: personal || {}, academic: academic || {}, course: course || {}, documents: mergedDocs };
};
export const medicalSummary = bundle => {
  const { overview, account, personal, academic, course } = bundle;
  const selectedPrograms = overview.selectedPrograms || [];
  const first = selectedPrograms[0] || {};
  return {
    applicationType: 'medical', applicationId: overview.verificationApplicationId || overview.applicationId,
    studentName: personal.fullName || [account.firstName, account.lastName].filter(Boolean).join(' ') || 'Unknown',
    email: account.email || personal.email || '', phone: account.mobileNumber || personal.phone || '',
    university: first.university || course.university || '', programme: first.title || course.courseApplied || '',
    neetScore: academic.neetScore || '', neetRank: academic.neetRank || '',
    selectedProgrammes: selectedPrograms.map(program => ({ universityName: program.university || '', programName: program.title || '', title: program.title || '', degreeLevel: program.level || program.badge || '', intake: program.intake || '' })),
    applicationUniversities: [], submittedAt: overview.submittedAt || overview.updatedAt || overview.createdAt, verifiedAt: overview.processAdminVerifiedAt, verificationStatus: overview.verificationStatus || 'pending_admin_review',
  };
};

const masterDocuments = detail => Object.entries(detail?.documents?.fields || {}).map(([key, document]) => ({
  key,
  label: document.label || key,
  uploaded: Boolean(document.uploaded),
  expected: false,
  expectedDate: null,
  status: document.uploaded ? 'uploaded' : 'not_uploaded',
  fileName: document.fileName || document.originalName || '',
  originalName: document.originalName || '',
  fileType: document.fileType || '',
  fileSize: document.fileSize || 0,
  uploadedAt: document.uploadedAt || null,
  fileKey: document.fileKey || '',
  fileUrl: document.fileUrl || '',
}));

const masterSummary = ({ preview, detail }) => {
  const universities = detail.course?.applicationUniversities || detail.course?.universityApplications || [];
  const selectedProgrammes = universities.flatMap(university => (university.selectedCourses || []).map(programme => ({
    ...programme,
    universityId: university.universityId || '',
    universityName: university.universityName || '',
    country: programme.country || university.country || '',
    location: university.location || '',
    programName: programme.title || programme.programName || '',
    degreeLevel: programme.degree || programme.level || '',
    intake: [programme.intakeMonth, programme.intakeYear].filter(Boolean).join(' '),
  })));
  return {
    applicationType: 'master',
    applicationId: preview.verificationApplicationId || detail.applicationId,
    studentName: detail.fullName || detail.studentName || 'Unknown',
    email: detail.email || detail.contact?.emailAddress || '',
    phone: detail.phone || detail.contact?.mobileNumber || '',
    university: detail.course?.universityName || universities[0]?.universityName || '',
    programme: detail.course?.preferredCourse || selectedProgrammes[0]?.programName || '',
    universityCount: universities.length,
    programmeCount: selectedProgrammes.length,
    selectedProgrammes,
    applicationUniversities: universities,
    submittedAt: detail.submittedAt || preview.submittedAt || preview.updatedAt,
    verifiedAt: preview.processAdminVerifiedAt,
    verificationStatus: preview.verificationStatus || 'pending_admin_review',
  };
};
export const verifyApplicationByProcessAdmin = async (req, res) => {
  try {
    const applicationId = String(req.body?.applicationId || '').trim();
    if (!applicationId) return res.status(400).json({ success: false, message: 'applicationId is required.' });

    const studentId = String(req.body?.studentId || '').trim();
    if (!studentId) return res.status(400).json({ success: false, message: 'studentId is required to identify the correct application.' });

    if (applicationId.startsWith('MED-')) {
      if (!mongoose.Types.ObjectId.isValid(studentId)) return res.status(400).json({ success: false, message: 'A valid medical studentId is required.' });
      const overview = await Promise.resolve(null);
      if (!overview) return res.status(404).json({ success: false, message: 'Medical application not found.' });
      if (applicationId !== overview.applicationId) return res.status(409).json({ success: false, message: 'Application ID does not match the selected medical application.' });
      if (!['submitted', 'completed'].includes(overview.applicationStatus)) return res.status(409).json({ success: false, message: 'Only completed medical applications can be verified.' });
      if (overview.processAdminVerified) return res.json({ success: true, message: 'Application is already in the Admin Verification Queue.', data: overview });
      const now = new Date();
      overview.set({ processAdminVerified: true, processAdminStatus: 'sent_to_admin', processAdminVerifiedAt: now, processAdminVerifiedBy: getActor(req.processAdmin), verificationApplicationId: applicationId, verificationStatus: 'pending_admin_review', approvedAt: null, approvedBy: '', rejectedAt: null, rejectionReason: '', changeRequestedAt: null, changeRequestReason: '' });
      await overview.save();
      return res.json({ success: true, message: 'Medical application sent to Admin Verification Queue.', data: overview });
    }

    if (applicationId.startsWith('UEG-M-')) {
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ success: false, message: 'A valid master studentId is required.' });
      }
      const preview = await Promise.resolve(null);
      if (!preview) return res.status(404).json({ success: false, message: 'Master application not found.' });
      const expectedApplicationId = `UEG-M-${studentId.slice(-10).toUpperCase()}`;
      if (applicationId !== expectedApplicationId) {
        return res.status(409).json({ success: false, message: 'Application ID does not match the selected master application.' });
      }
      if (!['submitted', 'accepted'].includes(preview.applicationStatus)) {
        return res.status(409).json({ success: false, message: 'Only completed master applications can be verified.' });
      }
      if (preview.processAdminVerified) {
        return res.json({ success: true, message: 'Application is already in the Admin Verification Queue.', data: preview });
      }
      const now = new Date();
      preview.set({
        processAdminVerified: true,
        processAdminStatus: 'sent_to_admin',
        processAdminVerifiedAt: now,
        processAdminVerifiedBy: getActor(req.processAdmin),
        verificationApplicationId: applicationId,
        verificationStatus: 'pending_admin_review',
        approvedAt: null,
        approvedBy: '',
        rejectedAt: null,
        rejectionReason: '',
        changeRequestedAt: null,
        changeRequestReason: '',
      });
      await preview.save();
      return res.json({ success: true, message: 'Master application sent to Admin Verification Queue.', data: preview });
    }

    if (applicationId.startsWith('ENR-')) {
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ success: false, message: 'A valid studentId is required.' });
      }
      const prog = await ProgramSelection.findOne({ userId: studentId });
      if (!prog) return res.status(404).json({ success: false, message: 'Enrollment application not found.' });
      
      const now = new Date();
      prog.programApprovalStatus = 'approved';
      prog.approvedAt = now;
      prog.approvedBy = 'Process Admin'; 
      prog.processAdminVerified = true;
      prog.processAdminVerifiedAt = now;
      await prog.save();
      return res.json({ success: true, message: 'Enrollment application approved and verified.', data: prog });
    }

    const objectId = mongoose.Types.ObjectId.isValid(studentId)
      ? new mongoose.Types.ObjectId(studentId)
      : null;
    const userIdConditions = [{ userId: studentId }];
    const studentIdConditions = [{ studentId }];
    if (objectId) {
      userIdConditions.push({ userId: objectId });
      studentIdConditions.push({ studentId: objectId });
    }

    const [language, overview] = await Promise.all([
      Promise.resolve(null)
        .select('studentId isCompleted completionPercentage')
        .lean(),
      Overview.findOne({ applicationId, $or: userIdConditions }).lean(),
    ]);

    if (!overview) {
      return res.status(404).json({ success: false, message: 'Application overview not found for the selected application.' });
    }

    const documents = await Promise.resolve(null);
    const completion = getCompletionState({ overview, language, documents });
    const completed = completion.overviewStatusComplete || completion.overviewProgressComplete || completion.languageComplete || completion.documentCompletionPercentage === 100;
    if (!completed) return res.status(409).json({ success: false, message: 'Only completed applications can be verified.', completion });
    if (overview.processAdminVerified) {
      return res.status(200).json({ success: true, message: 'Application is already in the Admin Verification Queue.', data: overview });
    }

    const now = new Date();
    const updated = await Overview.findOneAndUpdate(
      { _id: overview._id, processAdminVerified: { $ne: true } },
      {
        $set: {
          processAdminVerified: true,
          processAdminStatus: 'sent_to_admin',
          processAdminVerifiedAt: now,
          processAdminVerifiedBy: getActor(req.processAdmin),
          verificationApplicationId: applicationId,
          verificationStatus: 'pending_admin_review',
          approvedAt: null,
          approvedBy: '',
          rejectedAt: null,
          rejectionReason: '',
          changeRequestedAt: null,
          changeRequestReason: '',
        },
      },
      { new: true }
    ).lean();

    return res.status(200).json({ success: true, message: 'Application sent to Admin Verification Queue.', data: updated });
  } catch (error) {
    console.error('verifyApplicationByProcessAdmin:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify application.' });
  }
};

export const getAdminVerificationQueue = async (_req, res) => {
  try {
    const [overviews, enrollmentPrograms, masterPreviews, medicalOverviews] = await Promise.all([
      Overview.find({ processAdminVerified: true }).sort({ processAdminVerifiedAt: -1 }).lean().catch(() => []),
      ProgramSelection.find({ $or: [{ status: 'Completed' }, { processAdminVerified: true }, { programApprovalStatus: 'approved' }] }).sort({ updatedAt: -1 }).lean().catch(() => []),
      Promise.resolve([]),
      Promise.resolve([]),
    ]);

    const enrollmentUserIds = new Set();
    const enrollmentBundles = await Promise.all(
      enrollmentPrograms.map(async (prog) => {
        const userIdStr = String(prog.userId);
        enrollmentUserIds.add(userIdStr);
        try {
          const summary = await compileReviewSummary(prog.userId);
          const appId = `ENR-${userIdStr.slice(-8).toUpperCase()}`;
          const unis = summary.universitySelection?.selectedUniversities || [];

          const appType = determineApplicationType(prog, summary);
          const degreeLevel = appType === 'master' ? 'Master' : (appType === 'medical' ? 'Medical' : 'Bachelor');

          let neetScore = '';
          let neetRank = '';
          if (summary.testScores?.tests) {
            const neetTest = summary.testScores.tests.find(t => String(t.exam || '').toUpperCase().includes('NEET'));
            if (neetTest) {
              neetScore = neetTest.score || '';
              neetRank = neetTest.allIndiaRank || neetTest.rank || neetTest.percentile || '';
            }
          }

          const selectedProgrammes = unis.flatMap(u => {
            const uName = u.universityName || u.university || u.name || 'University';
            const uCountry = u.country || '';
            const progs = Array.isArray(u.selectedPrograms) && u.selectedPrograms.length > 0 
              ? u.selectedPrograms 
              : [u.programName || u.degree || 'Degree Program'];

            return progs.map(p => ({
              universityName: uName,
              university: uName,
              country: uCountry,
              programName: p,
              title: p,
              name: p,
              degreeLevel,
              intake: 'Fall / September'
            }));
          });

          const applicationUniversities = unis.map(u => {
            const uName = u.universityName || u.university || u.name || 'University';
            const uCountry = u.country || '';
            const progs = Array.isArray(u.selectedPrograms) && u.selectedPrograms.length > 0 
              ? u.selectedPrograms 
              : [u.programName || u.degree || 'Degree Program'];

            return {
              universityId: String(u.universityId || uName),
              universityName: uName,
              name: uName,
              country: uCountry,
              location: uCountry,
              selectedCourses: progs.map(p => ({
                programId: String(p),
                programName: p,
                title: p,
                name: p,
                universityName: uName,
                country: uCountry
              }))
            };
          });

          const universitySummary = unis.length > 1
            ? `${unis.length} universities selected`
            : (unis[0]?.universityName || unis[0]?.university || '-');

          const totalProgramsCount = selectedProgrammes.length;
          const programmeSummary = totalProgramsCount > 1
            ? `${totalProgramsCount} programmes selected`
            : (selectedProgrammes[0]?.programName || '-');

          return {
            applicationId: appId,
            studentId: userIdStr,
            applicationType: appType,
            studentName: summary.applicantInfo.name || 'Applicant',
            email: summary.applicantInfo.email || '',
            phone: summary.applicantInfo.phone || '',
            university: universitySummary,
            programme: programmeSummary,
            universityCount: unis.length,
            programmeCount: totalProgramsCount,
            selectedProgrammes,
            applicationUniversities,
            neetScore,
            neetRank,
            submittedAt: summary.submittedAt || prog.submittedAt || prog.updatedAt || prog.createdAt,
            verifiedAt: prog.updatedAt || prog.createdAt,
            verificationStatus: prog.verificationStatus || overviews.find(o => String(o.userId) === userIdStr)?.verificationStatus || 'pending_admin_review',
            summaryData: summary
          };
        } catch (err) {
          console.error(`Failed to compile review summary for ${userIdStr}:`, err);
          return null;
        }
      })
    );

    const validOverviews = overviews.filter(o => !enrollmentUserIds.has(String(o.userId)));
    const bundles = await Promise.all(validOverviews.map(overview => loadApplicationBundleFromOverview(overview)));

    const data = [
      ...enrollmentBundles.filter(Boolean),
      ...bundles.filter(Boolean).map(bundle => {
        const appType = determineApplicationType(bundle.overview, null);
        let neetScore = '';
        let neetRank = '';
        if (bundle.testScores?.tests) {
          const neetTest = Array.isArray(bundle.testScores.tests)
            ? bundle.testScores.tests.find(t => String(t.exam || '').toUpperCase().includes('NEET'))
            : null;
          if (neetTest) {
            neetScore = neetTest.score || '';
            neetRank = neetTest.allIndiaRank || neetTest.rank || neetTest.percentile || '';
          }
        }
        return {
          ...summaryFromBundle(bundle),
          applicationType: appType,
          neetScore,
          neetRank,
        };
      }),
    ].sort((left, right) => new Date(right.verifiedAt || right.submittedAt || 0) - new Date(left.verifiedAt || left.submittedAt || 0));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('getAdminVerificationQueue:', error);
    return res.status(500).json({ success: false, message: 'Failed to load verification queue.' });
  }
};

export const getAdminVerificationDetail = async (req, res) => {
  try {
    const appId = String(req.params.applicationId || '').trim();

    if (appId.startsWith('MED-')) {
      const medicalBundle = await loadMedicalBundle(appId);
      if (!medicalBundle) return res.status(404).json({ success: false, message: 'Medical verification application not found.' });
      const summary = medicalSummary(medicalBundle);
      return res.json({ success: true, data: { ...summary, personal: normalizeMedicalPersonalDetails(medicalBundle.personal), academic: medicalBundle.academic, course: medicalBundle.course, documents: mapMedicalDocuments(medicalBundle.documents), processAdminVerifiedBy: medicalBundle.overview.processAdminVerifiedBy || '', rejectionReason: medicalBundle.overview.rejectionReason || '', changeRequestReason: medicalBundle.overview.changeRequestReason || '', universitySubmissionStatus: medicalBundle.overview.universitySubmissionStatus || 'not_sent', universitySubmittedAt: medicalBundle.overview.universitySubmittedAt || null, universitySubmittedEmail: medicalBundle.overview.universitySubmittedEmail || '', pdfUrl: `/api/admin/verification/verify-documents/${encodeURIComponent(summary.applicationId)}/pdf` } });
    }

    if (appId.startsWith('UEG-M-')) {
      const masterBundle = await loadMasterBundle(appId);
      if (!masterBundle) return res.status(404).json({ success: false, message: 'Master verification application not found.' });
      const summary = masterSummary(masterBundle);
      return res.json({
        success: true,
        data: {
          ...summary,
          ...masterBundle.detail,
          applicationType: 'master',
          applicationId: summary.applicationId,
          selectedProgrammes: summary.selectedProgrammes,
          applicationUniversities: summary.applicationUniversities,
          processAdminVerifiedBy: masterBundle.preview.processAdminVerifiedBy || '',
          rejectionReason: masterBundle.preview.rejectionReason || '',
          changeRequestReason: masterBundle.preview.changeRequestReason || '',
          documents: masterDocuments(masterBundle.detail),
          pdfUrl: `/api/admin/verification/verify-documents/${encodeURIComponent(summary.applicationId)}/pdf`,
        },
      });
    }

    let targetUserId = null;
    if (appId.startsWith('ENR-')) {
      const allProg = await ProgramSelection.find({}).lean();
      const matched = allProg.find(p => `ENR-${String(p.userId).slice(-8).toUpperCase()}` === appId);
      if (matched) targetUserId = matched.userId;
    } else if (mongoose.Types.ObjectId.isValid(appId)) {
      targetUserId = appId;
    }

    if (targetUserId) {
      const [prog, overviewDoc] = await Promise.all([
        ProgramSelection.findOne({ userId: targetUserId }).lean(),
        Overview.findOne({ userId: targetUserId }).lean()
      ]);
      const summary = await compileReviewSummary(targetUserId);
      if (!summary) return res.status(404).json({ success: false, message: 'Verification application details not found.' });
      const appType = determineApplicationType(prog || {}, summary);
      const degreeLevel = appType === 'master' ? 'Master' : (appType === 'medical' ? 'Medical' : 'Bachelor');

      let neetScore = '';
      let neetRank = '';
      if (summary.testScores?.tests) {
        const neetTest = summary.testScores.tests.find(t => String(t.exam || '').toUpperCase().includes('NEET'));
        if (neetTest) {
          neetScore = neetTest.score || '';
          neetRank = neetTest.allIndiaRank || neetTest.rank || neetTest.percentile || '';
        }
      }

      const medicalPersonal = {
        dob: summary.applicantInfo.dateOfBirth,
        gender: summary.applicantInfo.gender,
        nationality: summary.applicantInfo.citizenship || summary.applicantInfo.countryOfBirth,
        idNumber: summary.applicantInfo.passportNumber,
        passportNumber: summary.applicantInfo.passportNumber,
        permAddress: summary.applicantInfo.address,
        corrAddress: summary.applicantInfo.address,
        parentName: summary.applicantInfo.parent1?.name || summary.applicantInfo.parent2?.name,
        parentPhone: summary.applicantInfo.parent1?.phone || summary.applicantInfo.parent2?.phone,
        parentEmail: summary.applicantInfo.parent1?.email || summary.applicantInfo.parent2?.email,
        parentOccupation: summary.applicantInfo.parent1?.relationship || '',
        parentIncome: ''
      };

      const edu10 = (summary.educationSummary || []).find(e => String(e.qualification).includes('10')) || {};
      const edu12 = (summary.educationSummary || []).find(e => String(e.qualification).includes('12')) || {};
      const medicalAcademic = {
        tenthBoard: edu10.boardUniversity || edu10.schoolName,
        tenthSchool: edu10.schoolName,
        tenthPercent: edu10.score,
        twelfthBoard: edu12.boardUniversity || edu12.schoolName,
        twelfthSchool: edu12.schoolName,
        twelfthPercent: edu12.score,
        pcbPercent: edu12.score,
        neetScore,
        neetRank
      };

      const masterAcademics = {
        entries: (summary.educationSummary || []).map(e => ({
          degree: e.qualification || 'Academic Record',
          university: [e.schoolName, e.boardUniversity].filter(Boolean).join(', ') || e.schoolName || e.boardUniversity || '-',
          fieldOfStudy: e.boardUniversity || e.intendedMajor || e.programApplyingFor || '-',
          country: e.country || '-',
          startDate: '-',
          endDate: e.yearOfPassing || '-',
          gpa: e.score || '-'
        }))
      };

      const masterContact = {
        emailAddress: summary.applicantInfo.email,
        mobileNumber: summary.applicantInfo.phone,
        alternatePhone: summary.applicantInfo.alternatePhone || summary.applicantInfo.parent1?.phone || summary.applicantInfo.parent2?.phone || '',
        addressLine1: summary.applicantInfo.address1 || summary.applicantInfo.permanentAddress || summary.applicantInfo.address,
        addressLine2: summary.applicantInfo.address2 || '',
        city: summary.applicantInfo.city || '',
        state: summary.applicantInfo.state || '',
        postalCode: summary.applicantInfo.postalCode || '',
        country: summary.applicantInfo.country || summary.applicantInfo.citizenship || summary.applicantInfo.countryOfBirth || ''
      };

      const masterTests = {
        summary: (summary.testScores?.tests || []).map(t => ({
          test: t.exam,
          scores: `Score: ${t.score}`
        }))
      };

      const rawDocsList = [
        ...(summary.documents?.common || []).map(d => ({
          key: d.key,
          label: d.title,
          uploaded: d.status === 'Uploaded',
          expected: false,
          expectedDate: null,
          status: d.status === 'Uploaded' ? 'uploaded' : 'not_uploaded',
          fileName: d.fileName,
          fileUrl: d.fileUrl
        })),
        ...(summary.documents?.additional || []).map(d => ({
          key: String(d.id || d.documentName),
          label: d.documentName,
          uploaded: d.status === 'Uploaded',
          expected: false,
          expectedDate: null,
          status: d.status === 'Uploaded' ? 'uploaded' : 'not_uploaded',
          fileName: d.file?.fileName || '',
          fileUrl: d.file?.fileUrl || ''
        }))
      ];

      const seenDocKeys = new Set();
      const docsList = [];
      for (const item of rawDocsList) {
        const canonical = getCanonicalDocKey(item.key, item.label);
        if (seenDocKeys.has(canonical)) {
          const existing = docsList.find(d => getCanonicalDocKey(d.key, d.label) === canonical);
          if (existing && !existing.uploaded && item.uploaded) {
            existing.uploaded = true;
            existing.status = 'uploaded';
            existing.fileName = item.fileName || existing.fileName;
            existing.fileUrl = item.fileUrl || existing.fileUrl;
          }
          continue;
        }
        seenDocKeys.add(canonical);
        docsList.push(item);
      }

      // Test score reports are stored on each test entry and are not part of
      // the common/additional document collections. Include them explicitly so
      // the admin verification modal can display the uploaded files.
      (summary.testScores?.tests || []).forEach((test, index) => {
        const fileUrl = test.reportFileUrl || test.reportFile?.fileUrl || '';
        if (!fileUrl) return;
        const exam = String(test.exam || 'Test').trim();
        docsList.push({
          key: `test-report-${test.id || index}`,
          label: `${exam} Score Report`,
          uploaded: true,
          expected: false,
          expectedDate: null,
          status: 'uploaded',
          fileName: test.reportFileName || test.reportFile?.fileName || `${exam} Score Report`,
          fileUrl,
        });
      });

      const unis = summary.universitySelection?.selectedUniversities || [];

      const selectedProgrammes = unis.flatMap(u => {
        const uName = u.universityName || u.university || u.name || 'University';
        const uCountry = u.country || '';
        const progs = Array.isArray(u.selectedPrograms) && u.selectedPrograms.length > 0 
          ? u.selectedPrograms 
          : [u.programName || u.degree || 'Degree Program'];

        return progs.map(p => ({
          universityName: uName,
          university: uName,
          country: uCountry,
          programName: p,
          title: p,
          name: p,
          degreeLevel,
          intake: 'Fall / September'
        }));
      });

      const applicationUniversities = unis.map(u => {
        const uName = u.universityName || u.university || u.name || 'University';
        const uCountry = u.country || '';
        const progs = Array.isArray(u.selectedPrograms) && u.selectedPrograms.length > 0 
          ? u.selectedPrograms 
          : [u.programName || u.degree || 'Degree Program'];

        return {
          universityId: String(u.universityId || uName),
          universityName: uName,
          name: uName,
          country: uCountry,
          location: uCountry,
          selectedCourses: progs.map(p => ({
            programId: String(p),
            programName: p,
            title: p,
            name: p,
            universityName: uName,
            country: uCountry
          }))
        };
      });

      const universitySummary = unis.length > 1
        ? `${unis.length} universities selected`
        : (unis[0]?.universityName || unis[0]?.university || '-');

      const totalProgramsCount = selectedProgrammes.length;
      const programmeSummary = totalProgramsCount > 1
        ? `${totalProgramsCount} programmes selected`
        : (selectedProgrammes[0]?.programName || '-');

      return res.json({
        success: true,
        data: {
          applicationId: appId,
          studentName: summary.applicantInfo.name || 'Applicant',
          email: summary.applicantInfo.email,
          phone: summary.applicantInfo.phone,
          university: universitySummary,
          programme: programmeSummary,
          universityCount: unis.length,
          programmeCount: totalProgramsCount,
          applicationType: appType,
          submittedAt: summary.submittedAt,
          verifiedAt: summary.submittedAt,
          verificationStatus: prog?.verificationStatus || overviewDoc?.verificationStatus || 'pending_admin_review',

          dateOfBirth: summary.applicantInfo.dateOfBirth,
          gender: summary.applicantInfo.gender,
          nationality: summary.applicantInfo.citizenship || summary.applicantInfo.countryOfBirth,
          passportNumber: summary.applicantInfo.passportNumber,
          maritalStatus: summary.applicantInfo.maritalStatus || 'Single',
          citizenshipStatus: summary.applicantInfo.citizenshipStatus || summary.applicantInfo.citizenship || 'Citizen',
          city: summary.applicantInfo.city || masterContact.city,
          state: summary.applicantInfo.state || masterContact.state,
          postalCode: summary.applicantInfo.postalCode || masterContact.postalCode,
          country: summary.applicantInfo.country || masterContact.country,
          personal: appType === 'medical' ? medicalPersonal : summary.applicantInfo,
          parent: {
            fatherName: summary.applicantInfo.parent1?.name || '',
            fatherPhone: summary.applicantInfo.parent1?.phone || '',
            fatherEmail: summary.applicantInfo.parent1?.email || '',
            motherName: summary.applicantInfo.parent2?.name || '',
            motherPhone: summary.applicantInfo.parent2?.phone || '',
            motherEmail: summary.applicantInfo.parent2?.email || ''
          },
          academic: medicalAcademic,
          academics: masterAcademics,
          contact: masterContact,
          tests: masterTests,
          neetScore,
          neetRank,
          education: summary.educationSummary,
          testScores: summary.testScores,
          documents: docsList,
          selectedProgrammes,
          applicationUniversities,
          pdfUrl: `/api/admin/verification/verify-documents/${encodeURIComponent(appId)}/pdf`
        }
      });
    }

    const bundle = await loadApplicationBundle(appId);
    if (!bundle || !bundle.overview.processAdminVerified) return res.status(404).json({ success: false, message: 'Verification application not found.' });
    const summary = summaryFromBundle(bundle);
    const selection = buildSelectionSummary(bundle.overview);
    const appType = determineApplicationType(bundle.overview, null);
    return res.json({
      success: true,
      data: {
        ...summary,
        applicationType: appType,
        personal: bundle.personal || {},
        education: bundle.education || {},
        testScores: bundle.testScores || {},
        selectedCourse: selection.selectedCourse || bundle.overview.selectedCourse || null,
        selectedProgrammes: selection.selectedProgrammes,
        applicationUniversities: selection.applicationUniversities,
        progress: bundle.overview.progress || {},
        processAdminVerifiedBy: bundle.overview.processAdminVerifiedBy || '',
        rejectionReason: bundle.overview.rejectionReason || '',
        changeRequestReason: bundle.overview.changeRequestReason || '',
        documents: mapDocuments(bundle.documents),
        pdfUrl: `/api/admin/verification/verify-documents/${encodeURIComponent(summary.applicationId)}/pdf`,
      },
    });
  } catch (error) {
    console.error('getAdminVerificationDetail:', error);
    return res.status(500).json({ success: false, message: 'Failed to load verification details.' });
  }
};

export const downloadAdminVerificationPdf = async (req, res) => {
  try {
    const appId = String(req.params.applicationId || '').trim();
    let targetUserId = null;
    if (appId.startsWith('ENR-')) {
      const allProg = await ProgramSelection.find({}).lean();
      const matched = allProg.find(p => `ENR-${String(p.userId).slice(-8).toUpperCase()}` === appId);
      if (matched) targetUserId = matched.userId;
    } else if (mongoose.Types.ObjectId.isValid(appId)) {
      targetUserId = appId;
    }

    if (!targetUserId) {
      const bundle = await loadApplicationBundle(appId);
      if (bundle?.overview?.userId) targetUserId = bundle.overview.userId;
    }

    if (!targetUserId) {
      return res.status(404).json({ success: false, message: 'Verification application not found.' });
    }

    const reviewSummary = await compileReviewSummary(targetUserId);
    const pdf = await generateApplicationPDFBuffer(reviewSummary);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Application_${appId}.pdf"`);
    return res.send(pdf);
  } catch (error) {
    console.error('downloadAdminVerificationPdf:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate application PDF.' });
  }
};

const sendApprovalEmailWithPdf = async (targetUserId, applicationId, recipientEmail) => {
  try {
    let reviewSummary = null;
    let pdfBuffer = null;
    if (targetUserId) {
      reviewSummary = await compileReviewSummary(targetUserId).catch((err) => {
        console.error(`[APPROVAL EMAIL] compileReviewSummary failed for ${targetUserId}:`, err);
        return null;
      });
    }
    if (reviewSummary) {
      pdfBuffer = await generateApplicationPDFBuffer(reviewSummary).catch((err) => {
        console.error(`[APPROVAL EMAIL] generateApplicationPDFBuffer failed:`, err);
        return null;
      });
    }

    const emailTo = recipientEmail || reviewSummary?.applicantInfo?.email;
    if (!emailTo) {
      console.warn(`[APPROVAL EMAIL] No email found for application ${applicationId}`);
      return;
    }

    if (reviewSummary && pdfBuffer) {
      const { subject, html, attachments } = buildApprovalEmailPayload(reviewSummary, pdfBuffer, applicationId);
      await sendEmailEnhanced({
        to: emailTo,
        subject,
        html,
        attachments
      });
      console.log(`[APPROVAL EMAIL] Enhanced approval email with PDF attachment sent to ${emailTo} for ${applicationId}`);
      return;
    }

    // Fallback if compilation or PDF generation is unavailable
    const message = decisionEmail('approved', '');
    const fallbackHtml = buildDecisionEmailHtml('approved', '', applicationId);
    await sendEmail(emailTo, message.subject, fallbackHtml);
  } catch (err) {
    console.error(`[APPROVAL EMAIL] Error sending approval email for ${applicationId}:`, err);
  }
};

const applyAdminDecision = status => async (req, res) => {
  try {
    const applicationId = String(req.body?.applicationId || '').trim();
    const reason = String(req.body?.reason || '').trim();
    if (!applicationId) return res.status(400).json({ success: false, message: 'applicationId is required.' });
    if (status !== 'approved' && (reason.length < 20 || reason.length > 500)) return res.status(400).json({ success: false, message: 'Please enter a professional message with at least 20 characters.' });

    if (applicationId.startsWith('ENR-')) {
      const allProg = await ProgramSelection.find({}).lean();
      const matched = allProg.find(p => `ENR-${String(p.userId).slice(-8).toUpperCase()}` === applicationId);
      let targetUserId = matched ? matched.userId : null;

      if (!targetUserId) {
        const rawId = applicationId.replace(/^ENR-/, '');
        const overview = await Overview.findOne({
          $or: [
            { verificationApplicationId: applicationId },
            { applicationId: applicationId },
            { applicationId: rawId },
            { verificationApplicationId: rawId }
          ]
        }).lean();
        if (overview) targetUserId = overview.userId;
      }

      if (targetUserId) {
        const now = new Date();
        const actor = getActor(req.admin);
        const update = { verificationStatus: status };
        if (status === 'approved') Object.assign(update, { approvedAt: now, approvedBy: actor, rejectedAt: null, rejectionReason: '', changeRequestedAt: null, changeRequestReason: '' });
        if (status === 'rejected') Object.assign(update, { rejectedAt: now, rejectionReason: reason, approvedAt: null, approvedBy: '', changeRequestedAt: null, changeRequestReason: '' });
        if (status === 'changes_requested') Object.assign(update, { changeRequestedAt: now, changeRequestReason: reason, approvedAt: null, approvedBy: '', rejectedAt: null, rejectionReason: '' });

        let userObjId = targetUserId;
        if (typeof targetUserId === 'string' && mongoose.Types.ObjectId.isValid(targetUserId)) {
          userObjId = new mongoose.Types.ObjectId(targetUserId);
        }
        const userQuery = { $or: [{ userId: targetUserId }, { userId: userObjId }, { userId: String(targetUserId) }] };

        await Promise.all([
          ProgramSelection.updateOne(userQuery, { $set: update }),
          Overview.updateOne(userQuery, { $set: update })
        ]);

        const acc = await Account.findById(targetUserId).lean();
        const recipient = acc?.email;
        if (status === 'approved') {
          await sendApprovalEmailWithPdf(targetUserId, applicationId, recipient);
        } else if (recipient) {
          const message = decisionEmail(status, reason);
          await sendEmail(recipient, message.subject, buildDecisionEmailHtml(status, reason, applicationId)).catch(error => console.error('ENR verification decision email failed:', error));
        }

        return res.json({ success: true, message: 'Application verification status updated.', data: { applicationId, status } });
      }
    }

    if (applicationId.startsWith('MED-')) {
      const medicalBundle = await loadMedicalBundle(applicationId);
      if (!medicalBundle) return res.status(404).json({ success: false, message: 'Medical verification application not found.' });
      const now = new Date(); const actor = getActor(req.admin); const update = { verificationStatus: status };
      if (status === 'approved') Object.assign(update, { approvedAt: now, approvedBy: actor, rejectedAt: null, rejectionReason: '', changeRequestedAt: null, changeRequestReason: '' });
      if (status === 'rejected') Object.assign(update, { rejectedAt: now, rejectionReason: reason, approvedAt: null, approvedBy: '', changeRequestedAt: null, changeRequestReason: '' });
      if (status === 'changes_requested') Object.assign(update, { changeRequestedAt: now, changeRequestReason: reason, approvedAt: null, approvedBy: '', rejectedAt: null, rejectionReason: '' });
      const updated = await MedicalOverview.findOneAndUpdate({ _id: medicalBundle.overview._id, processAdminVerified: true }, { $set: update }, { new: true }).lean();
      const recipient = medicalBundle.personal?.email || medicalBundle.account?.email;
      if (status === 'approved') {
        await sendApprovalEmailWithPdf(medicalBundle.overview?.userId, applicationId, recipient);
      } else if (recipient) {
        const message = decisionEmail(status, reason);
        await sendEmail(recipient, message.subject, buildDecisionEmailHtml(status, reason, applicationId)).catch(error => console.error('Medical verification decision email failed:', error));
      }
      return res.json({ success: true, message: 'Medical application verification status updated.', data: updated });
    }

    if (applicationId.startsWith('UEG-M-')) {
      const masterBundle = await loadMasterBundle(applicationId);
      if (!masterBundle) return res.status(404).json({ success: false, message: 'Master verification application not found.' });
      const now = new Date();
      const actor = getActor(req.admin);
      const update = { verificationStatus: status };
      if (status === 'approved') Object.assign(update, { approvedAt: now, approvedBy: actor, rejectedAt: null, rejectionReason: '', changeRequestedAt: null, changeRequestReason: '' });
      if (status === 'rejected') Object.assign(update, { rejectedAt: now, rejectionReason: reason, approvedAt: null, approvedBy: '', changeRequestedAt: null, changeRequestReason: '' });
      if (status === 'changes_requested') Object.assign(update, { changeRequestedAt: now, changeRequestReason: reason, approvedAt: null, approvedBy: '', rejectedAt: null, rejectionReason: '' });
      const updated = await MasterPreview.findOneAndUpdate({ _id: masterBundle.preview._id, processAdminVerified: true }, { $set: update }, { new: true }).lean();
      const recipient = masterBundle.detail?.email;
      if (status === 'approved') {
        await sendApprovalEmailWithPdf(masterBundle.preview?.userId, applicationId, recipient);
      } else if (recipient) {
        const message = decisionEmail(status, reason);
        await sendEmail(recipient, message.subject, buildDecisionEmailHtml(status, reason, applicationId)).catch(error => console.error('Master verification decision email failed:', error));
      }
      return res.json({ success: true, message: 'Master application verification status updated.', data: updated });
    }

    const bundle = await loadApplicationBundle(applicationId);
    if (!bundle || !bundle.overview.processAdminVerified) return res.status(404).json({ success: false, message: 'Verification application not found.' });
    const now = new Date();
    const actor = getActor(req.admin);
    const update = { verificationStatus: status };
    if (status === 'approved') Object.assign(update, { approvedAt: now, approvedBy: actor, rejectedAt: null, rejectionReason: '', changeRequestedAt: null, changeRequestReason: '' });
    if (status === 'rejected') Object.assign(update, { rejectedAt: now, rejectionReason: reason, approvedAt: null, approvedBy: '', changeRequestedAt: null, changeRequestReason: '' });
    if (status === 'changes_requested') Object.assign(update, { changeRequestedAt: now, changeRequestReason: reason, approvedAt: null, approvedBy: '', rejectedAt: null, rejectionReason: '' });

    const updated = await Overview.findOneAndUpdate({ _id: bundle.overview._id, processAdminVerified: true }, { $set: update }, { new: true }).lean();
    const recipient = bundle.account?.email || bundle.personal?.email;
    if (status === 'approved') {
      await sendApprovalEmailWithPdf(bundle.overview?.userId, applicationId, recipient);
    } else if (recipient) {
      const message = decisionEmail(status, reason);
      await sendEmail(recipient, message.subject, buildDecisionEmailHtml(status, reason, applicationId)).catch(error => console.error('Verification decision email failed:', error));
    }
    return res.json({ success: true, message: 'Application verification status updated.', data: updated });
  } catch (error) {
    console.error('applyAdminDecision:', error);
    return res.status(500).json({ success: false, message: 'Failed to update verification status.' });
  }
};

export const approveApplication = applyAdminDecision('approved');
export const rejectApplication = applyAdminDecision('rejected');
export const requestApplicationChanges = applyAdminDecision('changes_requested');
