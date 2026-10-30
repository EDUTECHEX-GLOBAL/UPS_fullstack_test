import express from 'express';
import authenticateToken from '../../middleware/authMiddleware.js';
import { additionalDocumentUpload } from '../../middleware/uploadMiddleware.js';
import {
  getAdditionalDocumentsConfig,
  getAdditionalDocuments,
  uploadAdditionalDocument,
  updateAdditionalDocument,
  deleteAdditionalDocument
} from '../controllers/additionaldocumentcontroller.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/config', getAdditionalDocumentsConfig);
router.get('/', getAdditionalDocuments);
router.post('/upload', additionalDocumentUpload.single('file'), uploadAdditionalDocument);
router.put('/:id', additionalDocumentUpload.single('file'), updateAdditionalDocument);
router.delete('/:id', deleteAdditionalDocument);

export default router;

