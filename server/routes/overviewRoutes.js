import express from 'express';
import {
  // Student routes
  getOverview,
  createOverview,
  updateSelectedCourse,
  updateFieldCompletion,
  updateCurrentStep,
  resetOverview,
  // Process admin routes
  getOverviewApplications,
  getOverviewApplicationById,
  upsertSelectedCourse,   // ← add this
  getOverviewStats,
  // Regular admin route
  getDashboardStats,
} from '../controllers/overviewController.js';

import authMiddleware             from '../middleware/authMiddleware.js';
import { protectProcessAdmin }    from '../middleware/processAdminAuth.js';

const router = express.Router();

/* ═══════════════════════════════════════════════════════
   PROCESS ADMIN ROUTES
   Base path (registered in server.js): /api/overview
   Full paths:
     GET  /api/overview/process-admin/applications
     GET  /api/overview/process-admin/applications/:applicationId
     GET  /api/overview/process-admin/stats
═══════════════════════════════════════════════════════ */

/**
 * @route   GET /api/overview/process-admin/applications
 * @desc    All overview applications with student info + correct university name
 * @access  Private/ProcessAdmin
 * @query   page, limit, status (completed|inprogress|notstarted|submitted), search
 */
router.get(
  '/process-admin/applications',
  protectProcessAdmin,
  getOverviewApplications
);

/**
 * @route   GET /api/overview/process-admin/applications/:applicationId
 * @desc    Single application detail by applicationId (e.g. EQHE-000001)
 * @access  Private/ProcessAdmin
 */
router.get(
  '/process-admin/applications/:applicationId',
  protectProcessAdmin,
  getOverviewApplicationById
);

/**
 * @route   GET /api/overview/process-admin/stats
 * @desc    Aggregate counts — total, completed, in_progress, not_started, submitted
 * @access  Private/ProcessAdmin
 */
router.get(
  '/process-admin/stats',
  protectProcessAdmin,
  getOverviewStats
);

/* ═══════════════════════════════════════════════════════
   ADMIN ROUTES
═══════════════════════════════════════════════════════ */

/**
 * @route   GET /api/overview/admin/stats
 * @desc    Dashboard statistics (admin only)
 * @access  Private/Admin
 */
router.get('/admin/stats', authMiddleware, getDashboardStats);
router.post('/upsert-course', authMiddleware, upsertSelectedCourse);

/* ═══════════════════════════════════════════════════════
   STUDENT ROUTES  (all require authMiddleware)
═══════════════════════════════════════════════════════ */
router.use(authMiddleware);

/**
 * @route   GET  /api/overview
 * @desc    Get all overviews for the logged-in user (newest first)
 *          Also returns `overview` (most recent) for backward compatibility
 */
router.get('/', getOverview);

/**
 * @route   POST /api/overview
 * @desc    Create a new application overview (called when student picks a new course)
 *          Body: { programId, programName, universityId, universityName, ... }
 */
router.post('/', createOverview);

/**
 * @route   PATCH /api/overview/:applicationId/course
 * @desc    Update selected course on a specific application
 */
router.patch('/:applicationId/course', updateSelectedCourse);

/**
 * @route   PUT /api/overview/:applicationId/field
 * @desc    Update a field completion flag
 *          Body: { section, field, isCompleted }
 */
router.put('/:applicationId/field', updateFieldCompletion);

/**
 * @route   PUT /api/overview/:applicationId/step
 * @desc    Update current step
 *          Body: { stepId }
 */
router.put('/:applicationId/step', updateCurrentStep);

/**
 * @route   POST /api/overview/:applicationId/reset
 * @desc    Reset a specific application to not_started
 */
router.post('/:applicationId/reset', resetOverview);

export default router;