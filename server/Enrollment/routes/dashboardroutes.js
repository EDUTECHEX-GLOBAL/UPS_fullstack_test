import express from 'express';
import { getDashboardStats } from '../controllers/dashboardcontroller.js';
import authenticateToken from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', authenticateToken, getDashboardStats);

export default router;
