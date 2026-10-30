import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Account from '../models/accountModel.js';
import MastersUniversity from '../models/mastersUniversityModel.js';
import { sendEmailEnhanced, emailTemplates } from '../utils/sendEmail.js';
import { fetchEnrollmentList, getMasterApplicationDetail } from '../Enrollment/controllers/enrollmentAdminController.js';
import ProgramSelection from '../Enrollment/model/programmodel.js';
import UniversitySelection from '../Enrollment/model/universityselectionmodel.js';
import TestScores from '../Enrollment/model/testmodel.js';
import FirstYearReview from '../Enrollment/model/reviewmodel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let masterCatalogCache;
const getMasterCatalog = () => {
  if (masterCatalogCache) return masterCatalogCache;
  const candidates = [path.join(process.cwd(), 'server', 'masteruniversity.json'), path.resolve(__dirname, '../masteruniversity.json')];
  const filePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!filePath) throw new Error('masteruniversity.json was not found.');
  masterCatalogCache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return masterCatalogCache;
};

const MASTER_TEST_REQUIREMENTS = [
  { match: /ielts/i, key: 'IELTS Min (Overall)' },
  { match: /toefl/i, key: 'TOEFL iBT Min' },
  { match: /pte/i, key: 'PTE Academic Min' },
  { match: /duolingo/i, key: 'Duolingo Min' },
  { match: /cambridge/i, key: 'Cambridge C1 Min' },
  { match: /gre subject/i, key: 'GRE Subject Min' },
  { match: /gre/i, key: 'GRE Min' },
  { match: /gmat/i, key: 'GMAT Min' },
  { match: /executive assessment|\bea\b/i, key: 'EA Min' },
  { match: /lsat/i, key: 'LSAT Min' },
  { match: /gate/i, key: 'GATE Min' },
  { match: /cat/i, key: 'CAT Percentile Min' },
  { match: /mat/i, key: 'MAT Min' },
];

const normalizeCountry = (value) => String(value || '').trim().toLocaleLowerCase();
const getSelectedStudyCountries = (program = {}) => {
  const selection = program.programSelection || {};
  const countries = Array.isArray(selection.selectedCountries) && selection.selectedCountries.length
    ? selection.selectedCountries
    : Array.isArray(program.selectedCountries) && program.selectedCountries.length
      ? program.selectedCountries
      : [selection.countryName || program.countryName].filter(Boolean);
  return new Set(countries.map(normalizeCountry).filter(Boolean));
};

const getEligibleMasterUniversities = (testRecord) => {
  const matched = new Map();
  for (const test of testRecord?.tests || []) {
    const exam = String(test.exam || '').trim();
    const requirement = MASTER_TEST_REQUIREMENTS.find(({ match }) => match.test(exam));
    const scoreText = String(test.score ?? '').replace(/,/g, '').trim();
    const score = scoreText && /^\d+(?:\.\d+)?$/.test(scoreText) ? Number(scoreText) : NaN;
    if (!requirement || !Number.isFinite(score)) continue;

    for (const row of getMasterCatalog()) {
      if (!String(row['Degree Levels Offered'] || '').toLowerCase().includes('master')) continue;
      const minimumText = String(row[requirement.key] ?? '').trim();
      const minimum = minimumText && /^\d+(?:\.\d+)?$/.test(minimumText) ? Number(minimumText) : NaN;
      const universityName = String(row.University || '').trim();
      const country = String(row['Country / Location'] || '').trim();
      if (!universityName || !country || !Number.isFinite(minimum) || score < minimum) continue;
      const key = `${universityName.toLowerCase()}|${country.toLowerCase()}`;
      const current = matched.get(key) || {
        universityId: `${universityName}|${country}`,
        universityName,
        country,
        programName: '',
        selectedPrograms: [],
        minScoreRequired: minimum,
        matchedExam: exam,
        studentScore: score,
      };
      const programName = String(row.Program || '').trim();
      if (programName && !current.selectedPrograms.includes(programName)) current.selectedPrograms.push(programName);
      if (!current.programName) current.programName = programName;
      matched.set(key, current);
    }
  }
  return Array.from(matched.values()).map((university) => ({
    ...university,
    scoreAboveMinimum: 0,
  })).sort((a, b) => b.minScoreRequired - a.minScoreRequired || a.universityName.localeCompare(b.universityName));
};

const toObjectId = (id) => {
  if (!id) return null;
  const s = id.toString().trim();
  if (!mongoose.Types.ObjectId.isValid(s)) return null;
  return new mongoose.Types.ObjectId(s);
};

const fmtDate = (d) => {
  if (!d) return '';
  try { return new Date(d).toISOString().split('T')[0]; }
  catch { return ''; }
};

// GET /api/master-university/process-admin/all
export const getMasterUniversityApplications = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const pageNum  = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 50, 1);
    const skip     = (pageNum - 1) * limitNum;

    let legacyApps = [];
    try {
      if (mongoose.models.MasterPreview) {
        legacyApps = await mongoose.model('MasterPreview').find({}).sort({ updatedAt: -1 }).lean();
      }
    } catch (err) {
      console.warn("Legacy MasterPreview check skipped:", err.message);
    }

    // Fetch the full master list, then apply one consistent filter after legacy
    // and enrollment records have been combined. fetchEnrollmentList's
    // "submitted" status intentionally includes several review states, which
    // made the Completed tab show applications from every state.
    const enrollmentMasters = await fetchEnrollmentList('masters', 'all', '').catch(() => []);

    const mappedEnrollment = enrollmentMasters.map((app) => ({
      ...app,
      fullName: app.studentName || app.fullName || 'Unknown Student',
      course: app.course || {
        universityName: app.universityName || (app.selectedCountries && app.selectedCountries.length ? app.selectedCountries.join(', ') : 'Master University'),
        preferredCourse: app.programName || app.programType || 'Master Application',
      },
    }));

    let data = [...legacyApps, ...mappedEnrollment];

    const normalizedStatus = String(status || 'all').toLowerCase();
    if (normalizedStatus !== 'all') {
      const isCompleted = (app) =>
        String(app.universitySelectionStatus || '').toLowerCase() === 'completed' ||
        ['approved'].includes(String(app.programApprovalStatus || app.overviewStatus || '').toLowerCase()) ||
        (!app.programApprovalStatus && !app.overviewStatus && ['approved', 'submitted', 'completed'].includes(String(app.applicationStatus || app.status || '').toLowerCase())) ||
        app.isCompleted === true;
      const isIncomplete = (app) =>
        ['rejected', 'draft', 'pending'].includes(String(app.programApprovalStatus || app.overviewStatus || app.status || '').toLowerCase()) ||
        ['rejected', 'draft'].includes(String(app.applicationStatus || '').toLowerCase());
      data = data.filter((app) => {
        if (['completed', 'submitted'].includes(normalizedStatus)) return isCompleted(app);
        if (['incomplete', 'draft'].includes(normalizedStatus)) return isIncomplete(app);
        if (['inprogress', 'under_review', 'progress'].includes(normalizedStatus)) return !isCompleted(app) && !isIncomplete(app);
        return true;
      });
    }

    if (search) {
      const q = search.toLowerCase();
      data = data.filter((app) =>
        app.studentName?.toLowerCase().includes(q)    ||
        app.fullName?.toLowerCase().includes(q)       ||
        app.email?.toLowerCase().includes(q)          ||
        app.phone?.includes(q)                        ||
        app.applicationId?.toLowerCase().includes(q)  ||
        app.studentId?.includes(q)
      );
    }

    data.sort((a, b) => new Date(b.submittedAt || b.updatedAt || b.createdAt || 0) - new Date(a.submittedAt || a.updatedAt || a.createdAt || 0));

    const total = data.length;
    const paginatedData = data.slice(skip, skip + limitNum);

    return res.status(200).json({
      success: true,
      data: paginatedData,
      pagination: {
        total,
        page:  pageNum,
        pages: Math.ceil(total / limitNum) || 1,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error('❌ getMasterUniversityApplications Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch Master University applications.',
      error: error.message,
    });
  }
};

// GET /api/master-university/process-admin/:studentId
export const getMasterUniversityApplicationById = async (req, res) => {
  try {
    const { studentId } = req.params;
    const oid = toObjectId(studentId);

    if (!oid) {
      return res.status(400).json({ success: false, message: 'Invalid studentId format.' });
    }

    req.params.userId = studentId;
    return getMasterApplicationDetail(req, res);
  } catch (error) {
    console.error('❌ getMasterUniversityApplicationById Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch application detail.',
      error: error.message,
    });
  }
};

// GET /api/master-university/process-admin/stats
export const getMasterUniversityStats = async (req, res) => {
  try {
    const enrollmentMasters = await fetchEnrollmentList('masters', 'all', '').catch(() => []);
    let legacyApps = [];
    try {
      if (mongoose.models.MasterPreview) {
        legacyApps = await mongoose.model('MasterPreview').find({}).lean();
      }
    } catch (err) {}

    const all = [...legacyApps, ...enrollmentMasters];
    const total = all.length;
    const completed = all.filter(a => a.overviewStatus === 'approved' || a.programApprovalStatus === 'approved' || a.applicationStatus === 'submitted' || a.status === 'approved' || a.isCompleted).length;
    const incomplete = all.filter(a => a.overviewStatus === 'rejected' || a.programApprovalStatus === 'rejected' || a.applicationStatus === 'draft').length;
    const inProgress = total - completed - incomplete;

    return res.status(200).json({
      success: true,
      stats: {
        total,
        submitted: completed,
        draft: incomplete,
        underReview: inProgress > 0 ? inProgress : 0,
        completed,
        incomplete,
        inProgress: inProgress > 0 ? inProgress : 0,
      },
    });
  } catch (error) {
    console.error('❌ getMasterUniversityStats Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch stats.',
      error: error.message,
    });
  }
};

export const getMasterUniversityMatches = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) return res.status(400).json({ success: false, message: 'A valid student ID is required.' });
    const [program, tests, selection] = await Promise.all([
      ProgramSelection.findOne({ userId: studentId }).lean(),
      TestScores.findOne({ userId: studentId }).lean(),
      UniversitySelection.findOne({ userId: studentId }).lean(),
    ]);
    if (!program) return res.status(404).json({ success: false, message: 'Master enrollment application was not found.' });
    const programType = String(program.programSelection?.programType || program.programType || '').toLowerCase();
    if (!programType.includes('master') && programType !== 'pg') return res.status(400).json({ success: false, message: 'This is not a master application.' });
    const selectedCountries = getSelectedStudyCountries(program);
    const universities = selectedCountries.size
      ? getEligibleMasterUniversities(tests).filter((university) => selectedCountries.has(normalizeCountry(university.country)))
      : [];
    return res.json({ success: true, data: {
      universities,
      selectedCountries: [...selectedCountries],
      selectedUniversities: selection?.selectedUniversities || [],
      universitySelectionStatus: selection?.status || 'selected',
      programApprovalStatus: program.programApprovalStatus || 'pending',
      testScores: (tests?.tests || []).filter((test) => MASTER_TEST_REQUIREMENTS.some(({ match }) => match.test(String(test.exam || '')))).map(({ exam, score }) => ({ exam, score })),
    } });
  } catch (error) {
    console.error('getMasterUniversityMatches error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to load eligible master universities.' });
  }
};

export const saveMasterUniversitySelection = async (req, res) => {
  try {
    const studentId = String(req.body?.studentId || '').trim();
    const requested = req.body?.selectedUniversities;
    if (!mongoose.Types.ObjectId.isValid(studentId)) return res.status(400).json({ success: false, message: 'A valid student ID is required.' });
    if (!Array.isArray(requested) || requested.length < 1 || requested.length > 5) return res.status(400).json({ success: false, message: 'Select between 1 and 5 eligible universities.' });
    const [program, tests, account] = await Promise.all([
      ProgramSelection.findOne({ userId: studentId }).lean(),
      TestScores.findOne({ userId: studentId }).lean(),
      Account.findById(studentId).select('applicationStatus').lean(),
    ]);
    const programType = String(program?.programSelection?.programType || program?.programType || '').toLowerCase();
    if (!program || (!programType.includes('master') && programType !== 'pg')) return res.status(404).json({ success: false, message: 'Master enrollment application was not found.' });
    if (program.programApprovalStatus !== 'approved' && String(account?.applicationStatus || '').toLowerCase() !== 'approved') return res.status(409).json({ success: false, message: 'Approve the master program before selecting universities.' });
    const selectedCountries = getSelectedStudyCountries(program);
    const eligible = selectedCountries.size
      ? getEligibleMasterUniversities(tests).filter((university) => selectedCountries.has(normalizeCountry(university.country)))
      : [];
    const eligibleByKey = new Map(eligible.map((university) => [`${university.universityName.toLowerCase()}|${university.country.toLowerCase()}`, university]));
    const selected = [];
    const seen = new Set();
    for (const item of requested) {
      const key = `${String(item?.universityName || '').trim().toLowerCase()}|${String(item?.country || '').trim().toLowerCase()}`;
      const match = eligibleByKey.get(key);
      if (!match) return res.status(400).json({ success: false, message: 'Selected university is not eligible for the student’s submitted test scores.' });
      if (seen.has(key)) return res.status(400).json({ success: false, message: 'Each university can only be selected once.' });
      seen.add(key);
      selected.push({ ...match, degree: 'Master' });
    }
    const countries = [...new Set(selected.map((university) => university.country))];
    const selection = await UniversitySelection.findOneAndUpdate(
      { userId: studentId },
      { $set: { userId: studentId, programType: 'masters', selectedCountry: countries.length === 1 ? countries[0] : '', selectedUniversities: selected, status: 'selected' } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true, message: 'Master university selection saved.', data: selection });
  } catch (error) {
    console.error('saveMasterUniversitySelection error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save master university selection.' });
  }
};

export const approveMasterUniversitySelection = async (req, res) => {
  try {
    const studentId = String(req.body?.studentId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(studentId)) return res.status(400).json({ success: false, message: 'A valid student ID is required.' });
    const [program, selection, account] = await Promise.all([
      ProgramSelection.findOne({ userId: studentId }),
      UniversitySelection.findOne({ userId: studentId }),
      Account.findById(studentId),
    ]);
    if (!program || (program.programApprovalStatus !== 'approved' && String(account?.applicationStatus || '').toLowerCase() !== 'approved')) return res.status(409).json({ success: false, message: 'Approve the master program before final approval.' });
    if (!selection?.selectedUniversities?.length) return res.status(409).json({ success: false, message: 'Select and save at least one master university before approval.' });
    if (program.programApprovalStatus !== 'approved') {
      program.programApprovalStatus = 'approved';
      await program.save();
    }
    selection.status = 'Completed';
    await selection.save();
    if (account) {
      account.applicationStatus = 'Approved';
      account.isLocked = true;
      await account.save();
    }
    await FirstYearReview.findOneAndUpdate({ userId: studentId }, { $set: { userId: studentId, status: 'Approved', submittedAt: account?.submittedAt || new Date(), programType: 'masters' } }, { upsert: true, new: true });
    return res.json({ success: true, message: 'Master university selection approved.', applicationStatus: 'Approved' });
  } catch (error) {
    console.error('approveMasterUniversitySelection error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve master university selection.' });
  }
};

// POST /api/master-university/process-admin/send-document-email
export const sendDocumentEmailToStudent = async (req, res) => {
  try {
    const {
      studentEmail,
      studentName,
      documentName,
      reason       = "other",
      adminNotes   = "",
      deadlineDays = 7,
    } = req.body;

    if (!studentEmail) {
      return res.status(400).json({ success: false, message: "studentEmail is required." });
    }
    if (!documentName) {
      return res.status(400).json({ success: false, message: "documentName is required." });
    }

    const { subject, html } = emailTemplates.documentCorrection({
      studentName:  studentName  || "Student",
      documentName: documentName,
      documentType: documentName,
      reason,
      adminNotes:   adminNotes || "",
      deadlineDays: Number(deadlineDays) || 7,
    });

    const result = await sendEmailEnhanced({ to: studentEmail, subject, html });

    if (!result.success) {
      return res.status(500).json({ success: false, message: "Failed to send email.", error: result.error });
    }

    return res.status(200).json({ success: true, message: `Email sent to ${studentEmail}`, messageId: result.messageId });
  } catch (error) {
    console.error("❌ sendDocumentEmailToStudent Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
