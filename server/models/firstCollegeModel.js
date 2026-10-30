import mongoose from "mongoose";

// ✅ NEW: selectedCourse sub-schema
const selectedCourseSchema = new mongoose.Schema({
  id:           { type: String },
  title:        { type: String },
  name:         { type: String, default: '' },
  program_name: { type: String, default: '' },
  level:        { type: String, default: '' },
  studyMode:    { type: String, default: '' },
  duration:     { type: String, default: '' },
  locations:    [{ type: String }],
  majorArea:    { type: String, default: '' },
  description:  { type: String, default: '' },
}, { _id: false });

const firstCollegeSchema = new mongoose.Schema(
  {
    // =============================
    // 👤 User Reference
    // =============================
    userId: {
      type: String,        // ✅ FIXED: was ObjectId, causes mismatch with JWT string
      required: true
    },

    // =============================
    // 🏫 College Identification
    // =============================
    collegeId: {
      type: String,
      required: true
    },

    // =============================
    // 📋 College Data
    // =============================
    collegeData: {
      UNITID:   { type: String, default: '' },
      INSTNM:   { type: String, default: '' }, // ✅ FIXED: was required:true, breaks master/bachelors unis
      IALIAS:   { type: String, default: '' },
      CITY:     { type: String, default: '' },
      STABBR:   { type: String, default: '' },
      COUNTRY:  { type: String, default: '' },
      ZIP:      { type: String, default: '' },
      ADDR:     { type: String, default: '' },
      GENTELE:  { type: String, default: '' },
      WEBADDR:  { type: String, default: '' },
      ADMINURL: { type: String, default: '' },
      FAIDURL:  { type: String, default: '' },
      APPLURL:  { type: String, default: '' },
      CHFNM:    { type: String, default: '' },
      CHFTITLE: { type: String, default: '' },
      LONGITUD: { type: Number, default: null },
      LATITUDE: { type: Number, default: null }
    },

    // ✅ NEW: stores course selected by student
    selectedCourses: {
      type: [selectedCourseSchema],
      default: []
    },

    // =============================
    // 📅 Application Timeline
    // =============================
    applicationPeriod: {
      type: String,
      enum: ["fall", "spring", "summer"],
      default: "fall"
    },

    applicationYear: {
      type: String,
      default: "2026"
    },

    // =============================
    // 🗓️ Deadlines
    // =============================
    deadlines: {
      fall:   { type: String, default: "" },
      spring: { type: String, default: "" },
      summer: { type: String, default: "" }
    },

    // =============================
    // 📊 Application Status
    // =============================
    status: {
      type: String,
      enum: [
        "researching",
        "preparing",
        "applied",
        "accepted",
        "rejected",
        "waitlisted",
        "committed"
      ],
      default: "researching"
    },

    applicationStatus: {
      commonAppSubmitted:        { type: Boolean, default: false },
      supplementsSubmitted:      { type: Boolean, default: false },
      recommendationsSubmitted:  { type: Boolean, default: false },
      testScoresSent:            { type: Boolean, default: false },
      transcriptsSent:           { type: Boolean, default: false }
    },

    // =============================
    // 💰 Financial Information
    // =============================
    financialAid: {
      fafsaSubmitted:       { type: Boolean, default: false },
      cssProfileSubmitted:  { type: Boolean, default: false },
      scholarshipsApplied:  { type: Boolean, default: false },
      aidAwarded:           { type: Boolean, default: false }
    },

    // =============================
    // 🏷️ Tags & Organization
    // =============================
    tags: [{
      type: String,
      enum: ["reach", "target", "safety", "dream", "financial-safety"]
    }],

    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    },

    // =============================
    // 📋 Notes & Customization
    // =============================
    notes: { type: String, default: "" },

    customDeadlines: {
      earlyDecision:  { type: String, default: "" },
      earlyAction:    { type: String, default: "" },
      regularDecision:{ type: String, default: "" },
      financialAid:   { type: String, default: "" },
      housing:        { type: String, default: "" }
    },

    // =============================
    // 🔗 Important Links
    // =============================
    importantLinks: {
      collegeWebsite:     { type: String, default: "" },
      admissionsPortal:   { type: String, default: "" },
      financialAidPortal: { type: String, default: "" },
      virtualTour:        { type: String, default: "" },
      collegeNavigator:   { type: String, default: "" }
    },

    // =============================
    // 👥 Contacts
    // =============================
    contacts: {
      admissionsEmail:   { type: String, default: "" },
      admissionsPhone:   { type: String, default: "" },
      financialAidEmail: { type: String, default: "" },
      financialAidPhone: { type: String, default: "" }
    }
  },
  { timestamps: true }
);

// =============================
// 🎯 Indexes
// =============================
firstCollegeSchema.index({ userId: 1, collegeId: 1 }, { unique: true });
firstCollegeSchema.index({ userId: 1, status: 1 });
firstCollegeSchema.index({ userId: 1, priority: 1 });
firstCollegeSchema.index({ "collegeData.INSTNM": "text" });

// =============================
// 📊 Virtuals & Methods
// =============================
firstCollegeSchema.virtual('displayName').get(function () {
  return this.collegeData?.INSTNM || 'Unknown College';
});

firstCollegeSchema.virtual('location').get(function () {
  const data = this.collegeData;
  if (!data) return '';
  return `${data.CITY || ''}, ${data.STABBR || ''}${data.ZIP ? ` ${data.ZIP}` : ''}`.trim();
});

firstCollegeSchema.methods.isApplicationComplete = function () {
  return this.applicationStatus.commonAppSubmitted &&
    this.applicationStatus.supplementsSubmitted &&
    this.applicationStatus.recommendationsSubmitted;
};

firstCollegeSchema.methods.getNextDeadline = function () {
  const deadlines = [];
  if (this.deadlines.fall)   deadlines.push({ type: 'Fall',   date: this.deadlines.fall });
  if (this.deadlines.spring) deadlines.push({ type: 'Spring', date: this.deadlines.spring });
  if (this.deadlines.summer) deadlines.push({ type: 'Summer', date: this.deadlines.summer });
  return deadlines.length > 0 ? deadlines[0] : null;
};

const FirstCollege = mongoose.model("FirstCollege", firstCollegeSchema);

export { FirstCollege };
