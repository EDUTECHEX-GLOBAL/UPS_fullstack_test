import express from 'express';
import { authenticateAdmin } from '../middleware/adminAuthMiddleware.js';
import {
  getAdminVerificationQueue,
  getAdminVerificationDetail,
  downloadAdminVerificationPdf,
  approveApplication,
  rejectApplication,
  requestApplicationChanges,
} from '../controllers/applicationVerificationController.js';

const router = express.Router();
router.use(authenticateAdmin);
router.get('/verify-documents', getAdminVerificationQueue);
router.get('/verify-documents/:applicationId', getAdminVerificationDetail);
router.get('/verify-documents/:applicationId/pdf', downloadAdminVerificationPdf);
router.post('/approve-application', approveApplication);
router.post('/reject-application', rejectApplication);
router.post('/request-changes', requestApplicationChanges);
export default router;
