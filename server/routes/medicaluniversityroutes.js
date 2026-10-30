import express from "express";
import { getAllMedicalApplications, getMedicalApplicationDetails, getMedicalUniversityMatches, saveMedicalUniversitySelection, approveMedicalUniversitySelection } from "../controllers/medicaluniversitycontroller.js";
import { protectProcessAdmin } from "../middleware/processAdminAuth.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(protectProcessAdmin);

// GET /api/application/process-admin/medical-university/applications
router.get("/applications", getAllMedicalApplications);

// GET /api/application/process-admin/medical-university/applications/:studentId
router.get("/applications/:studentId", getMedicalApplicationDetails);
router.get("/applications/:studentId/universities", getMedicalUniversityMatches);
router.post("/save-university-selection", saveMedicalUniversitySelection);
router.post("/approve-university-selection", approveMedicalUniversitySelection);

export default router;
