import express from "express";
import {
  getStudentUniversityPrograms,
  searchStudentPrograms,
  searchStudentUniversities,
} from "../controllers/studentUniversityController.js";

const router = express.Router();

router.get("/programs/search", searchStudentPrograms);
router.get("/programs", searchStudentPrograms);
router.get("/", searchStudentUniversities);
router.get("/search", searchStudentUniversities);
router.get("/:id/programs", getStudentUniversityPrograms);

export default router;
