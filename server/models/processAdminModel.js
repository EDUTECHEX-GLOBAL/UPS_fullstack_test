import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const processAdminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  role: {
    type: String,
    default: 'process-admin',
    enum: ['process-admin']
  },

  // ── OTP Fields ──
  otp: { type: String, default: null },
  otpExpiry: { type: Date, default: null },
  isEmailVerified: { type: Boolean, default: false },

  // ── Approval Fields ──
  isApproved: { type: Boolean, default: false },

  // ✅ FIX 1: String instead of ObjectId ref
  approvedBy: {
    type: String,
    default: null
  },
  approvedAt: { type: Date, default: null },

  // ✅ FIX 2: Keep pending_verification as default (correct flow)
  // but make sure OTP verify sets it to pending_approval
  status: {
    type: String,
    enum: [
      'pending_verification',
      'pending_approval',
      'active',
      'rejected',
      'suspended'
    ],
    default: 'pending_verification'
  },

  rejectionReason: { type: String, default: null },
  lastLogin: { type: Date, default: null },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// ── Hash password before saving ──
processAdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

processAdminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

processAdminSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  return otp;
};

processAdminSchema.methods.verifyOTP = function (inputOtp) {
  if (!this.otp || !this.otpExpiry) return { valid: false, reason: 'No OTP found' };
  if (new Date() > this.otpExpiry)   return { valid: false, reason: 'OTP has expired' };
  if (this.otp !== inputOtp)         return { valid: false, reason: 'Incorrect OTP' };
  return { valid: true };
};

processAdminSchema.methods.clearOTP = function () {
  this.otp = null;
  this.otpExpiry = null;
};

processAdminSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

processAdminSchema.methods.incrementLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 };
  }
  return this.updateOne(updates);
};

processAdminSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

const ProcessAdmin = mongoose.model('ProcessAdmin', processAdminSchema);
export default ProcessAdmin;