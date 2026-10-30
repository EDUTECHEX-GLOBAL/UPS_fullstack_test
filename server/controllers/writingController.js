import Writing from "../models/writingModel.js";
import Account from "../models/accountModel.js";

// ================================
// 🎯 GET WRITING DATA
// ================================
export const getWritingData = async (req, res) => {
  try {
    const studentId = req.userId;

    const writingData = await Writing.findByStudentId(studentId);
    
    if (!writingData) {
      // Return default structure if no writing data exists
      return res.status(200).json({
        success: true,
        writing: {
          personalEssay: {
            selectedPrompt: null,
            essayContent: "",
            wordCount: 0,
            isComplete: false,
            understandingAcknowledged: false,
          },
          additionalInformation: {
            shareCircumstances: null,
            circumstancesText: "",
            circumstancesWordCount: 0,
            shareQualifications: null,
            qualificationsText: "",
            qualificationsWordCount: 0,
            isComplete: false,
          },
          progress: {
            personalEssay: 0,
            additionalInformation: 0,
            overall: 0,
          },
        },
      });
    }

    res.status(200).json({
      success: true,
      writing: writingData,
    });
  } catch (error) {
    console.error("❌ Error fetching writing data:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching writing data",
    });
  }
};

// ================================
// 📝 UPDATE PERSONAL ESSAY (WITH DUPLICATE KEY HANDLING)
// ================================
export const updatePersonalEssay = async (req, res) => {
  try {
    const studentId = req.userId;
    const { selectedPrompt, essayContent, understandingAcknowledged } = req.body;

    console.log("📝 Updating personal essay:", { 
      studentId,
      selectedPrompt, 
      essayContentLength: essayContent?.length,
      wordCount: essayContent ? essayContent.trim().split(/\s+/).length : 0,
      understandingAcknowledged 
    });

    // Validate required fields - ONLY validate prompt selection
    if (!selectedPrompt || selectedPrompt < 1 || selectedPrompt > 7) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid essay prompt (1-7)",
      });
    }

    // Find or create writing document with duplicate key handling
    let writingData = await Writing.findByStudentId(studentId);
    
    if (!writingData) {
      console.log("🔍 No existing data, creating new Writing document...");
      try {
        writingData = new Writing({ studentId });
        // Try to save the new document
        await writingData.save();
      } catch (error) {
        // Handle duplicate key error (E11000)
        if (error.code === 11000) {
          console.log("🔄 Duplicate key error detected, finding existing document...");
          // Try to find the document again (it might have been created by another request)
          writingData = await Writing.findByStudentId(studentId);
          if (!writingData) {
            // If still not found, try to find document with null userId and update it
            writingData = await Writing.findOne({ studentId: null });
            if (writingData) {
              console.log("🔄 Found document with null userId, updating it...");
              writingData.studentId = studentId;
              await writingData.save();
            } else {
              // Last resort: use findOneAndUpdate with upsert
              writingData = await Writing.findOneAndUpdate(
                { studentId },
                { studentId },
                { new: true, upsert: true, setDefaultsOnInsert: true }
              );
            }
          }
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    }

    // Update personal essay
    writingData.updatePersonalEssay(
      selectedPrompt,
      essayContent || "",
      understandingAcknowledged || false
    );

    await writingData.save();

    // Update application progress in Account
    await Account.findByIdAndUpdate(studentId, {
      $set: {
        "applicationProgress.writing": writingData.progress.overall,
      },
    });

    console.log("✅ Personal essay saved successfully");
    res.status(200).json({
      success: true,
      message: "Personal essay saved successfully",
      writing: writingData,
      progress: writingData.progress,
    });
  } catch (error) {
    console.error("❌ Error updating personal essay:");
    console.error("   Error name:", error.name);
    console.error("   Error message:", error.message);
    console.error("   Error code:", error.code);
    
    if (error.code === 11000) {
      return res.status(500).json({
        success: false,
        message: "Database conflict. Please try again.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while saving personal essay",
    });
  }
};

// ================================
// ℹ️ UPDATE ADDITIONAL INFORMATION
// ================================
export const updateAdditionalInformation = async (req, res) => {
  try {
    const studentId = req.userId;
    const { circumstances, qualifications } = req.body;

    console.log("📝 Updating additional info:", { circumstances, qualifications });

    // Validate word limits only if text exists
    if (circumstances?.text && circumstances.text.trim() !== '') {
      const wordCount = circumstances.text.trim().split(/\s+/).length;
      if (wordCount > 250) {
        return res.status(400).json({
          success: false,
          message: "Circumstances description cannot exceed 250 words",
        });
      }
    }

    if (qualifications?.text && qualifications.text.trim() !== '') {
      const wordCount = qualifications.text.trim().split(/\s+/).length;
      if (wordCount > 300) {
        return res.status(400).json({
          success: false,
          message: "Qualifications description cannot exceed 300 words",
        });
      }
    }

    // Find or create writing document
    let writingData = await Writing.findByStudentId(studentId);
    if (!writingData) {
      writingData = new Writing({ studentId });
    }

    // Update additional information
    writingData.updateAdditionalInformation(circumstances, qualifications);
    await writingData.save();

    // Update application progress in Account
    await Account.findByIdAndUpdate(studentId, {
      $set: {
        "applicationProgress.writing": writingData.progress.overall,
      },
    });

    console.log("✅ Additional information saved successfully");
    res.status(200).json({
      success: true,
      message: "Additional information saved successfully",
      writing: writingData,
      progress: writingData.progress,
    });
  } catch (error) {
    console.error("❌ Error updating additional information:", error);
    res.status(500).json({
      success: false,
      message: "Server error while saving additional information",
    });
  }
};

// ================================
// 📊 GET WRITING PROGRESS
// ================================
export const getWritingProgress = async (req, res) => {
  try {
    const studentId = req.userId;

    const writingData = await Writing.findByStudentId(studentId);
    
    const progress = writingData ? writingData.progress : {
      personalEssay: 0,
      additionalInformation: 0,
      overall: 0,
    };

    res.status(200).json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error("❌ Error fetching writing progress:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching writing progress",
    });
  }
};

// ================================
// 🆕 INITIALIZE WRITING DATA
// ================================
export const initializeWritingData = async (req, res) => {
  try {
    const studentId = req.userId;

    const writingData = await Writing.findOrCreateByStudentId(studentId);

    res.status(200).json({
      success: true,
      message: "Writing data initialized successfully",
      writing: writingData,
    });
  } catch (error) {
    console.error("❌ Error initializing writing data:", error);
    res.status(500).json({
      success: false,
      message: "Server error while initializing writing data",
    });
  }
};