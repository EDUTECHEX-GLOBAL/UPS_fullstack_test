// models/transferModel.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

// ======================
// Transfer Student Schema
// ======================
const transferStudentSchema = new mongoose.Schema(
  {
    // ---------- Personal Information ----------
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters"],
    },
    middleName: {
      type: String,
      trim: true,
      default: null,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters"],
    },
    suffix: {
      type: String,
      trim: true,
      default: null,
      enum: [null, "Jr.", "Sr.", "III", "II", "IV"],
    },
    
    // ✅ NEW: Preferred First Name
    useDifferentFirstName: {
      type: String,
      enum: ['yes', 'no'],
      default: 'no',
    },
    preferredFirstName: {
      type: String,
      trim: true,
      default: null,
    },
    
    // ✅ NEW: Birth Date
    birthDate: {
      type: Date,
      default: null,
    },

    // ---------- Email Information ----------
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    emailType: {
      type: String,
      enum: ["Home", "Work", "School"],
      default: "Home",
    },
    confirmEmail: {
      type: String,
      required: [true, "Email confirmation is required"],
      lowercase: true,
      trim: true,
    },

    // ---------- Primary Phone ----------
    primaryPhone: {
      type: String,
      required: [true, "Primary phone is required"],
      trim: true,
      match: [/^\d{7,15}$/, "Phone must contain 7–15 digits"],
    },
    primaryPhoneType: {
      type: String,
      enum: ["Mobile", "Home", "Work"],
      default: "Mobile",
    },
    primaryPhoneCountry: {
      type: String,
      default: "+1",
    },
    
    // ✅ NEW: Alternative phone field names for ProfileForm compatibility
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    countryCode: {
      type: String,
      default: '+1',
    },
    preferredPhoneType: {
      type: String,
      enum: ["mobile", "home", "work"],
      default: "mobile",
    },

    // ---------- Alternate Phone (Optional) ----------
    alternatePhone: {
      type: String,
      trim: true,
      default: null,
      match: [/^(\d{7,15})?$/, "Alternate phone must contain 7–15 digits if provided"],
    },
    alternatePhoneType: {
      type: String,
      enum: ["Mobile", "Home", "Work", "none"],
      default: "Mobile",
    },
    alternatePhoneCountry: {
      type: String,
      default: "+1",
    },

    // ✅ NEW: Address Information
    addressLine1: {
      type: String,
      trim: true,
      default: null,
    },
    addressLine2: {
      type: String,
      trim: true,
      default: null,
    },
    city: {
      type: String,
      trim: true,
      default: null,
    },
    state: {
      type: String,
      trim: true,
      default: null,
    },
    zipCode: {
      type: String,
      trim: true,
      default: null,
    },
    country: {
      type: String,
      trim: true,
      default: null,
    },

    // ✅ NEW: Demographics
    gender: {
      type: String,
      trim: true,
      default: null,
    },
    additionalGender: {
      type: String,
      trim: true,
      default: null,
    },
    legalSex: {
      type: String,
      enum: [null, 'Male', 'Female', 'X (Undesignated)'],
      default: null,
    },
    pronouns: {
      type: String,
      trim: true,
      default: null,
    },
    additionalPronouns: {
      type: String,
      trim: true,
      default: null,
    },
    armedForcesStatus: {
      type: String,
      trim: true,
      default: null,
    },
    hispanicOrLatino: {
      type: String,
      enum: [null, 'yes', 'no'],
      default: null,
    },
    ethnicity: {
      type: [String],
      default: [],
    },

    // ✅ NEW: Language Proficiency
    languagesProficient: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },
    languages: {
      type: [
        {
          language: {
            type: String,
            default: '',
          },
          proficiency: {
            firstLanguage: {
              type: Boolean,
              default: false,
            },
            speak: {
              type: Boolean,
              default: true,
            },
            read: {
              type: Boolean,
              default: true,
            },
            write: {
              type: Boolean,
              default: true,
            },
            spokenAtHome: {
              type: Boolean,
              default: false,
            },
          },
        },
      ],
      default: [
        {
          language: '',
          proficiency: {
            firstLanguage: false,
            speak: true,
            read: true,
            write: true,
            spokenAtHome: false,
          },
        },
      ],
    },

    // ✅ NEW: Geography & Nationality
    birthCountry: {
      type: String,
      trim: true,
      default: null,
    },
    cityOfBirth: {
      type: String,
      trim: true,
      default: null,
    },
    yearsInUS: {
      type: String,
      trim: true,
      default: null,
    },
    citizenshipStatus: {
      type: String,
      trim: true,
      default: null,
    },

    // ✅ NEW: Fee Waiver
    feeWaiverEligible: {
      type: Boolean,
      default: false,
    },
    feeWaiverCriteria: {
      type: [String],
      default: [],
    },
    ustriveMentor: {
      type: Boolean,
      default: false,
    },

    // ✅ NEW: Profile Completion Tracking
    profileCompletion: {
      personalInfo: {
        type: Boolean,
        default: false,
      },
      contactDetails: {
        type: Boolean,
        default: false,
      },
      demographics: {
        type: Boolean,
        default: false,
      },
      language: {
        type: Boolean,
        default: false,
      },
      geography: {
        type: Boolean,
        default: false,
      },
      feeWaiver: {
        type: Boolean,
        default: false,
      },
    },

    // ---------- Account Credentials ----------
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [6, "Username must be at least 6 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [
        /^[a-zA-Z0-9_-]+$/,
        "Username can only contain letters, numbers, underscores, and hyphens",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // hide password in queries
    },

    // ---------- Agreements & Preferences ----------
    textAuthAgreed: {
      type: Boolean,
      default: false,
    },
    termsAccepted: {
      type: Boolean,
      required: [true, "You must accept the terms and conditions"],
    },
    euResident: {
      type: String,
      enum: ["yes", "no"],
      required: [true, "EU resident status is required"],
    },

    // ---------- Account Status ----------
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    accountType: {
      type: String,
      enum: ["transfer-student"],
      default: "transfer-student",
    },

    // ---------- OTP & Verification ----------
    otpCode: {
      type: String,
      default: null,
      select: false,
    },
    otpExpiry: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true, // auto-add createdAt & updatedAt
    collection: "transfer_students",
    strict: false, // ✅ Allow fields not in schema (optional - use if you want flexibility)
  }
);

// ======================
// 🔐 Password Hashing
// ======================
transferStudentSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    console.error("❌ Error hashing password:", error);
    next(error);
  }
});

// ======================
// 🔍 Compare Passwords
// ======================
transferStudentSchema.methods.comparePassword = async function (enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    console.error("❌ Password comparison failed:", error);
    return false;
  }
};

// ======================
// 🔒 Sanitize Output (Hide Sensitive Data)
// ======================
transferStudentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otpCode;
  delete obj.otpExpiry;
  return obj;
};

// ======================
// 📧 Unique Indexes
// ======================
transferStudentSchema.index({ email: 1 }, { unique: true });
transferStudentSchema.index({ username: 1 }, { unique: true });

// ======================
// ✅ Export Model
// ======================
const TransferStudent = mongoose.model("TransferStudent", transferStudentSchema);
export default TransferStudent;
