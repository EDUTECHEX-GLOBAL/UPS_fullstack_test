import express from 'express';
import authenticateToken from '../../middleware/authMiddleware.js';
import {
  getUniversityReview,
  submitUniversityReview,
  downloadUniversityReviewPDF,
  resendUniversityReviewEmail
} from '../controllers/universityreviewcontroller.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getUniversityReview);
router.post('/submit', submitUniversityReview);
router.get('/download-pdf', downloadUniversityReviewPDF);
router.post('/resend-email', resendUniversityReviewEmail);

export default router;
