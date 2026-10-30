// src/routes/studentanalyticsroutes.js
import express from 'express';
import { authenticateAdmin } from '../middleware/adminAuthMiddleware.js';
import {
  getStudentProfiles,
  getAnalyticsStats,
  getStudentProfileDetail,
} from '../controllers/studentanalyticscontroller.js';

const router = express.Router();

// ── All routes require admin authentication ──────────────────────────────────

/**
 * GET /api/analytics/stats
 * Returns summary numbers for stat cards + top lists.
 * Response includes:
 *   total, completedCount, completedPct, totalCourses,
 *   uniqueUniversities, avgCourses, recentWeekCount,
 *   programStats, segmentStats, topUniversities, topCourses, fieldStats
 * Used by: StudentAnalytics.js stat cards
 */
router.get('/stats', authenticateAdmin, getAnalyticsStats);

/**
 * GET /api/analytics/profiles
 * Paginated, filterable list of all student profiles.
 * Query params:
 *   page     — page number (default 1)
 *   limit    — per page (default 10, max 100)
 *   program  — Bachelor | Master | PhD
 *   segment  — segment id e.g. "engineering"
 *   status   — complete | pending
 *   search   — text search across name, email, university
 * Used by: StudentAnalytics.js table
 */
router.get('/profiles', authenticateAdmin, getStudentProfiles);

/**
 * GET /api/analytics/profiles/:userId
 * Single student full profile detail.
 * userId is the string field on UserProfile, NOT the MongoDB _id.
 * Used by: StudentAnalytics.js expanded row detail view
 * NOTE: this route must stay AFTER /profiles to avoid Express matching
 * "stats" or "profiles" as a :userId param.
 */
router.get('/profiles/:userId', authenticateAdmin, getStudentProfileDetail);

export default router;