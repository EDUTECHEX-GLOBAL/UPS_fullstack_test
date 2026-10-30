// routes/admindashboardroutes.js
// ─────────────────────────────────────────────────────────────────────────────
// Register in server.js as:
//   app.use('/api/admin/dashboard', adminDashboardRoutes);
//
// Available endpoints:
//   GET /api/admin/dashboard/overview      ← main dashboard (all data in one call)
//   GET /api/admin/dashboard/users         ← user stat cards only
//   GET /api/admin/dashboard/universities  ← university stat cards only
//   GET /api/admin/dashboard/programs      ← programs stat cards only
// ─────────────────────────────────────────────────────────────────────────────

import express from 'express';
import {
  getDashboardOverview,
  getUserStats,
  getUniversityStats,
  getProgramStats,
} from '../controllers/admindashboardcontroller.js';
import { authenticateAdmin } from '../middleware/adminAuthMiddleware.js';

const router = express.Router();

// All dashboard routes require admin authentication
router.use(authenticateAdmin);

/**
 * @route   GET /api/admin/dashboard/overview
 * @desc    Full dashboard overview — users, universities, programs,
 *          student analytics, registration trend, profile funnel
 * @access  Private/Admin
 */
router.get('/overview', getDashboardOverview);

/**
 * @route   GET /api/admin/dashboard/users
 * @desc    User stat cards: total, active, admins, inactive
 * @access  Private/Admin
 */
router.get('/users', getUserStats);

/**
 * @route   GET /api/admin/dashboard/universities
 * @desc    University stat cards: imported unis, colleges, bachelors, masters
 * @access  Private/Admin
 */
router.get('/universities', getUniversityStats);

/**
 * @route   GET /api/admin/dashboard/programs
 * @desc    Program stat cards: bach total, bach avg/uni, masters total, masters active
 * @access  Private/Admin
 */
router.get('/programs', getProgramStats);

export default router;