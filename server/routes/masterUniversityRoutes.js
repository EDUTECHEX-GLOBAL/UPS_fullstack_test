// routes/masterUniversityRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
// Add the new sendDocumentEmailToStudent import and POST route below.
// Everything else stays exactly the same as your original file.
// ─────────────────────────────────────────────────────────────────────────────

import express from "express";
import { protectProcessAdmin } from '../middleware/processAdminAuth.js';
import {
  getMasterUniversityApplications,
  getMasterUniversityApplicationById,
  getMasterUniversityStats,
  getMasterUniversityMatches,
  saveMasterUniversitySelection,
  approveMasterUniversitySelection,
  sendDocumentEmailToStudent,          // ← NEW import
} from "../controllers/masterUniversityController.js";

const router = express.Router();

// ── Existing routes (unchanged) ────────────────────────────────────────────
router.get("/process-admin/all",           getMasterUniversityApplications);
router.get("/process-admin/stats",         getMasterUniversityStats);
// ── NEW: Send document correction email to student ─────────────────────────
// Must be declared BEFORE "/:studentId" to avoid Express treating
// "send-document-email" as a studentId param.
router.post("/process-admin/send-document-email", sendDocumentEmailToStudent);
router.get("/process-admin/:studentId/universities", protectProcessAdmin, getMasterUniversityMatches);
router.post("/process-admin/university-selection/save", protectProcessAdmin, saveMasterUniversitySelection);
router.post("/process-admin/university-selection/approve", protectProcessAdmin, approveMasterUniversitySelection);

router.get("/process-admin/:studentId",    getMasterUniversityApplicationById);

export default router;
