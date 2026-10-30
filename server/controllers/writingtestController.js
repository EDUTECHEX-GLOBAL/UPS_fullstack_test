// controllers/writingtestController.js
import WritingTest from "../models/writingtestModel.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * 📊 Helper: Check if a section has meaningful data
 */
const isSectionComplete = (section, sectionName) => {
  if (!section) return false;

  switch (sectionName) {
    case 'personalEssay':
      return !!(section.essayRequired && section.selectedTopic && section.essayText && section.wordCount >= 250);
    
    case 'additionalInformation':
      return section.shareDetails !== undefined && section.shareDetails !== '';
    
    default:
      return false;
  }
};

/**
 * 📊 Helper: Calculate writing completion progress with auto-detection
 */
const calculateWritingProgress = (writing) => {
  let completedFields = 0;
  let totalFields = 2; // 2 main sections

  // Auto-detect completion based on data presence
  const autoCompletion = {
    personalEssay: isSectionComplete(writing.personalEssay, 'personalEssay'),
    additionalInformation: isSectionComplete(writing.additionalInformation, 'additionalInformation'),
  };

  // Update the writingCompletion object
  Object.keys(autoCompletion).forEach(key => {
    if (autoCompletion[key] && !writing.writingCompletion[key]) {
      writing.writingCompletion[key] = true;
    }
  });

  // Count completed sections
  completedFields = Object.values(writing.writingCompletion).filter(Boolean).length;

  const progress = Math.round((completedFields / totalFields) * 100);

  console.log(`📊 Writing progress: ${completedFields}/${totalFields} = ${progress}%`);
  console.log(`   Completed sections:`, Object.keys(writing.writingCompletion).filter(k => writing.writingCompletion[k]));

  return progress;
};

/**
 * 👤 Get Current Student's Writing (using JWT token)
 * GET /api/writingtest
 */
export const getCurrentWriting = async (req, res) => {
  try {
    const userId = req.user?.id;

    console.log("📥 Fetching writing test data...");
    console.log("🔑 User ID from token:", userId);

    if (!userId) {
      console.warn("⚠️ No user ID in token");
      return res.status(401).json({
        success: false,
        message: "Unauthorized - No user ID found",
      });
    }

    let writing = await WritingTest.findOne({ studentId: userId });

    // If no writing record exists, create a new one with default values
    if (!writing) {
      console.log("📝 No writing test record found, creating new one...");
      writing = new WritingTest({
        studentId: userId,
        personalEssay: {
          essayRequired: false,
          selectedTopic: '',
          essayText: '',
          wordCount: 0,
        },
        additionalInformation: {
          shareDetails: '',
          challengesExperienced: '',
          additionalQualifications: '',
        },
        writingCompletion: {
          personalEssay: false,
          additionalInformation: false,
        },
      });
      await writing.save();
      console.log("✅ New writing test record created");
    }

    console.log("✅ Writing test data fetched successfully");

    // Calculate writing progress with auto-detection
    const writingProgress = calculateWritingProgress(writing);

    return res.status(200).json({
      success: true,
      writing: writing,
      writingProgress: writingProgress,
    });
  } catch (error) {
    console.error("❌ Error fetching writing test:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching writing test data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * 💾 Update Current Student's Writing (using JWT token)
 * PUT /api/writingtest
 */
export const updateCurrentWriting = async (req, res) => {
  try {
    const userId = req.user?.id;

    console.log("💾 Updating writing test data...");
    console.log("🔑 User ID from token:", userId);
    console.log("📦 Update data keys:", Object.keys(req.body));

    if (!userId) {
      console.warn("⚠️ No user ID in token");
      return res.status(401).json({
        success: false,
        message: "Unauthorized - No user ID found",
      });
    }

    // Find existing writing record or create new one
    let writing = await WritingTest.findOne({ studentId: userId });

    if (!writing) {
      console.log("📝 Creating new writing test record...");
      writing = new WritingTest({
        studentId: userId,
        ...req.body,
      });
    } else {
      // Update existing record
      Object.keys(req.body).forEach((key) => {
        writing[key] = req.body[key];
      });
    }

    // Calculate updated writing progress with auto-detection
    const writingProgress = calculateWritingProgress(writing);

    // Save after calculating progress (so writingCompletion is updated)
    await writing.save();

    console.log("✅ Writing test data updated successfully");
    console.log("📊 New progress:", writingProgress + "%");

    return res.status(200).json({
      success: true,
      message: "Writing test data updated successfully",
      writing: writing,
      writingProgress: writingProgress,
      progress: {
        writing: writingProgress,
      },
    });
  } catch (error) {
    console.error("❌ Error updating writing test:", error);
    console.error("   Stack trace:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Error updating writing test data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * 🗑️ Delete Writing Test Record
 * DELETE /api/writingtest
 */
export const deleteWriting = async (req, res) => {
  try {
    const userId = req.user?.id;

    console.log("🗑️ Deleting writing test record...");
    console.log("🔑 User ID from token:", userId);

    if (!userId) {
      console.warn("⚠️ No user ID in token");
      return res.status(401).json({
        success: false,
        message: "Unauthorized - No user ID found",
      });
    }

    const writing = await WritingTest.findOneAndDelete({ studentId: userId });

    if (!writing) {
      return res.status(404).json({
        success: false,
        message: "Writing test record not found",
      });
    }

    console.log("✅ Writing test record deleted successfully");

    return res.status(200).json({
      success: true,
      message: "Writing test record deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting writing test:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting writing test record",
    });
  }
};