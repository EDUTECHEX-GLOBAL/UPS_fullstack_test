import express from 'express';
import { getEducationDetails, saveEducationDetails } from '../controllers/educationcontroller.js';
import authenticateToken from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getEducationDetails);
router.post('/', saveEducationDetails);

export default router;
