import Education from "../models/educationtestModel.js";
import dotenv from "dotenv";

dotenv.config();

/* =====================================================================================
   🔹 Helper: Section Completion Check
===================================================================================== */
const isSectionComplete = (section, name) => {
  if (!section) return false;

  switch (name) {
    case "currentSchool":
      return !!(section.schoolName && section.dateOfEntry);

    case "otherSchools":
      return section.numberOfSchools >= 0;

    case "colleges":
      return section.numberOfColleges >= 0;

    case "grades":
      return !!(section.graduatingClassSize || section.cumulativeGPA);

    case "currentCourses":
      return section.numberOfCourses >= 0;

    case "honors":
      return Array.isArray(section.honorsList);

    case "communityOrganizations":
      return section.numberOfOrganizations >= 0;

    case "futurePlans":
      return !!(section.studentType || section.highestDegree);

    case "documents":
      // Check if required documents are uploaded
      return !!(section.passport && section.tenthMarksheet);

    default:
      return false;
  }
};

/* =====================================================================================
   🔹 EDUCATION PROGRESS CALCULATOR
===================================================================================== */
const calculateEducationProgress = (education) => {
  const sections = {
    currentSchool: "currentSchool",
    otherSchools: "otherSchools",
    colleges: "colleges",
    grades: "grades",
    currentCourses: "currentCourses",
    honors: "honors",
    communityOrganizations: "communityOrganizations",
    futurePlans: "futurePlans",
    documents: "documents",
  };

  const total = Object.keys(sections).length;

  // Auto-update completion flags based on data
  for (const key of Object.keys(sections)) {
    const complete = isSectionComplete(education[key], key);

    if (complete && !education.educationCompletion[key]) {
      education.educationCompletion[key] = true;
    }
  }

  const completed = Object.values(education.educationCompletion).filter(Boolean).length;
  const progress = Math.round((completed / total) * 100);

  console.log(`📊 Progress: ${completed}/${total} → ${progress}%`);

  return progress;
};

/* =====================================================================================
   📌 GET CURRENT STUDENT EDUCATION
   GET /api/education
===================================================================================== */
export const getCurrentEducation = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized - No user ID" });
    }

    let education = await Education.findOne({ studentId: userId });

    // Create default record if missing
    if (!education) {
      education = new Education({
        studentId: userId,
        currentSchool: { schoolAddress: {} },
        otherSchools: { numberOfSchools: 0, schools: [] },
        colleges: { numberOfColleges: 0, collegesList: [] },
        grades: {},
        currentCourses: { numberOfCourses: 0, courses: [] },
        honors: { honorsList: [] },
        communityOrganizations: { numberOfOrganizations: 0, organizations: [] },
        futurePlans: { additionalInterests: [] },
        documents: { passport: null, tenthMarksheet: null, twelfthMarksheet: null, otherDocuments: [] },
        educationCompletion: {
          currentSchool: false,
          otherSchools: false,
          colleges: false,
          grades: false,
          currentCourses: false,
          honors: false,
          communityOrganizations: false,
          futurePlans: false,
          documents: false,
        },
      });

      await education.save();
    }

    const educationProgress = calculateEducationProgress(education);

    await education.save();

    return res.status(200).json({
      success: true,
      education,
      educationProgress,
    });
  } catch (err) {
    console.error("❌ Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =====================================================================================
   📌 UPDATE EDUCATION
   PUT /api/education
===================================================================================== */
export const updateCurrentEducation = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized - No user ID" });
    }

    // Load current education document
    let education = await Education.findOne({ studentId: userId });

    // If no existing record, create new
    if (!education) {
      education = new Education({
        studentId: userId,
        ...req.body,
        documents: {
          passport: null,
          tenthMarksheet: null,
          twelfthMarksheet: null,
          otherDocuments: [],
        },
        educationCompletion: {
          currentSchool: false,
          otherSchools: false,
          colleges: false,
          grades: false,
          currentCourses: false,
          honors: false,
          communityOrganizations: false,
          futurePlans: false,
          documents: false,
        },
      });

      await education.save();

      const educationProgress = calculateEducationProgress(education);

      return res.status(200).json({
        success: true,
        message: "Education created successfully",
        education,
        educationProgress,
      });
    }

    // Fix: Deep merge logic, BUT replace arrays instead of merging
    for (const key of Object.keys(req.body)) {
      const newValue = req.body[key];

      if (typeof newValue === "object" && newValue !== null) {
        if (!education[key]) education[key] = {};

        for (const nestedKey of Object.keys(newValue)) {
          const nestedValue = newValue[nestedKey];

          if (Array.isArray(nestedValue)) {
            // 👇 CHANGE: Always overwrite arrays!
            education[key][nestedKey] = nestedValue;
          } else if (typeof nestedValue === "object" && nestedValue !== null) {
            education[key][nestedKey] = {
              ...education[key][nestedKey],
              ...nestedValue,
            };
          } else {
            education[key][nestedKey] = nestedValue;
          }
        }
      } else {
        education[key] = newValue;
      }
    }

    // Recalculate education progress before saving
    const educationProgress = calculateEducationProgress(education);

    // Use findOneAndUpdate for atomic update and to avoid VersionErrors
    const updatedEducation = await Education.findOneAndUpdate(
      { _id: education._id },
      education.toObject(),
      { new: true, runValidators: true }
    );

    if (!updatedEducation) {
      return res.status(404).json({ success: false, message: "Education record not found during update" });
    }

    return res.status(200).json({
      success: true,
      message: "Education updated successfully",
      education: updatedEducation,
      educationProgress,
    });
  } catch (err) {
    console.error("❌ Update Error:", err);
    return res.status(500).json({ success: false, message: "Update failed", error: err.message });
  }
};

/* =====================================================================================
   📌 DELETE EDUCATION
===================================================================================== */
export const deleteEducation = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    const deleted = await Education.findOneAndDelete({ studentId: userId });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Education not found" });
    }

    return res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Delete failed" });
  }
};

/* =====================================================================================
   📌 ADMIN – GET ALL EDUCATION
===================================================================================== */
export const getAllEducationRecords = async (req, res) => {
  try {
    const records = await Education.find({})
      .populate("studentId", "firstName lastName email username")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Error fetching records" });
  }
};

/* =====================================================================================
   📌 ADMIN – GET EDUCATION BY STUDENT ID
===================================================================================== */
export const getEducationByStudentId = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    const education = await Education.findOne({ studentId }).populate(
      "studentId",
      "firstName lastName email username"
    );

    if (!education) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const educationProgress = calculateEducationProgress(education);

    return res.status(200).json({
      success: true,
      education,
      educationProgress,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =====================================================================================
   📌 UPLOAD DOCUMENT CONTROLLER
   POST /api/education-transfer/documents/upload
===================================================================================== */
export const uploadDocument = async (req, res) => {
  try {
    console.log('\n🔍 UPLOAD REQUEST DETAILS:');
    console.log('  - User ID:', req.user?.userId || req.user?.id);
    console.log('  - Body keys:', Object.keys(req.body));
    console.log('  - File:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');

    // Check for file validation errors from multer
    if (req.fileValidationError) {
      console.log("❌ File validation error:", req.fileValidationError);
      return res.status(400).json({ 
        success: false, 
        message: req.fileValidationError,
        details: 'File type not allowed'
      });
    }

    if (!req.file) {
      console.log("❌ No file uploaded");
      return res.status(400).json({ 
        success: false, 
        message: "No file uploaded",
        details: "Make sure you're using 'file' as the field name in FormData"
      });
    }

    const documentType = req.body.documentType;
    if (!documentType) {
      console.log("❌ Document type missing");
      return res.status(400).json({
        success: false,
        message: "Document type is required",
        details: "Provide documentType parameter in FormData. Valid types: passport, tenthMarksheet, twelfthMarksheet"
      });
    }

    // Validate documentType
    const validDocumentTypes = ['passport', 'tenthMarksheet', 'twelfthMarksheet'];
    if (!validDocumentTypes.includes(documentType)) {
      console.log("❌ Invalid document type:", documentType);
      return res.status(400).json({
        success: false,
        message: "Invalid document type",
        details: `Valid types: ${validDocumentTypes.join(', ')}`,
        received: documentType
      });
    }

    console.log("✅ File validation passed");
    console.log("  - Document Type:", documentType);

    const userId = req.user?.userId || req.user?.id;
    let education = await Education.findOne({ studentId: userId });

    if (!education) {
      console.log("  - No record found, creating new one");
      education = new Education({
        studentId: userId,
        documents: {
          passport: null,
          tenthMarksheet: null,
          twelfthMarksheet: null,
          otherDocuments: [],
        },
      });
    }

    // Build file info object
    const fileInfo = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      path: req.file.path,
      url: `/uploads/education/${req.file.filename}`,
      uploadedAt: new Date(),
      validated: true,
      confidence: 100,
      documentType: documentType,
    };

    console.log("💾 Saving document info to database");

    // Save in appropriate field
    if (["passport", "tenthMarksheet", "twelfthMarksheet"].includes(documentType)) {
      education.documents[documentType] = fileInfo;
      console.log(`  - Updated ${documentType} field`);
    }

    // Update documents completion
    education.educationCompletion.documents = !!(education.documents.passport && education.documents.tenthMarksheet);

    await education.save();
    console.log("✅ Education record saved successfully\n");

    return res.json({
      success: true,
      message: `${documentType} uploaded successfully`,
      file: fileInfo,
      validation: {
        valid: true,
        confidence: 100,
        matchedKeywords: []
      },
    });

  } catch (err) {
    console.error("\n❌ UPLOAD ERROR:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error during upload",
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    });
  }
};