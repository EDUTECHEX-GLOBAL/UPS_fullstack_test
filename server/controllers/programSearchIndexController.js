import mongoose from "mongoose";
import ProgramSearchIndex from "../models/ProgramSearchIndex.js";
import University from "../models/University.js";
import {
  extractProgramsForStudent,
  getRequestedDegree,
  normalizeText,
  programIndexDegreeFilter,
} from "../services/majorAreaProgramIndex.js";

const parseProgramType = (value = "", degree = "bachelor") => {
  const normalized = normalizeText(value);
  if (normalized === "pg") return "PG";
  if (normalized === "ug") return "UG";
  if (degree === "professional-degree" || normalized === "medical") return "";
  return degree === "master" ? "PG" : "UG";
};

const pickUniversityName = (university = {}) =>
  university.university || university.universityName || university.INSTNM || university.name || "";

const extractCountry = (university = {}) => {
  if (university.country) return String(university.country).trim();
  if (university.COUNTRY) return String(university.COUNTRY).trim();
  if (university.location && typeof university.location === "object" && !Array.isArray(university.location)) {
    return String(university.location.country || "").trim();
  }
  if (university.GUS_DATA?.country) return String(university.GUS_DATA.country).trim();
  if (typeof university.location === "string") {
    const location = university.location.trim();
    if (!location) return "";
    if (!location.includes(",")) return location;
    const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
    return parts[parts.length - 1] || location;
  }
  return "";
};

const pickCountry = (university = {}) => {
  return extractCountry(university);
};

const pickLocation = (university = {}, country = "") => {
  const location = university.location;
  if (typeof location === "string") return location.trim();
  if (location && typeof location === "object" && !Array.isArray(location)) {
    return [
      location.display,
      location.city,
      location.state,
      location.country,
    ].filter(Boolean).join(", ");
  }
  return [
    university.CITY,
    university.STABBR,
    country,
  ].filter(Boolean).join(", ");
};

const getUniversityName = pickUniversityName;
const getLocationText = pickLocation;
const normalizeProgramType = (degree = "bachelor") => degree === "master" ? "PG" : degree === "professional-degree" ? "MEDICAL" : "UG";

const buildSearchText = (record = {}) =>
  normalizeText([
    record.universityName,
    record.country,
    record.majorArea,
    record.programTitle,
    record.degree,
  ].filter(Boolean).join(" "));

const splitCsv = (value = "") =>
  (Array.isArray(value) ? value : value.toString().split(","))
    .map((item) => item.toString().trim())
    .filter(Boolean);

const getMajorAreasFromQuery = (query = {}) => {
  if (query.majorAreasJson) {
    try {
      const parsed = JSON.parse(query.majorAreasJson);
      if (Array.isArray(parsed)) {
        return parsed.map((value) => String(value || "").trim()).filter(Boolean);
      }
    } catch (error) {
      console.error("Invalid majorAreasJson:", error.message);
    }
  }

  return splitCsv(query.majorAreas || query.majorArea || query.segment || "");
};

const getSelectedProgramObjectsFromQuery = (query = {}) => {
  if (query.programsJson) {
    try {
      const parsed = JSON.parse(query.programsJson);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((value) => {
          if (value && typeof value === "object") {
            const title = (
              value.title ||
              value.value ||
              value.programTitle ||
              value.name ||
              value.program_name ||
              ""
            ).toString().trim();
            return {
              ...value,
              title,
              majorArea: (value.majorArea || value.major_area || value.category || "").toString().trim(),
            };
          }

          return {
            title: String(value).trim(),
            majorArea: "",
          };
        })
        .filter((value) => value.title);
    } catch (error) {
      console.error("Invalid programsJson:", error.message);
    }
  }

  const raw = query.programs || query.program || "";
  return raw ? [{ title: String(raw).trim(), majorArea: "" }] : [];
};

const toProgramIndexRecord = (university = {}, program = {}, degree = "bachelor") => {
  const country = pickCountry(university);
  const majorArea = (program.majorArea || program.major_area || program.category || "").toString().trim();
  const programTitle = (program.title || program.name || program.program_name || "").toString().trim();
  if (!country || !majorArea || !programTitle) return null;

  const universityObjectId = university._id && mongoose.Types.ObjectId.isValid(university._id)
    ? university._id
    : undefined;
  const universityId = universityObjectId?.toString?.() || university.UNITID?.toString?.() || "";
  const programType = normalizeProgramType(degree);
  const universityName = getUniversityName(university);
  const location = getLocationText(university, country);

  const record = {
    universityId,
    universityObjectId,
    universityName,
    country,
    location,
    degree,
    programType,
    majorArea,
    programTitle,
    programId: (program.id || program._id || "").toString(),
    duration: program.duration || "",
    level: program.level || program.educationLevel || "",
    studyMode: program.studyMode || program.study_mode || "",
    college: program.college || program.school || program.faculty || "",
    normalizedCountry: normalizeText(country),
    normalizedMajorArea: normalizeText(majorArea),
    normalizedProgramTitle: normalizeText(programTitle),
    isVisible: university.isVisible !== false,
  };

  return {
    ...record,
    searchText: buildSearchText(record),
  };
};

export const extractUniversityProgramsForIndex = (university = {}, degree = "bachelor") =>
  extractProgramsForStudent(university, degree)
    .map((program) => toProgramIndexRecord(university, program, degree))
    .filter(Boolean);

export const rebuildProgramSearchIndex = async (req, res) => {
  try {
    await ProgramSearchIndex.deleteMany({
      $or: [
        { degree: { $in: ["bachelor", "master"] } },
        programIndexDegreeFilter("professional-degree"),
      ],
    });

    const universities = await University.find({ isVisible: true }).limit(10000).lean();
    const records = universities.flatMap((university) => [
      ...extractUniversityProgramsForIndex(university, "bachelor"),
      ...extractUniversityProgramsForIndex(university, "master"),
      ...extractUniversityProgramsForIndex(university, "professional-degree"),
    ]);

    console.log("Universities found:", universities.length);
    console.log("Index records prepared:", records.length);
    console.log("Sample index record:", records[0]);

    const inserted = records.length
      ? await ProgramSearchIndex.insertMany(records)
      : [];

    res.json({
      success: true,
      universitiesCount: universities.length,
      indexedCount: inserted.length,
      sampleRecord: inserted[0] || records[0] || null,
      totalIndexed: inserted.length,
      totalUniversities: universities.length,
    });
  } catch (error) {
    console.error("ProgramSearchIndex rebuild error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to rebuild program search index",
      error: error.message,
    });
  }
};

const baseIndexQuery = (query = {}) => {
  const degree = getRequestedDegree(query);
  const programType = parseProgramType(query.programType || query.type, degree);
  const normalizedCountry = normalizeText(query.country || "");

  return {
    degree,
    programType,
    filter: {
      isVisible: true,
      ...programIndexDegreeFilter(degree),
      ...(programType ? { programType } : {}),
      ...(normalizedCountry ? { normalizedCountry } : {}),
    },
  };
};

export const getProgramIndexMajorAreas = async (req, res) => {
  try {
    const { degree, programType } = baseIndexQuery(req.query);
    const country = (req.query.country || "").toString().trim();
    const normalizedCountry = normalizeText(country);
    const query = {
      normalizedCountry,
      ...programIndexDegreeFilter(degree),
      ...(programType ? { programType } : {}),
      isVisible: true,
    };
    const totalIndexCount = await ProgramSearchIndex.countDocuments({});
    const matchingCount = await ProgramSearchIndex.countDocuments(query);

    console.log("major area query:", {
      country,
      normalizedCountry,
      degree,
      programType,
    });
    console.log("ProgramSearchIndex count:", totalIndexCount);
    console.log("Matching count:", matchingCount);

    if (totalIndexCount === 0) {
      return res.json({
        success: true,
        isIndexEmpty: true,
        message: "Program index is empty. Please run rebuild index.",
        majorAreas: [],
        sections: [],
        data: [],
        count: 0,
        indexCount: totalIndexCount,
        matchingCount,
      });
    }

    const records = await ProgramSearchIndex.find({
      ...query,
      normalizedMajorArea: { $ne: "" },
    })
      .select("majorArea normalizedMajorArea")
      .lean();

    const majorAreas = [...new Map(
      records
        .filter((record) => record.normalizedMajorArea && record.majorArea)
        .map((record) => [record.normalizedMajorArea, record.majorArea])
    ).values()].sort((a, b) => a.localeCompare(b));

    res.json({
      success: true,
      isIndexEmpty: false,
      majorAreas,
      sections: majorAreas,
      data: majorAreas,
      count: majorAreas.length,
      indexCount: totalIndexCount,
      matchingCount,
    });
  } catch (error) {
    console.error("ProgramSearchIndex major areas error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch indexed major areas" });
  }
};

export const getProgramIndexPrograms = async (req, res) => {
  try {
    const { filter } = baseIndexQuery(req.query);
    const normalizedMajorArea = normalizeText(req.query.majorArea || req.query.segment || "");
    const normalizedGroup = normalizeText(req.query.group || "");
    const normalizedQ = normalizeText(req.query.q || "");
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    if (!normalizedMajorArea) return res.json({ success: true, programs: [], items: [], data: [], count: 0 });

    const records = await ProgramSearchIndex.find({
      ...filter,
      normalizedMajorArea,
      ...(normalizedGroup ? { normalizedProgramTitle: normalizedGroup } : {}),
      ...(normalizedQ ? { searchText: { $regex: normalizedQ.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } } : {}),
    })
      .select({
        programTitle: 1,
        programId: 1,
        majorArea: 1,
        degree: 1,
        programType: 1,
        level: 1,
        duration: 1,
        studyMode: 1,
        normalizedProgramTitle: 1,
      })
      .sort({ programTitle: 1 })
      .lean();

    const byProgram = new Map();
    records.forEach((record) => {
      const key = record.normalizedProgramTitle || normalizeText(record.programTitle);
      if (!key || byProgram.has(key)) return;
      byProgram.set(key, record.programTitle);
    });

    const programs = [...byProgram.values()].sort((a, b) => a.localeCompare(b));
    const start = (page - 1) * limit;
    const items = programs.slice(start, start + limit);

    res.json({
      success: true,
      programs: items,
      items,
      data: items,
      count: items.length,
      pagination: {
        page,
        limit,
        total: programs.length,
        pages: Math.ceil(programs.length / limit),
      },
    });
  } catch (error) {
    console.error("ProgramSearchIndex programs error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch indexed programs" });
  }
};

const indexRecordToProgram = (record = {}) => ({
  id: record.programId || record._id?.toString?.(),
  programId: record.programId || record._id?.toString?.(),
  title: record.programTitle,
  name: record.programTitle,
  program_name: record.programTitle,
  degree: record.degree,
  programType: record.programType,
  level: record.level,
  educationLevel: record.level,
  duration: record.duration,
  studyMode: record.studyMode,
  majorArea: record.majorArea,
  major_area: record.majorArea,
  category: record.majorArea,
  college: record.college,
  universityIds: [record.universityId].filter(Boolean),
});

const indexRecordsToPrograms = (records = []) => {
  const programsByKey = new Map();
  records.forEach((record) => {
    const key = [
      record.normalizedProgramTitle || normalizeText(record.programTitle),
      record.normalizedMajorArea || normalizeText(record.majorArea),
      record.degree,
      record.programType,
    ].join("|");
    if (!programsByKey.has(key)) programsByKey.set(key, indexRecordToProgram(record));
  });
  return [...programsByKey.values()];
};

export const getProgramIndexUniversities = async (req, res) => {
  try {
    const { filter } = baseIndexQuery(req.query);
    const normalizedCountry = normalizeText(req.query.country || "");
    const requestedMajorAreas = [
      req.query.majorArea,
      req.query.segment,
      ...splitCsv(req.query.majorAreas || ""),
    ].map((area) => normalizeText(area || "")).filter(Boolean);
    const normalizedMajorArea = requestedMajorAreas[0] || "";
    const selectedCourseObjects = getSelectedProgramObjectsFromQuery(req.query);
    const selectedPrograms = selectedCourseObjects.map((course) => course.title).filter(Boolean);
    const selectedPairs = selectedCourseObjects
      .map((course) => ({
        title: course.title,
        normalizedTitle: normalizeText(course.title),
        majorArea: course.majorArea || normalizedMajorArea,
        normalizedMajorArea: normalizeText(course.majorArea || normalizedMajorArea),
      }))
      .filter((pair) => pair.normalizedTitle && pair.normalizedMajorArea);
    const selectedMajorAreas = selectedPairs
      .map((pair) => pair.normalizedMajorArea)
      .filter(Boolean);
    const queryMajorAreas = selectedMajorAreas.length
      ? [...new Set(selectedMajorAreas)]
      : normalizedMajorArea ? [normalizedMajorArea] : [];
    const normalizedPrograms = selectedPrograms.map(normalizeText).filter(Boolean);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);

    if (!normalizedPrograms.length && !queryMajorAreas.length) {
      return res.json({ success: true, universities: [], data: [], programs: [], pagination: { page, limit, total: 0, pages: 0 } });
    }
    if (normalizedPrograms.length && !selectedPairs.length) {
      return res.json({ success: true, universities: [], data: [], programs: [], pagination: { page, limit, total: 0, pages: 0 } });
    }
    if (normalizedPrograms.length && !normalizedCountry) {
      return res.json({ success: true, universities: [], data: [], programs: [], pagination: { page, limit, total: 0, pages: 0 } });
    }

    const indexQuery = {
      ...filter,
      ...(normalizedPrograms.length
        ? {
            $or: selectedPairs.map((pair) => ({
              normalizedMajorArea: pair.normalizedMajorArea,
              normalizedProgramTitle: pair.normalizedTitle,
            })),
          }
        : queryMajorAreas.length
          ? { normalizedMajorArea: { $in: queryMajorAreas } }
          : {}),
    };

    const records = await ProgramSearchIndex.find(indexQuery)
      .sort({ universityName: 1, programTitle: 1 })
      .lean();
    const filteredRecords = normalizedPrograms.length
      ? records.filter((record) =>
          selectedPairs.some((pair) =>
            record.normalizedMajorArea === pair.normalizedMajorArea &&
            record.normalizedProgramTitle === pair.normalizedTitle
          )
        )
      : records;

    console.log("Selected major area:", normalizedMajorArea);
    console.log("Selected major areas:", requestedMajorAreas);
    console.log("Selected programs:", selectedPrograms);
    console.log("Selected course pairs:", selectedPairs);
    console.log("Index query major areas:", queryMajorAreas);
    console.log("Records before final filter:", records.map((record) => ({
      university: record.universityName,
      title: record.programTitle,
      majorArea: record.majorArea,
    })));
    console.log("Records after final filter:", filteredRecords.map((record) => ({
      university: record.universityName,
      title: record.programTitle,
      majorArea: record.majorArea,
    })));

    const recordsByUniversityId = new Map();
    filteredRecords.forEach((record) => {
      const key = record.universityObjectId?.toString?.() || record.universityId;
      if (!key) return;
      if (!recordsByUniversityId.has(key)) recordsByUniversityId.set(key, []);
      recordsByUniversityId.get(key).push(record);
    });

    const objectIds = [...recordsByUniversityId.keys()]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    const universityVisibility = objectIds.length
      ? await University.find({ _id: { $in: objectIds } }).select("_id isVisible").lean()
      : [];
    const visibilityById = new Map(
      universityVisibility.map((university) => [university._id.toString(), university.isVisible !== false])
    );
    const matchedUniversities = [...recordsByUniversityId.entries()]
      .filter(([id]) => visibilityById.get(id) !== false)
      .map(([id, universityRecords]) => {
        const firstRecord = universityRecords[0] || {};
        const matchedPrograms = indexRecordsToPrograms(universityRecords);
        return {
          _id: firstRecord.universityObjectId || firstRecord.universityId || id,
          id: firstRecord.universityId || firstRecord.universityObjectId?.toString?.() || id,
          universityId: firstRecord.universityId || firstRecord.universityObjectId?.toString?.() || id,
          university: firstRecord.universityName,
          universityName: firstRecord.universityName,
          INSTNM: firstRecord.universityName,
          country: firstRecord.country,
          location: firstRecord.location || firstRecord.country,
          degree: firstRecord.degree,
          programType: firstRecord.programType,
          matchedPrograms,
          matchedProgramCount: matchedPrograms.length,
          stats: {
            totalPrograms: universityRecords.length,
            matchedProgramCount: matchedPrograms.length,
          },
        };
      })
      .filter(Boolean);
    const start = (page - 1) * limit;
    const data = matchedUniversities.slice(start, start + limit);

    res.json({
      success: true,
      universities: data,
      data,
      programs: [],
      pagination: {
        page,
        limit,
        total: matchedUniversities.length,
        pages: Math.ceil(matchedUniversities.length / limit),
      },
    });
  } catch (error) {
    console.error("ProgramSearchIndex universities error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch indexed universities" });
  }
};

export const getProgramIndexUniversityPrograms = async (req, res) => {
  try {
    const lookupId = String(req.params.id || "").trim();
    const { degree, programType } = baseIndexQuery(req.query);
    const country = String(req.query.country || "").trim();
    const normalizedCountry = normalizeText(country);
    const selectedCourses = getSelectedProgramObjectsFromQuery(req.query);
    const fallbackMajorAreas = getMajorAreasFromQuery(req.query);
    const selectedPairs = selectedCourses.map((course) => ({
      title: course.title,
      normalizedTitle: normalizeText(course.title),
      majorArea: course.majorArea || fallbackMajorAreas[0] || "",
      normalizedMajorArea: normalizeText(course.majorArea || fallbackMajorAreas[0] || ""),
    })).filter((pair) => pair.normalizedTitle && pair.normalizedMajorArea);
    const requestedMajorAreas = [
      ...new Set([
        ...selectedPairs.map((pair) => pair.normalizedMajorArea),
        ...fallbackMajorAreas.map(normalizeText),
      ].filter(Boolean)),
    ];
    const showAll = req.query.showAll === "true";
    const objectId = mongoose.Types.ObjectId.isValid(lookupId)
      ? new mongoose.Types.ObjectId(lookupId)
      : null;
    const universityLookup = [
      { universityId: lookupId },
      ...(objectId ? [{ universityObjectId: objectId }] : []),
    ];

    const baseFilter = {
      isVisible: true,
      ...programIndexDegreeFilter(degree),
      ...(programType ? { programType } : {}),
      $or: universityLookup,
      ...(normalizedCountry ? { normalizedCountry } : {}),
    };

    console.log("=== DEBUG GET PROGRAM INDEX ===");
    console.log("req.query:", req.query);
    console.log("lookupId:", lookupId);
    console.log("baseFilter:", JSON.stringify(baseFilter, null, 2));

    const allRecords = await ProgramSearchIndex.find(baseFilter)
      .sort({ programTitle: 1 })
      .lean();

    console.log("allRecords length:", allRecords.length);
    console.log("===============================");

    if (!allRecords.length) {
      if (objectId) {
        const university = await University.findById(objectId).lean();
        if (university) {
          const uName = pickUniversityName(university);
          const rawProgs = university.programs_data || [];
          
          let filteredProgs = rawProgs;
          if (String(req.query.programType).toUpperCase() === 'MEDICAL') {
            const isMed = val => {
              if (!val) return false;
              const norm = val.toLowerCase().replace(/[^a-z0-9]/g, '');
              return ['mbbs', 'md', 'do', 'bds', 'dds', 'dmd', 'pharmd', 'dvm', 'vet', 'med', 'medical', 'medicine', 'dental', 'dentistry'].some(k => norm.includes(k));
            };
            filteredProgs = rawProgs.filter(p => isMed(p.degree));
          }

          const programs = filteredProgs.map((p, idx) => ({
            id: p.id || p._id?.toString?.() || `prog-${idx}`,
            programId: p.id || p._id?.toString?.() || `prog-${idx}`,
            title: p.title || p.name || p.program_name,
            name: p.title || p.name || p.program_name,
            program_name: p.title || p.name || p.program_name,
            degree: p.degree,
            programType: req.query.programType || '',
            level: p.level,
            educationLevel: p.level,
            duration: p.duration,
            studyMode: p.studyMode,
            majorArea: p.majorArea || p.major_area || p.category,
            major_area: p.majorArea || p.major_area || p.category,
            category: p.majorArea || p.major_area || p.category,
            college: p.college,
            universityIds: [lookupId],
          }));

          return res.json({
            success: true,
            university: uName,
            universityId: lookupId,
            country: university.country || university.COUNTRY || university.location?.country || country,
            totalPrograms: programs.length,
            matchedProgramCount: programs.length,
            matchedPrograms: programs,
            programs,
            programs_data: programs,
          });
        }
      }

      const anyRecord = await ProgramSearchIndex.findOne({ $or: universityLookup }).lean();
      
      return res.json({
        success: true,
        university: anyRecord ? anyRecord.universityName : "Unknown University",
        universityId: lookupId,
        country: anyRecord ? anyRecord.country : country,
        totalPrograms: 0,
        matchedProgramCount: 0,
        matchedPrograms: [],
        programs: [],
        programs_data: [],
      });
    }

    const matchCandidateRecords = selectedPairs.length || requestedMajorAreas.length
      ? await ProgramSearchIndex.find({
          ...baseFilter,
          ...(selectedPairs.length
            ? {
                $and: [
                  {
                    $or: selectedPairs.map((pair) => ({
                      normalizedMajorArea: pair.normalizedMajorArea,
                      normalizedProgramTitle: pair.normalizedTitle,
                    })),
                  },
                ],
              }
            : { normalizedMajorArea: { $in: requestedMajorAreas } }),
        })
          .sort({ programTitle: 1 })
          .lean()
      : allRecords;
    const matchedRecords = matchCandidateRecords.filter((record) => {
      if (selectedPairs.length) {
        return selectedPairs.some((pair) => {
          const majorAreaMatches = !pair.normalizedMajorArea ||
            record.normalizedMajorArea === pair.normalizedMajorArea;
          return majorAreaMatches && record.normalizedProgramTitle === pair.normalizedTitle;
        });
      }
      if (requestedMajorAreas.length) {
        return requestedMajorAreas.includes(record.normalizedMajorArea);
      }
      return false;
    });
    const allPrograms = indexRecordsToPrograms(allRecords);
    const matchedPrograms = indexRecordsToPrograms(matchedRecords);
    const programs = showAll ? allPrograms : matchedPrograms;
    const firstRecord = allRecords[0];

    console.log("Modal endpoint source: ProgramSearchIndex");
    console.log("lookupId:", lookupId);
    console.log("country:", country);
    console.log("selectedPairs:", selectedPairs);
    console.log("matchedPrograms count:", matchedPrograms.length);

    return res.json({
      success: true,
      university: firstRecord.universityName,
      universityId: firstRecord.universityId || firstRecord.universityObjectId,
      country: firstRecord.country,
      totalPrograms: allPrograms.length,
      matchedProgramCount: matchedPrograms.length,
      matchedPrograms,
      programs,
      programs_data: programs,
    });
  } catch (error) {
    console.error("ProgramSearchIndex university programs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch indexed university programs",
    });
  }
};


