import { BOARD_PATTERNS, BOARD_TYPES } from "./boardPatterns.js";

const LETTER_GRADES = ["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2", "D", "E", "A+", "A", "B+", "B", "C", "F"];

const ACADEMIC_SUBJECTS = [
  "English",
  "English Comm.",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Botany",
  "Zoology",
  "Science",
  "General Science",
  "Social Science",
  "Hindi Course-B",
  "Computer Science",
  "Informatics Practices",
  "Economics",
  "Business Studies",
  "Accountancy",
  "Commerce",
  "History",
  "Political Science",
  "Geography",
  "Psychology",
  "Sociology",
  "Hindi",
  "Telugu",
  "Telugu Telangana",
  "Sanskrit",
  "French",
  "Environmental Science",
  "Physical Education",
  "Second Language",
  "Civics",
  "Statistics",
  "Computer Applications",
  "Information Technology",
];

const SUBJECT_NORMALIZATION = [
  { pattern: /\bENGLISH\s+LNG\s*&\s*LIT\.?\b/i, value: "English" },
  { pattern: /\bENGLISH\s+LANG(?:UAGE)?\s*&\s*LIT(?:ERATURE)?\.?\b/i, value: "English" },
  { pattern: /\bMATHEMATICS\s+STANDARD\b/i, value: "Mathematics" },
  { pattern: /\bHINDI\s+COURSE[-\s]*B\b/i, value: "Hindi" },
  { pattern: /\bENGLISH\s+COMM\.?\b/i, value: "English" },
  { pattern: /\bTELUGU\s+TELANGANA\b/i, value: "Telugu" },
  { pattern: /\bMATHEMATICS\s*A\b/i, value: "Mathematics A" },
  { pattern: /\bMATHEMATICS\s*B\b/i, value: "Mathematics B" },
  { pattern: /\bGENERAL\s+SCIENCE\b/i, value: "General Science" },
  { pattern: /\bSOCIAL\s+SCIENCE\b/i, value: "Social Science" },
  { pattern: /\bSECOND\s+LANGUAGE\b/i, value: "Second Language" },
  ...ACADEMIC_SUBJECTS
    .sort((a, b) => b.length - a.length)
    .map((subject) => ({
      pattern: new RegExp(`\\b${subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\./g, "\\.?")}\\b`, "i"),
      value: subject,
    })),
];

const EXCLUDED_SUBJECTS = [
  "Work Education",
  "Art Education",
  "Health & Physical Education",
  "Health And Physical Education",
  "Discipline",
  "General Studies",
];

const NON_ACADEMIC_SUBJECT_PATTERN =
  /\b(weight|height|age|gender|sex|dob|date\s*of\s*birth|birth\s*date|roll\s*(?:no|number)?|admission\s*(?:no|number)?|registration\s*(?:no|number)?|regd\s*(?:no|number)?|student\s*id|school\s*code|certificate\s*(?:no|number)?|board\s*details?|board\s*(?:name|code)?|candidate\s*(?:id|name)?|enrol(?:l)?ment\s*(?:no|number)?|hall\s*ticket)\b/i;

const NOISE_SUBJECT_PATTERN =
  /(GRADE\s*>=|RESULT|DATE|NOTE|CONTROLLER|EXAMINATIONS|SCHOOL|COLLEGE|HYDERABAD|VIDYA\s+BHAVAN|NAMAPALLY|NAMPALLY|REGD\s+NUMBER|FATHER|MOTHER|MARKS\s+RANGE|GRAND\s+TOTAL|DOWNLOADED|INSTRUCTIONS|ELIGIBILITY|BOARD|CERTIFICATE|PUBLIC\s+EXAMINATION)/i;

const OCR_GARBAGE_PATTERN =
  /(?:[A-Z]\s+){3,}|[^\x00-\x7F]{2,}|[A-Za-z]{1,3}\s+[A-Za-z]{1,3}\s+[A-Za-z]{1,3}/;

const TELANGANA_INTERMEDIATE_SUBJECTS = [
  "ENGLISH",
  "SANSKRIT",
  "TELUGU",
  "HINDI",
  "FRENCH",
  "MATHEMATICS A",
  "MATHEMATICS B",
  "MATHEMATICS",
  "PHYSICS",
  "CHEMISTRY",
  "BOTANY",
  "ZOOLOGY",
  "BIOLOGY",
  "COMMERCE",
  "ECONOMICS",
  "CIVICS",
  "HISTORY",
  "ACCOUNTANCY",
  "BUSINESS STUDIES",
  "COMPUTER SCIENCE",
  "STATISTICS",
  "COMPUTER APPLICATIONS",
];

const ANDHRA_PRADESH_INTERMEDIATE_SUBJECTS = TELANGANA_INTERMEDIATE_SUBJECTS;

const TELANGANA_IGNORE_SUBJECT_PATTERN =
  /(PRACTICALS?|ENVIRONMENTAL\s+EDUCATION|ETHICS\s+AND\s+HUMAN\s+VALUES)/i;

const STOP_SECTION_PATTERN =
  /(co[-\s]*scholastic|attendance|remarks|result|principal|controller\s+of\s+examinations|abbreviations?)/i;

const normalizeLine = (line = "") =>
  String(line)
    .replace(/[|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const includesAnyPattern = (text = "", patterns = []) => {
  const normalizedText = normalizeLine(text).toUpperCase();
  return patterns.some((pattern) => normalizedText.includes(String(pattern).toUpperCase()));
};

const toTitleCase = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bComm\b/g, "Comm.")
    .replace(/\s+\./g, ".")
    .replace(/\s+/g, " ")
    .trim();

const normalizeSubjectName = (value = "") => {
  const clean = normalizeLine(value)
    .replace(/^\d{3,4}\s+/, "")
    .replace(/[-:]+$/g, "")
    .replace(/\b(COMM)\.?$/i, "Comm.")
    .trim();

  const normalized = SUBJECT_NORMALIZATION.find((item) => item.pattern.test(clean));

  return normalized?.value || toTitleCase(clean);
};

const shouldExcludeSubject = (subject = "") =>
  EXCLUDED_SUBJECTS.some((excluded) => excluded.toLowerCase() === subject.toLowerCase());

const isPlausibleUnknownSubject = (subject = "") => {
  const clean = normalizeLine(subject)
    .replace(/^\d{1,4}\s+/, "")
    .replace(/[-:]+$/g, "");
  if (clean.length < 3 || clean.length > 70) return false;
  if (!/[A-Za-z]/.test(clean)) return false;
  if (NOISE_SUBJECT_PATTERN.test(clean) || NON_ACADEMIC_SUBJECT_PATTERN.test(clean) || shouldExcludeSubject(clean)) return false;
  if (/\b(total|result|percentage|semester|maximum|minimum|obtained|secured|credits?|grade\s*points?|roll|admission|registration|student\s*id|school\s*code|certificate|board|weight|height|age|gender|dob)\b/i.test(clean)) {
    return false;
  }
  const words = clean.split(/\s+/).filter(Boolean);
  return words.length <= 6;
};

export const getAcademicSubjectName = (subject = "") => {
  const raw = normalizeLine(subject);
  if (!raw || NOISE_SUBJECT_PATTERN.test(raw) || NON_ACADEMIC_SUBJECT_PATTERN.test(raw)) return "";
  if (OCR_GARBAGE_PATTERN.test(raw) && !SUBJECT_NORMALIZATION.some((item) => item.pattern.test(raw))) return "";

  const normalized = normalizeSubjectName(raw);
  if (shouldExcludeSubject(normalized)) return "";

  const isKnown = SUBJECT_NORMALIZATION.some((item) => item.value.toLowerCase() === normalized.toLowerCase());
  return isKnown || isPlausibleUnknownSubject(normalized) ? normalized : "";
};

const isTelanganaGrade12AggregationEnabled = ({ gradeKey = "", aggregationEnabled = false } = {}) =>
  aggregationEnabled === true && gradeKey === "grade12";

const getMergedAcademicSubjectName = (rawSubject = "", subjectName = "", aggregationEnabled = false) => {
  if (!aggregationEnabled) return subjectName;
  if (/MATHEMATICS\s*[-\s]*[AB]\b/i.test(rawSubject) || /^Mathematics\s+[AB]$/i.test(subjectName)) {
    return "Mathematics";
  }
  return subjectName;
};

const logSubjectAggregationDebug = ({ gradeKey, subjectName, marks, maxMarks, aggregationEnabled }) => {
  console.log("Grade:", gradeKey);
  console.log("Subject:", subjectName);
  console.log("Marks:", marks);
  console.log("Max:", maxMarks);
  console.log("Aggregation Enabled:", aggregationEnabled);
};

const mergeMarksIntoSubject = (target, incoming, numericMarks, numericMax) => {
  const currentMarks = parseNumber(target.marks) || 0;
  const currentMax = parseNumber(target.maxMarks) || 0;
  const mergedMarks = Number((currentMarks + numericMarks).toFixed(2));
  const mergedMax = Number((currentMax + numericMax).toFixed(2));

  target.marks = String(mergedMarks);
  target.maxMarks = mergedMax;
  target.scale = `/${mergedMax}`;
  target.gradeType = mergedMax <= 10 ? "cgpa" : "marks";
  target.percentage = mergedMax > 0 ? Number(Math.min((mergedMarks / mergedMax) * 100, 100).toFixed(2)) : null;
  target.confidence = Math.min(target.confidence ?? 1, incoming.confidence ?? 1);
  target.needsReview = Boolean(target.needsReview || incoming.needsReview || mergedMarks > mergedMax);
  target.reviewReason = target.needsReview
    ? target.reviewReason || incoming.reviewReason || "Review extracted marks/scale before applying."
    : "";
};

export const cleanAndValidateSubjects = (subjects = [], options = {}) => {
  const aggregationEnabled = isTelanganaGrade12AggregationEnabled(options);
  const gradeKey = options.gradeKey || "";
  const validSubjects = [];
  const rejectedSubjects = [];
  const seen = new Set();
  const subjectIndex = new Map();

  (subjects || []).forEach((subject) => {
    const rawSubject = subject.originalSubject || subject.subject || subject.subjectName || "";
    const normalizedSubject = getAcademicSubjectName(rawSubject);
    const subjectName = getMergedAcademicSubjectName(rawSubject, normalizedSubject, aggregationEnabled);
    const numericMarks = parseNumber(subject.marks ?? subject.obtainedMarks);
    const numericMax = parseNumber(subject.maxMarks);
    const isLetter = subject.gradeType === "letter" || Boolean(subject.letterGrade);
    const knownSubject = SUBJECT_NORMALIZATION.some((item) => item.value.toLowerCase() === subjectName.toLowerCase());
    const unclear =
      !subjectName ||
      (!isLetter && (numericMarks === null || numericMax === null || numericMax <= 0 || numericMarks > numericMax));

    if (unclear) {
      rejectedSubjects.push(subject);
      return;
    }

    const key = subjectName.toLowerCase();
    logSubjectAggregationDebug({ gradeKey, subjectName, marks: numericMarks, maxMarks: numericMax, aggregationEnabled });
    if (seen.has(key)) {
      if (aggregationEnabled && !isLetter) {
        mergeMarksIntoSubject(subjectIndex.get(key), subject, numericMarks, numericMax);
      }
      return;
    }
    if (key === "science" && [...seen].some((existing) => existing.endsWith("science") && existing !== "science")) return;
    if (!aggregationEnabled && key === "mathematics" && [...seen].some((existing) => /^mathematics\s+[ab]$/.test(existing))) return;
    seen.add(key);

    const cleanedSubject = {
      ...subject,
      subject: subjectName,
      marks: isLetter ? String(subject.marks || subject.letterGrade || "").toUpperCase() : String(numericMarks),
      maxMarks: isLetter ? subject.maxMarks || 100 : numericMax,
      gradeType: isLetter ? subject.gradeType || "letter" : subject.gradeType || (numericMax <= 10 ? "cgpa" : "marks"),
      scale: isLetter ? subject.scale || "letter" : `/${numericMax}`,
      percentage:
        !isLetter && numericMarks !== null && numericMax
          ? Number(Math.min((numericMarks / numericMax) * 100, 100).toFixed(2))
          : subject.percentage ?? null,
      needsReview: Boolean(subject.needsReview || !knownSubject),
      reviewReason: subject.reviewReason || (!knownSubject ? "Unrecognized subject name. Please review before applying." : ""),
    };
    validSubjects.push(cleanedSubject);
    subjectIndex.set(key, cleanedSubject);
  });

  return { validSubjects, rejectedSubjects };
};

const getLinesBeforeStop = (text = "") => {
  const lines = String(text || "")
    .split(/\n+/)
    .map(normalizeLine)
    .filter(Boolean);
  const stopIndex = lines.findIndex((line) => STOP_SECTION_PATTERN.test(line));
  return stopIndex >= 0 ? lines.slice(0, stopIndex) : lines;
};

export const detectBoardType = (text = "") => {
  const normalized = normalizeLine(text);
  if (
    /TELANGANA\s+STATE\s+BOARD\s+OF\s+INTERMEDIATE\s+EDUCATION/i.test(normalized) ||
    (/INTERMEDIATE\s+PUBLIC\s+EXAMINATION/i.test(normalized) && /TELANGANA/i.test(normalized))
  ) {
    return BOARD_TYPES.TELANGANA_INTERMEDIATE;
  }
  if (includesAnyPattern(normalized, BOARD_PATTERNS.ANDHRA_PRADESH_INTERMEDIATE) && /ANDHRA\s+PRADESH|BIEAP/i.test(normalized)) {
    return BOARD_TYPES.ANDHRA_PRADESH_INTERMEDIATE;
  }
  if (includesAnyPattern(normalized, BOARD_PATTERNS.CBSE)) return BOARD_TYPES.CBSE;
  if (includesAnyPattern(normalized, BOARD_PATTERNS.ICSE_ISC)) return BOARD_TYPES.ICSE_ISC;
  if (includesAnyPattern(normalized, BOARD_PATTERNS.UNIVERSITY_MARKSHEET)) return BOARD_TYPES.UNIVERSITY_MARKSHEET;
  if (includesAnyPattern(normalized, BOARD_PATTERNS.STATE_BOARD)) return BOARD_TYPES.STATE_BOARD;
  if (/SCHOLASTIC\s+AREAS|Academic\s+Year\s*\(\s*100\s*Marks\s*\)/i.test(normalized)) return "school_report";
  return BOARD_TYPES.UNKNOWN;
};

const getKnownBoardName = (text = "") => {
  const boardType = detectBoardType(text);
  if (boardType === BOARD_TYPES.TELANGANA_INTERMEDIATE) {
    return "Telangana State Board of Intermediate Education";
  }
  if (boardType === BOARD_TYPES.ANDHRA_PRADESH_INTERMEDIATE) {
    return "Andhra Pradesh Intermediate / BIEAP";
  }
  if (boardType === BOARD_TYPES.CBSE) return "CBSE";
  if (boardType === BOARD_TYPES.ICSE_ISC) return "ICSE / ISC";
  if (boardType === BOARD_TYPES.STATE_BOARD) return "State Board";
  if (boardType === BOARD_TYPES.UNIVERSITY_MARKSHEET) return "University marksheet";
  return "";
};

const parseNumber = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  const numeric = Number(normalized.startsWith(".") ? `0${normalized}` : normalized);
  return Number.isFinite(numeric) ? numeric : null;
};

const numberPattern = "(?:\\d{1,3})?\\.\\d+|\\d{1,3}";
const gradePattern = "(A1|A2|B1|B2|C1|C2|D1|D2|A\\+|B\\+|A|B|C|D|E|F)";

const makeSubject = ({
  subject,
  obtainedMarks = "",
  maxMarks = "",
  letterGrade = "",
  gradePoint = "",
  confidence = 0.82,
  sourceDocument = "",
  reviewRequired,
}) => {
  const subjectName = normalizeSubjectName(subject);
  const numericMarks = parseNumber(obtainedMarks);
  const numericMax = parseNumber(maxMarks);
  const hasLetterGrade = Boolean(letterGrade);
  const hasOnlyLetter = hasLetterGrade && numericMarks === null;
  const needsReview =
    reviewRequired ??
    (!hasOnlyLetter && (numericMarks === null || numericMax === null || numericMax <= 0 || numericMarks > numericMax));

  return {
    subject: subjectName,
    originalSubject: subject,
    marks: numericMarks !== null ? String(numericMarks) : String(letterGrade || gradePoint || ""),
    maxMarks: numericMax || (hasOnlyLetter ? 100 : 100),
    gradeType: hasOnlyLetter ? "letter" : numericMax && numericMax <= 10 ? "cgpa" : "marks",
    scale: hasOnlyLetter ? "letter" : numericMax ? `/${numericMax}` : "unknown",
    percentage:
      numericMarks !== null && numericMax && numericMax > 0
        ? Number(Math.min((numericMarks / numericMax) * 100, 100).toFixed(2))
        : null,
    letterGrade: String(letterGrade || "").toUpperCase(),
    gradePoint: String(gradePoint || ""),
    confidence,
    needsReview,
    reviewReason: needsReview ? "Review extracted marks/scale before applying." : "",
    sourceDocument,
  };
};

const addUniqueSubject = (subjects, seen, subject, options = {}) => {
  const aggregationEnabled = isTelanganaGrade12AggregationEnabled(options);
  const gradeKey = options.gradeKey || "";
  const rawSubject = subject?.originalSubject || subject?.subject || "";
  const normalizedSubject = getAcademicSubjectName(rawSubject);
  const subjectName = getMergedAcademicSubjectName(rawSubject, normalizedSubject, aggregationEnabled);
  if (!subjectName) return;
  const numericMarks = parseNumber(subject?.marks);
  const numericMax = parseNumber(subject?.maxMarks);
  logSubjectAggregationDebug({ gradeKey, subjectName, marks: numericMarks, maxMarks: numericMax, aggregationEnabled });
  const key = subjectName.toLowerCase();
  if (seen.has(key)) {
    if (aggregationEnabled && numericMarks !== null && numericMax !== null) {
      const existing = subjects.find((item) => item.subject?.toLowerCase() === key);
      if (existing) mergeMarksIntoSubject(existing, subject, numericMarks, numericMax);
    }
    return;
  }
  if (key === "science" && [...seen].some((existing) => existing.endsWith("science") && existing !== "science")) return;
  if (!aggregationEnabled && key === "mathematics" && [...seen].some((existing) => /^mathematics\s+[ab]$/.test(existing))) return;
  seen.add(key);
  subjects.push({ ...subject, subject: subjectName });
};

const getMeta = (text = "") => {
  const knownBoardName = getKnownBoardName(text);
  const lines = String(text || "")
    .split(/\n+/)
    .map(normalizeLine)
    .filter(Boolean);
  const board =
    knownBoardName ||
    lines.find((line) =>
      /(school|vidyalaya|academy|public\s+school|high\s+school|college|board|council)/i.test(line) &&
      !/(controller|eligibility|rules\s+overleaf|instructions|downloaded|grand\s+total)/i.test(line)
    ) ||
    "";
  const years = String(text).match(/\b(20\d{2}|19\d{2})\b/g);
  return {
    board,
    passingYear: years?.[years.length - 1] || "",
  };
};

const buildResult = ({ text, gradeKey, subjects, parserName }) => {
  const { board, passingYear } = getMeta(text);
  const numericSubjects = subjects.filter(
    (subject) =>
      subject.gradeType !== "letter" &&
      Number.isFinite(Number(subject.marks)) &&
      Number.isFinite(Number(subject.maxMarks)) &&
      Number(subject.maxMarks) > 0 &&
      Number(subject.marks) <= Number(subject.maxMarks)
  );
  const calculatedAverage =
    numericSubjects.length === subjects.length && subjects.length
      ? `${Number(
          (
            (numericSubjects.reduce((sum, subject) => sum + Number(subject.marks), 0) /
              numericSubjects.reduce((sum, subject) => sum + Number(subject.maxMarks), 0)) *
            100
          ).toFixed(1)
        )}%`
      : subjects.length
        ? "Review Required"
        : "";

  return {
    grade: gradeKey,
    board,
    passingYear,
    subjects,
    calculatedAverage,
    parserName,
    needsReview: subjects.length === 0 || subjects.some((subject) => subject.needsReview),
  };
};

const findTextAfterLabel = (text, labelPattern, stopPatterns = []) => {
  const match = text.match(labelPattern);
  if (!match) return "";

  const start = match.index + match[0].length;
  let end = text.length;
  stopPatterns.forEach((pattern) => {
    const next = text.slice(start).search(pattern);
    if (next >= 0) end = Math.min(end, start + next);
  });

  return text.slice(start, end).trim();
};

const tokenizeTelanganaSubjects = (subjectText = "") => {
  let remaining = normalizeLine(subjectText).toUpperCase();
  const subjects = [];
  const sortedSubjects = [...TELANGANA_INTERMEDIATE_SUBJECTS].sort((a, b) => b.length - a.length);

  while (remaining) {
    const matched = sortedSubjects.find(
      (subject) => remaining === subject || remaining.startsWith(`${subject} `)
    );
    if (!matched) break;
    subjects.push(normalizeSubjectName(matched));
    remaining = remaining.slice(matched.length).trim();
  }

  return subjects;
};

const tokenizeIntermediateSubjects = (subjectText = "", subjectList = TELANGANA_INTERMEDIATE_SUBJECTS) => {
  let remaining = normalizeLine(subjectText).toUpperCase();
  const subjects = [];
  const sortedSubjects = [...subjectList].sort((a, b) => b.length - a.length);

  while (remaining) {
    const matched = sortedSubjects.find(
      (subject) => remaining === subject || remaining.startsWith(`${subject} `)
    );
    if (!matched) break;
    subjects.push(normalizeSubjectName(matched));
    remaining = remaining.slice(matched.length).trim();
  }

  return subjects;
};

const extractTelanganaRowNumbers = (rowText = "", expectedCount = 0) => {
  const text = normalizeLine(rowText);
  const pQualified = [...text.matchAll(/\b(\d{1,3})\s*P\b/gi)].map((match) => Number(match[1]));
  const values = pQualified.length
    ? pQualified
    : [...text.matchAll(/\b\d{1,3}\b/g)].map((match) => Number(match[0]));

  const cleanValues = values.filter((value) => Number.isFinite(value));
  return expectedCount > 0 ? cleanValues.slice(0, expectedCount) : cleanValues;
};

const parseCompactMaxMarks = (digits = "", subjectNames = []) => {
  let remaining = String(digits || "").replace(/\D/g, "");
  const parsed = [];

  for (const subject of subjectNames) {
    const expected = String(getTelanganaDefaultMax(subject));
    if (remaining.startsWith(expected)) {
      parsed.push(Number(expected));
      remaining = remaining.slice(expected.length);
      continue;
    }

    const three = remaining.slice(0, 3);
    const two = remaining.slice(0, 2);
    const chunk = three.length === 3 && Number(three) <= 150 ? three : two;
    if (!chunk) break;
    parsed.push(Number(chunk));
    remaining = remaining.slice(chunk.length);
  }

  return parsed.length === subjectNames.length && parsed.every((value) => Number.isFinite(value) && value > 0)
    ? parsed
    : [];
};

const parseTelanganaColumnFormat = ({ text, gradeKey, sourceDocument }) => {
  const flattened = normalizeLine(text.replace(/\n/g, " "));
  const subjectText = findTextAfterLabel(flattened, /\bSUBJECT\b/i, [
    /\bMax\s+Marks\b/i,
    /\bMarks\s+Secured\b/i,
    /\bA\s+GRADE\s*>=/i,
  ]);
  const maxText = findTextAfterLabel(flattened, /\bMax\s+Marks\b/i, [
    /\bMarks\s+Secured\b/i,
    /\bResult\b/i,
    /\bA\s+GRADE\s*>=/i,
  ]);
  const securedText = findTextAfterLabel(flattened, /\bMarks\s+Secured\b/i, [
    /\bResult\b/i,
    /\bA\s+GRADE\s*>=/i,
    /\bB\s+GRADE\s*>=/i,
    /\bC\s+GRADE\s*>=/i,
    /\bD\s+GRADE\s*>=/i,
    /NOTE/i,
  ]);

  let subjectNames = tokenizeTelanganaSubjects(subjectText);
  let maxMarks = extractTelanganaRowNumbers(maxText, gradeKey === "grade12" ? 0 : subjectNames.length);
  let securedMarks = extractTelanganaRowNumbers(securedText, gradeKey === "grade12" ? 0 : subjectNames.length);
  if (gradeKey === "grade12") {
    const compactSubjectText = subjectText.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const matchingLayout = TELANGANA_GRADE12_COMPACT_LAYOUTS.find(
      (layout) =>
        hasTelanganaLayoutCoreSubjects(compactSubjectText, layout) &&
        securedMarks.length >= layout.componentSubjects.length
    );
    if (matchingLayout) {
      subjectNames = matchingLayout.componentSubjects;
      maxMarks = maxMarks.length >= subjectNames.length ? maxMarks.slice(0, subjectNames.length) : matchingLayout.maxMarks;
      securedMarks = securedMarks.slice(0, subjectNames.length);
    }
  }
  const count = Math.min(subjectNames.length, maxMarks.length, securedMarks.length);
  const subjects = [];
  const seen = new Set();
  const aggregationOptions = getTelanganaAggregationOptions(gradeKey);

  for (let index = 0; index < count; index += 1) {
    addUniqueSubject(
      subjects,
      seen,
      makeSubject({
        subject: subjectNames[index],
        obtainedMarks: securedMarks[index],
        maxMarks: maxMarks[index],
        confidence: 0.95,
        sourceDocument,
        reviewRequired: securedMarks[index] > maxMarks[index],
      }),
      aggregationOptions
    );
  }

  return buildResult({ text, gradeKey, subjects, parserName: "telanganaIntermediate" });
};

const parseTelanganaVerticalFormat = ({ text, gradeKey, sourceDocument }) => {
  const lines = getLinesBeforeStop(text);
  const subjects = [];
  const seen = new Set();
  const subjectSet = new Set(TELANGANA_INTERMEDIATE_SUBJECTS);
  const aggregationOptions = getTelanganaAggregationOptions(gradeKey);

  for (let index = 0; index <= lines.length - 5; index += 1) {
    const possibleSubject = normalizeLine(lines[index]).toUpperCase();
    if (!subjectSet.has(possibleSubject) || (gradeKey !== "grade12" && TELANGANA_IGNORE_SUBJECT_PATTERN.test(possibleSubject))) continue;

    const firstMax = parseNumber(lines[index + 1]);
    const firstMarks = parseNumber(lines[index + 2]);
    const secondMax = parseNumber(lines[index + 3]);
    const secondMarks = parseNumber(lines[index + 4]);
    if ([firstMax, firstMarks, secondMax, secondMarks].some((value) => value === null)) continue;

    addUniqueSubject(
      subjects,
      seen,
      makeSubject({
        subject: possibleSubject,
        obtainedMarks: secondMarks,
        maxMarks: secondMax,
        confidence: 0.95,
        sourceDocument,
        reviewRequired: secondMarks > secondMax,
      }),
      aggregationOptions
    );
    index += 4;
  }

  return buildResult({ text, gradeKey, subjects, parserName: "telanganaIntermediate" });
};

const getTelanganaDefaultMax = (subject = "") => {
  if (/MATHEMATICS\s+[AB]/i.test(subject)) return 75;
  if (/PRACTICAL/i.test(subject)) return 30;
  if (/PHYSICS|CHEMISTRY|BOTANY|ZOOLOGY/i.test(subject)) return 60;
  return 100;
};

const TELANGANA_GRADE12_COMPACT_LAYOUTS = [
  {
    name: "mpc",
    coreSubjects: ["English", "Sanskrit", "Mathematics A", "Mathematics B", "Physics", "Chemistry"],
    componentSubjects: [
      "English",
      "Sanskrit",
      "Mathematics A",
      "Mathematics B",
      "Physics",
      "Chemistry",
      "English",
      "Sanskrit",
      "Mathematics A",
      "Mathematics B",
      "Physics",
      "Chemistry",
      "Physics Practical",
      "Chemistry Practical",
    ],
    maxMarks: [100, 100, 75, 75, 60, 60, 100, 100, 75, 75, 60, 60, 30, 30],
  },
  {
    name: "bipc-single-practical",
    coreSubjects: ["English", "Sanskrit", "Botany", "Zoology", "Physics", "Chemistry"],
    componentSubjects: [
      "English",
      "Sanskrit",
      "Botany",
      "Zoology",
      "Physics",
      "Chemistry",
      "English",
      "Sanskrit",
      "Botany",
      "Zoology",
      "Physics",
      "Chemistry",
      "Botany Practical",
      "Zoology Practical",
      "Physics Practical",
      "Chemistry Practical",
    ],
    maxMarks: [100, 100, 60, 60, 60, 60, 100, 100, 60, 60, 60, 60, 30, 30, 30, 30],
  },
  {
    name: "bipc-double-practical",
    coreSubjects: ["English", "Sanskrit", "Botany", "Zoology", "Physics", "Chemistry"],
    componentSubjects: [
      "English",
      "Sanskrit",
      "Botany",
      "Zoology",
      "Physics",
      "Chemistry",
      "English",
      "Sanskrit",
      "Botany",
      "Zoology",
      "Physics",
      "Chemistry",
      "Botany Practical",
      "Zoology Practical",
      "Physics Practical",
      "Chemistry Practical",
      "Botany Practical",
      "Zoology Practical",
      "Physics Practical",
      "Chemistry Practical",
    ],
    maxMarks: [100, 100, 60, 60, 60, 60, 100, 100, 60, 60, 60, 60, 30, 30, 30, 30, 30, 30, 30, 30],
  },
];

const getTelanganaAggregationOptions = (gradeKey) => ({
  gradeKey,
  aggregationEnabled: gradeKey === "grade12",
});

const hasTelanganaLayoutCoreSubjects = (subjectArea = "", layout) =>
  layout.coreSubjects.every((subject) =>
    subjectArea.includes(subject.toUpperCase().replace(/\s+/g, ""))
  );

const getTelanganaCoreSubjectsFromArea = (subjectArea = "") =>
  TELANGANA_GRADE12_COMPACT_LAYOUTS.find((layout) => hasTelanganaLayoutCoreSubjects(subjectArea, layout))?.coreSubjects || null;

const extractCertificateTotal = (text = "") => {
  const normalized = normalizeLine(text);
  const matches = [
    ...normalized.matchAll(
      /\b(?:grand\s+)?total\b[^0-9]{0,30}(\d{2,4})\s*(?:\/|out\s+of|of)?\s*(\d{2,4})?/gi
    ),
  ];
  const valid = matches
    .map((match) => ({
      marks: Number(match[1]),
      maxMarks: match[2] ? Number(match[2]) : null,
    }))
    .filter((total) => Number.isFinite(total.marks) && total.marks > 0);
  return valid.at(-1) || null;
};

const flagCertificateTotalMismatch = (result, text = "") => {
  if (result.grade !== "grade12" || result.parserName !== "telanganaIntermediate" || !result.subjects?.length) return result;
  const certificateTotal = extractCertificateTotal(text);
  if (!certificateTotal) return result;

  const calculatedMarks = result.subjects.reduce((sum, subject) => sum + (parseNumber(subject.marks) || 0), 0);
  const calculatedMax = result.subjects.reduce((sum, subject) => sum + (parseNumber(subject.maxMarks) || 0), 0);
  const maxMatches = !certificateTotal.maxMarks || calculatedMax === certificateTotal.maxMarks;
  const marksMatch = calculatedMarks === certificateTotal.marks;

  if (marksMatch && maxMatches) return result;
  return {
    ...result,
    needsReview: true,
    totalMismatch: {
      calculatedMarks,
      calculatedMax,
      certificateMarks: certificateTotal.marks,
      certificateMax: certificateTotal.maxMarks,
    },
  };
};

const splitCompactMarksByMax = (digits = "", maxMarks = []) => {
  let remaining = String(digits || "").replace(/\D/g, "");
  return maxMarks.map((max) => {
    if (!remaining) return null;
    const three = remaining.slice(0, 3);
    const two = remaining.slice(0, 2);
    const useThree =
      three.length === 3 &&
      Number(three) <= max &&
      (three.startsWith("0") || Number(two) > max);
    const chunk = useThree ? three : two;
    remaining = remaining.slice(chunk.length);
    const value = Number(chunk);
    return Number.isFinite(value) ? value : null;
  });
};

const getTelanganaGrade12CompactLayout = ({ gradeKey, subjectArea, securedText, text }) => {
  if (gradeKey !== "grade12") return null;

  const certificateTotal = extractCertificateTotal(text);
  const candidates = TELANGANA_GRADE12_COMPACT_LAYOUTS
    .filter((layout) => hasTelanganaLayoutCoreSubjects(subjectArea, layout))
    .map((layout) => {
      const securedMarks = splitCompactMarksByMax(securedText, layout.maxMarks);
      const valid =
        securedMarks.length === layout.maxMarks.length &&
        securedMarks.every((mark, index) => mark !== null && mark <= layout.maxMarks[index]);
      const calculatedMarks = valid ? securedMarks.reduce((sum, mark) => sum + mark, 0) : 0;
      const calculatedMax = valid ? layout.maxMarks.reduce((sum, mark) => sum + mark, 0) : 0;
      const matchesCertificate =
        valid &&
        certificateTotal &&
        calculatedMarks === certificateTotal.marks &&
        (!certificateTotal.maxMarks || calculatedMax === certificateTotal.maxMarks);

      return {
        layout,
        securedMarks,
        valid,
        calculatedMarks,
        calculatedMax,
        matchesCertificate,
      };
    })
    .filter((candidate) => candidate.valid);

  if (!candidates.length) return null;

  const best =
    candidates.find((candidate) => candidate.matchesCertificate) ||
    candidates.sort((a, b) => b.layout.maxMarks.length - a.layout.maxMarks.length)[0];

  return {
    subjectNames: best.layout.componentSubjects,
    maxMarks: best.layout.maxMarks,
    securedMarks: best.securedMarks,
  };
};

const parseTelanganaCompactFormat = ({ text, gradeKey, sourceDocument }) => {
  const compact = String(text || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!compact.includes("YEARSUBJECT")) {
    return buildResult({ text, gradeKey, subjects: [], parserName: "telanganaIntermediate" });
  }

  let subjectNames = [];
  let cursor = compact.indexOf("YEARSUBJECT") + "YEARSUBJECT".length;
  const sortedSubjects = [...TELANGANA_INTERMEDIATE_SUBJECTS].sort((a, b) => b.length - a.length);
  const maxMarker = compact.indexOf("MAXMARKS", cursor);
  const securedMarker = compact.indexOf("MARKSSECURED", cursor);
  const subjectEnd = Math.min(
    ...[maxMarker, securedMarker].filter((index) => index >= 0)
  );
  const subjectArea = subjectEnd > cursor ? compact.slice(cursor, subjectEnd) : compact.slice(cursor);

  const fixedLayoutSubjects = getTelanganaCoreSubjectsFromArea(subjectArea);
  if (fixedLayoutSubjects) {
    subjectNames = fixedLayoutSubjects;
  } else {
    while (cursor < compact.length) {
      const relativeCursor = cursor - (compact.indexOf("YEARSUBJECT") + "YEARSUBJECT".length);
      if (relativeCursor >= subjectArea.length) break;
      const remaining = subjectArea.slice(relativeCursor);
      const matched = sortedSubjects.find((subject) => remaining.startsWith(subject.replace(/\s+/g, "")));
      if (!matched) break;
      subjectNames.push(normalizeSubjectName(matched));
      cursor += matched.replace(/\s+/g, "").length;
    }
  }

  if (!subjectNames.length) {
    return buildResult({ text, gradeKey, subjects: [], parserName: "telanganaIntermediate" });
  }

  const maxText = compact.includes("MAXMARKS")
    ? compact.slice(compact.indexOf("MAXMARKS") + "MAXMARKS".length, compact.indexOf("MARKSSECURED") > 0 ? compact.indexOf("MARKSSECURED") : undefined)
    : "";
  const securedText = compact.includes("MARKSSECURED")
    ? compact.slice(compact.indexOf("MARKSSECURED") + "MARKSSECURED".length)
    : "";
  const grade12Layout = getTelanganaGrade12CompactLayout({ gradeKey, subjectArea, securedText, text });
  if (grade12Layout) {
    subjectNames = grade12Layout.subjectNames;
  }
  let maxMarks = grade12Layout?.maxMarks || parseCompactMaxMarks(maxText, subjectNames);
  if (!maxMarks.length) maxMarks = subjectNames.map(getTelanganaDefaultMax);
  const parsedMaxMarks = maxText.match(/\d{2,3}/g)?.map(Number) || [];
  if (!grade12Layout && parsedMaxMarks.length === subjectNames.length && parsedMaxMarks.every((mark) => mark <= 150)) {
    maxMarks = parsedMaxMarks;
  }
  let securedMarks = grade12Layout?.securedMarks || [...securedText.matchAll(/(\d{1,3})P/g)].map((match) => Number(match[1]));
  if (securedMarks.length !== subjectNames.length || securedMarks.some((mark, index) => mark > maxMarks[index])) {
    securedMarks = splitCompactMarksByMax(securedText, maxMarks);
  }
  console.log("Telangana secured marks:", securedMarks);
  const count = Math.min(subjectNames.length, maxMarks.length, securedMarks.length);
  const subjects = [];
  const seen = new Set();
  const aggregationOptions = getTelanganaAggregationOptions(gradeKey);

  for (let index = 0; index < count; index += 1) {
    addUniqueSubject(
      subjects,
      seen,
      makeSubject({
        subject: subjectNames[index],
        obtainedMarks: securedMarks[index],
        maxMarks: maxMarks[index],
        confidence: 0.92,
        sourceDocument,
        reviewRequired: securedMarks[index] > maxMarks[index],
      }),
      aggregationOptions
    );
  }

  return buildResult({ text, gradeKey, subjects, parserName: "telanganaIntermediate" });
};

export const parseTelanganaIntermediate = ({ extractedText, gradeKey, sourceDocument }) => {
  const text = String(extractedText || "").replace(/\r/g, "\n");
  if (
    !/TELANGANA\s+STATE\s+BOARD\s+OF\s+INTERMEDIATE\s+EDUCATION/i.test(text) &&
    !/Intermediate\s+Public\s+Examination/i.test(text)
  ) {
    return buildResult({ text, gradeKey, subjects: [], parserName: "telanganaIntermediate" });
  }

  const columnResult = parseTelanganaColumnFormat({ text, gradeKey, sourceDocument });
  const verticalResult = parseTelanganaVerticalFormat({ text, gradeKey, sourceDocument });
  const compactResult = parseTelanganaCompactFormat({ text, gradeKey, sourceDocument });
  const best = [columnResult, verticalResult, compactResult].sort(
    (a, b) => b.subjects.length - a.subjects.length
  )[0];
  console.log("Telangana parsed subjects:", best.subjects);
  return flagCertificateTotalMismatch(best, text);
};

const selectIntermediateMarks = ({ gradeKey, firstMarks, secondMarks }) => {
  if (gradeKey === "grade11") return firstMarks;
  if (gradeKey === "grade12") return secondMarks;
  return secondMarks ?? firstMarks;
};

const parseAndhraPradeshColumnFormat = ({ text, gradeKey, sourceDocument }) => {
  const flattened = normalizeLine(text.replace(/\n/g, " "));
  const subjectText = findTextAfterLabel(flattened, /\bSUBJECT\b/i, [
    /\b(?:FIRST\s+YEAR|I\s+YEAR|1ST\s+YEAR|Max\s+Marks)\b/i,
    /\bMarks\s+Secured\b/i,
    /\bResult\b/i,
  ]);

  const subjectNames = tokenizeIntermediateSubjects(subjectText, ANDHRA_PRADESH_INTERMEDIATE_SUBJECTS);
  const subjects = [];
  const seen = new Set();
  if (!subjectNames.length) return buildResult({ text, gradeKey, subjects, parserName: "andhraPradeshIntermediate" });

  const numbersAfterSubject = flattened.slice(flattened.search(/\bSUBJECT\b/i)).match(/\b\d{1,3}\b/g)?.map(Number) || [];
  const expectedColumns = numbersAfterSubject.length >= subjectNames.length * 4 ? 4 : 2;

  subjectNames.forEach((subjectName, index) => {
    const offset = index * expectedColumns;
    const firstMax = numbersAfterSubject[offset];
    const firstMarks = numbersAfterSubject[offset + 1];
    const secondMax = expectedColumns === 4 ? numbersAfterSubject[offset + 2] : firstMax;
    const secondMarks = expectedColumns === 4 ? numbersAfterSubject[offset + 3] : firstMarks;
    const selectedMarks = selectIntermediateMarks({ gradeKey, firstMarks, secondMarks });
    const selectedMax = gradeKey === "grade11" ? firstMax : secondMax;
    if (selectedMarks === undefined || selectedMax === undefined) return;

    addUniqueSubject(
      subjects,
      seen,
      makeSubject({
        subject: subjectName,
        obtainedMarks: selectedMarks,
        maxMarks: selectedMax,
        confidence: 0.84,
        sourceDocument,
        reviewRequired: selectedMarks > selectedMax,
      })
    );
  });

  return buildResult({ text, gradeKey, subjects, parserName: "andhraPradeshIntermediate" });
};

const parseAndhraPradeshLineFormat = ({ text, gradeKey, sourceDocument }) => {
  const lines = getLinesBeforeStop(text);
  const subjects = [];
  const seen = new Set();
  const subjectSet = new Set(ANDHRA_PRADESH_INTERMEDIATE_SUBJECTS);

  lines.forEach((line) => {
    const clean = normalizeLine(line);
    const upper = clean.toUpperCase();
    const subject = [...subjectSet]
      .sort((a, b) => b.length - a.length)
      .find((name) => upper === name || upper.startsWith(`${name} `));
    if (!subject || TELANGANA_IGNORE_SUBJECT_PATTERN.test(subject)) return;

    const numbers = [...clean.matchAll(new RegExp(numberPattern, "g"))]
      .map((match) => parseNumber(match[0]))
      .filter((value) => value !== null);
    if (numbers.length < 2) return;

    const firstMax = numbers[0];
    const firstMarks = numbers[1];
    const secondMax = numbers.length >= 4 ? numbers[2] : numbers[0];
    const secondMarks = numbers.length >= 4 ? numbers[3] : numbers[1];
    const selectedMarks = selectIntermediateMarks({ gradeKey, firstMarks, secondMarks });
    const selectedMax = gradeKey === "grade11" ? firstMax : secondMax;

    addUniqueSubject(
      subjects,
      seen,
      makeSubject({
        subject,
        obtainedMarks: selectedMarks,
        maxMarks: selectedMax,
        confidence: 0.88,
        sourceDocument,
        reviewRequired: selectedMarks > selectedMax,
      })
    );
  });

  return buildResult({ text, gradeKey, subjects, parserName: "andhraPradeshIntermediate" });
};

export const parseAndhraPradeshIntermediate = ({ extractedText, gradeKey, sourceDocument }) => {
  const text = String(extractedText || "").replace(/\r/g, "\n");
  if (!/ANDHRA\s+PRADESH|BIEAP/i.test(text) || !/INTERMEDIATE/i.test(text)) {
    return buildResult({ text, gradeKey, subjects: [], parserName: "andhraPradeshIntermediate" });
  }

  const columnResult = parseAndhraPradeshColumnFormat({ text, gradeKey, sourceDocument });
  const lineResult = parseAndhraPradeshLineFormat({ text, gradeKey, sourceDocument });
  return lineResult.subjects.length > columnResult.subjects.length ? lineResult : columnResult;
};

export const parseCbseClass10 = ({ extractedText, gradeKey, sourceDocument }) => {
  const lines = getLinesBeforeStop(extractedText);
  const subjects = [];
  const seen = new Set();
  const marksRegex = /^\d{1,3}$/;
  const wordsRegex = /^[A-Z\s-]+$/i;
  const gradeRegex = new RegExp(`^${gradePattern}$`, "i");
  const cbseClass10SubjectsByCode = {
    "184": "English",
    "085": "Hindi",
    "041": "Mathematics",
    "086": "Science",
    "087": "Social Science",
  };
  const addCbseSubject = ({ code, subjectName, total, grade = "", confidence = 0.96 }) => {
    const expectedSubject = cbseClass10SubjectsByCode[code] || subjectName;
    const totalMarks = Number(total);
    if (!/^\d{3}$/.test(code) || !Number.isFinite(totalMarks)) return;

    addUniqueSubject(
      subjects,
      seen,
      makeSubject({
        subject: expectedSubject,
        obtainedMarks: totalMarks,
        maxMarks: 100,
        letterGrade: grade,
        confidence,
        sourceDocument,
        reviewRequired: totalMarks > 100,
      })
    );
  };

  const flattenedText = normalizeLine(String(extractedText || "").replace(/\n/g, " "));
  Object.entries(cbseClass10SubjectsByCode).forEach(([code, expectedSubject]) => {
    const rowRegex = new RegExp(
      `(?:^|\\s)${code}\\s+([A-Z][A-Z &.\\-]*?)\\s+(\\d{3})\\s+(\\d{3})\\s+(\\d{3})(?:\\s|$)`,
      "i"
    );
    const match = flattenedText.match(rowRegex);
    if (!match) return;
    addCbseSubject({
      code,
      subjectName: expectedSubject,
      total: match[4],
      confidence: 0.97,
    });
  });

  const cbseRegex =
    /^(\d{3})\s+([A-Z][A-Z &.-]+?)\s+(\d{3})\s+(\d{3})\s+(\d{3})\s+([A-Z ]+?)\s+(A1|A2|B1|B2|C1|C2|D1|D2|E)$/gim;

  for (const compactMatch of String(extractedText || "").matchAll(cbseRegex)) {
    const [, code, subjectName, theory, internal, total, totalWords, grade] = compactMatch;
    if (!/^\d{3}$/.test(code)) continue;
    if (![theory, internal, total].every((value) => marksRegex.test(value))) continue;
    if (!wordsRegex.test(totalWords) || marksRegex.test(totalWords)) continue;

    addCbseSubject({ code, subjectName, total, grade, confidence: 0.96 });
  }

  for (let index = 0; index <= lines.length - 7; index += 1) {
    const [code, subjectName, theory, internal, total, totalWords, grade] = lines.slice(index, index + 7);
    if (!/^\d{3}$/.test(code)) continue;
    if (!/[A-Z]/i.test(subjectName) || marksRegex.test(subjectName)) continue;
    if (!marksRegex.test(theory) || !marksRegex.test(internal) || !marksRegex.test(total)) continue;
    if (!wordsRegex.test(totalWords) || marksRegex.test(totalWords)) continue;
    if (!gradeRegex.test(grade)) continue;

    addCbseSubject({ code, subjectName, total, grade, confidence: 0.92 });
    index += 6;
  }

  console.log("CBSE parsed subjects:", subjects);
  console.log("CBSE subjects count:", subjects.length);
  return {
    ...buildResult({ text: extractedText, gradeKey, subjects, parserName: "cbseClass10" }),
    needsReview: subjects.length > 0 && subjects.length < 5,
  };
};

export const parseSchoolReportCard = ({ extractedText, gradeKey, sourceDocument }) => {
  const lines = getLinesBeforeStop(extractedText);
  const text = lines.join("\n");
  const subjects = [];
  const seen = new Set();
  const knownSubjects = ACADEMIC_SUBJECTS
    .filter((subject) => !shouldExcludeSubject(subject))
    .sort((a, b) => b.length - a.length);

  knownSubjects.forEach((subjectName) => {
    const escaped = subjectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\./g, "\\.?");
    const rowRegex = new RegExp(`\\b${escaped}\\b\\s+((?:${numberPattern}\\s+){2,})${gradePattern}\\b`, "i");
    const match = text.match(rowRegex);
    if (!match) return;

    const numbers = [...match[1].matchAll(new RegExp(numberPattern, "g"))]
      .map((item) => parseNumber(item[0]))
      .filter((item) => item !== null);
    if (!numbers.length) return;

    addUniqueSubject(
      subjects,
      seen,
      makeSubject({
        subject: subjectName,
        obtainedMarks: numbers[numbers.length - 1],
        maxMarks: /100\s*marks|academic\s+year\s*\(\s*100/i.test(extractedText) ? 100 : 100,
        letterGrade: match[2],
        confidence: 0.9,
        sourceDocument,
        reviewRequired: false,
      })
    );
  });

  for (let index = 0; index < lines.length - 1; index += 1) {
    const subjectName = getAcademicSubjectName(lines[index]);
    if (!subjectName) continue;

    const scoreLine = lines[index + 1];
    const scoreMatch = scoreLine.match(new RegExp(`^(${numberPattern})(?:\\s+${gradePattern})?$`, "i"));
    if (!scoreMatch) continue;

    addUniqueSubject(
      subjects,
      seen,
      makeSubject({
        subject: subjectName,
        obtainedMarks: parseNumber(scoreMatch[1]),
        maxMarks: 100,
        letterGrade: scoreMatch[2] || "",
        confidence: 0.88,
        sourceDocument,
        reviewRequired: false,
      })
    );
    index += 1;
  }

  return buildResult({ text: extractedText, gradeKey, subjects, parserName: "schoolReportCard" });
};

export const parseSeniorSecondary = ({ extractedText, gradeKey, sourceDocument }) => {
  const lines = getLinesBeforeStop(extractedText);
  const subjects = [];
  const seen = new Set();
  const subjectAlternation = ACADEMIC_SUBJECTS
    .filter((subject) => !shouldExcludeSubject(subject))
    .sort((a, b) => b.length - a.length)
    .map((subject) => subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\./g, "\\.?"))
    .join("|");
  const subjectRegex = new RegExp(`^(${subjectAlternation})\\b\\s*(.*)$`, "i");

  lines.forEach((line) => {
    const clean = normalizeLine(line);
    const match = clean.match(subjectRegex);
    if (!match) return;

    const subjectName = match[1];
    const rest = match[2] || "";
    const gradeMatch = rest.match(new RegExp(`\\b${gradePattern}\\b`, "i"));
    const grade = gradeMatch?.[1] || "";
    const slashMatch = rest.match(new RegExp(`(${numberPattern})\\s*\\/\\s*(${numberPattern})`, "i"));

    if (slashMatch) {
      addUniqueSubject(
        subjects,
        seen,
        makeSubject({
          subject: subjectName,
          obtainedMarks: parseNumber(slashMatch[1]),
          maxMarks: parseNumber(slashMatch[2]),
          letterGrade: grade,
          confidence: 0.88,
          sourceDocument,
          reviewRequired: false,
        })
      );
      return;
    }

    const numbers = [...rest.matchAll(new RegExp(numberPattern, "g"))]
      .map((item) => parseNumber(item[0]))
      .filter((item) => item !== null);

    if (numbers.length >= 3) {
      const total = numbers[numbers.length - 1];
      addUniqueSubject(
        subjects,
        seen,
        makeSubject({
          subject: subjectName,
          obtainedMarks: total,
          maxMarks: total <= 100 ? 100 : Math.max(...numbers),
          letterGrade: grade,
          confidence: 0.84,
          sourceDocument,
          reviewRequired: total > 100,
        })
      );
      return;
    }

    if (numbers.length >= 2) {
      const max = Math.max(...numbers);
      const obtained = numbers.find((number) => number !== max) ?? numbers[numbers.length - 1];
      addUniqueSubject(
        subjects,
        seen,
        makeSubject({
          subject: subjectName,
          obtainedMarks: obtained,
          maxMarks: max,
          letterGrade: grade,
          confidence: 0.78,
          sourceDocument,
          reviewRequired: ![100, 80, 70, 60, 50, 30].includes(max),
        })
      );
      return;
    }

    if (grade) {
      addUniqueSubject(
        subjects,
        seen,
        makeSubject({
          subject: subjectName,
          letterGrade: grade,
          confidence: 0.72,
          sourceDocument,
          reviewRequired: true,
        })
      );
    }
  });

  return buildResult({ text: extractedText, gradeKey, subjects, parserName: "seniorSecondary" });
};

const splitTableRow = (line = "") => {
  if (line.includes("|")) {
    return line
      .split("|")
      .map((cell) => normalizeLine(cell))
      .filter(Boolean);
  }
  return normalizeLine(line)
    .split(/\s{2,}|\t+/)
    .map((cell) => normalizeLine(cell))
    .filter(Boolean);
};

const getColumnKind = (header = "") => {
  const clean = normalizeLine(header).toLowerCase();
  if (/subject|paper|course|module|title|name/.test(clean)) return "subject";
  if (/max|maximum|out\s*of|full\s*marks|credits?\s*$/.test(clean) && !/secured|obtained/.test(clean)) {
    return /credit/.test(clean) ? "credits" : "max";
  }
  if (/marks?\s*(secured|obtained)|obtained|secured/.test(clean)) return "obtained";
  if (/theory|external/.test(clean)) return "theory";
  if (/practical|lab/.test(clean)) return "practical";
  if (/internal|assessment|sessional/.test(clean)) return "internal";
  if (/total|aggregate/.test(clean)) return "total";
  if (/grade\s*points?|points?/.test(clean)) return "gradePoint";
  if (/grade/.test(clean)) return "grade";
  if (/credits?/.test(clean)) return "credits";
  return "";
};

const mapHeaderColumns = (cells = []) => {
  const map = {};
  cells.forEach((cell, index) => {
    const kind = getColumnKind(cell);
    if (kind && map[kind] === undefined) map[kind] = index;
  });
  return map;
};

const valueAt = (cells, index) => (index === undefined ? "" : cells[index] || "");

const numericFromCell = (cell = "") => {
  const match = String(cell).match(new RegExp(numberPattern));
  return match ? parseNumber(match[0]) : null;
};

const parseGenericTableRows = ({ extractedText, gradeKey, sourceDocument }) => {
  const rawLines = String(extractedText || "")
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map((line) => String(line || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const stopIndex = rawLines.findIndex((line) => STOP_SECTION_PATTERN.test(line));
  const lines = stopIndex >= 0 ? rawLines.slice(0, stopIndex) : rawLines;
  const subjects = [];
  const seen = new Set();
  let headerMap = null;

  lines.forEach((line) => {
    const cells = splitTableRow(line);
    if (cells.length < 2) return;

    const candidateHeaderMap = mapHeaderColumns(cells);
    if (candidateHeaderMap.subject !== undefined && Object.keys(candidateHeaderMap).length >= 2) {
      headerMap = candidateHeaderMap;
      return;
    }

    if (headerMap?.subject === undefined && !cells.some((cell) => getAcademicSubjectName(cell))) return;

    const subjectCell = headerMap?.subject !== undefined
      ? valueAt(cells, headerMap.subject)
      : cells.find((cell) => getAcademicSubjectName(cell)) || cells[0];
    const subjectName = getAcademicSubjectName(subjectCell);
    if (!subjectName) return;

    const total = numericFromCell(valueAt(cells, headerMap?.total));
    const obtained = numericFromCell(valueAt(cells, headerMap?.obtained));
    const theory = numericFromCell(valueAt(cells, headerMap?.theory));
    const practical = numericFromCell(valueAt(cells, headerMap?.practical));
    const internal = numericFromCell(valueAt(cells, headerMap?.internal));
    const max = numericFromCell(valueAt(cells, headerMap?.max));
    const grade = valueAt(cells, headerMap?.grade).match(new RegExp(`(^|\\s)${gradePattern}(?=\\s|$)`, "i"))?.[2] || "";
    const gradePoint = numericFromCell(valueAt(cells, headerMap?.gradePoint));
    const componentTotal = [theory, practical, internal].filter((value) => value !== null).reduce((sum, value) => sum + value, 0);
    const marks = total ?? obtained ?? (componentTotal > 0 ? componentTotal : null);

    if (marks !== null) {
      addUniqueSubject(
        subjects,
        seen,
        makeSubject({
          subject: subjectName,
          obtainedMarks: marks,
          maxMarks: max || (marks <= 10 ? 10 : marks <= 100 ? 100 : Math.max(marks, 100)),
          letterGrade: grade,
          confidence: headerMap?.total !== undefined ? 0.82 : 0.72,
          sourceDocument,
          reviewRequired: !max || (max > 0 && marks > max),
        })
      );
      return;
    }

    if (grade || gradePoint !== null) {
      addUniqueSubject(
        subjects,
        seen,
        makeSubject({
          subject: subjectName,
          letterGrade: grade,
          gradePoint: gradePoint !== null ? gradePoint : "",
          maxMarks: gradePoint !== null ? 10 : 100,
          confidence: 0.66,
          sourceDocument,
          reviewRequired: true,
        })
      );
    }
  });

  return buildResult({ text: extractedText, gradeKey, subjects, parserName: "genericTableParser" });
};

export const parseGenericSubjectMarks = ({ extractedText, gradeKey, sourceDocument }) => {
  const tableResult = parseGenericTableRows({ extractedText, gradeKey, sourceDocument });
  if (tableResult.subjects.length) return tableResult;

  const lines = getLinesBeforeStop(extractedText);
  const subjects = [];
  const seen = new Set();

  lines.forEach((line) => {
    const clean = normalizeLine(line).replace(/^\d{1,4}\s+(?=[A-Za-z])/, "");
    if (!/[A-Za-z]/.test(clean)) return;
    if (shouldExcludeSubject(clean)) return;

    const gradeMatch = clean.match(new RegExp(`\\b${gradePattern}\\b`, "i"));
    const slashMatch = clean.match(new RegExp(`^([A-Za-z][A-Za-z &()./-]{2,}?)\\s+(${numberPattern})\\s*\\/\\s*(${numberPattern})(?:\\s+${gradePattern})?`, "i"));
    if (slashMatch) {
      addUniqueSubject(
        subjects,
        seen,
        makeSubject({
          subject: slashMatch[1],
          obtainedMarks: parseNumber(slashMatch[2]),
          maxMarks: parseNumber(slashMatch[3]),
          letterGrade: gradeMatch?.[1] || "",
          confidence: 0.78,
          sourceDocument,
          reviewRequired: false,
        })
      );
      return;
    }

    const numbers = [...clean.matchAll(new RegExp(numberPattern, "g"))]
      .map((item) => ({ value: parseNumber(item[0]), index: item.index }))
      .filter((item) => item.value !== null);
    const subjectPart = numbers.length ? clean.slice(0, numbers[0].index).trim() : clean.replace(new RegExp(`\\b${gradePattern}\\b`, "ig"), "").trim();
    if (subjectPart.length < 3 || !/[A-Za-z]/.test(subjectPart)) return;
    if (!getAcademicSubjectName(subjectPart)) return;

    if (numbers.length >= 2) {
      const values = numbers.map((item) => item.value);
      const max = values.includes(100) ? 100 : Math.max(...values);
      const obtained = values[values.length - 1] <= max ? values[values.length - 1] : Math.min(...values);
      addUniqueSubject(
        subjects,
        seen,
        makeSubject({
          subject: subjectPart,
          obtainedMarks: obtained,
          maxMarks: max,
          letterGrade: gradeMatch?.[1] || "",
          confidence: 0.7,
          sourceDocument,
          reviewRequired: max !== 100 && max > 10,
        })
      );
      return;
    }

    if (gradeMatch) {
      addUniqueSubject(
        subjects,
        seen,
        makeSubject({
          subject: subjectPart,
          letterGrade: gradeMatch[1],
          confidence: 0.62,
          sourceDocument,
          reviewRequired: true,
        })
      );
    }
  });

  return buildResult({ text: extractedText, gradeKey, subjects, parserName: "genericSubjectMarks" });
};

export const runGradeFallbackParsers = ({ extractedText, gradeKey, sourceDocument, skipTelangana = false, boardType = "" }) => {
  if (boardType === BOARD_TYPES.CBSE) {
    const cbse = parseCbseClass10({ extractedText, gradeKey, sourceDocument });
    console.log("CBSE parser subjects:", cbse.subjects);
    if (cbse.subjects.length >= 3) {
      console.log("Telangana parser subjects:", 0);
      console.log("School parser subjects:", 0);
      console.log("Senior secondary parser subjects:", 0);
      console.log("Generic parser subjects:", 0);
      return cbse;
    }
  }

  if (!skipTelangana && (!boardType || boardType === BOARD_TYPES.TELANGANA_INTERMEDIATE)) {
    const telangana = parseTelanganaIntermediate({ extractedText, gradeKey, sourceDocument });
    console.log("Telangana parser subjects:", telangana.subjects);
    if (telangana.subjects.length) {
      console.log("CBSE parser subjects:", 0);
      console.log("School parser subjects:", 0);
      console.log("Senior secondary parser subjects:", 0);
      console.log("Generic parser subjects:", 0);
      return telangana;
    }
  }

  if (!boardType || boardType === BOARD_TYPES.ANDHRA_PRADESH_INTERMEDIATE) {
    const andhra = parseAndhraPradeshIntermediate({ extractedText, gradeKey, sourceDocument });
    console.log("Andhra Pradesh parser subjects:", andhra.subjects.length);
    if (andhra.subjects.length) {
      console.log("CBSE parser subjects:", 0);
      console.log("School parser subjects:", 0);
      console.log("Senior secondary parser subjects:", 0);
      console.log("Generic parser subjects:", 0);
      return andhra;
    }
  }

  const genericTable = parseGenericSubjectMarks({ extractedText, gradeKey, sourceDocument });
  if (genericTable.parserName === "genericTableParser" && genericTable.subjects.length) {
    console.log("CBSE parser subjects:", 0);
    console.log("School parser subjects:", 0);
    console.log("Senior secondary parser subjects:", 0);
    console.log("Generic parser subjects:", genericTable.subjects.length);
    return genericTable;
  }

  if (boardType !== BOARD_TYPES.CBSE) {
    const cbse = parseCbseClass10({ extractedText, gradeKey, sourceDocument });
    console.log("CBSE parser subjects:", cbse.subjects);
    if (cbse.subjects.length >= 3) {
      console.log("School parser subjects:", 0);
      console.log("Senior secondary parser subjects:", 0);
      console.log("Generic parser subjects:", 0);
      return cbse;
    }
  }

  const school = parseSchoolReportCard({ extractedText, gradeKey, sourceDocument });
  console.log("School parser subjects:", school.subjects.length);
  if (school.subjects.length) {
    console.log("Senior secondary parser subjects:", 0);
    console.log("Generic parser subjects:", 0);
    return school;
  }

  const senior = parseSeniorSecondary({ extractedText, gradeKey, sourceDocument });
  console.log("Senior secondary parser subjects:", senior.subjects.length);
  if (senior.subjects.length) {
    console.log("Generic parser subjects:", 0);
    return senior;
  }

  const generic = genericTable.subjects.length
    ? genericTable
    : parseGenericSubjectMarks({ extractedText, gradeKey, sourceDocument });
  console.log("Generic parser subjects:", generic.subjects.length);
  return generic;
};
