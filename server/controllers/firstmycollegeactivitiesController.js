import FirstMyCollegeActivities from "../models/firstMyCollegeActivitiesModel.js";
import Account from "../models/accountModel.js";

// Get activities for a specific college
export const getActivities = async (req, res) => {
  try {
    const { collegeId } = req.params;
    const studentId = req.user.userId;


    let activities = await FirstMyCollegeActivities.findOne({
      studentId,
      collegeId,
    });

    // If no activities exist, create a default one with one empty activity
    if (!activities) {
      activities = await FirstMyCollegeActivities.create({
        studentId,
        collegeId,
        activities: [""], // Start with one empty activity
        progress: 0,
      });
    }

    res.status(200).json({
      success: true,
      activities: {
        activities: activities.activities,
        progress: activities.progress,
        collegeId: activities.collegeId,
        studentId: activities.studentId,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching activities:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching activities",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Save activities for a specific college
export const saveActivities = async (req, res) => {
  try {
    const { collegeId } = req.params;
    const { activities } = req.body;
    const studentId = req.user.userId;

    console.log(`💾 Saving activities for college: ${collegeId}`, activities);

    if (!activities || !Array.isArray(activities)) {
      return res.status(400).json({
        success: false,
        message: "Activities array is required",
      });
    }

    // Validate activities array length
    if (activities.length > 5) {
      return res.status(400).json({
        success: false,
        message: "Maximum 5 activities allowed",
      });
    }

    // Find existing activities or create new
    let activitiesDoc = await FirstMyCollegeActivities.findOne({
      studentId,
      collegeId,
    });

    if (activitiesDoc) {
      // Update existing
      activitiesDoc.activities = activities;
      await activitiesDoc.save();
    } else {
      // Create new
      activitiesDoc = await FirstMyCollegeActivities.create({
        studentId,
        collegeId,
        activities,
      });
    }

    // Update application progress in Account
    await updateApplicationProgress(studentId, activitiesDoc.progress);

    res.status(200).json({
      success: true,
      message: "Activities saved successfully",
      activities: {
        activities: activitiesDoc.activities,
        progress: activitiesDoc.progress,
        collegeId: activitiesDoc.collegeId,
        studentId: activitiesDoc.studentId,
      },
    });
  } catch (error) {
    console.error("❌ Error saving activities:", error);
    res.status(500).json({
      success: false,
      message: "Server error saving activities",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Clear specific activity
export const clearActivity = async (req, res) => {
  try {
    const { collegeId, index } = req.params;
    const studentId = req.user.userId;

    console.log(`🗑️ Clearing activity ${index} for college: ${collegeId}`);

    const activitiesDoc = await FirstMyCollegeActivities.findOne({
      studentId,
      collegeId,
    });

    if (!activitiesDoc) {
      return res.status(404).json({
        success: false,
        message: "Activities not found",
      });
    }

    // Remove the specific activity
    if (index >= 0 && index < activitiesDoc.activities.length) {
      activitiesDoc.activities.splice(index, 1);
      
      // Ensure at least one activity field exists
      if (activitiesDoc.activities.length === 0) {
        activitiesDoc.activities = [""];
      }
      
      await activitiesDoc.save();

      // Update application progress
      await updateApplicationProgress(studentId, activitiesDoc.progress);

      res.status(200).json({
        success: true,
        message: "Activity cleared successfully",
        activities: {
          activities: activitiesDoc.activities,
          progress: activitiesDoc.progress,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid activity index",
      });
    }
  } catch (error) {
    console.error("❌ Error clearing activity:", error);
    res.status(500).json({
      success: false,
      message: "Server error clearing activity",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Clear all activities
export const clearAllActivities = async (req, res) => {
  try {
    const { collegeId } = req.params;
    const studentId = req.user.userId;

    console.log(`🗑️ Clearing all activities for college: ${collegeId}`);

    const activitiesDoc = await FirstMyCollegeActivities.findOne({
      studentId,
      collegeId,
    });

    if (!activitiesDoc) {
      return res.status(404).json({
        success: false,
        message: "Activities not found",
      });
    }

    // Reset to one empty activity
    activitiesDoc.activities = [""];
    await activitiesDoc.save();

    // Update application progress
    await updateApplicationProgress(studentId, activitiesDoc.progress);

    res.status(200).json({
      success: true,
      message: "All activities cleared successfully",
      activities: {
        activities: activitiesDoc.activities,
        progress: activitiesDoc.progress,
      },
    });
  } catch (error) {
    console.error("❌ Error clearing all activities:", error);
    res.status(500).json({
      success: false,
      message: "Server error clearing activities",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Helper function to update application progress in Account
const updateApplicationProgress = async (studentId, activitiesProgress) => {
  try {
    await Account.findByIdAndUpdate(
      studentId,
      {
        $set: {
          "applicationProgress.activities": activitiesProgress,
        },
      },
      { new: true }
    );
    
    console.log(`📊 Updated activities progress to ${activitiesProgress}% for student: ${studentId}`);
  } catch (error) {
    console.error("❌ Error updating application progress:", error);
  }
};