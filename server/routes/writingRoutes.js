import express from "express";
import {
  getWritingData,
  updatePersonalEssay,
  updateAdditionalInformation,
  getWritingProgress,
  initializeWritingData,
} from "../controllers/writingController.js";
import authenticateToken from "../middleware/authMiddleware.js";

const router = express.Router();

// ==============================
// 🔐 Protected Routes (require JWT)
// ==============================

// GET /api/writing/progress - Get writing progress only
router.get("/progress", authenticateToken, getWritingProgress);

// POST /api/writing/initialize - Initialize writing data for new user
router.post("/initialize", authenticateToken, initializeWritingData);

// PUT /api/writing/personal-essay - Update personal essay
router.put("/personal-essay", authenticateToken, updatePersonalEssay);

// PUT /api/writing/additional-information - Update additional information
router.put("/additional-information", authenticateToken, updateAdditionalInformation);

// GET /api/writing - Get all writing data (should be last)
router.get("/", authenticateToken, getWritingData);

export default router;
