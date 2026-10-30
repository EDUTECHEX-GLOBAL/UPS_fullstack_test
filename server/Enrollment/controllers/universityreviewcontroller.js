import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PersonalDetails from '../model/personalmodel.js';
import EducationDetails from '../model/educationmodel.js';
import ProgramSelection from '../model/programmodel.js';
import UniversitySelection from '../model/universityselectionmodel.js';
import Documents from '../model/documentmodel.js';
import AdditionalDocument from '../model/additionaldocumentmodel.js';
import TestScores from '../model/testmodel.js';
import Account from '../../models/accountModel.js';
import AllDocument from '../../models/AllDocumentModel.js';
import UserProfile from '../../models/userprofilemodel.js';
import Overview from '../../models/overviewModel.js';
import { getPresignedUrl } from '../../middleware/uploadMiddleware.js';
import { sendEmailEnhanced } from '../../utils/sendEmail.js';

const getEligibleBachelorUniversities = (test = {}) => {
  const exam = String(test.exam || '').toLowerCase();
  const score = Number.parseFloat(String(test.score || '').replace(/,/g, ''));
  const field = exam.includes('toefl') ? 'TOEFL iBT Min'
    : exam.includes('ielts') ? 'IELTS Min (Overall)'
      : exam.includes('pte') ? 'PTE Academic Min'
        : exam.includes('duolingo') ? 'Duolingo Min' : null;
  if (!field || !Number.isFinite(score)) return [];

  const rowsPath = path.resolve(__dirname, '../../bacheloruniversity.json');
  let rows = [];
  try { rows = JSON.parse(fs.readFileSync(rowsPath, 'utf8')); } catch (error) {
    console.error('Unable to load bachelor university score requirements:', error);
    return [];
  }
  const eligible = new Map();
  rows.forEach((row) => {
    const minimum = Number(row[field]);
    const university = String(row.University || '').trim();
    const country = String(row['Country / Location'] || '').trim();
    if (!String(row['Degree Levels Offered'] || '').toLowerCase().includes('bachelor') ||
        !university || !Number.isFinite(minimum) || score !== minimum) return;
    const key = `${university.toLowerCase()}|${country.toLowerCase()}|${minimum}`;
    if (!eligible.has(key)) eligible.set(key, { university, country, minScoreRequired: minimum });
  });
  return Array.from(eligible.values());
};

const getEligibleTestUniversities = (test = {}) => {
  const saved = Array.isArray(test.selectedUniversities) && test.selectedUniversities.length
    ? test.selectedUniversities
    : (Array.isArray(test.eligibleUniversities) ? test.eligibleUniversities : []);
  const calculated = getEligibleBachelorUniversities(test);
  if (!saved.length) return [];
  const keys = new Set(calculated.map((u) => `${u.university.toLowerCase()}|${u.country.toLowerCase()}|${u.minScoreRequired}`));
  return saved.filter((u) => {
    if (typeof u === 'string') return false;
    const name = String(u.university || u.universityName || u.name || '').trim();
    const country = String(u.country || '').trim();
    const minimum = Number(u.minScoreRequired);
    return Number.isFinite(minimum) && keys.has(`${name.toLowerCase()}|${country.toLowerCase()}|${minimum}`);
  });
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getUserId = (req) => req.user?.id || req.user?.userId;

export const extractS3Key = (urlOrObj) => {
  if (!urlOrObj) return null;
  let str = '';
  if (typeof urlOrObj === 'string') {
    str = urlOrObj;
  } else if (typeof urlOrObj === 'object') {
    str = urlOrObj.s3Key || urlOrObj.fileKey || urlOrObj.key || urlOrObj.filePath || urlOrObj.fileUrl || urlOrObj.location || '';
  }

  if (!str || typeof str !== 'string') return null;

  // Remove query parameters (?X-Amz-...)
  str = str.split('?')[0];

  // Extract path from S3 URL or standard HTTP URL
  if (str.includes('.amazonaws.com/')) {
    str = str.split('.amazonaws.com/')[1];
  } else if (str.startsWith('http://') || str.startsWith('https://')) {
    const urlParts = str.split('/');
    if (urlParts.length >= 4) {
      str = urlParts.slice(3).join('/');
    }
  }

  // Remove leading slashes
  str = str.replace(/^\/+/, '');

  // Ignore local upload paths that start with uploads/ or test-scores/
  if (str.startsWith('uploads/') || str.startsWith('test-scores/')) {
    return null;
  }

  return str || null;
};

const resolveUrl = async (fileObj) => {
  if (!fileObj) return null;

  // 1. Try to extract S3 Key from object or string and get a fresh presigned URL
  const s3Key = extractS3Key(fileObj);
  if (s3Key) {
    try {
      const presigned = await getPresignedUrl(s3Key, 86400); // 24 hours validity
      if (presigned) return presigned;
    } catch (err) {
      console.error('Presigned URL generation error for key:', s3Key, err);
    }
  }

  // 2. Fallback if local upload path or static string
  if (typeof fileObj === 'string') {
    if (fileObj.startsWith('/uploads/') || fileObj.startsWith('http')) return fileObj;
    return `/uploads/test-scores/${fileObj}`;
  }

  if (fileObj.fileUrl && (fileObj.fileUrl.startsWith('/uploads/') || fileObj.fileUrl.startsWith('http'))) {
    return fileObj.fileUrl;
  }

  if (fileObj.fileName) {
    return `/uploads/test-scores/${fileObj.fileName}`;
  }

  return fileObj.fileUrl || fileObj.s3Key || null;
};

// Helper: Format Document Title cleanly (e.g. Doc-passport -> Passport)
export const formatDocumentTitle = (key) => {
  if (!key) return '';
  const map = {
    'passport': 'Passport',
    'photo': 'Photograph',
    'cv': 'CV / Resume',
    'transcript': 'Academic Transcript',
    'diploma': 'Diploma / Degree Certificate',
    'cert9th': '9th Grade Certificate',
    'cert10th': '10th Grade Certificate',
    'cert11th': '11th Grade Certificate',
    'cert12th': '12th Grade Certificate',
    'doc-passport': 'Passport',
    'doc-photo': 'Photograph',
    'doc-cv': 'CV / Resume',
    'doc-9th': '9th Grade Certificate',
    'doc-10th': '10th Grade Certificate',
    'doc-11th': '11th Grade Certificate',
    'doc-12th': '12th Grade Certificate',
    'doc-transcript': 'Academic Transcript'
  };
  if (map[key]) return map[key];
  const cleanKey = String(key).replace(/^doc-/i, '');
  return cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1).replace(/([A-Z])/g, ' $1');
};

// Helper: Get canonical key for document deduplication
export const getCanonicalDocKey = (key = '', name = '') => {
  const str = `${key} ${name}`.toLowerCase();
  if (/\b(cv|resume|curriculum vitae)\b/i.test(str) || /^doc-cv$/i.test(key)) return 'cv';
  if (/\bpassport\b/i.test(str) || /^doc-passport$/i.test(key)) return 'passport';
  if (/\b(photo|photograph)\b/i.test(str) || /^doc-photo$/i.test(key)) return 'photo';
  if (/\b(transcript)\b/i.test(str) || /^doc-transcript$/i.test(key)) return 'transcript';
  if (/\b(diploma|degree certificate)\b/i.test(str)) return 'diploma';
  if (/\b(9th|grade 9|cert9th)\b/i.test(str) || /^doc-9th$/i.test(key)) return 'cert9th';
  if (/\b(10th|grade 10|cert10th|ssc|matriculation)\b/i.test(str) || /^doc-10th$/i.test(key)) return 'cert10th';
  if (/\b(11th|grade 11|cert11th)\b/i.test(str) || /^doc-11th$/i.test(key)) return 'cert11th';
  if (/\b(12th|grade 12|cert12th|hsc|senior secondary)\b/i.test(str) || /^doc-12th$/i.test(key)) return 'cert12th';
  return (key || name).toLowerCase().trim();
};

// Helper: Compile complete application review summary with ALL data from personal, education, test scores, common & additional docs, and university selections
export const compileReviewSummary = async (userId) => {
  let userObjId = userId;
  if (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) {
    userObjId = new mongoose.Types.ObjectId(userId);
  }
  const userQuery = { $or: [{ userId }, { userId: userObjId }, { userId: String(userId) }] };

  const [
    personal,
    education,
    program,
    uniSelection,
    commonDocs,
    additionalDocs,
    testScores,
    account,
    legacyDocs,
    profile
  ] = await Promise.all([
    PersonalDetails.findOne(userQuery).lean(),
    EducationDetails.findOne(userQuery).lean(),
    ProgramSelection.findOne(userQuery).lean(),
    UniversitySelection.findOne(userQuery).lean(),
    Documents.findOne(userQuery).lean(),
    AdditionalDocument.find(userQuery).lean(),
    TestScores.findOne(userQuery).lean(),
    mongoose.Types.ObjectId.isValid(userId)
      ? Account.findById(userId).select('firstName lastName email phone gender citizenship passportNumber passportIssueDate passportExpiryDate issuingCountry passportDetails passportExtractedData personalInfo extractedData birthDate dateOfBirth').lean().catch(() => null)
      : null,
    AllDocument.findOne(userQuery).sort({ createdAt: -1 }).lean(),
    UserProfile.findOne({ userId: userObjId }).select('basicInfo').lean().catch(() => null)
  ]);

  const progObj = program?.programSelection || program || {};
  const rawType = String(progObj.programType || program?.programType || 'Bachelor');
  const studyType = /master|^pg$/i.test(rawType) ? 'Master' : /med|mbbs/i.test(rawType) ? 'Medical' : 'Bachelor';

  // 1. Comprehensive Applicant & Personal Information
  const profileBasic = profile?.basicInfo || {};
  const passportData = account?.passportDetails || account?.passportExtractedData || account?.personalInfo || account?.extractedData || {};
  const extractedData = legacyDocs?.extractedData || {};
  const safeDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().split('T')[0];
  };
  const joinAddress = (...parts) => parts.map((part) => String(part || '').trim()).filter(Boolean).join(', ');
  const temporaryAddress = joinAddress(personal?.tempAddress1, personal?.tempAddress2, personal?.tempCity, personal?.tempState, personal?.tempZip, personal?.tempCountry);
  const permanentAddress = personal?.sameAsTemporaryAddress
    ? temporaryAddress
    : joinAddress(personal?.permAddress1, personal?.permAddress2, personal?.permCity, personal?.permState, personal?.permZip, personal?.permCountry) || temporaryAddress;
  const fallbackAddress = joinAddress(personal?.address1, personal?.address2, passportData.addressLine1, passportData.addressLine2, passportData.address, extractedData.addressLine1, extractedData.addressLine2, extractedData.address);
  const fatherName = personal?.parent1FullName || [personal?.fatherFirstName, personal?.fatherLastName].filter(Boolean).join(' ') || personal?.fatherName || passportData.fatherName || passportData.fatherFullName || extractedData.fatherName || extractedData.fatherFullName || extractedData.parentName || extractedData.guardianName || '';
  const motherName = personal?.parent2FullName || [personal?.motherFirstName, personal?.motherLastName].filter(Boolean).join(' ') || personal?.motherName || passportData.motherName || passportData.motherFullName || extractedData.motherName || extractedData.motherFullName || '';
  const applicantInfo = {
    title: personal?.title || '',
    firstName: personal?.firstName || account?.firstName || '',
    lastName: personal?.lastName || account?.lastName || '',
    name: [personal?.title, personal?.firstName || account?.firstName, personal?.lastName || account?.lastName].filter(Boolean).join(' ') || 'Applicant',
    email: personal?.email || account?.email || '',
    phone: personal?.mobile || personal?.phone || account?.phone || profileBasic.mobile || profileBasic.phone || '',
    gender: personal?.gender || account?.gender || profileBasic.gender || passportData.gender || passportData.sex || extractedData.gender || extractedData.sex || '',
    dateOfBirth: safeDate(personal?.dateOfBirth || profileBasic.dob || profileBasic.dateOfBirth || account?.birthDate || account?.dateOfBirth || passportData.dateOfBirth || passportData.birthDate || passportData.dob || extractedData.dateOfBirth),
    placeOfBirth: personal?.placeOfBirth || passportData.placeOfBirth || passportData.birthPlace || extractedData.placeOfBirth || extractedData.birthPlace || '',
    countryOfBirth: personal?.countryOfBirth || passportData.countryOfBirth || extractedData.countryOfBirth || '',
    citizenship: personal?.citizenship || account?.citizenship || profileBasic.nationality || passportData.nationality || extractedData.nationality || personal?.countryOfBirth || '',
    countryOfResidence: profileBasic.residence || '',
    
    // Address Details
    address1: personal?.address1 || personal?.permAddress1 || personal?.tempAddress1 || '',
    address2: personal?.address2 || personal?.permAddress2 || personal?.tempAddress2 || '',
    address: permanentAddress || fallbackAddress,
    permanentAddress: permanentAddress || fallbackAddress,
    correspondenceAddress: personal?.sameAsTemporaryAddress ? '' : temporaryAddress,
    city: personal?.sameAsTemporaryAddress ? (personal?.tempCity || '') : (personal?.permCity || personal?.tempCity || ''),
    state: personal?.sameAsTemporaryAddress ? (personal?.tempState || '') : (personal?.permState || personal?.tempState || ''),
    postalCode: personal?.sameAsTemporaryAddress ? (personal?.tempZip || '') : (personal?.permZip || personal?.tempZip || ''),
    country: personal?.sameAsTemporaryAddress ? (personal?.tempCountry || '') : (personal?.permCountry || personal?.tempCountry || personal?.countryOfBirth || ''),
    maritalStatus: personal?.maritalStatus || 'Single',
    citizenshipStatus: personal?.citizenshipStatus || personal?.citizenship || account?.citizenship || 'Citizen',

    // Passport Details
    passportNumber: personal?.passportNumber || account?.passportNumber || passportData.passportNumber || extractedData.passportNumber || '',
    passportIssueDate: personal?.passportIssueDate || account?.passportIssueDate || passportData.passportIssueDate || extractedData.passportIssueDate || '',
    passportExpiryDate: personal?.passportExpiryDate || account?.passportExpiryDate || passportData.passportExpiryDate || extractedData.passportExpiryDate || '',
    issuingCountry: personal?.issuingCountry || account?.issuingCountry || passportData.issuingCountry || extractedData.issuingCountry || '',

    // Parent / Emergency Contacts
    parent1: {
      relationship: personal?.parent1Relationship || (fatherName ? 'Father / Guardian' : ''),
      name: fatherName,
      email: personal?.parent1Email || personal?.fatherEmail || passportData.fatherEmail || extractedData.fatherEmail || extractedData.parentEmail || '',
      phone: personal?.parent1Phone || personal?.fatherPhone || passportData.fatherPhone || extractedData.fatherPhone || extractedData.parentPhone || ''
    },
    parent2: {
      relationship: personal?.parent2Relationship || (motherName ? 'Mother' : ''),
      name: motherName,
      email: personal?.parent2Email || personal?.motherEmail || passportData.motherEmail || extractedData.motherEmail || '',
      phone: personal?.parent2Phone || personal?.motherPhone || passportData.motherPhone || extractedData.motherPhone || ''
    }
  };

  // 2. Comprehensive Education Details
  const eduList = (Array.isArray(education?.educationDetails) ? education.educationDetails : []).map(item => ({
    qualification: item.qualification || '',
    schoolName: item.schoolName || '',
    boardUniversity: item.boardUniversity || '',
    yearOfPassing: item.yearOfPassing || '',
    score: item.score || '',
    country: item.country || '',
    programApplyingFor: item.programApplyingFor || '',
    intendedMajor: item.intendedMajor || ''
  }));
  const structuredEducation = [];
  const addEducation = (details, { qualification, schoolName, boardUniversity, yearOfPassing, score, country }) => {
    if (!details || ![schoolName, boardUniversity, yearOfPassing, score, country].some((key) => String(details[key] || '').trim())) return;
    structuredEducation.push({
      qualification,
      schoolName: details[schoolName] || '',
      boardUniversity: details[boardUniversity] || '',
      yearOfPassing: details[yearOfPassing] || '',
      score: details[score] || '',
      country: details[country] || ''
    });
  };
  if (studyType === 'Master') {
    addEducation(education?.masterDetails, { qualification: education?.masterDetails?.degreeType || education?.masterDetails?.highestEducation || "Bachelor's Degree", schoolName: 'university', boardUniversity: 'courseMajor', yearOfPassing: 'graduationYear', score: 'gpa', country: 'country' });
  } else if (studyType === 'Medical') {
    addEducation(education?.medicalDetails, { qualification: education?.medicalDetails?.highestEducation || education?.medicalDetails?.course || 'Medical Education', schoolName: 'institution', boardUniversity: 'course', yearOfPassing: 'completionYear', score: 'percentageGpa', country: 'country' });
  } else {
    addEducation(education?.bachelorDetails, { qualification: education?.bachelorDetails?.highestEducation || 'High School', schoolName: 'schoolName', boardUniversity: 'board', yearOfPassing: 'completionYear', score: 'percentage', country: 'country' });
    addEducation(education?.transferDetails, { qualification: education?.transferDetails?.currentProgram || 'Transfer Education', schoolName: 'currentCollege', boardUniversity: 'major', yearOfPassing: 'endDate', score: 'gpa', country: 'country' });
  }
  const finalEducation = eduList.length ? eduList : structuredEducation;

  // 3. Comprehensive Selected Universities & Programs
  const defaultProgramName = (
    finalEducation.find(e => e.programApplyingFor || e.intendedMajor)?.programApplyingFor ||
    finalEducation.find(e => e.intendedMajor)?.intendedMajor ||
    progObj.programName ||
    progObj.selectedProgram ||
    progObj.intendedMajor ||
    progObj.degree ||
    (studyType ? `${studyType} Degree Program` : 'Bachelor Degree Program')
  );

  const approvedUniversities = uniSelection?.selectedUniversities || [];
  const selectedChoices = uniSelection?.studentSelectedPrograms || [];
  const normalizeUniversityKey = (value) => String(value || '').trim().toLowerCase();
  const approvedUniversityById = new Map();
  const approvedUniversityByName = new Map();
  for (const university of approvedUniversities) {
    const universityId = university.universityId || university._id || '';
    const universityName = university.universityName || university.university || university.name || '';
    if (universityId) approvedUniversityById.set(normalizeUniversityKey(universityId), university);
    if (universityName) approvedUniversityByName.set(normalizeUniversityKey(universityName), university);
  }

  // These are the student's final 2–5 course choices. The selectedUniversities
  // records contain the larger eligible program lists, which must not be shown
  // as if the student selected every one of them.
  const selectedUniGroups = new Map();
  for (const choice of selectedChoices) {
    const choiceName = choice.universityName || choice.university || choice.name || '';
    const approved = approvedUniversityById.get(normalizeUniversityKey(choice.universityId)) ||
      approvedUniversityByName.get(normalizeUniversityKey(choiceName));
    const universityName = choiceName || approved?.universityName || approved?.university || approved?.name || '';
    const country = choice.country || approved?.country || '';
    const universityId = choice.universityId || approved?.universityId || approved?._id || universityName;
    const programName = String(choice.programName || '').trim();
    if (!universityName || !programName) continue;

    const groupKey = `${normalizeUniversityKey(universityId)}|${normalizeUniversityKey(universityName)}|${normalizeUniversityKey(country)}`;
    const group = selectedUniGroups.get(groupKey) || {
      universityId,
      universityName,
      country,
      programName,
      selectedPrograms: []
    };
    if (!group.selectedPrograms.includes(programName)) group.selectedPrograms.push(programName);
    group.programName = group.selectedPrograms.join(', ');
    selectedUniGroups.set(groupKey, group);
  }

  let selectedUnis = selectedUniGroups.size
    ? Array.from(selectedUniGroups.values())
    : approvedUniversities.map(u => {
    const universityId = u.universityId || u._id || u.universityName || u.university;
    const universityName = u.universityName || u.university || u.name || '';
    const pName = (u.programName && u.programName !== 'Degree Program') 
      ? u.programName 
      : ((u.degree && u.degree !== 'Degree Program') ? u.degree : defaultProgramName);

    const progs = Array.isArray(u.selectedPrograms) && u.selectedPrograms.length > 0
      ? u.selectedPrograms.map(p => p === 'Degree Program' ? defaultProgramName : p)
      : (u.programName && u.programName !== 'Degree Program' ? u.programName.split(', ').map(p => p.trim()).filter(Boolean) : [pName]);

    return {
      universityId,
      universityName,
      country: u.country || '',
      programName: pName,
      selectedPrograms: progs
    };
  }).filter(u => u.universityName);

  if (selectedUnis.length === 0 && selectedChoices.length === 0 && testScores && Array.isArray(testScores.tests)) {
    testScores.tests.forEach(test => {
      const rawSelected = getEligibleTestUniversities(test);

      rawSelected.forEach(u => {
        const uName = typeof u === 'string' ? u : (u.university || u.universityName || u.name || '');
        const uCountry = typeof u === 'object' ? (u.country || '') : '';
        const uId = (typeof u === 'object' && (u.id || u.universityId || u._id)) ? String(u.id || u.universityId || u._id) : uName;
        const uProg = (typeof u === 'object' && u.programName && u.programName !== 'Degree Program') ? u.programName : defaultProgramName;

        if (uName && !selectedUnis.some(e => e.universityName === uName)) {
          selectedUnis.push({
            universityId: uId,
            universityName: uName,
            country: uCountry,
            programName: uProg,
            selectedPrograms: [uProg]
          });
        }
      });
    });
  }

  // 4. Common Documents
  const docsRecord = { ...(commonDocs?.documents || {}) };
  const legacyUploaded = { ...(legacyDocs?.uploadedDocuments || {}) };

  const getDocFileName = (doc) => String(doc?.fileName || doc?.originalName || doc?.fileUrl || doc?.s3Key || doc?.fileKey || doc?.file?.fileName || doc?.file?.originalName || doc?.file || '').toLowerCase();
  const isAcademicFileName = (name) => /(?:bachelor|undergraduate|\bug\b).*(?:transcript|marksheet)|(?:transcript|marksheet)|(?:bachelor|undergraduate|\bug\b).*(?:certificate|degree)|(?:certificate|degree)|transfer.*(?:certificate|cert)/i.test(name);
  const isCvFileName = (name) => /(?:cv|resume|curriculum)/i.test(name);

  // Clean misfiled legacy documents (e.g. transcript/degree uploaded into CV slot)
  for (const cvKey of ['cv', 'doc-cv', 'resume']) {
    if (docsRecord[cvKey]) {
      const fileName = getDocFileName(docsRecord[cvKey]);
      if (fileName && isAcademicFileName(fileName) && !isCvFileName(fileName)) {
        const misfiledDoc = docsRecord[cvKey];
        delete docsRecord[cvKey];
        if (!legacyUploaded.bachelorTranscript && /(?:transcript|marksheet)/i.test(fileName)) {
          legacyUploaded.bachelorTranscript = misfiledDoc;
        } else if (!legacyUploaded.bachelorDegree && /(?:certificate|degree)/i.test(fileName)) {
          legacyUploaded.bachelorDegree = misfiledDoc;
        }
      }
    }
    if (legacyUploaded[cvKey]) {
      const fileName = getDocFileName(legacyUploaded[cvKey]);
      if (fileName && isAcademicFileName(fileName) && !isCvFileName(fileName)) {
        const misfiledDoc = legacyUploaded[cvKey];
        delete legacyUploaded[cvKey];
        if (!legacyUploaded.bachelorTranscript && /(?:transcript|marksheet)/i.test(fileName)) {
          legacyUploaded.bachelorTranscript = misfiledDoc;
        } else if (!legacyUploaded.bachelorDegree && /(?:certificate|degree)/i.test(fileName)) {
          legacyUploaded.bachelorDegree = misfiledDoc;
        }
      }
    }
  }

  const legacyCommonAliases = { passport: ['passport', 'doc-passport'], photo: ['photo', 'doc-photo'], cv: ['cv', 'doc-cv', 'resume'] };
  for (const [key, aliases] of Object.entries(legacyCommonAliases)) {
    if (docsRecord[key]?.fileName || docsRecord[key]?.fileUrl) continue;
    const legacy = aliases.map((alias) => legacyUploaded[alias]).find((item) => item && (item.fileName || item.originalName || item.s3Key || item.fileUrl));
    if (legacy) docsRecord[key] = { ...legacy, status: 'Uploaded' };
  }

  // Deduplicate docsRecord by canonical key before formatting
  const deduplicatedCommonMap = new Map();
  for (const docKey of Object.keys(docsRecord)) {
    const doc = docsRecord[docKey];
    const canonicalKey = getCanonicalDocKey(docKey, formatDocumentTitle(docKey));
    const isUploaded = doc?.status === 'Uploaded' || Boolean(doc?.fileName || doc?.originalName || doc?.fileUrl);

    if (!deduplicatedCommonMap.has(canonicalKey)) {
      deduplicatedCommonMap.set(canonicalKey, { key: docKey, doc });
    } else {
      const existing = deduplicatedCommonMap.get(canonicalKey);
      const existingUploaded = existing.doc?.status === 'Uploaded' || Boolean(existing.doc?.fileName || existing.doc?.originalName || existing.doc?.fileUrl);
      if (!existingUploaded && isUploaded) {
        deduplicatedCommonMap.set(canonicalKey, { key: docKey, doc });
      }
    }
  }

  const defaultCommonKeys = ['passport', 'photo', 'cv'];
  for (const defaultKey of defaultCommonKeys) {
    const canonical = getCanonicalDocKey(defaultKey, formatDocumentTitle(defaultKey));
    if (!deduplicatedCommonMap.has(canonical)) {
      const docObj = docsRecord[defaultKey] || { status: 'Not Uploaded', fileName: '', fileUrl: '' };
      deduplicatedCommonMap.set(canonical, { key: defaultKey, doc: docObj });
    }
  }

  const commonDocsFormatted = await Promise.all(Array.from(deduplicatedCommonMap.values()).map(async ({ key: docKey, doc }) => {
    return {
      key: docKey,
      title: formatDocumentTitle(docKey),
      status: doc?.status || 'Not Uploaded',
      fileName: doc?.fileName || doc?.originalName || '',
      fileUrl: await resolveUrl(doc)
    };
  }));

  const commonCanonicalKeys = new Set(Array.from(deduplicatedCommonMap.keys()));

  // 5. Additional Documents (Study-Type Specific)
  const matchingAdditionalDocs = (additionalDocs || []).filter((doc) => {
    const docType = String(doc.studyType || '').toLowerCase();
    return !docType || (studyType === 'Master' ? docType.includes('master') || docType === 'pg'
      : studyType === 'Medical' ? docType.includes('med') || docType === 'mbbs'
        : !docType.includes('master') && !docType.includes('med') && docType !== 'pg' && docType !== 'mbbs');
  });
  const addDocsByType = new Map(matchingAdditionalDocs.map((doc) => [doc.documentType, doc]));
  const legacyAcademicTypes = {
    collegeTranscript: 'College / Transfer Transcript', undergraduateTranscript: "Bachelor's Transcript",
    bachelorTranscript: "Bachelor's Transcript", bachelorDegree: "Bachelor's Degree Certificate",
    transferCertificate: 'Transfer Certificate', transferCert: 'Transfer Certificate',
    schoolLeavingCertificate: 'School Leaving Certificate', schoolLeavingCert: 'School Leaving Certificate',
    consolidatedMarksheet: "Consolidated Bachelor's Mark Sheet", semesterMarksheets: 'Semester-wise Mark Sheets',
    provisionalCert: 'Provisional Degree Certificate', medicalAcademicDocument: 'Medical Academic Document'
  };
  for (const [key, file] of Object.entries(legacyUploaded)) {
    if (!file || !(file.fileName || file.originalName || file.s3Key || file.fileUrl)) continue;
    const name = String(file.originalName || file.fileName || '').toLowerCase();
    let type = key;
    if (/(?:bachelor|undergraduate|\bug\b).*(?:transcript|marksheet)|(?:transcript|marksheet).*(?:bachelor|undergraduate|\bug\b)/i.test(name)) type = 'bachelorTranscript';
    else if (/(?:bachelor|undergraduate|\bug\b).*(?:certificate|degree)|(?:certificate|degree).*(?:bachelor|undergraduate|\bug\b)/i.test(name)) type = 'bachelorDegree';
    else if (/transfer.*(?:certificate|cert)|(?:certificate|cert).*transfer/i.test(name)) type = 'transferCert';
    if (!legacyAcademicTypes[type] || addDocsByType.has(type)) continue;
    addDocsByType.set(type, { documentType: type, documentName: legacyAcademicTypes[type], required: false, status: 'Uploaded', file });
  }

  // Education-step uploads are saved on EducationDetails, separate from the
  // optional AdditionalDocument collection. Include them in the partner packet.
  const educationFileEntries = studyType === 'Master'
    ? [
        ['bachelorTranscript', education?.masterDetails?.transcriptDoc, "Bachelor's Degree Transcript"],
        ['bachelorDegree', education?.masterDetails?.degreeDoc, "Bachelor's Degree Certificate"]
      ]
    : studyType === 'Medical'
      ? [['medicalAcademicDocument', education?.medicalDetails?.academicDoc, 'Medical Academic Document']]
      : [
          ['cert12th', education?.bachelorDetails?.certificateDoc, 'Education Certificate'],
          ['collegeTranscript', education?.transferDetails?.transcriptDoc, 'College / Transfer Transcript']
        ];
  for (const [type, file, documentName] of educationFileEntries) {
    if (!file || !(file.fileName || file.originalName || file.fileKey || file.s3Key || file.fileUrl)) continue;
    const existing = addDocsByType.get(type);
    if (!existing?.file || existing.status !== 'Uploaded') {
      addDocsByType.set(type, {
        ...(existing || {}), documentType: type, documentName, required: false,
        status: 'Uploaded', file
      });
    }
  }

  const addDocsFormatted = [];
  for (const doc of Array.from(addDocsByType.values())) {
    const canonicalKey = getCanonicalDocKey(doc.documentType, doc.documentName);
    const isUploaded = doc.status === 'Uploaded' || Boolean(doc.file);
    const resolvedUrl = doc.file ? await resolveUrl(doc.file) : '';
    const fileName = doc.file ? (doc.file.originalName || doc.file.fileName || '') : '';

    if (commonCanonicalKeys.has(canonicalKey) && ['passport', 'photo', 'cv'].includes(canonicalKey)) {
      const commonItem = commonDocsFormatted.find(c => getCanonicalDocKey(c.key, c.title) === canonicalKey);
      const commonFileName = String(commonItem?.fileName || '').toLowerCase();
      if (commonItem?.status === 'Uploaded' && commonFileName && commonFileName === fileName.toLowerCase()) continue;
      if (commonItem && commonItem.status !== 'Uploaded' && isUploaded) {
        commonItem.status = 'Uploaded';
        commonItem.fileName = fileName || commonItem.fileName;
        commonItem.fileUrl = resolvedUrl || commonItem.fileUrl;
      }
      if (commonItem && commonItem.status === 'Uploaded') continue;
    }

    addDocsFormatted.push({
      id: doc._id,
      studyType: doc.studyType,
      documentType: doc.documentType,
      documentName: doc.documentName,
      required: doc.required,
      conditional: doc.conditional,
      conditionText: doc.conditionText || '',
      status: doc.status || 'Not Uploaded',
      file: doc.file ? {
        fileName,
        size: doc.file.size || 0,
        fileUrl: resolvedUrl
      } : null
    });
  }

  // 6. Comprehensive Test Scores (includes all sub-scores, report file & selected qualifying universities)
  const formattedTests = await Promise.all((testScores?.tests || []).map(async t => {
    const rawSelected = getEligibleTestUniversities(t);

    const selectedUnisList = rawSelected.map(u => ({
      university: typeof u === 'string' ? u : (u.university || u.name || ''),
      country: u.country || '',
      minScoreRequired: u.minScoreRequired || 0
    })).filter(u => u.university);

    // Report File
    const repFile = t.reportFile || t.file || t.scoreReport || null;
    const repFileName = repFile?.fileName || repFile?.originalName || repFile?.name || t.reportFileRawName || (typeof repFile === 'string' ? repFile : '') || (typeof t.reportFile === 'string' ? t.reportFile : '');
    const repFileUrl = await resolveUrl(repFile || t.fileUrl || repFileName);

    return {
      id: t.id || t._id,
      exam: t.exam || '',
      score: t.score || '',
      testDate: t.testDate || '',

      // Sub-scores
      readingScore: t.readingScore || '',
      listeningScore: t.listeningScore || '',
      speakingScore: t.speakingScore || '',
      writingScore: t.writingScore || '',
      verbalScore: t.verbalScore || '',
      quantitativeScore: t.quantitativeScore || '',
      analyticalWritingScore: t.analyticalWritingScore || '',
      dataInsightsScore: t.dataInsightsScore || '',
      chemicalPhysicalScore: t.chemicalPhysicalScore || '',
      carsScore: t.carsScore || '',
      biologicalBiochemicalScore: t.biologicalBiochemicalScore || '',
      psychologicalSocialScore: t.psychologicalSocialScore || '',
      paperSubject: t.paperSubject || '',
      gateRank: t.gateRank || '',
      percentile: t.percentile || '',
      varcPercentile: t.varcPercentile || '',
      dilrPercentile: t.dilrPercentile || '',
      qaPercentile: t.qaPercentile || '',
      allIndiaRank: t.allIndiaRank || '',
      sjtBand: t.sjtBand || '',

      // Verification & Qualifying Universities
      verificationStatus: t.verification?.status || 'Pending',
      selectedUniversities: selectedUnisList,
      selectedUniversitiesCount: selectedUnisList.length,

      // Report File
      reportFileName: repFileName,
      reportFileSize: repFile?.size || 0,
      reportFileUrl: repFileUrl
    };
  }));

  return {
    studyType,
    applicantInfo,
    educationSummary: finalEducation,
    programSelection: {
      programType: studyType,
      selectedCountries: progObj.selectedCountries || (progObj.countryName ? [progObj.countryName] : []),
      approvalStatus: program?.programApprovalStatus || 'pending'
    },
    universitySelection: {
      selectedCountry: uniSelection?.selectedCountry || '',
      selectedUniversities: selectedUnis,
      totalSelected: selectedUnis.length
    },
    documents: {
      common: commonDocsFormatted,
      additional: addDocsFormatted
    },
    testScores: {
      hasNotTaken: testScores?.hasNotTaken || false,
      tests: formattedTests
    },
    isSubmitted: program?.status === 'Completed' || uniSelection?.status === 'Completed',
    submittedAt: program?.submittedAt || uniSelection?.updatedAt || new Date()
  };
};

// Helper: Generate PDF Buffer matching PDF #1 target design exactly (Clean EduTechEx Theme, Cyan Labels, Underline Accents, Zero Overlap)
export const generateApplicationPDFBuffer = (reviewData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true
      });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const {
        studyType = 'Bachelor',
        applicantInfo = {},
        educationSummary = [],
        universitySelection = {},
        testScores = {},
        documents = {},
        isSubmitted = false,
        submittedAt
      } = reviewData;

      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 40;
      const contentWidth = pageWidth - margin * 2; // 515.28

      let currentY = 78; // Content starts below top header divider at y=65
      const maxY = 755;

      const checkPageBreak = (neededHeight) => {
        if (currentY + neededHeight > maxY) {
          doc.addPage();
          currentY = 78;
        }
      };

      // Section Header with Navy text + Teal/Cyan Underline Accent Bar (Matching PDF #1)
      const drawSectionHeader = (titleText, minRemainingHeight = 65) => {
        checkPageBreak(32 + minRemainingHeight);
        
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#0F2942') // Dark Navy
           .text(titleText, margin, currentY);
        
        const titleWidth = Math.min(doc.widthOfString(titleText) + 8, 220);
        doc.rect(margin, currentY + 16, titleWidth, 2.5).fill('#0891B2'); // Cyan Underline Bar
        
        currentY += 28;
      };

      // Dynamic Two-Column Row with Cyan Labels & Zero Text Overlap (Matching PDF #1)
      const drawTwoColumnRow = (item1, item2) => {
        const colWidth1 = 300;
        const colWidth2 = contentWidth - colWidth1 - 15; // 200

        // Calculate Col 1 Height
        doc.fontSize(7.5).font('Helvetica-Bold');
        const h1Label = doc.heightOfString(item1.label, { width: colWidth1 });
        doc.fontSize(9).font('Helvetica');
        const val1Str = String(item1.value || '-');
        const h1Val = doc.heightOfString(val1Str, { width: colWidth1 });
        const col1Height = h1Label + 2 + h1Val;

        // Calculate Col 2 Height
        let col2Height = 0;
        let h2Label = 0;
        let val2Str = '-';
        if (item2) {
          doc.fontSize(7.5).font('Helvetica-Bold');
          h2Label = doc.heightOfString(item2.label, { width: colWidth2 });
          doc.fontSize(9).font('Helvetica');
          val2Str = String(item2.value || '-');
          const h2Val = doc.heightOfString(val2Str, { width: colWidth2 });
          col2Height = h2Label + 2 + h2Val;
        }

        const rowHeight = Math.max(col1Height, col2Height);
        checkPageBreak(rowHeight + 8);

        // Render Col 1
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0891B2')
           .text(item1.label, margin, currentY, { width: colWidth1 });
        doc.fontSize(9).font('Helvetica').fillColor('#0F172A')
           .text(val1Str, margin, currentY + h1Label + 2, { width: colWidth1 });

        // Render Col 2
        if (item2) {
          const col2X = margin + colWidth1 + 15;
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0891B2')
             .text(item2.label, col2X, currentY, { width: colWidth2 });
          doc.fontSize(9).font('Helvetica').fillColor('#0F172A')
             .text(val2Str, col2X, currentY + h2Label + 2, { width: colWidth2 });
        }

        currentY += rowHeight + 10;
      };

      // 1. APPLICATION OVERVIEW (Matching PDF #1)
      drawSectionHeader('Application Overview', 110);

      const submittedDateObj = submittedAt ? new Date(submittedAt) : new Date();
      const appDateStr = submittedDateObj.toLocaleDateString('en-US', {
        year: '2-digit', month: '2-digit', day: 'numeric'
      });

      const phoneClean = String(applicantInfo.phone || applicantInfo.passportNumber || '12705').replace(/\D/g, '');
      const prefixMap = {
        'bachelor': 'BACH',
        'bachelors': 'BACH',
        'ug': 'BACH',
        'master': 'POST',
        'masters': 'POST',
        'pg': 'POST',
        'medical': 'MED',
        'mbbs': 'MED'
      };
      const prefix = prefixMap[String(studyType).toLowerCase()] || String(studyType).slice(0, 3).toUpperCase();
      const appIdStr = `${prefix}-2026-${phoneClean.slice(-5) || '12705'}`;
      const appStatusStr = isSubmitted ? 'Completed' : 'Draft';

      // 3 Overview Cards in Light Blue Container (Matching PDF #1)
      const overviewBoxHeight = 46;
      doc.roundedRect(margin, currentY, contentWidth, overviewBoxHeight, 4)
         .fill('#F0F7FF');

      const cardWidth = (contentWidth - 30) / 3;
      const cardsData = [
        { label: 'APPLICATION ID', value: appIdStr },
        { label: 'STATUS', value: appStatusStr },
        { label: 'GENERATED', value: appDateStr }
      ];

      cardsData.forEach((c, idx) => {
        const cardX = margin + 15 + idx * (cardWidth + 10);
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0891B2')
           .text(c.label, cardX, currentY + 10, { width: cardWidth });

        doc.fontSize(9.5).font('Helvetica-Bold').fillColor(c.label === 'STATUS' && isSubmitted ? '#16A34A' : '#0F172A')
           .text(c.value, cardX, currentY + 24, { width: cardWidth });
      });

      currentY += overviewBoxHeight + 14;

      // Solid Teal/Cyan Banner for University Name (Matching PDF #1)
      const selectedUnis = universitySelection.selectedUniversities || [];
      const primaryUni = selectedUnis[0] || {};
      const primaryUniName = primaryUni.universityName || 'University Selection Pending';
      const primaryCourseName = (Array.isArray(primaryUni.selectedPrograms) && primaryUni.selectedPrograms.length > 0)
        ? primaryUni.selectedPrograms.join(', ')
        : (primaryUni.programName || `${studyType} Degree Program`);

      doc.fontSize(9.5).font('Helvetica-Bold');
      const uniNameH = doc.heightOfString(primaryUniName, { width: contentWidth - 24 });
      const uniBannerH = Math.max(26, uniNameH + 12);

      checkPageBreak(uniBannerH + 45);

      doc.roundedRect(margin, currentY, contentWidth, uniBannerH, 4)
         .fill('#0891B2');

      doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#FFFFFF')
         .text(primaryUniName, margin + 12, currentY + 6, { width: contentWidth - 24 });

      currentY += uniBannerH + 10;

      // Course Applied For Box (Light Blue Fill - Matching PDF #1)
      doc.fontSize(9).font('Helvetica');
      const courseH = doc.heightOfString(primaryCourseName, { width: contentWidth - 24 });
      const courseBoxH = 12 + courseH + 10;

      doc.roundedRect(margin, currentY, contentWidth, courseBoxH, 4)
         .fill('#F0F7FF');

      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0891B2')
         .text('COURSE APPLIED FOR', margin + 12, currentY + 8);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0F172A')
         .text(primaryCourseName, margin + 12, currentY + 20, { width: contentWidth - 24 });

      currentY += courseBoxH + 18;

      // 2. PERSONAL INFORMATION (Matching PDF #1)
      drawSectionHeader('Personal Information', 90);

      const personalFields = [
        { label: 'FULL NAME', value: applicantInfo.name || '-' },
        { label: 'DATE OF BIRTH', value: applicantInfo.dateOfBirth || '-' },
        { label: 'GENDER', value: applicantInfo.gender || '-' },
        { label: 'NATIONALITY', value: applicantInfo.citizenship || applicantInfo.countryOfBirth || '-' },
        { label: 'EMAIL', value: applicantInfo.email || '-' },
        { label: 'CONTACT NUMBER', value: applicantInfo.phone || '-' }
      ];

      for (let i = 0; i < personalFields.length; i += 2) {
        drawTwoColumnRow(personalFields[i], personalFields[i + 1]);
      }

      // ID Number & Permanent Address (Matching PDF #1)
      if (applicantInfo.passportNumber || applicantInfo.address) {
        drawTwoColumnRow(
          { label: 'ID NUMBER', value: applicantInfo.passportNumber || '-' },
          { label: 'PERMANENT ADDRESS', value: applicantInfo.address || '-' }
        );
      }

      if (applicantInfo.passportIssueDate || applicantInfo.passportExpiryDate) {
        drawTwoColumnRow(
          { label: 'PASSPORT ISSUE DATE', value: applicantInfo.passportIssueDate || '-' },
          { label: 'PASSPORT EXPIRY DATE', value: applicantInfo.passportExpiryDate || '-' }
        );
      }

      currentY += 6;

      // 3. ACADEMIC QUALIFICATIONS (Matching PDF #1 Format)
      drawSectionHeader('Academic Qualifications', 80);

      if (!educationSummary || educationSummary.length === 0) {
        checkPageBreak(20);
        doc.fontSize(8.5).font('Helvetica').fillColor('#475569')
           .text('No academic records provided.', margin, currentY);
        currentY += 18;
      } else {
        educationSummary.forEach((edu) => {
          const qualTitle = String(edu.qualification || 'Academic Record').toUpperCase();
          const instStr = [edu.schoolName, edu.boardUniversity].filter(Boolean).join(', ') || 'N/A';
          const scoreStr = edu.score || 'N/A';

          const labelText = qualTitle.includes('10TH') ? '10TH BOARD / SCHOOL' : (qualTitle.includes('12TH') ? '12TH BOARD / SCHOOL' : `${qualTitle} / SCHOOL`);
          const scoreLabelText = qualTitle.includes('10TH') ? '10TH PERCENTAGE' : (qualTitle.includes('12TH') ? '12TH PERCENTAGE' : 'SCORE / CGPA');

          drawTwoColumnRow(
            { label: labelText, value: instStr },
            { label: scoreLabelText, value: scoreStr }
          );
        });
      }

      currentY += 6;

      // 4. STANDARDIZED TEST SCORES (Matching PDF #1 Format)
      if (testScores.tests && testScores.tests.length > 0) {
        drawSectionHeader('Standardized Test Scores', 80);

        testScores.tests.forEach((t) => {
          checkPageBreak(40);
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0F172A')
             .text(`EXAM: ${t.exam || 'Test'}`, margin, currentY);
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#16A34A')
             .text(`SCORE: ${t.score || 'N/A'}`, margin + 180, currentY);
          doc.fontSize(8).font('Helvetica').fillColor('#475569')
             .text(`DATE: ${t.testDate || 'N/A'}`, margin + 340, currentY);
          currentY += 14;

          if (t.selectedUniversities && t.selectedUniversities.length > 0 && t.selectedUniversities.length <= 10) {
            checkPageBreak(24);
            doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0891B2')
               .text(`Selected Qualifying Universities (${t.selectedUniversities.length}):`, margin, currentY);
            currentY += 12;

            t.selectedUniversities.forEach((qu, qIdx) => {
              checkPageBreak(14);
              doc.fontSize(8).font('Helvetica').fillColor('#0F172A')
                 .text(`${qIdx + 1}. ${qu.university} ${qu.country ? `— ${qu.country}` : ''}`, margin + 12, currentY);
              currentY += 12;
            });
          }
          currentY += 8;
        });
      }

      currentY += 6;

      // 5. SELECTED UNIVERSITIES & COURSES (Matching PDF #1)
      if (selectedUnis.length > 0) {
        drawSectionHeader('Selected Universities & Courses', 80);

        selectedUnis.forEach((u, i) => {
          const uProgs = (Array.isArray(u.selectedPrograms) && u.selectedPrograms.length > 0)
            ? u.selectedPrograms.join(', ')
            : (u.programName || 'Degree Program');

          doc.fontSize(8.5).font('Helvetica');
          const progH = doc.heightOfString(`Selected Course(s): ${uProgs}`, { width: contentWidth - 14 });
          checkPageBreak(16 + progH + 8);

          doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0F172A')
             .text(`${i + 1}. ${u.universityName}`, margin, currentY);
          
          if (u.country) {
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#0891B2')
               .text(u.country, margin + contentWidth - 120, currentY, { width: 120, align: 'right' });
          }

          currentY += 12;
          doc.fontSize(8.5).font('Helvetica').fillColor('#475569')
             .text(`Selected Course(s): ${uProgs}`, margin + 14, currentY, { width: contentWidth - 14 });
          currentY += progH + 8;
        });
      }

      currentY += 6;

      // 6. UPLOADED APPLICATION DOCUMENTS CHECKLIST
      if ((documents.common && documents.common.length > 0) || (documents.additional && documents.additional.length > 0)) {
        drawSectionHeader('Uploaded Application Documents', 80);

        const studyTypeClean = String(studyType).charAt(0).toUpperCase() + String(studyType).slice(1);

        (documents.common || []).forEach(d => {
          checkPageBreak(14);
          const titleClean = formatDocumentTitle(d.title || d.key || '');
          doc.fontSize(8.5).font('Helvetica').fillColor('#0F172A').text(titleClean, margin + 10, currentY);
          const isUp = d.status === 'Uploaded';
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor(isUp ? '#16A34A' : '#475569')
             .text(isUp ? 'Uploaded' : 'Pending', margin + contentWidth - 100, currentY, { width: 100, align: 'right' });
          currentY += 14;
        });

        (documents.additional || []).forEach(d => {
          checkPageBreak(14);
          doc.fontSize(8.5).font('Helvetica').fillColor('#0F172A')
             .text(`${d.documentName} ${d.required ? '(Required)' : ''}`, margin + 10, currentY);
          const isUp = d.status === 'Uploaded';
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor(isUp ? '#16A34A' : '#475569')
             .text(isUp ? 'Uploaded' : 'Pending', margin + contentWidth - 100, currentY, { width: 100, align: 'right' });
          currentY += 14;
        });
      }

      currentY += 6;

      // 7. PARENT / GUARDIAN DETAILS (Matching PDF #1)
      const hasParentData = applicantInfo.parent1?.name || applicantInfo.parent2?.name;

      if (hasParentData) {
        drawSectionHeader('Parent / Guardian Details', 80);

        if (applicantInfo.parent1?.name) {
          const rel1 = String(applicantInfo.parent1.relationship || 'Father / Guardian').toUpperCase();
          drawTwoColumnRow(
            { label: `${rel1} NAME`, value: applicantInfo.parent1.name },
            { label: `${rel1} CONTACT NUMBER`, value: applicantInfo.parent1.phone || '-' }
          );
          if (applicantInfo.parent1.email) {
            drawTwoColumnRow(
              { label: `${rel1} EMAIL`, value: applicantInfo.parent1.email },
              null
            );
          }
        }

        if (applicantInfo.parent2?.name) {
          const rel2 = String(applicantInfo.parent2.relationship || 'Mother').toUpperCase();
          drawTwoColumnRow(
            { label: `${rel2} NAME`, value: applicantInfo.parent2.name },
            { label: `${rel2} CONTACT NUMBER`, value: applicantInfo.parent2.phone || '-' }
          );
          if (applicantInfo.parent2.email) {
            drawTwoColumnRow(
              { label: `${rel2} EMAIL`, value: applicantInfo.parent2.email },
              null
            );
          }
        }

        currentY += 6;
      }

      // 8. DECLARATION (Matching PDF #1 Light Mint Green Box)
      drawSectionHeader('Declaration', 80);

      checkPageBreak(50);
      const declBoxHeight = 44;
      doc.roundedRect(margin, currentY, contentWidth, declBoxHeight, 6)
         .fill('#E6F4EA'); // Light Mint Green Box

      doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#137333')
         .text('I confirm that the information provided in this application is accurate and complete to the best of my knowledge.', margin + 14, currentY + 14, { width: contentWidth - 28 });

      currentY += declBoxHeight + 14;

      // HEADER & FOOTER OVERLAY PASS (Draw Header and Footer dynamically on EVERY page - Matching PDF #1)
      const range = doc.bufferedPageRange();
      const logoPath = path.resolve(__dirname, '../../src/assets/Edutech-logo.png');

      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.page.margins.bottom = 0; // Prevent auto-page-break during overlay

        // TOP HEADER (Matching PDF #1)
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, margin, 16, { width: 125 });
        } else {
          doc.fontSize(15).font('Helvetica-Bold').fillColor('#0F2942').text('EDUTECHEX', margin, 18, { lineBreak: false });
        }

        // Title Right (Matching PDF #1)
        const studyTypeClean = String(studyType).charAt(0).toUpperCase() + String(studyType).slice(1);
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#0F2942')
           .text(`${studyTypeClean} Application Summary`, margin + 180, 16, { width: contentWidth - 180, align: 'right', lineBreak: false });
        doc.fontSize(8.5).font('Helvetica').fillColor('#475569')
           .text(`Application ID: ${appIdStr}`, margin + 180, 36, { width: contentWidth - 180, align: 'right', lineBreak: false });
        doc.fontSize(8.5).font('Helvetica').fillColor('#475569')
           .text(`Generated: ${appDateStr}`, margin + 180, 48, { width: contentWidth - 180, align: 'right', lineBreak: false });

        // Thin Horizontal Line at y=65
        doc.moveTo(margin, 65).lineTo(pageWidth - margin, 65).strokeColor('#E2E8F0').lineWidth(0.75).stroke();

        // BOTTOM FOOTER (Matching PDF #1)
        doc.moveTo(margin, 770).lineTo(pageWidth - margin, 770).strokeColor('#E2E8F0').lineWidth(0.75).stroke();

        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, margin, 776, { width: 70 });
        }
        
        doc.fontSize(7.5).font('Helvetica').fillColor('#64748b')
           .text(`Support: support@edutechex.com   |   Website: www.ups.edutechex.com`, margin + 80, 779, { width: 280, lineBreak: false });

        doc.fontSize(7.5).font('Helvetica').fillColor('#64748b')
           .text(`Generated: ${appDateStr}   |   Page ${i + 1} of ${range.count}`, pageWidth - margin - 220, 779, { width: 220, align: 'right', lineBreak: false });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// GET /api/enrollment/university-review
export const getUniversityReview = async (req, res) => {
  try {
    const userId = getUserId(req);
    const reviewSummary = await compileReviewSummary(userId);
    return res.status(200).json({
      success: true,
      data: reviewSummary
    });
  } catch (error) {
    console.error('Error fetching university review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch university review details.',
      error: error.message
    });
  }
};

// POST /api/enrollment/university-review/submit
export const submitUniversityReview = async (req, res) => {
  try {
    const userId = getUserId(req);
    let userObjId = userId;
    if (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) {
      userObjId = new mongoose.Types.ObjectId(userId);
    }
    const userQuery = { $or: [{ userId }, { userId: userObjId }, { userId: String(userId) }] };

    let [program, uniSelection] = await Promise.all([
      ProgramSelection.findOne(userQuery),
      UniversitySelection.findOne(userQuery)
    ]);

    if (!uniSelection || !Array.isArray(uniSelection.selectedUniversities) || uniSelection.selectedUniversities.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please complete university and program selection before submitting your final application.'
      });
    }

    if (!program) {
      program = new ProgramSelection({
        userId,
        programSelection: {
          programType: 'Bachelor',
          countryName: uniSelection.selectedCountry || '',
          selectedCountries: uniSelection.selectedCountry ? [uniSelection.selectedCountry] : []
        },
        status: 'Completed',
        programApprovalStatus: 'approved',
        submittedAt: new Date()
      });
    } else {
      program.status = 'Completed';
      program.submittedAt = new Date();
    }
    await program.save();

    if (uniSelection) {
      uniSelection.status = 'Completed';
      await uniSelection.save();
    }

    // Sync with Overview for Admin Verification Queue (AdminVerifyDocuments)
    let overview = await Overview.findOne(userQuery);
    const selectedUnisFormatted = (uniSelection?.selectedUniversities || []).map(u => ({
      universityId: String(u.universityId || ''),
      universityName: u.universityName || '',
      country: u.country || '',
      location: u.country || '',
      selectedCourses: (Array.isArray(u.selectedPrograms) && u.selectedPrograms.length > 0 
        ? u.selectedPrograms 
        : (u.programName ? [u.programName] : ['Degree Program'])
      ).map(p => ({
        programId: String(p),
        title: String(p),
        degree: String(p),
        country: u.country || ''
      }))
    }));

    if (!overview) {
      overview = new Overview({
        userId,
        applicationStatus: 'submitted',
        progress: { percentage: 100 },
        processAdminVerified: true,
        processAdminStatus: 'sent_to_admin',
        processAdminVerifiedAt: new Date(),
        verificationStatus: 'pending_admin_review',
        applicationUniversities: selectedUnisFormatted
      });
    } else {
      overview.applicationStatus = 'submitted';
      overview.progress = { percentage: 100 };
      overview.processAdminVerified = true;
      overview.processAdminStatus = 'sent_to_admin';
      overview.processAdminVerifiedAt = new Date();
      overview.verificationStatus = 'pending_admin_review';
      overview.applicationUniversities = selectedUnisFormatted;
    }
    await overview.save();

    // Compile complete summary for response
    const reviewSummary = await compileReviewSummary(userId);

    // Send Verification Format Email with PDF Attachment asynchronously in background (non-blocking)
    setImmediate(async () => {
      try {
        if (reviewSummary.applicantInfo?.email) {
          const pdfBuffer = await generateApplicationPDFBuffer(reviewSummary);
          const { subject, html, attachments } = buildVerificationEmailPayload(reviewSummary, pdfBuffer);
          await sendEmailEnhanced({
            to: reviewSummary.applicantInfo.email,
            subject,
            html,
            attachments
          });
          console.log(`📧 Confirmation email sent asynchronously to ${reviewSummary.applicantInfo.email}`);
        }
      } catch (err) {
        console.error('Failed to send confirmation email asynchronously:', err);
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Your application has been submitted successfully!',
      data: reviewSummary
    });
  } catch (error) {
    console.error('Error submitting university review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit application.',
      error: error.message
    });
  }
};

// Helper: Build Application Document Verification email payload (matching standard Admissions Team format)
export const buildVerificationEmailPayload = (reviewSummary, pdfBuffer, customAppId = null) => {
  const applicant = reviewSummary.applicantInfo || {};
  const studentName = applicant.name || 'Applicant';
  const studentEmail = applicant.email || '';
  const studyType = reviewSummary.studyType || 'Bachelor';

  const phoneClean = String(applicant.phone || applicant.passportNumber || '12705').replace(/\D/g, '');
  const prefixMap = {
    'bachelor': 'BACH',
    'bachelors': 'BACH',
    'ug': 'BACH',
    'master': 'POST',
    'masters': 'POST',
    'pg': 'POST',
    'medical': 'MED',
    'mbbs': 'MED'
  };
  const prefix = prefixMap[String(studyType).toLowerCase()] || String(studyType).slice(0, 3).toUpperCase();
  const applicationId = customAppId || `${prefix}-2026-${phoneClean.slice(-5) || '12705'}`;

  const selectedUnis = reviewSummary.universitySelection?.selectedUniversities || [];
  const uniNamesArr = selectedUnis.map(u => u.universityName + (u.country ? ` (${u.country})` : '')).filter(Boolean);
  const universityName = uniNamesArr.length > 0 ? uniNamesArr.join(', ') : 'University Placement';

  const progNamesArr = selectedUnis.flatMap(u =>
    Array.isArray(u.selectedPrograms) && u.selectedPrograms.length > 0
      ? u.selectedPrograms
      : [u.programName || `${studyType} Program`]
  ).filter(Boolean);
  const uniqueProgs = [...new Set(progNamesArr)];
  const programName = uniqueProgs.length > 0 ? uniqueProgs.join(', ') : `${studyType} Program`;

  const subject = `Application Document Verification - ${applicationId} - ${studentName}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
      <p>Dear ${studentName},</p>
      <p>Your application has been submitted successfully. Please find below the details of your application for your review.</p>
      
      <h3>Application Details</h3>
      <ul>
        <li><strong>Student Name:</strong> ${studentName}</li>
        <li><strong>Application ID:</strong> ${applicationId}</li>
        <li><strong>University:</strong> ${universityName}</li>
        <li><strong>Program:</strong> ${programName}</li>
        <li><strong>Student Email:</strong> ${studentEmail}</li>
      </ul>
      
      <p>The complete application document is attached to this email for your reference.</p>
      <p>Our admissions team will review your application and keep you updated on your application status.</p>
      
      <p>Regards,<br>Admissions Team<br>UPS Platform</p>
    </div>
  `;

  const attachments = [
    {
      filename: `Application_${applicationId}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }
  ];

  return { subject, html, attachments, applicationId };
};

// Helper: Build Application Approved email payload
export const buildApprovalEmailPayload = (reviewSummary, pdfBuffer, customAppId = null) => {
  const applicant = reviewSummary.applicantInfo || {};
  const studentName = applicant.name || 'Applicant';
  const studentEmail = applicant.email || '';
  const studyType = reviewSummary.studyType || 'Bachelor';

  const phoneClean = String(applicant.phone || applicant.passportNumber || '12705').replace(/\D/g, '');
  const prefixMap = {
    'bachelor': 'BACH',
    'bachelors': 'BACH',
    'ug': 'BACH',
    'master': 'POST',
    'masters': 'POST',
    'pg': 'POST',
    'medical': 'MED',
    'mbbs': 'MED'
  };
  const prefix = prefixMap[String(studyType).toLowerCase()] || String(studyType).slice(0, 3).toUpperCase();
  const applicationId = customAppId || `${prefix}-2026-${phoneClean.slice(-5) || '12705'}`;

  const selectedUnis = reviewSummary.universitySelection?.selectedUniversities || [];
  const uniNamesArr = selectedUnis.map(u => u.universityName + (u.country ? ` (${u.country})` : '')).filter(Boolean);
  const universityName = uniNamesArr.length > 0 ? uniNamesArr.join(', ') : 'University Placement';

  const progNamesArr = selectedUnis.flatMap(u =>
    Array.isArray(u.selectedPrograms) && u.selectedPrograms.length > 0
      ? u.selectedPrograms
      : [u.programName || `${studyType} Program`]
  ).filter(Boolean);
  const uniqueProgs = [...new Set(progNamesArr)];
  const programName = uniqueProgs.length > 0 ? uniqueProgs.join(', ') : `${studyType} Program`;

  const subject = `Application Approved - ${applicationId} - ${studentName}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
      <p>Dear ${studentName},</p>
      <p><strong>Great news!</strong> Your application has been <strong>approved</strong> following document verification and is now under university review. Please find below the details of your application for your review.</p>
      
      <h3>Application Details</h3>
      <ul>
        <li><strong>Student Name:</strong> ${studentName}</li>
        <li><strong>Application ID:</strong> ${applicationId}</li>
        <li><strong>University:</strong> ${universityName}</li>
        <li><strong>Program:</strong> ${programName}</li>
        <li><strong>Student Email:</strong> ${studentEmail}</li>
      </ul>
      
      <p>The complete application document is attached to this email for your reference.</p>
      <p>Our admissions team will review your application and keep you updated on your application status.</p>
      
      <p>Regards,<br>Admissions Team<br>UPS Platform</p>
    </div>
  `;

  const attachments = [
    {
      filename: `Application_${applicationId}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }
  ];

  return { subject, html, attachments, applicationId };
};

// GET /api/enrollment/university-review/download-pdf
export const downloadUniversityReviewPDF = async (req, res) => {
  try {
    const userId = getUserId(req);
    const reviewSummary = await compileReviewSummary(userId);
    const pdfBuffer = await generateApplicationPDFBuffer(reviewSummary);

    const studyTypeStr = (reviewSummary.studyType || 'Application').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${studyTypeStr}_Application_Summary.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate PDF.',
      error: error.message
    });
  }
};

// POST /api/enrollment/university-review/resend-email
export const resendUniversityReviewEmail = async (req, res) => {
  try {
    const userId = getUserId(req);
    const reviewSummary = await compileReviewSummary(userId);
    const pdfBuffer = await generateApplicationPDFBuffer(reviewSummary);

    if (!reviewSummary.applicantInfo.email) {
      return res.status(400).json({ success: false, message: 'No student email address found.' });
    }

    const { subject, html, attachments } = buildVerificationEmailPayload(reviewSummary, pdfBuffer);

    await sendEmailEnhanced({
      to: reviewSummary.applicantInfo.email,
      subject,
      html,
      attachments
    });

    return res.status(200).json({
      success: true,
      message: `Confirmation email with PDF sent successfully to ${reviewSummary.applicantInfo.email}!`
    });
  } catch (error) {
    console.error('Error resending email:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resend confirmation email.',
      error: error.message
    });
  }
};
