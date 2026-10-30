import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { PERSON_PLACE_REGEX, PHONE_REGEX } from "../utils/profileValidation.js";


const accountSchema = new mongoose.Schema(
  {
    // =============================
    // 🧾 Basic Account Info (EXISTING FIELDS - NO CHANGES)
    // =============================
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    studentType: {
      type: String,
      enum: [
        "first-year-2025-2026",
        "start-2027",
        "start-2028-beyond",
        "first-year",
        "transfer",
        "other",
      ],
      default: "first-year-2025-2026",
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      match: [PERSON_PLACE_REGEX, "First name can contain only letters, spaces, hyphen, apostrophe, and dot"],
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      match: [PERSON_PLACE_REGEX, "Last name can contain only letters, spaces, hyphen, apostrophe, and dot"],
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function(value) {
          return !value || PHONE_REGEX.test(value);
        },
        message: "Phone number must contain only digits, with an optional plus sign at the beginning, and be 7-15 digits long",
      },
    },
    countryCode: { type: String, default: "+1" },
    agreeToTerms: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    lastLogin: { type: Date },

    // Passport details captured during registration for application prefill.
    hasPassport: {
      type: String,
      enum: ["", "yes", "no"],
      default: "",
    },
    passportNumber: { type: String, trim: true },
    passportIssueDate: { type: String, trim: true },
    passportExpiryDate: { type: String, trim: true },
    passportFileName: { type: String, trim: true, default: "" },
    passportFileKey: { type: String, trim: true, default: "" },
    passportFileUrl: { type: String, trim: true, default: "" },
    passportOriginalName: { type: String, trim: true, default: "" },
    passportFileType: { type: String, trim: true, default: "" },
    passportFileSize: { type: Number, min: 0, default: 0 },
    passportUploadedAt: { type: Date, default: null },
    passportExtractedData: { type: mongoose.Schema.Types.Mixed, default: null },
    passportDetails: { type: mongoose.Schema.Types.Mixed, default: null },
    personalInfo: { type: mongoose.Schema.Types.Mixed, default: null },
    extractedData: { type: mongoose.Schema.Types.Mixed, default: null },
    passportValidationStatus: {
      type: String,
      enum: ["pending", "valid", "invalid", "not_checked"],
      default: "not_checked",
    },
    issuingCountry: {
      type: String,
      trim: true,
      validate: {
        validator: function(value) {
          return !value || PERSON_PLACE_REGEX.test(value);
        },
        message: "Issuing country can contain only letters, spaces, hyphen, apostrophe, and dot",
      },
    },
    citizenship: {
      type: String,
      trim: true,
      validate: {
        validator: function(value) {
          return !value || PERSON_PLACE_REGEX.test(value);
        },
        message: "Citizenship can contain only letters, spaces, hyphen, apostrophe, and dot",
      },
    },

    // =============================
    // Account gender (used by passport/account autofill)
    // =============================
    gender: {
      type: String,
      enum: ["", "female", "male", "nonbinary", "prefer-not-to-say", "other"],
      default: "",
    },

    // =============================
    // 🧭 Application Progress (EXISTING FIELDS - NO CHANGES)
    // =============================
    applicationProgress: {
      education: { type: Number, default: 0 },
      testing: { type: Number, default: 0 },
      activities: { type: Number, default: 0 },
      writing: { type: Number, default: 0 },
      documents: { type: Number, default: 0 },
      preview: { type: Number, default: 0 },
      residency: { type: Number, default: 0 },
    },

    // =============================
    // 🛡️ NEW: ADMIN APPROVAL FIELDS (ADD THESE)
    // =============================
    status: {
      type: String,
      enum: ['pending', 'active', 'inactive', 'suspended'],
      default: 'pending'
    },

    role: {
      type: String,
      enum: ['student', 'admin', 'moderator'],
      default: 'student'
    },

    isApprovedByAdmin: {
      type: Boolean,
      default: false
    },

    avatar: {
      type: String,
      default: function() {
        return this.firstName?.charAt(0).toUpperCase() || 'U';
      }
    },

    joinDate: {
      type: Date,
      default: Date.now
    },

    // =============================
    // 📝 NEW: ADMIN NOTES (ADD THIS)
    // =============================
    adminNotes: {
      type: String,
      default: ''
    },

    // =============================
    // 🎓 Student Application Journey Fields
    // =============================
    applicantType: {
      type: String,
      enum: ["First-Year Student", "Transfer Student"],
      default: "First-Year Student",
    },
    applyingFor: {
      type: String,
      enum: ["Bachelor's", "Master's", "Medical"],
      default: "Bachelor's",
    },
    applicationNumber: {
      type: String,
      default: "",
    },
    applicationStatus: {
      type: String,
      enum: [
        "Draft",
        "Submitted for Approval",
        "Under Review",
        "University Selection Pending",
        "Changes Requested",
        "Approved",
        "Rejected",
      ],
      default: "Draft",
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    draftSavedStep: {
      type: Number,
      default: 1,
    },
    changesRequestedNotes: {
      type: String,
      default: "",
    },
    changesRequestedSection: {
      type: String,
      default: "",
    }
  },
  {
    timestamps: true,
  }
);

// =============================
// 🔒 Password Hash Middleware (EXISTING - NO CHANGES)
// =============================
accountSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// =============================
// 🔑 Compare Password (EXISTING - NO CHANGES)
// =============================
accountSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// =============================
// 🧾 Public Profile (EXISTING - NO CHANGES)
// =============================
accountSchema.methods.getPublicProfile = function () {
  const accountObj = this.toObject();
  delete accountObj.password;
  return accountObj;
};

// =============================
// 📊 NEW: Virtual for formatted join date
// =============================
accountSchema.virtual('formattedJoinDate').get(function() {
  if (!this.joinDate) return 'Not available';
  return this.joinDate.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
});

// =============================
// 🔄 NEW: Virtual for formatted last login
// =============================
accountSchema.virtual('formattedLastLogin').get(function() {
  if (!this.lastLogin) return 'Never logged in';

  const now = new Date();
  const diffMs = now - this.lastLogin;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;

  return this.lastLogin.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
});

const Account = mongoose.model("Account", accountSchema);
export default Account;

