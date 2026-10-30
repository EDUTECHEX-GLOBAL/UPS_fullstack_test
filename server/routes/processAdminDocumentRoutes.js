// backend/routes/processAdminDocumentRoutes.js
import express from 'express';
import { 
  getAllDocuments, 
  getAdminDocument,
  updateDocumentReview,
  sendDocumentCorrectionRequest,
  getIncompleteApplications,
  sendDocumentEmail,
  sendAllDocumentsEmail,
  getAdminDocumentStats,
  testAdminEndpoint
} from '../controllers/documentController.js';
import { generateStudentPDF } from '../controllers/pdfGeneratorController.js';
import { protectProcessAdmin } from '../middleware/processAdminAuth.js';

const router = express.Router();

console.log('📋 Process Admin Document routes loading...');

// All routes are protected by process admin middleware
router.use(protectProcessAdmin);

// Document management routes for Process Admin
router.get('/test', testAdminEndpoint);
console.log('✅ Registered: GET /process-admin/documents/test');

router.get('/all', getAllDocuments);
console.log('✅ Registered: GET /process-admin/documents/all');

router.get('/stats', getAdminDocumentStats);
console.log('✅ Registered: GET /process-admin/documents/stats');

router.get('/applications/incomplete', getIncompleteApplications);
console.log('✅ Registered: GET /process-admin/documents/applications/incomplete');

router.get('/generate-pdf/:studentId', generateStudentPDF);
console.log('✅ Registered: GET /process-admin/documents/generate-pdf/:studentId');

router.get('/:id', getAdminDocument);
console.log('✅ Registered: GET /process-admin/documents/:id');

// Update routes
router.put('/:id/review', updateDocumentReview);
console.log('✅ Registered: PUT /process-admin/documents/:id/review');

// Email routes
router.post('/send-email', sendDocumentEmail);
console.log('✅ Registered: POST /process-admin/documents/send-email');

router.post('/send-bulk-email', sendAllDocumentsEmail);
console.log('✅ Registered: POST /process-admin/documents/send-bulk-email');

router.post('/:id/send-correction', sendDocumentCorrectionRequest);
console.log('✅ Registered: POST /process-admin/documents/:id/send-correction');

// ============ DEBUG: Print all registered routes ============
console.log('\n📊 Process Admin Document Routes Summary:');
const registeredRoutes = [];
router.stack.forEach((layer) => {
  if (layer.route) {
    const path = layer.route.path;
    const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
    registeredRoutes.push({ methods, path });
  }
});

registeredRoutes.sort((a, b) => a.path.localeCompare(b.path));
registeredRoutes.forEach(route => {
  console.log(`   ${route.methods.padEnd(6)} ${route.path}`);
});

console.log(`\n✅ Total process admin document routes: ${registeredRoutes.length}`);
console.log('🎉 Process Admin Document routes loaded successfully!\n');

export default router;