// routes/processAdminDashboardRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
// Base path registered in server.js:
//   app.use('/api/process-admin/dashboard', processAdminDashboardRoutes);
// ─────────────────────────────────────────────────────────────────────────────

import express from 'express';
import {
  getDashboardStats,
  getRecentApplications,
} from '../controllers/processAdminDashboardController.js';
import { protectProcessAdmin } from '../middleware/processAdminAuth.js';

const router = express.Router();

/**
 * @route   GET /api/process-admin/dashboard/stats
 * @desc    Combined stats — total apps, pending, completed (Bachelor + Master)
 * @access  Private/ProcessAdmin
 */
router.get('/stats', protectProcessAdmin, getDashboardStats);

/**
 * @route   GET /api/process-admin/dashboard/recent-applications
 * @desc    Latest 6 applications merged from Bachelor + Master, sorted by date
 * @access  Private/ProcessAdmin
 */
router.get('/recent-applications', protectProcessAdmin, getRecentApplications);

export default router;