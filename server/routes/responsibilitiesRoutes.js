import express from "express";
import {
  getResponsibilities,
  saveResponsibilities
} from "../controllers/responsibilitiesController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes are protected
router.use(authMiddleware);

// GET responsibilities data
router.get("/responsibilities", getResponsibilities);

// POST save responsibilities data
router.post("/responsibilities", saveResponsibilities);

export default router;