// models/writingtestModel.js
import mongoose from "mongoose";

const writingTestSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TransferStudent",
      required: true,
    },

    // ---------- Personal Essay ----------
    personalEssay: {
      essayRequired: {
        type: Boolean,
        default: false,
      },
      selectedTopic: {
        type: String,
        enum: [
          "",
          "topic1",
          "topic2",
          "topic3",
          "topic4",
          "topic5",
          "topic6",
          "topic7",
        ],
        default: "",
      },
      essayText: {
        type: String,
        default: "",
        maxlength: 5000,
      },
      wordCount: {
        type: Number,
        default: 0,
        min: 0,
        max: 650,
      },
    },

    // ---------- Additional Information ----------
    additionalInformation: {
      shareDetails: {
        type: String,
        enum: ["", "yes", "no"],
        default: "",
      },
      challengesExperienced: {
        type: String,
        default: "",
      },
      additionalQualifications: {
        type: String,
        enum: ["", "yes", "no"],
        default: "",
      },
    },

    // ---------- Writing Completion Tracking ----------
    writingCompletion: {
      personalEssay: {
        type: Boolean,
        default: false,
      },
      additionalInformation: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,

    // NEW COLLECTION NAME (prevents mixing data)
    collection: "writingtest_records",

    strict: false,
  }
);

// Index for faster queries
writingTestSchema.index({ studentId: 1 }, { unique: true });

// IMPORTANT — NEW MODEL NAME (prevents OverwriteModelError)
const WritingTest = mongoose.model("WritingTest", writingTestSchema);

export default WritingTest;
