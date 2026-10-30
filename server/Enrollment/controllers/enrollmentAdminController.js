/**
 * enrollmentAdminController.js
 *
 * Process-admin controller that reads from the 5 Enrollment collections
 * (FirstYearProgramSelection, FirstYearPersonalDetails, FirstYearEducationDetails,
 *  FirstYearTestScores, FirstYearDocuments) and shapes the data into the same
 * response format expected by Process Admin.
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ProgramSelection  from '../model/programmodel.js';
import PersonalDetails   from '../model/personalmodel.js';
import EducationDetails  from '../model/educationmodel.js';
import TestScores        from '../model/testmodel.js';
import Documents         from '../model/documentmodel.js';
import AllDocument       from '../../models/AllDocumentModel.js';
import Account           from '../../models/accountModel.js';
import UniversitySelection from '../model/universityselectionmodel.js';
import AdditionalDocument from '../model/additionaldocumentmodel.js';
import { buildFileUrl } from '../../utils/s3FileKey.js';

const toObjectId = (id) => {
  if (!id) return null;
  const s = id.toString().trim();
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : null;
};

const pickText = (...values) => {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
};

const fmtDate = (d) => {
  if (!d) return '';
  try { return new Date(d).toISOString().split('T')[0]; }
  catch { return ''; }
};

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

export const getScoreEligibleBachelorUniversities = (test = {}) => {
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
    const rawMinimum = row[requirementKey];
    const minimumText = String(rawMinimum ?? '').trim();
    const minimum = minimumText && /^\d+(?:\.\d+)?$/.test(minimumText) ? Number(minimumText) : NaN;
    const universityName = String(row.University || '').trim();
    const country = String(row['Country / Location'] || '').trim();
    if (!universityName || !Number.isFinite(minimum) || score < minimum) return;

    const key = `${universityName.toLowerCase()}|${country.toLowerCase()}`;
    const existing = eligible.get(key);
    const programName = String(row.Program || '').trim();
    if (!existing) {
      eligible.set(key, {
        university: universityName,
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

const getBachelorUniversityOptions = () => {
  const universities = new Map();
  getBachelorUniversityRows().forEach((row) => {
    if (!String(row['Degree Levels Offered'] || '').toLowerCase().includes('bachelor')) return;
    const universityName = String(row.University || '').trim();
    const country = String(row['Country / Location'] || '').trim();
    if (!universityName) return;

    const key = `${universityName.toLowerCase()}|${country.toLowerCase()}`;
    if (!universities.has(key)) {
      universities.set(key, {
        universityName,
        country,
        selectedPrograms: [],
        testScoreRequirements: {},
      });
    }

    const option = universities.get(key);
    const programName = String(row.Program || '').trim();
    if (programName && !option.selectedPrograms.includes(programName)) option.selectedPrograms.push(programName);
    ['IELTS Min (Overall)', 'TOEFL iBT Min', 'PTE Academic Min', 'Duolingo Min'].forEach((field) => {
      const score = Number(row[field]);
      if (!Number.isFinite(score)) return;
      const exam = field.startsWith('IELTS') ? 'IELTS'
        : field.startsWith('TOEFL') ? 'TOEFL'
          : field.startsWith('PTE') ? 'PTE' : 'Duolingo';
      option.testScoreRequirements[exam] = option.testScoreRequirements[exam] === undefined
        ? score
        : Math.min(option.testScoreRequirements[exam], score);
    });
  });
  return Array.from(universities.values());
};

const hasEnteredTestScore = (tests) => Array.isArray(tests) && tests.some((test) =>
  String(test?.score ?? '').trim() !== '' && Number.isFinite(Number.parseFloat(String(test.score).replace(/,/g, '')))
);

const getTestUniversities = (test = {}, allowBachelorCalculation = true) => {
  const saved = Array.isArray(test.selectedUniversities) && test.selectedUniversities.length
    ? test.selectedUniversities
    : (Array.isArray(test.eligibleUniversities) ? test.eligibleUniversities : []);
  if (!allowBachelorCalculation) return saved;
  const calculated = getScoreEligibleBachelorUniversities(test);
  // The bachelor JSON is the source of truth: older saved arrays can contain
  // program-level duplicates, stale matches, or mismatched minimum fields.
  return calculated.length || hasEnteredTestScore([test]) ? calculated : saved;
};

const educationEntries = (education) => {
  if (!education) return [];
  if (Array.isArray(education.educationDetails) && education.educationDetails.length) {
    return education.educationDetails.filter((entry) => {
      const isPreMedicalPlaceholder =
        /pre-med\s*\/\s*pcb/i.test(entry?.qualification || '') ||
        /pre-medical\s*\/\s*medicine/i.test(entry?.boardUniversity || '');
      const hasActualEducationDetails = [
        entry?.schoolName,
        entry?.yearOfPassing,
        entry?.score,
        entry?.country
      ].some((value) => String(value || '').trim() && String(value).trim() !== '-');
      return !(isPreMedicalPlaceholder && !hasActualEducationDetails);
    });
  }
  const { bachelorDetails: b = {}, transferDetails: t = {}, masterDetails: m = {}, medicalDetails: med = {} } = education;
  const entries = [];
  if (b.schoolName || b.board || b.completionYear || b.percentage) entries.push({
    qualification: b.highestEducation || '10+2 / Higher Secondary', schoolName: b.schoolName || '',
    boardUniversity: b.board || '', yearOfPassing: b.completionYear || '', score: b.percentage || '', country: b.country || '',
  });
  if (t.currentCollege || t.currentProgram || t.creditsCompleted || t.gpa) entries.push({
    qualification: 'Transfer / Current College', schoolName: t.currentCollege || '', boardUniversity: t.currentProgram || t.major || '',
    yearOfPassing: t.endDate || '', score: t.gpa || t.creditsCompleted || '', country: '',
  });
  if (m.university || m.courseMajor || m.graduationYear || m.gpa) entries.push({
    qualification: m.degreeType || m.highestEducation || "Bachelor's Degree", schoolName: m.university || '',
    boardUniversity: m.courseMajor || '', yearOfPassing: m.graduationYear || '', score: m.gpa || '', country: m.country || '',
  });
  if (med.institution || med.schoolCollege || med.completionYear || med.percentageGpa) entries.push({
    qualification: med.highestEducation || med.course || 'Medical Education', schoolName: med.institution || med.schoolCollege || '',
    boardUniversity: med.course || '', yearOfPassing: med.completionYear || '', score: med.percentageGpa || '', country: med.country || '',
  });
  return entries;
};

const mergeEnrollmentDocuments = (documentsRecord, personal, allDocumentRecords = [], additionalDocumentRecords = [], tests = null, education = null) => {
  const documents = { ...(documentsRecord?.documents || {}) };
  const documentAliases = {
    passport: 'passport', photo: 'photo', cv: 'cv', resumeCv: 'cv',
    grade9: 'cert9th', cert9th: 'cert9th', grade10: 'cert10th', cert10th: 'cert10th',
    grade11: 'cert11th', cert11th: 'cert11th', grade12: 'cert12th', cert12th: 'cert12th',
    collegeTranscript: 'collegeTranscript', college_transcript: 'collegeTranscript',
    undergraduateTranscript: 'undergraduateTranscript', ug_transcript: 'undergraduateTranscript',
    bachelorTranscript: 'bachelorTranscript', bachelorDegree: 'bachelorDegree', ug_degree: 'bachelorDegree',
    medicalAcademicDocument: 'medicalAcademicDocument', medical_academic_doc: 'medicalAcademicDocument',
    testScores: 'testScores', score_report: 'testScores'
  };
  const hasFile = (file) => file && typeof file === 'object' &&
    (file.fileName || file.originalName || file.filename || file.fileUrl || file.s3Key || file.fileKey || file.path);
  const normalizeFile = (file) => ({
    ...file,
    fileName: file.originalName || file.fileName || file.filename || '',
    fileKey: file.s3Key || file.fileKey || '',
    fileUrl: file.fileUrl || file.path || ((file.s3Key || file.fileKey) ? buildFileUrl(file.s3Key || file.fileKey) : '')
  });
  const educationDocuments = [
    ['collegeTranscript', education?.transferDetails?.transcriptDoc, 'College / Transfer Transcript'],
    ['undergraduateTranscript', education?.masterDetails?.transcriptDoc, "Bachelor's Degree Transcript"],
    ['bachelorDegree', education?.masterDetails?.degreeDoc, "Bachelor's Degree Certificate"],
    ['bachelorDegree', education?.bachelorDetails?.certificateDoc, "Bachelor's Degree Certificate"],
    ['medicalAcademicDocument', education?.medicalDetails?.academicDoc, 'Medical Academic Document']
  ];
  for (const [key, file, label] of educationDocuments) {
    if (!hasFile(file)) continue;
    // Prefer the dedicated education upload when a legacy/general slot has the
    // same document type, since this is where the education form stores it.
    documents[key] = { ...normalizeFile(file), label, documentStatus: 'pending' };
  }
  for (const record of allDocumentRecords) {
    const uploaded = record.uploadedDocuments || {};
    for (const [storedKey, value] of Object.entries(uploaded)) {
      const mappedKey = documentAliases[storedKey];
      if (mappedKey && hasFile(value)) documents[mappedKey] = { ...normalizeFile(value), documentStatus: 'pending' };
      // Test score files are nested by exam (IELTS, TOEFL, SAT, etc.).
      if (storedKey === 'testScores' && value && typeof value === 'object' && !hasFile(value)) {
        for (const [exam, file] of Object.entries(value)) {
          if (hasFile(file)) {
            const key = `testScores_${exam}`;
            documents[key] = { ...normalizeFile(file), label: `Test Score Report (${exam.toUpperCase()})`, documentStatus: 'pending' };
          }
        }
      }
    }
  }
  // Score reports are stored with test results rather than the common document record.
  // Older records may keep the language/additional test objects alongside the
  // flattened `tests` array, so fold those in when their report is missing.
  const testEntries = [...(tests?.tests || [])];
  const legacyTestEntries = [tests?.languageTest, ...(Array.isArray(tests?.additionalTests) ? tests.additionalTests : [])].filter(Boolean);
  for (const legacyTest of legacyTestEntries) {
    const matchingTest = testEntries.find((test) =>
      (legacyTest.id && test.id === legacyTest.id) ||
      (legacyTest.exam && test.exam === legacyTest.exam && (test.category || '') === (legacyTest.category || '')));
    const legacyReport = legacyTest.reportFile || legacyTest.file || legacyTest.scoreReport;
    if (matchingTest) {
      const currentReport = matchingTest.reportFile || matchingTest.file || matchingTest.scoreReport;
      if (!hasFile(currentReport) && hasFile(legacyReport)) matchingTest.reportFile = legacyReport;
    } else if (hasFile(legacyReport)) {
      testEntries.push(legacyTest);
    }
  }
  for (const [testIndex, test] of testEntries.entries()) {
    const file = test.reportFile || test.file || test.scoreReport;
    if (hasFile(file)) {
      // Keep score reports as their own logical document even if another upload
      // has the same filename (for example a certificate with a generic name).
      const key = `testReport_${String(test.exam || 'test').replace(/[^a-z0-9]+/gi, '_')}_${testIndex}`;
      documents[key] = { ...normalizeFile(file), label: `${test.exam || 'Test'} Score Report`, documentStatus: 'pending' };
    }
  }
  for (const record of additionalDocumentRecords) {
    const file = record.file;
    if (!file || !(file.fileName || file.originalName || file.fileUrl || file.s3Key)) continue;
    const keyByType = { transferCert: 'transferCertificate', schoolLeavingCert: 'schoolLeavingCertificate', gapCert: 'gapCertificate' };
    const key = keyByType[record.documentType] || record.documentType;
    documents[key] = {
      fileName: file.originalName || file.fileName || '', originalName: file.originalName || file.fileName || '',
      fileKey: file.s3Key || '', fileUrl: file.fileUrl || '', fileSize: file.size || 0,
      fileType: file.mimeType || '', uploadedAt: file.uploadedAt || null, documentStatus: record.status || 'Uploaded'
    };
  }
  // Older client builds wrote post-secondary uploads into the CV and grade 12
  // slots. Recover the intended label from the stored original filename so
  // those already-uploaded files display correctly without requiring re-upload.
  const filenameOf = (doc) => String(doc?.originalName || doc?.fileName || '').toLowerCase();
  const moveMisfiledLegacyDocument = (sourceKey, targetKey, pattern) => {
    const source = documents[sourceKey];
    if (!source || !pattern.test(filenameOf(source))) return;
    const target = documents[targetKey];
    if (!target || !filenameOf(target) || pattern.test(filenameOf(target))) {
      documents[targetKey] = source;
      delete documents[sourceKey];
    }
  };
  moveMisfiledLegacyDocument('cv', 'undergraduateTranscript', /(?:bachelor|undergraduate|\bug\b).*(?:transcript|marksheet)|(?:transcript|marksheet).*(?:bachelor|undergraduate|\bug\b)/i);
  moveMisfiledLegacyDocument('cert12th', 'bachelorDegree', /(?:bachelor|undergraduate|\bug\b).*(?:certificate|degree)|(?:certificate|degree).*(?:bachelor|undergraduate|\bug\b)/i);
  moveMisfiledLegacyDocument('grade12', 'bachelorDegree', /(?:bachelor|undergraduate|\bug\b).*(?:certificate|degree)|(?:certificate|degree).*(?:bachelor|undergraduate|\bug\b)/i);
  moveMisfiledLegacyDocument('cv', 'transferCertificate', /transfer.*(?:certificate|cert)|(?:certificate|cert).*transfer/i);
  // A placeholder passport entry in the general documents record must not
  // hide the actual upload saved on the personal details record.
  if (hasFile(personal?.passportDoc) && !hasFile(documents.passport)) {
    documents.passport = { ...normalizeFile(personal.passportDoc), label: 'Passport / ID Proof' };
  }
  return { ...(documentsRecord || {}), documents };
};

const indexBy = (docs, field = 'userId') => {
  const map = {};
  docs.forEach((d) => {
    const key = d[field]?.toString();
    if (key) map[key] = d;
  });
  return map;
};

/** Shape one enrollment record into common admin-list row format */
const buildListRow = (prog, personal, account, education, tests, uniSelection) => {
  const sel = prog.programSelection || {};
  const userId = prog.userId.toString();
  const firstName  = pickText(personal?.firstName,  account?.firstName);
  const lastName   = pickText(personal?.lastName,   account?.lastName);
  const studentName = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';

  const selectedCountries = sel.selectedCountries || prog.selectedCountries || (sel.countryName || prog.countryName ? [sel.countryName || prog.countryName] : []);
  const primaryCountry = uniSelection?.selectedCountry || (Array.isArray(selectedCountries) && selectedCountries.length
    ? selectedCountries[selectedCountries.length - 1]
    : sel.countryName || prog.countryName || '');

  const uniName = uniSelection?.selectedUniversities?.length 
    ? uniSelection.selectedUniversities.map(u => u.universityName).join(', ') 
    : (sel.universityName || sel.institutionName || prog.universityName || '');
  const programType = String(sel.programType || prog.programType || account?.applyingFor || '').toLowerCase();
  const isBachelorProgram = programType.includes('bachelor') || programType === 'ug' || programType === 'undergraduate';

  return {
    _id:              prog._id,
    studentId:        userId,
    applicationId:    `ENR-${userId.slice(-8).toUpperCase()}`,
    enrollmentId:     prog._id,
    source:           'enrollment',
    studentName,
    email:            pickText(personal?.email, account?.email),
    phone:            pickText(personal?.phone, personal?.mobile, account?.phone),
    programType:      sel.programType || prog.programType || account?.applyingFor || '',
    selectedCountries,
    primaryCountry,
    universityId:     uniSelection?.selectedUniversities?.[0]?.universityId || sel.universityId || '',
    universityName:   uniName,
    selectedUniversities: uniSelection?.selectedUniversities || [],
    universitySelectionStatus: uniSelection?.status || 'selected',
    programName:      '',
    status:               prog.programApprovalStatus || 'pending',
    programApprovalStatus: prog.programApprovalStatus || 'pending',
    applicationStatus:    account?.applicationStatus || prog.status || 'Pending',
    applicationNumber:    account?.applicationNumber || '',
    applicantType:        account?.applicantType || '',
    overviewStatus:       prog.programApprovalStatus || 'pending',
    completionPercentage: prog.status === 'Completed' ? 100 : 0,
    isCompleted:          prog.status === 'Completed',
    processAdminVerified: prog.processAdminVerified || false,
    processAdminVerifiedAt: prog.processAdminVerifiedAt || null,
    educationSummary: educationEntries(education).map(e => ({
      qualification:    e.qualification    || '',
      schoolName:       e.schoolName       || '',
      boardUniversity:  e.boardUniversity  || '',
      yearOfPassing:    e.yearOfPassing    || '',
      score:            e.score            || '',
      country:          e.country          || '',
    })),
    hasNotTakenTests: tests?.hasNotTaken || false,
    availableUniversities: isBachelorProgram && !hasEnteredTestScore(tests?.tests)
      ? getBachelorUniversityOptions()
      : [],
    testScores:       (tests?.tests || []).map(t => ({
      exam:                 t.exam                 || '',
      score:                t.score                || '',
      testDate:             t.testDate             || '',
      reportFile:           t.reportFile           || null,
      selectedUniversities: getTestUniversities(t, isBachelorProgram),
      percentile:           t.percentile           || '',
      allIndiaRank:         t.allIndiaRank         || '',
      sjtBand:              t.sjtBand              || '',
    })),
    approvedAt:   prog.approvedAt   || null,
    approvedBy:   prog.approvedBy   || '',
    approvalNotes: prog.approvalNotes || '',
    submittedAt:  account?.submittedAt || prog.updatedAt || prog.createdAt,
    updatedAt:    prog.updatedAt,
    createdAt:    prog.createdAt,
  };
};

const buildDetailRow = (prog, personal, account, education, tests, documents, uniSelection) => {
  const row = buildListRow(prog, personal, account, education, tests, uniSelection);
  const sel  = prog.programSelection || {};
  const detailProgramType = String(row.programType || sel.programType || prog.programType || account?.applyingFor || '').toLowerCase();
  const isBachelorProgram = detailProgramType.includes('bachelor') || detailProgramType === 'ug' || detailProgramType === 'undergraduate';

  return {
    ...row,
    personal: personal ? {
      title:              personal.title            || '',
      firstName:          personal.firstName        || '',
      lastName:           personal.lastName         || '',
      email:              personal.email            || '',
      mobile:             pickText(personal.phone, personal.mobile, account?.phone),
      gender:             personal.gender           || '',
      dateOfBirth:        fmtDate(personal.dateOfBirth),
      placeOfBirth:       personal.placeOfBirth     || '',
      countryOfBirth:     personal.countryOfBirth   || '',
      citizenship:        personal.citizenship      || '',
      address1:           pickText(personal.address1, personal.tempAddress1),
      address2:           pickText(personal.address2, personal.tempAddress2),
      city:               personal.tempCity         || '',
      state:              personal.tempState        || '',
      country:            personal.tempCountry      || '',
      postalCode:         personal.tempZip          || '',
      permanentAddress1:  personal.permAddress1     || '',
      permanentAddress2:  personal.permAddress2     || '',
      permanentCity:      personal.permCity         || '',
      permanentState:     personal.permState        || '',
      permanentCountry:   personal.permCountry      || '',
      permanentPostalCode:personal.permZip          || '',
      fatherFirstName:    personal.fatherFirstName  || '',
      fatherLastName:     personal.fatherLastName   || '',
      fatherName:         personal.fatherName       || '',
      fatherPhone:        personal.fatherPhone      || '',
      fatherEmail:        personal.fatherEmail      || '',
      motherFirstName:    personal.motherFirstName  || '',
      motherLastName:     personal.motherLastName   || '',
      motherName:         personal.motherName       || '',
      motherPhone:        personal.motherPhone      || '',
      passportDoc:        personal.passportDoc      || null,
      passportNumber:     personal.passportNumber   || '',
      passportIssueDate:  fmtDate(personal.passportIssueDate),
      passportExpiryDate: fmtDate(personal.passportExpiryDate),
      issuingCountry:     personal.issuingCountry   || '',
    } : {},
    familyDetails: {
      parent1: {
        relationship: personal?.parent1Relationship || 'Father',
        fullName:     personal?.parent1FullName || [personal?.fatherFirstName, personal?.fatherLastName].filter(Boolean).join(' ') || personal?.fatherName || '',
        email:        personal?.parent1Email || personal?.fatherEmail || '',
        phone:        personal?.parent1Phone || personal?.fatherPhone || '',
      },
      parent2: {
        enabled: Boolean(personal?.parent2FullName || personal?.motherFirstName || personal?.motherName),
        relationship: personal?.parent2Relationship || 'Mother',
        fullName:     personal?.parent2FullName || [personal?.motherFirstName, personal?.motherLastName].filter(Boolean).join(' ') || personal?.motherName || '',
        email:        personal?.parent2Email || '',
        phone:        personal?.parent2Phone || personal?.motherPhone || '',
      },
    },
    address: {
      address1: personal?.permAddress1 || '', address2: personal?.permAddress2 || '',
      city: personal?.permCity || '', stateProvince: personal?.permState || '', country: personal?.permCountry || '', postcode: personal?.permZip || '',
      hasDifferentCorrespondenceAddress: !personal?.sameAsTemporaryAddress,
      correspondenceAddress1: personal?.tempAddress1 || '', correspondenceAddress2: personal?.tempAddress2 || '',
      correspondenceCity: personal?.tempCity || '', correspondenceStateProvince: personal?.tempState || '',
      correspondenceCountry: personal?.tempCountry || '', correspondencePostcode: personal?.tempZip || '',
    },
    education: {
      entries:      educationEntries(education),
      bachelorDetails: education?.bachelorDetails || {},
      transferDetails: education?.transferDetails || {},
      masterDetails: education?.masterDetails || {},
      medicalDetails: education?.medicalDetails || {},
      eduCompleted: education?.status === 'Completed',
    },
    scores: {
      hasNotTaken: tests?.hasNotTaken || false,
      tests:       (tests?.tests || []).map((test) => ({
        ...test,
        selectedUniversities: getTestUniversities(test, isBachelorProgram),
      })),
    },
    documents: documents?.documents || {},
    programSelection: {
      ...sel,
      programType:       sel.programType || prog.programType || '',
      selectedCountries: sel.selectedCountries || prog.selectedCountries ||
        (sel.countryName || prog.countryName ? [sel.countryName || prog.countryName] : []),
      countryName:       sel.countryName || prog.countryName || '',
      universityId:      sel.universityId || prog.universityId || '',
      universityName:    sel.universityName || prog.universityName || '',
      institutionName:   sel.institutionName || prog.institutionName || '',
    },
  };
};

/** List logic with robust variant matching for program types */
export const fetchEnrollmentList = async (programType, status, search) => {
  const typeKey = String(programType || '').toLowerCase();
  let typeVariants = null;
  if (typeKey.includes('master')) {
    typeVariants = ['master', 'masters', "master's", 'pg', 'postgraduate'];
  } else if (typeKey.includes('med') || typeKey.includes('mbbs')) {
    typeVariants = ['medical', 'mbbs'];
  } else if (typeKey.includes('bach') || typeKey.includes('ug')) {
    typeVariants = ['bachelor', 'bachelors', "bachelor's", 'ug', 'undergraduate'];
  }

  const reviewQueueAccounts = await Account.find({
    applicationStatus: { $in: ['Submitted for Approval', 'Approved'] }
  }).select('_id firstName lastName email phone applicantType applyingFor applicationNumber applicationStatus submittedAt isLocked').lean();
  const reviewQueueUserIds = reviewQueueAccounts.map((account) => account._id);
  const progFilter = {};
  if (typeVariants) {
    progFilter.$or = [
      { 'programSelection.programType': { $in: typeVariants } },
      { programType: { $in: typeVariants } }
    ];
  }

  if (status && status !== 'all') {
    if (status === 'submitted') progFilter.programApprovalStatus = { $in: ['pending', 'approved', 'under_review'] };
    else if (status === 'completed') progFilter.programApprovalStatus = 'approved';
    else if (status === 'incomplete') progFilter.programApprovalStatus = 'rejected';
    else if (status === 'inprogress') progFilter.programApprovalStatus = 'under_review';
    else progFilter.programApprovalStatus = status;
  } else {
    progFilter.programApprovalStatus = { $in: ['pending', 'approved', 'under_review', 'rejected'] };
  }

  let progDocs = await ProgramSelection.find(progFilter)
    .sort({ updatedAt: -1 })
    .lean();

  // Submitted students belong in the review queue even when legacy program
  // records have no approval status or when the program step was not saved.
  const coveredIds = new Set(progDocs.map((prog) => prog.userId?.toString()));
  const missingReviewQueueIds = reviewQueueUserIds.filter((id) => !coveredIds.has(id.toString()));
  if (missingReviewQueueIds.length) {
    const [personalByUser, accountsByUser, educationByUser, testsByUser, docsByUser] = await Promise.all([
      PersonalDetails.find({ userId: { $in: missingReviewQueueIds } }).lean(),
      Account.find({ _id: { $in: missingReviewQueueIds } }).select('firstName lastName email phone applicantType applyingFor applicationNumber applicationStatus submittedAt isLocked').lean(),
      EducationDetails.find({ userId: { $in: missingReviewQueueIds } }).lean(),
      TestScores.find({ userId: { $in: missingReviewQueueIds } }).lean(),
      Documents.find({ userId: { $in: missingReviewQueueIds } }).lean()
    ]);
    const personalMap = indexBy(personalByUser);
    const accountMap = indexBy(accountsByUser, '_id');
    const educationMap = indexBy(educationByUser);
    const testsMap = indexBy(testsByUser);
    const docsMap = indexBy(docsByUser);
    const syntheticPrograms = missingReviewQueueIds.map((id) => {
      const account = accountMap[id.toString()];
      const type = account?.applyingFor || 'Bachelor\'s';
      const normalizedType = type.toLowerCase().includes('master') ? 'masters' : type.toLowerCase().includes('med') ? 'medical' : 'bachelors';
      const emptyTypeOkay = !typeVariants || typeVariants.includes(type.toLowerCase()) || typeVariants.includes(normalizedType);
      const isApproved = account?.applicationStatus === 'Approved';
      const matchesStatus = status === 'completed' ? isApproved
        : status === 'incomplete' || status === 'inprogress' ? false
          : true;
      const person = personalMap[id.toString()];
      if (!emptyTypeOkay || !matchesStatus) return null;
      const synthetic = {
        _id: id,
        userId: id,
        programType: type,
        programSelection: { programType: type, selectedCountries: [], countryName: '' },
        selectedCountries: [],
        programApprovalStatus: isApproved ? 'approved' : 'pending',
        processAdminVerified: isApproved,
        status: 'Completed',
        createdAt: person?.createdAt || new Date(),
        updatedAt: person?.updatedAt || new Date()
      };
      synthetic._adminFallback = {
        personal: person,
        account,
        education: educationMap[id.toString()],
        tests: testsMap[id.toString()],
        documents: docsMap[id.toString()]
      };
      return synthetic;
    }).filter(Boolean);
    progDocs.push(...syntheticPrograms);
  }

  if (!progDocs.length) return [];

  const userIds = progDocs.map((p) => p.userId);
  const objIds  = userIds.map(toObjectId).filter(Boolean);

  const [personalDocs, accountDocs, eduDocs, testDocs, uniSelections] = await Promise.all([
    PersonalDetails.find({ userId: { $in: userIds } }).lean(),
    Account.find({ _id: { $in: objIds } }).select('firstName lastName email phone applicantType applyingFor applicationNumber applicationStatus submittedAt isLocked').lean(),
    EducationDetails.find({ userId: { $in: userIds } }).lean(),
    TestScores.find({ userId: { $in: userIds } }).lean(),
    UniversitySelection.find({ userId: { $in: userIds } }).lean(),
  ]);

  const personalMap = indexBy(personalDocs);
  const accountMap  = indexBy(accountDocs, '_id');
  const eduMap      = indexBy(eduDocs);
  const testMap     = indexBy(testDocs);
  const uniMap      = indexBy(uniSelections);

  // Fill submitted records that are absent from the program-selection queue.
  let rows = progDocs.map((prog) => {
    const uid = prog.userId.toString();
    return buildListRow(
      prog,
      personalMap[uid],
      accountMap[uid],
      eduMap[uid],
      testMap[uid],
      uniMap[uid]
    );
  });

  const fallbackPrograms = progDocs.filter((prog) => prog._adminFallback);
  if (fallbackPrograms.length) {
    const fallbackUserIds = fallbackPrograms.map((prog) => prog.userId);
    const [fallbackPersonal, fallbackAccounts, fallbackEducation, fallbackTests] = await Promise.all([
      PersonalDetails.find({ userId: { $in: fallbackUserIds } }).lean(),
      Account.find({ _id: { $in: fallbackUserIds } }).select('firstName lastName email phone applicantType applyingFor applicationNumber applicationStatus submittedAt isLocked').lean(),
      EducationDetails.find({ userId: { $in: fallbackUserIds } }).lean(),
      TestScores.find({ userId: { $in: fallbackUserIds } }).lean()
    ]);
    const pMap = indexBy(fallbackPersonal);
    const aMap = indexBy(fallbackAccounts, '_id');
    const eMap = indexBy(fallbackEducation);
    const tMap = indexBy(fallbackTests);
    rows = rows.map((row) => {
      const id = row.studentId;
      const fallbackProgram = fallbackPrograms.find((prog) => prog.userId.toString() === id)?._adminFallback;
      if (!fallbackProgram) return row;
      const prog = fallbackPrograms.find((item) => item.userId.toString() === id);
      const shaped = buildListRow(prog, pMap[id] || fallbackProgram.personal, aMap[id] || fallbackProgram.account,
        eMap[id] || fallbackProgram.education, tMap[id] || fallbackProgram.tests, uniMap[id]);
      return { ...row, ...shaped };
    });
  }

  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((r) =>
      r.studentName?.toLowerCase().includes(q)   ||
      r.email?.toLowerCase().includes(q)         ||
      r.applicationId?.toLowerCase().includes(q) ||
      r.universityName?.toLowerCase().includes(q)||
      (r.selectedCountries || []).some((c) => c.toLowerCase().includes(q))
    );
  }

  return rows;
};

const listApplications = async (req, res, programType) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const pageNum  = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 50, 1);
    const skip     = (pageNum - 1) * limitNum;

    const rows = await fetchEnrollmentList(programType, status, search);
    const total = rows.length;
    const data  = rows.slice(skip, skip + limitNum);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page:  pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error(`listApplications(${programType}) error:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch enrollment applications.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const getApplicationDetail = async (req, res, programType) => {
  try {
    const { userId } = req.params;
    const objId = toObjectId(userId);

    const typeKey = String(programType || '').toLowerCase();
    let typeVariants = null;
    if (typeKey.includes('master')) {
      typeVariants = ['master', 'masters', "master's", 'pg', 'postgraduate'];
    } else if (typeKey.includes('med') || typeKey.includes('mbbs')) {
      typeVariants = ['medical', 'mbbs'];
    } else if (typeKey.includes('bach') || typeKey.includes('ug')) {
      typeVariants = ['bachelor', 'bachelors', "bachelor's", 'ug', 'undergraduate'];
    }

    const query = { $or: [{ userId: objId }, { userId: String(userId) }] };
    if (typeVariants) {
      query.$and = [
        {
          $or: [
            { 'programSelection.programType': { $in: typeVariants } },
            { programType: { $in: typeVariants } }
          ]
        }
      ];
    }

    let prog = await ProgramSelection.findOne(query).lean();
    if (!prog) {
      prog = await ProgramSelection.findOne({ $or: [{ userId: objId }, { userId: String(userId) }] }).lean();
    }

    if (!prog) {
      const account = await Account.findById(objId || userId).lean();
      if (!account || !['Submitted for Approval', 'Approved'].includes(account.applicationStatus)) {
        return res.status(404).json({ success: false, message: 'No enrollment application found for this student.' });
      }
      const accountType = (account.applyingFor || 'Bachelor\'s').toLowerCase();
      const requestedTypeMatches = !typeVariants || typeVariants.some((variant) => accountType === variant || accountType.includes(variant.replace(/s$/, '')));
      if (!requestedTypeMatches) {
        return res.status(404).json({ success: false, message: 'No enrollment application found for this program type.' });
      }
      const accountId = account._id;
      const [personal, education, tests, documents, uniSelection, allDocumentRecords, additionalDocumentRecords] = await Promise.all([
        PersonalDetails.findOne({ userId: accountId }).lean(),
        EducationDetails.findOne({ userId: accountId }).lean(),
        TestScores.findOne({ userId: accountId }).lean(),
        Documents.findOne({ userId: accountId }).lean(),
        UniversitySelection.findOne({ userId: accountId }).lean(),
        AllDocument.find({ userId: accountId }).sort({ createdAt: 1 }).lean(),
        AdditionalDocument.find({ userId: accountId }).lean()
      ]);
      const type = account.applyingFor || 'Bachelor\'s';
      const isApproved = account.applicationStatus === 'Approved';
      const selection = { programType: type, selectedCountries: [], countryName: '' };
      const fallbackProgram = {
        _id: account._id,
        userId: account._id,
        programType: type,
        programSelection: selection,
        selectedCountries: [],
        programApprovalStatus: isApproved ? 'approved' : 'pending',
        processAdminVerified: isApproved,
        status: 'Completed',
        createdAt: account.createdAt,
        updatedAt: account.submittedAt || account.updatedAt
      };
      const detail = buildDetailRow(fallbackProgram, personal, account, education, tests,
        mergeEnrollmentDocuments(documents, personal, allDocumentRecords, additionalDocumentRecords, tests, education), uniSelection);
      detail.applicationNumber = account.applicationNumber || '';
      detail.applicationStatus = account.applicationStatus;
      detail.applicantType = account.applicantType || '';
      detail.submittedAt = account.submittedAt || null;
      return res.status(200).json({ success: true, data: detail });
    }

    const uid = prog.userId.toString();
    const [personalRecord, accountRecord, educationRecord, testsRecord, documentsRecord, uniSelection, allDocumentRecords, additionalDocumentRecords] = await Promise.all([
      PersonalDetails.findOne({ userId: prog.userId }).lean(),
      Account.findById(objId || uid).select('firstName lastName email phone applicantType applyingFor applicationNumber applicationStatus submittedAt isLocked').lean(),
      EducationDetails.findOne({ userId: prog.userId }).lean(),
      TestScores.findOne({ userId: prog.userId }).lean(),
      Documents.findOne({ userId: prog.userId }).lean(),
      UniversitySelection.findOne({ userId: prog.userId }).lean(),
      AllDocument.find({ userId: prog.userId }).sort({ createdAt: 1 }).lean(),
      AdditionalDocument.find({ userId: prog.userId }).lean(),
    ]);

    const fallback = prog._adminFallback || {};
    const detail = buildDetailRow(
      prog,
      personalRecord || fallback.personal,
      accountRecord || fallback.account,
      educationRecord || fallback.education,
      testsRecord || fallback.tests,
      mergeEnrollmentDocuments(documentsRecord || fallback.documents, personalRecord || fallback.personal, allDocumentRecords, additionalDocumentRecords, testsRecord || fallback.tests, educationRecord || fallback.education),
      uniSelection
    );

    return res.status(200).json({ success: true, data: detail });
  } catch (error) {
    console.error(`getApplicationDetail error:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch enrollment application detail.',
      error: error.message,
    });
  }
};

const updateApprovalStatus = async (req, res, newStatus, routeProgramType) => {
  try {
    const { userId } = req.params;
    const { notes = '' } = req.body || {};
    const objId = toObjectId(userId);

    let prog = await ProgramSelection.findOneAndUpdate(
      { $or: [{ userId: objId }, { userId: String(userId) }] },
      {
        programApprovalStatus: newStatus,
        approvedAt:    newStatus === 'approved' ? new Date() : null,
        approvedBy:    req.user?.name || req.user?.email || 'process-admin',
        approvalNotes: notes,
      },
      { new: true }
    ).lean();

    if (!prog) {
      // Submitted applications can be synthesized into the admin queue even
      // when the student never created a ProgramSelection document. Create
      // that missing record so the counselor can approve the queued student.
      const account = objId ? await Account.findById(objId).lean() : null;
      if (!account) return res.status(404).json({ success: false, message: 'Enrollment record not found.' });
      const accountType = String(account.applyingFor || '').toLowerCase();
      const isExpectedType = !routeProgramType || (routeProgramType === 'medical'
        ? accountType.includes('med') || String(account.studentType || '').toLowerCase() === 'medical'
        : routeProgramType === 'masters'
          ? accountType.includes('master') || accountType === 'pg'
          : accountType.includes('bachelor') || accountType === 'ug' || accountType === '');
      if (!isExpectedType) return res.status(409).json({ success: false, message: 'This student does not belong to the selected program category.' });
      const programType = routeProgramType === 'medical' ? 'medical'
        : routeProgramType === 'masters' ? 'masters'
          : account.applyingFor || 'bachelors';
      const programSelection = { programType, selectedCountries: [], countryName: '' };
      prog = await ProgramSelection.findOneAndUpdate(
        { userId: objId },
        {
          $set: {
            programType,
            programSelection,
            selectedCountries: [],
            programApprovalStatus: newStatus,
            approvedAt: newStatus === 'approved' ? new Date() : null,
            approvedBy: req.user?.name || req.user?.email || 'process-admin',
            approvalNotes: notes,
            status: 'Completed',
          },
          $setOnInsert: { userId: objId },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).lean();
    }

    if (newStatus === 'approved') {
      const sel = prog.programSelection || {};
      const primaryCountry = sel.countryName || (Array.isArray(sel.selectedCountries) && sel.selectedCountries[0]);
      if (primaryCountry) {
        await UniversitySelection.findOneAndUpdate(
          { userId: prog.userId },
          {
            $setOnInsert: {
              userId: prog.userId,
              programType: sel.programType,
              selectedCountry: primaryCountry,
              selectedUniversities: [],
              status: 'selected'
            }
          },
          { upsert: true, new: true }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: `Application ${newStatus} successfully.`,
      programApprovalStatus: prog.programApprovalStatus,
    });
  } catch (error) {
    console.error('updateApprovalStatus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update approval status.',
      error: error.message,
    });
  }
};

export const getBachelorApplications = (req, res) => listApplications(req, res, 'bachelors');
export const getBachelorApplicationDetail = (req, res) => getApplicationDetail(req, res, 'bachelors');

export const getMasterApplications = (req, res) => listApplications(req, res, 'masters');
export const getMasterApplicationDetail = (req, res) => getApplicationDetail(req, res, 'masters');

export const getMedicalApplications = (req, res) => listApplications(req, res, 'medical');
export const getMedicalApplicationDetail = (req, res) => getApplicationDetail(req, res, 'medical');

const getRouteProgramType = (req) => req.path.startsWith('/medical/') ? 'medical' : req.path.startsWith('/masters/') ? 'masters' : 'bachelors';
export const approveEnrollmentApplication = (req, res) => updateApprovalStatus(req, res, 'approved', getRouteProgramType(req));
export const rejectEnrollmentApplication  = (req, res) => updateApprovalStatus(req, res, 'rejected', getRouteProgramType(req));
export const setUnderReview               = (req, res) => updateApprovalStatus(req, res, 'under_review', getRouteProgramType(req));

export const getEnrollmentStats = async (req, res) => {
  try {
    const stats = await ProgramSelection.aggregate([
      {
        $group: {
          _id: {
            type:   '$programSelection.programType',
            status: '$programApprovalStatus',
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const result = { bachelors: {}, masters: {}, medical: {}, total: 0 };
    stats.forEach(({ _id, count }) => {
      const type   = _id.type   || 'unknown';
      const status = _id.status || 'pending';
      if (!result[type]) result[type] = {};
      result[type][status] = (result[type][status] || 0) + count;
      result.total += count;
    });

    return res.status(200).json({ success: true, stats: result });
  } catch (error) {
    console.error('getEnrollmentStats Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
};
