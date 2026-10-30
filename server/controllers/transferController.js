// controllers/transferController.js
import TransferStudent from "../models/transferModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { sendEmail } from "../utils/sendEmail.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * 🔐 Generate JWT Token
 * ✅ CRITICAL: This MUST use the same secret as authMiddleware
 */
const generateToken = (id, email, username) => {
  console.log('🔐 Generating token with ID:', id);
  
  // ✅ FIXED: Use same fallback secret as authMiddleware
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  WARNING: JWT_SECRET not in .env, using fallback: "your-secret-key"');
    console.warn('   Make sure this matches the secret in authMiddleware!');
  } else {
    console.log('🔑 JWT_SECRET loaded from .env for token generation');
  }
  
  const token = jwt.sign(
    { 
      id: id.toString(),
      email, 
      username 
    },
    jwtSecret, // ✅ Use the same secret variable
    { expiresIn: "24h" }
  );
  
  console.log('✅ Token generated successfully');
  console.log('⏰ Token will expire in 24 hours');
  
  return token;
};

/**
 * 📧 Generate OTP Code
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * ✅ Validate Transfer Student Registration Data
 */
const validateTransferRegistration = (data) => {
  const errors = [];

  if (!data.firstName?.trim()) {
    errors.push("First name is required");
  }
  if (!data.lastName?.trim()) {
    errors.push("Last name is required");
  }

  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!data.email?.trim() || !emailRegex.test(data.email)) {
    errors.push("Valid email is required");
  }
  if (data.email !== data.confirmEmail) {
    errors.push("Email addresses do not match");
  }

  const phoneRegex = /^\d{7,15}$/;
  if (!data.primaryPhone?.trim() || !phoneRegex.test(data.primaryPhone.replace(/\D/g, ""))) {
    errors.push("Valid primary phone number is required (7-15 digits)");
  }

  if (data.alternatePhone && !phoneRegex.test(data.alternatePhone.replace(/\D/g, ""))) {
    errors.push("Alternate phone must contain 7-15 digits");
  }

  if (!data.username?.trim() || data.username.length < 6) {
    errors.push("Username must be at least 6 characters");
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(data.username)) {
    errors.push("Username can only contain letters, numbers, underscores, and hyphens");
  }

  if (!data.password || data.password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  if (!/[a-z]/.test(data.password)) {
    errors.push("Password must contain lowercase letter");
  }
  if (!/[A-Z]/.test(data.password)) {
    errors.push("Password must contain uppercase letter");
  }
  if (!/[0-9]/.test(data.password)) {
    errors.push("Password must contain number");
  }
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=]/.test(data.password)) {
    errors.push("Password must contain special character");
  }
  if (data.username && data.password && data.password.toLowerCase().includes(data.username.toLowerCase())) {
    errors.push("Password cannot contain username");
  }
  if (data.password !== data.confirmPassword) {
    errors.push("Passwords do not match");
  }

  if (!data.termsAccepted) {
    errors.push("Must accept terms and conditions");
  }

  if (!data.euResident || !["yes", "no"].includes(data.euResident)) {
    errors.push("EU resident status is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * 📝 Register Transfer Student
 * POST /api/transfer/register
 */
export const registerTransferStudent = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      suffix,
      email,
      emailType,
      confirmEmail,
      primaryPhone,
      primaryPhoneType,
      primaryPhoneCountry,
      alternatePhone,
      alternatePhoneType,
      alternatePhoneCountry,
      username,
      password,
      confirmPassword,
      textAuthAgreed,
      termsAccepted,
      euResident,
    } = req.body;

    // Validation
    const validation = validateTransferRegistration(req.body);
    if (!validation.isValid) {
      console.log("❌ Validation Errors:", validation.errors);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    console.log("✅ Validation passed for transfer student:", email);

    // Check if email already exists
    const existingEmail = await TransferStudent.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      console.log("⚠️ Email already registered:", email);
      return res.status(409).json({
        success: false,
        message: "This email is already registered. Please use a different email or sign in.",
      });
    }

    // Check if username already exists
    const existingUsername = await TransferStudent.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      console.log("⚠️ Username already taken:", username);
      return res.status(409).json({
        success: false,
        message: "This username is already taken. Please choose a different username.",
      });
    }

    const newStudent = new TransferStudent({
      firstName: firstName.trim(),
      middleName: middleName?.trim() || null,
      lastName: lastName.trim(),
      suffix: suffix?.trim() || null,
      email: email.toLowerCase().trim(),
      emailType,
      confirmEmail: confirmEmail.toLowerCase().trim(),
      primaryPhone: primaryPhone.replace(/\D/g, ""),
      primaryPhoneType,
      primaryPhoneCountry,
      alternatePhone: alternatePhone ? alternatePhone.replace(/\D/g, "") : null,
      alternatePhoneType,
      alternatePhoneCountry,
      username: username.toLowerCase().trim(),
      password: password,
      textAuthAgreed: textAuthAgreed || false,
      termsAccepted,
      euResident,
      accountType: "transfer-student",
    });

    await newStudent.save();

    console.log("✅ Transfer student registered:", newStudent._id);

    // 🔑 Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    newStudent.otpCode = otp;
    newStudent.otpExpiry = otpExpiry;
    await newStudent.save();

    console.log("📧 OTP generated for:", email, "OTP:", otp);

    // 📧 Send OTP via email
    const htmlContent = `
      <h2>College App - Transfer Student Verification</h2>
      <p>Hi ${firstName},</p>
      <p>Welcome to College App! Your verification code is:</p>
      <h1 style="letter-spacing: 3px; color: #2C5AA0;">${otp}</h1>
      <p>This code will expire in <b>10 minutes</b>.</p>
      <p>Please enter this code to complete your registration.</p>
      <p>If you did not request this, please ignore this email.</p>
      <br />
      <p style="color: #888; font-size: 12px;">© 2025 College App. All rights reserved.</p>
    `;

    try {
      await sendEmail(email, "College App - Transfer Student Verification Code", htmlContent);
      console.log(`📧 Email sent successfully to: ${email}`);
    } catch (emailError) {
      console.error("⚠️ Error sending email:", emailError.message);
      console.log("📧 TEST OTP FOR DEVELOPMENT:", otp);
    }

    console.log('🔑 New Student ID:', newStudent._id);
    const token = generateToken(newStudent._id, newStudent.email, newStudent.username);

    return res.status(201).json({
      success: true,
      message: "🎉 Transfer student account created! OTP sent to your email.",
      requireOtpVerification: true,
      token,
      user: {
        id: newStudent._id,
        firstName: newStudent.firstName,
        lastName: newStudent.lastName,
        email: newStudent.email,
        username: newStudent.username,
        accountType: newStudent.accountType,
      },
    });
  } catch (error) {
    console.error("❌ Error registering transfer student:", error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * 🔐 Login Transfer Student
 * POST /api/transfer/login
 */
export const loginTransferStudent = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    console.log("🔍 Attempting login for:", username);

    const student = await TransferStudent.findOne({ username: username.toLowerCase() }).select("+password");

    if (!student) {
      console.log("⚠️ Student not found:", username);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, student.password);

    if (!isPasswordValid) {
      console.log("⚠️ Invalid password for:", username);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!student.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive. Please contact support.",
      });
    }

    console.log('🔑 Student ID for token:', student._id);
    const token = generateToken(student._id, student.email, student.username);

    console.log("✅ Transfer student logged in:", username);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        username: student.username,
        accountType: student.accountType,
        isEmailVerified: student.isEmailVerified,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// ================================
// 🔐 FORGOT PASSWORD - Transfer Students
// ================================

/**
 * 1. REQUEST OTP for password reset (username-based)
 * POST /api/transfer/forgot-password/request-otp
 */
/**
 * 1. REQUEST OTP for password reset (username-based)
 * POST /api/transfer/forgot-password/request-otp
 */
export const forgotPasswordRequestOtp = async (req, res) => {
  try {
    const { username } = req.body;

    console.log("🔄 Transfer forgot password OTP request for:", username);

    if (!username) {
      return res.status(400).json({ 
        success: false, 
        message: "Username is required" 
      });
    }

    const student = await TransferStudent.findOne({ 
      username: username.toLowerCase() 
    });

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: "No transfer account found with this username. Please create an account first." 
      });
    }

    // ✅ FIX 1: Use updateOne instead of save() to avoid full validation
    await TransferStudent.updateOne(
      { _id: student._id },
      { 
        $set: { 
          otpCode: null,
          otpExpiry: null 
        }
      }
    );

    // Generate new OTP (10 min expiry)
    const otpCode = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // ✅ FIX 2: Use updateOne again - ONLY update OTP fields
    await TransferStudent.updateOne(
      { _id: student._id },
      { 
        $set: { 
          otpCode,
          otpExpiry 
        }
      }
    );

    console.log(`🔢 New OTP generated for ${student.email}: ${otpCode}`);

    // Send OTP email
    const htmlContent = `
      <h2>Password Reset Code</h2>
      <p>Hi ${student.firstName || 'there'},</p>
      <p>You requested to reset your password. Your code is:</p>
      <h1 style="letter-spacing: 3px;">${otpCode}</h1>
      <p>This code expires in <b>10 minutes</b>.</p>
      <p>If you did not request this, please ignore this email.</p>
    `;

    await sendEmail(student.email, "College App - Reset Your Password", htmlContent);

    console.log(`✅ Password reset OTP sent to: ${student.email}`);
    
    res.status(200).json({ 
      success: true, 
      message: "OTP has been sent to your registered email." 
    });

  } catch (error) {
    console.error("❌ Transfer forgot password OTP error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error sending OTP" 
    });
  }
};


/**
 * 2. RESET PASSWORD after OTP verification
 * POST /api/transfer/forgot-password/reset
 */
export const forgotPasswordReset = async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;

    console.log("🔄 Transfer password reset attempt for:", username);

    if (!username || !password || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "Username, password, and confirmPassword are required" 
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "Passwords do not match" 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must be at least 8 characters" 
      });
    }

    const student = await TransferStudent.findOne({ 
      username: username.toLowerCase() 
    });

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: "Transfer student not found" 
      });
    }

    // Generate & return JWT (auto-login)
    const token = generateToken(student._id, student.email, student.username);

    // ✅ FIXED: Single updateOne replaces TWO save() calls
    await TransferStudent.updateOne(
      { _id: student._id },
      { 
        $set: { 
          password: password,  // bcrypt middleware will hash automatically
          otpCode: null,
          otpExpiry: null 
        }
      }
    );

    console.log(`✅ Transfer password reset successful for: ${username}`);

    const studentResponse = {
      id: student._id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      username: student.username,
      accountType: student.accountType,
      hasCompletedExtendedProfile: student.hasCompletedExtendedProfile || false
    };

    res.status(200).json({ 
      success: true, 
      message: "Password reset successful. You are now logged in.",
      token,
      user: studentResponse 
    });

  } catch (error) {
    console.error("❌ Transfer password reset error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error resetting password" 
    });
  }
};


/**
 * 3. UPDATE verifyOTP to handle password reset OTPs
 * POST /api/transfer/verify-otp (for password reset)
 */
/**
 * 3. UPDATE verifyOTP to handle password reset OTPs
 * POST /api/transfer/forgot-password/verify-otp (for password reset)
 */
export const verifyOTPForPasswordReset = async (req, res) => {
  try {
    const { username, otp } = req.body;

    if (!username || !otp) {
      return res.status(400).json({
        success: false,
        message: "Username and OTP are required",
      });
    }

    const student = await TransferStudent.findOne({ 
      username: username.toLowerCase() 
    }).select("+otpCode +otpExpiry");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Transfer student not found",
      });
    }

    if (student.otpCode !== otp) {
      console.log("⚠️ Invalid OTP attempt for:", username);
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (new Date() > student.otpExpiry) {
      console.log("⚠️ OTP expired for:", username);
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    // ✅ FIXED: Use updateOne instead of save()
    await TransferStudent.updateOne(
      { _id: student._id },
      { 
        $set: { 
          otpCode: null,
          otpExpiry: null 
        }
      }
    );

    console.log("✅ Transfer OTP verified successfully for:", username);
    return res.status(200).json({
      success: true,
      message: "Password reset OTP verified successfully. You can now reset your password.",
      otpValid: true,
    });
  } catch (error) {
    console.error("❌ Error verifying transfer OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Error verifying OTP",
    });
  }
};


/**
 * 👤 Get Current Transfer Student Profile (using JWT token)
 * GET /api/transfer/profile
 */
export const getCurrentTransferStudentProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    console.log('📥 Fetching current transfer student profile...');
    console.log('🔑 User ID from token:', userId);

    if (!userId) {
      console.warn('⚠️ No user ID in token');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No user ID found',
      });
    }

    const student = await TransferStudent.findById(userId);

    if (!student) {
      console.log('⚠️ Transfer student not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'Transfer student not found',
      });
    }

    console.log('✅ Profile fetched for:', student.firstName, student.lastName);

    // Calculate profile progress
    const profileProgress = calculateProfileProgress(student);

    return res.status(200).json({
      success: true,
      account: student,
      profileProgress: profileProgress,
    });
  } catch (error) {
    console.error('❌ Error fetching current profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * 💾 Update Current Transfer Student Profile (using JWT token)
 * PUT /api/transfer/profile
 */
export const updateCurrentTransferStudentProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    console.log('💾 Updating current transfer student profile...');
    console.log('🔑 User ID from token:', userId);
    console.log('📦 Update data keys:', Object.keys(req.body));

    if (!userId) {
      console.warn('⚠️ No user ID in token');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No user ID found',
      });
    }

    // ✅ IMPROVED: Better error handling and validation
    try {
      // Update student with all provided fields
      const updatedStudent = await TransferStudent.findByIdAndUpdate(
        userId,
        { $set: req.body },
        { 
          new: true, 
          runValidators: false, // ✅ Changed to false to avoid validation errors on optional fields
          strict: false // ✅ Allow fields not explicitly in schema
        }
      );

      if (!updatedStudent) {
        console.log('⚠️ Transfer student not found:', userId);
        return res.status(404).json({
          success: false,
          message: 'Transfer student not found',
        });
      }

      console.log('✅ Profile updated for:', updatedStudent.firstName, updatedStudent.lastName);

      // Calculate updated profile progress
      const profileProgress = calculateProfileProgress(updatedStudent);

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        account: updatedStudent,
        progress: {
          profile: profileProgress
        },
      });
    } catch (updateError) {
      console.error('❌ MongoDB update error:', updateError);
      console.error('   Error name:', updateError.name);
      console.error('   Error message:', updateError.message);
      
      // Handle specific MongoDB errors
      if (updateError.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error: ' + updateError.message,
          error: process.env.NODE_ENV === 'development' ? updateError.message : undefined,
        });
      }
      
      if (updateError.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid data format',
          error: process.env.NODE_ENV === 'development' ? updateError.message : undefined,
        });
      }
      
      throw updateError; // Re-throw to outer catch
    }
  } catch (error) {
    console.error('❌ Error updating current profile:', error);
    console.error('   Stack trace:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * 📊 Helper: Calculate profile completion progress
 */
const calculateProfileProgress = (student) => {
  let completedFields = 0;
  let totalFields = 0;

  // Personal Information (5 required fields)
  const personalFields = ['firstName', 'lastName', 'birthDate', 'phone', 'email'];
  personalFields.forEach(field => {
    totalFields++;
    if (student[field]) completedFields++;
  });

  // Contact Details (4 fields)
  const contactFields = ['addressLine1', 'city', 'state', 'zipCode'];
  contactFields.forEach(field => {
    totalFields++;
    if (student[field]) completedFields++;
  });

  // Demographics (3 fields)
  const demoFields = ['gender', 'legalSex', 'citizenshipStatus'];
  demoFields.forEach(field => {
    totalFields++;
    if (student[field]) completedFields++;
  });

  // Language (1 field)
  totalFields++;
  if (student.languages && student.languages.length > 0) completedFields++;

  // Calculate percentage
  const progress = Math.round((completedFields / totalFields) * 100);

  console.log(`📊 Profile progress: ${completedFields}/${totalFields} = ${progress}%`);

  return progress;
};

/**
 * 👤 Get Transfer Student Profile by ID
 * GET /api/transfer/profile/:id
 */
export const getTransferStudentProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      console.warn("⚠️ Invalid id:", id);
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    const student = await TransferStudent.findById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Transfer student not found",
      });
    }

    console.log("✅ Profile fetched for:", id);

    return res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error("❌ Error fetching profile:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching profile",
    });
  }
};

/**
 * ✏️ Update Transfer Student Profile by ID
 * PUT /api/transfer/profile/:id
 */
export const updateTransferStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const allowedFields = [
      "middleName",
      "suffix",
      "alternatePhone",
      "alternatePhoneType",
      "alternatePhoneCountry",
      "textAuthAgreed",
      "collegeCredits",
      "bornBefore2003",
      "degreeStatus",
      "communityCollege",
      "degreeGoal",
      "militaryStatus",
    ];

    const filteredData = {};
    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });

    const student = await TransferStudent.findByIdAndUpdate(id, filteredData, {
      new: true,
      runValidators: true,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Transfer student not found",
      });
    }

    console.log("✅ Transfer student updated:", id);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: student,
    });
  } catch (error) {
    console.error("❌ Error updating student:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating profile",
    });
  }
};

/**
 * 🗑️ Delete Transfer Student Account
 * DELETE /api/transfer/profile/:id
 */
export const deleteTransferStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await TransferStudent.findByIdAndDelete(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Transfer student not found",
      });
    }

    console.log("✅ Transfer student deleted:", id);

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
      data: student,
    });
  } catch (error) {
    console.error("❌ Error deleting student:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting account",
    });
  }
};

/**
 * 📊 Get All Transfer Students (Admin Only)
 * GET /api/transfer/admin/all
 */
export const getAllTransferStudents = async (req, res) => {
  try {
    console.log("📋 Fetching all transfer students...");
    const students = await TransferStudent.find({ accountType: "transfer-student" });

    return res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    console.error("❌ Error fetching students:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching transfer students",
    });
  }
};

/**
 * 🔑 Send OTP for Email Verification
 * POST /api/transfer/send-otp
 */
export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const student = await TransferStudent.findOne({ email: email.toLowerCase() });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Transfer student not found",
      });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    student.otpCode = otp;
    student.otpExpiry = otpExpiry;
    await student.save();

    console.log("📧 OTP resent to:", email, "OTP:", otp);

    const htmlContent = `
      <h2>College App - Verification Code</h2>
      <p>Your verification code is:</p>
      <h1 style="letter-spacing: 3px; color: #2C5AA0;">${otp}</h1>
      <p>This code will expire in <b>10 minutes</b>.</p>
    `;

    try {
      await sendEmail(email, "College App - Your OTP", htmlContent);
      console.log(`📧 OTP resent successfully to: ${email}`);
    } catch (emailError) {
      console.error("⚠️ Error resending email:", emailError.message);
      console.log("📧 TEST OTP FOR DEVELOPMENT:", otp);
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      testOTP: process.env.NODE_ENV === "development" ? otp : undefined,
    });
  } catch (error) {
    console.error("❌ Error sending OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Error sending OTP",
    });
  }
};

/**
 * ✔️ Verify OTP (for email verification - kept separate from password reset OTP)
 * POST /api/transfer/verify-otp
 */
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const student = await TransferStudent.findOne({ email: email.toLowerCase() }).select("+otpCode +otpExpiry");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Transfer student not found",
      });
    }

    if (student.otpCode !== otp) {
      console.log("⚠️ Invalid OTP attempt for:", email);
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (new Date() > student.otpExpiry) {
      console.log("⚠️ OTP expired for:", email);
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    student.isEmailVerified = true;
    student.otpCode = null;
    student.otpExpiry = null;
    await student.save();

    console.log("✅ Email verified for:", email);

    return res.status(200).json({
      success: true,
      message: "✅ Email verified successfully! You can now login.",
      isEmailVerified: true,
    });
  } catch (error) {
    console.error("❌ Error verifying OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Error verifying OTP",
    });
  }
};
