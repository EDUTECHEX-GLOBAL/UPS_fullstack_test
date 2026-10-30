import express from 'express';
import authenticateToken from '../../middleware/authMiddleware.js';
import { checkApplicationConsistency, getApplicationConsistency } from '../controllers/ApplicationConsistencycontroller.js';

const router = express.Router();
router.use(authenticateToken);
router.get('/', getApplicationConsistency);
router.post('/check', checkApplicationConsistency);

export default router;
