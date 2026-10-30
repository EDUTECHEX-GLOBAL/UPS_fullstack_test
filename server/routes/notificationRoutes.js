import express from "express";
import {
  getAdminNotifications,
  getAdminUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  sendNotificationToUser,
  approveUserFromNotification,
} from "../controllers/notificationController.js";
import authenticateAdmin from "../middleware/adminAuthMiddleware.js";

const router = express.Router();

// ─────────────────────────────────────────────
// 🔔 Admin Notification Routes
// All routes protected by authenticateAdmin
// ─────────────────────────────────────────────

// GET    /api/notifications                  → fetch all admin notifications
router.get("/unread-count", authenticateAdmin, getAdminUnreadCount);
router.get("/", authenticateAdmin, getAdminNotifications);

// POST   /api/notifications/mark-read        → mark one notification as read
router.post("/mark-read", authenticateAdmin, markNotificationRead);

// POST   /api/notifications/mark-all-read    → mark all notifications as read
router.post("/mark-all-read", authenticateAdmin, markAllNotificationsRead);

// POST   /api/notifications/send-to-user     → send a notification to a student
router.post("/send-to-user", authenticateAdmin, sendNotificationToUser);

// POST   /api/notifications/approve-user     → approve a user from notification
router.post("/approve-user", authenticateAdmin, approveUserFromNotification);

// DELETE /api/notifications/:id              → delete a notification
// ⚠️  Keep this LAST — wildcard :id must not shadow named routes above
router.delete("/:id", authenticateAdmin, deleteNotification);

export default router;
