import express from 'express';
import { protectProcessAdmin } from '../middleware/processAdminAuth.js';
import { verifyApplicationByProcessAdmin } from '../controllers/applicationVerificationController.js';

const router = express.Router();
router.post('/verify-application', protectProcessAdmin, verifyApplicationByProcessAdmin);
export default router;