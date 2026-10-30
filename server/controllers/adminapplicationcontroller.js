// controllers/adminapplicationcontroller.js
import Application from '../models/Application.js';
// Import your existing collections (adjust paths as needed)
import GeneralModel from '../models/GeneralModel.js';
import FirstAcademicModel from '../models/FirstAcademicModel.js';
import highSchoolCurriculumModel from '../models/highSchoolCurriculumModel.js';
import InternationalStudentModel from '../models/InternationalStudentModel.js';
import FirstResidencyModel from '../models/FirstResidencyModel.js';
import firstContactsModel from '../models/firstContactsModel.js';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);

// Helper function to format status
function getFormattedStatus(status) {
  const statusMap = {
    'draft': 'Draft',
    'pending': 'Pending Review',
    'submitted': 'Submitted',
    'under-review': 'Under Review',
    'accepted': 'Accepted',
    'rejected': 'Rejected',
    'incomplete': 'Incomplete',
    'withdrawn': 'Withdrawn'
  };
  return statusMap[status] || status;
}

// MAIN CONTROLLER OBJECT
const adminApplicationController = {
  // ============= EXISTING METHODS =============
  
  // Get all applications with filters, sorting, and pagination
  getAllApplications: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        major,
        search,
        dateFrom,
        dateTo,
        sortBy = 'submittedAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object
      const filter = { isArchived: false };
      
      if (status && status !== 'all') {
        filter.status = status;
      }
      
      if (major && major !== 'all') {
        filter.major = major;
      }
      
      if (dateFrom || dateTo) {
        filter.submittedAt = {};
        if (dateFrom) {
          filter.submittedAt.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          filter.submittedAt.$lte = new Date(dateTo);
        }
      }
      
      // Search across multiple fields
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        filter.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { applicationId: searchRegex },
          { studentId: searchRegex }
        ];
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query with pagination
      const [applications, total] = await Promise.all([
        Application.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .select('-adminNotes.isInternal -metadata')
          .lean(),
        Application.countDocuments(filter)
      ]);

      // Calculate statistics
      const stats = await Application.aggregate([
        { $match: { isArchived: false } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const statusStats = {
        total: total,
        pending: 0,
        'under-review': 0,
        accepted: 0,
        rejected: 0,
        incomplete: 0,
        withdrawn: 0
      };

      stats.forEach(stat => {
        statusStats[stat._id] = stat.count;
      });

      res.json({
        success: true,
        data: {
          applications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          },
          stats: statusStats,
          filters: {
            status,
            major,
            search,
            dateFrom,
            dateTo
          }
        }
      });

    } catch (error) {
      console.error('Get applications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch applications'
      });
    }
  },

  // Get single application by ID
  getApplicationById: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Update last viewed timestamp
      await Application.findByIdAndUpdate(id, {
        lastViewedByAdmin: new Date()
      });

      const application = await Application.findById(id)
        .select('-adminNotes.isInternal')
        .lean();

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      res.json({
        success: true,
        data: application
      });

    } catch (error) {
      console.error('Get application error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch application'
      });
    }
  },

  // Update application status
  updateApplicationStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const adminInfo = req.admin;

      // Validate status
      const validStatuses = ['pending', 'under-review', 'accepted', 'rejected', 'incomplete', 'withdrawn'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      const application = await Application.findById(id);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Update status with note
      await application.updateStatus(status, adminInfo, reason);

      // Update decision date if accepted/rejected
      if (status === 'accepted' || status === 'rejected' || status === 'withdrawn') {
        application.decisionDate = new Date();
        await application.save();
      }

      res.json({
        success: true,
        message: `Application status updated to ${status}`,
        data: {
          status: application.status,
          progress: application.progress,
          decisionDate: application.decisionDate
        }
      });

    } catch (error) {
      console.error('Update status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update application status'
      });
    }
  },

  // Add admin note to application
  addAdminNote: async (req, res) => {
    try {
      const { id } = req.params;
      const { content, isInternal = false } = req.body;
      const adminInfo = req.admin;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Note content is required'
        });
      }

      const application = await Application.findById(id);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      await application.addAdminNote(content.trim(), adminInfo, isInternal);

      res.json({
        success: true,
        message: 'Note added successfully'
      });

    } catch (error) {
      console.error('Add note error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add note'
      });
    }
  },

  // Upload document to application (admin)
  uploadDocument: async (req, res) => {
    try {
      const { id } = req.params;
      const adminInfo = req.admin;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const application = await Application.findById(id);
      if (!application) {
        // Clean up uploaded file if application not found
        await unlinkAsync(req.file.path);
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Add document to adminDocuments array
      application.adminDocuments.push({
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        uploadedBy: 'admin',
        fileType: path.extname(req.file.originalname).toLowerCase().substring(1),
        size: req.file.size
      });

      // Add note about document upload
      await application.addAdminNote(
        `Admin uploaded document: ${req.file.originalname}`,
        adminInfo,
        false
      );

      await application.save();

      res.json({
        success: true,
        message: 'Document uploaded successfully',
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size
        }
      });

    } catch (error) {
      console.error('Upload document error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload document'
      });
    }
  },

  // Download application document
  downloadDocument: async (req, res) => {
    try {
      const { id, docId } = req.params;
      const { type = 'student' } = req.query; // 'student' or 'admin'

      const application = await Application.findById(id);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Find document in appropriate array
      let document;
      if (type === 'admin') {
        document = application.adminDocuments.id(docId);
      } else {
        document = application.documents.id(docId);
      }

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Check if file exists
      if (!fs.existsSync(document.path)) {
        return res.status(404).json({
          success: false,
          message: 'File not found on server'
        });
      }

      // Send file
      res.download(document.path, document.originalName);

    } catch (error) {
      console.error('Download document error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download document'
      });
    }
  },

  // Delete document from application
  deleteDocument: async (req, res) => {
    try {
      const { id, docId } = req.params;
      const { type = 'student' } = req.query;
      const adminInfo = req.admin;

      const application = await Application.findById(id);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Find document
      let document;
      if (type === 'admin') {
        document = application.adminDocuments.id(docId);
      } else {
        document = application.documents.id(docId);
      }

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Delete file from filesystem
      if (fs.existsSync(document.path)) {
        await unlinkAsync(document.path);
      }

      // Remove document from array
      if (type === 'admin') {
        application.adminDocuments.pull(docId);
      } else {
        application.documents.pull(docId);
      }

      // Add note about deletion
      await application.addAdminNote(
        `Admin deleted ${type} document: ${document.originalName}`,
        adminInfo,
        false
      );

      await application.save();

      res.json({
        success: true,
        message: 'Document deleted successfully'
      });

    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete document'
      });
    }
  },

  // Update application information
  updateApplication: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const adminInfo = req.admin;

      // Remove fields that shouldn't be updated directly
      delete updates._id;
      delete updates.applicationId;
      delete updates.submittedAt;
      delete updates.createdAt;

      const application = await Application.findById(id);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Track changes for note
      const changes = [];
      Object.keys(updates).forEach(key => {
        if (application[key] !== updates[key] && updates[key] !== undefined) {
          changes.push(`${key}: "${application[key]}" → "${updates[key]}"`);
          application[key] = updates[key];
        }
      });

      // Save changes
      await application.save();

      // Add note about updates if there were changes
      if (changes.length > 0) {
        const noteContent = `Admin updated application:\n${changes.join('\n')}`;
        await application.addAdminNote(noteContent, adminInfo, false);
      }

      res.json({
        success: true,
        message: 'Application updated successfully',
        data: application
      });

    } catch (error) {
      console.error('Update application error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update application'
      });
    }
  },

  // Delete application
  deleteApplication: async (req, res) => {
    try {
      const { id } = req.params;
      const adminInfo = req.admin;

      const application = await Application.findById(id);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Delete all associated files
      const deletePromises = [];
      
      // Student documents
      application.documents.forEach(doc => {
        if (fs.existsSync(doc.path)) {
          deletePromises.push(unlinkAsync(doc.path));
        }
      });

      // Admin documents
      application.adminDocuments.forEach(doc => {
        if (fs.existsSync(doc.path)) {
          deletePromises.push(unlinkAsync(doc.path));
        }
      });

      await Promise.all(deletePromises);

      // Delete from database
      await Application.findByIdAndDelete(id);

      // Log deletion (you might want to store this in a separate audit log)
      console.log(`Application ${id} deleted by admin ${adminInfo.email}`);

      res.json({
        success: true,
        message: 'Application deleted successfully'
      });

    } catch (error) {
      console.error('Delete application error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete application'
      });
    }
  },

  // Archive application (soft delete)
  archiveApplication: async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminInfo = req.admin;

      const application = await Application.findById(id);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      application.isArchived = true;
      await application.save();

      // Add archive note
      const noteContent = `Application archived` + (reason ? `\nReason: ${reason}` : '');
      await application.addAdminNote(noteContent, adminInfo, false);

      res.json({
        success: true,
        message: 'Application archived successfully'
      });

    } catch (error) {
      console.error('Archive application error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to archive application'
      });
    }
  },

  // Get archived applications
  getArchivedApplications: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [applications, total] = await Promise.all([
        Application.find({ isArchived: true })
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .select('-adminNotes.isInternal -metadata')
          .lean(),
        Application.countDocuments({ isArchived: true })
      ]);

      res.json({
        success: true,
        data: {
          applications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Get archived applications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch archived applications'
      });
    }
  },

  // Restore archived application
  restoreApplication: async (req, res) => {
    try {
      const { id } = req.params;
      const adminInfo = req.admin;

      const application = await Application.findById(id);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      application.isArchived = false;
      await application.save();

      // Add restore note
      await application.addAdminNote('Application restored from archive', adminInfo, false);

      res.json({
        success: true,
        message: 'Application restored successfully'
      });

    } catch (error) {
      console.error('Restore application error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restore application'
      });
    }
  },

  // Export applications to CSV
  exportApplications: async (req, res) => {
    try {
      const { status, major, dateFrom, dateTo } = req.query;

      // Build filter
      const filter = { isArchived: false };
      
      if (status && status !== 'all') {
        filter.status = status;
      }
      
      if (major && major !== 'all') {
        filter.major = major;
      }
      
      if (dateFrom || dateTo) {
        filter.submittedAt = {};
        if (dateFrom) {
          filter.submittedAt.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          filter.submittedAt.$lte = new Date(dateTo);
        }
      }

      const applications = await Application.find(filter)
        .sort({ submittedAt: -1 })
        .select('applicationId name email status major gpa satScore submittedAt progress')
        .lean();

      // Convert to CSV format
      const headers = ['Application ID', 'Name', 'Email', 'Status', 'Major', 'GPA', 'SAT Score', 'Submitted Date', 'Progress %'];
      const csvData = applications.map(app => [
        app.applicationId,
        app.name,
        app.email,
        app.status,
        app.major,
        app.gpa,
        app.satScore,
        new Date(app.submittedAt).toISOString().split('T')[0],
        app.progress
      ]);

      const csv = [
        headers.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n');

      // Set headers for file download
      const filename = `applications_export_${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);

    } catch (error) {
      console.error('Export applications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export applications'
      });
    }
  },

  // Get application statistics
  getApplicationStats: async (req, res) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const stats = await Application.aggregate([
        {
          $match: {
            isArchived: false,
            submittedAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $facet: {
            // Status distribution
            statusStats: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 }
                }
              }
            ],
            // Major distribution
            majorStats: [
              {
                $group: {
                  _id: '$major',
                  count: { $sum: 1 }
                }
              },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ],
            // Daily submissions (last 30 days)
            dailySubmissions: [
              {
                $group: {
                  _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' }
                  },
                  count: { $sum: 1 }
                }
              },
              { $sort: { _id: 1 } },
              { $limit: 30 }
            ],
            // GPA statistics
            gpaStats: [
              {
                $group: {
                  _id: null,
                  average: { $avg: '$gpa' },
                  max: { $max: '$gpa' },
                  min: { $min: '$gpa' }
                }
              }
            ],
            // SAT statistics
            satStats: [
              {
                $group: {
                  _id: null,
                  average: { $avg: '$satScore' },
                  max: { $max: '$satScore' },
                  min: { $min: '$satScore' }
                }
              }
            ]
          }
        }
      ]);

      res.json({
        success: true,
        data: stats[0]
      });

    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics'
      });
    }
  },

  // Bulk update applications
  bulkUpdateApplications: async (req, res) => {
    try {
      const { applicationIds, updates } = req.body;
      const adminInfo = req.admin;

      if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Application IDs are required'
        });
      }

      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No updates provided'
        });
      }

      // Remove restricted fields
      delete updates._id;
      delete updates.applicationId;
      delete updates.submittedAt;
      delete updates.createdAt;

      // Update applications
      const result = await Application.updateMany(
        { _id: { $in: applicationIds } },
        { $set: updates },
        { multi: true }
      );

      // Add notes to each application
      const notePromises = applicationIds.map(async (appId) => {
        const application = await Application.findById(appId);
        if (application) {
          const noteContent = `Bulk update by admin:\n${Object.keys(updates).map(key => `${key}: "${updates[key]}"`).join('\n')}`;
          return application.addAdminNote(noteContent, adminInfo, false);
        }
      });

      await Promise.all(notePromises);

      res.json({
        success: true,
        message: `Updated ${result.modifiedCount} applications`,
        data: {
          modifiedCount: result.modifiedCount
        }
      });

    } catch (error) {
      console.error('Bulk update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk update applications'
      });
    }
  },

  // ============= NEW METHODS FOR KANSAS UNIVERSITY =============

  // 1. GET all Kansas University applications for dashboard
  getKansasApplicationsDashboard: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        major,
        search,
        dateFrom,
        dateTo,
        sortBy = 'submittedAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter for Kansas University only
      const filter = { 
        isArchived: false,
        university: 'Kansas University' // Filter only Kansas University
      };
      
      if (status && status !== 'all') {
        filter.status = status;
      }
      
      if (major && major !== 'all') {
        filter.major = major;
      }
      
      if (dateFrom || dateTo) {
        filter.submittedAt = {};
        if (dateFrom) {
          filter.submittedAt.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          filter.submittedAt.$lte = new Date(dateTo);
        }
      }
      
      // Search across multiple fields
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        filter.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { applicationId: searchRegex },
          { studentId: searchRegex }
        ];
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query with pagination
      const [applications, total] = await Promise.all([
        Application.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .select('-adminNotes.isInternal -metadata')
          .lean(),
        Application.countDocuments(filter)
      ]);

      // Calculate statistics for Kansas University only
      const stats = await Application.aggregate([
        { 
          $match: { 
            isArchived: false,
            university: 'Kansas University'
          } 
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const statusStats = {
        total: total,
        pending: 0,
        'under-review': 0,
        accepted: 0,
        rejected: 0,
        incomplete: 0,
        withdrawn: 0
      };

      stats.forEach(stat => {
        if (stat._id) {
          statusStats[stat._id] = stat.count;
        }
      });

      // Format applications for dashboard
      const formattedApplications = applications.map(app => ({
        _id: app._id,
        applicationId: app.applicationId,
        name: app.name,
        email: app.email,
        phone: app.phone,
        major: app.major,
        status: app.status,
        statusFormatted: getFormattedStatus(app.status),
        progress: app.progress,
        submittedAt: app.submittedAt,
        gpa: app.gpa,
        satScore: app.satScore,
        priority: app.priority,
        isNew: app.isNew,
        lastViewedByAdmin: app.lastViewedByAdmin,
        daysSinceSubmission: app.submittedAt ? 
          Math.floor((new Date() - new Date(app.submittedAt)) / (1000 * 60 * 60 * 24)) : 
          null
      }));

      res.json({
        success: true,
        data: {
          applications: formattedApplications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          },
          stats: statusStats,
          filters: {
            status,
            major,
            search,
            dateFrom,
            dateTo
          }
        }
      });

    } catch (error) {
      console.error('Get Kansas applications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch Kansas University applications'
      });
    }
  },

  // 2. GET complete application details (View button functionality)
  getCompleteApplicationDetails: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get main application
      const application = await Application.findById(id)
        .select('-adminNotes.isInternal')
        .lean();

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Update last viewed timestamp
      await Application.findByIdAndUpdate(id, {
        lastViewedByAdmin: new Date()
      });

      // If you have studentId, you can fetch data from your existing collections
      const studentId = application.studentId;
      
      // Fetch data from all collections using the CORRECT model names
      let allSections = {};
      
      try {
        // Use the actual model names you imported
        const [
          generalData,
          academicData,
          highSchoolData,
          internationalData,
          residencyData,
          contactData
        ] = await Promise.allSettled([
          GeneralModel?.findOne({ studentId }).lean(),
          FirstAcademicModel?.findOne({ studentId }).lean(),
          highSchoolCurriculumModel?.findOne({ studentId }).lean(),
          InternationalStudentModel?.findOne({ studentId }).lean(),
          FirstResidencyModel?.findOne({ studentId }).lean(),
          firstContactsModel?.findOne({ studentId }).lean()
        ]);

        allSections = {
          general: generalData?.status === 'fulfilled' ? generalData.value : null,
          academic: academicData?.status === 'fulfilled' ? academicData.value : null,
          highSchool: highSchoolData?.status === 'fulfilled' ? highSchoolData.value : null,
          international: internationalData?.status === 'fulfilled' ? internationalData.value : null,
          residency: residencyData?.status === 'fulfilled' ? residencyData.value : null,
          contact: contactData?.status === 'fulfilled' ? contactData.value : null
        };
      } catch (sectionError) {
        console.warn('Could not fetch some section data:', sectionError);
        // Continue without section data
      }

      // Format address if exists
      let formattedAddress = '';
      if (application.address) {
        if (typeof application.address === 'object') {
          const addr = application.address;
          formattedAddress = `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zipCode || ''}`.trim();
        } else {
          formattedAddress = application.address;
        }
      }

      // Combine all data
      const completeApplication = {
        // Main application data
        applicationId: application.applicationId,
        studentId: application.studentId,
        university: application.university,
        
        // Student info
        personalDetails: {
          name: application.name,
          email: application.email,
          phone: application.phone,
          address: formattedAddress,
          dateOfBirth: application.dateOfBirth,
          source: application.source
        },
        
        // Academic info
        academicDetails: {
          major: application.major,
          gpa: application.gpa,
          satScore: application.satScore,
          actScore: application.actScore,
          highSchool: application.highSchool,
          graduationYear: application.graduationYear
        },
        
        // Application status
        applicationStatus: {
          status: application.status,
          statusFormatted: getFormattedStatus(application.status),
          progress: application.progress,
          submittedAt: application.submittedAt,
          decisionDate: application.decisionDate,
          priority: application.priority,
          isNew: application.isNew
        },
        
        // Financial info
        financialDetails: {
          financialAidRequired: application.financialAidRequired,
          scholarshipApplied: application.scholarshipApplied,
          scholarshipType: application.scholarshipType
        },
        
        // Additional sections (from your existing collections)
        additionalSections: allSections,
        
        // Documents
        documents: {
          studentUploads: application.documents || [],
          adminUploads: application.adminDocuments || []
        },
        
        // Notes (filter out internal notes)
        notes: application.adminNotes?.filter(note => !note.isInternal) || [],
        
        // Metadata
        metadata: {
          createdAt: application.createdAt,
          updatedAt: application.updatedAt,
          lastViewedByAdmin: application.lastViewedByAdmin,
          isArchived: application.isArchived
        }
      };

      res.json({
        success: true,
        data: completeApplication
      });

    } catch (error) {
      console.error('Get complete application error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch complete application details'
      });
    }
  },

  // 3. Download application as PDF (Download button functionality)
  downloadApplicationPDF: async (req, res) => {
    try {
      const { id } = req.params;

      // Get application data
      const application = await Application.findById(id).lean();
      
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Create PDF document
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        info: {
          Title: `Kansas University Application - ${application.applicationId}`,
          Author: 'Kansas University Admissions',
          Subject: 'University Application',
          Keywords: 'Kansas University, Admission, Application',
          Creator: 'Kansas University Admin System',
          CreationDate: new Date()
        }
      });
      
      const filename = `Kansas-Application-${application.applicationId}.pdf`;
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Pipe PDF to response
      doc.pipe(res);

      // ============= PDF CONTENT =============
      
      // Header with logo (you can add a logo if you have one)
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .fillColor('#0033A0') // Kansas blue color
         .text('KANSAS UNIVERSITY', { align: 'center' });
      
      doc.moveDown(0.5);
      doc.fontSize(16)
         .fillColor('#000000')
         .text('ADMISSIONS APPLICATION', { align: 'center' });
      
      doc.moveDown();
      doc.fontSize(10)
         .fillColor('#666666')
         .text('Office of Admissions • Lawrence, KS 66045 • admissions@ku.edu', { align: 'center' });
      
      doc.moveDown(2);
      
      // Application Details Section
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#0033A0')
         .text('APPLICATION SUMMARY', { underline: true });
      
      doc.moveDown(0.5);
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#000000');
      
      // Application Info Table
      const applicationInfo = [
        ['Application ID:', application.applicationId],
        ['Status:', getFormattedStatus(application.status)],
        ['Submission Date:', application.submittedAt ? 
          new Date(application.submittedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }) : 'Not Submitted'],
        ['Decision Date:', application.decisionDate ? 
          new Date(application.decisionDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }) : 'Pending']
      ];
      
      applicationInfo.forEach(([label, value]) => {
        doc.text(`${label}`, { continued: true, width: 150 });
        doc.text(value, { width: 250, align: 'left' });
      });
      
      doc.moveDown(1);
      
      // Student Information Section
      doc.addPage();
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#0033A0')
         .text('STUDENT INFORMATION', { underline: true });
      
      doc.moveDown(0.5);
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#000000');
      
      // Personal Details
      const studentInfo = [
        ['Full Name:', application.name],
        ['Email:', application.email],
        ['Phone:', application.phone || 'N/A'],
        ['Date of Birth:', application.dateOfBirth ? 
          new Date(application.dateOfBirth).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }) : 'N/A']
      ];
      
      if (application.address) {
        let addressText = '';
        if (typeof application.address === 'object') {
          const addr = application.address;
          addressText = `${addr.street || ''}\n${addr.city || ''}, ${addr.state || ''} ${addr.zipCode || ''}\n${addr.country || 'United States'}`;
        } else {
          addressText = application.address;
        }
        studentInfo.push(['Address:', addressText]);
      }
      
      studentInfo.forEach(([label, value]) => {
        doc.text(`${label}`, { continued: true, width: 100 });
        doc.text(value, { width: 300, align: 'left' });
      });
      
      doc.moveDown(1);
      
      // Academic Information Section
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#0033A0')
         .text('ACADEMIC INFORMATION', { underline: true });
      
      doc.moveDown(0.5);
      doc.fontSize(11)
         .font('Helvetica');
      
      const academicInfo = [
        ['Intended Major:', application.major],
        ['High School:', application.highSchool || 'N/A'],
        ['Graduation Year:', application.graduationYear || 'N/A'],
        ['GPA:', application.gpa ? application.gpa.toFixed(2) : 'N/A'],
        ['SAT Score:', application.satScore || 'N/A'],
        ['ACT Score:', application.actScore || 'N/A']
      ];
      
      academicInfo.forEach(([label, value]) => {
        doc.text(`${label}`, { continued: true, width: 120 });
        doc.text(value, { width: 280, align: 'left' });
      });
      
      doc.moveDown(1);
      
      // Financial Information (if available)
      if (application.financialAidRequired || application.scholarshipApplied) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#0033A0')
           .text('FINANCIAL INFORMATION', { underline: true });
        
        doc.moveDown(0.5);
        doc.fontSize(11)
           .font('Helvetica');
        
        const financialInfo = [];
        if (application.financialAidRequired) {
          financialInfo.push(['Financial Aid Required:', 'Yes']);
        }
        if (application.scholarshipApplied) {
          financialInfo.push(['Scholarship Applied:', 'Yes']);
          if (application.scholarshipType) {
            financialInfo.push(['Scholarship Type:', application.scholarshipType]);
          }
        }
        
        financialInfo.forEach(([label, value]) => {
          doc.text(`${label}`, { continued: true, width: 120 });
          doc.text(value, { width: 280, align: 'left' });
        });
      }
      
      // Notes Section (if any)
      if (application.adminNotes && application.adminNotes.length > 0) {
        const publicNotes = application.adminNotes.filter(note => !note.isInternal);
        if (publicNotes.length > 0) {
          doc.addPage();
          doc.fontSize(14)
             .font('Helvetica-Bold')
             .fillColor('#0033A0')
             .text('ADMINISTRATIVE NOTES', { underline: true });
          
          doc.moveDown(0.5);
          doc.fontSize(11)
             .font('Helvetica');
          
          publicNotes.forEach((note, index) => {
            doc.font('Helvetica-Bold')
               .text(`Note ${index + 1}:`);
            doc.font('Helvetica')
               .text(note.content, { indent: 20 });
            doc.fontSize(9)
               .fillColor('#666666')
               .text(`Added by: ${note.createdBy?.name || 'Admin'} on ${new Date(note.createdAt).toLocaleDateString()}`, { indent: 20 });
            doc.fontSize(11)
               .fillColor('#000000')
               .moveDown(0.5);
          });
        }
      }
      
      // Footer on each page
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc.fontSize(9)
           .fillColor('#666666')
           .text(`Kansas University - Application ID: ${application.applicationId}`, 
                 50, doc.page.height - 40, { align: 'center' });
        doc.text(`Page ${i + 1} of ${totalPages} • Generated on ${new Date().toLocaleDateString()}`, 
                 50, doc.page.height - 25, { align: 'center' });
      }

      // Finalize PDF
      doc.end();

    } catch (error) {
      console.error('Download PDF error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate PDF'
      });
    }
  }

  // End of controller object
};

export default adminApplicationController;