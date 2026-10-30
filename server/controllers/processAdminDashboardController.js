// controllers/processAdminDashboardController.js
// Aggregates Bachelor (GUS) and Master applications for the Process Admin dashboard.

import Account from '../models/accountModel.js';
import Overview from '../models/overviewModel.js';
import mongoose from 'mongoose';
import { fetchEnrollmentList } from '../Enrollment/controllers/enrollmentAdminController.js';

const fmtDate = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return ''; }
};

const toObjectId = (id) => {
  if (!id) return null;
  const s = id.toString().trim();
  if (!mongoose.Types.ObjectId.isValid(s)) return null;
  return new mongoose.Types.ObjectId(s);
};

const makeApplicationId = (userId) =>
  'UEG-M-' + userId.toString().slice(-10).toUpperCase();

const buildMap = (records, idField) => {
  const map = {};
  records.forEach((record) => {
    const raw = record?.[idField];
    if (raw) map[raw.toString()] = record;
  });
  return map;
};

const buildOverviewMap = (overviews) => {
  const map = {};
  overviews.forEach((overview) => {
    const key = overview.userId?.toString();
    if (!key) return;
    if (!map[key]) map[key] = [];
    map[key].push(overview);
  });
  return map;
};

const pickOverview = (overviewsByUserId, userId, applicationId) => {
  const list = overviewsByUserId[userId] || [];
  if (!list.length) return null;
  if (applicationId) {
    const exact = list.find((overview) => overview.applicationId === applicationId);
    if (exact) return exact;
  }
  return list[0] || null;
};

const pickText = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const buildSelection = ({ lang = {}, overview = {}, personal = {} } = {}) => {
  const selectedCourse = overview?.selectedCourse || null;
  const selectedUniversity = overview?.selectedUniversity || null;
  const universityName = pickText(
    lang.applicationUniversityName,
    overview?.applicationUniversityName,
    lang.completedUniversityName,
    overview?.completedUniversityName,
    selectedUniversity?.name,
    selectedUniversity?.universityName,
    selectedCourse?.universityName,
    selectedCourse?.university,
    personal.universityName,
    personal.university
  );
  const programName = pickText(
    lang.applicationProgramName,
    overview?.applicationProgramName,
    lang.completedProgramName,
    overview?.completedProgramName,
    selectedCourse?.programName,
    selectedCourse?.title,
    selectedCourse?.name,
    personal.programName
  );

  return { selectedCourse, selectedUniversity, universityName, programName };
};

const REQUIRED_DOCUMENT_FIELDS = [
  'cv', 'photo', 'passport', 'transcript', 'diploma',
  'cert9th', 'cert10th', 'cert11th', 'cert12th',
];

const hasDocumentValue = (document) => Boolean(
  document?.fileName?.trim?.() ||
  document?.fileKey?.trim?.() ||
  document?.fileUrl?.trim?.()
);

const getDocumentCompletionPercentage = (documents) => {
  if (!documents) return 0;
  const completed = REQUIRED_DOCUMENT_FIELDS.filter((field) =>
    hasDocumentValue(documents[field]) || Boolean(String(documents[`${field}_expectedDate`] || '').trim())
  ).length;
  return Math.round((completed / REQUIRED_DOCUMENT_FIELDS.length) * 100);
};

const getBachelorCompletionPercentage = ({ overview, lang, documents, education }) => {
  const values = [
    Number(overview?.progress?.percentage) || 0,
    Number(lang?.completionPercentage) || 0,
    getDocumentCompletionPercentage(documents),
    documents?.isCompleted ? 100 : 0,
    Number(education?.completionPercentage) || 0,
    education?.isCompleted ? 100 : 0,
  ];
  if (['submitted', 'completed'].includes(overview?.applicationStatus)) values.push(100);
  if (lang?.isCompleted) values.push(100);
  return Math.max(...values);
};

const isBachelorCompleted = (app) =>
  app.completionPercentage === 100 ||
  ['submitted', 'completed'].includes(app.overviewStatus) ||
  app.isCompleted;

const getStatusDisplay = (app) => {
  if (isBachelorCompleted(app)) return { status: 'Submitted', statusType: 'approved' };
  if (app.completionPercentage > 0) return { status: 'In Progress', statusType: 'review' };
  return { status: 'Pending', statusType: 'pending' };
};
const normalizeDedupePart = (value = '') => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const getApplicationDedupeKey = (app = {}) => [
  normalizeDedupePart(app.studentId),
  normalizeDedupePart(
    app.universityName ||
    app.selectedCourse?.universityName ||
    app.selectedCourse?.university ||
    app.selectedUniversity?.universityName ||
    app.selectedUniversity?.name ||
    app.applicationUniversityName ||
    app.completedUniversityName
  ),
  normalizeDedupePart(
    app.programName ||
    app.selectedCourse?.programName ||
    app.selectedCourse?.title ||
    app.selectedCourse?.name ||
    app.applicationProgramName ||
    app.completedProgramName
  ),
].join('|');

const getApplicationTimestamp = (app = {}) => {
  const date = app.submittedAt || app.updatedAt || app.createdAt || 0;
  const time = new Date(date).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getApplicationStatusScore = (app = {}) => {
  const status = app.overviewStatus || app.applicationStatus || app.status || '';
  if (['submitted', 'completed'].includes(String(status).toLowerCase())) return 2;
  if (String(status).toLowerCase() === 'in_progress') return 1;
  return 0;
};

const shouldReplaceDuplicateApplication = (current = {}, next = {}) => {
  const currentTime = getApplicationTimestamp(current);
  const nextTime = getApplicationTimestamp(next);
  if (nextTime !== currentTime) return nextTime > currentTime;

  const currentStatusScore = getApplicationStatusScore(current);
  const nextStatusScore = getApplicationStatusScore(next);
  if (nextStatusScore !== currentStatusScore) return nextStatusScore > currentStatusScore;

  const currentActiveScore = current.processAdminVerified === false ? 1 : 0;
  const nextActiveScore = next.processAdminVerified === false ? 1 : 0;
  if (nextActiveScore !== currentActiveScore) return nextActiveScore > currentActiveScore;

  return String(next.applicationId || '') > String(current.applicationId || '');
};

const dedupeApplicationsByStudentProgram = (apps = []) => {
  console.log("Before dedupe:", apps.length);
  const byKey = new Map();

  apps.forEach((app) => {
    const key = getApplicationDedupeKey(app);
    if (!key || key.split('|').some((part) => !part)) {
      const fallbackKey = `${normalizeDedupePart(app.studentId)}|${normalizeDedupePart(app.applicationId)}`;
      byKey.set(fallbackKey, app);
      return;
    }

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, app);
      return;
    }

    if (shouldReplaceDuplicateApplication(existing, app)) {
      console.log("Duplicate skipped:", key, existing.applicationId);
      byKey.set(key, app);
    } else {
      console.log("Duplicate skipped:", key, app.applicationId);
    }
  });

  const dedupedApps = Array.from(byKey.values());
  console.log("After dedupe:", dedupedApps.length);
  return dedupedApps;
};

const loadBachelorApplications = async () => {
  const enrollmentBachelors = await fetchEnrollmentList('bachelor', 'all', '').catch(() => []);
  const enrollmentUserIds = new Set(enrollmentBachelors.map(a => String(a.studentId)));

  const legacyOverviews = await Overview.find({
    applicationStatus: { $in: ['submitted', 'completed', 'approved'] }
  })
    .select('userId applicationId applicationUniversityName applicationProgramName completedUniversityName completedProgramName selectedUniversity selectedCourse applicationStatus submittedAt progress processAdminStatus processAdminVerified processAdminVerifiedAt processAdminVerifiedBy verificationStatus createdAt updatedAt')
    .sort({ createdAt: -1 })
    .lean()
    .catch(() => []);

  const unlinkedLegacy = legacyOverviews.filter(o => !enrollmentUserIds.has(String(o.userId)));

  let legacyMapped = [];
  if (unlinkedLegacy.length > 0) {
    const studentObjectIds = unlinkedLegacy.map(o => toObjectId(o.userId)).filter(Boolean);
    const accountRecords = await Account.find({ _id: { $in: studentObjectIds } })
      .select('firstName lastName email phone')
      .lean()
      .catch(() => []);
    const accountMap = buildMap(accountRecords, '_id');

    legacyMapped = unlinkedLegacy.map((overview) => {
      const studentId = overview.userId?.toString() || '';
      const account = accountMap[studentId] || {};
      const selection = buildSelection({ overview });
      const studentName = [account.firstName, account.lastName].filter(Boolean).join(' ') || 'Unknown Student';
      const isCompleted = ['submitted', 'completed', 'approved'].includes(String(overview.applicationStatus).toLowerCase());

      return {
        _id: overview._id,
        applicationId: overview.applicationId || (studentId ? `UEG-B-${studentId.slice(-8).toUpperCase()}` : ''),
        studentId,
        studentName,
        email: account.email || '',
        phone: account.phone || '',
        universityName: selection.universityName || 'GUS University',
        programName: selection.programName || 'Bachelor Application',
        type: 'bachelor',
        overviewStatus: overview.applicationStatus || 'draft',
        processAdminStatus: overview.processAdminStatus || 'pending',
        processAdminVerified: overview.processAdminVerified || false,
        completionPercentage: isCompleted ? 100 : (Number(overview.progress?.percentage) || 0),
        isCompleted,
        submittedAt: overview.submittedAt || null,
        updatedAt: overview.updatedAt,
        createdAt: overview.createdAt,
      };
    });
  }

  const apps = [...enrollmentBachelors, ...legacyMapped];
  const dedupedApps = dedupeApplicationsByStudentProgram(apps);
  dedupedApps.sort((a, b) => new Date(b.submittedAt || b.updatedAt || b.createdAt || 0) - new Date(a.submittedAt || a.updatedAt || a.createdAt || 0));
  return dedupedApps;
};

const loadMasterApplications = async () => {
  const enrollmentMasters = await fetchEnrollmentList('masters', 'all', '').catch(() => []);
  let legacyMasters = [];
  try {
    if (mongoose.models.MasterPreview) {
      legacyMasters = await mongoose.model('MasterPreview').find({}).sort({ updatedAt: -1 }).lean();
    }
  } catch (err) {}

  const legacyMapped = legacyMasters.map(m => ({
    _id: m._id,
    applicationId: m.applicationId || (m.userId ? makeApplicationId(m.userId) : ''),
    studentId: m.userId?.toString() || '',
    studentName: m.fullName || m.studentName || 'Unknown Student',
    email: m.email || '',
    phone: m.phone || '',
    universityName: m.universityName || m.course?.universityName || 'Master University',
    programName: m.programName || m.course?.preferredCourse || 'Master Application',
    type: 'master',
    overviewStatus: m.applicationStatus || 'submitted',
    processAdminStatus: m.processAdminStatus || 'pending',
    processAdminVerified: m.processAdminVerified || false,
    completionPercentage: 100,
    isCompleted: true,
    submittedAt: m.submittedAt || m.createdAt,
    updatedAt: m.updatedAt || m.createdAt,
    createdAt: m.createdAt,
  }));

  const apps = [...enrollmentMasters, ...legacyMapped];
  const dedupedApps = dedupeApplicationsByStudentProgram(apps);
  dedupedApps.sort((a, b) => new Date(b.submittedAt || b.updatedAt || b.createdAt || 0) - new Date(a.submittedAt || a.updatedAt || a.createdAt || 0));
  return dedupedApps;
};

const loadMedicalApplications = async () => {
  const enrollmentMedical = await fetchEnrollmentList('medical', 'all', '').catch(() => []);
  enrollmentMedical.sort((a, b) => new Date(b.submittedAt || b.updatedAt || b.createdAt || 0) - new Date(a.submittedAt || a.updatedAt || a.createdAt || 0));
  return enrollmentMedical;
};

/*
   GET DASHBOARD STATS
   GET /api/process-admin/dashboard/stats
*/
export const getDashboardStats = async (req, res) => {
  try {
    const [bachelorApps, masterApps, medicalApps] = await Promise.all([
      loadBachelorApplications(),
      loadMasterApplications(),
      loadMedicalApplications(),
    ]);

    const isAppCompleted = (app) =>
      app.completionPercentage === 100 ||
      ['submitted', 'completed', 'approved'].includes(String(app.overviewStatus || app.applicationStatus || app.status || '').toLowerCase()) ||
      app.isCompleted === true;

    const bachelorCompleted = bachelorApps.filter(isAppCompleted).length;
    const bachelorDraft = bachelorApps.filter((app) => app.completionPercentage === 0 || String(app.overviewStatus).toLowerCase() === 'draft').length;
    const bachelorInProgress = bachelorApps.length - bachelorCompleted - bachelorDraft;
    const bachelorPending = bachelorApps.filter((app) => !app.processAdminVerified && app.processAdminStatus === 'pending').length;

    const masterCompleted = masterApps.filter(isAppCompleted).length;
    const masterDraft = masterApps.filter((app) => app.completionPercentage === 0 || String(app.overviewStatus).toLowerCase() === 'draft').length;
    const masterUnderReview = masterApps.length - masterCompleted - masterDraft;
    const masterPending = masterApps.filter((app) => !app.processAdminVerified && app.processAdminStatus === 'pending').length;

    const medicalCompleted = medicalApps.filter(isAppCompleted).length;
    const medicalDraft = medicalApps.filter((app) => app.completionPercentage === 0 || String(app.overviewStatus).toLowerCase() === 'draft').length;
    const medicalPending = medicalApps.filter((app) => !app.processAdminVerified && app.processAdminStatus === 'pending').length;

    const totalApplications = bachelorApps.length + masterApps.length + medicalApps.length;
    const totalCompleted = bachelorCompleted + masterCompleted + medicalCompleted;
    const totalPending = bachelorPending + masterPending + medicalPending;
    const totalIncomplete = bachelorDraft + masterDraft + medicalDraft;

    return res.status(200).json({
      success: true,
      stats: {
        totalApplications,
        totalPending,
        totalCompleted,
        totalIncomplete,
        bachelor: {
          total: bachelorApps.length,
          completed: bachelorCompleted,
          incomplete: bachelorDraft,
          inProgress: bachelorInProgress,
          pending: bachelorPending,
        },
        master: {
          total: masterApps.length,
          submitted: masterCompleted,
          completed: masterCompleted,
          draft: masterDraft,
          underReview: masterUnderReview,
          pending: masterPending,
        },
        medical: {
          total: medicalApps.length,
          completed: medicalCompleted,
          incomplete: medicalDraft,
          inProgress: medicalApps.length - medicalCompleted - medicalDraft,
          pending: medicalPending,
        },
      },
    });
  } catch (error) {
    console.error('getDashboardStats Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/*
   GET RECENT APPLICATIONS
   GET /api/process-admin/dashboard/recent-applications
*/
export const getRecentApplications = async (req, res) => {
  try {
    const [bachelorApps, masterApps, medicalApps] = await Promise.all([
      loadBachelorApplications(),
      loadMasterApplications(),
      loadMedicalApplications(),
    ]);

    const formatApp = (app, defaultType) => {
      const display = getStatusDisplay(app);
      return {
        _id: app._id,
        applicationId: app.applicationId || '',
        studentName: app.studentName || 'Unknown Student',
        email: app.email || '',
        university: app.universityName || 'University',
        type: app.type || defaultType,
        program: app.programName || 'Application',
        status: display.status,
        statusType: display.statusType,
        completionPercentage: app.completionPercentage || 0,
        processAdminStatus: app.processAdminStatus || 'pending',
        processAdminVerified: app.processAdminVerified || false,
        date: fmtDate(app.submittedAt || app.updatedAt || app.createdAt),
        createdAt: app.submittedAt || app.updatedAt || app.createdAt,
      };
    };

    const allApps = [
      ...bachelorApps.map(a => formatApp(a, 'bachelor')),
      ...masterApps.map(a => formatApp(a, 'master')),
      ...medicalApps.map(a => formatApp(a, 'medical')),
    ];

    allApps.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const recentApps = allApps.slice(0, 6);

    console.log("Recent applications count:", recentApps.length);

    return res.status(200).json({
      success: true,
      data: recentApps,
    });
  } catch (error) {
    console.error('getRecentApplications Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch recent applications.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};