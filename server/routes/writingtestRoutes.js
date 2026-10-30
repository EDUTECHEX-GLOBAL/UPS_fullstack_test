// routes/writingtestroutes.js
import express from 'express';
import {
  getCurrentWriting,
  updateCurrentWriting,
  deleteWriting
} from '../controllers/writingtestController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// ================================
// /api/writingtest ROUTES
// ================================

// GET /api/writingtest - Get writing test data
router.get('/', authenticateToken, getCurrentWriting);

// PUT /api/writingtest - Update writing test data
router.put('/', authenticateToken, updateCurrentWriting);

// DELETE /api/writingtest - Delete writing test record
router.delete('/', authenticateToken, deleteWriting);

export default router;
