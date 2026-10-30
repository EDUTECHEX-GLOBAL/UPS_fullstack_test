// models/educationModel.js
import mongoose from "mongoose";

// =====================================================================================
// 🔹 DOCUMENT SUB-SCHEMAS FOR CLEANER STRUCTURE
// =====================================================================================

// Single uploaded document structure
const documentFileSchema = new mongoose.Schema(
  {
    documentType: { type: String, default: null },
    filename: { type: String, default: null },
    path: { type: String, default: null },
    uploadDate: { type: Date, default: null },
    fileSize: { type: Number, default: null },
  },
  { _id: false }
);

// =====================================================================================
// 🔹 MAIN EDUCATION SCHEMA
// =====================================================================================
const educationSchema = new mongoose.Schema(
  {
    // ====================== Student Reference ======================
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TransferStudent",
      required: true,
      index: true,
    },

    // ====================== Current High School ======================
    currentSchool: {
      schoolName: { type: String, trim: true, default: null },
      schoolCEEBCode: { type: String, trim: true, default: null },
      dateOfEntry: { type: String, default: null },
      isBoardingSchool: { type: String, enum: [null, "", "yes", "no"], default: null },
      liveOnCampus: { type: String, enum: [null, "", "yes", "no"], default: null },
      willGraduate: { type: String, enum: [null, "", "yes", "no"], default: null },
      graduationDate: { type: String, default: null },

      schoolAddress: {
        street: { type: String, default: null },
        city: { type: String, default: null },
        state: { type: String, default: null },
        zipCode: { type: String, default: null },
        country: { type: String, default: null },
      },
    },

    // ====================== Other High Schools ======================
    otherSchools: {
      numberOfSchools: { type: Number, default: 0, min: 0, max: 10 },
      schools: {
        type: [
          {
            schoolName: { type: String, default: "" },
            schoolCEEBCode: { type: String, default: null },
            dateOfEntry: { type: String, default: null },
            dateOfExit: { type: String, default: null },
            isBoardingSchool: { type: String, enum: [null, "", "yes", "no"], default: null },
            graduated: { type: String, enum: [null, "", "yes", "no"], default: null },
            graduationDate: { type: String, default: null },

            schoolAddress: {
              street: { type: String, default: null },
              city: { type: String, default: null },
              state: { type: String, default: null },
              zipCode: { type: String, default: null },
              country: { type: String, default: null },
            },
          },
        ],
        default: [],
      },
    },

    // ====================== Colleges Attended ======================
    colleges: {
      numberOfColleges: { type: Number, default: 0, min: 0, max: 10 },
      collegesList: {
        type: [
          {
            collegeName: { type: String, default: "" },
            collegeType: { type: String, default: null },
            collegeCEEBCode: { type: String, default: null },

            datesAttendedFrom: { type: String, default: null },
            datesAttendedTo: { type: String, default: null },

            // Old fields for backward compatibility
            dateOfEntry: { type: String, default: null },
            dateOfExit: { type: String, default: null },

            creditsEarned: { type: String, default: null },
            degreeEarned: { type: String, default: null },
            degreeDate: { type: String, default: null },
            major: { type: String, default: null },
          },
        ],
        default: [],
      },
    },

    // ====================== Grades ======================
    grades: {
      graduatingClassSize: { type: String, default: null },
      classRankReporting: {
        type: String,
        enum: [null, "", "exact", "decile", "quintile", "quartile", "none"],
        default: null,
      },
      classRank: { type: String, default: null },
      gpaScale: {
        type: String,
        enum: [null, "", "4.0", "5.0", "6.0", "10.0", "100", "other"],
        default: null,
      },
      cumulativeGPA: { type: String, default: null },
      gpaWeighting: { type: String, enum: [null, "", "weighted", "unweighted"], default: null },
      gpaMaxScale: { type: String, default: null },
    },

    // ====================== Current Courses ======================
    currentCourses: {
      numberOfCourses: { type: Number, default: 0, min: 0, max: 20 },
      schedulingSystem: {
        type: String,
        enum: [null, "", "semester", "trimester", "quarter", "yearly", "year-long"],
        default: null,
      },
      courses: {
        type: [
          {
            courseName: { type: String, default: "" },
            courseLevel: {
              type: String,
              enum: [
                "",
                "regular",
                "honors",
                "ap",
                "ib",
                "college-level",
                "AP",
                "IB",
                "Honors",
                "College Prep",
                "Regular",
              ],
              default: "",
            },
            courseSchedule: {
              type: String,
              enum: ["", "Full Year", "Fall", "Spring", "Summer", "full-year", "fall", "spring", "summer"],
              default: "",
            },
            credits: { type: String, default: null },
            grade: { type: String, default: null },
            term: { type: String, default: null },
          },
        ],
        default: [],
      },
    },

    // ====================== Honors ======================
    honors: {
      reportHonors: { type: String, enum: [null, "", "yes", "no"], default: null },
      honorsList: {
        type: [
          {
            honorName: { type: String, default: "" },
            honorTitle: { type: String, default: "" }, // legacy
            honorLevel: {
              type: String,
              enum: ["", "school", "district", "state", "national", "international", "State/Regional"],
              default: "",
            },
            gradeLevel: {
              type: String,
              enum: ["", "9", "10", "11", "12", "Post-Graduate"],
              default: "",
            },
            yearReceived: { type: String, default: "" },
            description: { type: String, maxlength: 500, default: "" },
          },
        ],
        default: [],
      },
    },

    // ====================== Community Organizations ======================
    communityOrganizations: {
      numberOfOrganizations: { type: Number, default: 0, min: 0, max: 10 },
      organizations: {
        type: [
          {
            organizationName: { type: String, default: "" },
            role: { type: String, default: "" },
            startDate: { type: String, default: null },
            endDate: { type: String, default: null },
            hoursPerWeek: { type: String, default: null },
            weeksPerYear: { type: String, default: null },
            description: { type: String, maxlength: 500, default: "" },
          },
        ],
        default: [],
      },
    },

    // ====================== Future Plans ======================
    futurePlans: {
      studentType: {
        type: String,
        enum: [
          null,
          "",
          "first-year",
          "transfer",
          "returning",
          "first-year-2025-2026",
          "start-2027",
          "start-2028-beyond",
          "already-college-student",
        ],
        default: null,
      },
      highestDegree: {
        type: String,
        enum: [null, "", "associate", "bachelor", "master", "doctorate", "professional", "undecided"],
        default: null,
      },
      careerInterest: { type: String, default: null },
      additionalInterests: { type: [String], default: [] },
    },

    // ====================== Document Uploads ======================
   // models/educationtestModel.js - UPDATE THE DOCUMENT SCHEMA SECTION

// ====================== Document Uploads ======================
documents: {
  passport: { 
    type: mongoose.Schema.Types.Mixed, // CHANGE from documentFileSchema to Mixed
    default: null 
  },
  tenthMarksheet: { 
    type: mongoose.Schema.Types.Mixed, // CHANGE from documentFileSchema to Mixed
    default: null 
  },
  twelfthMarksheet: { 
    type: mongoose.Schema.Types.Mixed, // CHANGE from documentFileSchema to Mixed
    default: null 
  },

  otherDocuments: {
    type: [mongoose.Schema.Types.Mixed], // CHANGE from [documentFileSchema] to [Mixed]
    default: [],
  },
},

    // ====================== Completion Status ======================
    educationCompletion: {
      currentSchool: { type: Boolean, default: false },
      otherSchools: { type: Boolean, default: false },
      colleges: { type: Boolean, default: false },
      grades: { type: Boolean, default: false },
      currentCourses: { type: Boolean, default: false },
      honors: { type: Boolean, default: false },
      communityOrganizations: { type: Boolean, default: false },
      futurePlans: { type: Boolean, default: false },
      documents: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    collection: "education_records",
  }
);

// ====================== Unique Student Record ======================
educationSchema.index({ studentId: 1 }, { unique: true });

// ====================== Export ======================
const TransferEducation = mongoose.model("TransferEducation", educationSchema);

export default TransferEducation;
