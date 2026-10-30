import mongoose from "mongoose";

const helpdeskTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    studentName: { type: String, trim: true, default: "" },
    studentEmail: { type: String, trim: true, lowercase: true, default: "" },
    studentId: { type: String, trim: true, default: "" },
    applicationId: { type: String, trim: true, default: "" },
    currentSection: { type: String, trim: true, default: "" },
    sourcePath: { type: String, trim: true, default: "" },
    sourceTitle: { type: String, trim: true, default: "" },
    ticketMode: {
      type: String,
      enum: ["currentPage", "otherQuery"],
      default: "currentPage",
      index: true,
    },
    reportedSection: { type: String, trim: true, default: "" },
    studyLevel: { type: String, trim: true, default: "" },
    selectedUniversity: { type: String, trim: true, default: "" },
    selectedCourse: { type: String, trim: true, default: "" },
    currentProgress: { type: Number, min: 0, max: 100, default: 0 },
    category: {
      type: String,
      trim: true,
      default: "Application",
      index: true,
    },
    issueType: {
      type: String,
      trim: true,
      default: "Other",
      index: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    screenshotName: { type: String, trim: true, default: "" },
    screenshotKey: { type: String, trim: true, default: "" },
    screenshotUrl: { type: String, trim: true, default: "" },
    screenshotMimeType: { type: String, trim: true, default: "" },
    screenshotSize: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Closed"],
      default: "Open",
      index: true,
    },
    unreadForStudent: { type: Boolean, default: false, index: true },
    unreadForPartner: { type: Boolean, default: true, index: true },
    assignedRole: {
      type: String,
      enum: ["partner", "process-admin", "admin"],
      default: "partner",
      index: true,
    },
    assignedPartner: {
      name: { type: String, trim: true, default: "EdutechEX Support Partner" },
      email: { type: String, trim: true, lowercase: true, default: "" },
    },
    activity: [
      {
        actorRole: { type: String, enum: ["student", "partner", "admin", "system"], default: "system" },
        actorEmail: { type: String, trim: true, lowercase: true, default: "" },
        message: { type: String, trim: true, default: "" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

helpdeskTicketSchema.index({ userId: 1, updatedAt: -1 });
helpdeskTicketSchema.index({ assignedRole: 1, status: 1, updatedAt: -1 });

export default mongoose.model("HelpdeskTicket", helpdeskTicketSchema);


