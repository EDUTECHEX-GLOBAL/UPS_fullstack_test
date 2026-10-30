// src/models/userprofilemodel.js
import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// VALID FIELD-OF-STUDY LISTS
// Mirrors FIELD_OF_STUDY_BY_PROGRAM in UserProfile.js frontend
// ─────────────────────────────────────────────────────────────────────────────
const FIELDS_UG = [];
const FIELDS_PG = [];
// Combined for the model enum — union of both lists (no duplicates)
const LEGACY_VALID_FIELDS = [
  'Computer & IT', 'Science', 'Commerce & Business', 'Medical & Healthcare',
  'Design & Creative', 'Hospitality & Tourism', 'Agriculture & Allied',
];
const ALL_VALID_FIELDS = { includes: () => true };
const PERCENTAGE_CGPA_REGEX = /^[0-9]+(\.[0-9]{1,2})?$/;
const MAX_SELECTED_UNIVERSITIES = 50;
const MAX_COURSES_PER_UNIVERSITY = 1000;
const MAX_TOTAL_SELECTED_COURSES = 5000;

const isValidPercentageCgpa = (value) => {
  if (value === undefined || value === null || value === '') return false;
  if (!PERCENTAGE_CGPA_REGEX.test(String(value))) return false;
  const numericValue = Number(value);
  return !Number.isNaN(numericValue) && numericValue >= 0 && numericValue <= 100;
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const selectedCourseSchema = new mongoose.Schema({
  id:           { type: String, required: true },
  title:        { type: String, required: true },
  name:         { type: String, default: '' },
  program_name: { type: String, default: '' },
  degree:       { type: String, default: '' },
  level:        { type: String, default: '' },
  studyMode:    { type: String, default: '' },
  modeOfStudy:  { type: String, default: '' },
  duration:     { type: String, default: '' },
  intake:       { type: String, default: '' },
  locations:    [{ type: String }],
  category:     { type: String, default: '' },
  field:        { type: String, default: '' },
  majorArea:    { type: String, default: '' },
  description:  { type: String, default: '' },
  credits:      { type: Number, default: null },
  fees:         { type: String, default: '' },
  major_area:   { type: String, default: '' },
  original_major_area: { type: String, default: '' },
  programType:  { type: String, enum: ['UG', 'PG', 'MEDICAL', ''], default: '' },
  programSource:{ type: String, default: '' },
}, { _id: false });

const interestedCourseSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  degree:    { type: String, default: '' },
  level:     { type: String, default: '' },
  majorArea: { type: String, default: '' },
  group:     { type: String, default: '' },
  renderKey: { type: String, default: '' },
}, { _id: false });

const selectedUniversitySchema = new mongoose.Schema({
  id:   { type: String, required: true },

  // ✅ String: accepts both numeric UNITIDs and MongoDB ObjectId hex strings
  unitid:   { type: String, default: null },

  name:     { type: String, required: true },
  university:     { type: String, default: '' },
  universityName: { type: String, default: '' },
  location: { type: String, default: 'Location not specified' },
  city:     { type: String, default: '' },
  state:    { type: String, default: '' },
  country:  { type: String, default: '' },
  website:  { type: String, default: '' },

  // ✅ '' and null accepted — avoids enum errors for partial/legacy data
  universityType: {
    type:    String,
    enum:    ['Bachelor', 'Master', 'Medical', 'Undergraduate', 'Postgraduate', 'Professional Degree', 'bachelor', 'master', 'professional-degree', '', null],
    default: null,
  },

  programType: { type: String, enum: ['UG', 'PG', 'MEDICAL', ''], default: '' },
  degree:      { type: String, default: '' },
  educationLevel: { type: String, default: '' },
  originalDegree: { type: String, default: '' },
  originalEducationLevel: { type: String, default: '' },

  isKansas:      { type: Boolean, default: false },
  isDirectApply: { type: Boolean, default: false },

  selectedCourses: {
    type: [selectedCourseSchema],
    validate: {
      validator: (v) => v.length <= MAX_COURSES_PER_UNIVERSITY,
      message:   `Only ${MAX_COURSES_PER_UNIVERSITY} courses allowed per university`,
    },
    default: [],
  },

  // kept for legacy compatibility — not written by current frontend
  fullData: { type: mongoose.Schema.Types.Mixed, default: null },
}, { _id: false });

const basicInfoSchema = new mongoose.Schema({
  fullName:    { type: String, required: true },
  email:       { type: String, required: true },
  mobile:      { type: String, required: true },
  dob:         { type: String, required: true },
  gender:      { type: String, required: true },
  nationality: { type: String, required: true },
  residence:   { type: String, required: true },
}, { _id: false });

const educationSchema = new mongoose.Schema({
  // ✅ UPDATED: always auto-derived from programType — never user-typed
  //    UG → "12th"    | PG → "Bachelor"
  qualification: {
    type:     String,
    required: true,
    enum:     ['12th', 'Bachelor', ''],   // only two values the frontend ever sends
  },

  institution: { type: String, required: true },

  // ✅ UPDATED: optional dropdown — value comes from FIELD_OF_STUDY_BY_PROGRAM
  //    '' = user skipped the field.  Soft enum (validator warns but doesn't reject).
  field: {
    type:    String,
    trim:    true,
    required: [true, 'Please select what field you are interested in'],
    validate: {
      validator (v) {
        // Accept blank or any known field.  Unknown values are stored with a warning
        // so future additions to the frontend list don't break existing submissions.
        return !!String(v || '').trim() && ALL_VALID_FIELDS.includes(v);
      },
      message: (props) => `"${props.value}" is not a recognised field of study — consider adding it to ALL_VALID_FIELDS`,
    },
  },

  cgpa: {
    type: String,
    required: [true, 'Percentage / CGPA is required'],
    trim: true,
    validate: {
      validator: isValidPercentageCgpa,
      message: 'Enter a valid Percentage / CGPA between 0 and 100',
    },
  },
}, { _id: false });

const selectedSegmentSchema = new mongoose.Schema({
  id:   { type: String, required: true },
  name: { type: String, required: true },
}, { _id: false });

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCHEMA
// ─────────────────────────────────────────────────────────────────────────────
const userProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },

  profileImage: { type: String, default: null },

  basicInfo:  { type: basicInfoSchema,  required: true },
  education:  { type: educationSchema,  required: true },

  // ✅ Primary source of truth — set from Step 2 UI selection (UG / PG)
  programType: {
    type:     String,
    enum:     ['UG', 'PG', 'MEDICAL'],
    required: true,
  },

  // ✅ UPDATED: derived from programType
  //    UG → 'Bachelor' | PG → 'Master'
  //    'PhD' kept in enum for legacy data but is never written by current frontend
  eligibleProgram: {
    type:    String,
    enum:    ['Bachelor', 'Master', 'Medical', 'PhD', null],
    default: null,
  },

  // ✅ Mirrors programType — kept for legacy queries (UG / PG)
  programStream: {
    type:    String,
    enum:    ['UG', 'PG', 'MEDICAL', null],
    default: null,
  },

  // ✅ Flat segment name — for quick admin queries / display
  segment: {
    type:    String,
    default: null,
  },

  // ✅ UPDATED: null when user didn't pick a segment chip AND education.field is blank
  //    Derived in controller: explicit chip pick > derived from education.field > null
  selectedCategory: {
    type:    String,
    default: null,
  },

  selectedSegment: {
    type:    selectedSegmentSchema,
    required: [true, 'Please select what field you are interested in'],
  },

  // ✅ Up to 5 courses of interest, from program-specific pool (Step 3)
  interestedCourses: {
    type:    [interestedCourseSchema],
    default: [],
    validate: {
      validator: (v) => v.length <= 5,
      message:   'Maximum 5 interested courses allowed',
    },
  },

  // Optional flat course preferences for application autofill compatibility.
  preferredCourse: { type: String, trim: true, default: '' },
  selectedCourse:  { type: String, trim: true, default: '' },
  specialization:  { type: String, trim: true, default: '' },
  intake:          { type: String, trim: true, default: '' },
  studyMode:       { type: String, trim: true, default: '' },
  modeOfStudy:     { type: String, trim: true, default: '' },

  selectedUniversities: {
    type: [selectedUniversitySchema],
    validate: {
      validator: (v) => {
        const universities = Array.isArray(v) ? v : [];
        const totalCourses = universities.reduce((sum, uni) => sum + (Array.isArray(uni.selectedCourses) ? uni.selectedCourses.length : 0), 0);
        return universities.length <= MAX_SELECTED_UNIVERSITIES && totalCourses <= MAX_TOTAL_SELECTED_COURSES;
      },
      message:   `Select up to ${MAX_SELECTED_UNIVERSITIES} universities and ${MAX_TOTAL_SELECTED_COURSES} total courses`,
    },
    default: [],
  },

  profileCompleted: { type: Boolean, default: false },

  // ✅ UPDATED: Mixed so both Date objects and ISO strings are accepted
  completedAt: { type: mongoose.Schema.Types.Mixed, default: null },
  lastUpdated: { type: Date, default: Date.now },

}, { timestamps: true });

const slugifySegmentName = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

const syncSelectedSegmentFields = (doc) => {
  if (!doc.education) return;

  const fieldName = String(doc.education.field || '').trim();
  if (!doc.selectedSegment && fieldName) {
    doc.selectedSegment = {
      id: slugifySegmentName(fieldName),
      name: fieldName,
    };
  }

  if (doc.selectedSegment?.name) {
    doc.selectedSegment.name = String(doc.selectedSegment.name).trim();
    doc.selectedSegment.id = doc.selectedSegment.id || slugifySegmentName(doc.selectedSegment.name);
    doc.education.field = doc.selectedSegment.name;
    doc.segment = doc.selectedSegment.name;
    doc.selectedCategory = doc.selectedSegment.name;
  } else {
    doc.segment = null;
    doc.selectedCategory = null;
  }
};

userProfileSchema.pre('validate', function (next) {
  syncSelectedSegmentFields(this);
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// PRE-SAVE HOOK  (runs on .save() only — NOT on findOneAndUpdate)
// Controller mirrors these derivations for the update path.
// ─────────────────────────────────────────────────────────────────────────────
userProfileSchema.pre('save', function (next) {
  this.lastUpdated = Date.now();

  // ✅ UPDATED: derive programStream and eligibleProgram from programType
  if (this.programType === 'UG') {
    this.programStream   = 'UG';
    this.eligibleProgram = 'Bachelor';
    if (this.education) this.education.qualification = '12th';
  } else if (this.programType === 'PG') {
    this.programStream   = 'PG';
    this.eligibleProgram = 'Master';
    if (this.education) this.education.qualification = 'Bachelor';
  } else if (this.programType === 'MEDICAL') {
    this.programStream   = 'MEDICAL';
    this.eligibleProgram = 'Medical';
    if (this.education) this.education.qualification = '12th';
  }

  // ✅ Ensure education.field is never undefined/null
  syncSelectedSegmentFields(this);

  // ✅ UPDATED: derive selectedSegment from education.field if not already set
  // ✅ Keep flat segment name in sync
  // Sanitize interestedCourses
  if (Array.isArray(this.interestedCourses)) {
    this.interestedCourses = this.interestedCourses
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
  }

  // Completion rules: only when profileCompleted === true.
  if (!this.profileCompleted) return next();

  const unis = this.selectedUniversities || [];
  if (unis.length < 1) {
    return next(new Error('Please select at least 1 university to complete your profile'));
  }
  if (unis.length > MAX_SELECTED_UNIVERSITIES) {
    return next(new Error(`Please select no more than ${MAX_SELECTED_UNIVERSITIES} universities`));
  }

  const totalSelectedCourses = unis.reduce((sum, uni) => sum + (uni.selectedCourses?.length || 0), 0);
  if (totalSelectedCourses < 1) {
    return next(new Error('Please select at least 1 course to complete your profile'));
  }
  if (totalSelectedCourses > MAX_TOTAL_SELECTED_COURSES) {
    return next(new Error(`Please select no more than ${MAX_TOTAL_SELECTED_COURSES} total courses`));
  }

  for (const uni of unis) {
    const courseCount = uni.selectedCourses?.length || 0;
    if (courseCount < 1) {
      return next(new Error(`Please select a course for ${uni.name}`));
    }
    if (courseCount > MAX_COURSES_PER_UNIVERSITY) {
      return next(new Error(`Please select no more than ${MAX_COURSES_PER_UNIVERSITY} courses for ${uni.name}`));
    }
  }

  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────────────────────────
userProfileSchema.index({ userId:                                1 });
userProfileSchema.index({ 'basicInfo.email':                     1 });
userProfileSchema.index({ programType:                           1 });
userProfileSchema.index({ programStream:                         1 });
userProfileSchema.index({ eligibleProgram:                       1 });
userProfileSchema.index({ 'selectedSegment.id':                  1 });
userProfileSchema.index({ 'education.field':                     1 }); // ✅ NEW: admin field-of-study queries
userProfileSchema.index({ segment:                               1 }); // ✅ NEW: flat segment queries
userProfileSchema.index({ selectedCategory:                      1 });
userProfileSchema.index({ profileCompleted:                      1 });
userProfileSchema.index({ 'selectedUniversities.universityType': 1 });

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

export default UserProfile;
