import GeneralApplication from '../models/GeneralModel.js';

// Get general application for a specific college
const getGeneralApplication = async (req, res) => {
  try {
    const { collegeId } = req.params;
    const studentId = req.user.userId; // CHANGED: req.user.id -> req.user.userId

    let generalApplication = await GeneralApplication.findOne({
      studentId,
      collegeId
    });

    // If no application exists, create a default one
    if (!generalApplication) {
      generalApplication = new GeneralApplication({
        studentId,
        collegeId,
        startTerm: '',
        housingPreference: '',
        participationPrograms: '',
        fafsaIntent: '',
        visaClassification: '',
        applicationReason: [],
        progress: 0
      });
      await generalApplication.save();
    }

    res.json({
      success: true,
      generalApplication
    });
  } catch (error) {
    console.error('Error fetching general application:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching general application'
    });
  }
};

// Create or update general application
const saveGeneralApplication = async (req, res) => {
  try {
    const { collegeId } = req.params;
    const studentId = req.user.userId; // CHANGED: req.user.id -> req.user.userId
    const {
      startTerm,
      housingPreference,
      participationPrograms,
      fafsaIntent,
      visaClassification,
      applicationReason
    } = req.body;

    // Validate required fields
    if (!collegeId) {
      return res.status(400).json({
        success: false,
        message: 'College ID is required'
      });
    }

    // Find existing application or create new one
    let generalApplication = await GeneralApplication.findOne({
      studentId,
      collegeId
    });

    if (generalApplication) {
      // Update existing application
      generalApplication.startTerm = startTerm || '';
      generalApplication.housingPreference = housingPreference || '';
      generalApplication.participationPrograms = participationPrograms || '';
      generalApplication.fafsaIntent = fafsaIntent || '';
      generalApplication.visaClassification = visaClassification || '';
      generalApplication.applicationReason = applicationReason || [];
      generalApplication.lastSaved = new Date();
    } else {
      // Create new application
      generalApplication = new GeneralApplication({
        studentId,
        collegeId,
        startTerm: startTerm || '',
        housingPreference: housingPreference || '',
        participationPrograms: participationPrograms || '',
        fafsaIntent: fafsaIntent || '',
        visaClassification: visaClassification || '',
        applicationReason: applicationReason || []
      });
    }

    await generalApplication.save();

    res.json({
      success: true,
      message: 'General application saved successfully',
      generalApplication
    });
  } catch (error) {
    console.error('Error saving general application:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'General application already exists for this college'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while saving general application'
    });
  }
};

// Update specific fields in general application
const updateGeneralApplication = async (req, res) => {
  try {
    const { collegeId } = req.params;
    const studentId = req.user.userId; // CHANGED: req.user.id -> req.user.userId
    const updates = req.body;

    // Remove any fields that shouldn't be updated
    delete updates._id;
    delete updates.studentId;
    delete updates.collegeId;
    delete updates.createdAt;

    // Add lastSaved timestamp
    updates.lastSaved = new Date();

    const generalApplication = await GeneralApplication.findOneAndUpdate(
      { studentId, collegeId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!generalApplication) {
      return res.status(404).json({
        success: false,
        message: 'General application not found'
      });
    }

    res.json({
      success: true,
      message: 'General application updated successfully',
      generalApplication
    });
  } catch (error) {
    console.error('Error updating general application:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating general application'
    });
  }
};

// Clear a specific field in general application
const clearField = async (req, res) => {
  try {
    const { collegeId, field } = req.params;
    const studentId = req.user.userId; // CHANGED: req.user.id -> req.user.userId

    const validFields = [
      'startTerm',
      'housingPreference',
      'participationPrograms',
      'fafsaIntent',
      'visaClassification',
      'applicationReason'
    ];

    if (!validFields.includes(field)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid field name'
      });
    }

    const updateData = { [field]: field === 'applicationReason' ? [] : '' };
    updateData.lastSaved = new Date();

    const generalApplication = await GeneralApplication.findOneAndUpdate(
      { studentId, collegeId },
      { $set: updateData },
      { new: true }
    );

    if (!generalApplication) {
      return res.status(404).json({
        success: false,
        message: 'General application not found'
      });
    }

    res.json({
      success: true,
      message: `Field ${field} cleared successfully`,
      generalApplication
    });
  } catch (error) {
    console.error('Error clearing field:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while clearing field'
    });
  }
};

// Get all general applications for a student
const getAllGeneralApplications = async (req, res) => {
  try {
    const studentId = req.user.userId; // CHANGED: req.user.id -> req.user.userId

    const generalApplications = await GeneralApplication.find({ studentId })
      .select('-__v')
      .sort({ lastSaved: -1 });

    res.json({
      success: true,
      generalApplications,
      count: generalApplications.length
    });
  } catch (error) {
    console.error('Error fetching general applications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching general applications'
    });
  }
};

// Delete general application for a college
const deleteGeneralApplication = async (req, res) => {
  try {
    const { collegeId } = req.params;
    const studentId = req.user.userId; // CHANGED: req.user.id -> req.user.userId

    const generalApplication = await GeneralApplication.findOneAndDelete({
      studentId,
      collegeId
    });

    if (!generalApplication) {
      return res.status(404).json({
        success: false,
        message: 'General application not found'
      });
    }

    res.json({
      success: true,
      message: 'General application deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting general application:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting general application'
    });
  }
};
// Get all general applications for admin (similar to academic/international admin)
const getAllGeneralApplicationsForAdmin = async (req, res) => {
  try {
    const allApplications = await GeneralApplication.find()
      .populate('studentId', 'firstName lastName email phone')
      .sort({ lastSaved: -1 });

    const mappedApplications = allApplications.map((app) => ({
      _id: app._id,
      collegeId: app.collegeId,
      status: app.status || "not-started",
      progress: app.progress || 0,
      submittedAt: app.lastSaved || app.createdAt,
      student: {
        name: app.studentId
          ? `${app.studentId.firstName || ""} ${app.studentId.lastName || ""}`.trim()
          : "N/A",
        email: app.studentId?.email || "N/A",
        phone: app.studentId?.phone || "N/A",
      },
      details: app, // Send full document as details for modal
      type: "general" // tag for type
    }));

    res.json({
      success: true,
      generalApplications: mappedApplications,
      count: mappedApplications.length
    });
  } catch (error) {
    console.error("Error fetching all general applications for admin:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching general applications for admin"
    });
  }
};

export {
  getGeneralApplication,
  saveGeneralApplication,
  updateGeneralApplication,
  clearField,
  getAllGeneralApplications,
  getAllGeneralApplicationsForAdmin, // ✅ new
  deleteGeneralApplication
};
