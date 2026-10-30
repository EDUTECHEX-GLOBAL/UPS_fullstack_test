/**
 * enrollmentAdminRoutes.js
 *
 * Mounted at: /api/enrollment-admin
 *
 * Bachelor's  →  gusuniversity.js  via /bachelors/*
 * Master's    →  MasterUniversity.js  via /masters/*
 * Medical     →  medicaluniversity.js  via /medical/*
 */

import express from 'express';
import { protectProcessAdmin } from '../../middleware/processAdminAuth.js';
import {
  getBachelorApplications,
  getBachelorApplicationDetail,
  getMasterApplications,
  getMasterApplicationDetail,
  getMedicalApplications,
  getMedicalApplicationDetail,
  approveEnrollmentApplication,
  rejectEnrollmentApplication,
  setUnderReview,
  getEnrollmentStats,
} from '../controllers/enrollmentAdminController.js';

const router = express.Router();

// All routes require process-admin auth
router.use(protectProcessAdmin);

// ── Bachelor's ─────────────────────────────────────────────────────────────
router.get('/bachelors/applications',           getBachelorApplications);
router.get('/bachelors/applications/:userId',   getBachelorApplicationDetail);

// ── Master's ───────────────────────────────────────────────────────────────
router.get('/masters/applications',             getMasterApplications);
router.get('/masters/applications/:userId',     getMasterApplicationDetail);

// ── Medical ────────────────────────────────────────────────────────────────
router.get('/medical/applications',             getMedicalApplications);
router.get('/medical/applications/:userId',     getMedicalApplicationDetail);

// ── Approval actions (type-agnostic — any /*/applications/:userId) ─────────
router.patch('/bachelors/applications/:userId/approve', approveEnrollmentApplication);
router.patch('/masters/applications/:userId/approve',   approveEnrollmentApplication);
router.patch('/medical/applications/:userId/approve',   approveEnrollmentApplication);

router.patch('/bachelors/applications/:userId/reject',  rejectEnrollmentApplication);
router.patch('/masters/applications/:userId/reject',    rejectEnrollmentApplication);
router.patch('/medical/applications/:userId/reject',    rejectEnrollmentApplication);

router.patch('/bachelors/applications/:userId/review',  setUnderReview);
router.patch('/masters/applications/:userId/review',    setUnderReview);
router.patch('/medical/applications/:userId/review',    setUnderReview);

// ── Stats ──────────────────────────────────────────────────────────────────
router.get('/stats', getEnrollmentStats);

export default router;
