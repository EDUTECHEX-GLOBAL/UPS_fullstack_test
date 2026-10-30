import express from 'express';
import { getProgramSelection, saveProgramSelection, getProgramCountries } from '../controllers/programcontroller.js';
import authenticateToken from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/countries', getProgramCountries);
router.get('/', getProgramSelection);
router.post('/', saveProgramSelection);

export default router;
