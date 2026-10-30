import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "NEW_USER",              // admin: new user registered
        "WELCOME",               // student: welcome message
        "PENDING_APPROVAL",      // student: waiting for admin approval
        "APPROVAL",              // student: approved by admin
        "UNIVERSITY_REQUEST",    // admin: student requested a new university
        "UNIVERSITY_APPROVED",   // ✅ ADDED: student notified their university was approved
        "UNIVERSITY_REJECTED",   // ✅ ADDED: student notified their university was rejected
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    targetRole: {
      type: String,
      enum: ["admin", "student"],
      required: true,
      index: true,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    requestData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Notification", notificationSchema);
