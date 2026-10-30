import express from 'express';
import { sendApplicationToUniversity } from '../controllers/UniversityVerificationcontroller.js';
import authenticateToken from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/send-to-university', authenticateToken, sendApplicationToUniversity);

export default router;
