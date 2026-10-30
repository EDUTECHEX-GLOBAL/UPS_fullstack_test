import mongoose from 'mongoose';

/* ─────────────────────────────────────────────
   COUNTER — sequential applicationId generator
   (EQHE-000001, EQHE-000002, …)
───────────────────────────────────────────── */
const counterSchema = new mongoose.Schema({
  _id:     { type: String, required: true },
  seq:     { type: Number, default: 0 },
});
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

/* ─────────────────────────────────────────────
   SUB-SCHEMAS
───────────────────────────────────────────── */
const courseSchema = new mongoose.Schema({
  programId:       { type: String, required: true },
  programName:     { type: String, required: true },
  universityId:    { type: String, required: true },
  universityName:  { type: String, required: true },
  universityLogo:  { type: String, default: '' },
  campus:          { type: String, default: '' },
  country:         { type: String, default: '' },
  ranking:         { type: String, default: '' },
  programDetails: {
    level:      { type: String, default: 'Undergraduate' },
    duration:   { type: String, default: '3-4 years' },
    studyMode:  { type: String, default: 'Full Time' },
  },
  intakeMonth:     { type: String, default: 'September' },
  intakeYear:      { type: Number, default: new Date().getFullYear() },
  deadline:        { type: String, default: '' },
  tuitionFee:      { type: Number, default: 0 },
  applicationFee:  { type: Number, default: 0 },
  selectedAt:      { type: Date,   default: Date.now },
});

const progressStepSchema = new mongoose.Schema({
  stepId:      { type: String,  required: true },
  title:       { type: String,  required: true },
  completed:   { type: Boolean, default: false },
  completedAt: { type: Date,    default: null },
  route:       { type: String,  default: '' },
});

const applicationSelectedCourseSchema = new mongoose.Schema({
  programId:       { type: String, default: '' },
  title:           { type: String, default: '' },
  degree:          { type: String, default: '' },
  level:           { type: String, default: '' },
  majorArea:       { type: String, default: '' },
  campus:          { type: String, default: '' },
  country:         { type: String, default: '' },
  intakeMonth:     { type: String, default: '' },
  intakeYear:      { type: Number, default: undefined },
  applicationFee:  { type: Number, default: 0 },
  tuitionFee:      { type: Number, default: 0 },
  studyMode:       { type: String, default: '' },
}, { _id: false });

const applicationUniversitySchema = new mongoose.Schema({
  universityId:   { type: String, default: '' },
  universityName: { type: String, default: '' },
  country:        { type: String, default: '' },
  location:       { type: String, default: '' },
  selectedCourses: { type: [applicationSelectedCourseSchema], default: [] },
}, { _id: false });

/* ─────────────────────────────────────────────
   MAIN SCHEMA
───────────────────────────────────────────── */
const overviewSchema = new mongoose.Schema({

  // ✅ NOT unique — one user can have multiple applications
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },

  // ✅ Sequential ID — EQHE-000001 format, unique per application
  applicationId: {
    type:    String,
    unique:  true,
    sparse:  true,   // allows null during pre-save generation
  },

  // Selected Course — stores universityName directly from course selection
  selectedCourse: {
    type:    courseSchema,
    default: null,
  },

  // Progress tracking
  progress: {
    percentage:  { type: Number, default: 0, min: 0, max: 100 },
    lastUpdated: { type: Date,   default: Date.now },
    currentStep: { type: String, default: 'personal' },
    universitySelect: { type: Number, default: 0, min: 0, max: 100 },
  },

  // Steps
  steps: [progressStepSchema],

  // Field completion tracking
  completedFields: {
    personalInfo: {
      firstName: { type: Boolean, default: false },
      lastName:  { type: Boolean, default: false },
      dob:       { type: Boolean, default: false },
      email:     { type: Boolean, default: false },
    },
    addressInfo: {
      currentAddress: { type: Boolean, default: false },
      city:           { type: Boolean, default: false },
      country:        { type: Boolean, default: false },
    },
    educationInfo: {
      qualificationLevel: { type: Boolean, default: false },
      institutionName:    { type: Boolean, default: false },
    },
    languageInfo: {
      englishTestType: { type: Boolean, default: false },
      testScore:       { type: Boolean, default: false },
    },
  },

  applyToAll: { type: Boolean, default: false },
  applicationUniversities: { type: [applicationUniversitySchema], default: [] },
  universitySelectCompleted: { type: Boolean, default: false },

  // Application status
  applicationStatus: {
    type:    String,
    enum:    ['not_started', 'in_progress', 'completed', 'submitted'],
    default: 'not_started',
  },

  submittedAt: { type: Date, default: null },
  processAdminStatus: {
    type: String,
    enum: ['pending', 'verified', 'sent_to_admin', 'approved', 'rejected', 'changes_requested'],
    default: 'pending',
    index: true,
  },
  processAdminVerified:   { type: Boolean, default: false },
  processAdminVerifiedAt: { type: Date, default: null },
  processAdminVerifiedBy: { type: String, default: '' },
  verificationApplicationId: { type: String, default: '', index: true },
  verificationStatus: {
    type: String,
    enum: ['pending_admin_review', 'approved', 'rejected', 'changes_requested'],
    default: undefined,
  },
  approvedAt:          { type: Date, default: null },
  approvedBy:          { type: String, default: '' },
  rejectedAt:          { type: Date, default: null },
  rejectionReason:     { type: String, default: '' },
  changeRequestedAt:   { type: Date, default: null },
  changeRequestReason: { type: String, default: '' },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

/* ─────────────────────────────────────────────
   PRE-SAVE — generate sequential applicationId
───────────────────────────────────────────── */
overviewSchema.pre('save', async function (next) {
  try {
    // Generate applicationId only once (on first save)
    if (!this.applicationId) {
      const counter = await Counter.findByIdAndUpdate(
        { _id: 'overviewApplicationId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.applicationId = `EQHE-${String(counter.seq).padStart(6, '0')}`;
    }

    // Calculate progress percentage from completed fields
    let completedCount = 0;
    let totalCount     = 0;

    const sections = [
      this.completedFields.personalInfo,
      this.completedFields.addressInfo,
      this.completedFields.educationInfo,
      this.completedFields.languageInfo,
    ];

    sections.forEach((section) => {
      Object.values(section).forEach((field) => {
        totalCount++;
        if (field) completedCount++;
      });
    });

    this.progress.percentage =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Derive applicationStatus from progress
    const pct = this.progress.percentage;
    if (pct === 0)          this.applicationStatus = 'not_started';
    else if (pct < 100)     this.applicationStatus = 'in_progress';
    else                    this.applicationStatus = 'completed';

    // Timestamps
    this.updatedAt              = Date.now();
    this.progress.lastUpdated   = Date.now();

    next();
  } catch (err) {
    next(err);
  }
});

/* ─────────────────────────────────────────────
   PRE-SAVE — initialise steps if empty
───────────────────────────────────────────── */
overviewSchema.pre('save', function (next) {
  if (this.steps.length === 0) {
    this.steps = [
      { stepId: 'personal',  title: 'Personal Information',  route: '/firstyear/dashboard/application/personal' },
      { stepId: 'address',   title: 'Address & ID',          route: '/firstyear/dashboard/application/address' },
      { stepId: 'universitySelect', title: 'University Select', route: '/firstyear/dashboard/application/university-select' },
      { stepId: 'education', title: 'Education',             route: '/firstyear/dashboard/application/firsteducation' },
      { stepId: 'language',  title: 'Language Proficiency',  route: '/firstyear/dashboard/application/language' },
      { stepId: 'courses',   title: 'Course Selection',      route: '/firstyear/dashboard/application/firstcourses' },
    ];
  }
  next();
});

overviewSchema.index({ processAdminVerified: 1, processAdminVerifiedAt: -1 });

const Overview = mongoose.model('Overview', overviewSchema);
export default Overview;