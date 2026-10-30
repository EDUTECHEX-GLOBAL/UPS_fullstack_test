import express from "express";
import {
  getStudentCountryUniversityCountries,
  getEnrollmentUniversities,
} from "../controllers/studentCountryUniversityCountryController.js";

const router = express.Router();

router.get("/countries", getStudentCountryUniversityCountries);
router.get("/universities", getEnrollmentUniversities);

export default router;
