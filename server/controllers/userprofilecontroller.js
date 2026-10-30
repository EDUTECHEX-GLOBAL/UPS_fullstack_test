// src/controllers/userprofilecontroller.js
import UserProfile from '../models/userprofilemodel.js';
import { createUniversityRequestNotification } from './notificationController.js';
import { normalizeDegree } from '../services/majorAreaProgramIndex.js';

const MAX_SELECTED_UNIVERSITIES = 50;
const MAX_COURSES_PER_UNIVERSITY = 1000;
const MAX_TOTAL_SELECTED_COURSES = 5000;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// ✅ UPDATED: programType is now the single source of truth.
//    UG  → qualification = "12th"   → eligibleProgram = "Bachelor"
//    PG  → qualification = "Bachelor" → eligibleProgram = "Master"
//    PhD path removed — frontend never sends it in the current flow.
const deriveEligibleProgram = (programType) => {
  if (programType === 'UG') return 'Bachelor';
  if (programType === 'PG') return 'Master';
  if (programType === 'MEDICAL') return 'Medical';
  return null;
};

// ✅ UPDATED: qualification is auto-set from programType, not user-typed
const deriveQualification = (programType) => {
  if (programType === 'UG') return '12th';
  if (programType === 'PG') return 'Bachelor';
  if (programType === 'MEDICAL') return '12th';
  return '';
};

const deriveProgramStream = (programType) => {
  if (programType === 'UG') return 'UG';
  if (programType === 'PG') return 'PG';
  if (programType === 'MEDICAL') return 'MEDICAL';
  return null;
};

const sanitizePercentageCgpa = (value = '') =>
  String(value)
    .replace(/[^0-9.]/g, '')
    .replace(/(\..*)\./g, '$1')
    .slice(0, 6);

const isValidPercentageCgpa = (value) => {
  if (!value) return false;
  if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(value)) return false;
  const numericValue = Number(value);
  return !Number.isNaN(numericValue) && numericValue >= 0 && numericValue <= 100;
};

// ─────────────────────────────────────────────────────────────────────────────
// VALID FIELD-OF-STUDY VALUES
// Mirrors FIELD_OF_STUDY_BY_PROGRAM in UserProfile.js frontend
// ─────────────────────────────────────────────────────────────────────────────
const VALID_FIELDS_UG = [];
const VALID_FIELDS_PG = [];

const getValidFields = () => ({ includes: () => true });

// ─────────────────────────────────────────────────────────────────────────────
const getProgramDefaults = (programType) => {
  if (programType === 'PG') return { degree: 'Master', level: 'Postgraduate', duration: '1-2 years' };
  if (programType === 'MEDICAL') return { degree: 'Medical', level: 'Professional Degree', duration: '5-6 years' };
  return { degree: 'Bachelor', level: 'Undergraduate', duration: '3-4 years' };
};
const getUniversityType = (programType) => {
  if (programType === 'PG') return 'Master';
  if (programType === 'MEDICAL') return 'Medical';
  return 'Bachelor';
};

const resolveCourseCategory = (course = {}, fallbackCategory = '') =>
  (
    course.major_area ||
    course.majorArea ||
    course.category ||
    course.field ||
    course.original_major_area ||
    fallbackCategory ||
    ''
  ).toString().trim();

// fixCoursesOnProfile
// ─────────────────────────────────────────────────────────────────────────────
export const fixCoursesOnProfile = (profileObj) => {
  if (profileObj.selectedCourses) {
    try { profileObj.selectedCourses = Object.fromEntries(profileObj.selectedCourses); }
    catch { profileObj.selectedCourses = {}; }
  }

  if (Array.isArray(profileObj.selectedUniversities)) {
    profileObj.selectedUniversities = profileObj.selectedUniversities.map((uni) => {
      if (uni.selectedCourses && !Array.isArray(uni.selectedCourses)) {
        try {
          uni.selectedCourses = Object.values(Object.fromEntries(uni.selectedCourses));
        } catch {
          uni.selectedCourses = [];
        }
      }
      return uni;
    });
  }

  return profileObj;
};

// ─────────────────────────────────────────────────────────────────────────────
// processUniversityData
// ─────────────────────────────────────────────────────────────────────────────
const processUniversityData = (uniData, fallbackCategory = '', programType = '') => {
  if (!uniData) return null;
  const defaults = getProgramDefaults(programType);
  const locationObj = uniData.location && typeof uniData.location === 'object' && !Array.isArray(uniData.location)
    ? uniData.location
    : {};
  const flatLocation = typeof uniData.location === 'string' ? uniData.location.trim() : '';

  const resolvedId = (
    uniData.id             ||
    uniData.universityId   ||
    uniData.UNITID?.toString() ||
    uniData.unitid?.toString() ||
    uniData._id?.toString()    ||
    ''
  ).trim() || `uni-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  const resolvedName = (
    uniData.name           ||
    uniData.INSTNM         ||
    uniData.universityName ||
    ''
  ).trim() || 'Unknown University';

  const rawCourses = Array.isArray(uniData.selectedCourses)
    ? uniData.selectedCourses
    : [];

  const processedCourses = rawCourses.map((c, i) => {
    const courseId    = String(c.programId || c.id || c._id?.toString() || `course-${Date.now()}-${i}`).trim();
    const courseTitle = String(c.title || c.name || c.program_name || 'Course').trim();
    const category    = resolveCourseCategory(c, fallbackCategory);
    return {
      id:           courseId,
      title:        courseTitle,
      name:         (c.name         || courseTitle).trim(),
      program_name: (c.program_name || courseTitle).trim(),
      degree:       (c.degree       || defaults.degree).trim(),
      level:        (c.level        || defaults.level).trim(),
      studyMode:    (c.studyMode || c.modeOfStudy || 'On Campus').trim(),
      modeOfStudy:  (c.modeOfStudy || c.studyMode || 'On Campus').trim(),
      duration:     (c.duration     || defaults.duration).trim(),
      intake:       (c.intake       || '').trim(),
      locations:    Array.isArray(c.locations) ? c.locations.filter(Boolean) : [],
      category,
      field:        category,
      major_area:   category,
      majorArea:    category,
      original_major_area: (c.original_major_area || '').trim(),
      programType:  programType || '',
      programSource:(c.programSource || '').trim(),
      description:  (c.description  || '').trim(),
    };
  });

  return {
    id:       resolvedId,
    unitid:   uniData.unitid?.toString()   || uniData.UNITID?.toString() || null,
    name:     resolvedName,
    university:     uniData.university || '',
    universityName: uniData.universityName || '',
    location: flatLocation || locationObj.display || [uniData.city || uniData.CITY || locationObj.city, uniData.state || uniData.STABBR || locationObj.state].filter(Boolean).join(', ') || 'Location not specified',
    city:     (uniData.city    || uniData.CITY    || locationObj.city || flatLocation || '').trim(),
    state:    (uniData.state   || uniData.STABBR  || locationObj.state || '').trim(),
    country:  (uniData.country || uniData.COUNTRY || locationObj.country || '').trim(),
    website:  (uniData.website || uniData.WEBADDR || uniData.contact?.website || '').trim(),
    universityType: uniData.universityType || getUniversityType(programType),
    programType:    programType || '',
degree:         uniData.degree || (programType === 'PG' ? 'master' : programType === 'MEDICAL' ? 'medical' : 'bachelor'),
educationLevel: uniData.educationLevel || (programType === 'PG' ? 'Postgraduate' : programType === 'MEDICAL' ? 'Professional Degree' : 'Undergraduate'),
    originalDegree: uniData.originalDegree || uniData.degree || '',
    originalEducationLevel: uniData.originalEducationLevel || uniData.educationLevel || '',
    isKansas:       !!uniData.isKansas,
    isDirectApply:  !!(uniData.isDirectApply || uniData.isKansas),
    selectedCourses: processedCourses,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// processSegmentData
// ─────────────────────────────────────────────────────────────────────────────
const processSegmentData = (segmentData) => {
  if (!segmentData) return null;
  const id   = (segmentData.id   || '').toString().trim();
  const name = (segmentData.name || '').toString().trim();
  if (!id || !name) return null;
  return { id, name };
};

// ─────────────────────────────────────────────────────────────────────────────
// deriveSegmentFromField
// ✅ NEW: if selectedSegment is absent but education.field is set,
//    derive a segment object from the field value (mirrors frontend logic).
// ─────────────────────────────────────────────────────────────────────────────
const deriveSegmentFromField = (field) => {
  if (!field) return null;
  return {
    id:   field.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    name: field,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE OR UPDATE PROFILE
// POST /api/user/profile
// ─────────────────────────────────────────────────────────────────────────────
export const createOrUpdateProfile = async (req, res) => {
  try {
    const userId      = req.userId;
    const profileData = req.body;

    console.log('Profile save req.userId:', req.userId);
    console.log('Profile save body:', req.body);

    if (!userId)
      return res.status(401).json({ success: false, message: 'User ID not found in token' });

    console.log('📝 Creating/Updating profile for userId:', userId);

    // ── Basic field presence checks ────────────────────────────────────────
    if (!profileData.basicInfo)
      return res.status(400).json({ success: false, message: 'basicInfo is required' });
    if (!profileData.education)
      return res.status(400).json({ success: false, message: 'education is required' });

    // ── programType validation ─────────────────────────────────────────────
   const programType = profileData.programType;
if (!programType || !['UG', 'PG', 'MEDICAL'].includes(programType)) {
  return res.status(400).json({
    success: false,
    message: `Invalid programType: "${programType}". Must be UG, PG, or MEDICAL.`,
  });
}

    // ── ✅ UPDATED: Always derive these from programType, ignore what
    //    the client sent for qualification / eligibleProgram / programStream
    //    to prevent stale or mismatched values from slipping through.
    profileData.education.qualification = deriveQualification(programType);
    profileData.eligibleProgram         = deriveEligibleProgram(programType);
    profileData.programStream           = deriveProgramStream(programType);

    // ── Field of interest is required. selectedSegment is the preferred source;
    //    education.field is accepted only as a legacy fallback.
    let rawField = (profileData.education.field || '').trim();
    const explicitSegment = processSegmentData(profileData.selectedSegment);
    profileData.selectedSegment = explicitSegment
      || deriveSegmentFromField(rawField)
      || null;

    if (!profileData.selectedSegment?.name && !rawField) {
      return res.status(400).json({
        success: false,
        message: 'Please select what field you are interested in',
      });
    }

    rawField = profileData.selectedSegment?.name || rawField;
    if (rawField) {
      const validFields = getValidFields(programType);
      if (!validFields.includes(rawField)) {
        console.warn(
          `⚠️ Unrecognised field "${rawField}" for programType "${programType}" — storing as-is`
        );
        // Soft-warn only: accept unrecognised values so future field additions
        // in the frontend don't immediately break submissions.
      }
    }
    profileData.education.field = rawField;

    const sanitizedCgpa = sanitizePercentageCgpa(profileData.education.cgpa || '');
    if (!sanitizedCgpa) {
      return res.status(400).json({ success: false, message: 'Percentage / CGPA is required' });
    }
    if (!isValidPercentageCgpa(sanitizedCgpa)) {
      return res.status(400).json({ success: false, message: 'Enter a valid Percentage / CGPA between 0 and 100' });
    }
    profileData.education.cgpa = sanitizedCgpa;

    // ── ✅ UPDATED: Flat segment name — for admin dashboard queries
    profileData.segment = profileData.selectedSegment?.name || null;
    profileData.selectedCategory = profileData.segment || null;

    // ── ✅ UPDATED: interestedCourses — optional, max 5, strings only
    if (!Array.isArray(profileData.interestedCourses)) {
      profileData.interestedCourses = [];
    }
    profileData.interestedCourses = profileData.interestedCourses
      .map((c) => {
        const title = typeof c === 'string'
          ? c.trim()
          : String(c?.title || c?.value || c?.name || c?.program_name || '').trim();
        if (!title) return null;
        const degree = typeof c === 'object' && c ? String(c.degree || '').trim() : '';
        const level = typeof c === 'object' && c ? String(c.level || '').trim() : '';
        const majorArea = typeof c === 'object' && c ? String(c.majorArea || c.major_area || '').trim() : '';
        const group = typeof c === 'object' && c ? String(c.group || '').trim() : '';
        const renderKey = typeof c === 'object' && c
          ? String(c.renderKey || [title, degree, level, majorArea].filter(Boolean).join('::')).trim()
          : title;
        return { title, degree, level, majorArea, group, renderKey };
      })
      .filter(Boolean)
      .slice(0, 5);

    // ── Universities ───────────────────────────────────────────────────────
    if (!profileData.selectedUniversities) profileData.selectedUniversities = [];

    if (!Array.isArray(profileData.selectedUniversities)) {
      return res.status(400).json({
        success: false,
        message: 'selectedUniversities must be an array',
      });
    }
    if (profileData.selectedUniversities.length > MAX_SELECTED_UNIVERSITIES) {
      return res.status(400).json({
        success: false,
        message: `A maximum of ${MAX_SELECTED_UNIVERSITIES} universities can be selected`,
      });
    }
    if (profileData.profileCompleted && profileData.selectedUniversities.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least 1 university to complete your profile',
      });
    }

    const processedUniversities = [];
    let totalSelectedCourses = 0;
    for (const uni of profileData.selectedUniversities) {
      const processed = processUniversityData(uni, profileData.selectedCategory || '', programType);

      if (!processed)
        return res.status(400).json({ success: false, message: 'Invalid university data' });

      if (!processed.id) {
        return res.status(400).json({
          success: false,
          message: `University "${processed.name}" is missing an id`,
        });
      }
      if (!processed.name || processed.name === 'Unknown University') {
        return res.status(400).json({ success: false, message: 'University name is required' });
      }

      // ── ✅ UPDATED: type-check uses programType directly
      const uniType = (processed.universityType || '').toLowerCase();
if (uniType) {
  const expectedType = programType === 'UG' ? 'bachelor' : programType === 'PG' ? 'master' : 'medical';
  if (uniType !== expectedType) {
    console.warn(
      `⚠️ "${processed.name}" universityType mismatch — expected ${expectedType}, got ${uniType}`
    );
  }
} else {
  console.warn(`⚠️ University "${processed.name}" has no universityType — skipping type check`);
}

      totalSelectedCourses += processed.selectedCourses.length;

      if (processed.selectedCourses.length === 0) {
        if (profileData.profileCompleted) {
          return res.status(400).json({
            success: false,
            message: `Please select at least one course for ${processed.name}`,
          });
        }
        console.warn(`⚠️ No course selected for ${processed.name}`);
      }

      if (processed.selectedCourses.length > MAX_COURSES_PER_UNIVERSITY) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${MAX_COURSES_PER_UNIVERSITY} courses can be selected for ${processed.name}`,
        });
      }

      processedUniversities.push(processed);
    }

    if (totalSelectedCourses > MAX_TOTAL_SELECTED_COURSES) {
      return res.status(400).json({
        success: false,
        message: `A maximum of ${MAX_TOTAL_SELECTED_COURSES} total courses can be selected across all universities`,
      });
    }
    if (profileData.profileCompleted && totalSelectedCourses < 1) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least 1 course to complete your profile',
      });
    }

    profileData.selectedUniversities = processedUniversities;

    // ── ✅ UPDATED: completedAt — accept ISO string from frontend
    if (profileData.completedAt && typeof profileData.completedAt === 'string') {
      const parsed = new Date(profileData.completedAt);
      profileData.completedAt = isNaN(parsed.getTime()) ? new Date() : parsed;
    } else if (profileData.profileCompleted && !profileData.completedAt) {
      profileData.completedAt = new Date();
    }

    // ── Cleanup ────────────────────────────────────────────────────────────
    delete profileData.fullData;
    delete profileData.selectedCourses;

    // ── Upsert ────────────────────────────────────────────────────────────
    let profile = await UserProfile.findOne({ userId });
    console.log('Profile save existing profile found:', !!profile);

    if (profile) {
      profile = await UserProfile.findOneAndUpdate(
        { userId },
        { ...profileData, lastUpdated: Date.now() },
        { new: true, runValidators: false }
      );
      console.log('Profile save response status:', 200);
      console.log(
        `✅ Profile updated | userId: ${userId}`,
        `| programType: ${programType}`,
        `| eligibleProgram: ${profileData.eligibleProgram}`,
        `| stream: ${profileData.programStream}`,
        `| field: "${rawField || '—'}"`,
        `| segment: "${profileData.segment || '—'}"`,
        `| courses: ${profileData.interestedCourses.length}`,
        `| unis: ${processedUniversities.length}`,
      );
      return res.status(200).json({ success: true, message: 'Profile updated successfully', data: profile });
    } else {
      const newProfile = new UserProfile({ userId, ...profileData });
      await newProfile.save();
      console.log('Profile save response status:', 201);
      console.log(
        `✅ Profile created | userId: ${userId}`,
        `| programType: ${programType}`,
        `| eligibleProgram: ${profileData.eligibleProgram}`,
        `| stream: ${profileData.programStream}`,
        `| field: "${rawField || '—'}"`,
        `| segment: "${profileData.segment || '—'}"`,
        `| courses: ${profileData.interestedCourses.length}`,
        `| unis: ${processedUniversities.length}`,
      );
      return res.status(201).json({ success: true, message: 'Profile created successfully', data: newProfile });
    }
  } catch (error) {
    console.error('❌ Error in createOrUpdateProfile:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: 'Validation Error', errors });
    }
    if (error.message?.includes('Please select') || error.message?.includes('Select')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Profile already exists for this user' });
    }
    return res.status(500).json({ success: false, message: 'Failed to save profile', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET PROFILE
// GET /api/user/profile
// ─────────────────────────────────────────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId)
      return res.status(401).json({ success: false, message: 'User ID not found in token' });

    const profile = await UserProfile.findOne({ userId });

    if (!profile) {
      return res.status(200).json({
        success: false,
        exists:  false,
        message: 'Profile not found — please complete your profile',
        data:    null,
      });
    }

    const profileObj = fixCoursesOnProfile(profile.toObject());
    console.log(
      `✅ Profile fetched | userId: ${userId}`,
      `| programType: ${profileObj.programType}`,
      `| stream: ${profileObj.programStream}`,
      `| field: "${profileObj.education?.field || '—'}"`,
    );
    return res.status(200).json({ success: true, exists: true, data: profileObj });
  } catch (error) {
    console.error('❌ Error in getProfile:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET PROFILE BY EMAIL
// GET /api/user/profile/email/:email
// ─────────────────────────────────────────────────────────────────────────────
export const getProfileByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const profile = await UserProfile.findOne({ 'basicInfo.email': email });
    if (!profile)
      return res.status(404).json({ success: false, message: 'Profile not found' });
    return res.status(200).json({ success: true, data: fixCoursesOnProfile(profile.toObject()) });
  } catch (error) {
    console.error('❌ Error in getProfileByEmail:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PROFILE IMAGE
// PATCH /api/user/profile/image
// ─────────────────────────────────────────────────────────────────────────────
export const updateProfileImage = async (req, res) => {
  try {
    const userId = req.userId;
    const { profileImage } = req.body;
    if (!userId)       return res.status(401).json({ success: false, message: 'User ID not found in token' });
    if (!profileImage) return res.status(400).json({ success: false, message: 'profileImage is required' });

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      { profileImage, lastUpdated: Date.now() },
      { new: true }
    );
    if (!profile)
      return res.status(404).json({ success: false, message: 'Profile not found' });

    return res.status(200).json({ success: true, message: 'Profile image updated successfully', data: profile });
  } catch (error) {
    console.error('❌ Error in updateProfileImage:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile image', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CHECK PROFILE STATUS
// GET /api/user/profile/status
// ─────────────────────────────────────────────────────────────────────────────
export const checkProfileStatus = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId)
      return res.status(401).json({ success: false, message: 'User ID not found in token' });

    const profile = await UserProfile.findOne({ userId });

    return res.status(200).json({
      success:   true,
      exists:    !!profile,
      completed: profile ? profile.profileCompleted : false,
      data: profile
        ? {
            profileCompleted:          profile.profileCompleted,
            completedAt:               profile.completedAt,
            lastUpdated:               profile.lastUpdated,
            programType:               profile.programType,
            eligibleProgram:           profile.eligibleProgram,
            programStream:             profile.programStream,
            selectedUniversitiesCount: profile.selectedUniversities?.length || 0,
            selectedSegment:           profile.selectedSegment || null,
            segment:                   profile.segment || null,
            fieldOfStudy:              profile.education?.field || null,
            interestedCourses:         profile.interestedCourses || [],
          }
        : null,
    });
  } catch (error) {
    console.error('❌ Error in checkProfileStatus:', error);
    return res.status(500).json({ success: false, message: 'Failed to check profile status', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE PROFILE
// DELETE /api/user/profile
// ─────────────────────────────────────────────────────────────────────────────
export const deleteProfile = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId)
      return res.status(401).json({ success: false, message: 'User ID not found in token' });

    const profile = await UserProfile.findOneAndDelete({ userId });
    if (!profile)
      return res.status(404).json({ success: false, message: 'Profile not found' });

    return res.status(200).json({ success: true, message: 'Profile deleted successfully' });
  } catch (error) {
    console.error('❌ Error in deleteProfile:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete profile', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL PROFILES  (admin)
// GET /api/user/admin/profiles
// ─────────────────────────────────────────────────────────────────────────────
export const getAllProfiles = async (req, res) => {
  try {
    const page  = Math.max(1,   parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const query = {};
    if (req.query.segment)     query['selectedSegment.id']   = req.query.segment;
    if (req.query.field)       query['education.field']       = req.query.field;

    if (req.query.program) {
      // ✅ UPDATED: only Bachelor and Master are valid from this flow
      if (!['Bachelor', 'Master', 'PhD'].includes(req.query.program))
        return res.status(400).json({ success: false, message: 'Invalid program. Use Bachelor, Master or PhD.' });
      query.eligibleProgram = req.query.program;
    }
    if (req.query.stream) {
      if (!['UG', 'PG'].includes(req.query.stream))
        return res.status(400).json({ success: false, message: 'Invalid stream. Use UG or PG.' });
      query.programStream = req.query.stream;
    }
    if (req.query.programType) {
      if (!['UG', 'PG'].includes(req.query.programType))
        return res.status(400).json({ success: false, message: 'Invalid programType. Use UG or PG.' });
      query.programType = req.query.programType;
    }

    const [profiles, total] = await Promise.all([
      UserProfile.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      UserProfile.countDocuments(query),
    ]);

    return res.status(200).json({
      success:    true,
      data:       profiles.map(fixCoursesOnProfile),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('❌ Error in getAllProfiles:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch profiles', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET PROFILES BY PROGRAM  (admin)
// GET /api/user/admin/profiles/program/:program
// ─────────────────────────────────────────────────────────────────────────────
export const getProfilesByProgram = async (req, res) => {
  try {
    const { program } = req.params;
    if (!['Bachelor', 'Master', 'PhD'].includes(program))
      return res.status(400).json({ success: false, message: 'Invalid program' });

    const profiles = await UserProfile.find({ eligibleProgram: program }).lean();
    return res.status(200).json({
      success: true,
      count:   profiles.length,
      data:    profiles.map(fixCoursesOnProfile),
    });
  } catch (error) {
    console.error('❌ Error in getProfilesByProgram:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch profiles', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET PROFILES BY SEGMENT  (admin)
// GET /api/user/admin/profiles/segment/:segmentId
// ─────────────────────────────────────────────────────────────────────────────
export const getProfilesBySegment = async (req, res) => {
  try {
    const { segmentId } = req.params;
    if (!segmentId)
      return res.status(400).json({ success: false, message: 'segmentId is required' });

    const profiles = await UserProfile.find({ 'selectedSegment.id': segmentId }).lean();
    return res.status(200).json({
      success: true,
      count:   profiles.length,
      data:    profiles.map(fixCoursesOnProfile),
    });
  } catch (error) {
    console.error('❌ Error in getProfilesBySegment:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch profiles by segment', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET PROFILE STATS  (admin)
// GET /api/user/admin/stats
// ─────────────────────────────────────────────────────────────────────────────
export const getProfileStats = async (req, res) => {
  try {
    const [
      totalProfiles,
      programTypeStats,
      programStats,
      streamStats,
      segmentStats,
      fieldStats,             // ✅ NEW: field-of-study breakdown
      interestedCourseStats,
      universitySelectionStats,
      courseSelectionStats,
      recentProfiles,
    ] = await Promise.all([
      UserProfile.countDocuments(),

      UserProfile.aggregate([
        { $group: { _id: '$programType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      UserProfile.aggregate([
        { $group: { _id: '$eligibleProgram', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      UserProfile.aggregate([
        { $group: { _id: '$programStream', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      UserProfile.aggregate([
        { $match: { selectedSegment: { $ne: null } } },
        { $group: { _id: '$selectedSegment.id', name: { $first: '$selectedSegment.name' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // ✅ UPDATED: field of study stats — grouped by programType for clarity
      UserProfile.aggregate([
        { $match: { 'education.field': { $exists: true, $ne: '' } } },
        { $group: {
          _id:         { field: '$education.field', programType: '$programType' },
          count:       { $sum: 1 },
        }},
        { $project: { field: '$_id.field', programType: '$_id.programType', count: 1, _id: 0 } },
        { $sort: { count: -1 } },
        { $limit: 30 },
      ]),

      UserProfile.aggregate([
        { $unwind: '$interestedCourses' },
        { $group: { _id: { $ifNull: ['$interestedCourses.title', '$interestedCourses'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),

      UserProfile.aggregate([
        { $unwind: '$selectedUniversities' },
        { $group: {
          _id:  '$selectedUniversities.name',
          type: { $first: '$selectedUniversities.universityType' },
          count: { $sum: 1 },
        }},
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      UserProfile.aggregate([
        { $unwind: '$selectedUniversities' },
        { $unwind: '$selectedUniversities.selectedCourses' },
        { $group: {
          _id:        '$selectedUniversities.selectedCourses.title',
          university: { $first: '$selectedUniversities.name' },
          count:      { $sum: 1 },
        }},
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      UserProfile.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('basicInfo.fullName basicInfo.email programType eligibleProgram programStream selectedSegment education.field segment interestedCourses selectedUniversities createdAt')
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total: totalProfiles,
        programTypeStats,
        programStats,
        streamStats,
        segmentStats,
        fieldStats,
        interestedCourseStats,
        universitySelectionStats,
        courseSelectionStats,
        recentProfiles,
      },
    });
  } catch (error) {
    console.error('❌ Error in getProfileStats:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile statistics', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// BULK UPDATE PROFILES  (admin)
// PUT /api/user/admin/profiles/bulk
// ─────────────────────────────────────────────────────────────────────────────
export const bulkUpdateProfiles = async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates))
      return res.status(400).json({ success: false, message: 'Updates must be an array' });

    const results = await Promise.all(
      updates.map(async ({ userId, ...updateData }) => {
        const profile = await UserProfile.findOneAndUpdate(
          { userId },
          { ...updateData, lastUpdated: Date.now() },
          { new: true }
        );
        return { userId, success: !!profile, data: profile };
      })
    );

    return res.status(200).json({ success: true, message: 'Bulk update completed', data: results });
  } catch (error) {
    console.error('❌ Error in bulkUpdateProfiles:', error);
    return res.status(500).json({ success: false, message: 'Failed to bulk update profiles', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET PROFILE WITH COURSES
// GET /api/user/profile/courses
// ─────────────────────────────────────────────────────────────────────────────
export const getProfileWithCourses = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId)
      return res.status(401).json({ success: false, message: 'User ID not found in token' });

    const profile = await UserProfile.findOne({ userId });
    if (!profile)
      return res.status(404).json({ success: false, message: 'Profile not found' });

    const profileObj = fixCoursesOnProfile(profile.toObject());
    const coursesByUniversity = {};
    for (const uni of profileObj.selectedUniversities || []) {
      if (uni.selectedCourses?.length > 0) coursesByUniversity[uni.name] = uni.selectedCourses;
    }

    return res.status(200).json({ success: true, data: { ...profileObj, coursesByUniversity } });
  } catch (error) {
    console.error('❌ Error in getProfileWithCourses:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile with courses', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET PROFILE FOR ANALYTICS  (admin)
// GET /api/user/analytics/profile/:userId
// ─────────────────────────────────────────────────────────────────────────────
export const getProfileForAnalytics = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId)
      return res.status(400).json({ success: false, message: 'userId param is required' });

    const profile = await UserProfile.findOne({ userId }).lean();
    if (!profile)
      return res.status(404).json({ success: false, message: 'Profile not found' });

    return res.status(200).json({ success: true, data: fixCoursesOnProfile(profile) });
  } catch (error) {
    console.error('❌ Error in getProfileForAnalytics:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SUBMIT UNIVERSITY REQUEST
// POST /api/admin/university-request  (also mapped to legacy POST /api/user/university/request)
// ─────────────────────────────────────────────────────────────────────────────
export const submitUniversityRequest = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      universityName,
      country,
      interestedCourses,
      requestedCourses,
      programType,
      degree,
      selectedCategory,
      field,
    } = req.body;
    const courses = Array.isArray(requestedCourses) ? requestedCourses : interestedCourses;
    const resolvedDegree = normalizeDegree(degree || programType);

    if (!userId)
      return res.status(401).json({ success: false, message: 'User ID not found in token' });
    if (!universityName?.trim())
      return res.status(400).json({ success: false, message: 'University name is required' });
    if (!country?.trim())
      return res.status(400).json({ success: false, message: 'Country is required' });
    if (!programType)
      return res.status(400).json({ success: false, message: 'programType is required' });
    if (!resolvedDegree)
      return res.status(400).json({ success: false, message: 'degree must be bachelor, master, or medical' });
    if (programType === 'UG' && resolvedDegree !== 'bachelor')
      return res.status(400).json({ success: false, message: 'UG requests must use bachelor degree' });
    if (programType === 'PG' && resolvedDegree !== 'master')
      return res.status(400).json({ success: false, message: 'PG requests must use master degree' });
    if (programType === 'MEDICAL' && resolvedDegree !== 'professional-degree')
      return res.status(400).json({ success: false, message: 'MEDICAL requests must use medical degree' });
    if (!Array.isArray(courses) || courses.length === 0)
      return res.status(400).json({ success: false, message: 'Please provide at least one course of interest' });
    if (courses.length > 5)
      return res.status(400).json({ success: false, message: 'Maximum 5 courses allowed' });
    const sanitizedCourses = courses
      .map((course) => (
        typeof course === 'string'
          ? course.trim()
          : String(course?.title || course?.name || course?.program_name || course?.value || '').trim()
      ))
      .filter(Boolean)
      .slice(0, 5);
    if (!sanitizedCourses.length)
      return res.status(400).json({ success: false, message: 'Please provide at least one course of interest' });

    // ✅ UPDATED: validate programType if provided
    if (programType && !['UG', 'PG', 'MEDICAL'].includes(programType)) {
      return res.status(400).json({ success: false, message: 'Invalid programType. Must be UG, PG, or MEDICAL.' });
    }

    await createUniversityRequestNotification({
      userId,
      universityName: universityName.trim(),
      country:        country.trim(),
      courses:        sanitizedCourses,
      programType,
      degree:         resolvedDegree,
      selectedCategory: selectedCategory || field || null,
      field:          field || selectedCategory || null,
    });

    return res.status(201).json({
      success: true,
      message: 'University request submitted successfully. Our team will review it shortly.',
    });
  } catch (error) {
    console.error('❌ Error in submitUniversityRequest:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit university request', error: error.message });
  }
};

export default {
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
  fixCoursesOnProfile,
};
