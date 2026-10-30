import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    documentType: { type: String, trim: true, default: "" },
    fileName: { type: String, trim: true, default: "" },
    originalName: { type: String, trim: true, default: "" },
    fileUrl: { type: String, trim: true, default: "" },
    s3Key: { type: String, trim: true, default: "" },
    bucket: { type: String, trim: true, default: "" },
    mimeType: { type: String, trim: true, default: "" },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
    extractionStatus: {
      type: String,
      enum: ["pending", "completed", "skipped", "failed"],
      default: "pending",
    },
    extractedTextPreview: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const allDocumentSchema = new mongoose.Schema(
  {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
studentTempId: { type: String, trim: true, index: true },
    sessionId: { type: String, trim: true, index: true },
    uploadedDocuments: {
      passport: { type: fileSchema, default: null },
      photo: { type: fileSchema, default: null },
      cv: { type: fileSchema, default: null },
      grade9: { type: fileSchema, default: null },
      grade10: { type: fileSchema, default: null },
      grade11: { type: fileSchema, default: null },
      grade12: { type: fileSchema, default: null },
      testScores: {
        sat: { type: fileSchema, default: null },
        act: { type: fileSchema, default: null },
        ap: { type: fileSchema, default: null },
        ib: { type: fileSchema, default: null },
        ielts: { type: fileSchema, default: null },
        toefl: { type: fileSchema, default: null },
        duolingo: { type: fileSchema, default: null },
        pte: { type: fileSchema, default: null },
        neet: { type: fileSchema, default: null },
      },
    },
    extractedData: {
      firstName: { type: String, trim: true, default: "" },
      lastName: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, lowercase: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      dateOfBirth: { type: String, trim: true, default: "" },
      gender: { type: String, trim: true, default: "" },
      nationality: { type: String, trim: true, default: "" },
      passportNumber: { type: String, trim: true, default: "" },
      fatherName: { type: String, trim: true, default: "" },
      motherName: { type: String, trim: true, default: "" },
      guardianName: { type: String, trim: true, default: "" },
      passportIssueDate: { type: String, trim: true, default: "" },
      passportExpiryDate: { type: String, trim: true, default: "" },
      issuingCountry: { type: String, trim: true, default: "" },
      address: { type: String, trim: true, default: "" },
      addressLine1: { type: String, trim: true, default: "" },
      addressLine2: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      state: { type: String, trim: true, default: "" },
      country: { type: String, trim: true, default: "" },
      postalCode: { type: String, trim: true, default: "" },
      zipCode: { type: String, trim: true, default: "" },
      schoolName: { type: String, trim: true, default: "" },
      board: { type: String, trim: true, default: "" },
      graduationYear: { type: String, trim: true, default: "" },
      grade9: { type: mongoose.Schema.Types.Mixed, default: null },
      grade10: { type: mongoose.Schema.Types.Mixed, default: null },
      grade11: { type: mongoose.Schema.Types.Mixed, default: null },
      grade12: { type: mongoose.Schema.Types.Mixed, default: null },
      sat: { type: mongoose.Schema.Types.Mixed, default: null },
      act: { type: mongoose.Schema.Types.Mixed, default: null },
      ap: { type: mongoose.Schema.Types.Mixed, default: null },
      ib: { type: mongoose.Schema.Types.Mixed, default: null },
      ielts: { type: mongoose.Schema.Types.Mixed, default: null },
      toefl: { type: mongoose.Schema.Types.Mixed, default: null },
      duolingo: { type: mongoose.Schema.Types.Mixed, default: null },
      pte: { type: mongoose.Schema.Types.Mixed, default: null },
      neet: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    grade12Status: {
      type: String,
      enum: ["completed", "pending"],
      required: true,
    },
    expectedMonth: { type: String, trim: true, default: "" },
    expectedYear: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

const AllDocument = mongoose.model("AllDocument", allDocumentSchema);
export default AllDocument;






