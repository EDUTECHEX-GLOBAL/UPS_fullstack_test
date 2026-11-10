import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ProgramSelection from '../model/programmodel.js';
import UniversitySelection from '../model/universityselectionmodel.js';
import TestScores from '../model/testmodel.js';

const getUserId = (req) => req.user?.id || req.user?.userId;

let bachelorUniversityRows;
const getBachelorUniversityRows = () => {
  if (bachelorUniversityRows) return bachelorUniversityRows;
  try {
    const controllerDir = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
      path.resolve(process.cwd(), 'server', 'bacheloruniversity.json'),
      path.resolve(process.cwd(), 'bacheloruniversity.json'),
      path.resolve(controllerDir, '../../bacheloruniversity.json'),
    ];
    const filePath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!filePath) throw new Error('bacheloruniversity.json was not found');
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    bachelorUniversityRows = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Unable to load bachelor university score requirements:', error);
    bachelorUniversityRows = [];
  }
  return bachelorUniversityRows;
};

const getScoreEligibleBachelorUniversities = (test = {}) => {
  const exam = String(test.exam || '').toLowerCase();
  const scoreText = String(test.score ?? '').replace(/,/g, '').trim();
  const score = scoreText && /^\d+(?:\.\d+)?$/.test(scoreText) ? Number(scoreText) : NaN;
  if (!Number.isFinite(score)) return [];

  const requirementKey = exam.includes('ielts') ? 'IELTS Min (Overall)'
    : exam.includes('toefl') ? 'TOEFL iBT Min'
      : exam.includes('pte') ? 'PTE Academic Min'
        : exam.includes('duolingo') ? 'Duolingo Min'
          : null;
  if (!requirementKey) return [];

  const eligible = new Map();
  getBachelorUniversityRows().forEach((row) => {
    if (!String(row['Degree Levels Offered'] || '').toLowerCase().includes('bachelor')) return;
    const minimumText = String(row[requirementKey] ?? '').trim();
    const minimum = minimumText && /^\d+(?:\.\d+)?$/.test(minimumText) ? Number(minimumText) : NaN;
    const universityName = String(row.University || '').trim();
    const country = String(row['Country / Location'] || '').trim();
    if (!universityName || !Number.isFinite(minimum) || score < minimum) return;

    const key = `${universityName.toLowerCase()}|${country.toLowerCase()}`;
    const existing = eligible.get(key);
    const programName = String(row.Program || '').trim();
    if (!existing) {
      eligible.set(key, {
        universityId: key,
        universityName,
        country,
        network: row.Network || '',
        programName,
        selectedPrograms: programName ? [programName] : [],
        minScoreRequired: minimum,
      });
    } else {
      if (programName && !existing.selectedPrograms.includes(programName)) existing.selectedPrograms.push(programName);
      if (minimum < existing.minScoreRequired) existing.minScoreRequired = minimum;
    }
  });
  return Array.from(eligible.values());
};

export const getUniversitySelection = async (req, res) => {
  try {
    const userId = getUserId(req);

    const [program, testScores, uniSelection] = await Promise.all([
      ProgramSelection.findOne({ userId }).lean(),
      TestScores.findOne({ userId }).lean(),
      UniversitySelection.findOne({ userId }).lean()
    ]);

    const programObj = program ? (program.programSelection || program) : {};
    const selectedCountries = Array.isArray(programObj.selectedCountries) && programObj.selectedCountries.length > 0
      ? programObj.selectedCountries
      : (programObj.countryName ? [programObj.countryName] : []);
    const selectedCountryKeys = new Set(selectedCountries.map((country) => String(country || '').trim().toLowerCase()).filter(Boolean));

    const isBachelor = !programObj.programType || /bachelor|undergraduate|^ug$/i.test(programObj.programType);
    const eligibleUnis = [];
    if (testScores && Array.isArray(testScores.tests)) {
      testScores.tests.forEach(test => {
        const rawUnis = Array.isArray(test.selectedUniversities) && test.selectedUniversities.length > 0
          ? test.selectedUniversities
          : (Array.isArray(test.eligibleUniversities) ? test.eligibleUniversities : []);

        const calculatedUnis = isBachelor ? getScoreEligibleBachelorUniversities(test) : [];
        const eligibleKeys = new Set(calculatedUnis.map((university) =>
          `${university.universityName.toLowerCase()}|${university.country.toLowerCase()}`
        ));
        const matchingUnis = isBachelor
          ? calculatedUnis.filter((university) => !selectedCountryKeys.size || selectedCountryKeys.has(String(university.country || '').trim().toLowerCase()))
          : rawUnis;

        matchingUnis.forEach(u => {
          const uName = typeof u === 'string' ? u : (u.university || u.universityName || u.name || '');
          const uCountry = typeof u === 'object' ? (u.country || '') : '';
          const uId = (typeof u === 'object' && (u.id || u.universityId || u._id)) ? String(u.id || u.universityId || u._id) : uName;
          const programs = typeof u === 'object' && Array.isArray(u.selectedPrograms) ? u.selectedPrograms : [];
          const existing = eligibleUnis.find(e =>
            e.universityName.toLowerCase() === uName.toLowerCase() &&
            e.country.toLowerCase() === (uCountry || selectedCountries[0] || '').toLowerCase()
          );
          if (existing) {
            existing.selectedPrograms = Array.from(new Set([...(existing.selectedPrograms || []), ...programs]));
          } else if (uName) {
            eligibleUnis.push({
              universityId: uId,
              universityName: uName,
              country: uCountry || selectedCountries[0] || '',
              network: u.network || '',
              minScoreRequired: u.minScoreRequired || 0,
              selectedPrograms: programs,
              programName: u.programName || programs[0] || ''
            });
          }
        });
      });
    }

    // Filter active countries to ONLY those countries where the student selected universities in Test Scores
    const uniCountries = Array.from(new Set(eligibleUnis.map(u => u.country).filter(Boolean)));
    const activeCountries = uniCountries.length > 0 ? uniCountries : selectedCountries;

    const isApproved = uniSelection?.status === 'Completed' && (uniSelection?.selectedUniversities || []).length > 0;

    const resultData = {
      isApproved,
      programApprovalStatus: program?.programApprovalStatus || 'pending',
      programType: programObj.programType || 'bachelors',
      selectedCountry: uniSelection?.selectedCountry || activeCountries[0] || '',
      selectedCountries: activeCountries,
      // Only expose partner-assigned universities after the partner approves
      // the shortlist. Program approval alone does not authorize student selection.
      eligibleUniversities: [],
      selectedUniversities: (isApproved ? uniSelection.selectedUniversities : []).map((university) => {
        const eligible = eligibleUnis.find((candidate) =>
          candidate.universityName.toLowerCase() === String(university.universityName || '').toLowerCase() &&
          candidate.country.toLowerCase() === String(university.country || '').toLowerCase()
        );
        let selectedPrograms = (Array.isArray(university.selectedPrograms) && university.selectedPrograms.length > 0)
          ? university.selectedPrograms
          : (university.programName && university.programName !== 'Degree Program'
              ? university.programName.split(', ').map(p => p.trim()).filter(Boolean)
              : []);

        if (selectedPrograms.length === 0) {
          selectedPrograms = eligible?.selectedPrograms?.length ? [eligible.selectedPrograms[0]] : [university.programName || 'Degree Program'];
        }

        return {
          ...university,
          selectedPrograms,
          programName: selectedPrograms.join(', ')
        };
      }),
      studentSelectedPrograms: isApproved ? (uniSelection?.studentSelectedPrograms || []) : [],
      status: uniSelection?.status || 'selected',
    };

    return res.status(200).json({ success: true, data: resultData });
  } catch (error) {
    console.error('getUniversitySelection Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch university selection.', error: error.message });
  }
};

export const saveStudentUniversityChoices = async (req, res) => {
  try {
    const userId = getUserId(req);
    const requested = req.body?.selectedPrograms;
    if (!Array.isArray(requested) || requested.length < 2 || requested.length > 5) {
      return res.status(400).json({ success: false, message: 'Select between 2 and 5 programs.' });
    }

    const [selection, testScores] = await Promise.all([
      UniversitySelection.findOne({ userId }),
      TestScores.findOne({ userId }).lean()
    ]);
    if (!selection || selection.status !== 'Completed' || !Array.isArray(selection.selectedUniversities)) {
      return res.status(403).json({ success: false, message: 'Your partner has not approved a university assignment yet.' });
    }

    const approvedById = new Map(selection.selectedUniversities.map((university) => [String(university.universityId), university]));
    const scoreEligiblePrograms = new Map();
    (testScores?.tests || []).forEach((test) => {
      getScoreEligibleBachelorUniversities(test).forEach((university) => {
        const key = `${university.universityName.toLowerCase()}|${university.country.toLowerCase()}`;
        scoreEligiblePrograms.set(key, Array.from(new Set([
          ...(scoreEligiblePrograms.get(key) || []),
          ...(university.selectedPrograms || [])
        ])));
      });
    });
    const requestedKeys = requested.map((choice) => `${String(choice?.universityId || '')}|${String(choice?.programName || '').trim()}`);
    if (requestedKeys.some((key) => key.startsWith('|') || key.endsWith('|')) || new Set(requestedKeys).size !== requestedKeys.length) {
      return res.status(400).json({ success: false, message: 'Choose 2 to 5 different approved university programs.' });
    }

    const selectedPrograms = [];
    for (const choice of requested) {
      const university = approvedById.get(String(choice.universityId));
      const eligiblePrograms = scoreEligiblePrograms.get(`${String(university?.universityName || '').toLowerCase()}|${String(university?.country || '').toLowerCase()}`) || [];
      const storedPrograms = Array.isArray(university?.selectedPrograms) ? university.selectedPrograms : [];
      // The counselor-approved university record is the source of truth for
      // the options shown to the student. Recomputed score matches can have
      // different catalog labels and must not invalidate those choices.
      const offeredPrograms = storedPrograms.length
        ? storedPrograms
        : (eligiblePrograms.length
          ? eligiblePrograms
          : String(university?.programName || university?.degree || '').split(',').map((program) => program.trim()).filter(Boolean));
      const requestedProgram = String(choice.programName).trim();
      const approvedProgram = offeredPrograms.find((program) =>
        String(program).trim().toLocaleLowerCase() === requestedProgram.toLocaleLowerCase()
      );
      if (!university || !approvedProgram) {
        return res.status(400).json({ success: false, message: 'A selected program is not part of your approved university list.' });
      }
      selectedPrograms.push({
        universityId: university.universityId,
        universityName: university.universityName,
        country: university.country,
        programName: String(approvedProgram).trim(),
        degree: university.degree || ''
      });
    }

    selection.studentSelectedPrograms = selectedPrograms;
    await selection.save();

    return res.status(200).json({
      success: true,
      message: 'Program choices saved successfully.',
      data: { studentSelectedPrograms: selection.studentSelectedPrograms }
    });
  } catch (error) {
    console.error('saveStudentUniversityChoices Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save program choices.', error: error.message });
  }
};

export const saveUniversitySelection = async (req, res) => {
  try {
    const userId = getUserId(req);
    const selection = await UniversitySelection.findOne({ userId }).lean();
    if (!selection || selection.status !== 'Completed' || !selection.selectedUniversities?.length) {
      return res.status(403).json({ success: false, message: 'Your partner has not approved a university assignment yet.' });
    }
    return res.status(403).json({ success: false, message: 'University assignments are managed by your partner.' });
  } catch (error) {
    console.error('saveUniversitySelection Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save university selection.', error: error.message });
  }
};
