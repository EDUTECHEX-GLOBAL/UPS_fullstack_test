import mongoose from "mongoose";
import University from "../models/University.js";

const MAJOR_AREA_CACHE_TTL_MS = 5 * 60 * 1000;
const majorAreaCache = new Map();

const stripDiacritics = (value = "") =>
  value.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const normalizeText = (value = "") =>
  stripDiacritics(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractCountryFromUniversity = (university = {}) => {
  if (university.country) return String(university.country).trim();
  if (university.COUNTRY) return String(university.COUNTRY).trim();

  if (
    university.location &&
    typeof university.location === "object" &&
    !Array.isArray(university.location) &&
    university.location.country
  ) {
    return String(university.location.country).trim();
  }

  if (university.GUS_DATA?.country) {
    return String(university.GUS_DATA.country).trim();
  }

  if (
    university.location &&
    typeof university.location === "string"
  ) {
    const primaryLocation = university.location.replace(/\([^)]*\)/g, "");
    const parts = primaryLocation
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    return parts[parts.length - 1] || "";
  }

  return "";
};

const normalizeCountryText = (value = "") =>
  normalizeText(value)
    .replace(/\bmainland\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const countryMatchesUniversity = (university = {}, selectedCountry = "") => {
  if (!selectedCountry) return true;

  const universityCountry = normalizeCountryText(
    extractCountryFromUniversity(university)
  );
  const targetCountry = normalizeCountryText(selectedCountry);

  return Boolean(
    universityCountry &&
    targetCountry &&
    universityCountry === targetCountry
  );
};

const getNormalizedTokens = (value = "") =>
  normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);

const tokenOverlapScore = (left = "", right = "") => {
  const leftTokens = new Set(getNormalizedTokens(left));
  const rightTokens = new Set(getNormalizedTokens(right));
  if (!leftTokens.size || !rightTokens.size) return 0;

  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap / Math.min(leftTokens.size, rightTokens.size);
};

export const majorAreasMatch = (left = "", right = "") => {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight) return true;
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) return true;
  return tokenOverlapScore(normalizedLeft, normalizedRight) >= 0.5;
};

export const strictMajorAreaMatch = (left = "", right = "") => {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  if (!normalizedLeft || !normalizedRight) return false;
  return normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft);
};

const getProgramTitle = (program = {}) =>
  typeof program === "string"
    ? program
    : program.title || program.name || program.program_name || program.programName || "";

const stripProgramDegreeSuffix = (title = "") =>
  title
    .toString()
    .replace(/\s*\((ba|b\.a\.|bba|b\.b\.a\.|bsc|b\.sc\.|bs|b\.s\.|ma|m\.a\.|mba|m\.b\.a\.|msc|m\.sc\.|ms|m\.s\.|meng|m\.eng\.|llm|l\.l\.m\.)\)\s*$/i, "")
    .trim();

const extractProgramDegreeSuffix = (title = "") => {
  const match = title
    .toString()
    .match(/\((ba|b\.a\.|bba|b\.b\.a\.|bsc|b\.sc\.|bs|b\.s\.|ma|m\.a\.|mba|m\.b\.a\.|msc|m\.sc\.|ms|m\.s\.|meng|m\.eng\.|llm|l\.l\.m\.)\)\s*$/i);
  return match ? match[1].replace(/\./g, "").toUpperCase() : "";
};

const normalizeProgramSpecializationTitle = (title = "") =>
  normalizeText(stripProgramDegreeSuffix(title))
    .replace(/^(bachelor'?s?\s+program\s+in|bachelors?\s+program\s+in|bachelor\s+of|bachelor\s+in|master'?s?\s+program\s+in|masters?\s+program\s+in|master\s+of|master\s+in)\s+/g, "")
    .replace(/\b(bachelor s|bachelors|bachelor|master s|masters|master|degree|programme|program|undergraduate|postgraduate)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeProgramDedupeDegree = (degree = "", degreeBucket = "") => {
  const normalizedDegree = normalizeText(degree);
  const normalizedBucket = normalizeText(degreeBucket);
  if (/\b(master|masters|postgraduate|pg|ma|msc|ms|mba|meng|llm)\b/.test(normalizedDegree)) return "master";
  if (/\b(bachelor|bachelors|undergraduate|ug|ba|bba|bsc|bs)\b/.test(normalizedDegree)) return "bachelor";
  if (normalizedBucket) return normalizedBucket;
  return normalizedDegree;
};

const getProgramMajorArea = (program = {}) =>
  program.majorArea ||
  program.major_area ||
  program.category ||
  program.field ||
  program.original_major_area ||
  "";

const getProgramCompletenessScore = (program = {}) =>
  [
    program.degree,
    program.duration,
    program.level || program.educationLevel,
    getProgramMajorArea(program),
    program.id || program._id,
  ].filter(Boolean).length;

export const dedupeProgramsForStudent = (programs = [], degreeBucket = "") => {
  const byKey = new Map();

  programs.filter(Boolean).forEach((program) => {
    const rawTitle = getProgramTitle(program);
    const specializationTitle = normalizeProgramSpecializationTitle(rawTitle);
    const derivedDegree = program.degree || extractProgramDegreeSuffix(rawTitle);
    const normalizedDegree = normalizeProgramDedupeDegree(derivedDegree, degreeBucket);
    const majorArea = getProgramMajorArea(program);
    const key = normalizeText([specializationTitle, normalizedDegree, majorArea].join("|"));
    if (!key) return;

    const normalizedProgram = {
      ...program,
      title: stripProgramDegreeSuffix(program.title || rawTitle),
      name: program.name ? stripProgramDegreeSuffix(program.name) : stripProgramDegreeSuffix(rawTitle),
      program_name: program.program_name ? stripProgramDegreeSuffix(program.program_name) : stripProgramDegreeSuffix(rawTitle),
      degree: derivedDegree,
      majorArea: program.majorArea || majorArea,
      major_area: program.major_area || majorArea,
    };

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, normalizedProgram);
      return;
    }

    const preferred =
      getProgramCompletenessScore(normalizedProgram) > getProgramCompletenessScore(existing)
        ? normalizedProgram
        : existing;
    const fallback = preferred === normalizedProgram ? existing : normalizedProgram;
    byKey.set(key, {
      ...fallback,
      ...preferred,
      id: preferred.id || fallback.id,
      _id: preferred._id || fallback._id,
      degree: preferred.degree || fallback.degree,
      duration: preferred.duration || fallback.duration,
      level: preferred.level || fallback.level,
      educationLevel: preferred.educationLevel || fallback.educationLevel,
      majorArea: preferred.majorArea || fallback.majorArea,
      major_area: preferred.major_area || fallback.major_area,
    });
  });

  return [...byKey.values()];
};

const degreeLabels = (degree) => {
  if (degree === "master") return { degree: "Master", level: "Postgraduate", programType: "PG", duration: "1-2 years" };
  if (degree === "professional-degree") return { degree: "Medical", level: "Professional Degree", programType: "MEDICAL", duration: "" };
  return { degree: "Bachelor", level: "Undergraduate", programType: "UG", duration: "3-4 years" };
};

export const normalizeDegree = (value = "") => {
  const normalized = normalizeText(value);
  if (["pg", "master", "masters", "postgraduate"].includes(normalized)) return "master";
  if (["ug", "bachelor", "bachelors", "undergraduate"].includes(normalized)) return "bachelor";
  if (["medical", "medicine"].includes(normalized) || normalized.startsWith("professional degree")) return "professional-degree";
  return "";
};

export const getRequestedDegree = (query = {}) =>
  normalizeDegree(query.degree || query.programType || query.type || query.stream) || "bachelor";

export const programIndexDegreeFilter = (degree = "bachelor") => ({
  degree: degree === "professional-degree"
    ? { $exists: true, $nin: [/^bachelor$/i, /^master$/i, ""] }
    : degree,
});

export const degreeQuery = (degree) => {
  if (degree === "professional-degree") {
    const nonBachelorMaster = { $exists: true, $nin: [/^bachelor$/i, /^master$/i, ""] };
    return { degree: nonBachelorMaster };
  }
  const regex =
    degree === "master"
      ? /(master|masters|postgraduate|pg)/i
      : /(bachelor|bachelors|undergraduate|ug)/i;
  const templateKey = degree === "master" ? "master" : "bachelor";

  return {
    $or: [
      { degree: regex },
      { educationLevel: regex },
      { [`programTemplates.${templateKey}.programs_data.0`]: { $exists: true } },
      { [`programTemplates.${templateKey}.major_areas.0`]: { $exists: true } },
      { "programs_data.degree": regex },
      { "programs_data.level": regex },
      { "programs_data.educationLevel": regex },
      { "programs_data.programType": regex },
      { "GUS_DATA.programs_data.degree": regex },
      { "GUS_DATA.programs_data.level": regex },
      { "GUS_DATA.programs_data.educationLevel": regex },
      { "GUS_DATA.programs_data.programType": regex },
      { "metadata.programs.degree": regex },
      { "metadata.programs.level": regex },
      { "metadata.programs.educationLevel": regex },
      { "metadata.programs.programType": regex },
    ],
  };
};

const isFallbackTemplate = (template = {}) => template?.programSource === "fallback-template";

export const isMedicalProgramDegree = (value = "") => {
  const degree = normalizeText(value);
  if (!degree) return false;
  return /\b(professional degree|single cycle|specialist degree|md equivalent|mbbs|medical doctor|medicinae universae doctor|doctor of dentistry|dmd|dds|mddr|mudr)\b/.test(degree);
};

const programMatchesDegree = (program = {}, degree = "bachelor") => {
  const text = normalizeText(
    [
      program.title,
      program.name,
      program.program_name,
      program.programName,
      program.degree,
      program.level,
      program.educationLevel,
      program.programType,
    ].filter(Boolean).join(" ")
  );

  const isMaster =
    /\b(master|masters|postgraduate|pg|mba|msc|ms|ma|meng|llm|mres|mph|mfin|macc|emba|march|med)\b/i.test(text);
  const isBachelor =
    /\b(bachelor|bachelors|undergraduate|ug|ba|bs|bsc|beng|btech|bba|bcom|bfa|bmus|llb)\b/i.test(text);
  const isMedical = isMedicalProgramDegree(program.degree);

  if (degree === "professional-degree") return isMedical;
  if (degree === "master") return isMaster && !isBachelor;
  if (degree === "bachelor") return isBachelor && !isMaster;
  return true;
};

const normalizeProgramRecord = (
  program = {},
  university = {},
  degree = "bachelor",
  majorArea = "",
  index = 0,
  sourceName = "programs_data"
) => {
  const source = typeof program === "string" ? { title: program } : { ...program };
  const title = getProgramTitle(source).trim();
  if (!title) return null;

  const labels = degreeLabels(degree);
  const resolvedMajorArea = (
    source.major_area ||
    source.majorArea ||
    source.original_major_area ||
    source.category ||
    source.field ||
    majorArea ||
    ""
  ).toString().trim();
  if (!resolvedMajorArea) return null;

  const universityId = university._id?.toString?.() || university.UNITID || "university";
  const id =
    source.id ||
    source._id?.toString?.() ||
    `${universityId}-${degree}-${normalizeText(`${title}-${resolvedMajorArea}`) || index}`;

  return {
    id,
    title,
    name: source.name || title,
    program_name: source.program_name || source.programName || title,
    degree: source.degree || labels.degree,
    level: source.level || source.educationLevel || labels.level,
    educationLevel: source.educationLevel || labels.level,
    studyMode: source.studyMode || source.study_mode || source.mode || "On Campus",
    duration: source.duration || labels.duration,
    major_area: resolvedMajorArea,
    majorArea: resolvedMajorArea,
    category: resolvedMajorArea,
    original_major_area: source.original_major_area || resolvedMajorArea,
    programType: source.programType || labels.programType,
    programSource: source.programSource || sourceName,
    school: source.school || source.school_name || source.faculty || "",
    college: source.college || source.college_name || "",
    faculty: source.faculty || "",
    department: source.department || source.department_name || "",
    locations: source.locations || [],
    description: source.description || "",
    universityIds: [university._id?.toString?.() || university.UNITID?.toString?.()].filter(Boolean),
  };
};

const collectProgramsData = (programs = [], university = {}, degree = "bachelor", target = [], sourceName = "programs_data") => {
  if (!Array.isArray(programs)) return target;
  programs.forEach((program, index) => {
    const normalized = normalizeProgramRecord(program, university, degree, "", index, sourceName);
    if (normalized) target.push(normalized);
  });
  return target;
};

const collectMajorAreaPrograms = (
  majorAreas = [],
  university = {},
  degree = "bachelor",
  target = [],
  sourceName = "major_areas"
) => {
  if (!Array.isArray(majorAreas)) return target;
  majorAreas.forEach((area, areaIndex) => {
    const areaName = (area?.major_area || area?.majorArea || area?.category || area?.name || "").toString().trim();
    if (!areaName) return;
    const programs = area?.specific_programs || area?.programs || area?.courses || area?.items || [];

    if (!Array.isArray(programs) || programs.length === 0) {
      const normalized = normalizeProgramRecord(
        { title: areaName, name: areaName, program_name: areaName },
        university,
        degree,
        areaName,
        areaIndex,
        sourceName
      );
      if (normalized) target.push(normalized);
      return;
    }

    programs.forEach((program, index) => {
      const normalized = normalizeProgramRecord(program, university, degree, areaName, index, sourceName);
      if (normalized) target.push(normalized);
    });
  });
  return target;
};

export const extractProgramsForStudent = (university = {}, degree = "bachelor") => {
  const programs = [];
  const templateKey = degree === "professional-degree" ? "" : degree === "master" ? "master" : "bachelor";
  const template = templateKey ? university.programTemplates?.[templateKey] : null;
  const legacyTemplate = university.programTemplate;

  if (template && !isFallbackTemplate(template)) {
    collectProgramsData(template?.programs_data, university, degree, programs, `programTemplates.${templateKey}.programs_data`);
    collectMajorAreaPrograms(template?.major_areas, university, degree, programs, `programTemplates.${templateKey}.major_areas`);
  }

  collectProgramsData(university.programs_data, university, degree, programs, "programs_data");
  collectProgramsData(university.GUS_DATA?.programs_data, university, degree, programs, "GUS_DATA.programs_data");
  collectMajorAreaPrograms(university.major_areas, university, degree, programs, "major_areas");
  collectMajorAreaPrograms(university.GUS_DATA?.major_areas, university, degree, programs, "GUS_DATA.major_areas");

  if (!isFallbackTemplate(legacyTemplate)) {
    collectProgramsData(legacyTemplate?.programs_data, university, degree, programs, "programTemplate.programs_data");
    collectMajorAreaPrograms(legacyTemplate?.major_areas, university, degree, programs, "programTemplate.major_areas");
  }

  collectProgramsData(university.programs, university, degree, programs, "programs");
  collectProgramsData(university.courses, university, degree, programs, "courses");
  collectProgramsData(university.metadata?.programs, university, degree, programs, "metadata.programs");
  collectMajorAreaPrograms(university.metadata?.majorAreas, university, degree, programs, "metadata.majorAreas");

  return dedupeProgramsForStudent(
    programs.filter((program) => programMatchesDegree(program, degree)),
    degree
  );
};

export const studentUniversityProjection = {
  _id: 1,
  UNITID: 1,
  INSTNM: 1,
  CITY: 1,
  STABBR: 1,
  programs_data: 1,
  major_areas: 1,
  GUS_DATA: 1,
  programTemplate: 1,
  programTemplates: 1,
  programs: 1,
  courses: 1,
  metadata: 1,
  degree: 1,
  educationLevel: 1,
  university: 1,
  universityName: 1,
  location: 1,
  country: 1,
  isVisible: 1,
  stats: 1,
};

const majorAreaProjection = {
  degree: 1,
  educationLevel: 1,
  "major_areas.major_area": 1,
  "programs_data.major_area": 1,
  "programs_data.majorArea": 1,
};

const programListProjection = {
  _id: 1,
  UNITID: 1,
  INSTNM: 1,
  university: 1,
  universityName: 1,
  degree: 1,
  educationLevel: 1,
  location: 1,
  country: 1,
  COUNTRY: 1,
  GUS_DATA: 1,
  programTemplate: 1,
  programs_data: 1,
  major_areas: 1,
  programTemplates: 1,
  metadata: 1,
};

const universityListProjection = {
  _id: 1,
  UNITID: 1,
  INSTNM: 1,
  CITY: 1,
  STABBR: 1,
  university: 1,
  universityName: 1,
  location: 1,
  country: 1,
  COUNTRY: 1,
  GUS_DATA: 1,
  degree: 1,
  educationLevel: 1,
  isVisible: 1,
  stats: 1,
  programTemplate: 1,
  programs_data: 1,
  major_areas: 1,
  programTemplates: 1,
  metadata: 1,
};

const pickUniversityName = (university = {}) =>
  university.university || university.universityName || university.INSTNM || university.name || "";

const searchQuery = (search = "") => {
  if (!search?.trim()) return null;
  const regex = new RegExp(search.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return {
    $or: [
      { university: regex },
      { universityName: regex },
      { INSTNM: regex },
      { name: regex },
      { CITY: regex },
      { STABBR: regex },
      { country: regex },
      { "location.city": regex },
      { "location.state": regex },
      { "location.country": regex },
      { "location.display": regex },
    ],
  };
};

const exactMajorAreaQuery = (majorArea = "") => {
  const area = majorArea.toString().trim();
  if (!area) return null;
  return {
    $or: [
      { "programs_data.major_area": area },
      { "programs_data.majorArea": area },
      { "programs_data.category": area },
      { "programs_data.field": area },
      { "major_areas.major_area": area },
      { "major_areas.majorArea": area },
      { "major_areas.specific_programs.major_area": area },
      { "major_areas.specific_programs.majorArea": area },
      { "major_areas.specific_programs.category": area },
      { "major_areas.specific_programs.field": area },
      { "GUS_DATA.programs_data.major_area": area },
      { "GUS_DATA.programs_data.majorArea": area },
      { "GUS_DATA.programs_data.category": area },
      { "GUS_DATA.programs_data.field": area },
      { "GUS_DATA.major_areas.major_area": area },
      { "GUS_DATA.major_areas.majorArea": area },
      { "GUS_DATA.major_areas.specific_programs.major_area": area },
      { "GUS_DATA.major_areas.specific_programs.majorArea": area },
      { "GUS_DATA.major_areas.specific_programs.category": area },
      { "GUS_DATA.major_areas.specific_programs.field": area },
      { "programTemplates.bachelor.programs_data.major_area": area },
      { "programTemplates.bachelor.programs_data.majorArea": area },
      { "programTemplates.bachelor.programs_data.category": area },
      { "programTemplates.bachelor.programs_data.field": area },
      { "programTemplates.bachelor.major_areas.major_area": area },
      { "programTemplates.bachelor.major_areas.majorArea": area },
      { "programTemplates.bachelor.major_areas.specific_programs.major_area": area },
      { "programTemplates.bachelor.major_areas.specific_programs.majorArea": area },
      { "programTemplates.bachelor.major_areas.specific_programs.category": area },
      { "programTemplates.bachelor.major_areas.specific_programs.field": area },
      { "programTemplates.master.programs_data.major_area": area },
      { "programTemplates.master.programs_data.majorArea": area },
      { "programTemplates.master.programs_data.category": area },
      { "programTemplates.master.programs_data.field": area },
      { "programTemplates.master.major_areas.major_area": area },
      { "programTemplates.master.major_areas.majorArea": area },
      { "programTemplates.master.major_areas.specific_programs.major_area": area },
      { "programTemplates.master.major_areas.specific_programs.majorArea": area },
      { "programTemplates.master.major_areas.specific_programs.category": area },
      { "programTemplates.master.major_areas.specific_programs.field": area },
      { "metadata.programs.major_area": area },
      { "metadata.programs.majorArea": area },
      { "metadata.programs.category": area },
      { "metadata.programs.field": area },
      { "metadata.majorAreas.major_area": area },
      { "metadata.majorAreas.majorArea": area },
      { "metadata.majorAreas.specific_programs.major_area": area },
      { "metadata.majorAreas.specific_programs.majorArea": area },
      { "metadata.majorAreas.specific_programs.category": area },
      { "metadata.majorAreas.specific_programs.field": area },
    ],
  };
};

const exactMajorAreasQuery = (majorAreas = []) => {
  const areas = majorAreas.map((area) => area.toString().trim()).filter(Boolean);
  if (!areas.length) return null;
  return {
    $or: [
      { "programs_data.major_area": { $in: areas } },
      { "programs_data.majorArea": { $in: areas } },
      { "programs_data.category": { $in: areas } },
      { "programs_data.field": { $in: areas } },
      { "major_areas.major_area": { $in: areas } },
      { "major_areas.majorArea": { $in: areas } },
      { "major_areas.specific_programs.major_area": { $in: areas } },
      { "major_areas.specific_programs.majorArea": { $in: areas } },
      { "major_areas.specific_programs.category": { $in: areas } },
      { "major_areas.specific_programs.field": { $in: areas } },
      { "GUS_DATA.programs_data.major_area": { $in: areas } },
      { "GUS_DATA.programs_data.majorArea": { $in: areas } },
      { "GUS_DATA.programs_data.category": { $in: areas } },
      { "GUS_DATA.programs_data.field": { $in: areas } },
      { "GUS_DATA.major_areas.major_area": { $in: areas } },
      { "GUS_DATA.major_areas.majorArea": { $in: areas } },
      { "GUS_DATA.major_areas.specific_programs.major_area": { $in: areas } },
      { "GUS_DATA.major_areas.specific_programs.majorArea": { $in: areas } },
      { "GUS_DATA.major_areas.specific_programs.category": { $in: areas } },
      { "GUS_DATA.major_areas.specific_programs.field": { $in: areas } },
      { "programTemplates.bachelor.programs_data.major_area": { $in: areas } },
      { "programTemplates.bachelor.programs_data.majorArea": { $in: areas } },
      { "programTemplates.bachelor.programs_data.category": { $in: areas } },
      { "programTemplates.bachelor.programs_data.field": { $in: areas } },
      { "programTemplates.bachelor.major_areas.major_area": { $in: areas } },
      { "programTemplates.bachelor.major_areas.majorArea": { $in: areas } },
      { "programTemplates.bachelor.major_areas.specific_programs.major_area": { $in: areas } },
      { "programTemplates.bachelor.major_areas.specific_programs.majorArea": { $in: areas } },
      { "programTemplates.bachelor.major_areas.specific_programs.category": { $in: areas } },
      { "programTemplates.bachelor.major_areas.specific_programs.field": { $in: areas } },
      { "programTemplates.master.programs_data.major_area": { $in: areas } },
      { "programTemplates.master.programs_data.majorArea": { $in: areas } },
      { "programTemplates.master.programs_data.category": { $in: areas } },
      { "programTemplates.master.programs_data.field": { $in: areas } },
      { "programTemplates.master.major_areas.major_area": { $in: areas } },
      { "programTemplates.master.major_areas.majorArea": { $in: areas } },
      { "programTemplates.master.major_areas.specific_programs.major_area": { $in: areas } },
      { "programTemplates.master.major_areas.specific_programs.majorArea": { $in: areas } },
      { "programTemplates.master.major_areas.specific_programs.category": { $in: areas } },
      { "programTemplates.master.major_areas.specific_programs.field": { $in: areas } },
      { "metadata.programs.major_area": { $in: areas } },
      { "metadata.programs.majorArea": { $in: areas } },
      { "metadata.programs.category": { $in: areas } },
      { "metadata.programs.field": { $in: areas } },
      { "metadata.majorAreas.major_area": { $in: areas } },
      { "metadata.majorAreas.majorArea": { $in: areas } },
      { "metadata.majorAreas.specific_programs.major_area": { $in: areas } },
      { "metadata.majorAreas.specific_programs.majorArea": { $in: areas } },
      { "metadata.majorAreas.specific_programs.category": { $in: areas } },
      { "metadata.majorAreas.specific_programs.field": { $in: areas } },
    ],
  };
};

const selectedProgramsQuery = (selectedPrograms = []) => {
  const titles = selectedPrograms.map((program) => program.toString().trim()).filter(Boolean);
  if (!titles.length) return null;
  const programDataFields = [
    "title",
    "name",
    "program_name",
    "programName",
  ];
  const specificProgramFields = [
    "title",
    "name",
    "program_name",
    "programName",
  ];
  const programDataRoots = [
    "programs_data",
    "GUS_DATA.programs_data",
    "programTemplates.bachelor.programs_data",
    "programTemplates.master.programs_data",
    "metadata.programs",
  ];
  const majorAreaRoots = [
    "major_areas.specific_programs",
    "GUS_DATA.major_areas.specific_programs",
    "programTemplates.bachelor.major_areas.specific_programs",
    "programTemplates.master.major_areas.specific_programs",
    "metadata.majorAreas.specific_programs",
  ];

  return {
    $or: [
      ...programDataRoots.flatMap((root) =>
        programDataFields.map((field) => ({ [`${root}.${field}`]: { $in: titles } }))
      ),
      ...majorAreaRoots.flatMap((root) =>
        specificProgramFields.map((field) => ({ [`${root}.${field}`]: { $in: titles } }))
      ),
    ],
  };
};

const programMatchesSelectedPrograms = (program = {}, selectedPrograms = []) => {
  if (!selectedPrograms.length) return true;
  const title = normalizeText(program.title);
  return selectedPrograms.some((selectedProgram) => title === normalizeText(selectedProgram));
};

export const normalizeProgramMatchText = (value = "") =>
  normalizeText(stripProgramDegreeSuffix(value))
    .replace(/^(bachelor'?s?\s+program\s+in|bachelors?\s+program\s+in|bachelor\s+of|bachelor\s+in|master'?s?\s+program\s+in|masters?\s+program\s+in|master\s+of|master\s+in)\s+/g, "")
    .replace(
      /\b(bachelor s|bachelors|bachelor|master s|masters|master|degree|programme|program|undergraduate|postgraduate)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

const PROGRAM_SPECIALIZATION_WORDS = new Set([
  "science",
  "sciences",
  "statistics",
  "business",
  "administration",
  "chinese",
  "language",
  "literature",
  "economics",
  "finance",
  "management",
  "agricultural",
  "agriculture",
  "rural",
  "development",
  "art",
]);

const getProgramSpecializationWords = (value = "") =>
  normalizeProgramMatchText(value)
    .split(" ")
    .filter((word) => PROGRAM_SPECIALIZATION_WORDS.has(word));

const getProgramMatchTokens = (value = "") =>
  normalizeProgramMatchText(value)
    .split(" ")
    .filter(Boolean);

export const strictProgramTitleMatch = (program = {}, title = "") => {
  if (!title?.trim()) return true;
  const normalizedTitle = normalizeProgramMatchText(title);
  if (!normalizedTitle) return false;
  const programTitle = normalizeProgramMatchText(program.title);
  const programName = normalizeProgramMatchText(program.program_name || program.name);
  const candidates = [programTitle, programName].filter(Boolean);

  return candidates.some((value) => {
    const requiredSpecializationWords = getProgramSpecializationWords(normalizedTitle);
    if (
      requiredSpecializationWords.length &&
      !requiredSpecializationWords.every((word) => value.split(" ").includes(word))
    ) {
      return false;
    }

    const candidateTokens = getProgramMatchTokens(value);
    const selectedTokens = getProgramMatchTokens(normalizedTitle);
    const selectedIncludesCandidateSafely =
      normalizedTitle.includes(value) &&
      candidateTokens.length >= 2 &&
      selectedTokens.length - candidateTokens.length <= 2;

    return (
      value === normalizedTitle ||
      value.includes(normalizedTitle) ||
      selectedIncludesCandidateSafely
    );
  });
};

export const fuzzyProgramTitleMatch = strictProgramTitleMatch;

const universityMatchesRequestedDegree = (university = {}, degree = "bachelor") => {
  const explicitDegree = normalizeDegree(university.degree || university.educationLevel);
  return explicitDegree ? explicitDegree === degree : extractProgramsForStudent(university, degree).length > 0;
};

const universityMatchesSearch = (university = {}, search = "") => {
  const normalizedSearch = normalizeText(search);
  if (!normalizedSearch) return true;

  return [
    university.university,
    university.universityName,
    university.INSTNM,
    university.name,
    university.CITY,
    university.STABBR,
    university.country,
    university.COUNTRY,
    university.location?.city,
    university.location?.state,
    university.location?.country,
    university.location?.display,
  ].some((value) => normalizeText(value).includes(normalizedSearch));
};

const programMatchesQuery = (program = {}, q = "") => {
  const normalizedQ = normalizeText(q);
  if (!normalizedQ) return true;
  return normalizeText(program.title).includes(normalizedQ);
};

export const getMongoMajorAreaIndex = async ({ degree = "bachelor" } = {}) => {
  const universities = await University.find({ $and: [{ isVisible: true }, degreeQuery(degree)] })
    .select(studentUniversityProjection)
    .limit(10000)
    .lean();

  const areasByName = new Map();
  const programsByKey = new Map();
  const universitiesById = new Map();

  universities.forEach((university) => {
    const universityId = university._id?.toString?.() || university.UNITID?.toString?.() || "";
    const universityName = pickUniversityName(university);
    const programs = extractProgramsForStudent(university, degree);

    programs.forEach((program) => {
      const areaName = program.majorArea || program.major_area;
      if (!areaName) return;
      if (!areasByName.has(areaName)) areasByName.set(areaName, { name: areaName, programsByKey: new Map() });

      const section = areasByName.get(areaName);
      const programKey = normalizeText(program.title);
      if (!programKey) return;

      const indexedProgram = section.programsByKey.get(programKey) || {
        ...program,
        universityIds: [],
        universities: [],
      };
      if (universityId && !indexedProgram.universityIds.includes(universityId)) indexedProgram.universityIds.push(universityId);
      if (universityId && !indexedProgram.universities.some((item) => item.id === universityId)) {
        indexedProgram.universities.push({ id: universityId, name: universityName });
      }
      section.programsByKey.set(programKey, indexedProgram);

      if (!programsByKey.has(programKey)) {
        programsByKey.set(programKey, { ...indexedProgram });
      } else {
        const existing = programsByKey.get(programKey);
        indexedProgram.universityIds.forEach((id) => {
          if (!existing.universityIds.includes(id)) existing.universityIds.push(id);
        });
        indexedProgram.universities.forEach((uni) => {
          if (!existing.universities.some((item) => item.id === uni.id)) existing.universities.push(uni);
        });
      }

      if (universityId && !universitiesById.has(universityId)) {
        universitiesById.set(universityId, {
          _id: university._id,
          UNITID: university.UNITID,
          university: university.university,
          universityName: university.universityName,
          INSTNM: university.INSTNM,
          location: university.location,
          CITY: university.CITY,
          STABBR: university.STABBR,
          country: university.country,
          degree: university.degree,
          educationLevel: university.educationLevel,
          isVisible: university.isVisible,
          stats: university.stats,
        });
      }
    });
  });

  const majorAreas = [...areasByName.values()]
    .map((section) => {
      const items = [...section.programsByKey.values()].sort((a, b) => a.title.localeCompare(b.title));
      return {
        id: normalizeText(section.name).replace(/\s+/g, "-"),
        name: section.name,
        programs: items.map((item) => item.title),
        items,
        groups: items.map((item) => ({
          name: item.title,
          programs: [item.title],
          items: [{ ...item, group: item.title }],
        })),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    majorAreas,
    programs: [...programsByKey.values()].sort((a, b) => a.title.localeCompare(b.title)),
    universities: [...universitiesById.values()].sort((a, b) => pickUniversityName(a).localeCompare(pickUniversityName(b))),
  };
};

export const getCachedMajorAreas = async ({ degree = "bachelor" } = {}) => {
  const cacheKey = degree;
  const cached = majorAreaCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.majorAreas;

  const universities = await University.find({ $and: [{ isVisible: true }, degreeQuery(degree)] })
    .select(majorAreaProjection)
    .limit(10000)
    .lean();

  const countsByArea = new Map();
  universities.forEach((university) => {
    const programDataAreas = new Set();

    (university.programs_data || []).forEach((program) => {
      const area = (program.major_area || program.majorArea || "").toString().trim();
      if (!area) return;
      programDataAreas.add(area);
      countsByArea.set(area, (countsByArea.get(area) || 0) + 1);
    });

    (university.major_areas || []).forEach((areaRecord) => {
      const area = (areaRecord.major_area || "").toString().trim();
      if (!area || programDataAreas.has(area)) return;
      countsByArea.set(area, (countsByArea.get(area) || 0) + 1);
    });
  });

  const majorAreas = [...countsByArea.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  majorAreaCache.set(cacheKey, {
    expiresAt: Date.now() + MAJOR_AREA_CACHE_TTL_MS,
    majorAreas,
  });

  return majorAreas;
};

export const getCachedMajorAreasByCountry = async ({ degree = "bachelor", country = "" } = {}) => {
  const selectedCountry = country.toString().trim();
  if (!selectedCountry) return getCachedMajorAreas({ degree });

  const cacheKey = `${degree}:${normalizeText(selectedCountry)}`;
  const cached = majorAreaCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.majorAreas;

  const universities = await University.find({
    $and: [
      { isVisible: true },
      degreeQuery(degree),
    ],
  })
    .select({
      degree: 1,
      educationLevel: 1,
      INSTNM: 1,
      university: 1,
      universityName: 1,
      location: 1,
      country: 1,
      COUNTRY: 1,
      "GUS_DATA.country": 1,
      "major_areas.major_area": 1,
      "GUS_DATA.major_areas.major_area": 1,
      "programs_data.major_area": 1,
      "programs_data.majorArea": 1,
      "programs_data.degree": 1,
      "GUS_DATA.programs_data.major_area": 1,
      "GUS_DATA.programs_data.majorArea": 1,
      "GUS_DATA.programs_data.degree": 1,
    })
    .limit(10000)
    .lean();

  const filteredUniversities = universities.filter((university) =>
    countryMatchesUniversity(university, selectedCountry)
  );

  const countsByArea = new Map();
  const addArea = (area = "") => {
    const name = area.toString().trim();
    if (!name) return;
    countsByArea.set(name, (countsByArea.get(name) || 0) + 1);
  };

  filteredUniversities.forEach((university) => {
    const programDataAreas = new Set();

    [
      ...(university.programs_data || []),
      ...(university.GUS_DATA?.programs_data || []),
    ].forEach((program) => {
      if (degree === "professional-degree" && !isMedicalProgramDegree(program.degree)) return;
      const area = (program.major_area || program.majorArea || "").toString().trim();
      if (!area) return;
      programDataAreas.add(area);
      addArea(area);
    });

    if (degree !== "professional-degree") {
      [
        ...(university.major_areas || []),
        ...(university.GUS_DATA?.major_areas || []),
      ].forEach((areaRecord) => {
        const area = (areaRecord.major_area || "").toString().trim();
        if (!area || programDataAreas.has(area)) return;
        addArea(area);
      });
    }
  });

  const majorAreas = [...countsByArea.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log("Selected degree:", degree);
  console.log("Selected country:", selectedCountry);
  console.log("Filtered universities:", filteredUniversities.map((university) => pickUniversityName(university)));
  console.log("Returned major areas:", majorAreas.map((area) => area.name));

  majorAreaCache.set(cacheKey, {
    expiresAt: Date.now() + MAJOR_AREA_CACHE_TTL_MS,
    majorAreas,
  });

  return majorAreas;
};

export const searchProgramsFromMongo = async ({
  degree = "bachelor",
  country = "",
  majorArea = "",
  group = "",
  q = "",
  page = 1,
  limit = 50,
} = {}) => {
  const requestedArea = majorArea.trim();
  if (!requestedArea) return { programs: [], total: 0 };

  try {
    const filters = [
      { isVisible: true },
      degreeQuery(degree),
    ].filter(Boolean);

    const universities = await University.find({ $and: filters })
      .select(programListProjection)
      .limit(10000)
      .lean();

    const selectedCountry = country.toString().trim();
    const countryFilteredUniversities = selectedCountry
      ? universities.filter((university) =>
          countryMatchesUniversity(university, selectedCountry)
        )
      : universities;

    const programsByKey = new Map();
    countryFilteredUniversities.forEach((university) => {
      const degreeSafePrograms = extractProgramsForStudent(university, degree);

      degreeSafePrograms
        .filter((program) => degree === "professional-degree"
          ? normalizeText(program.majorArea || program.major_area) === normalizeText(requestedArea)
          : majorAreasMatch(program.majorArea || program.major_area, requestedArea))
        .filter((program) => !group || normalizeText(program.title) === normalizeText(group))
        .filter((program) => programMatchesQuery(program, q))
        .forEach((program) => {
          const key = normalizeText(program.title);
          if (!key) return;

          const existing = programsByKey.get(key);
          const universityId = university._id?.toString?.() || university.UNITID?.toString?.();

          if (!existing) {
            programsByKey.set(key, {
              ...program,
              universityIds: universityId ? [universityId] : [],
            });
          } else if (universityId && !existing.universityIds.includes(universityId)) {
            existing.universityIds.push(universityId);
          }
        });
    });

    const filtered = [...programsByKey.values()]
      .sort((a, b) => a.title.localeCompare(b.title));

    console.log("Program API degree:", degree);
    console.log("Program API country:", selectedCountry);
    console.log("Program API majorArea:", requestedArea);
    console.log("Program API universities before country filter:", universities.length);
    console.log("Program API universities after country filter:", countryFilteredUniversities.length);
    console.log("Returned programs:", filtered.map((program) => program.title));

    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return {
      programs: items,
      total: filtered.length,
    };
  } catch (error) {
    console.error("searchProgramsFromMongo error:", error);
    throw error;
  }
};

export const searchUniversitiesFromMongo = async ({
  degree = "bachelor",
  country = "",
  majorArea = "",
  majorAreas = [],
  selectedPrograms = [],
  search = "",
  page = 1,
  limit = 30,
} = {}) => {
  const requestedMajorAreas = [
    ...majorAreas,
    majorArea,
  ].map((area) => area.toString().trim()).filter(Boolean);
  const selectedCountry = country.toString().trim();
  const selectedMajorArea = requestedMajorAreas[0] || "";

  if (!selectedPrograms.length && !requestedMajorAreas.length) {
    return { programs: [], universities: [], total: 0 };
  }

  const filters = [
    { isVisible: true },
    degreeQuery(degree),
  ].filter(Boolean);
  const universities = await University.find({ $and: filters })
    .select(universityListProjection)
    .sort({ INSTNM: 1, university: 1, universityName: 1 })
    .limit(10000)
    .lean();

  const countryFilteredUniversities = selectedCountry
    ? universities.filter((university) =>
        countryMatchesUniversity(university, selectedCountry)
      )
    : universities;

  const searchFilteredUniversities = countryFilteredUniversities.filter((university) =>
    universityMatchesSearch(university, search)
  );

  const matchedUniversities = searchFilteredUniversities
    .map((university) => {
      const programs = extractProgramsForStudent(university, degree);
      const matchedPrograms = dedupeProgramsForStudent(programs.filter((program) => {
        const matchesSelectedProgram =
          selectedPrograms.length > 0 &&
          selectedPrograms.some((selectedProgram) =>
            strictProgramTitleMatch(program, selectedProgram)
          );

        const matchesSelectedMajorArea =
          requestedMajorAreas.length > 0 &&
          requestedMajorAreas.some((area) =>
            strictMajorAreaMatch(program.majorArea || program.major_area || program.category || "", area)
          );

        if (selectedPrograms.length) {
          return programMatchesDegree(program, degree) && matchesSelectedProgram;
        }

        if (requestedMajorAreas.length) {
          return programMatchesDegree(program, degree) && matchesSelectedMajorArea;
        }
        return false;
      }), degree);

      const majorAreaMatch = requestedMajorAreas.length
        ? programs.some((program) =>
            requestedMajorAreas.some((area) => strictMajorAreaMatch(program.majorArea || program.major_area || program.category || "", area))
          )
        : false;
      const programMatch = selectedPrograms.length
        ? programs.some((program) =>
            selectedPrograms.some((selectedProgram) =>
              strictProgramTitleMatch(program, selectedProgram)
            )
          )
        : true;
      const selectedProgram = selectedPrograms[0] || "";
      const isHongKongUniversity =
        normalizeCountryText(selectedCountry) === "hong kong" ||
        normalizeCountryText(extractCountryFromUniversity(university)) === "hong kong";
      const passReason = matchedPrograms.length
        ? selectedPrograms.length
          ? "passed: matched selected program title"
          : "passed: matched selected major area"
        : selectedPrograms.length
          ? "failed: no selected program title match"
          : "failed: no major area match";

      console.log("Selected Program:", selectedProgram);
      console.log("University:", pickUniversityName(university));
      console.log("Selected major area:", selectedMajorArea);
      console.log("Major Area Match:", majorAreaMatch);
      console.log("Program Match:", programMatch);
      if (isHongKongUniversity) {
        console.log("Hong Kong university filter debug:", {
          university: pickUniversityName(university),
          availableMajorAreas: [...new Set(programs.map((program) => program.majorArea || program.major_area).filter(Boolean))],
          selectedMajorAreas: requestedMajorAreas,
          selectedPrograms,
          matchedProgramTitles: matchedPrograms.map((program) => program.title),
          result: passReason,
        });
      }

      if (!matchedPrograms.length) return null;
      const {
        programs_data,
        major_areas,
        GUS_DATA,
        programTemplate,
        programTemplates,
        programs: universityPrograms,
        courses,
        metadata,
        ...universitySummary
      } = university;

      return {
        ...universitySummary,
        matchedPrograms,
        programs: matchedPrograms,
        matchedProgramCount: matchedPrograms.length,
        stats: {
          ...(universitySummary.stats || {}),
          totalPrograms: programs.length,
          matchedProgramCount: matchedPrograms.length,
        },
        totalPrograms: programs.length,
      };
    })
    .filter((university) =>
      university &&
      Number(university.matchedProgramCount || 0) > 0 &&
      Array.isArray(university.matchedPrograms) &&
      university.matchedPrograms.length > 0
    );

  console.log("Degree:", degree);
  console.log("Country:", selectedCountry);
  console.log("Universities after degree:", universities.length);
  console.log("Universities after country:", countryFilteredUniversities.map(pickUniversityName));
  console.log("Matched universities:", matchedUniversities.map((university) => ({
    name: pickUniversityName(university),
    matchedProgramCount: university.matchedProgramCount,
  })));

  const start = (page - 1) * limit;
  const data = matchedUniversities.slice(start, start + limit);

  return {
    programs: data.flatMap((university) => university.matchedPrograms),
    universities: data,
    total: matchedUniversities.length,
  };
};

export const findUniversityById = async (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    const byObjectId = await University.findById(id).lean();
    if (byObjectId) return byObjectId;
  }

  const numericId = Number(id);
  if (!Number.isNaN(numericId)) {
    return University.findOne({ UNITID: numericId }).lean();
  }

  return null;
};
