// routes/bachelorsRoutes.js
import express from 'express';
import { 
  createUniversity,
  getAllUniversities,
  getUniversityById,
  updateUniversity,
  deleteUniversity,
  toggleUniversityStatus,
  toggleFeatured
} from '../controllers/bachelorsController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// University routes
router.route('/universities')
  .get(getAllUniversities)
  .post(createUniversity);

router.route('/universities/:id')
  .get(getUniversityById)
  .put(updateUniversity)
  .delete(deleteUniversity);

router.patch('/universities/:id/toggle-status', toggleUniversityStatus);
router.patch('/universities/:id/toggle-featured', toggleFeatured);

export default router;