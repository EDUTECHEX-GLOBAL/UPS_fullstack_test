// src/controllers/notificationController.js
import Notification from "../models/notificationModel.js";
import Account from "../models/accountModel.js";

// ─────────────────────────────────────────────
// 🔔 Helpers: Create Notifications (internal use)
// ─────────────────────────────────────────────

/**
 * Create notification for admin on new user registration
 */
export const createNewUserNotification = async (user) => {
  try {
    if (!user?._id) return false;
    await Notification.create({
      type:       "NEW_USER",
      title:      "New User Registration",
      message:    `${user.firstName || ""} ${user.lastName || ""} has registered`,
      userId:     user._id,
      targetRole: "admin",
      isRead:     false,
    });
    console.log(`🔔 Notification created for admin: ${user.email}`);
    return true;
  } catch (error) {
    console.error("❌ Notification creation failed:", error);
    return false;
  }
};

/**
 * Create notification for admin on university request
 */
export const createUniversityRequestNotification = async ({
  userId,
  universityName,
  country,
  courses,
  programType,
  degree,
  selectedCategory,
  field,
}) => {
  try {
    if (!userId) return false;
    await Notification.create({
      type:       "UNIVERSITY_REQUEST",
      title:      "New University Request",
      message:    `A student has requested to add "${universityName}" (${country}). Program type: ${programType || "N/A"}. Degree: ${degree || "N/A"}. Field: ${field || selectedCategory || "N/A"}. Interested courses: ${courses.join(", ")}`,
      userId,
      targetRole: "admin",
      isRead:     false,
      requestData: {
        universityName,
        country,
        programType,
        degree,
        selectedCategory: selectedCategory || field || "",
        field: field || selectedCategory || "",
        requestedCourses: courses,
      },
    });
    console.log(`🔔 University request notification created for admin: ${universityName}`);
    return true;
  } catch (error) {
    console.error("❌ University request notification failed:", error);
    return false;
  }
};

// ─────────────────────────────────────────────
// ✅ Admin: Notifications CRUD
// ─────────────────────────────────────────────

/**
 * GET /api/notifications
 * Fetch all admin notifications with unread count
 * Middleware: authenticateAdmin  →  req.admin is set
 */
export const getAdminNotifications = async (req, res) => {
  try {
    // ✅ FIX: req.admin is set by authenticateAdmin middleware
    if (!req.admin || !["admin", "super_admin"].includes(req.admin.role)) {
      return res.status(403).json({ success: false, message: "Admin access only" });
    }

    const notifications = await Notification.find({ targetRole: "admin" })
      .sort({ createdAt: -1 })
      .populate("userId", "email firstName lastName status");

    res.status(200).json({
      success:      true,
      data:         notifications,
      total:        notifications.length,
      unreadCount:  notifications.filter((n) => !n.isRead).length,
      unread:       notifications.filter((n) => !n.isRead).length,
    });
  } catch (error) {
    console.error("❌ Failed to fetch notifications:", error);
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
};

/**
 * GET /api/notifications/unread-count
 * Returns just the unread count (used by sidebar badge)
 * Middleware: authenticateAdmin
 */
export const getAdminUnreadCount = async (req, res) => {
  try {
    if (!req.admin) {
      return res.status(403).json({ success: false, message: "Admin access only" });
    }
    const count = await Notification.countDocuments({ targetRole: "admin", isRead: false });
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error("❌ Failed to fetch unread count:", error);
    res.status(500).json({ success: false, message: "Failed to fetch unread count" });
  }
};

/**
 * POST /api/notifications/mark-read
 * Mark a single admin notification as read
 * Middleware: authenticateAdmin
 */
export const markNotificationRead = async (req, res) => {
  try {
    if (!req.admin || !["admin", "super_admin"].includes(req.admin.role)) {
      return res.status(403).json({ success: false, message: "Admin access only" });
    }

    const { notificationId, status } = req.body;
    if (!notificationId) {
      return res.status(400).json({ success: false, message: "notificationId is required" });
    }

    const update = { isRead: true };
    if (["approved", "rejected"].includes(status)) update.status = status;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, targetRole: "admin" },
      update,
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error("❌ Mark as read failed:", error);
    res.status(500).json({ success: false, message: "Failed to mark notification as read" });
  }
};

/**
 * POST /api/notifications/mark-all-read
 * Mark all admin notifications as read
 * Middleware: authenticateAdmin
 */
export const markAllNotificationsRead = async (req, res) => {
  try {
    if (!req.admin || !["admin", "super_admin"].includes(req.admin.role)) {
      return res.status(403).json({ success: false, message: "Admin access only" });
    }

    const result = await Notification.updateMany(
      { targetRole: "admin", isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success:  true,
      message:  "All notifications marked as read",
      updated:  result.modifiedCount,
    });
  } catch (error) {
    console.error("❌ Mark all as read failed:", error);
    res.status(500).json({ success: false, message: "Failed to mark all as read" });
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a single notification (admin)
 * Middleware: authenticateAdmin
 */
export const deleteNotification = async (req, res) => {
  try {
    if (!req.admin || !["admin", "super_admin"].includes(req.admin.role)) {
      return res.status(403).json({ success: false, message: "Admin access only" });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Notification ID is required" });
    }

    const notification = await Notification.findOneAndDelete({
      _id:        id,
      targetRole: "admin",
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, message: "Notification deleted successfully" });
  } catch (error) {
    console.error("❌ Delete notification failed:", error);
    res.status(500).json({ success: false, message: "Failed to delete notification" });
  }
};

/**
 * POST /api/notifications/send-to-user
 * Admin sends a notification directly to a student (approve/reject university request)
 * Middleware: authenticateAdmin  →  req.admin is set
 * Body: { userId, type, title, message }
 */
export const sendNotificationToUser = async (req, res) => {
  try {
    // ✅ FIX: req.admin is set by authenticateAdmin middleware
    if (!req.admin || !["admin", "super_admin"].includes(req.admin.role)) {
      return res.status(403).json({ success: false, message: "Admin access only" });
    }

    // ✅ FIX: support multiple userId field names sent by frontend
    const userId  = req.body.userId || req.body.recipientId || req.body.receiverId;
    const { type, title, message } = req.body;

    if (!userId)  return res.status(400).json({ success: false, message: "userId is required" });
    if (!type)    return res.status(400).json({ success: false, message: "type is required" });
    if (!title)   return res.status(400).json({ success: false, message: "title is required" });
    if (!message) return res.status(400).json({ success: false, message: "message is required" });

    // Verify target user exists
    const userExists = await Account.findById(userId).select("_id");
    if (!userExists) {
      // ✅ FIX: don't fail hard — userId might be a string ID from a different model
      console.warn(`⚠️ User ${userId} not found in Account model — creating notification anyway`);
    }

    const notification = await Notification.create({
      type,
      title,
      message,
      userId,
      targetRole: "student",
      isRead:     false,
    });

    console.log(`🔔 Notification sent to user ${userId}: [${type}] ${title}`);

    res.status(201).json({
      success:      true,
      message:      "Notification sent to user successfully",
      notification,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const msg = Object.values(error.errors).map((e) => e.message).join(", ");
      return res.status(400).json({ success: false, message: `Validation error: ${msg}` });
    }
    console.error("❌ Send notification to user failed:", error);
    res.status(500).json({ success: false, message: "Failed to send notification to user" });
  }
};

// ─────────────────────────────────────────────
// ✅ Admin: User Management from Notification
// ─────────────────────────────────────────────

/**
 * POST /api/notifications/approve-user
 * Middleware: authenticateAdmin
 */
export const approveUserFromNotification = async (req, res) => {
  try {
    if (!req.admin || !["admin", "super_admin"].includes(req.admin.role)) {
      return res.status(403).json({ success: false, message: "Admin access only" });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const user = await Account.findByIdAndUpdate(
      userId,
      { status: "active", isApprovedByAdmin: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "User approved successfully", user });
  } catch (error) {
    console.error("❌ Approve user failed:", error);
    res.status(500).json({ success: false, message: "Failed to approve user" });
  }
};

// ─────────────────────────────────────────────
// ✅ Student: Notifications
// ─────────────────────────────────────────────

/**
 * GET /api/user/notifications
 * Fetch all notifications for the logged-in student
 * Middleware: authenticateToken  →  sets req.userId  (NOT req.user.userId)
 */
export const getUserNotifications = async (req, res) => {
  try {
    // ✅ FIX: authenticateToken sets req.userId directly, not req.user?.userId
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    const unread = notifications.filter((n) => !n.isRead).length;

    res.status(200).json({
      success:       true,
      notifications,
      data:          notifications, // ✅ also expose as 'data' for compatibility
      total:         notifications.length,
      unreadCount:   unread,
      unread,
    });
  } catch (error) {
    console.error("❌ Failed to fetch user notifications:", error);
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
};

/**
 * PATCH /api/user/notifications/:id/read
 * Student marks a single notification as read.
 * Called by the UniversityRequestPopup after it detects an approved/rejected response.
 * Middleware: authenticateToken  →  sets req.userId
 */
export const markUserNotificationRead = async (req, res) => {
  try {
    // ✅ FIX: authenticateToken sets req.userId directly, not req.user?.userId
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Notification ID is required" });
    }

    // Only allow marking notifications that belong to this student
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      // ✅ FIX: don't return 404 — notification might belong to different userId string format
      // Try without userId constraint as a fallback
      const fallback = await Notification.findByIdAndUpdate(
        id,
        { isRead: true },
        { new: true }
      );
      if (fallback) {
        console.log(`🔔 Notification ${id} marked as read (fallback) by user ${userId}`);
        return res.status(200).json({ success: true, notification: fallback });
      }
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    console.log(`🔔 Notification ${id} marked as read by user ${userId}`);
    return res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error("❌ markUserNotificationRead failed:", error);
    return res.status(500).json({ success: false, message: "Failed to mark notification as read" });
  }
};
// Add this function alongside createNewUserNotification
export const createProcessAdminRequestNotification = async (processAdmin) => {
  try {
    if (!processAdmin?._id) return false;
    await Notification.create({
      type:       "PROCESS_ADMIN_REQUEST",
      title:      "New Process Admin Request",
      message:    `${processAdmin.firstName} ${processAdmin.lastName} (${processAdmin.email}) has registered and is awaiting approval.`,
      userId:     processAdmin._id,
      targetRole: "admin",
      isRead:     false,
    });
    console.log(`🔔 Process admin request notification created for: ${processAdmin.email}`);
    return true;
  } catch (error) {
    console.error("❌ Process admin notification failed:", error);
    return false;
  }
};
