import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getResume } from "../controllers/resumeController.js";

const router = express.Router();

// All resume routes are protected
router.use(authMiddleware);

// GET resume for logged-in student
router.get("/", getResume);

export default router;