import express from "express";
import {
  getActivities,
  saveActivities,
  clearActivity,
  clearAllActivities,
} from "../controllers/firstmycollegeactivitiesController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ==============================
// 🔐 Protected Routes (require JWT)
// ==============================

// Get activities for a specific college
router.get("/:collegeId", authMiddleware, getActivities);

// Save activities for a specific college
router.post("/:collegeId", authMiddleware, saveActivities);

// Clear specific activity
router.delete("/:collegeId/clear/:index", authMiddleware, clearActivity);

// Clear all activities
router.delete("/:collegeId/clear", authMiddleware, clearAllActivities);

export default router;