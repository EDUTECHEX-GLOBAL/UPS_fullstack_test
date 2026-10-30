import express from "express";
import { getUniversityInfo, getChatResponse, testEndpoint } from "../controllers/universityController.js";

const router = express.Router();

// Legacy: POST /api/university-info/ (maps to router.post("/"))
router.post("/", getUniversityInfo);

// ✅ New: POST /api/university-info/chat-response
router.post("/chat-response", getChatResponse);

// 🔍 Test endpoint: GET /api/university-info/test
router.get("/test", testEndpoint);

export default router;
