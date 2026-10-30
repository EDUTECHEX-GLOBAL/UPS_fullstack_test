import express from 'express';
import authenticateToken from '../../middleware/authMiddleware.js';
import { getUniversitySelection, saveUniversitySelection, saveStudentUniversityChoices } from '../controllers/universityselectioncontroller.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/', getUniversitySelection);
router.post('/', saveUniversitySelection);
router.post('/final-choice', saveStudentUniversityChoices);

export default router;
