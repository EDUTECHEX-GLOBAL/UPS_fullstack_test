// // routes/adminapplicationroutes.js
// import express from 'express';
// import adminApplicationController from '../controllers/adminapplicationcontroller.js';
// import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';
// import adminUpload from '../middleware/adminupload.js';

// const router = express.Router();

// // 🔐 Apply admin authentication to all routes
// router.use(authenticateAdmin);

// // ============= GET ROUTES =============

// // Specific routes first to avoid conflicts with :id
// router.get('/applications/:id/view-details', adminApplicationController.getCompleteApplicationDetails);
// router.get('/applications/:id/download-pdf', adminApplicationController.downloadApplicationPDF);
// router.get('/applications/:id/download/:docId', adminApplicationController.downloadDocument);

// // Generic application route
// router.get('/applications/:id', adminApplicationController.getApplicationById);

// // Other application routes
// router.get('/applications', adminApplicationController.getAllApplications);
// router.get('/applications/archived', adminApplicationController.getArchivedApplications);

// // Sensitive routes (optional role-based authorization)
// router.get('/applications/stats', authorize('super_admin'), adminApplicationController.getApplicationStats);
// router.get('/applications/export', authorize('super_admin'), adminApplicationController.exportApplications);

// // Kansas University specific routes
// router.get('/kansas/applications', adminApplicationController.getKansasApplicationsDashboard);

// // ============= POST ROUTES =============

// router.post('/applications/:id/notes', adminApplicationController.addAdminNote);
// router.post(
//   '/applications/:id/documents',
//   adminUpload.single('document'),
//   adminApplicationController.uploadDocument
// );
// router.post('/applications/bulk-update', adminApplicationController.bulkUpdateApplications);

// // ============= PUT ROUTES =============

// router.put('/applications/:id', adminApplicationController.updateApplication);
// router.put('/applications/:id/status', adminApplicationController.updateApplicationStatus);
// router.put('/applications/:id/restore', adminApplicationController.restoreApplication);
// router.put('/applications/:id/archive', adminApplicationController.archiveApplication);

// // ============= DELETE ROUTES =============

// router.delete('/applications/:id', adminApplicationController.deleteApplication);
// router.delete('/applications/:id/documents/:docId', adminApplicationController.deleteDocument);

// export default router;
