import express from "express";
import {
  getGeneralApplication,
  saveGeneralApplication,
  updateGeneralApplication,
  clearField,
  getAllGeneralApplications,
  deleteGeneralApplication,
  getAllGeneralApplicationsForAdmin,
} from "../controllers/generalController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { protectProcessAdmin } from "../middleware/processAdminAuth.js";

const router = express.Router();

// ==============================
// ADMIN ROUTES (place FIRST, before authMiddleware)
// ==============================

// ✅ Regular Admin route
router.get("/admin/all", authMiddleware, getAllGeneralApplicationsForAdmin);

// ✅ Process Admin route
router.get("/process-admin/all", protectProcessAdmin, getAllGeneralApplicationsForAdmin);

// ==============================
// STUDENT ROUTES (protected by authMiddleware)
// ==============================
router.use(authMiddleware);

router.get("/:collegeId", getGeneralApplication);
router.post("/:collegeId", saveGeneralApplication);
router.put("/:collegeId", updateGeneralApplication);
router.delete("/:collegeId", deleteGeneralApplication);
router.delete("/:collegeId/clear/:field", clearField);
router.get("/", getAllGeneralApplications);

export default router;