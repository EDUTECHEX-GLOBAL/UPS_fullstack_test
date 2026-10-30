// backend/routes/processAdminDocumentRoutes.js
import express from 'express';
import { 
  getProcessAdminDocuments,
  getProcessAdminStats,
  getProcessAdminDocument,
  sendDocumentEmail,
  sendAllDocumentsEmail,
  sendDocumentCorrectionRequest,
  getIncompleteApplications
} from '../controllers/processAdminDocumentController.js';
import { generateStudentPDF } from '../controllers/pdfGeneratorController.js';
import { protectProcessAdmin } from '../middleware/processAdminAuth.js';

const router = express.Router();

console.log('📋 Process Admin Document routes loading...');

// All routes are protected by process admin middleware
router.use(protectProcessAdmin);

// Document management routes
router.get('/all', getProcessAdminDocuments);
console.log('✅ Registered: GET /process-admin/documents/all');

router.get('/stats', getProcessAdminStats);
console.log('✅ Registered: GET /process-admin/documents/stats');

router.get('/applications/incomplete', getIncompleteApplications);
console.log('✅ Registered: GET /process-admin/documents/applications/incomplete');

router.get('/generate-pdf/:studentId', generateStudentPDF);
console.log('✅ Registered: GET /process-admin/documents/generate-pdf/:studentId');

router.get('/:id', getProcessAdminDocument);
console.log('✅ Registered: GET /process-admin/documents/:id');

// Email routes
router.post('/send-email', sendDocumentEmail);
console.log('✅ Registered: POST /process-admin/documents/send-email');

router.post('/send-bulk-email', sendAllDocumentsEmail);
console.log('✅ Registered: POST /process-admin/documents/send-bulk-email');

router.post('/:id/send-correction', sendDocumentCorrectionRequest);
console.log('✅ Registered: POST /process-admin/documents/:id/send-correction');

export default router;