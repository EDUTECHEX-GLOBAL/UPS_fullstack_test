import express from "express";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import Account from "../models/accountModel.js";
import Admin from "../models/Admin.js";
import { authenticateAdmin } from "../middleware/adminAuthMiddleware.js";
import { sendAccountApprovalEmail } from "../utils/sendEmail.js";
const router = express.Router();
console.log("✅ Public impersonate-from-signin route loaded");
const ALLOWED_ADMIN_EMAIL = "edutechexcollege@gmail.com";
// Public SignIn Admin Assist endpoint. Admin identity is verified with email/password below.
router.post("/impersonate-from-signin", async (req, res) => {
  try {
    console.log("✅ Hit public impersonate-from-signin route");
    const adminEmail = String(req.body.adminEmail || "").trim().toLowerCase();
    const adminPassword = String(req.body.adminPassword || "");
    const userEmail = String(req.body.userEmail || "").trim().toLowerCase();
    if (!adminEmail || !adminPassword || !userEmail) {
      return res.status(400).json({
        success: false,
        message: "Admin email, admin password, and student email are required",
      });
    }
    if (adminEmail !== ALLOWED_ADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        message: "This email is not authorized for admin access.",
      });
    }
    const admin = await Admin.findOne({ email: adminEmail });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin account not found.",
      });
    }
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Admin account is inactive.",
      });
    }
    const isAdminPasswordValid = await admin.comparePassword(adminPassword);
    if (!isAdminPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials.",
      });
    }
    const student = await Account.findOne({ email: userEmail }).select("-password");
    if (!student) {
      return res.status(404).json({ success: false, message: "Student email does not exist" });
    }
    if (student.role !== "student") {
      return res.status(400).json({
        success: false,
        message: "Admin Assist is only available for student accounts",
      });
    }
    const jwtSecret = process.env.JWT_SECRET || "your-secret-key-change-in-production";
    const token = jwt.sign(
      {
        userId: student._id,
        email: student.email,
        studentType: student.studentType,
        impersonated: true,
        assistedBy: admin.email,
        assistedByAdminId: admin._id,
      },
      jwtSecret,
      { expiresIn: "20m" }
    );
    res.status(200).json({
      success: true,
      message: "Admin Assist login successful",
      token,
      user: student,
    });
  } catch (error) {
    console.error("Admin Assist from SignIn error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start Admin Assist login",
    });
  }
});
// 🛡️ Protect all remaining admin routes
router.use(authenticateAdmin);
// Validation middleware
const validateUser = (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;
  if (req.method === "POST" || req.method === "PUT") {
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ success: false, message: "First name, last name and email are required" });
    }
    if (req.method === "POST" && !password) {
      return res.status(400).json({ success: false, message: "Password is required for new users" });
    }
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address" });
    }
  }
  next();
};
// Validation for status update
const validateStatus = (req, res, next) => {
  const { status } = req.body;
  const validStatuses = ['active', 'inactive', 'suspended', 'pending']; // Added 'pending'
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ 
      success: false, 
      message: "Valid status is required (active, inactive, suspended, or pending)" 
    });
  }
  next();
};
// Validation for role update
const validateRole = (req, res, next) => {
  const { role } = req.body;
  const validRoles = ['student', 'admin', 'moderator']; // Changed 'user' to 'student'
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ 
      success: false, 
      message: "Valid role is required (student, admin, or moderator)" 
    });
  }
  next();
};

// Admin creates a student login using the student's own name and email.
// The generated password is returned only in this response for one-time sharing.
router.post("/create-student", async (req, res) => {
  try {
    const firstName = String(req.body?.firstName || "").trim();
    const lastName = String(req.body?.lastName || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ success: false, message: "Student first name, last name, and email are required." });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid student email address." });
    }
    if (await Account.exists({ email })) {
      return res.status(409).json({ success: false, message: "An account already exists with this email address." });
    }

    const password = crypto.randomBytes(18).toString("base64url");
    const student = await Account.create({
      firstName,
      lastName,
      email,
      password,
      role: "student",
      studentType: "first-year",
      status: "active",
      isVerified: true,
      isApprovedByAdmin: true,
    });
    const user = student.toObject();
    delete user.password;
    return res.status(201).json({
      success: true,
      message: "Student account created.",
      user,
      credentials: { email, password },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "An account already exists with this email address." });
    }
    if (error?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Admin create student error:", error);
    return res.status(500).json({ success: false, message: "Failed to create student account." });
  }
});

// =======================================
// 👥 ADMIN USER ROUTES
// =======================================
// Get all users with filtering - UPDATED
router.get("/", async (req, res) => {
  try {
    const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(req.query.limit, 10) || 20, 1);
    const { search, role, status } = req.query;
    // Build independent filters so search OR conditions can coexist with status filters.
    const filters = [];
    if (search) {
      filters.push({ $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ] });
    }
    if (role && role !== 'all') {
      filters.push({ role: role === "user" ? "student" : role });
    }
    if (status === 'pending') {
      filters.push({ $or: [
        { status: 'pending' },
        { status: 'inactive' },
        { role: 'student', status: 'active', isApprovedByAdmin: { $ne: true } },
      ] });
    } else if (status === 'active') {
      filters.push({ status: 'active', isApprovedByAdmin: true });
    } else if (status && status !== 'all') {
      filters.push({ status });
    }
    const filter = filters.length ? { $and: filters } : {};
    const skip = (pageNum - 1) * limitNum;
    const [
      users,
      filteredTotal,
      totalUsers,
      activeUsers,
      adminUsers,
      inactiveUsers,
      pendingApprovalUsers,
      suspendedUsers,
    ] = await Promise.all([
      Account.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Account.countDocuments(filter),
      Account.countDocuments(),
      Account.countDocuments({ status: 'active', isApprovedByAdmin: true }),
      Account.countDocuments({ role: 'admin' }),
      Account.countDocuments({ status: 'inactive' }),
      Account.countDocuments({
        isApprovedByAdmin: false,
        isVerified: true,
        status: { $in: ['pending', 'active'] }
      }),
      Account.countDocuments({ status: 'suspended' }),
    ]);
    const totalPages = Math.max(1, Math.ceil(filteredTotal / limitNum));
    res.status(200).json({ 
      success: true, 
      count: users.length, 
      data: users,
      users,
      stats: {
        totalUsers,
        activeUsers,
        adminUsers,
        inactiveUsers,
        pendingApprovalUsers,
        suspendedUsers
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredTotal,
        totalPages,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error("❌ Admin get users error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});
// Create new user - UPDATED
router.post("/", validateUser, async (req, res) => {
  try {
    const { firstName, lastName, email, password, studentType, role = 'student', status = 'active' } = req.body;
    const existingUser = await Account.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(409).json({ success: false, message: "Email already exists" });
    const newUser = await Account.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      studentType: studentType || "first-year",
      role,
      status,
      isVerified: true,
      isApprovedByAdmin: true // Auto-approve admin-created users
    });
    const userResponse = newUser.toObject();
    delete userResponse.password;
    // Calculate updated statistics
    const totalUsers = await Account.countDocuments();
    const activeUsers = await Account.countDocuments({ 
      status: 'active',
      isApprovedByAdmin: true 
    });
    const adminUsers = await Account.countDocuments({ role: 'admin' });
    res.status(201).json({ 
      success: true, 
      message: "User created successfully", 
      user: userResponse,
      stats: {
        totalUsers,
        activeUsers,
        adminUsers
      }
    });
  } catch (error) {
    console.error("❌ Admin create user error:", error);
    res.status(500).json({ success: false, message: "Failed to create user" });
  }
});
// Update user (general update) - UPDATED
router.put("/:id", validateUser, async (req, res) => {
  try {
    const { firstName, lastName, email, role, status } = req.body;
    const updateData = {
      firstName,
      lastName,
      email: email.toLowerCase()
    };
    // Add role and status if provided
    if (role) updateData.role = role;
    if (status) {
      if (status === 'active') {
        const existingUser = await Account.findById(req.params.id).select('isApprovedByAdmin');
        if (!existingUser) return res.status(404).json({ success: false, message: "User not found" });
        if (!existingUser.isApprovedByAdmin) {
          return res.status(409).json({ success: false, message: "Approve this student before activating the account." });
        }
      }
      updateData.status = status;
    }
    const updatedUser = await Account.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");
    if (!updatedUser) return res.status(404).json({ success: false, message: "User not found" });

    // Calculate updated statistics
    const totalUsers = await Account.countDocuments();
    const activeUsers = await Account.countDocuments({ 
      status: 'active',
      isApprovedByAdmin: true 
    });
    const adminUsers = await Account.countDocuments({ role: 'admin' });
    res.status(200).json({ 
      success: true, 
      message: "User updated successfully", 
      user: updatedUser,
      stats: {
        totalUsers,
        activeUsers,
        adminUsers
      }
    });
  } catch (error) {
    console.error("❌ Admin update user error:", error);
    res.status(500).json({ success: false, message: "Failed to update user" });
  }
});
// Update user status - UPDATED ENDPOINT
router.patch("/:id/status", validateStatus, async (req, res) => {
  try {
    const { status } = req.body;
    if (status === 'active') {
      const existingUser = await Account.findById(req.params.id).select('isApprovedByAdmin');
      if (!existingUser) return res.status(404).json({ success: false, message: "User not found" });
      if (!existingUser.isApprovedByAdmin) {
        return res.status(409).json({ success: false, message: "Approve this student before activating the account." });
      }
    }
    const updateData = { status };
    const updatedUser = await Account.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select("-password");
    if (!updatedUser) return res.status(404).json({ success: false, message: "User not found" });
    // Calculate updated statistics
    const totalUsers = await Account.countDocuments();
    const activeUsers = await Account.countDocuments({ 
      status: 'active',
      isApprovedByAdmin: true 
    });
    const adminUsers = await Account.countDocuments({ role: 'admin' });
    res.status(200).json({ 
      success: true, 
      message: `User status updated to ${status} successfully`, 
      user: updatedUser,
      stats: {
        totalUsers,
        activeUsers,
        adminUsers
      }
    });
  } catch (error) {
    console.error("❌ Admin update user status error:", error);
    res.status(500).json({ success: false, message: "Failed to update user status" });
  }
});
// Update user role - UPDATED ENDPOINT
router.patch("/:id/role", validateRole, async (req, res) => {
  try {
    const { role } = req.body;
    const updatedUser = await Account.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");
    if (!updatedUser) return res.status(404).json({ success: false, message: "User not found" });
    // Calculate updated statistics
    const totalUsers = await Account.countDocuments();
    const activeUsers = await Account.countDocuments({ 
      status: 'active',
      isApprovedByAdmin: true 
    });
    const adminUsers = await Account.countDocuments({ role: 'admin' });
    res.status(200).json({ 
      success: true, 
      message: `User role updated to ${role} successfully`, 
      user: updatedUser,
      stats: {
        totalUsers,
        activeUsers,
        adminUsers
      }
    });
  } catch (error) {
    console.error("❌ Admin update user role error:", error);
    res.status(500).json({ success: false, message: "Failed to update user role" });
  }
});
// Approve user - UPDATED ENDPOINT (FIXED THE BUG)
router.patch("/:id/approve", async (req, res) => {
  try {
    const updatedUser = await Account.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'active', 
        isApprovedByAdmin: true // 🔥 THIS IS THE CRITICAL FIX
      },
      { new: true }
    ).select("-password");
    if (!updatedUser) return res.status(404).json({ success: false, message: "User not found" });

    // Send approval notification email to student
    try {
      const studentName = `${updatedUser.firstName || ""} ${updatedUser.lastName || ""}`.trim() || "Student";
      await sendAccountApprovalEmail({
        to: updatedUser.email,
        studentName,
      });
      console.log(`✅ Approval email successfully sent to student: ${updatedUser.email}`);
    } catch (emailErr) {
      console.error(`⚠️ Failed to send approval email to student ${updatedUser.email}:`, emailErr.message);
    }
    // Calculate updated statistics
    const totalUsers = await Account.countDocuments();
    const activeUsers = await Account.countDocuments({ 
      status: 'active',
      isApprovedByAdmin: true 
    });
    const adminUsers = await Account.countDocuments({ role: 'admin' });
    const pendingApprovalUsers = await Account.countDocuments({ 
      isApprovedByAdmin: false,
      isVerified: true,
      status: { $in: ['pending', 'active'] }
    });
    res.status(200).json({ 
      success: true, 
      message: "User approved successfully", 
      user: updatedUser,
      stats: {
        totalUsers,
        activeUsers,
        adminUsers,
        pendingApprovalUsers
      }
    });
  } catch (error) {
    console.error("❌ Admin approve user error:", error);
    res.status(500).json({ success: false, message: "Failed to approve user" });
  }
});
// Bulk approve users - NEW ENDPOINT
router.post("/bulk-approve", async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "User IDs array is required" 
      });
    }
    const usersToApprove = await Account.find({ _id: { $in: userIds } }).select("firstName lastName email");
    const result = await Account.updateMany(
      { _id: { $in: userIds } },
      { 
        status: 'active',
        isApprovedByAdmin: true 
      }
    );
    // Calculate updated statistics
    const totalUsers = await Account.countDocuments();
    const activeUsers = await Account.countDocuments({ 
      status: 'active',
      isApprovedByAdmin: true 
    });
    const adminUsers = await Account.countDocuments({ role: 'admin' });
    const pendingApprovalUsers = await Account.countDocuments({ 
      isApprovedByAdmin: false,
      isVerified: true,
      status: { $in: ['pending', 'active'] }
    });
    res.status(200).json({ 
      success: true, 
      message: `${result.modifiedCount} users approved successfully`,
      stats: {
        totalUsers,
        activeUsers,
        adminUsers,
        pendingApprovalUsers
      },
      modifiedCount: result.modifiedCount
    });

    // Send bulk approval notification emails in background
    Promise.allSettled(
      usersToApprove.map(user => {
        const studentName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Student";
        return sendAccountApprovalEmail({
          to: user.email,
          studentName,
        });
      })
    ).then(results => {
      const sent = results.filter(r => r.status === "fulfilled").length;
      console.log(`✅ Bulk approval emails sent: ${sent}/${usersToApprove.length}`);
    }).catch(err => {
      console.error("⚠️ Bulk approval email error:", err.message);
    });
  } catch (error) {
    console.error("❌ Bulk approve users error:", error);
    res.status(500).json({ success: false, message: "Failed to approve users" });
  }
});
// Get user statistics - NEW ENDPOINT
router.get("/stats/summary", async (req, res) => {
  try {
    const stats = {
      totalUsers: await Account.countDocuments(),
      activeUsers: await Account.countDocuments({ 
        status: 'active',
        isApprovedByAdmin: true 
      }),
      adminUsers: await Account.countDocuments({ role: 'admin' }),
      pendingApprovalUsers: await Account.countDocuments({ 
        isApprovedByAdmin: false,
        isVerified: true,
        status: { $in: ['pending', 'active'] }
      }),
      suspendedUsers: await Account.countDocuments({ status: 'suspended' }),
      inactiveUsers: await Account.countDocuments({ status: 'inactive' }),
      firstYearStudents: await Account.countDocuments({ studentType: 'first-year' }),
      transferStudents: await Account.countDocuments({ studentType: 'transfer' }),
      unverifiedUsers: await Account.countDocuments({ isVerified: false })
    };
    res.status(200).json({ 
      success: true, 
      stats 
    });
  } catch (error) {
    console.error("❌ Get stats error:", error);
    res.status(500).json({ success: false, message: "Failed to get statistics" });
  }
});

// Create or refresh one development student account for exercising the
// application flow. This only touches the reserved sample account.
router.post("/seed", async (req, res) => {
  try {
    const email = "sample.student@edutechex.test";
    const password = "Sample@12345";
    let user = await Account.findOne({ email });
    const wasCreated = !user;

    if (!user) {
      user = new Account({ email });
    }
    user.firstName = "Sample";
    user.lastName = "Student";
    user.password = password;
    user.studentType = "first-year";
    user.role = "student";
    user.status = "active";
    user.isVerified = true;
    user.isApprovedByAdmin = true;
    user.agreeToTerms = true;
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    const [totalUsers, activeUsers, adminUsers] = await Promise.all([
      Account.countDocuments(),
      Account.countDocuments({ status: "active", isApprovedByAdmin: true }),
      Account.countDocuments({ role: "admin" }),
    ]);

    res.status(201).json({
      success: true,
      message: wasCreated ? "Sample student account created" : "Sample student account reset and ready to use",
      count: wasCreated ? 1 : 0,
      user: userResponse,
      credentials: { email, password },
      stats: { totalUsers, activeUsers, adminUsers },
    });
  } catch (error) {
    console.error("Admin seed users error:", error);
    res.status(500).json({ success: false, message: "Failed to create sample student accounts" });
  }
});

// ==========================================
// Medical Users Management
// ==========================================
// @route   GET /api/admin/users/medical-users
// @desc    Get all medical users
// @access  Private/Admin
router.get("/medical-users", async (req, res) => {
  try {
    const { search, status, page = 1, limit = 12 } = req.query;
    // Build filter object
    const filter = {};
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    // Pagination
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;
    // Only fetch necessary fields
    const users = await MedicalAccount.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);
    const total = await MedicalAccount.countDocuments(filter);
    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page: pageNumber,
        pages: Math.ceil(total / limitNumber),
        limit: limitNumber
      }
    });
  } catch (error) {
    console.error('Error fetching medical users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medical users',
      error: error.message
    });
  }
});
// @route   PATCH /api/admin/users/medical-users/:id/status
// @desc    Update medical user status (Approve/Reject)
// @access  Private/Admin
router.patch("/medical-users/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be approve or reject.' });
    }
    const user = await MedicalAccount.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Medical user not found' });
    }
    if (action === 'approve') {
      user.isApproved = true;
      user.status = 'Approved';
      try {
        const medName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'User';
        await sendAccountApprovalEmail({
          to: user.email,
          studentName: medName,
        });
        console.log(`✅ Medical user approval email sent to: ${user.email}`);
      } catch (medErr) {
        console.error('⚠️ Medical user approval email error:', medErr.message);
      }
    } else if (action === 'reject') {
      user.isApproved = false;
      user.status = 'Rejected';
    }
    await user.save();
    res.status(200).json({
      success: true,
      message: `Medical user has been ${user.status.toLowerCase()}.`,
      data: {
        _id: user._id,
        status: user.status,
        isApproved: user.isApproved
      }
    });
  } catch (error) {
    console.error('Error updating medical user status:', error);
    res.status(500).json({ success: false, message: 'Server error updating status', error: error.message });
  }
});
// Keep parameter routes after every static GET route so values such as
// "stats" are never interpreted as MongoDB user IDs.
router.get("/:id", async (req, res) => {
  try {
    const user = await Account.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    // Add virtual properties to response
    const userObj = user.toObject();
    userObj.formattedJoinDate = user.formattedJoinDate;
    userObj.formattedLastLogin = user.formattedLastLogin;
    res.status(200).json({ success: true, user: userObj });
  } catch (error) {
    console.error("❌ Admin get user by ID error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch user" });
  }
});
// Delete user
router.delete("/:id", async (req, res) => {
  try {
    const deletedUser = await Account.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ success: false, message: "User not found" });
    // Calculate updated statistics
    const totalUsers = await Account.countDocuments();
    const activeUsers = await Account.countDocuments({ 
      status: 'active',
      isApprovedByAdmin: true 
    });
    const adminUsers = await Account.countDocuments({ role: 'admin' });
    res.status(200).json({ 
      success: true, 
      message: "User deleted successfully",
      stats: {
        totalUsers,
        activeUsers,
        adminUsers
      }
    });
  } catch (error) {
    console.error("❌ Admin delete user error:", error);
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
});
export default router;
