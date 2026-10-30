import Account from '../../models/accountModel.js';
import AllDocument from '../../models/AllDocumentModel.js';
import AdditionalDocument from '../model/additionaldocumentmodel.js';
import PersonalDetails from '../model/personalmodel.js';
import EducationDetails from '../model/educationmodel.js';
import TestScores from '../model/testmodel.js';
import ApplicationConsistency from '../model/ApplicationConsistencymodel.js';
import { TextractClient, DetectDocumentTextCommand, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } from '@aws-sdk/client-textract';
import { extractPassportAddressForConsistency, extractPassportLinesFromS3 } from '../../controllers/accountController.js';
import { detectBoardType, runGradeFallbackParsers } from '../../utils/gradeDocumentParsers.js';

const textractClient = new TextractClient({
  region: process.env.AWS_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
    : undefined,
});
const documentBucket = process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET;

const normalizeKey = (value) => String(value).replace(/[^a-z0-9]/gi, '').toLowerCase();
const normalizeValue = (value) => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');
const scoresMatch = (left, right) => {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber === rightNumber;
  return normalizeValue(left) === normalizeValue(right);
};

const normalizeComparedValue = (value, code) => {
  const normalized = normalizeValue(value);
  if (code === 'education_board') {
    if (/cbse|centralboardofsecondaryeducation/.test(normalized)) return 'cbse';
    if (/icse|councilfortheindian*schoolcertificateexaminations/.test(normalized)) return 'icse';
    if (/bieap|boardofintermediateeducationandhrapradesh/.test(normalized)) return 'bieap';
    if (/bietelangana|boardofintermediateeducationtelangana/.test(normalized)) return 'bietelangana';
  }
  return normalized;
};

const textValue = (value) => {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (value && typeof value === 'object') return textValue(value.value || value.text || value.extractedValue || value.name);
  return '';
};

const extractTestScoreFields = (lines) => {
  const fields = {
    listeningScore: /listening(?:\s+score)?/i,
    readingScore: /reading(?:\s+score)?/i,
    writingScore: /writing(?:\s+score)?/i,
    speakingScore: /speaking(?:\s+score)?/i,
    literacyScore: /literacy(?:\s+score)?/i,
    comprehensionScore: /comprehension(?:\s+score)?/i,
    conversationScore: /conversation(?:\s+score)?/i,
    productionScore: /production(?:\s+score)?/i,
    verbalScore: /verbal(?:\s+reasoning)?(?:\s+score)?/i,
    quantitativeScore: /quantitative(?:\s+reasoning)?(?:\s+score)?/i,
    analyticalWritingScore: /analytical\s+writing(?:\s+assessment)?(?:\s+score)?/i,
    dataInsightsScore: /data\s+insights?(?:\s+score)?/i,
    readingWritingScore: /reading\s*(?:and|&)\s*writing(?:\s+score)?/i,
    mathScore: /math(?:ematics)?(?:\s+score)?/i,
    englishScore: /english(?:\s+score)?/i,
    scienceScore: /science(?:\s+score)?/i,
    chemicalPhysicalScore: /chemical\s*(?:and|&)\s*physical(?:\s+foundations)?(?:\s+score)?/i,
    carsScore: /(?:critical\s+analysis\s+and\s+reasoning|cars)(?:\s+skills?)?(?:\s+score)?/i,
    biologicalBiochemicalScore: /biological\s*(?:and|&)\s*biochemical(?:\s+foundations)?(?:\s+score)?/i,
    psychologicalSocialScore: /psychological\s*(?:and|&)\s*social(?:\s+foundations)?(?:\s+score)?/i,
    physicsScore: /physics(?:\s+score)?/i,
    chemistryScore: /chemistry(?:\s+score)?/i,
    biologyScore: /biology(?:\s+score)?/i,
    decisionMakingScore: /decision\s+making(?:\s+score)?/i,
    abstractReasoningScore: /abstract\s+reasoning(?:\s+score)?/i,
    situationalJudgementBand: /situational\s+judg(?:e)?ment(?:\s+band|\s+score)?/i,
  };
  const result = {};
  for (const [field, labelPattern] of Object.entries(fields)) {
    for (let index = 0; index < lines.length; index += 1) {
      const line = String(lines[index] || '').trim();
      if (!labelPattern.test(line)) continue;
      if ((field === 'readingScore' || field === 'writingScore') && /reading\s*(?:and|&)\s*writing/i.test(line)) continue;
      const afterLabel = line.replace(labelPattern, '').replace(/^\s*[:#\-–—|]+\s*/, '').trim();
      const value = afterLabel.match(/\b(\d{1,4}(?:\.\d+)?|[A-F][+-]?)\b/i)?.[1] ||
        String(lines[index + 1] || '').trim().match(/^(\d{1,4}(?:\.\d+)?|[A-F][+-]?)\b/i)?.[1];
      if (value) {
        result[field] = value;
        break;
      }
    }
  }
  return result;
};

const extractLabelledValues = (lines) => {
  const text = lines.join('\n');
  const flatText = text.replace(/\s+/g, ' ');
  const read = (...patterns) => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return match[1].trim().replace(/[|;]+$/, '');
    }
    return '';
  };
  let board = read(/(?:education\s*)?board\s*[:\-]\s*([^\n]+)/i,
    /(?:board\s*of\s*(?:secondary|intermediate\s*education)[^\n]*)/i,
    /(?:central\s*board\s*of\s*secondary\s*education|\bCBSE\b)/i,
    /(?:council\s*for\s*the\s*indian\s*school\s*certificate\s*examinations|\bICSE\b|\bISC\b)/i);
  if (/central\s*board\s*of\s*secondary\s*education|\bCBSE\b/i.test(flatText)) board = 'CBSE';
  else if (/council\s*for\s*the\s*indian\s*school\s*certificate\s*examinations|\bICSE\b/i.test(flatText)) board = 'ICSE';
  else if (/\bISC\b/i.test(flatText)) board = 'ISC';
  else if (/board\s*of\s*intermediate\s*education[^.\n]*(?:andhra\s*pradesh|\bAP\b)/i.test(flatText)) board = 'BIEAP';
  else if (/board\s*of\s*intermediate\s*education[^.\n]*telangana/i.test(flatText)) board = 'BIE Telangana';

  let completionYear = read(/(?:year\s*of\s*(?:passing|completion)|passing\s*year|graduation\s*year|completion\s*year|examination\s*year)\s*[:\-]?\s*((?:19|20)\d{2})/i);
  if (!completionYear) {
    const years = [...new Set((flatText.match(/\b(?:19|20)\d{2}\b/g) || []))];
    if (years.length === 1) completionYear = years[0];
  }

  let percentage = read(/(?:percentage\s*(?:of\s*marks)?|aggregate\s*percentage|overall\s*percentage|marks\s*percentage|marks\s*scored\s*in\s*percent)\s*[:\-]?\s*(\d{1,3}(?:\.\d+)?)\s*%?/i,
    /(?:marks\s*obtained|total\s*marks|marks\s*secured)\s*[:\-]?\s*(\d{1,3}(?:\.\d+)?)\s*%/i);
  const marksRatio = flatText.match(/(?:marks\s*(?:obtained|secured|earned)?|total\s*marks|grand\s*total)\s*[:\-]?\s*(\d{2,4})\s*(?:out\s*of|\/)\s*(\d{2,4})/i);
  if (!percentage && marksRatio && Number(marksRatio[2]) > 0) {
    percentage = ((Number(marksRatio[1]) / Number(marksRatio[2])) * 100).toFixed(2).replace(/\.00$/, '');
  }
  if (!percentage) {
    const obtained = flatText.match(/(?:marks\s*(?:obtained|secured|earned)|grand\s*total)\s*[:\-]?\s*(\d{2,4})/i);
    const maximum = flatText.match(/(?:maximum\s*marks|max\.?\s*marks|total\s*maximum)\s*[:\-]?\s*(\d{2,4})/i);
    if (obtained && maximum && Number(maximum[1]) > 0) {
      percentage = ((Number(obtained[1]) / Number(maximum[1])) * 100).toFixed(2).replace(/\.00$/, '');
    }
  }
  const gpa = read(/(?:CGPA|GPA|grade\s*point\s*average)\s*[:\-]?\s*(\d{1,2}(?:\.\d+)?)/i);

  return {
    firstName: read(/(?:given\s*names?|first\s*name)\s*[:\-]?\s*([A-Z][A-Z '\-]+)/i),
    lastName: read(/(?:surname|last\s*name|family\s*name)\s*[:\-]?\s*([A-Z][A-Z '\-]+)/i),
    passportNumber: read(/(?:passport\s*(?:no\.?|number))\s*[:\-]?\s*([A-Z0-9]{6,12})/i),
    nationality: read(/(?:nationality|citizenship)\s*[:\-]?\s*([A-Z][A-Z '\-]+)/i),
    schoolName: read(/(?:name\s*of\s*(?:the\s*)?(?:school|institution|college|university)|(?:school|institution|college|university)\s*name|school|institution|college|university)\s*[:\-]?\s*([^\n]+)/i),
    country: read(/(?:country|country\s*of\s*study)\s*[:\-]\s*([^\n]+)/i),
    state: read(/(?:state|province)\s*[:\-]\s*([^\n]+)/i),
    startYear: read(/(?:start|starting|admission|joining|enrollment)\s*year\s*[:\-]?\s*((?:19|20)\d{2})/i),
    board,
    completionYear,
    percentage,
    gpa,
    score: read(/(?:overall\s*(?:band\s*)?score|total\s*score|score)\s*[:\-]?\s*(\d{1,3}(?:\.\d+)?)/i),
    scoreFields: extractTestScoreFields(lines),
  };
};

const extractInstitutionName = (lines) => {
  const labels = /^(?:name\s*of\s*(?:the\s*)?(?:school|college|institution|university)|(?:school|college|institution|university)\s*name)\s*[:#\-]?\s*(.*)$/i;
  for (let index = 0; index < lines.length; index += 1) {
    const match = String(lines[index] || '').trim().match(labels);
    if (!match) continue;
    const sameLine = match[1].trim();
    if (sameLine) return sameLine;
    const nextLine = String(lines[index + 1] || '').trim();
    if (nextLine && !/^(?:board|roll|hall\s*ticket|registration|date|year|class|course|subject|marks)\b/i.test(nextLine)) return nextLine;
  }
  return '';
};

const extractPassportValues = (lines) => {
  const cleanLines = lines.map((line) => String(line || '').trim()).filter(Boolean);
  const isPassportLabel = (value) => /^(?:(?:given\s*names?|first\s*name|surname|last\s*name|family\s*name|nationality|citizenship|passport\s*(?:no\.?|number|#)|document\s*(?:no\.?|number|#)|date\s*of\s*(?:birth|issue|expiry)|birth\s*date|issue\s*date|expiry\s*date|name\s*of\s*(?:father(?:\s*\/\s*legal\s*guardian)?|mother)|father(?:['’]s)?\s*\/\s*legal\s*guardian(?:['’]s)?\s*name|(?:father|mother)(?:['’]s)?\s*(?:full\s*)?name))\s*[:#\-]?\s*$/i.test(value);
  const nextValue = (labelPattern) => {
    for (let i = 0; i < cleanLines.length; i += 1) {
      if (!labelPattern.test(cleanLines[i])) continue;
      const sameLine = cleanLines[i].replace(labelPattern, '').replace(/^[:#\-\s]+/, '').trim();
      if (sameLine) return sameLine;
      if (cleanLines[i + 1] && !isPassportLabel(cleanLines[i + 1])) {
        return cleanLines[i + 1];
      }
    }
    return '';
  };
  const mrzName = cleanLines.find((line) => /^P<[A-Z0-9<]{20,}$/i.test(line));
  const mrzData = cleanLines.find((line) => /^[A-Z0-9<]{28,}$/i.test(line) && /\d/.test(line));
  const passportAddress = extractPassportAddressForConsistency(cleanLines);
  let firstName = nextValue(/^(?:given\s*names?(?:\s*\(s\))?|first\s*name)\s*/i);
  let lastName = nextValue(/^(?:surname|last\s*name|family\s*name)\s*/i);
  let passportNumber = nextValue(/^(?:passport\s*(?:no\.?|number|#)|document\s*(?:no\.?|number|#))\s*/i);
  if (mrzName) {
    const names = mrzName.substring(5).split('<<');
    lastName ||= (names[0] || '').replace(/</g, ' ').trim();
    firstName ||= (names.slice(1).join(' ') || '').replace(/</g, ' ').trim();
  }
  // The enrollment field stores the applicant's first name, while passport
  // OCR often returns all given names (including middle names).
  firstName = firstName.trim().split(/\s+/)[0] || '';
  if (mrzData) passportNumber ||= mrzData.substring(0, 9).replace(/</g, '').trim();
  const nationality = nextValue(/^(?:nationality|citizenship)\s*/i) ||
    (mrzData ? mrzData.substring(10, 13).replace(/</g, '').trim() : '');
  const issueDate = nextValue(/^(?:date\s*of\s*issue|issue\s*date|issued\s*on)\s*/i);
  const expiryDate = nextValue(/^(?:date\s*of\s*expiry|expiry\s*date|expiration\s*date|expires\s*on)\s*/i) ||
    (mrzData ? mrzData.substring(21, 27).trim() : '');
  const birthDate = nextValue(/^(?:date\s*of\s*birth|birth\s*date|dob)\s*/i) ||
    (mrzData ? mrzData.substring(13, 19).trim() : '');
  const fatherName = nextValue(/^(?:name\s+of\s+father(?:\s*\/\s*legal\s*guardian)?|father(?:['’]s)?\s*\/\s*legal\s*guardian(?:['’]s)?\s*name|father(?:['’]s)?(?:\s*\/\s*legal\s*guardian)?(?:\s+full)?\s+name|father\s*\/\s*(?:legal\s*)?guardian(?:['’]s)?\s*name)\s*/i);
  const motherName = nextValue(/^(?:name\s+of\s+mother|mother(?:['’]s)?(?:\s+full)?\s+name)\s*/i);
  return {
    ...extractLabelledValues(cleanLines),
    addressLine1: passportAddress.addressLine1 || '',
    addressLine2: passportAddress.addressLine2 || '',
    addressCity: passportAddress.city || '',
    addressState: passportAddress.state || '',
    addressCountry: passportAddress.country || '',
    addressZipCode: passportAddress.zipCode || '',
    firstName,
    lastName,
    passportNumber,
    nationality,
    issueDate,
    expiryDate,
    birthDate,
    fatherName,
    motherName,
  };
};

const getExtractedDocumentData = async (file) => {
  const key = file?.s3Key || file?.fileKey;
  if (!key || !documentBucket) return null;
  try {
    if (file?.documentType === 'passport') {
      const passportLines = await extractPassportLinesFromS3(key, file.mimeType || file.mimetype || '');
      return passportLines?.length ? extractPassportValues(passportLines) : null;
    }
    let lines = [];
    if (/\.pdf$/i.test(key)) {
      const started = await textractClient.send(new StartDocumentTextDetectionCommand({
        DocumentLocation: { S3Object: { Bucket: documentBucket, Name: key } },
      }));
      if (!started.JobId) return null;
      let response;
      // Poll Textract promptly at first, then back off while larger PDFs finish.
      // The old fixed 1.5s delay added noticeable latency even for one-page files.
      for (let attempt = 0; attempt < 30; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(250 + attempt * 100, 1250)));
        response = await textractClient.send(new GetDocumentTextDetectionCommand({ JobId: started.JobId }));
        if (response.JobStatus === 'SUCCEEDED' || response.JobStatus === 'FAILED') break;
      }
      if (response?.JobStatus !== 'SUCCEEDED') return null;
      let page = response;
      while (page) {
        lines.push(...(page.Blocks || []).filter((block) => block.BlockType === 'LINE').map((block) => block.Text || ''));
        page = page.NextToken ? await textractClient.send(new GetDocumentTextDetectionCommand({ JobId: started.JobId, NextToken: page.NextToken })) : null;
      }
    } else {
      const response = await textractClient.send(new DetectDocumentTextCommand({
        Document: { S3Object: { Bucket: documentBucket, Name: key } },
      }));
      lines = (response.Blocks || []).filter((block) => block.BlockType === 'LINE').map((block) => block.Text || '');
    }
    if (!lines.length) return null;
    const extracted = extractLabelledValues(lines);
    if (file?.documentType === 'education') {
      const text = lines.join('\n');
      const boardType = detectBoardType(text);
      const gradeResult = runGradeFallbackParsers({
        extractedText: text,
        gradeKey: 'grade12',
        sourceDocument: key,
        boardType,
      });
      const calculatedPercentage = /^\d+(?:\.\d+)?%$/.test(gradeResult.calculatedAverage || '')
        ? gradeResult.calculatedAverage.replace('%', '')
        : '';
      return {
        ...extracted,
        schoolName: extracted.schoolName || extractInstitutionName(lines),
        board: extracted.board || (boardType !== 'unknown' ? gradeResult.board : ''),
        completionYear: extracted.completionYear || gradeResult.passingYear,
        percentage: extracted.percentage || calculatedPercentage,
        parsedSubjects: gradeResult.subjects,
      };
    }
    return extracted;
  } catch (error) {
    console.warn('Consistency check could not extract uploaded document:', error.message);
    return null;
  }
};

const containsUploadedKey = (value, expectedKey) => {
  if (!value || typeof value !== 'object') return false;
  if ((value.s3Key || value.fileKey) === expectedKey) return true;
  return Object.values(value).some((nested) => containsUploadedKey(nested, expectedKey));
};

const findExtractedValue = (source, aliases, depth = 0) => {
  if (!source || typeof source !== 'object' || depth > 5) return '';
  const aliasSet = new Set(aliases.map(normalizeKey));
  for (const [key, value] of Object.entries(source)) {
    if (aliasSet.has(normalizeKey(key))) {
      const direct = textValue(value);
      if (direct) return direct;
      if (value && typeof value === 'object') {
        const nested = textValue(value.value || value.text || value.name || value.extractedValue);
        if (nested) return nested;
      }
    }
  }
  for (const value of Object.values(source)) {
    if (value && typeof value === 'object') {
      const nested = findExtractedValue(value, aliases, depth + 1);
      if (nested) return nested;
    }
  }
  return '';
};

const fullName = (first, last) => [first, last].filter(Boolean).join(' ').trim();

const fieldChecks = ({ account, personal, education, extracted, applicationValues = {} }) => {
  const bachelor = education?.bachelorDetails || {};
  const master = education?.masterDetails || {};
  const medical = education?.medicalDetails || {};
  const applyingFor = String(education?.applyingFor || account.applyingFor || '').toLowerCase();
  const selectedEducation = applyingFor.includes('master') ? master
    : applyingFor.includes('medical') ? medical
      : applyingFor.includes('transfer') ? education?.transferDetails || {}
        : bachelor;
  const enteredSchool = applicationValues.schoolName || applicationValues.institution || selectedEducation.schoolName || selectedEducation.university || selectedEducation.institution || selectedEducation.schoolCollege || selectedEducation.currentCollege || '';
  const enteredAddress = (temporaryKey, permanentKey) => applicationValues[temporaryKey] || personal[temporaryKey] || applicationValues[permanentKey] || personal[permanentKey] || '';
  const addressCandidates = (temporaryKey, permanentKey) => [
    applicationValues[temporaryKey] || personal[temporaryKey],
    applicationValues[permanentKey] || personal[permanentKey],
  ].map(textValue).filter(Boolean);

  return [
    { code: 'first_name', section: 'Personal details', field: 'First name', entered: account.firstName || personal.firstName, aliases: ['firstName', 'givenName', 'forename'] },
    { code: 'last_name', section: 'Personal details', field: 'Last name', entered: account.lastName || personal.lastName, aliases: ['lastName', 'surname', 'familyName'] },
    { code: 'email', section: 'Personal details', field: 'Email address', entered: account.email || personal.email, aliases: ['email', 'emailAddress'] },
    { code: 'phone', section: 'Personal details', field: 'Phone number', entered: personal.phone || personal.mobile || account.phone, aliases: ['phone', 'phoneNumber', 'mobile', 'mobileNumber'] },
    { code: 'passport_number', section: 'Personal details', field: 'Passport number', entered: personal.passportNumber || account.passportNumber, aliases: ['passportNumber', 'passportNo', 'documentNumber'] },
    { code: 'passport_issue_date', section: 'Personal details', field: 'Passport issue date', entered: personal.passportIssueDate || account.passportIssueDate, aliases: ['passportIssueDate', 'issueDate', 'dateOfIssue'] },
    { code: 'passport_expiry_date', section: 'Personal details', field: 'Passport expiry date', entered: personal.passportExpiryDate || account.passportExpiryDate, aliases: ['passportExpiryDate', 'expiryDate', 'expirationDate', 'dateOfExpiry'] },
    { code: 'citizenship', section: 'Personal details', field: 'Citizenship / nationality', entered: personal.citizenship || personal.issuingCountry || account.citizenship || account.issuingCountry, aliases: ['citizenship', 'nationality', 'issuingCountry'] },
    { code: 'father_name', section: 'Personal details', field: "Father's name", entered: fullName(personal.fatherFirstName, personal.fatherLastName) || personal.fatherName, aliases: ['fatherName', 'fatherFullName'] },
    { code: 'mother_name', section: 'Personal details', field: "Mother's name", entered: fullName(personal.motherFirstName, personal.motherLastName) || personal.motherName, aliases: ['motherName', 'motherFullName'] },
    { code: 'address_line_1', section: 'Personal details', field: 'Address line 1', entered: enteredAddress('tempAddress1', 'permAddress1'), alternatives: addressCandidates('tempAddress1', 'permAddress1'), aliases: ['addressLine1', 'address1', 'streetAddress'] },
    { code: 'address_line_2', section: 'Personal details', field: 'Address line 2', entered: enteredAddress('tempAddress2', 'permAddress2'), alternatives: addressCandidates('tempAddress2', 'permAddress2'), aliases: ['addressLine2', 'address2'] },
    { code: 'personal_city', section: 'Personal details', field: 'Address city', entered: enteredAddress('tempCity', 'permCity'), alternatives: addressCandidates('tempCity', 'permCity'), aliases: ['addressCity'] },
    { code: 'personal_state', section: 'Personal details', field: 'Address state / province', entered: enteredAddress('tempState', 'permState'), alternatives: addressCandidates('tempState', 'permState'), aliases: ['addressState'] },
    { code: 'personal_country', section: 'Personal details', field: 'Address country', entered: enteredAddress('tempCountry', 'permCountry'), alternatives: addressCandidates('tempCountry', 'permCountry'), aliases: ['addressCountry'] },
    { code: 'personal_postal_code', section: 'Personal details', field: 'Address ZIP / postal code', entered: enteredAddress('tempZip', 'permZip'), alternatives: addressCandidates('tempZip', 'permZip'), aliases: ['addressZipCode'] },
    { code: 'school_name', section: 'Education details', field: 'School / institution name', entered: enteredSchool, aliases: ['schoolName', 'institutionName', 'school', 'universityName'] },
    { code: 'education_board', section: 'Education details', field: 'Education board', entered: applicationValues.board || selectedEducation.board || selectedEducation.boardUniversity, aliases: ['board', 'boardName', 'educationBoard'] },
    { code: 'education_country', section: 'Education details', field: 'Education country', entered: applicationValues.country || selectedEducation.country, aliases: ['country', 'countryName', 'educationCountry'] },
    { code: 'education_state', section: 'Education details', field: 'Education state / province', entered: applicationValues.state || selectedEducation.state, aliases: ['state', 'stateName', 'province'] },
    { code: 'education_start_year', section: 'Education details', field: 'Education start year', entered: applicationValues.startYear || selectedEducation.startYear, aliases: ['startYear', 'yearStarted', 'enrollmentYear'] },
    { code: 'completion_year', section: 'Education details', field: 'Completion / graduation year', entered: applicationValues.completionYear || selectedEducation.completionYear || selectedEducation.graduationYear || selectedEducation.yearOfPassing || selectedEducation.endDate, aliases: ['completionYear', 'graduationYear', 'yearOfPassing', 'passingYear'] },
    { code: 'education_percentage', section: 'Education details', field: 'Percentage / marks', entered: applicationValues.percentage || selectedEducation.percentage || selectedEducation.percentageGpa, aliases: ['percentage', 'aggregatePercentage', 'marksPercentage'] },
    { code: 'education_gpa', section: 'Education details', field: 'GPA / CGPA', entered: applicationValues.gpa || selectedEducation.gpa, aliases: ['gpa', 'cgpa', 'gradePointAverage'] },
  ].map((check) => ({ ...check, extracted: findExtractedValue(extracted, check.aliases) }));
};

const getApplicationConsistencyUserId = (req) => req.user?.id || req.user?.userId;

export const checkApplicationConsistency = async (req, res) => {
  try {
    const userId = getApplicationConsistencyUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });
    const requestedScope = String(req.body?.scope || 'all').toLowerCase();
    const scope = ['personal', 'education', 'test', 'all'].includes(requestedScope) ? requestedScope : 'all';

    const [account, personal, education, testScores, additionalDocuments] = await Promise.all([
      Account.findById(userId).lean(),
      PersonalDetails.findOne({ userId }).lean(),
      EducationDetails.findOne({ userId }).lean(),
      TestScores.findOne({ userId }).lean(),
      AdditionalDocument.find({ userId }).select('documentType documentName status file').lean(),
    ]);
    if (!account) return res.status(404).json({ success: false, message: 'Student account not found.' });

    let allDocuments = await AllDocument.find({ userId }).sort({ updatedAt: -1 }).lean();
    if (!allDocuments.length && account.email) {
      allDocuments = await AllDocument.find({ 'extractedData.email': account.email.toLowerCase() }).sort({ updatedAt: -1 }).lean();
    }

    const requestedFileKey = String(req.body?.uploadedFile?.s3Key || '');
    let uploadedFileExtraction = null;
    if (requestedFileKey) {
      const isOwnedTestUpload = scope === 'test' && requestedFileKey.startsWith(`test-scores/${String(userId)}/`);
      const isOwnedEnrollmentUpload = [personal, education, testScores, ...allDocuments]
        .some((record) => containsUploadedKey(record, requestedFileKey));
      if (!isOwnedTestUpload && !isOwnedEnrollmentUpload) {
        return res.status(403).json({ success: false, message: 'Uploaded document does not belong to this account.' });
      }
      uploadedFileExtraction = await getExtractedDocumentData({
        s3Key: requestedFileKey,
        mimeType: req.body?.uploadedFile?.mimeType,
        documentType: req.body?.documentId === 'passport' ? 'passport'
          : ['education_certificate', 'college_transcript', 'ug_transcript', 'ug_degree', 'medical_academic_doc'].includes(req.body?.documentId) ? 'education' : '',
      });
    }

    const personalData = personal || {};
    const educationData = education || {};
    const applyingFor = String(educationData.applyingFor || account.applyingFor || account.applicantType || '').toLowerCase();
    const educationFiles = (applyingFor.includes('master')
      ? [educationData.masterDetails?.transcriptDoc, educationData.masterDetails?.degreeDoc]
      : applyingFor.includes('medical')
        ? [educationData.medicalDetails?.academicDoc]
        : applyingFor.includes('transfer')
          ? [educationData.transferDetails?.transcriptDoc]
          : [educationData.bachelorDetails?.certificateDoc]).filter(Boolean).map((file) => ({ ...file, documentType: 'education' }));
    const testFiles = [
      ...(testScores?.tests || []).map((test) => test.reportFile),
      testScores?.languageTest?.reportFile,
    ].filter(Boolean);
    const personalFile = personalData.passportDoc
      ? { ...personalData.passportDoc, documentType: 'passport' }
      : account.passportFileKey ? { fileKey: account.passportFileKey, documentType: 'passport' } : null;
    const filesToExtract = scope === 'personal' ? [personalFile].filter(Boolean)
      : scope === 'education' ? educationFiles
        : scope === 'test' ? [] : [personalFile, ...educationFiles].filter(Boolean);
    // During an upload check, extract the newly uploaded file only. Re-running
    // OCR on every previously saved file in the same scope duplicates work and
    // makes this request wait for unrelated Textract jobs.
    const filesNeedingExtraction = requestedFileKey
      ? filesToExtract.filter((file) => (file.s3Key || file.fileKey) !== requestedFileKey)
      : filesToExtract;
    const testFilesNeedingExtraction = requestedFileKey
      ? testFiles.filter((file) => (file.s3Key || file.fileKey) !== requestedFileKey)
      : testFiles;
    const [freshExtractions, testExtractions] = await Promise.all([
      Promise.all(filesNeedingExtraction.map(getExtractedDocumentData)),
      scope === 'test' || scope === 'all' ? Promise.all(testFilesNeedingExtraction.map(getExtractedDocumentData)) : Promise.resolve([]),
    ]);
    const usableExtractions = [...freshExtractions, ...testExtractions, uploadedFileExtraction].filter(Boolean);
    const extractedSources = [
      account.extractedData,
      account.personalInfo,
      ...allDocuments.map((document) => document.extractedData),
      account.passportExtractedData,
      ...usableExtractions,
    ].filter((source) => source && typeof source === 'object');
    const extracted = {};
    const mergeNonEmpty = (target, source) => {
      for (const [key, value] of Object.entries(source || {})) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          target[key] = target[key] && typeof target[key] === 'object' ? target[key] : {};
          mergeNonEmpty(target[key], value);
        } else if (value !== null && value !== undefined && value !== '') {
          target[key] = value;
        }
      }
    };
    for (const source of extractedSources) mergeNonEmpty(extracted, source);
    const applicationValues = req.body?.applicationValues && typeof req.body.applicationValues === 'object' ? req.body.applicationValues : {};
    const allChecks = fieldChecks({ account, personal: { ...personalData, ...applicationValues }, education: educationData, extracted, applicationValues });
    const checks = allChecks.filter((check) => scope === 'all' ||
      (scope === 'personal' && check.section === 'Personal details') ||
      (scope === 'education' && check.section === 'Education details'));
    const findings = [];
    let comparedFieldCount = 0;

    for (const check of checks) {
      if (!textValue(check.entered) || !textValue(check.extracted)) continue;
      comparedFieldCount += 1;
      const enteredValues = check.alternatives?.length ? check.alternatives : [check.entered];
      const matchesOneEnteredValue = enteredValues.some((value) =>
        normalizeComparedValue(value, check.code) === normalizeComparedValue(check.extracted, check.code));
      if (!matchesOneEnteredValue) {
        findings.push({
          code: check.code,
          severity: 'review',
          section: check.section,
          field: check.field,
          message: `The ${check.field.toLowerCase()} in your application differs from the value extracted from an uploaded document. Please compare both and correct any mistake.`,
          applicationSource: 'Application form',
          documentSource: 'Uploaded document data',
        });
      }
    }

    if (scope === 'test' || scope === 'all') {
      for (const [index, test] of (testScores?.tests || []).entries()) {
        const extractedScore = textValue(test.verification?.extractedScore) || textValue(testExtractions[index]?.score);
        const enteredScore = textValue(test.score);
        if (!enteredScore || !extractedScore) continue;
        comparedFieldCount += 1;
        if (!scoresMatch(enteredScore, extractedScore)) {
          findings.push({
            code: `test_score_${String(test.id || test.exam || 'result').replace(/[^a-z0-9_-]/gi, '_')}`,
            severity: 'review', section: 'Test scores', field: `${test.exam || 'Test'} score`,
            message: `The score entered for ${test.exam || 'this test'} differs from the score extracted from its report. Please check the score and uploaded report.`,
            applicationSource: 'Test score form', documentSource: 'Extracted test report data',
          });
        }
        for (const [fieldKey, enteredValue] of Object.entries(test)) {
          if (!/(?:Score|Band)$/.test(fieldKey) || fieldKey === 'score') continue;
          const extractedValue = textValue(testExtractions[index]?.scoreFields?.[fieldKey]);
          if (!textValue(enteredValue) || !extractedValue) continue;
          comparedFieldCount += 1;
          if (!scoresMatch(enteredValue, extractedValue)) {
            const label = fieldKey.replace(/([A-Z])/g, ' $1').replace(/Score$|Band$/, '').trim();
            findings.push({
              code: `test_${String(test.id || test.exam || 'result').replace(/[^a-z0-9_-]/gi, '_')}_${fieldKey}`,
              severity: 'review', section: 'Test scores', field: `${test.exam || 'Test'} ${label} score`,
              message: `The ${label.toLowerCase()} score entered for ${test.exam || 'this test'} differs from the value extracted from its report. Please review both values.`,
              applicationSource: 'Test score form', documentSource: 'Extracted test report data',
            });
          }
        }
      }
      const languageTest = testScores?.languageTest;
      const languageExtraction = testExtractions[(testScores?.tests || []).length];
      if (languageTest?.score && languageExtraction?.score) {
        comparedFieldCount += 1;
        if (!scoresMatch(languageTest.score, languageExtraction.score)) {
          findings.push({
            code: 'language_test_score_mismatch', severity: 'review', section: 'Test scores',
            field: `${languageTest.exam || 'Language test'} score`,
            message: `The score entered for ${languageTest.exam || 'this language test'} differs from the score extracted from its report. Please review both values.`,
            applicationSource: 'Test score form', documentSource: 'Extracted test report data',
          });
        }
      }
      for (const [fieldKey, enteredValue] of Object.entries(languageTest || {})) {
        if (!/(?:Score|Band)$/.test(fieldKey) || fieldKey === 'score') continue;
        const extractedValue = textValue(languageExtraction?.scoreFields?.[fieldKey]);
        if (!textValue(enteredValue) || !extractedValue) continue;
        comparedFieldCount += 1;
        if (!scoresMatch(enteredValue, extractedValue)) {
          const label = fieldKey.replace(/([A-Z])/g, ' $1').replace(/Score$|Band$/, '').trim();
          findings.push({
            code: `language_test_${fieldKey}_mismatch`, severity: 'review', section: 'Test scores',
            field: `${languageTest.exam || 'Language test'} ${label} score`,
            message: `The ${label.toLowerCase()} score entered for ${languageTest.exam || 'this language test'} differs from the value extracted from its report. Please review both values.`,
            applicationSource: 'Test score form', documentSource: 'Extracted test report data',
          });
        }
      }
      const uploadedExam = textValue(applicationValues.exam);
      const enteredUploadedScore = textValue(applicationValues.score);
      const extractedUploadedScore = textValue(uploadedFileExtraction?.score);
      if (enteredUploadedScore && extractedUploadedScore) {
        comparedFieldCount += 1;
        if (!scoresMatch(enteredUploadedScore, extractedUploadedScore)) {
          findings.push({
            code: 'uploaded_test_score_mismatch', severity: 'review', section: 'Test scores',
            field: `${uploadedExam || 'Test'} score`,
            message: `The score entered for ${uploadedExam || 'this test'} differs from the score read from the uploaded report. Please review both values.`,
            applicationSource: 'Test score form', documentSource: 'Uploaded test report',
          });
        }
      const scoreFieldLabels = {
        listeningScore: 'Listening score', readingScore: 'Reading score', writingScore: 'Writing score',
        speakingScore: 'Speaking score', literacyScore: 'Literacy score', comprehensionScore: 'Comprehension score',
        conversationScore: 'Conversation score', productionScore: 'Production score', verbalScore: 'Verbal score',
        quantitativeScore: 'Quantitative score', analyticalWritingScore: 'Analytical writing score',
        dataInsightsScore: 'Data insights score', readingWritingScore: 'Reading and writing score',
        mathScore: 'Math score', englishScore: 'English score', scienceScore: 'Science score',
        chemicalPhysicalScore: 'Chemical and physical foundations score', carsScore: 'Critical analysis and reasoning score',
        biologicalBiochemicalScore: 'Biological and biochemical foundations score',
        psychologicalSocialScore: 'Psychological and social foundations score', physicsScore: 'Physics score',
        chemistryScore: 'Chemistry score', biologyScore: 'Biology score', decisionMakingScore: 'Decision making score',
        abstractReasoningScore: 'Abstract reasoning score', situationalJudgementBand: 'Situational judgement band',
      };
      for (const [fieldKey, fieldLabel] of Object.entries(scoreFieldLabels)) {
        const enteredFieldScore = textValue(applicationValues.scoreFields?.[fieldKey]);
        const extractedFieldScore = textValue(uploadedFileExtraction?.scoreFields?.[fieldKey]);
        if (!enteredFieldScore || !extractedFieldScore) continue;
        comparedFieldCount += 1;
        if (!scoresMatch(enteredFieldScore, extractedFieldScore)) {
          findings.push({
            code: `uploaded_test_${fieldKey}_mismatch`, severity: 'review', section: 'Test scores',
            field: `${uploadedExam || 'Test'} ${fieldLabel.toLowerCase()}`,
            message: `The ${fieldLabel.toLowerCase()} entered for ${uploadedExam || 'this test'} differs from the value read from the uploaded report. Please review both values.`,
            applicationSource: 'Test score form', documentSource: 'Uploaded test report',
          });
        }
      }
      }
    }

    const testReportCount = (testScores?.tests || []).filter((test) => test.reportFile?.s3Key || test.reportFile?.fileName).length +
      (testScores?.languageTest?.reportFile?.s3Key || testScores?.languageTest?.reportFile?.fileName ? 1 : 0);
    const uploadedDocumentCount = (requestedFileKey ? 1 : 0) + testReportCount + additionalDocuments.filter((document) => document.file).length +
      allDocuments.reduce((count, document) => count + Object.values(document.uploadedDocuments || {}).reduce((nestedCount, fileOrGroup) => {
        if (!fileOrGroup) return nestedCount;
        if (fileOrGroup.s3Key || fileOrGroup.fileName || fileOrGroup.originalName) return nestedCount + 1;
        if (typeof fileOrGroup === 'object') {
          return nestedCount + Object.values(fileOrGroup).filter((file) => file && typeof file === 'object' && (file.s3Key || file.fileName || file.originalName)).length;
        }
        return nestedCount;
      }, 0), 0);
    const extractedDocumentCount = usableExtractions.length + allDocuments.reduce((count, document) => count + Object.values(document.uploadedDocuments || {}).reduce((nestedCount, fileOrGroup) => {
      if (!fileOrGroup) return nestedCount;
      if (fileOrGroup.extractionStatus === 'completed') return nestedCount + 1;
      if (typeof fileOrGroup === 'object') {
        return nestedCount + Object.values(fileOrGroup).filter((file) => file?.extractionStatus === 'completed').length;
      }
      return nestedCount;
    }, 0), 0);

    if (uploadedDocumentCount === 0) {
      findings.push({
        code: 'no_uploaded_documents', severity: 'info', section: 'Documents', field: 'Uploaded documents',
        message: 'No uploaded documents were found for comparison. Upload the supporting documents, then run this check again.',
        applicationSource: 'Application', documentSource: 'Uploaded documents',
      });
    } else if (comparedFieldCount === 0) {
      findings.push({
        code: 'no_extracted_fields', severity: 'info', section: 'Documents', field: 'Document text comparison',
        message: 'Documents are uploaded, but no supported extracted fields were available to compare. Check the document details manually.',
        applicationSource: 'Application form', documentSource: 'Uploaded documents',
      });
    }

    const mismatchCount = findings.filter((finding) => finding.severity === 'review').length;
    const status = mismatchCount
      ? 'review_required'
      : uploadedDocumentCount > 0 && comparedFieldCount > 0
        ? 'consistent'
        : 'insufficient_data';
    const report = await ApplicationConsistency.findOneAndUpdate(
      { userId },
      { userId, status, checkedAt: new Date(), comparedFieldCount, uploadedDocumentCount, extractedDocumentCount, findings },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    return res.status(200).json({
      success: true,
      data: {
        status: report.status,
        checkedAt: report.checkedAt,
        comparedFieldCount: report.comparedFieldCount,
        uploadedDocumentCount: report.uploadedDocumentCount,
        extractedDocumentCount: report.extractedDocumentCount,
        findings: report.findings,
        coverageNote: usableExtractions.length
          ? 'Uploaded files were scanned for common labelled fields. OCR can misread text, and unrecognized formats or fields still need manual review.'
          : 'No document fields could be extracted for this section. Confirm AWS Textract is configured and review uploaded documents manually; this check cannot confirm mismatches without readable document text.',
        scope,
      },
    });
  } catch (error) {
    console.error('Application consistency check failed:', error);
    return res.status(500).json({ success: false, message: 'Could not check application consistency.' });
  }
};

export const getApplicationConsistency = async (req, res) => {
  try {
    const userId = getApplicationConsistencyUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });
    const report = await ApplicationConsistency.findOne({ userId }).lean();
    return res.status(200).json({ success: true, data: report || null });
  } catch (error) {
    console.error('Could not fetch application consistency report:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch consistency report.' });
  }
};
