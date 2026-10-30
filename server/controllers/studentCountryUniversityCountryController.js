import ProgramSearchIndex from "../models/ProgramSearchIndex.js";
import University from "../models/University.js";
import { getRequestedDegree, isMedicalProgramDegree, programIndexDegreeFilter } from "../services/majorAreaProgramIndex.js";

const normalizeProgramType = (value = "") => value.toString().trim().toUpperCase();

export const getStudentCountryUniversityCountries = async (req, res) => {
  try {
    const programType = normalizeProgramType(req.query.programType);
    if (programType && !["UG", "PG", "MEDICAL"].includes(programType)) {
      return res.status(400).json({
        success: false,
        message: "programType must be UG, PG, or MEDICAL",
      });
    }

    const degree = getRequestedDegree({
      ...req.query,
      degree: programType === "PG" ? "master" : programType === "UG" ? "bachelor" : programType === "MEDICAL" ? "professional-degree" : req.query.degree,
    });

    if (!["bachelor", "master", "professional-degree"].includes(degree)) {
      return res.status(400).json({
        success: false,
        message: "degree must be bachelor, master, or medical",
      });
    }

    const resolvedProgramType = degree === "professional-degree" ? "MEDICAL" : programType || (degree === "master" ? "PG" : "UG");
    if (degree === "professional-degree") {
      const universities = await University.find({
        isVisible: true,
        degree: { $exists: true, $nin: [/^bachelor$/i, /^master$/i, ""] },
      }).select({ country: 1, COUNTRY: 1, location: 1, "GUS_DATA.country": 1, "programs_data.degree": 1 }).lean();
      const medicalUniversities = universities.filter((university) =>
        (university.programs_data || []).some((program) => isMedicalProgramDegree(program.degree))
      );
      const countryValues = medicalUniversities.map((university) => {
        if (university.country) return university.country;
        if (university.COUNTRY) return university.COUNTRY;
        if (university.location && typeof university.location === "object") return university.location.country;
        if (university.GUS_DATA?.country) return university.GUS_DATA.country;
        if (typeof university.location === "string") return university.location.replace(/\([^)]*\)/g, "").split(",").map((part) => part.trim()).filter(Boolean).pop();
        return "";
      }).map((country) => String(country || "").trim()).filter(Boolean);
      const countries = [...new Map(countryValues.map((country) => [country.toLowerCase(), country])).values()].sort((a, b) => a.localeCompare(b));
      return res.json({ success: true, programType: resolvedProgramType, degree, countries, count: countries.length, source: "universities" });
    }

    const records = await ProgramSearchIndex.find({
      isVisible: true,
      ...programIndexDegreeFilter(degree),
      ...(degree === "professional-degree" ? {} : { programType: resolvedProgramType }),
      normalizedCountry: { $ne: "" },
    })
      .select({ country: 1, normalizedCountry: 1 })
      .lean();

    const countries = [...new Map(
      records
        .filter((record) => record.normalizedCountry && record.country)
        .map((record) => [record.normalizedCountry, String(record.country).trim()])
    ).values()].sort((a, b) => a.localeCompare(b));

    console.log("Country API Source: ProgramSearchIndex");
    console.log("Country API Program Type:", programType);
    console.log("Country API Degree:", degree);
    console.log("Country API Records Found:", records.length);
    console.log("Country API Countries Found:", countries.length);
    console.log("Country API Sample Country:", countries[0]);

    return res.json({
      success: true,
      programType,
      degree,
      countries,
      count: countries.length,
    });
  } catch (error) {
    console.error("Student country countries error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch countries",
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/student-country-universities/universities
//   ?programType=UG|PG|MEDICAL  &country=<country name>
//
// Returns a lightweight { id, name } list of universities for the given
// programType + country, sourced from ProgramSearchIndex which is already
// indexed on (normalizedCountry, programType). No majorArea required.
// ---------------------------------------------------------------------------
const normalizeCountryText = (value = "") => {
  let s = value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bmainland\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (s === "russian federation" || s.includes("russia")) return "russia";
  if (s === "usa" || s === "united states" || s === "united states of america") return "united states";
  if (s === "uk" || s === "united kingdom" || s === "great britain") return "united kingdom";
  return s;
};

export const getEnrollmentUniversities = async (req, res) => {
  try {
    const programType = normalizeProgramType(req.query.programType || "");
    const country = String(req.query.country || "").trim();

    if (!programType || !["UG", "PG", "MEDICAL"].includes(programType)) {
      return res.status(400).json({
        success: false,
        message: "programType must be UG, PG, or MEDICAL",
      });
    }
    if (!country) {
      return res.status(400).json({
        success: false,
        message: "country query param is required",
      });
    }

    const normalizedTarget = normalizeCountryText(country);

    let universities = [];

    if (programType === 'MEDICAL') {
      const [allUnivs, indexRecords] = await Promise.all([
        University.find({ isVisible: true }).select({ _id: 1, INSTNM: 1, name: 1, UNIVERSITY: 1, university: 1, country: 1, COUNTRY: 1, location: 1, "GUS_DATA.country": 1, "programs_data.degree": 1 }).lean(),
        ProgramSearchIndex.find({ isVisible: true, programType: 'MEDICAL' }).select({ universityObjectId: 1, universityName: 1, country: 1, normalizedCountry: 1 }).lean()
      ]);
      
      const medicalUniversities = allUnivs.filter((univ) => {
        let c = univ.country || univ.COUNTRY;
        if (!c && univ.location && typeof univ.location === 'object') c = univ.location.country;
        if (!c && univ.GUS_DATA?.country) c = univ.GUS_DATA.country;
        if (!c && typeof univ.location === 'string') {
          c = univ.location.replace(/\([^)]*\)/g, "").split(",").map((part) => part.trim()).filter(Boolean).pop();
        }
        
        const normC = normalizeCountryText(c);
        const hasMedProg = (univ.programs_data || []).some((program) => isMedicalProgramDegree(program.degree));
        
        return (normC === normalizedTarget || normC.includes(normalizedTarget) || normalizedTarget.includes(normC)) && (hasMedProg || univ.degree === 'professional-degree' || /med/i.test(univ.name || univ.UNIVERSITY || univ.university || ''));
      });

      const seen = new Map();
      for (const u of medicalUniversities) {
        const key = String(u._id);
        const uName = u.university || u.INSTNM || u.name || u.UNIVERSITY || u.institutionName || '';
        if (!seen.has(key) && uName && uName !== 'Unknown University') {
          seen.set(key, { id: key, name: uName });
        }
      }

      // Also add from indexRecords matching normalizedTarget
      for (const rec of indexRecords) {
        if (rec.universityObjectId) {
          const recNormC = normalizeCountryText(rec.normalizedCountry || rec.country || '');
          if (recNormC === normalizedTarget || recNormC.includes(normalizedTarget) || normalizedTarget.includes(recNormC)) {
            const key = String(rec.universityObjectId);
            const uName = rec.universityName || rec.name || rec.UNIVERSITY || rec.institutionName || '';
            if (!seen.has(key) && uName) {
              seen.set(key, { id: key, name: uName });
            }
          }
        }
      }

      universities = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      const records = await ProgramSearchIndex.find({
        isVisible: true,
        programType,
        $or: [
          { normalizedCountry: normalizedTarget },
          { normalizedCountry: { $regex: normalizedTarget, $options: 'i' } }
        ],
        universityObjectId: { $exists: true },
      })
        .select({ universityObjectId: 1, universityName: 1, country: 1 })
        .lean();

      const seen = new Map();
      for (const record of records) {
        const key = String(record.universityObjectId);
        const uName = record.universityName || record.name || record.UNIVERSITY || record.institutionName || '';
        if (!seen.has(key) && uName) {
          seen.set(key, { id: key, name: uName });
        }
      }
      universities = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
    }

    console.log(
      `Universities API: programType=${programType}, country=${country}, found=${universities.length}`
    );

    return res.json({
      success: true,
      programType,
      country,
      universities,
      count: universities.length,
    });
  } catch (error) {
    console.error("Enrollment universities error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch universities",
    });
  }
};
