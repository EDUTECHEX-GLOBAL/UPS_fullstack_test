import express from 'express';
import { getPersonalDetails, savePersonalDetails } from '../controllers/personalcontroller.js';
import authenticateToken from '../../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all personal details routes
router.use(authenticateToken);

// GET /api/enrollment/personal
router.get('/', getPersonalDetails);

// POST /api/enrollment/personal
router.post('/', savePersonalDetails);

export default router;
