import express from 'express';
import {
  getTestScores,
  saveTestScores,
  uploadTestScoreReport
} from '../controllers/testcontroller.js';
import authenticateToken from '../../middleware/authMiddleware.js';
import {
  testScoreUpload,
  withUpload,
  validateFileUpload
} from '../../middleware/uploadMiddleware.js';

const router = express.Router();

// Runs before every route below, so req.user exists before multer builds the S3 key
router.use(authenticateToken);

router.get('/', getTestScores);

// This router is mounted at /api/enrollment/test-scores,
// so this becomes POST /api/enrollment/test-scores/upload
router.post(
  '/upload',
  withUpload(testScoreUpload),
  validateFileUpload,
  uploadTestScoreReport
);

// Frontend sends JSON here (no files), so no multer needed
router.post('/', saveTestScores);

export default router;