import express from 'express';
import { getDocuments, saveDocuments, uploadDocument, removeDocument } from '../controllers/documentcontroller.js';
import authenticateToken from '../../middleware/authMiddleware.js';
import { allDocumentUpload } from '../../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getDocuments);
router.post('/', saveDocuments);
router.post('/upload', allDocumentUpload.single('file'), uploadDocument);
router.delete('/:docId', removeDocument);

export default router;
