import mongoose from "mongoose";

const programSearchIndexSchema = new mongoose.Schema(
  {
    universityId: { type: String, index: true },
    universityObjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University",
      index: true,
    },
    universityName: { type: String, default: "" },
    country: { type: String, default: "" },
    location: { type: String, default: "" },
    degree: {
      type: String,
      required: true,
    },
    programType: {
      type: String,
      enum: ["UG", "PG", "MEDICAL"],
      required: true,
    },
    majorArea: { type: String, default: "" },
    programTitle: { type: String, default: "" },
    programId: { type: String, default: "" },
    duration: { type: String, default: "" },
    level: { type: String, default: "" },
    studyMode: { type: String, default: "" },
    college: { type: String, default: "" },
    normalizedCountry: { type: String, default: "" },
    normalizedMajorArea: { type: String, default: "" },
    normalizedProgramTitle: { type: String, default: "" },
    searchText: { type: String, default: "" },
    isVisible: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "program_search_indexes",
  }
);

programSearchIndexSchema.index({ normalizedCountry: 1, degree: 1, programType: 1 });
programSearchIndexSchema.index({
  normalizedCountry: 1,
  degree: 1,
  programType: 1,
  normalizedMajorArea: 1,
});
programSearchIndexSchema.index({
  normalizedCountry: 1,
  degree: 1,
  programType: 1,
  normalizedProgramTitle: 1,
});
programSearchIndexSchema.index({ universityId: 1 });
programSearchIndexSchema.index({ universityObjectId: 1 });
programSearchIndexSchema.index({ searchText: "text" });

const ProgramSearchIndex = mongoose.model("ProgramSearchIndex", programSearchIndexSchema);

export default ProgramSearchIndex;
