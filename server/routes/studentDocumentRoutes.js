import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { createUploader } from "../middleware/uploadMiddleware.js";
import {
  deleteStudentDocument,
  getStudentDocumentViewUrl,
  uploadStudentDocument,
} from "../controllers/applicationscorecontroller.js";

const router = express.Router();
const marksheetUpload = createUploader("score-grade-documents", 10);

router.use(authMiddleware);

router.post(
  "/upload",
  marksheetUpload.single("document"),
  (req, res, next) => {
    if (req.fileValidationError) {
      return res.status(400).json({ success: false, message: req.fileValidationError });
    }
    return next();
  },
  uploadStudentDocument
);

router.get("/:documentId/view-url", getStudentDocumentViewUrl);
router.delete("/:documentId", deleteStudentDocument);

export default router;
