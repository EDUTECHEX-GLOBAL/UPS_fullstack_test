import express from 'express';
import {
  getGusUniversityApplications,
  getGusUniversityApplicationById,
  getGusUniversityStats,
  sendDocumentReuploadEmail,
  approveProgramSelection,
  approveGusUniversitySelection,
  saveGusUniversitySelection,
} from '../controllers/gusuniversitycontroller.js';
import { protectProcessAdmin } from '../middleware/processAdminAuth.js';

const router = express.Router();

router.get('/applications',         protectProcessAdmin, getGusUniversityApplications);
router.get('/applications/:studentId', protectProcessAdmin, getGusUniversityApplicationById);
router.get('/stats',                protectProcessAdmin, getGusUniversityStats);
router.post('/send-doc-email',      protectProcessAdmin, sendDocumentReuploadEmail);
router.post('/approve-program',     protectProcessAdmin, approveProgramSelection);
router.post('/approve-university-selection', protectProcessAdmin, approveGusUniversitySelection);
router.post('/save-university-selection', protectProcessAdmin, saveGusUniversitySelection);

export default router;
