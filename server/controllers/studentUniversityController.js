import {
  dedupeProgramsForStudent,
  extractProgramsForStudent,
  findUniversityById,
  getCachedMajorAreas,
  getCachedMajorAreasByCountry,
  getRequestedDegree,
  normalizeText,
  searchProgramsFromMongo,
  searchUniversitiesFromMongo,
  strictMajorAreaMatch,
  strictProgramTitleMatch,
} from "../services/majorAreaProgramIndex.js";

const degreeLabels = (degree) =>
  degree === "master"
    ? { level: "Postgraduate" }
    : degree === "professional-degree"
      ? { level: "Professional Degree" }
    : { level: "Undergraduate" };

const splitSelectedPrograms = (value = "") =>
  value
    .toString()
    .split(",")
    .map((program) => program.trim())
    .filter(Boolean);

const parseJsonArray = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item).trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
};

const getSelectedProgramsFromQuery = (query = {}) => {
  const jsonPrograms = parseJsonArray(query.programsJson);
  if (jsonPrograms.length) return jsonPrograms;

  const raw = query.programs || query.program || "";
  return raw ? [String(raw).trim()] : [];
};

const getSelectedMajorAreasFromQuery = (query = {}) => {
  const jsonAreas = parseJsonArray(query.majorAreasJson);
  if (jsonAreas.length) return jsonAreas;

  return [
    query.segment,
    query.majorArea,
    query.majorAreas,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean);
};

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

  if (university.location && typeof university.location === "string") {
    const parts = university.location
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

const countryMatchesRequest = (university = {}, requestedCountry = "") => {
  const normalizedRequestedCountry = normalizeCountryText(requestedCountry);
  if (!normalizedRequestedCountry) return true;
  return normalizeCountryText(extractCountryFromUniversity(university)) === normalizedRequestedCountry;
};

const programMajorAreaMatches = (program = {}, selectedArea = "") =>
  strictMajorAreaMatch(
    program.majorArea ||
      program.major_area ||
      program.category ||
      program.field ||
      program.original_major_area ||
      "",
    selectedArea
  );

const safeDedupeUniversityPrograms = (programs = [], degree = "") => {
  try {
    return dedupeProgramsForStudent(programs, degree);
  } catch (error) {
    console.error("University program dedupe error:", error);
    return Array.isArray(programs) ? programs.filter(Boolean) : [];
  }
};

export const getStudentProgramSections = async (req, res) => {
  try {
    const degree = getRequestedDegree(req.query);
    const country = (req.query.country || "").toString().trim();
    const majorAreas = country
      ? await getCachedMajorAreasByCountry({ degree, country })
      : await getCachedMajorAreas({ degree });

    res.json({
      success: true,
      majorAreas,
      sections: majorAreas,
    });
  } catch (error) {
    console.error("Student program sections error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch program sections" });
  }
};

export const searchStudentPrograms = async (req, res) => {
  try {
    const degree = getRequestedDegree(req.query);
    const country = (req.query.country || "").toString().trim();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 50);
    const result = await searchProgramsFromMongo({
      degree,
      country,
      majorArea: (req.query.segment || req.query.majorArea || "").toString().trim(),
      group: (req.query.group || "").toString().trim(),
      q: (req.query.q || "").toString().trim(),
      page,
      limit,
    });

    res.json({
      success: true,
      programs: result.programs,
      data: result.programs.map((program) => program.title),
      items: result.programs,
      count: result.programs.length,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error("Student program search error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search programs",
      error: error.message,
    });
  }
};

export const searchStudentUniversities = async (req, res) => {
  try {
    const degree = getRequestedDegree(req.query);
    const country = (req.query.country || "").toString().trim();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
    const selectedPrograms = splitSelectedPrograms(req.query.programs || req.query.program || "");
    const selectedMajorAreas = splitSelectedPrograms(req.query.majorAreas || "");
    console.log("selectedPrograms:", selectedPrograms);
    console.log("selectedMajorAreas:", selectedMajorAreas);
    const result = await searchUniversitiesFromMongo({
      degree,
      country,
      majorArea: (req.query.segment || req.query.majorArea || "").toString().trim(),
      majorAreas: selectedMajorAreas,
      selectedPrograms,
      search: (req.query.search || "").toString().trim(),
      page,
      limit,
    });
    const countryFilteredUniversities = country
      ? result.universities.filter((university) => countryMatchesRequest(university, country))
      : result.universities;
    const countryFilteredPrograms = countryFilteredUniversities.flatMap((university) =>
      Array.isArray(university.matchedPrograms) ? university.matchedPrograms : []
    );

    console.log("Selected country:", country);
    console.log("After country filter count:", countryFilteredUniversities.length);
    console.log("matchedPrograms:", countryFilteredPrograms.map((program) => program.title));
    console.log("matchedProgramCount:", countryFilteredPrograms.length);

    res.json({
      success: true,
      programs: country ? countryFilteredPrograms : result.programs,
      universities: countryFilteredUniversities,
      data: countryFilteredUniversities,
      pagination: {
        page,
        limit,
        total: country ? countryFilteredUniversities.length : result.total,
        pages: Math.ceil((country ? countryFilteredUniversities.length : result.total) / limit),
      },
    });
  } catch (error) {
    console.error("Student university search error:", error);
    res.status(500).json({ success: false, message: "Failed to search universities" });
  }
};

export const getStudentUniversityPrograms = async (req, res) => {
  try {
    const degree = getRequestedDegree(req.query);
    const requestedCountry = (req.query.country || "").toString().trim();
    const selectedPrograms = getSelectedProgramsFromQuery(req.query);
    const selectedMajorAreas = getSelectedMajorAreasFromQuery(req.query);
    const showAll = req.query.showAll === "true";
    const matchOnly = req.query.matchOnly === "true";
    const university = await findUniversityById(req.params.id);

    if (!university) {
      return res.status(404).json({ success: false, message: "University not found" });
    }

    const universityCountry = extractCountryFromUniversity(university);
    if (!requestedCountry) {
      console.warn("WARNING: country query missing for university programs");
    }
    console.log("requestedCountry:", requestedCountry);
    console.log("universityCountry:", universityCountry);
    console.log("showAll:", showAll);
    if (
      requestedCountry &&
      normalizeCountryText(requestedCountry) !== normalizeCountryText(universityCountry)
    ) {
      return res.json({
        success: true,
        university: university.universityName || university.university || university.INSTNM || university.name || "Unknown University",
        universityId: university._id,
        UNITID: university.UNITID,
        degree,
        educationLevel: degreeLabels(degree).level,
        country: universityCountry,
        majorAreas: [],
        totalPrograms: 0,
        matchedProgramCount: 0,
        stats: {
          totalPrograms: 0,
          matchedProgramCount: 0,
        },
        matchedPrograms: [],
        programs: [],
        programs_data: [],
      });
    }

    const allUniversityPrograms = extractProgramsForStudent(university, degree);
    const dedupedAllPrograms = safeDedupeUniversityPrograms(allUniversityPrograms, degree);
    const matchedPrograms = safeDedupeUniversityPrograms(dedupedAllPrograms.filter((program) => {
      const matchesSelectedProgram =
        selectedPrograms.length > 0 &&
        selectedPrograms.some((selected) =>
          strictProgramTitleMatch(program, selected)
        );

      const matchesSelectedMajorArea =
        selectedMajorAreas.length > 0 &&
        selectedMajorAreas.some((area) => programMajorAreaMatches(program, area));

      if (selectedPrograms.length) {
        return matchesSelectedProgram;
      }
      if (selectedMajorAreas.length) {
        return matchesSelectedMajorArea;
      }
      return false;
    }), degree);
    const hasSelectedProgramFilter = selectedPrograms.length > 0;
    const hasMajorAreaFilter = selectedMajorAreas.length > 0;
    const hasMatchFilter = matchOnly || hasSelectedProgramFilter || hasMajorAreaFilter;
    const programs = showAll ? dedupedAllPrograms : hasMatchFilter ? matchedPrograms : [];
    const universityName = university.universityName || university.university || university.INSTNM || university.name || "Unknown University";

    console.log("selectedPrograms:", selectedPrograms);
    console.log("selectedMajorAreas:", selectedMajorAreas);
    console.log("matchedPrograms:", matchedPrograms.map((program) => program.title));
    console.log("matchedProgramCount:", matchedPrograms.length);

    res.json({
      success: true,
      university: universityName,
      universityId: university._id,
      UNITID: university.UNITID,
      degree,
      educationLevel: degreeLabels(degree).level,
      country: universityCountry,
      majorAreas: [...new Set(allUniversityPrograms.map((program) => program.majorArea).filter(Boolean))],
      totalPrograms: allUniversityPrograms.length,
      matchedProgramCount: matchedPrograms.length,
      stats: {
        totalPrograms: allUniversityPrograms.length,
        matchedProgramCount: matchedPrograms.length,
      },
      matchedPrograms,
      programs,
      programs_data: programs,
    });
  } catch (error) {
    console.error("Student university programs error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch university programs" });
  }
};
