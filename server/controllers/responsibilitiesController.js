import Responsibilities from "../models/responsibilitiesModel.js";
import Account from "../models/accountModel.js";

// Get responsibilities data
export const getResponsibilities = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    let responsibilitiesData = await Responsibilities.findOne({ studentId: userId });
    
    // If no responsibilities data exists, create default one
    if (!responsibilitiesData) {
      responsibilitiesData = await Responsibilities.create({
        studentId: userId,
        responsibilities: [],
        circumstances: []
      });
    }

    res.status(200).json({
      success: true,
      responsibilitiesData: {
        responsibilities: responsibilitiesData.responsibilities,
        circumstances: responsibilitiesData.circumstances
      }
    });
  } catch (error) {
    console.error("❌ Error fetching responsibilities data:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error fetching responsibilities data" 
    });
  }
};

// Save responsibilities data
export const saveResponsibilities = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { responsibilitiesData } = req.body;

    const updatedResponsibilities = await Responsibilities.findOneAndUpdate(
      { studentId: userId },
      { 
        responsibilities: responsibilitiesData.responsibilities || [],
        circumstances: responsibilitiesData.circumstances || []
      },
      { 
        new: true, 
        upsert: true, 
        runValidators: true 
      }
    );

    // Update application progress to 100%
    await Account.findByIdAndUpdate(
      userId,
      { "applicationProgress.responsibilities": 100 }
    );

    res.status(200).json({
      success: true,
      message: "Responsibilities data saved successfully",
      responsibilitiesData: {
        responsibilities: updatedResponsibilities.responsibilities,
        circumstances: updatedResponsibilities.circumstances
      }
    });
  } catch (error) {
    console.error("❌ Error saving responsibilities data:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error saving responsibilities data" 
    });
  }
};