import express from "express";
import {
  saveExtendedProfile,
  getAllProfiles,
} from "../controllers/extendedProfileController.js";

const router = express.Router();

// 💾 Save profile data
router.post("/save", saveExtendedProfile);

// 📋 Get all profiles
router.get("/", getAllProfiles);

export default router;
