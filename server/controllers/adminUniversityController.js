// controllers/adminUniversityController.js
import University from "../models/University.js";
import BachelorsUniversity from "../models/bachelorsUniversityModel.js";
import MastersUniversity from "../models/mastersUniversityModel.js";
import {
  loadUniversityData,
} from "../services/adminUniversityService.js";

const normalizeKey = (value = "") =>
  value.toString().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();

export const normalizeDegree = (input = "") => {
  const value = normalizeKey(input);
  if (["ug", "bachelor", "bachelors", "undergraduate"].includes(value)) return "bachelor";
  if (["pg", "master", "masters", "postgraduate"].includes(value)) return "master";
  return "";
};

const getDegreeLabels = (degree) => degree === "master"
  ? { degreeLabel: "Master", level: "Postgraduate", duration: "1-2 years" }
  : { degreeLabel: "Bachelor", level: "Undergraduate", duration: "3-4 years" };

export const generateProgramTemplate = (degreeInput = "bachelor") => {
  const degree = normalizeDegree(degreeInput) || "bachelor";

  return {
    programSource: "fallback-template",
    degree,
    major_areas: [],
    programs_data: [],
    stats: {
      totalPrograms: 0,
      totalCategories: 0,
    },
  };
};

export const normalizeMajorArea = (value = "") => {
  const original = value?.toString().trim() || "";
  return original;
};

const majorAreaMatches = (area = "", selected = "") => {
  if (!selected) return true;
  return normalizeMajorArea(area) === normalizeMajorArea(selected);
};

const filterProgramBundleBySegment = (bundle, segment = "") => {
  if (!segment) return bundle;
  const programs_data = (bundle.programs_data || []).filter((program) =>
    majorAreaMatches(program.major_area || program.majorArea, segment)
  );
  const major_areas = (bundle.major_areas || [])
    .map((area) => ({
      ...area,
      specific_programs: (area.specific_programs || []).filter((program) =>
        programs_data.some((p) => normalizeKey(p.program_name) === normalizeKey(program.program_name))
      ),
    }))
    .filter((area) => majorAreaMatches(area.major_area, segment) && area.specific_programs.length > 0);

  return {
    ...bundle,
    major_areas,
    programs_data,
    stats: {
      totalPrograms: programs_data.length,
      totalCategories: major_areas.length,
    },
  };
};

const hasOfficialPrograms = (bundle = {}) =>
  bundle.programSource === "official" && Array.isArray(bundle.programs_data) && bundle.programs_data.length > 0;

export const getProgramBundleForDegree = (obj = {}, degreeInput = "bachelor", segment = "") => {
  const degree = normalizeDegree(degreeInput) || "bachelor";
  const template = obj.programTemplates?.[degree];
  let bundle = hasOfficialPrograms(template) ? template : null;

  if (!bundle) {
    const explicitDegree = normalizeDegree(
      obj.degree || obj.educationLevel || obj.degreeLevel || obj.source || obj.GUS_DATA?.level
    ) || "bachelor";
    const legacyPrograms = Array.isArray(obj.programs_data) && obj.programs_data.length
      ? obj.programs_data
      : Array.isArray(obj.programs) && obj.programs.length
        ? obj.programs
        : Array.isArray(obj.GUS_DATA?.programs_data) && obj.GUS_DATA.programs_data.length
          ? obj.GUS_DATA.programs_data
          : [];
    const legacyMajorAreas = Array.isArray(obj.major_areas) && obj.major_areas.length
      ? obj.major_areas
      : Array.isArray(obj.GUS_DATA?.major_areas) ? obj.GUS_DATA.major_areas : [];

    if (legacyPrograms.length && explicitDegree === degree) {
      const normalizedPrograms = legacyPrograms.map((program) => normalizeProgramResponse(program, { ...obj, degree }));
      bundle = {
        programSource: "official",
        programs_data: normalizedPrograms,
        major_areas: legacyMajorAreas.length ? legacyMajorAreas : Object.values(
          normalizedPrograms.reduce((acc, program) => {
            const area = program.major_area || program.majorArea || "General";
            if (!acc[area]) acc[area] = { major_area: area, specific_programs: [] };
            acc[area].specific_programs.push({ program_name: program.program_name || program.title || program.name });
            return acc;
          }, {})
        ),
        stats: { totalPrograms: normalizedPrograms.length, totalCategories: 0 },
      };
      bundle.stats.totalCategories = bundle.major_areas.length;
    }
  }

  if (!bundle) bundle = generateProgramTemplate(degree);
  return filterProgramBundleBySegment(bundle, segment);
};

const getProgramLevel = (obj = {}) => {
  const degree = (obj.degree || "").toLowerCase();
  if (degree === "bachelor" || degree === "bachelors") return "Bachelor";
  if (degree === "master" || degree === "masters") return "Master";
  return obj.educationLevel || obj.GUS_DATA?.level || "";
};

const normalizeProgramResponse = (program = {}, obj = {}, areaValue = "") => {
  const source = typeof program === "string" ? { title: program } : { ...program };
  const title = source.title || source.name || source.program_name || "";
  const originalMajorArea = source.original_major_area || source.major_area || source.majorArea || areaValue || "";
  const normalizedMajorArea = normalizeMajorArea(originalMajorArea);

  return {
    id: source.id || `${normalizedMajorArea || "program"}-${title}`.replace(/\s+/g, "-"),
    title,
    name: source.name || title,
    program_name: source.program_name || title,
    degree: source.degree || obj.degree || "",
    duration: source.duration || "",
    level: source.level || getProgramLevel(obj),
    studyMode: source.studyMode || "On Campus",
    major_area: normalizedMajorArea,
    majorArea: normalizedMajorArea,
    original_major_area: originalMajorArea,
    description: source.description || "",
  };
};

/* ================================
   HELPER: Normalize university doc
   Handles BOTH old schema (INSTNM/UNITID)
   AND new schema (university/location/degree)
================================ */
const normalizeUniversity = (doc) => {
  const obj = doc.toObject ? doc.toObject() : { ...doc };

  // ── Name ──────────────────────────────────────────
  const universityName =
    obj.universityName ||
    obj.university ||
    obj.INSTNM ||
    obj.name ||
    "Unknown University";

  // ── Code ──────────────────────────────────────────
  const universityCode =
    obj.universityCode ||
    (obj.UNITID ? String(obj.UNITID) : null) ||
    obj._id?.toString() ||
    "";

  // ── Location ──────────────────────────────────────
  let city    = obj.city    || obj.CITY    || obj.location?.city    || "";
  let state   = obj.state   || obj.STABBR  || obj.location?.state   || "";
  let country = obj.country || obj.location?.country || obj.GUS_DATA?.country || "USA";

  // new schema stores location as a string like "Singapore" or "United Kingdom"
  if (!city && !state && typeof obj.location === "string") {
    country = obj.location;
  }

  // ── Degree / Level ────────────────────────────────
  const degree         = obj.degree || "";
  const educationLevel = obj.educationLevel || "";

  // Infer source/level from new schema
  let source = obj.source || "admin";
if (!obj.source) {
  const d = degree.toLowerCase();
  const e = educationLevel.toLowerCase();
  if (d === "bachelor" || d === "bachelors" || e === "undergraduate") {
    source = "bachelors";
  } else if (d === "master" || d === "masters" || d === "pg" || e === "postgraduate" || e === "pg") {
    source = "masters";
  } else if (d === "phd" || e === "doctorate") {
    source = "phd";
  }
}

  // ── Programs ──────────────────────────────────────
  let programs = Array.isArray(obj.programs) ? [...obj.programs] : [];

  // New schema: programs_data at top level or inside GUS_DATA
  if (!programs.length && Array.isArray(obj.programs_data)) {
    programs = obj.programs_data;
  }
  if (!programs.length && Array.isArray(obj.GUS_DATA?.programs_data)) {
    programs = obj.GUS_DATA.programs_data;
  }
  // New schema: major_areas → flatten to programs list
  const majorAreasSource = obj.major_areas || obj.GUS_DATA?.major_areas || [];
  if (!programs.length && Array.isArray(majorAreasSource) && majorAreasSource.length) {
    majorAreasSource.forEach((area) => {
      (area.specific_programs || []).forEach((prog) => {
        programs.push({
          id: `${area.major_area}-${prog.program_name}`.replace(/\s+/g, "-"),
          name: prog.program_name,
          title: prog.program_name,
          program_name: prog.program_name,
          major_area: normalizeMajorArea(area.major_area),
          majorArea: normalizeMajorArea(area.major_area),
          original_major_area: area.major_area,
          degree,
          level:
            degree === "bachelor"
              ? "Bachelor"
              : degree === "master"
              ? "Master"
              : educationLevel || obj.GUS_DATA?.level || "Undergraduate",
          studyMode: "On Campus",
          duration: "",
        });
      });
    });
  }

  programs = programs.map((program) => normalizeProgramResponse(program, obj));

  // ── Website ───────────────────────────────────────
  const website =
    obj.website ||
    obj.WEBADDR ||
    obj.contact?.website ||
    "";

  // ── Logo ──────────────────────────────────────────
  const logo = obj.universityLogo || obj.logo || null;

  // ── Stats ─────────────────────────────────────────
  const stats = obj.stats || obj.GUS_DATA?.stats || null;

  return {
    ...obj,
    // Normalised fields that the frontend expects
    universityName,
    universityCode,
    INSTNM: universityName,   // keep old field so frontend works
    UNITID: obj.UNITID || universityCode,
    city,
    state,
    country,
    location: { city, state, country },
    degree,
    educationLevel,
    source,
    programs,
    programCount: programs.length,
    website,
    logo,
    stats,
    importedByAdmin: true,
    lastUpdated: obj.updatedAt || obj.createdAt,
  };
};

/* ================================
   HELPER: Extract programs from doc
================================ */
const extractPrograms = (university) => {
  // Already normalised
  if (university.programs?.length) {
    const obj = university.toObject ? university.toObject() : university;
    return university.programs.map((program) => normalizeProgramResponse(program, obj));
  }

  // Raw doc
  const obj = university.toObject ? university.toObject() : university;
  let programs = [];

  if (Array.isArray(obj.programs_data)) programs = [...obj.programs_data];
  if (!programs.length && Array.isArray(obj.GUS_DATA?.programs_data))
    programs = [...obj.GUS_DATA.programs_data];

  const majorAreas = obj.major_areas || obj.GUS_DATA?.major_areas || [];
  if (Array.isArray(majorAreas)) {
    majorAreas.forEach((area) => {
      (area.specific_programs || []).forEach((prog) => {
        const exists = programs.some(
          (p) =>
            (p.title || "").toLowerCase() === prog.program_name.toLowerCase() ||
            (p.program_name || "").toLowerCase() === prog.program_name.toLowerCase()
        );
        if (!exists) {
          programs.push({
            id: `area-${area.major_area}-${prog.program_name}`.replace(/\s+/g, "-"),
            name: prog.program_name,
            title: prog.program_name,
            program_name: prog.program_name,
            degree: obj.degree || "",
            duration: "",
            major_area: normalizeMajorArea(area.major_area),
            majorArea: normalizeMajorArea(area.major_area),
            original_major_area: area.major_area,
            level: obj.GUS_DATA?.level || obj.educationLevel || "Undergraduate",
            studyMode: "On Campus",
            description: `${prog.program_name} – ${area.major_area} at ${obj.university || obj.INSTNM}`,
          });
        }
      });
    });
  }

  return programs.map((program) => normalizeProgramResponse(program, obj));
};

const normalizeAdminListDoc = (doc, source = "admin") => {
  const base =
    source === "bachelors"
      ? { ...doc, degree: "bachelor", educationLevel: "Undergraduate", source }
      : source === "masters"
        ? { ...doc, degree: "master", educationLevel: "Postgraduate", source }
        : source === "college"
          ? {
              ...doc,
              INSTNM: doc.collegeName || doc.INSTNM || doc.universityName,
              UNITID: doc.collegeCode || doc.UNITID || doc.universityCode,
              IALIAS: doc.alias || doc.IALIAS || "",
              universityName: doc.collegeName || doc.universityName,
              universityCode: doc.collegeCode || doc.universityCode,
              source,
            }
          : { ...doc, source };

  return normalizeUniversity(base);
};

const getAdminUniversityQuery = (value = "") => {
  const search = value.toString().trim();
  const visibilityQuery = {
    $or: [
      { isVisible: true },
      { isVisible: { $exists: false } },
    ],
  };
  if (!search) return visibilityQuery;
  const regex = { $regex: search, $options: "i" };
  return {
    $and: [
      visibilityQuery,
      {
        $or: [
          { university: regex },
          { universityName: regex },
          { name: regex },
          { INSTNM: regex },
          { IALIAS: regex },
          { CITY: regex },
          { STABBR: regex },
          { country: regex },
          { "location.city": regex },
          { "location.state": regex },
          { "location.country": regex },
          { "programs.title": regex },
          { "programs.name": regex },
          { "programs.program_name": regex },
          { "programs_data.title": regex },
          { "programs_data.name": regex },
          { "programs_data.program_name": regex },
          { "GUS_DATA.programs_data.title": regex },
          { "GUS_DATA.programs_data.name": regex },
          { "GUS_DATA.programs_data.program_name": regex },
          { "major_areas.major_area": regex },
          { "GUS_DATA.major_areas.major_area": regex },
          { "major_areas.specific_programs.program_name": regex },
          { "GUS_DATA.major_areas.specific_programs.program_name": regex },
        ],
      },
    ],
  };
};

const getDegreeQuery = (degreeFilter = "") => {
  const value = normalizeDegree(degreeFilter);
  if (value === "bachelor") {
    return {
      $or: [
        { degree: /bachelor/i },
        { educationLevel: /undergraduate/i },
        { source: /bachelor/i },
      ],
    };
  }
  if (value === "master") {
    return {
      $or: [
        { degree: /master/i },
        { educationLevel: /postgraduate/i },
        { source: /master/i },
      ],
    };
  }
  return null;
};

const countProgramsFromDoc = (doc = {}) => {
  const obj = doc?.toObject ? doc.toObject() : (doc || {});

  const countArray = (arr) => Array.isArray(arr) ? arr.length : 0;

  const countMajorAreas = (areas) =>
    Array.isArray(areas)
      ? areas.reduce((sum, area) => sum + countArray(area.specific_programs), 0)
      : 0;

  const counts = [
    countArray(obj.programs),
    countArray(obj.programs_data),
    countMajorAreas(obj.major_areas),
    countArray(obj.GUS_DATA?.programs_data),
    countMajorAreas(obj.GUS_DATA?.major_areas),
  ];

  if (obj.programTemplates?.bachelor?.programSource === "official") {
    counts.push(countArray(obj.programTemplates.bachelor.programs_data));
    counts.push(countMajorAreas(obj.programTemplates.bachelor.major_areas));
  }

  if (obj.programTemplates?.master?.programSource === "official") {
    counts.push(countArray(obj.programTemplates.master.programs_data));
    counts.push(countMajorAreas(obj.programTemplates.master.major_areas));
  }

  if (obj.programTemplate?.programSource === "official") {
    counts.push(countArray(obj.programTemplate.programs_data));
    counts.push(countMajorAreas(obj.programTemplate.major_areas));
  }

  return Math.max(...counts, 0);
};

const getLightProgramCount = (doc = {}) =>
  doc.programCount ||
  doc.stats?.totalPrograms ||
  doc.GUS_DATA?.stats?.totalPrograms ||
  0;

const normalizeLightUniversity = (doc = {}) => {
  const obj = doc?.toObject ? doc.toObject() : (doc || {});
  const universityName = obj.universityName || obj.university || obj.INSTNM || obj.name || "Unknown University";
  const city = obj.city || obj.CITY || obj.location?.city || "";
  const state = obj.state || obj.STABBR || obj.location?.state || "";
  const country =
    obj.country ||
    (typeof obj.location === "string" ? obj.location : obj.location?.country) ||
    obj.GUS_DATA?.country ||
    "USA";
  const degree = obj.degree || "";
  const educationLevel = obj.educationLevel || "";
  const programCount = getLightProgramCount(obj);
  const levelText = `${degree} ${educationLevel} ${obj.GUS_DATA?.level || ""}`.toLowerCase();
  const isBachelor = levelText.includes("bachelor") || levelText.includes("undergraduate") || Number(obj.UGOFFER || 0) === 1;
  const isMaster = levelText.includes("master") || levelText.includes("graduate") || levelText.includes("postgraduate") || Number(obj.GROFFER || 0) === 1;

  return {
    _id: obj._id,
    id: obj._id || obj.UNITID || obj.universityCode,
    UNITID: obj.UNITID || obj.universityCode || "",
    universityCode: obj.universityCode || obj.UNITID || "",
    universityName,
    INSTNM: universityName,
    name: universityName,
    city,
    state,
    country,
    location: typeof obj.location === "object" ? { ...obj.location, city, state, country } : { city, state, country },
    degree,
    educationLevel,
    source: obj.source || "admin",
    programCount,
    bachelorsCount: isBachelor ? programCount : 0,
    mastersCount: isMaster ? programCount : 0,
    isVisible: obj.isVisible !== false,
    importedByAdmin: true,
    updatedAt: obj.updatedAt,
    createdAt: obj.createdAt,
    lastUpdated: obj.updatedAt || obj.createdAt,
    logo: obj.logo || obj.universityLogo || null,
    universityLogo: obj.universityLogo || obj.logo || null,
  };
};

const getLightSort = (sortBy = "name") => {
  if (sortBy === "location") return { country: 1, STABBR: 1, CITY: 1, INSTNM: 1 };
  if (sortBy === "programs" || sortBy === "bachelors" || sortBy === "masters") return { "stats.totalPrograms": -1, INSTNM: 1 };
  return { INSTNM: 1, universityName: 1, university: 1, name: 1 };
};

const getLightUniversityQuery = (value = "") => {
  const visibilityQuery = {
    $or: [
      { isVisible: true },
      { isVisible: { $exists: false } },
    ],
  };
  const search = value.toString().trim();
  if (!search) return visibilityQuery;
  const regex = { $regex: search, $options: "i" };
  return {
    $and: [
      visibilityQuery,
      {
        $or: [
          { university: regex },
          { universityName: regex },
          { name: regex },
          { INSTNM: regex },
          { IALIAS: regex },
          { universityCode: regex },
          { CITY: regex },
          { STABBR: regex },
          { country: regex },
          { "location.city": regex },
          { "location.state": regex },
          { "location.country": regex },
          { degree: regex },
          { educationLevel: regex },
        ],
      },
    ],
  };
};

const getCollegeQuery = (value = "") => {
  const search = value.toString().trim();
  if (!search) return {};
  const regex = { $regex: search, $options: "i" };
  return {
    $or: [
      { collegeName: regex },
      { alias: regex },
      { universityName: regex },
      { "location.city": regex },
      { "location.state": regex },
    ],
  };
};

const getCustomUniversityQuery = (value = "") => {
  const search = value.toString().trim();
  const query = { isActive: { $ne: false } };
  if (!search) return query;
  const regex = { $regex: search, $options: "i" };
  return {
    ...query,
    $or: [
      { universityName: regex },
      { universityCode: regex },
      { city: regex },
      { state: regex },
      { country: regex },
      { "location.city": regex },
      { "location.state": regex },
      { "location.country": regex },
      { "programs.title": regex },
      { "programs.name": regex },
      { "programs.program_name": regex },
      { "programs.major_area": regex },
      { "programs.majorArea": regex },
      { "programs_data.title": regex },
      { "major_areas.major_area": regex },
      { "major_areas.specific_programs.program_name": regex },
    ],
  };
};

const dedupeAdminUniversities = (list = []) => {
  const seen = new Set();
  return list.filter((university) => {
    const keys = [
      university._id && `id:${university._id}`,
      university.UNITID && `unit:${university.UNITID}`,
      university.universityCode && `code:${university.universityCode}`,
      (university.universityName || university.INSTNM) && `name:${university.universityName || university.INSTNM}`,
    ].filter(Boolean).map((key) => key.toLowerCase());

    if (!keys.length) return true;
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
};

/* ================================
   GET IMPORT STATS
================================ */
export const getImportStats = async (req, res) => {
  try {
    const [
      universitiesCount,
      collegesCount,
      bachelorsCount,
      mastersCount,
    ] = await Promise.all([
      University.countDocuments(),
      Promise.resolve(0),
      BachelorsUniversity.countDocuments(),
      MastersUniversity.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        database: {
          universities: universitiesCount,
          colleges: collegesCount,
          bachelors: bachelorsCount,
          masters: mastersCount,
          total: universitiesCount + collegesCount + bachelorsCount + mastersCount,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   IMPORT UNIVERSITIES & COLLEGES
================================ */
export const importUniversities = async (req, res) => {
  try {
    const { colleges, gusUniversities } = loadUniversityData();

    let importedUniversities = 0;
    let updatedUniversities  = 0;
    let importedColleges     = 0;
    let updatedColleges      = 0;

    // -------- Universities --------
    for (const uni of gusUniversities) {
      const data = {
        UNITID: uni.UNITID,
        INSTNM: uni.INSTNM,
        IALIAS: uni.IALIAS || "",
        ADDR:   uni.ADDR   || "",
        CITY:   uni.CITY   || "",
        STABBR: uni.STABBR || "",
        ZIP:    uni.ZIP    || "",
        FIPS:      uni.FIPS,
        OBEREG:    uni.OBEREG,
        CHFNM:     uni.CHFNM     || "",
        CHFTITLE:  uni.CHFTITLE  || "",
        GENTELE:   uni.GENTELE   || "",
        WEBADDR:   uni.WEBADDR   || "",
        ADMINURL:  uni.ADMINURL  || "",
        FAIDURL:   uni.FAIDURL   || "",
        APPLURL:   uni.APPLURL   || "",
        SECTOR:    uni.SECTOR,
        ICLEVEL:   uni.ICLEVEL,
        CONTROL:   uni.CONTROL,
        HLOFFER:   uni.HLOFFER,
        UGOFFER:   uni.UGOFFER,
        GROFFER:   uni.GROFFER,
        DEGGRANT:  uni.DEGGRANT,
        HBCU:      uni.HBCU,
        LOCALE:    uni.LOCALE,
        OPENPUBL:  uni.OPENPUBL,
        CYACTIVE:  uni.CYACTIVE,
        POSTSEC:   uni.POSTSEC,
        INSTCAT:   uni.INSTCAT,
        LANDGRNT:  uni.LANDGRNT,
        INSTSIZE:  uni.INSTSIZE,
        LONGITUD:  uni.LONGITUD,
        LATITUDE:  uni.LATITUDE,
        isVisible:      true,
        importedByAdmin: true,
        location: {
          address:   uni.ADDR   || "",
          city:      uni.CITY   || "",
          state:     uni.STABBR || "",
          zip:       uni.ZIP    || "",
          latitude:  uni.LATITUDE,
          longitude: uni.LONGITUD,
        },
        contact: {
          phone:    uni.GENTELE  || "",
          website:  uni.WEBADDR  || "",
          adminUrl: uni.ADMINURL || "",
          faidUrl:  uni.FAIDURL  || "",
          applUrl:  uni.APPLURL  || "",
        },
        metadata: {
          chancellor:      uni.CHFNM    || "",
          chancellorTitle: uni.CHFTITLE || "",
          opeid:   uni.OPEID,
          sector:  uni.SECTOR,
          iclevel: uni.ICLEVEL,
          control: uni.CONTROL,
        },
        GUS_DATA: uni.GUS_DATA || {},
      };

      const existing = await University.findOne({ UNITID: uni.UNITID });
      if (existing) {
        await University.updateOne({ UNITID: uni.UNITID }, data);
        updatedUniversities++;
      } else {
        await University.create(data);
        importedUniversities++;
      }
    }

    // -------- Colleges --------
    for (const col of colleges) {
      try {
        const parentUniversity = await University.findOne({ UNITID: col.UNITID });
        const data = {
          collegeName:    col.INSTNM || col.collegeName || "",
          collegeCode:    col.IALIAS || col.collegeCode || `COL-${col.UNITID || Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          universityCode: col.UNITID ? col.UNITID.toString() : (parentUniversity?.UNITID?.toString() || ""),
          universityName: parentUniversity?.INSTNM || col.universityName || "",
          description:    col.description || "",
          establishedYear: col.establishedYear || "",
          website:        col.WEBADDR || col.website || "",
          address:        col.ADDR    || col.address  || "",
          city:           col.CITY    || col.city     || "",
          state:          col.STABBR  || col.state    || "",
          country:        col.country || "USA",
          contactEmail:   col.contactEmail || col.adminEmail || "",
          contactPhone:   col.GENTELE || col.contactPhone   || "",
          programs:       col.programs || [],
          UNITID: col.UNITID,
          INSTNM: col.INSTNM,
          IALIAS: col.IALIAS || "",
          ADDR:   col.ADDR   || "",
          CITY:   col.CITY   || "",
          STABBR: col.STABBR || "",
          ZIP:    col.ZIP    || "",
          isVisible:       true,
          importedByAdmin: true,
          location: {
            address:   col.ADDR   || "",
            city:      col.CITY   || "",
            state:     col.STABBR || "",
            zip:       col.ZIP    || "",
            latitude:  col.LATITUDE,
            longitude: col.LONGITUD,
          },
          contact: {
            phone:   col.GENTELE || "",
            website: col.WEBADDR || "",
          },
        };

        const existing = await Promise.resolve(null);
        if (existing) {
          await College.updateOne({ _id: existing._id }, data);
          updatedColleges++;
        } else {
          await Promise.resolve(null);
          importedColleges++;
        }
      } catch (colError) {
        console.error(`Error processing college: ${col.INSTNM || "Unknown"}`, colError.message);
        continue;
      }
    }

    res.json({
      success: true,
      message: "Import completed",
      data: { importedUniversities, updatedUniversities, importedColleges, updatedColleges },
    });
  } catch (error) {
    console.error("Import error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   GET ALL UNIVERSITIES
   Supports new schema (university/location/degree)
   AND old schema (INSTNM/UNITID)
================================ */
export const getAllUniversities = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip  = (page - 1) * limit;
    const search = req.query.search || req.query.q || "";
    const rawDegreeFilter = req.query.degree || req.query.type || req.query.programType || req.query.stream || "";
    const adminSearchQuery = getAdminUniversityQuery(search);
    const degreeQuery = getDegreeQuery(rawDegreeFilter);
    const adminQuery = degreeQuery
      ? { $and: [adminSearchQuery, degreeQuery] }
      : adminSearchQuery;
    const statsQuery = getAdminUniversityQuery("");
    const sort = { updatedAt: -1, createdAt: -1, INSTNM: 1 };

    const [
      mongoUniversityCount,
      mongoCollegeCount,
      visibleTrue,
      visibleMissing,
      visibleFalse,
      bachelorCount,
      masterCount,
      boston,
      total,
      universities,
      allUniversityDocs,
    ] = await Promise.all([
      University.countDocuments({}),
      Promise.resolve(0),
      University.countDocuments({ isVisible: true }),
      University.countDocuments({ isVisible: { $exists: false } }),
      University.countDocuments({ isVisible: false }),
      University.countDocuments({
        $or: [
          { degree: /bachelor/i },
          { educationLevel: /undergraduate/i },
          { source: /bachelor/i },
        ],
      }),
      University.countDocuments({
        $or: [
          { degree: /master/i },
          { educationLevel: /postgraduate/i },
          { source: /master/i },
        ],
      }),
      University.findOne({
        $or: [
          { university: /Boston University/i },
          { universityName: /Boston University/i },
          { name: /Boston University/i },
          { INSTNM: /Boston University/i },
        ],
      }).lean(),
      University.countDocuments(adminQuery),
      University.find(adminQuery).sort(sort).skip(skip).limit(limit).lean(),
      University.find(statsQuery).lean(),
    ]);

    const pagedUniversities = universities.map((doc) => normalizeAdminListDoc(doc, "admin"));
    const totalPrograms = allUniversityDocs.reduce(
      (sum, uni) => sum + countProgramsFromDoc(uni),
      0
    );

    console.log("MongoDB University count:", mongoUniversityCount);
    console.log("MongoDB College count:", mongoCollegeCount);
    console.log("Visible true:", visibleTrue);
    console.log("Visible missing:", visibleMissing);
    console.log("Visible false:", visibleFalse);
    console.log("Bachelor count:", bachelorCount);
    console.log("Master count:", masterCount);
    console.log("Returned query:", JSON.stringify(adminQuery));
    console.log("Returned count:", pagedUniversities.length);
    console.log("Boston University exists:", !!boston);
    console.log("Boston University visible:", boston?.isVisible);
    console.log("Boston University degree:", boston?.degree);
    console.log("Boston University educationLevel:", boston?.educationLevel);
    console.log("Boston University programs_data:", boston?.programs_data?.length);
    console.log("Boston University major_areas:", boston?.major_areas?.length);
    console.log("Admin stats total universities:", total);
    console.log("Admin stats total programs:", totalPrograms);
    console.log("Returned page count:", universities.length);
    console.log("Boston program count:", countProgramsFromDoc(boston));

    res.json({
      success: true,
      data: pagedUniversities,
      total,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        totalUniversities: total,
        totalPrograms,
        bachelors: bachelorCount,
        masters: masterCount,
        colleges: mongoCollegeCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLightUniversities = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const search = req.query.search || req.query.q || "";
    const sortBy = req.query.sortBy || "name";
    const filterType = req.query.filterType || "all";
    const programLevel = req.query.programLevel || "all";

    const searchQuery = getLightUniversityQuery(search);
    const degreeQuery = programLevel === "bachelors"
      ? getDegreeQuery("bachelor")
      : programLevel === "masters" ? getDegreeQuery("master") : null;

    const clauses = [searchQuery];
    if (degreeQuery) clauses.push(degreeQuery);
    if (filterType === "hasPrograms") clauses.push({ "stats.totalPrograms": { $gt: 0 } });
    const query = clauses.length > 1 ? { $and: clauses } : searchQuery;

    const projection = {
      programs: 0,
      programs_data: 0,
      major_areas: 0,
      "GUS_DATA.programs_data": 0,
      "GUS_DATA.major_areas": 0,
      programTemplates: 0,
      programTemplate: 0,
      metadata: 0,
    };

    const [total, universities, totalProgramsResult] = await Promise.all([
      filterType === "custom" ? Promise.resolve(0) : University.countDocuments(query),
      filterType === "custom"
        ? Promise.resolve([])
        : University.find(query)
            .select(projection)
            .sort(getLightSort(sortBy))
            .skip(skip)
            .limit(limit)
            .lean(),
      filterType === "custom"
        ? Promise.resolve([])
        : University.aggregate([
            { $match: query },
            { $group: { _id: null, totalPrograms: { $sum: { $ifNull: ["$stats.totalPrograms", 0] } } } },
          ]),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.json({
      success: true,
      data: universities.map(normalizeLightUniversity),
      stats: {
        totalUniversities: total,
        totalPrograms: totalProgramsResult[0]?.totalPrograms || 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
        pages: totalPages,
      },
    });
  } catch (error) {
    console.error("Light universities error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   GET ALL COLLEGES
================================ */
export const getAllColleges = async (req, res) => {
  try {
    const colleges = await Promise.resolve([]);
    res.json({ success: true, data: colleges });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   SEARCH UNIVERSITIES
   Handles both old and new field names
================================ */
export const searchUniversities = async (req, res) => {
  const { q } = req.query;
  if (!q) return getAllUniversities(req, res);

  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const adminQuery = getAdminUniversityQuery(q);
    const collegeQuery = getCollegeQuery(q);
    const customQuery = getCustomUniversityQuery(q);

    const [
      universities,
      colleges,
      bachelors,
      masters,
    ] = await Promise.all([
      University.find(adminQuery).sort({ updatedAt: -1, createdAt: -1, INSTNM: 1 }).lean(),
      Promise.resolve([]),
      BachelorsUniversity.find(customQuery).sort({ updatedAt: -1, createdAt: -1, universityName: 1 }).lean(),
      MastersUniversity.find(customQuery).sort({ updatedAt: -1, createdAt: -1, universityName: 1 }).lean(),
    ]);

    const merged = dedupeAdminUniversities([
      ...universities.map((doc) => normalizeAdminListDoc(doc, "admin")),
      ...colleges.map((doc) => normalizeAdminListDoc(doc, "college")),
      ...bachelors.map((doc) => normalizeAdminListDoc(doc, "bachelors")),
      ...masters.map((doc) => normalizeAdminListDoc(doc, "masters")),
    ]);

    const pagedUniversities = merged.slice(skip, skip + limit);
    console.log("Returning admin universities:", pagedUniversities.length);

    res.json({
      success: true,
      data: pagedUniversities,
      total: merged.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   SEARCH COLLEGES
================================ */
export const searchColleges = async (req, res) => {
  const { q } = req.query;
  if (!q) return getAllColleges(req, res);

  try {
    const colleges = await Promise.resolve([]);
    res.json({ success: true, data: colleges });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   GET UNIVERSITY BY ID
   Works with _id, UNITID (number), 
   and new schema documents
================================ */
export const getUniversityById = async (req, res) => {
  const { id } = req.params;

  try {
    let university;

    // 1. Try UNITID as number
    if (!isNaN(id)) {
      university = await University.findOne({ UNITID: Number(id) });
    }
    // 2. Try _id
    if (!university) {
      university = await University.findById(id).catch(() => null);
    }
    // 3. Fallback
    if (!university) {
      university = await University.findOne({
        $or: [{ UNITID: id }, { UNITID: Number(id) }],
      });
    }

    if (!university) {
      return res.status(404).json({ success: false, message: "University not found" });
    }

    const programs = extractPrograms(university);

    // Group by major area
    const programsByMajorArea = {};
    programs.forEach((prog) => {
      const area = prog.majorArea || prog.major_area || "Other";
      if (!programsByMajorArea[area]) programsByMajorArea[area] = [];
      programsByMajorArea[area].push(prog);
    });

    const programStats = {
      totalPrograms:    programs.length,
      totalMajorAreas:  Object.keys(programsByMajorArea).length,
      programsByLevel:  {},
      programsByStudyMode: {},
    };
    programs.forEach((prog) => {
      const level = prog.level || "Unknown";
      const mode  = prog.studyMode || "Unknown";
      programStats.programsByLevel[level]     = (programStats.programsByLevel[level]     || 0) + 1;
      programStats.programsByStudyMode[mode]  = (programStats.programsByStudyMode[mode]  || 0) + 1;
    });

    const normalized = normalizeUniversity(university);
    const universityObj = {
      ...normalized,
      programs,
      programsByMajorArea,
      programStats,
      programCount: programs.length,
    };

    res.json({ success: true, data: universityObj });
  } catch (error) {
    console.error("Error in getUniversityById:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch university details",
      error: error.message,
    });
  }
};

/* ================================
   GET UNIVERSITY PROGRAMS
================================ */
export const getUniversityPrograms = async (req, res) => {
  const { id } = req.params;

  try {
    const degree = normalizeDegree(req.query.degree || req.query.type || req.query.programType || "bachelor") || "bachelor";
    const segment = req.query.segment || req.query.field || "";
    let university = null;

    if (!isNaN(id)) {
      university = await University.findOne({ UNITID: Number(id) }).lean();
    }
    if (!university) {
      university = await University.findById(id).lean().catch(() => null);
    }
    if (!university) {
      university = await University.findOne({ UNITID: id }).lean().catch(() => null);
    }

    if (!university) {
      return res.status(404).json({ success: false, message: "University not found" });
    }

    const bundle = getProgramBundleForDegree(university, degree, segment);
    const educationLevel = degree === "master" ? "Postgraduate" : "Undergraduate";
    const universityName = university.universityName || university.university || university.INSTNM || university.name || "Unknown University";

    res.json({
      success: true,
      university: universityName,
      degree,
      educationLevel,
      programSource: bundle.programSource,
      stats: bundle.stats,
      major_areas: bundle.major_areas,
      programs_data: bundle.programs_data,
      programs: bundle.programs_data,
    });
  } catch (error) {
    console.error("Error fetching programs:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   SEARCH UNIVERSITY PROGRAMS
================================ */
export const searchUniversityPrograms = async (req, res) => {
  const { id } = req.params;
  const { q }  = req.query;
  if (!q) return getUniversityPrograms(req, res);

  try {
    const university = await University.findOne({
      $or: [{ _id: id }, { UNITID: Number(id) }],
    });

    if (!university) {
      return res.status(404).json({ success: false, message: "University not found" });
    }

    const allPrograms  = extractPrograms(university);
    const term         = q.toLowerCase();
    const programs     = allPrograms.filter(
      (prog) =>
        (prog.title        && prog.title.toLowerCase().includes(term))        ||
        (prog.program_name && prog.program_name.toLowerCase().includes(term)) ||
        (prog.majorArea    && prog.majorArea.toLowerCase().includes(term)) ||
        (prog.major_area   && prog.major_area.toLowerCase().includes(term))
    );

    const normalized = normalizeUniversity(university);

    res.json({
      success: true,
      data: {
        universityId:   university.UNITID || university._id,
        universityName: normalized.universityName,
        searchTerm: q,
        programs,
        count: programs.length,
      },
    });
  } catch (error) {
    console.error("Error searching programs:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   GET PROGRAM BY ID
================================ */
export const getProgramById = async (req, res) => {
  const { universityId, programId } = req.params;

  try {
    const university = await University.findOne({
      $or: [{ _id: universityId }, { UNITID: Number(universityId) }],
    });

    if (!university) {
      return res.status(404).json({ success: false, message: "University not found" });
    }

    const allPrograms = extractPrograms(university);
    const program     = allPrograms.find(
      (p) =>
        p.id === programId ||
        (p.program_name || "").replace(/\s+/g, "-") === programId
    );

    if (!program) {
      return res.status(404).json({ success: false, message: "Program not found" });
    }

    const normalized = normalizeUniversity(university);

    res.json({
      success: true,
      data: {
        universityId:   university.UNITID || university._id,
        universityName: normalized.universityName,
        program,
      },
    });
  } catch (error) {
    console.error("Error fetching program:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   GET COLLEGE BY ID
================================ */
export const getCollegeById = async (req, res) => {
  const { id } = req.params;

  try {
    const college = await Promise.resolve(null);

    if (!college) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, data: college });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   REFRESH DATA
================================ */
export const refreshData = async (req, res) => {
  try {
    const [
      universitiesCount,
      collegesCount,
      bachelorsCount,
      mastersCount,
    ] = await Promise.all([
      University.countDocuments(),
      Promise.resolve(0),
      BachelorsUniversity.countDocuments(),
      MastersUniversity.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        database: {
          universities: universitiesCount,
          colleges: collegesCount,
          bachelors: bachelorsCount,
          masters: mastersCount,
          total: universitiesCount + collegesCount + bachelorsCount + mastersCount,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================================
   TEST ENDPOINT
================================ */
export const testUniversityData = async (req, res) => {
  const { id } = req.params;

  try {
    let university;
    if (!isNaN(id)) {
      university = await University.findOne({ UNITID: Number(id) });
    } else {
      university = await University.findById(id);
    }

    if (!university) {
      return res.status(404).json({ success: false, message: "University not found" });
    }

    const programs  = extractPrograms(university);
    const normalized = normalizeUniversity(university);

    res.json({
      success: true,
      data: {
        id:              university.UNITID || university._id,
        rawFields:       Object.keys(university.toObject()),
        normalizedName:  normalized.universityName,
        source:          normalized.source,
        degree:          normalized.degree,
        educationLevel:  normalized.educationLevel,
        location:        normalized.location,
        hasPrograms:     programs.length > 0,
        programsCount:   programs.length,
        sampleProgram:   programs[0] || null,
        hasMajorAreas:   !!(university.major_areas?.length || university.GUS_DATA?.major_areas?.length),
      },
    });
  } catch (error) {
    console.error("Error in test endpoint:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
