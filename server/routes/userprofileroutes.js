// src/routes/userprofileroutes.js
//
// Mounted in server.js as:
//   app.use('/api/user',  userProfileRouter)   ← existing
//   app.use('/api/admin', userProfileRouter)   ← ADD THIS in server.js
//
// With both mounts, the frontend calls resolve as:
//   GET  /api/user/profile              ✅ → router.get('/profile')
//   POST /api/user/profile              ✅ → router.post('/profile')
//   GET  /api/user/notifications        ✅ → router.get('/notifications')
//   GET  /api/admin/universities        ✅ → router.get('/universities')
//   POST /api/admin/university-request  ✅ → router.post('/university-request')

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  createOrUpdateProfile,
  getProfile,
  getProfileByEmail,
  updateProfileImage,
  checkProfileStatus,
  deleteProfile,
  getAllProfiles,
  getProfilesByProgram,
  getProfilesBySegment,
  getProfileStats,
  bulkUpdateProfiles,
  getProfileWithCourses,
  getProfileForAnalytics,
  submitUniversityRequest,
} from '../controllers/userprofilecontroller.js';

import {
  getUserNotifications,
  markUserNotificationRead,
} from '../controllers/notificationController.js';

import GUSUniversity from '../models/GUSUniversity.js';
import BachelorsUniversity from '../models/bachelorsUniversityModel.js';
import MastersUniversity   from '../models/mastersUniversityModel.js';

const router = express.Router();

const normalizeSegmentText = (value = '') =>
  value.toString().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();

const programMatchesSegment = (program, segment = '') => {
  if (!segment) return true;
  const target = segment.toString().trim();
  const areas = [
    program?.majorArea,
    program?.major_area,
    program?.category,
    program?.field,
    program?.original_major_area,
  ].filter(Boolean);
  return areas.some(area => area.toString().trim() === target);
};

const getProgramTitle = (program = '') => {
  if (typeof program === 'string') return program;
  return program.title || program.name || program.program_name || program.programName || program.course_name || program.courseName || '';
};

const normalizeProgramRecord = (program, university, source, majorArea = '', index = 0) => {
  const title = getProgramTitle(program).trim();
  if (!title) return null;
  const programObj = typeof program === 'object' && program !== null ? program : {};
  const idBase = university.UNITID || university.universityCode || university._id || 'university';
  const level = programObj.level || programObj.degree || programObj.educationLevel || university.educationLevel || (source === 'masters' ? 'Master' : 'Undergraduate');
  return {
    ...programObj,
    id: programObj.id || programObj._id || `program-${idBase}-${index}`,
    name: programObj.name || title,
    title,
    program_name: programObj.program_name || programObj.programName || title,
    degree: programObj.degree || university.degree || (source === 'masters' ? 'Master' : 'Bachelor'),
    educationLevel: programObj.educationLevel || university.educationLevel || (source === 'masters' ? 'Postgraduate' : 'Undergraduate'),
    level,
    studyMode: programObj.studyMode || programObj.study_mode || programObj.mode || 'On Campus',
    majorArea: programObj.majorArea || programObj.major_area || programObj.original_major_area || programObj.category || programObj.field || majorArea || '',
    major_area: programObj.major_area || programObj.majorArea || majorArea || '',
  };
};

const collectProgramItems = (value, university, source, majorArea = '', target = []) => {
  if (!value) return target;

  if (Array.isArray(value)) {
    value.forEach((item) => collectProgramItems(item, university, source, majorArea, target));
    return target;
  }

  if (typeof value === 'string') {
    const normalized = normalizeProgramRecord(value, university, source, majorArea, target.length);
    if (normalized) target.push(normalized);
    return target;
  }

  if (typeof value !== 'object') return target;

  const area = value.major_area || value.majorArea || value.original_major_area || value.name || value.category || value.field || majorArea || '';
  const nestedPrograms = value.programs || value.specific_programs || value.courses || value.items;
  if (nestedPrograms) {
    collectProgramItems(nestedPrograms, university, source, area, target);
    return target;
  }

  const normalized = normalizeProgramRecord(value, university, source, area, target.length);
  if (normalized) target.push(normalized);
  return target;
};

const collectProgramsData = (programsData, university, source, target = []) => {
  if (!programsData) return target;

  if (Array.isArray(programsData)) {
    programsData.forEach((item) => {
      const area = item?.major_area || item?.majorArea || item?.original_major_area || item?.category || item?.field || item?.name || '';
      collectProgramItems(item, university, source, area, target);
    });
    return target;
  }

  if (typeof programsData === 'object') {
    Object.entries(programsData).forEach(([area, programs]) => collectProgramItems(programs, university, source, area, target));
  }

  return target;
};

const extractRoutePrograms = (university, source = 'bachelors') => {
  const programs = [];
  collectProgramsData(university.programs_data, university, source, programs);
  collectProgramsData(university.GUS_DATA?.programs_data, university, source, programs);
  collectProgramsData(university.programTemplate?.programs_data, university, source, programs);
  collectProgramItems(university.major_areas, university, source, '', programs);
  collectProgramItems(university.GUS_DATA?.major_areas, university, source, '', programs);
  collectProgramItems(university.programTemplate?.major_areas, university, source, '', programs);
  collectProgramItems(university.programs, university, source, '', programs);
  collectProgramItems(university.courses, university, source, '', programs);

  const seen = new Set();
  return programs.filter((program) => {
    const key = normalizeSegmentText(`${program.title}|${program.majorArea}|${program.level}`);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const withSegmentPrograms = (university, segment = '') => {
  if (!segment) return university;
  const programs = Array.isArray(university.programs) ? university.programs.filter(p => programMatchesSegment(p, segment)) : [];
  return { ...university, programs, programCount: programs.length };
};

const normalizeRouteUniversity = (university, source = 'bachelors') => {
  const programs = extractRoutePrograms(university, source);
  return {
    ...university,
    _source: source,
    universityType: source === 'masters' ? 'Master' : 'Bachelor',
    programs,
  };
};

const normalizeGusUniversity = (university, source = 'bachelors') => {
  const programs = extractRoutePrograms(university, source);

  return {
    ...university,
    _source: source,
    universityType: source === 'masters' ? 'Master' : 'Bachelor',
    country: university.GUS_DATA?.country || university.country || 'USA',
    location: {
      city: university.CITY || '',
      state: university.STABBR || '',
      country: university.GUS_DATA?.country || university.country || 'USA',
      display: [university.CITY, university.STABBR].filter(Boolean).join(', '),
    },
    programs,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC TEST  →  GET /api/user/test
// ─────────────────────────────────────────────────────────────────────────────
router.get('/test', (_req, res) => {
  res.json({
    success:   true,
    message:   '✅ User profile routes are working',
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DEBUG AUTH  →  GET /api/user/debug-auth
// ─────────────────────────────────────────────────────────────────────────────
router.get('/debug-auth', authenticateToken, (req, res) => {
  res.json({ success: true, userId: req.userId });
});

// ─────────────────────────────────────────────────────────────────────────────
// UNIVERSITIES HANDLER
// Serves both:
//   GET /api/user/universities   (legacy)
//   GET /api/admin/universities  (current frontend — via dual mount in server.js)
//
// Query params:
//   stream=UG / PG  → filter by type (also accepts 'type' and 'programType')
//   limit           → max records, capped at 500
// ─────────────────────────────────────────────────────────────────────────────
const universitiesHandler = async (req, res) => {
  try {
    const rawStream =
      req.query.stream      ||
      req.query.type        ||
      req.query.programType ||
      '';
    const stream = rawStream.toUpperCase(); // 'UG' | 'PG' | ''
    const page   = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const skip   = (page - 1) * limit;
    const segment = req.query.segment || req.query.field || '';
    const adminSource = stream === 'PG' ? 'masters' : 'bachelors';

    const fetchBachelors = !stream || stream === 'UG';
    const fetchMasters   = !stream || stream === 'PG';

    const [adminResult, bachResult, mastResult] = await Promise.allSettled([
      GUSUniversity
        .find({ GUS_DATA: { $exists: true } })
        .skip(skip)
        .limit(limit)
        .lean(),
      fetchBachelors
        ? BachelorsUniversity.find({ isActive: true }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
        : Promise.resolve([]),
      fetchMasters
        ? MastersUniversity.find({ isActive: true }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
        : Promise.resolve([]),
    ]);

    const adminUnis = adminResult.status === 'fulfilled' ? adminResult.value : [];
    const bachUnis = bachResult.status === 'fulfilled' ? bachResult.value : [];
    const mastUnis = mastResult.status === 'fulfilled' ? mastResult.value : [];

    if (adminResult.status === 'rejected')
      console.warn('GUSUniversity query failed:', adminResult.reason?.message);
    if (bachResult.status === 'rejected')
      console.warn('⚠️  BachelorsUniversity query failed:', bachResult.reason?.message);
    if (mastResult.status === 'rejected')
      console.warn('⚠️  MastersUniversity query failed:', mastResult.reason?.message);

    const taggedAdmin = adminUnis
      .map((u) => withSegmentPrograms(normalizeGusUniversity(u, adminSource), segment))
      .filter((u) => !segment || u.programs.length > 0);
    const taggedBach = bachUnis
      .map((u) => withSegmentPrograms(normalizeRouteUniversity(u, 'bachelors'), segment))
      .filter((u) => !segment || u.programs.length > 0);
    const taggedMast = mastUnis
      .map((u) => withSegmentPrograms(normalizeRouteUniversity(u, 'masters'), segment))
      .filter((u) => !segment || u.programs.length > 0);
    const all        = [...taggedAdmin, ...taggedBach, ...taggedMast];

    console.log(
      `✅ /universities [stream=${stream || 'ALL'} segment=${segment || 'ALL'}]` +
      ` — bachelors: ${bachUnis.length}, masters: ${mastUnis.length}, total: ${all.length}`,
    );

    // Flat array when a specific stream is requested →
    //   Array.isArray(res.data.data) === true  in frontend fetchUniversities()
    // Nested object when no stream →
    //   res.data.data.bachelors / .masters fallback also works
    return res.status(200).json({
      success: true,
      stream:  stream || 'ALL',
      data: stream === 'UG'
        ? [...taggedAdmin, ...taggedBach]
        : stream === 'PG'
          ? [...taggedAdmin, ...taggedMast]
          : { admin: taggedAdmin, bachelors: taggedBach, masters: taggedMast, all },
      counts: {
        admin:     adminUnis.length,
        bachelors: bachUnis.length,
        masters:   mastUnis.length,
        total:     all.length,
      },
      pagination: {
        page,
        limit,
        pages: all.length < limit ? page : page + 1,
      },
    });
  } catch (error) {
    console.error('❌ Error in universitiesHandler:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch universities',
      error:   error.message,
    });
  }
};

// GET /api/user/universities   AND   GET /api/admin/universities (via dual mount)
router.get('/universities', authenticateToken, universitiesHandler);

// GET /api/user/universities/:universityId/courses
router.get('/universities/:universityId/courses', authenticateToken, async (req, res) => {
  try {
    const { universityId } = req.params;
    const type = req.query.type;
    const segment = req.query.segment || req.query.field || '';

    if (!universityId)
      return res.status(400).json({ success: false, message: 'universityId is required' });

    let university = null;

    if (!type || type === 'Bachelor') {
      university =
        await BachelorsUniversity.findById(universityId).lean().catch(() => null) ||
        await BachelorsUniversity.findOne({ UNITID: universityId }).lean().catch(() => null);
    }
    if (!university && (!type || type === 'Master')) {
      university =
        await MastersUniversity.findById(universityId).lean().catch(() => null) ||
        await MastersUniversity.findOne({ UNITID: universityId }).lean().catch(() => null);
    }

    if (!university)
      return res.status(404).json({ success: false, message: 'University not found' });

    const rawCourses = university.programs || university.courses || [];
    const courses = segment ? rawCourses.filter(p => programMatchesSegment(p, segment)) : rawCourses;

    return res.status(200).json({
      success:        true,
      universityId,
      universityName: university.INSTNM || university.name || '',
      universityType: type || (university._source === 'masters' ? 'Master' : 'Bachelor'),
      totalCourses:   courses.length,
      data:           courses,
    });
  } catch (error) {
    console.error('❌ Error fetching university courses:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch courses',
      error:   error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE ROUTES
// ✅ Specific sub-paths declared BEFORE the plain /profile route
//    to avoid Express matching /profile/status as /profile with param "status"
//
//   GET    /api/user/profile/courses
//   GET    /api/user/profile/status
//   GET    /api/user/profile/email/:email
//   PATCH  /api/user/profile/image
//   POST   /api/user/profile
//   GET    /api/user/profile
//   DELETE /api/user/profile
// ─────────────────────────────────────────────────────────────────────────────
router.get   ('/profile/courses',      authenticateToken, getProfileWithCourses);
router.get   ('/profile/status',       authenticateToken, checkProfileStatus);
router.get   ('/profile/email/:email', authenticateToken, getProfileByEmail);
router.patch ('/profile/image',        authenticateToken, updateProfileImage);
router.post  ('/profile',              authenticateToken, createOrUpdateProfile);
router.get   ('/profile',              authenticateToken, getProfile);
router.delete('/profile',              authenticateToken, deleteProfile);

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
//   GET   /api/user/notifications
//   PATCH /api/user/notifications/:id/read
// ─────────────────────────────────────────────────────────────────────────────
router.get  ('/notifications',          authenticateToken, getUserNotifications);
router.patch('/notifications/:id/read', authenticateToken, markUserNotificationRead);

// ─────────────────────────────────────────────────────────────────────────────
// UNIVERSITY REQUEST
//
// ✅ FIX: frontend calls POST /api/admin/university-request  (hyphen)
//    Via dual mount in server.js this router also handles /api/admin/*
//    so this route becomes POST /api/admin/university-request  ✅
//
// Also keeping the legacy slash path for backwards compatibility.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/university-request', authenticateToken, submitUniversityRequest); // ✅ matches frontend
router.post('/university/request', authenticateToken, submitUniversityRequest); // legacy

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
//   GET /api/user/analytics/profile/:userId
// ─────────────────────────────────────────────────────────────────────────────
router.get('/analytics/profile/:userId', authenticateToken, getProfileForAnalytics);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES  (under /api/user/admin/*)
//   GET /api/user/admin/profiles
//   GET /api/user/admin/profiles/program/:program
//   GET /api/user/admin/profiles/segment/:segmentId
//   PUT /api/user/admin/profiles/bulk
//   GET /api/user/admin/stats
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/profiles',                    authenticateToken, getAllProfiles);
router.get('/admin/profiles/program/:program',   authenticateToken, getProfilesByProgram);
router.get('/admin/profiles/segment/:segmentId', authenticateToken, getProfilesBySegment);
router.put('/admin/profiles/bulk',               authenticateToken, bulkUpdateProfiles);
router.get('/admin/stats',                       authenticateToken, getProfileStats);

export default router;

