import express from "express";
import {
  getProgramIndexMajorAreas,
  getProgramIndexPrograms,
  getProgramIndexUniversityPrograms,
  getProgramIndexUniversities,
  rebuildProgramSearchIndex,
} from "../controllers/programSearchIndexController.js";

const router = express.Router();

router.post("/rebuild", rebuildProgramSearchIndex);
router.get("/major-areas", getProgramIndexMajorAreas);
router.get("/programs", getProgramIndexPrograms);
router.get("/universities", getProgramIndexUniversities);
router.get("/university/:id/programs", getProgramIndexUniversityPrograms);

export default router;
