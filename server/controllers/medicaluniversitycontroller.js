import mongoose from "mongoose";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Account from "../models/accountModel.js";
import { fetchEnrollmentList, getMedicalApplicationDetail } from '../Enrollment/controllers/enrollmentAdminController.js';
import ProgramSelection from '../Enrollment/model/programmodel.js';
import UniversitySelection from '../Enrollment/model/universityselectionmodel.js';
import TestScores from '../Enrollment/model/testmodel.js';
import FirstYearReview from '../Enrollment/model/reviewmodel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const loadMedicalUniversityCatalog = () => {
    const candidates = [path.join(process.cwd(), 'server', 'medicaluniversity.json'), path.resolve(__dirname, '../medicaluniversity.json')];
    const filePath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!filePath) throw new Error('Medical university catalog was not found.');
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const getMedicalScore = (testRecord) => {
    const neet = (testRecord?.tests || []).find((test) => String(test.exam || '').trim().toLowerCase() === 'neet');
    if (!String(neet?.score ?? '').trim()) return null;
    const score = Number(neet?.score);
    return Number.isFinite(score) ? score : null;
};

const normalizeCountry = (value) => String(value || '').trim().toLocaleLowerCase();
const getSelectedStudyCountries = (program = {}) => {
    const selection = program.programSelection || {};
    const countries = Array.isArray(selection.selectedCountries) && selection.selectedCountries.length
        ? selection.selectedCountries
        : Array.isArray(program.selectedCountries) && program.selectedCountries.length
            ? program.selectedCountries
            : [selection.countryName || program.countryName].filter(Boolean);
    return new Set(countries.map(normalizeCountry).filter(Boolean));
};

const getEligibleMedicalUniversities = (testRecord) => {
    const score = getMedicalScore(testRecord);
    if (score === null) return [];
    return loadMedicalUniversityCatalog().flatMap((row) => {
        const minimumRaw = row['NEET Min Score'];
        const minimum = Number(minimumRaw);
        const name = String(row.University || row.universityName || '').trim();
        const country = String(row['Country / Location'] || row.Country || row.country || '').trim();
        if (!name || !country || minimumRaw === undefined || minimumRaw === null || String(minimumRaw).trim() === '' || !Number.isFinite(minimum) || score < minimum) return [];
        return [{ universityId: `${name}|${country}`, universityName: name, country, programName: row.Program || 'Medicine & Surgery (MBBS / MD)', minScoreRequired: minimum, neetScore: score, scoreAboveMinimum: 0, degree: 'Medical' }];
    }).sort((a, b) => b.minScoreRequired - a.minScoreRequired || a.universityName.localeCompare(b.universityName));
};

const getMedicalApplicationStatusBucket = (application = {}) => {
    const accountStatus = String(application.applicationStatus || '').trim().toLowerCase();
    const overviewStatus = String(application.overviewStatus || '').trim().toLowerCase();
    const selectionStatus = String(application.universitySelectionStatus || '').trim().toLowerCase();
    if (accountStatus === 'approved' && selectionStatus === 'completed') {
        return 'approved';
    }
    if (Number(application.completionPercentage) >= 100 || application.isCompleted === true ||
        ['completed', 'submitted', 'submitted for approval', 'under review'].includes(accountStatus) ||
        ['completed', 'submitted'].includes(overviewStatus)) return 'completed';
    if (Number(application.completionPercentage) > 0 || overviewStatus === 'in_progress' ||
        ['changes requested', 'rejected'].includes(accountStatus)) return 'inprogress';
    return 'incomplete';
};

// GET all medical applications for process admin
export const getAllMedicalApplications = async (req, res) => {
    try {
        // Medical records use the shared Enrollment collections.
        let mergedApplications = await fetchEnrollmentList('medical', 'all', req.query?.search);
        const requestedStatus = String(req.query?.status || 'all').trim().toLowerCase();
        if (['approved', 'completed', 'inprogress', 'incomplete'].includes(requestedStatus)) {
            mergedApplications = mergedApplications.filter((application) =>
                getMedicalApplicationStatusBucket(application) === requestedStatus
            );
        }

        const getActivityTime = (application) => Math.max(
            ...[application.submittedAt, application.updatedAt, application.createdAt]
                .map((value) => new Date(value || 0).getTime())
                .filter((value) => Number.isFinite(value))
        );
        mergedApplications.sort((a, b) => getActivityTime(b) - getActivityTime(a));

        res.status(200).json({ success: true, data: mergedApplications });
    } catch (error) {
        console.error("Error fetching medical applications:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// GET a single medical application by studentId
export const getMedicalApplicationDetails = async (req, res) => {
    try {
        const { studentId } = req.params;

        if (!studentId) {
            return res.status(400).json({ success: false, message: "Invalid student ID" });
        }

        req.params.userId = studentId;
        return await getMedicalApplicationDetail(req, res);
    } catch (error) {
        console.error("Error fetching medical application details:", error);
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// Return NEET-eligible medical universities for the counselor selection dialog.
export const getMedicalUniversityMatches = async (req, res) => {
    try {
        const { studentId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(studentId)) return res.status(400).json({ success: false, message: 'A valid student ID is required.' });
        const [program, tests, selection] = await Promise.all([
            ProgramSelection.findOne({ userId: studentId }).lean(),
            TestScores.findOne({ userId: studentId }).lean(),
            UniversitySelection.findOne({ userId: studentId }).lean(),
        ]);
        if (!program) return res.status(404).json({ success: false, message: 'Medical enrollment application was not found.' });
        if (String(program.programSelection?.programType || program.programType || '').toLowerCase().indexOf('med') === -1) {
            return res.status(400).json({ success: false, message: 'This is not a medical application.' });
        }
        const selectedCountries = getSelectedStudyCountries(program);
        const universities = selectedCountries.size
            ? getEligibleMedicalUniversities(tests).filter((university) => selectedCountries.has(normalizeCountry(university.country)))
            : [];
        return res.json({ success: true, data: { neetScore: getMedicalScore(tests), selectedCountries: [...selectedCountries], universities, selectedUniversities: selection?.selectedUniversities || [], universitySelectionStatus: selection?.status || 'selected', programApprovalStatus: program.programApprovalStatus || 'pending' } });
    } catch (error) {
        console.error('getMedicalUniversityMatches error:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to load eligible medical universities.' });
    }
};

export const saveMedicalUniversitySelection = async (req, res) => {
    try {
        const studentId = String(req.body?.studentId || '').trim();
        const requested = req.body?.selectedUniversities;
        if (!mongoose.Types.ObjectId.isValid(studentId)) return res.status(400).json({ success: false, message: 'A valid student ID is required.' });
        if (!Array.isArray(requested) || requested.length < 1 || requested.length > 5) return res.status(400).json({ success: false, message: 'Select between 1 and 5 eligible universities.' });
        const [program, tests, account] = await Promise.all([
            ProgramSelection.findOne({ userId: studentId }).lean(),
            TestScores.findOne({ userId: studentId }).lean(),
            Account.findById(studentId).select('applicationStatus').lean(),
        ]);
        if (!program || String(program.programSelection?.programType || program.programType || '').toLowerCase().indexOf('med') === -1) return res.status(404).json({ success: false, message: 'Medical enrollment application was not found.' });
        if (program.programApprovalStatus !== 'approved' && String(account?.applicationStatus || '').toLowerCase() !== 'approved') return res.status(409).json({ success: false, message: 'Approve the medical program before selecting universities.' });
        const selectedCountries = getSelectedStudyCountries(program);
        const eligible = selectedCountries.size
            ? getEligibleMedicalUniversities(tests).filter((university) => selectedCountries.has(normalizeCountry(university.country)))
            : [];
        const eligibleByKey = new Map(eligible.map((university) => [`${university.universityName.toLowerCase()}|${university.country.toLowerCase()}`, university]));
        const selected = [];
        const seen = new Set();
        for (const item of requested) {
            const key = `${String(item?.universityName || '').trim().toLowerCase()}|${String(item?.country || '').trim().toLowerCase()}`;
            const match = eligibleByKey.get(key);
            if (!match) return res.status(400).json({ success: false, message: 'Selected university is not eligible for the submitted NEET score.' });
            if (seen.has(key)) return res.status(400).json({ success: false, message: 'Each university can only be selected once.' });
            seen.add(key);
            selected.push(match);
        }
        const countries = [...new Set(selected.map((university) => university.country))];
        const selection = await UniversitySelection.findOneAndUpdate(
            { userId: studentId },
            { $set: { userId: studentId, programType: 'medical', selectedCountry: countries.length === 1 ? countries[0] : '', selectedUniversities: selected, status: 'selected' } },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        return res.json({ success: true, message: 'Medical university selection saved.', data: selection });
    } catch (error) {
        console.error('saveMedicalUniversitySelection error:', error);
        return res.status(500).json({ success: false, message: 'Failed to save medical university selection.' });
    }
};

export const approveMedicalUniversitySelection = async (req, res) => {
    try {
        const studentId = String(req.body?.studentId || '').trim();
        if (!mongoose.Types.ObjectId.isValid(studentId)) return res.status(400).json({ success: false, message: 'A valid student ID is required.' });
        const [program, selection, account] = await Promise.all([
            ProgramSelection.findOne({ userId: studentId }),
            UniversitySelection.findOne({ userId: studentId }),
            Account.findById(studentId),
        ]);
        if (!program || (program.programApprovalStatus !== 'approved' && String(account?.applicationStatus || '').toLowerCase() !== 'approved')) return res.status(409).json({ success: false, message: 'Approve the medical program before final approval.' });
        if (!selection || !selection.selectedUniversities?.length) return res.status(409).json({ success: false, message: 'Select and save at least one medical university before approval.' });
        if (program.programApprovalStatus !== 'approved') {
            program.programApprovalStatus = 'approved';
            await program.save();
        }
        selection.status = 'Completed';
        await selection.save();
        if (account) {
            account.applicationStatus = 'Approved';
            account.isLocked = true;
            await account.save();
        }
        await FirstYearReview.findOneAndUpdate({ userId: studentId }, { $set: { userId: studentId, status: 'Approved', submittedAt: account?.submittedAt || new Date(), programType: 'medical' } }, { upsert: true, new: true });
        return res.json({ success: true, message: 'Medical university selection approved.', applicationStatus: 'Approved' });
    } catch (error) {
        console.error('approveMedicalUniversitySelection error:', error);
        return res.status(500).json({ success: false, message: 'Failed to approve medical university selection.' });
    }
};
