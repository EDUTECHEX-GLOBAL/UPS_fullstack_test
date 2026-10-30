import mongoose from "mongoose";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Account from "../models/accountModel.js";
import AllDocument from "../models/AllDocumentModel.js";
import { buildFileUrl } from "../utils/s3FileKey.js";
import { fetchEnrollmentList } from '../Enrollment/controllers/enrollmentAdminController.js';
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

const DOCUMENT_FIELDS = [
    "photo",
    "signature",
    "idProof",
    "birthCertificate",
    "passport",
    "ninthMarksheet",
    "tenthMarksheet",
    "tenthCertificate",
    "eleventhMarksheet",
    "twelfthMarksheet",
    "twelfthCertificate",
    "migrationCertificate",
    "transferCertificate",
    "characterCertificate",
    "neetScorecard",
    "neetAdmitCard",
    "categoryCert",
    "ewsCertificate",
    "domicileCertificate",
    "disabilityCertificate",
    "medicalFitnessCertificate",
    "gapCertificate",
    "englishProficiencyCertificate",
    "ucatScorecard",
    "financialDocuments",
    "universitySupportingDocuments",
    "otherSupportingDocuments",
];

const toPlain = (doc) => {
    if (!doc) return {};
    return doc.toObject ? doc.toObject({ virtuals: true }) : (doc._doc ? doc._doc : doc);
};

// Each field on MedicalDocument is an object { fileName, fileKey, fileUrl, ... },
// or an array of such objects, or a string.
// Build a clean { fileName, fileUrl } pair for each one that's present.
const populateDocuments = (docs) => {
    if (!docs) return {};
    const raw = toPlain(docs);
    const output = {};

    const normalizeFile = (fileData, fieldName) => {
        if (!fileData) return null;
        
        let data = fileData;
        if (data && data.toObject) data = data.toObject({ virtuals: true });
        else if (data && data._doc) data = data._doc;

        let fileKey = "";
        let fileUrl = "";
        let fileName = "";

        if (typeof data === 'string') {
            fileUrl = data;
            fileName = fileUrl.split("/").pop();
        } else {
            fileKey = data.fileKey || data.s3Key || "";
            fileUrl = fileKey ? buildFileUrl(fileKey) : (data.fileUrl || "");
            fileName = data.fileName || data.originalName || data.name || fileKey.split("/").pop() || fileUrl.split("/").pop() || fieldName;
        }

        if (fileUrl) {
            return {
                fileName,
                fileUrl,
                fileKey: data.fileKey || data.s3Key || "",
                originalName: data.originalName || fileName,
                fileType: data.fileType || data.mimeType || ""
            };
        }
        return null;
    };

    DOCUMENT_FIELDS.forEach((field) => {
        const fileData = raw[field] || (field === "transferCertificate" ? raw.transferCert : null);
        if (!fileData) return;

        if (Array.isArray(fileData)) {
            const normalizedArray = fileData.map(fd => normalizeFile(fd, field)).filter(Boolean);
            if (normalizedArray.length > 0) {
                output[field] = normalizedArray;
            }
        } else {
            const normalized = normalizeFile(fileData, field);
            if (normalized) {
                output[field] = normalized;
            }
        }
    });

    return output;
};

const joinParts = (...values) => values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");

const normalizePersonalDetails = (personal) => {
    const raw = toPlain(personal);
    if (!Object.keys(raw).length) return {};

    const fullName = raw.fullName || [raw.firstName, raw.middleName, raw.lastName]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(" ");
    const permAddress = raw.permAddress || joinParts(
        raw.permanentAddressLine1,
        raw.permanentAddressLine2,
        raw.permanentCity,
        raw.permanentState,
        raw.permanentCountry,
        raw.permanentPostalCode
    );
    const corrAddress = raw.corrAddress || joinParts(
        raw.correspondenceAddressLine1,
        raw.correspondenceAddressLine2,
        raw.correspondenceCity,
        raw.correspondenceState,
        raw.correspondenceCountry,
        raw.correspondencePostalCode
    );
    const parentOccupation = raw.parentOccupation || raw.occupation || "";
    const parentIncome = raw.parentIncome || raw.income || "";

    return {
        ...raw,
        fullName,
        idNumber: raw.idNumber || raw.nationalIdNumber || raw.aadhaarNumber || raw.passportNumber || "",
        permAddress,
        corrAddress,
        parentOccupation,
        parentIncome,
        occupation: parentOccupation,
        income: parentIncome,
    };
};

// ---------------------------------------------------------------------------
// Builds the { studentId, applicationId, studentName, ..., documents } shape
// consumed by the process-admin frontend, merging the primary MedicalDocument
// record with legacy ApplicationDocument / AllDocument fallbacks so nothing
// uploaded earlier in the flow is lost.
// ---------------------------------------------------------------------------
const buildApplicationRecord = async (userId, overview) => {
    const [medicalAccount, accountModel, personal, academic, course, documents, masterDocs] = await Promise.all([
        Promise.resolve(null),
        Account.findById(userId).lean(),
        Promise.resolve(null),
        Promise.resolve(null),
        Promise.resolve(null),
        Promise.resolve(null),
        Promise.resolve(null),
    ]);

    const account = medicalAccount || accountModel;
    const email = account?.email || personal?.email;

    // Robustly fetch AllDocument by userId OR email (in case the generic upload wasn't properly linked to the userId)
    const allDocsQuery = [{ userId }];
    if (email) {
        allDocsQuery.push({ 'extractedData.email': email });
    }
    const allDocsModel = await AllDocument.findOne({ $or: allDocsQuery }).lean();

    const mergedDocs = documents ? (documents._doc ? { ...documents._doc } : { ...documents }) : {};
    const allDocs = allDocsModel?.uploadedDocuments || {};

    if (masterDocs || allDocsModel) {
        if (!mergedDocs.photo) mergedDocs.photo = masterDocs?.photo || allDocs?.photo;
        if (!mergedDocs.idProof) mergedDocs.idProof = masterDocs?.passport || allDocs?.passport;
        if (!mergedDocs.passport) mergedDocs.passport = masterDocs?.passport || allDocs?.passport;
        if (!mergedDocs.tenthMarksheet) mergedDocs.tenthMarksheet = masterDocs?.cert10th || allDocs?.grade10;
        if (!mergedDocs.twelfthMarksheet) mergedDocs.twelfthMarksheet = masterDocs?.cert12th || masterDocs?.cert11th || allDocs?.grade12;
        if (!mergedDocs.neetScorecard) mergedDocs.neetScorecard = masterDocs?.testScores || allDocs?.testScores?.neet;
        if (!mergedDocs.ninthMarksheet) mergedDocs.ninthMarksheet = masterDocs?.cert9th || allDocs?.grade9;
        if (!mergedDocs.eleventhMarksheet) mergedDocs.eleventhMarksheet = masterDocs?.cert11th || allDocs?.grade11;
    }

    // FIX: fall back through personal -> account -> a readable placeholder
    // instead of a bare "-", so a record with a resolvable name never gets
    // mistaken for one that should be filtered out downstream.
    const resolvedName = personal?.fullName
        || (account ? `${account.firstName || ''} ${account.lastName || ''}`.trim() : '')
        || '';
    const fullName = resolvedName || 'Unnamed Applicant';

    return {
        studentId: userId,
        userId: userId,
        applicationId: overview?.applicationId || '-',
        studentName: fullName,
        hasResolvedName: !!resolvedName,
        email: account?.email || personal?.email || '-',
        phone: account?.mobileNumber || personal?.phone || '-',
        overviewStatus: overview?.applicationStatus || 'draft',
        applicationStatus: overview?.applicationStatus || 'draft',
        completionPercentage: overview?.completionPercentage || 0,
        personal: normalizePersonalDetails(personal),
        academic: academic || {},
        course: course || {},
        documents: populateDocuments(mergedDocs),
        selectedPrograms: overview?.selectedPrograms || []
    };
};

// GET all medical applications for process admin
export const getAllMedicalApplications = async (req, res) => {
    try {
        const overviews = await Promise.resolve([]);

        const applications = await Promise.all(
            overviews.map((overview) => buildApplicationRecord(overview.userId, overview))
        );

        // FIX: previously this did
        //   applications.filter(app => app.studentName !== '-')
        // which silently dropped ANY application whose personal-details step
        // hadn't been filled in and whose Account/MedicalAccount lookup by
        // userId didn't resolve a first/last name — even if the applicant
        // had already submitted and uploaded every document. That meant
        // fully-submitted applications could vanish from this list with no
        // error anywhere. We now keep every application that has an
        // overview record (i.e. was actually created/submitted) and just
        // log the ones with an unresolved name so they're easy to spot
        // and fix at the data level instead of being hidden.
        applications
            .filter((app) => !app.hasResolvedName)
            .forEach((app) => {
                console.warn(`[MedicalUniversity] Application ${app.applicationId} (userId: ${app.userId}) has no resolvable student name — showing as "Unnamed Applicant".`);
            });

        const validApplications = applications.map(({ hasResolvedName, ...app }) => app);

        // Fetch enrollment medical applications and merge
        const enrollmentMedical = await fetchEnrollmentList('medical', 'all', req.query?.search);
        let mergedApplications = [...validApplications, ...enrollmentMedical];
        const requestedStatus = String(req.query?.status || 'all').trim().toLowerCase();
        if (['approved', 'completed', 'inprogress', 'incomplete'].includes(requestedStatus)) {
            mergedApplications = mergedApplications.filter((application) =>
                getMedicalApplicationStatusBucket(application) === requestedStatus
            );
        }

        mergedApplications.sort(
            (a, b) =>
                new Date(b.submittedAt || b.updatedAt || b.createdAt || 0) -
                new Date(a.submittedAt || a.updatedAt || a.createdAt || 0)
        );

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
        const { getMedicalApplicationDetail } = await import('../Enrollment/controllers/enrollmentAdminController.js');

        // Wrap response handler to capture 404 if enrollment detail is not found
        let foundEnrollment = true;
        const originalStatus = res.status;
        const originalJson = res.json;

        res.status = function (code) {
            if (code === 404) foundEnrollment = false;
            return originalStatus.apply(this, arguments);
        };

        res.json = function (data) {
            if (!foundEnrollment) {
                // Reset handlers and continue to legacy fallback below
                res.status = originalStatus;
                res.json = originalJson;
                return legacyFallback();
            }
            return originalJson.apply(this, arguments);
        };

        const legacyFallback = async () => {
            const objectId = toObjectId(studentId);
            const overview = await Promise.resolve(null).lean();
            const record = await buildApplicationRecord(objectId, overview);

            if (!overview && record.email === '-' && !record.hasResolvedName) {
                return res.status(404).json({ success: false, message: "Application not found" });
            }

            const { hasResolvedName, ...application } = record;
            application.studentId = studentId;
            application.userId = studentId;

            return res.status(200).json({ success: true, data: application });
        };

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
