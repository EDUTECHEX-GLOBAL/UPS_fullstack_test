import express from 'express';
import {
  getReviewSummary,
  submitReviewApplication,
  saveDraftApplication,
  submitForApproval,
  getApplicationStatus,
  resubmitApplication
} from '../controllers/reviewcontroller.js';
import authenticateToken from '../../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all review routes
router.use(authenticateToken);

// GET /api/enrollment/review
router.get('/', getReviewSummary);

// POST /api/enrollment/review/submit
router.post('/submit', submitReviewApplication);

// POST /api/enrollment/review/save-draft
router.post('/save-draft', saveDraftApplication);

// POST /api/enrollment/review/submit-for-approval
router.post('/submit-for-approval', submitForApproval);

// GET /api/enrollment/review/application-status
router.get('/application-status', getApplicationStatus);

// POST /api/enrollment/review/resubmit
router.post('/resubmit', resubmitApplication);

export default router;
