import mongoose from "mongoose";

const writingSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    // =============================
    // 📝 PERSONAL ESSAY SECTION
    // =============================
    personalEssay: {
      selectedPrompt: {
        type: Number,
        enum: [1, 2, 3, 4, 5, 6, 7],
        default: null,
      },
      essayContent: {
        type: String,
        default: "",
        maxlength: 5000,
      },
      wordCount: {
        type: Number,
        default: 0,
      },
      lastSaved: {
        type: Date,
        default: Date.now,
      },
      isComplete: {
        type: Boolean,
        default: false,
      },
      understandingAcknowledged: {
        type: Boolean,
        default: false,
      },
    },

    // =============================
    // ℹ️ ADDITIONAL INFORMATION SECTION
    // =============================
    additionalInformation: {
      shareCircumstances: {
        type: String,
        enum: ["yes", "no", null],
        default: null,
      },
      circumstancesText: {
        type: String,
        default: "",
        maxlength: 2000,
      },
      circumstancesWordCount: {
        type: Number,
        default: 0,
      },

      shareQualifications: {
        type: String,
        enum: ["yes", "no", null],
        default: null,
      },
      qualificationsText: {
        type: String,
        default: "",
        maxlength: 5000,
      },
      qualificationsWordCount: {
        type: Number,
        default: 0,
      },

      lastSaved: {
        type: Date,
        default: Date.now,
      },
      isComplete: {
        type: Boolean,
        default: false,
      },
    },

    // =============================
    // 📊 PROGRESS TRACKING
    // =============================
    progress: {
      personalEssay: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      additionalInformation: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      overall: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },

    // =============================
    // 🏫 COLLEGE-SPECIFIC REQUIREMENTS
    // =============================
    collegeRequirements: [
      {
        collegeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "College",
        },
        requiresPersonalEssay: {
          type: Boolean,
          default: false,
        },
        requiresCoursesGrades: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  { timestamps: true }
);

// =============================
// 🎯 PRE-SAVE MIDDLEWARE FOR PROGRESS CALCULATION
// =============================
writingSchema.pre("save", function (next) {
  // Personal Essay Progress
  let personalEssayProgress = 0;
  if (this.personalEssay.selectedPrompt) personalEssayProgress += 25;
  if (this.personalEssay.wordCount >= 250) personalEssayProgress += 50;
  if (this.personalEssay.understandingAcknowledged) personalEssayProgress += 25;

  this.progress.personalEssay = Math.min(personalEssayProgress, 100);

  // Additional Information Progress
  let additionalInfoProgress = 0;

  if (this.additionalInformation.shareCircumstances !== null)
    additionalInfoProgress += 25;

  if (this.additionalInformation.shareQualifications !== null)
    additionalInfoProgress += 25;

  const circumstancesText =
    (this.additionalInformation.circumstancesText || "").trim();

  const qualificationsText =
    (this.additionalInformation.qualificationsText || "").trim();

  if (
    this.additionalInformation.shareCircumstances === "yes" &&
    circumstancesText.length > 0
  ) {
    additionalInfoProgress += 25;
  }

  if (
    this.additionalInformation.shareQualifications === "yes" &&
    qualificationsText.length > 0
  ) {
    additionalInfoProgress += 25;
  }

  this.progress.additionalInformation = Math.min(additionalInfoProgress, 100);

  // Overall Progress
  const total = this.progress.personalEssay + this.progress.additionalInformation;
  this.progress.overall = Math.round(total / 2);

  next();
});

// =============================
// 🔍 STATIC METHODS
// =============================
writingSchema.statics.findByStudentId = function (studentId) {
  return this.findOne({ studentId });
};

writingSchema.statics.findOrCreateByStudentId = async function (studentId) {
  let writing = await this.findOne({ studentId });
  if (!writing) {
    writing = await this.create({ studentId });
  }
  return writing;
};

// =============================
// 📝 INSTANCE METHODS
// =============================
writingSchema.methods.updatePersonalEssay = function (
  promptId,
  content,
  acknowledged = false
) {
  this.personalEssay.selectedPrompt = promptId;
  this.personalEssay.essayContent = content;
  this.personalEssay.wordCount = content.trim()
    ? content.trim().split(/\s+/).length
    : 0;
  this.personalEssay.understandingAcknowledged = acknowledged;
  this.personalEssay.lastSaved = new Date();

  this.personalEssay.isComplete = Boolean(
    this.personalEssay.selectedPrompt &&
      this.personalEssay.essayContent &&
      this.personalEssay.wordCount >= 250 &&
      this.personalEssay.understandingAcknowledged
  );
};

writingSchema.methods.updateAdditionalInformation = function (
  circumstances,
  qualifications
) {
  if (circumstances) {
    this.additionalInformation.shareCircumstances =
      circumstances.share ?? this.additionalInformation.shareCircumstances;
    
    this.additionalInformation.circumstancesText =
      circumstances.text ?? this.additionalInformation.circumstancesText;

    this.additionalInformation.circumstancesWordCount =
      circumstances.text
        ? circumstances.text.trim().split(/\s+/).length
        : this.additionalInformation.circumstancesWordCount;
  }

  if (qualifications) {
    this.additionalInformation.shareQualifications =
      qualifications.share ?? this.additionalInformation.shareQualifications;

    this.additionalInformation.qualificationsText =
      qualifications.text ?? this.additionalInformation.qualificationsText;

    this.additionalInformation.qualificationsWordCount =
      qualifications.text
        ? qualifications.text.trim().split(/\s+/).length
        : this.additionalInformation.qualificationsWordCount;
  }

  this.additionalInformation.lastSaved = new Date();

  this.additionalInformation.isComplete = Boolean(
    this.additionalInformation.shareCircumstances !== null &&
    this.additionalInformation.shareQualifications !== null
  );
};


const Writing = mongoose.model("Writing", writingSchema);
export default Writing;
