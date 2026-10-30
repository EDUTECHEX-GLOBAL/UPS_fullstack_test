import ExtendedProfile from "../models/extendedProfileModel.js";

/**
 * 💾 Save a new extended profile
 */
export const saveExtendedProfile = async (req, res) => {
  try {
    console.log("📩 Incoming data:", req.body);
    const newProfile = new ExtendedProfile(req.body);
    await newProfile.save();

    res.status(201).json({
      success: true,
      message: "Profile saved successfully!",
      data: newProfile,
    });
  } catch (error) {
    console.error("❌ Error saving extended profile:", error);
    res.status(500).json({
      success: false,
      message: "Server error while saving profile",
      error: error.message,
    });
  }
};

/**
 * 📋 Get all saved extended profiles
 */
export const getAllProfiles = async (req, res) => {
  try {
    const profiles = await ExtendedProfile.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Profiles retrieved successfully!",
      count: profiles.length,
      data: profiles,
    });
  } catch (error) {
    console.error("❌ Error fetching profiles:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching profiles",
      error: error.message,
    });
  }
};
