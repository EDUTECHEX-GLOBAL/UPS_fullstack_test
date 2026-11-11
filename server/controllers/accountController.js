import Account from "../models/accountModel.js";
import AllDocument from "../models/AllDocumentModel.js";
import Otp from "../models/otpModel.js";
import { sendEmail, sendEmailEnhanced, sendPasswordResetOTPEmail } from "../utils/sendEmail.js";
import Notification from "../models/notificationModel.js";
import { createNewUserNotification } from "./notificationController.js";
import { S3Client, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { TextractClient, AnalyzeDocumentCommand, DetectDocumentTextCommand, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } from "@aws-sdk/client-textract";
import jwt from "jsonwebtoken";
import fs from "fs";
import os from "os";
import path from "path";
import { fromBuffer } from "pdf2pic";
import { buildFileUrl, resolveS3FileKey } from "../utils/s3FileKey.js";

// =====================================================
// AWS CLIENTS
// =====================================================
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const textract = new TextractClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET;

// =====================================================
// HELPERS
// =====================================================

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateToken = (userId, email, studentType) => {
  return jwt.sign(
    { userId, email, studentType },
    process.env.JWT_SECRET || "your-secret-key-change-in-production",
    { expiresIn: "7d" }
  );
};

const NAME_REGEX = /^[A-Za-z\s]+$/;
const PHONE_REGEX = /^\d{10}$/;
const EMAIL_REGEX = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i;

const normalizeName = (value = "") => String(value).replace(/\s+/g, " ").trim();
const cleanAccountText = (value = "") => String(value ?? "").trim();
const formatCaid = (accountId) => {
  const id = cleanAccountText(accountId);
  if (!id) return "";
  if (id.startsWith("CAID")) return id;
  return `CAID ${id.slice(-8).toUpperCase()}`;
};
const escapeAccountRegex = (value = "") => cleanAccountText(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const formatDateForProfileInput = (dateValue) => {
  if (!dateValue) return "";
  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const buildPassportFileMetadata = (file = {}) => {
  const fileKey = resolveS3FileKey(file.key || file.location || "");
  const fileName = file.filename || (fileKey ? path.basename(fileKey) : "");

  return {
    passportFileName: fileName,
    passportFileKey: fileKey,
    passportFileUrl: buildFileUrl(fileKey),
    passportOriginalName: file.originalname || fileName,
    passportFileType: file.mimetype || path.extname(fileName).replace(/^\./, "").toLowerCase(),
    passportFileSize: Number(file.size || 0),
    passportUploadedAt: new Date(),
    passportValidationStatus: "pending",
  };
};
const hasInitialDocumentFile = (document = {}) =>
  Boolean(document?.fileName || document?.originalName || document?.fileKey || document?.s3Key || document?.fileUrl);

const normalizeInitialDocument = (document = {}, documentType = "") => {
  if (!hasInitialDocumentFile(document)) return null;

  const fileKey = resolveS3FileKey(document.fileKey || document.s3Key || document.key || document.fileUrl || "");
  const fileName = document.fileName || (fileKey ? path.basename(fileKey) : document.originalName || "Uploaded file");
  const originalName = document.originalName || fileName;
  const mimeType = document.mimeType || document.fileType || "";
  const extension = path.extname(originalName || fileName).replace(/^\./, "").toLowerCase();

  return {
    fileName,
    fileKey,
    fileUrl: fileKey ? buildFileUrl(fileKey) : (document.fileUrl || ""),
    bucket: document.bucket || BUCKET_NAME || "",
    originalName,
    fileType: extension || mimeType.split("/").pop() || "",
    mimeType,
    fileSize: Number(document.fileSize || document.size || 0),
    size: Number(document.size || document.fileSize || 0),
    uploadedAt: document.uploadedAt ? new Date(document.uploadedAt) : new Date(),
    documentStatus: document.documentStatus || "pending",
    generated: false,
    source: "all-documents",
    status: "uploaded",
    extractionStatus: document.extractionStatus || "",
    documentType,
  };
};

const copyIfEmpty = (target, field, fileData) => {
  if (!fileData) return false;
  const current = target[field] || {};
  if (current.fileName || current.originalName || current.fileKey || current.fileUrl) return false;
  target[field] = fileData;
  return true;
};

export const persistInitialUploadedDocuments = async (userId, uploadedDocuments = {}) => {
  if (!userId || !uploadedDocuments || typeof uploadedDocuments !== 'object') return;

  const masterMap = {
    passport: 'passport',
    photo: 'photo',
    cv: 'resumeCv',
    grade10: 'cert10th',
    grade11: 'cert11th',
    grade12: 'cert12th',
  };
  const languageScoreFields = ['ielts', 'toefl', 'duolingo', 'pte'];
  const standardizedScoreFields = ['sat', 'act', 'ap', 'ib'];

  const languageDoc = languageScoreFields
    .map((field) => normalizeInitialDocument(uploadedDocuments.testScores?.[field], 'languageProficiency'))
    .find(Boolean);

  const testScoreDoc = standardizedScoreFields
    .map((field) => normalizeInitialDocument(uploadedDocuments.testScores?.[field], 'testScores'))
    .find(Boolean);

  let masterDocuments = {};
  let masterChanged = false;
  Object.entries(masterMap).forEach(([sourceField, targetField]) => {
    masterChanged = copyIfEmpty(
      masterDocuments,
      targetField,
      normalizeInitialDocument(uploadedDocuments[sourceField], targetField)
    ) || masterChanged;
  });
  masterChanged = copyIfEmpty(masterDocuments, 'englishCertificate', languageDoc) || masterChanged;
  masterChanged = copyIfEmpty(masterDocuments, 'testScores', testScoreDoc) || masterChanged;

  // if (masterChanged) await masterDocuments.save();
};

// PASSPORT MRZ PARSER HELPERS
// =====================================================

const isoToCountryName = (code) => {
  if (!code) return '';
  const map = {
    IND: "India", USA: "United States", GBR: "United Kingdom",
    CAN: "Canada", AUS: "Australia", DEU: "Germany", FRA: "France",
    CHN: "China", JPN: "Japan", KOR: "South Korea", PAK: "Pakistan",
    BGD: "Bangladesh", LKA: "Sri Lanka", NPL: "Nepal", MMR: "Myanmar",
    PHL: "Philippines", IDN: "Indonesia", MYS: "Malaysia", SGP: "Singapore",
    THA: "Thailand", VNM: "Vietnam", NGA: "Nigeria", GHA: "Ghana",
    KEN: "Kenya", ZAF: "South Africa", EGY: "Egypt", MAR: "Morocco",
    BRA: "Brazil", MEX: "Mexico", ARG: "Argentina", COL: "Colombia",
    SAU: "Saudi Arabia", ARE: "United Arab Emirates", IRN: "Iran",
    TUR: "Turkey", RUS: "Russia", UKR: "Ukraine", POL: "Poland",
    ITA: "Italy", ESP: "Spain", PRT: "Portugal", NLD: "Netherlands",
    BEL: "Belgium", CHE: "Switzerland", SWE: "Sweden", NOR: "Norway",
    DNK: "Denmark", FIN: "Finland", NZL: "New Zealand", ZWE: "Zimbabwe",
    ETH: "Ethiopia", UGA: "Uganda", TZA: "Tanzania", IRQ: "Iraq",
    SYR: "Syria", JOR: "Jordan", LBN: "Lebanon", ISR: "Israel",
    AFG: "Afghanistan", UZB: "Uzbekistan", KAZ: "Kazakhstan",
  };
  return map[code.toUpperCase()] || code;
};

const mrzDateToISO = (mrzDate, isExpiry = false) => {
  if (!mrzDate || mrzDate.length !== 6) return "";
  if (!/^\d{6}$/.test(mrzDate)) return "";
  const yy = parseInt(mrzDate.substring(0, 2), 10);
  const mm = mrzDate.substring(2, 4);
  const dd = mrzDate.substring(4, 6);
  let year;
  if (isExpiry) {
    year = yy < 70 ? 2000 + yy : 1900 + yy;
  } else {
    year = yy <= 30 ? 2000 + yy : 1900 + yy;
  }
  return `${year}-${mm}-${dd}`;
};

const parseDateStringToISO = (value = "") => {
  const cleaned = String(value).trim();
  if (!cleaned) return "";

  const numeric = cleaned.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (numeric) {
    const day = numeric[1].padStart(2, "0");
    const month = numeric[2].padStart(2, "0");
    let year = numeric[3];
    if (year.length === 2) year = Number(year) > 30 ? `19${year}` : `20${year}`;
    return `${year}-${month}-${day}`;
  }

  const monthNames = {
    jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03",
    apr: "04", april: "04", may: "05", jun: "06", june: "06", jul: "07", july: "07",
    aug: "08", august: "08", sep: "09", sept: "09", september: "09", oct: "10", october: "10",
    nov: "11", november: "11", dec: "12", december: "12",
  };
  const text = cleaned.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})/);
  if (text) {
    const day = text[1].padStart(2, "0");
    const month = monthNames[text[2].toLowerCase()];
    let year = text[3];
    if (!month) return "";
    if (year.length === 2) year = Number(year) > 30 ? `19${year}` : `20${year}`;
    return `${year}-${month}-${day}`;
  }

  return "";
};

const compactOcrText = (value = "") => String(value)
  .replace(/[\r\n]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const normalizePassportLabel = (value = "") => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const getNextUsefulLine = (lines, startIndex) => {
  for (let i = startIndex + 1; i < Math.min(lines.length, startIndex + 5); i += 1) {
    const value = compactOcrText(lines[i]);
    if (value && !/^(\/|:|-|\.)+$/.test(value)) return value;
  }
  return "";
};

const findLineValueAfterLabel = (lines, labelPattern) => {
  for (let i = 0; i < lines.length; i += 1) {
    const line = compactOcrText(lines[i]);
    if (!line) continue;
    const inlineMatch = line.match(labelPattern);
    if (inlineMatch?.[1]) return compactOcrText(inlineMatch[1]);
    if (labelPattern.test(line)) return getNextUsefulLine(lines, i);
  }
  return "";
};
const PASSPORT_NUMBER_LABEL_PATTERN = /\b(?:passport\s*(?:no\b|number\b|#)|document\s*(?:no\b|number\b|#)|travel\s+document\s*(?:no\b|number\b|#))/i;
const REJECTED_PASSPORT_NUMBER_LABEL_PATTERN = /\b(?:file\s*(?:no|number)|old\s+passport\s*(?:no|number)?|application\s*(?:no|number))\b/i;
const PASSPORT_NUMBER_SEARCH_STOP_PATTERN = /\b(?:pin(?:code)?|postal\s*code|zip(?:\s*code)?|phone|mobile|telephone|tel\.?|address|city|state|place\s+of\s+issue|date\s+of\s+(?:issue|expiry|birth)|surname|given\s+name|nationality|sex)\b/i;

const isLikelyPassportNumber = (value = "") => {
  const rawValue = compactOcrText(value);
  if (!rawValue) return false;
  if (REJECTED_PASSPORT_NUMBER_LABEL_PATTERN.test(rawValue)) return false;
  if (PASSPORT_NUMBER_SEARCH_STOP_PATTERN.test(rawValue)) return false;

  const candidate = rawValue.toUpperCase();
  if (!/^[A-Z0-9]{6,12}$/.test(candidate)) return false;
  if (!/[0-9]/.test(candidate)) return false;
  if (/^(REPUBLIC|PASSPORT|DOCUMENT|NATIONAL|GOVERNMENT|ADDRESS|SURNAME|COUNTRY|INDIAN|INDIA)$/i.test(candidate)) return false;
  return true;
};

const extractPassportNumberCandidate = (value = "") => {
  const rawValue = compactOcrText(value);
  if (!rawValue) return "";
  if (REJECTED_PASSPORT_NUMBER_LABEL_PATTERN.test(rawValue)) return "";
  if (PASSPORT_NUMBER_SEARCH_STOP_PATTERN.test(rawValue)) return "";

  const candidates = rawValue.toUpperCase().match(/\b[A-Z0-9]{6,12}\b/g) || [];
  return candidates.find(isLikelyPassportNumber) || "";
};

const extractDateNearLabel = (lines, labelPattern) => {
  const datePattern = /(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})/;
  for (let i = 0; i < lines.length; i += 1) {
    const line = compactOcrText(lines[i]);
    if (!labelPattern.test(line)) continue;
    const sameLineDate = line.match(datePattern);
    if (sameLineDate) return parseDateStringToISO(sameLineDate[1]);
    for (let j = i + 1; j < Math.min(lines.length, i + 5); j += 1) {
      const nextDate = compactOcrText(lines[j]).match(datePattern);
      if (nextDate) return parseDateStringToISO(nextDate[1]);
    }
  }
  return "";
};

const isAddressStopLine = (line = "") => {
  const normalized = normalizePassportLabel(line);
  return /^(?:old passport(?: no| number)?|file no|file number|passport no|passport number|place of issue|date of issue|date of expiry|name of father|name of mother|name of spouse|signature|emigration|nationality|sex|date of birth|given name|surname|type|country code|place of birth)\b/.test(normalized);
};

const INDIAN_STATES = new Set([
  "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh",
  "goa", "gujarat", "haryana", "himachal pradesh", "jharkhand", "karnataka",
  "kerala", "madhya pradesh", "maharashtra", "manipur", "meghalaya",
  "mizoram", "nagaland", "odisha", "punjab", "rajasthan", "sikkim",
  "tamil nadu", "telangana", "tripura", "uttar pradesh", "uttarakhand",
  "west bengal", "andaman and nicobar islands", "chandigarh",
  "dadra and nagar haveli and daman and diu", "delhi", "jammu and kashmir",
  "ladakh", "lakshadweep", "puducherry",
]);

const COUNTRY_NAMES = new Set([
  "india", "united states", "united kingdom", "canada", "australia",
  "germany", "france", "china", "japan", "south korea", "pakistan",
  "bangladesh", "sri lanka", "nepal", "singapore", "malaysia",
  "united arab emirates", "saudi arabia",
]);

const isValidPlaceValue = (value = "") =>
  /^[A-Za-z][A-Za-z .'-]*$/.test(compactOcrText(value)) &&
  !isAddressStopLine(value) &&
  !isLikelyPassportNumber(value);

const cleanPlaceValue = (value = "") => {
  const cleaned = compactOcrText(value)
    .replace(/[^A-Za-z .'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return isValidPlaceValue(cleaned) ? cleaned : "";
};


const isDistrictLikeCity = (value = "") => /^(rangareddy|ranga reddy|hyderabad|hyderabad district|district|dist\.?)$/i.test(String(value).trim());

const deriveCityFromAddress = ({ addressLine1 = "", addressLine2 = "", state = "", zipCode = "", country = "" }) => {
  const parts = `${addressLine1}, ${addressLine2}`
    .split(",")
    .map(part => part.trim())
    .filter(Boolean);
  const districtWords = /^(rangareddy|ranga reddy|hyderabad|hyderabad district|district|dist\.?)$/i;
  const stateWords = state ? new RegExp(`^${String(state).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") : null;
  const zip = String(zipCode || "");

  const cleaned = parts.filter(part =>
    !districtWords.test(part) &&
    !(stateWords && stateWords.test(part)) &&
    !(zip && zip.includes(part)) &&
    !/^(india|ind)$/i.test(part) &&
    !/h[- ]?no|house|flat|road|street|temple|homes/i.test(part)
  );

  return cleanPlaceValue(cleaned[cleaned.length - 1] || "");
};
const extractAddressFromLines = (lines) => {
  let addressIdx = -1;
  let inlineAddress = "";

  for (let i = 0; i < lines.length; i += 1) {
    const line = compactOcrText(lines[i]);
    if (!line) continue;
    if (!/\b(?:address|permanent address|address of holder)\b/i.test(line)) continue;
    if (/old passport|email address/i.test(line)) continue;

    addressIdx = i;
    inlineAddress = line
      .replace(/^.*?\b(?:permanent address|address of holder|address)\b\s*[:\-/]?\s*/i, "")
      .trim();
    break;
  }

  if (addressIdx === -1) return {};

  const addressLines = [];
  if (inlineAddress && !isAddressStopLine(inlineAddress)) {
    addressLines.push(compactOcrText(inlineAddress));
  }

  for (let i = addressIdx + 1; i < Math.min(lines.length, addressIdx + 14); i += 1) {
    const line = compactOcrText(lines[i]);
    if (!line) continue;
    if (isAddressStopLine(line)) break;
    if (/^(\/|:|-|\.)+$/.test(line)) continue;
    addressLines.push(line.replace(/^[,;:\-]+|[,;:\-]+$/g, "").trim());
  }

  const filtered = addressLines
    .flatMap(line => line.split(/\s*,\s*/))
    .map(line => line.trim())
    .filter(Boolean);
  if (!filtered.length) return {};

  const zipIndex = filtered.findIndex(line => /\b\d{5,6}\b/.test(line));
  const zipMatch = filtered.join(" ").match(/\b(\d{5,6})\b/);
  const cleanLines = filtered
    .map(line => line
      .replace(/\b(?:pin|pincode|postal code|zip)\s*[:.-]?\s*\d{5,6}\b/ig, "")
      .replace(/\b\d{5,6}\b/g, "")
      .replace(/^[,;:\-]+|[,;:\-]+$/g, "")
      .trim())
    .filter(Boolean);

  let country = "";
  let state = "";
  for (let i = cleanLines.length - 1; i >= 0; i -= 1) {
    const normalized = normalizePassportLabel(cleanLines[i]);
    if (!country && COUNTRY_NAMES.has(normalized)) {
      country = normalized === "india" ? "India" : cleanPlaceValue(cleanLines[i]);
      cleanLines.splice(i, 1);
      continue;
    }
    if (!state && INDIAN_STATES.has(normalized)) {
      state = cleanPlaceValue(cleanLines[i]);
      cleanLines.splice(i, 1);
    }
  }

  const linesBeforePin = zipIndex >= 0
    ? filtered.slice(0, zipIndex).map(line => line.trim()).filter(Boolean)
    : cleanLines.filter(line => isValidPlaceValue(line) || /\d/.test(line));

  let city = "";
  if (linesBeforePin.length >= 4) {
    // Indian passport layout: house, street/locality, city, district, PIN, state, country.
    city = cleanPlaceValue(linesBeforePin[linesBeforePin.length - 2]);
  } else if (linesBeforePin.length >= 3) {
    city = cleanPlaceValue(linesBeforePin[linesBeforePin.length - 1]);
  }

  const addressLine1 = linesBeforePin[0] || cleanLines[0] || "";
  const addressLine2 = linesBeforePin.slice(1).join(", ") || "";
  const zipCode = zipMatch?.[1] || "";
  const derivedCity = deriveCityFromAddress({ addressLine1, addressLine2, state, zipCode, country });
  if (!city || isDistrictLikeCity(city)) city = derivedCity;

  return {
    addressLine1,
    addressLine2,
    city,
    state,
    zipCode,
    country,
  };
};

// Shared with enrollment consistency checks so passport address parsing stays
// consistent with the account passport-import flow.
export const extractPassportAddressForConsistency = (lines = []) => extractAddressFromLines(lines);
const restoreMrzLine = (raw) => {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9<\s]/g, "")
    .trim()
    .replace(/\s+/g, "<")
    .padEnd(44, "<")
    .substring(0, 44);
};

const findMrzLines = (lines) => {
  let mrzLine1 = null;
  let mrzLine2 = null;
  for (const line of lines) {
    const upper = line.toUpperCase().trim();
    const restored1 = restoreMrzLine(upper);
    if (!mrzLine1 && /^P<[A-Z]{3}/.test(restored1) && restored1.length >= 40) {
      mrzLine1 = restored1;
      continue;
    }
    const restored2 = restoreMrzLine(upper);
    if (!mrzLine2 && /^[A-Z0-9<]{9}\d?[A-Z]{3}\d{6}[MF<]\d{6}/.test(restored2) && restored2.length >= 30) {
      mrzLine2 = restored2;
    }
  }
  return { mrzLine1, mrzLine2 };
};

const parseMrzLine1 = (line) => {
  if (!line || line.length < 30) return {};
  const clean = line.padEnd(44, "<");
  const issuingCountryCode = clean.substring(2, 5).replace(/</g, "");
  const nameField = clean.substring(5, 44);
  const nameParts = nameField.split("<<");
  const surname = (nameParts[0] || "").replace(/</g, " ").trim();
  const givenNamesRaw = nameParts.slice(1).join(" ").replace(/</g, " ").trim();
  const givenNames = givenNamesRaw.split(/\s+/).filter(Boolean).join(" ");
  return { surname, givenNames, issuingCountry: isoToCountryName(issuingCountryCode), issuingCountryCode };
};

const parseMrzLine2 = (line) => {
  if (!line || line.length < 27) return {};
  const clean = line.padEnd(44, "<");
  const passportNumber  = clean.substring(0, 9).replace(/</g, "");
  const nationalityCode = clean.substring(10, 13).replace(/</g, "");
  const dobRaw          = clean.substring(13, 19);
  const sex             = clean.substring(20, 21);
  const expiryRaw       = clean.substring(21, 27);
  return {
    passportNumber,
    nationality: isoToCountryName(nationalityCode),
    nationalityCode,
    dateOfBirth: mrzDateToISO(dobRaw, false),
    sex: sex === "M" ? "male" : sex === "F" ? "female" : "",
    expiryDate: mrzDateToISO(expiryRaw, true),
  };
};

const parsePassportFromOcrLines = (lines, { extractPassportNumber = true } = {}) => {
  const fullText = lines.join("\n");
  const result = {};

  const passportNoValue = extractPassportNumber ? (() => {
    let skipUntilIndex = -1;

    for (let i = 0; i < lines.length; i += 1) {
      const line = compactOcrText(lines[i]);
      if (!line) continue;

      if (REJECTED_PASSPORT_NUMBER_LABEL_PATTERN.test(line)) {
        skipUntilIndex = Math.max(skipUntilIndex, i + 3);
        continue;
      }
      if (i <= skipUntilIndex) continue;
      if (!PASSPORT_NUMBER_LABEL_PATTERN.test(line)) continue;

      console.log("[Passport No label found]", line);

      const sameLineText = line
        .replace(/^.*?\b(?:passport\s*(?:no\b|number\b|#)|document\s*(?:no\b|number\b|#)|travel\s+document\s*(?:no\b|number\b|#))\s*[:\-/]?\s*/i, "")
        .split(REJECTED_PASSPORT_NUMBER_LABEL_PATTERN)[0]
        .trim();
      const sameLineCandidate = extractPassportNumberCandidate(sameLineText);
      if (sameLineCandidate) {
        console.log("[Passport No candidate]", sameLineCandidate);
        return sameLineCandidate;
      }

      for (let offset = 1; offset <= 6 && i + offset < lines.length; offset += 1) {
        const nearbyLine = compactOcrText(lines[i + offset]);
        if (!nearbyLine) continue;
        if (REJECTED_PASSPORT_NUMBER_LABEL_PATTERN.test(nearbyLine)) break;
        if (PASSPORT_NUMBER_SEARCH_STOP_PATTERN.test(nearbyLine)) break;
        if (PASSPORT_NUMBER_LABEL_PATTERN.test(nearbyLine)) continue;

        const candidate = extractPassportNumberCandidate(nearbyLine);
        if (candidate) {
          console.log("[Passport No candidate]", candidate);
          return candidate;
        }
      }
    }

    return "";
  })() : "";

  if (passportNoValue) result.passportNumber = passportNoValue.toUpperCase();

  const surnameIdx   = lines.findIndex(l => /^surname$/i.test(l.trim()));
  const givenNameIdx = lines.findIndex(l => /^given\s*name$/i.test(l.trim()));
  if (surnameIdx !== -1 && lines[surnameIdx + 1])   result.lastName   = lines[surnameIdx + 1].trim();
  if (givenNameIdx !== -1 && lines[givenNameIdx + 1]) {
    const givenParts  = lines[givenNameIdx + 1].trim().split(/\s+/);
    result.firstName  = givenParts[0] || "";
    result.middleName = givenParts.slice(1).join(" ") || "";
  }

  if (!result.lastName || !result.firstName) {
    const combinedNameLine = lines.find(l =>
      /^[A-Z]+\s{2,}[A-Z]+/.test(l.trim()) &&
      !/republic|passport|nationality|date|place|father|mother|address|signature/i.test(l)
    );
    if (combinedNameLine) {
      const parts = combinedNameLine.trim().split(/\s{2,}/);
      if (!result.lastName)  result.lastName  = parts[0] || "";
      if (!result.firstName) result.firstName = parts[1] || "";
    }
  }

  const nationalityIdx = lines.findIndex(l => /^nationality$/i.test(l.trim()));
  if (nationalityIdx !== -1 && lines[nationalityIdx + 1]) {
    const nat = lines[nationalityIdx + 1].trim();
    result.nationality    = nat;

    result.country        = nat === "INDIAN" ? "India" : nat;
    result.nationalityCode = nat === "INDIAN" ? "IND" : "";
    if (nat === "INDIAN") result.primaryLanguage = "English";
  }

  const extractedDob = extractDateNearLabel(lines, /(?:date\s+of\s+birth|birth\s+date|dob)/i);
  if (extractedDob) result.dateOfBirth = extractedDob;

  const sexMatch = fullText.match(/sex\s+([MF])\b/i);
  if (sexMatch) result.sex = sexMatch[1].toUpperCase() === "M" ? "male" : "female";

  const extractedIssueDate = extractDateNearLabel(lines, /(?:date\s+of\s+issue|issue\s+date|issued\s+on)/i);
  if (extractedIssueDate) result.issueDate = extractedIssueDate;

  const extractedExpiryDate = extractDateNearLabel(lines, /(?:date\s+of\s+expiry|expiry\s+date|expires\s+on)/i);
  if (extractedExpiryDate) result.expiryDate = extractedExpiryDate;

  Object.assign(result, extractAddressFromLines(lines));

  if (!result.addressLine1) {
    const houseMatch = fullText.match(/(?:house|flat|door|h\.no|s\/o|d\/o|w\/o)[^\n,]*[,\n]([^\n,]+)/i);
    if (houseMatch) result.addressLine1 = houseMatch[0].replace(/\n/g, ", ").trim();
  }

  const pincodeMatch = fullText.match(/(?:pin(?:code)?|postal\s*code|zip)[:\s]*(\d{5,6})/i);
  if (pincodeMatch) result.zipCode = pincodeMatch[1];
  if (!result.zipCode) {
    const standalonePin = fullText.match(/\b(\d{6})\b/);
    if (standalonePin) result.zipCode = standalonePin[1];
  }

  const cityMatch = fullText.match(/(?:city|district|dist\.?)[:\s]+([A-Za-z\s]+?)(?:\n|,|state|pin)/i);
  if (cityMatch && !result.city) result.city = cityMatch[1].trim();

  const stateMatch = fullText.match(/(?:\bstate\b)[:\s]+([A-Za-z\s]+?)(?:\n|,|pin|zip|\d)/i);
  if (stateMatch) result.state = stateMatch[1].trim();

  const countryMatch = fullText.match(/(?:country)[:\s]+([A-Za-z\s]+?)(?:\n|,|\d)/i);
  if (countryMatch && !result.country) result.country = countryMatch[1].trim();

  const phoneMatch = fullText.match(/(?:mobile|phone|contact|mob\.?|ph\.?)[:\s]+(\+?[\d\s\-]{8,15})/i);
  if (phoneMatch) {
    result.phone = phoneMatch[1].replace(/[\s\-]/g, "").trim();
  }
  if (!result.phone) {
    const mobileMatch = fullText.match(/\b([6-9]\d{9})\b/);
    if (mobileMatch) {
      result.phone = mobileMatch[1];
    }
  }

  return result;
};

export const extractTextLines = (textractResponse) => {
  const lines = [];
  if (textractResponse?.Blocks) {
    for (const block of textractResponse.Blocks) {
      if (block.BlockType === "LINE" && block.Text) lines.push(block.Text.trim());
    }
  }
  return lines;
};

const mapToFormFields = (line1Data, line2Data, ocrData) => {
  const givenNames     = line1Data.givenNames || "";
  const givenNameParts = givenNames.split(/\s+/).filter(Boolean);
  const firstName      = givenNameParts[0]                 || ocrData.firstName  || "";
  const lastName       = line1Data.surname                 || ocrData.lastName   || "";
  const birthDate      = line2Data.dateOfBirth             || ocrData.dateOfBirth || "";
  const gender         = line2Data.sex                     || ocrData.sex        || "";
  const country        = line1Data.issuingCountry || ocrData.country      || "";

  return {
    firstName, lastName, birthDate, gender, country,
    addressLine1:       ocrData.addressLine1       || "",
    addressLine2:       ocrData.addressLine2       || "",
    city:               ocrData.city               || "",
    state:              ocrData.state              || "",
    zipCode:            ocrData.zipCode            || "",
    phone:              ocrData.phone              || "",
    primaryLanguage:    ocrData.primaryLanguage    || "",
    _passportMeta: {
      passportNumber:     line2Data.passportNumber    || ocrData.passportNumber || "",
      nationality:        line2Data.nationality       || ocrData.nationality    || "",
      nationalityCode:    line2Data.nationalityCode   || ocrData.nationalityCode || "",
      issuingCountry:     line1Data.issuingCountry    || ocrData.country         || "",
      issuingCountryCode: line1Data.issuingCountryCode || "",
      issueDate:          ocrData.issueDate           || "",
      expiryDate:         line2Data.expiryDate        || ocrData.expiryDate      || "",
    },
  };
};

// =====================================================
// ASYNC TEXTRACT — multi-page PDF support via S3
// =====================================================

/**
 * extractTextWithAsyncTextract
 *
 * Uses StartDocumentTextDetection (async) instead of
 * DetectDocumentTextCommand (sync) so multi-page PDFs work.
 *
 * Required IAM:
 *   textract:StartDocumentTextDetection
 *   textract:GetDocumentTextDetection
 *   s3:GetObject on the bucket
 */
const extractTextWithAsyncTextract = async (s3Key) => {
  // 1. Start job
  const startResponse = await textract.send(
    new StartDocumentTextDetectionCommand({
      DocumentLocation: { S3Object: { Bucket: BUCKET_NAME, Name: s3Key } },
    })
  );

  const jobId = startResponse.JobId;
  if (!jobId) throw new Error("Textract did not return a JobId. Check IAM permissions.");
  console.log(`🚀 Async Textract job started. JobId: ${jobId}`);

  // 2. Poll until done
  const MAX_POLLS  = 30;
  const POLL_DELAY = 2000;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let jobStatus = "IN_PROGRESS";
  let pollCount  = 0;

  while (jobStatus === "IN_PROGRESS" && pollCount < MAX_POLLS) {
    await sleep(POLL_DELAY);
    pollCount++;

    const getResponse = await textract.send(
      new GetDocumentTextDetectionCommand({ JobId: jobId })
    );
    jobStatus = getResponse.JobStatus;
    console.log(`  ⏳ Poll ${pollCount}/${MAX_POLLS}: status = ${jobStatus}`);

    if (jobStatus === "SUCCEEDED") {
      // 3. Collect all lines (handle NextToken pagination)
      const allLines = extractTextLines(getResponse);
      let nextToken  = getResponse.NextToken;
      while (nextToken) {
        const pageResponse = await textract.send(
          new GetDocumentTextDetectionCommand({ JobId: jobId, NextToken: nextToken })
        );
        allLines.push(...extractTextLines(pageResponse));
        nextToken = pageResponse.NextToken;
      }
      console.log(`✅ Async Textract complete. Total lines: ${allLines.length}`);
      return allLines;
    }

    if (jobStatus === "FAILED") {
      throw new Error(`Textract async job failed: ${getResponse.StatusMessage || "Unknown error"}`);
    }
  }

  throw new Error(
    `Textract job timed out after ${(MAX_POLLS * POLL_DELAY) / 1000}s. Try a smaller file.`
  );
};

// =====================================================
// CV OCR PARSER — fixed name extraction
// =====================================================

/**
 * toTitleCase  "VEDA SHEENA RAJAN" → "Veda Sheena Rajan"
 */
export const extractPassportLinesFromS3 = async (s3Key, mimeType = "") => {
  const isPdf = mimeType === "application/pdf" || s3Key.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    return await extractTextWithAsyncTextract(s3Key);
  }

  try {
    const textractResponse = await textract.send(new AnalyzeDocumentCommand({
      Document: { S3Object: { Bucket: BUCKET_NAME, Name: s3Key } },
      FeatureTypes: ["FORMS"],
    }));
    const lines = extractTextLines(textractResponse);
    if (lines.length > 0) return lines;
  } catch (error) {
    console.warn("Passport AnalyzeDocument failed, falling back to DetectDocumentText:", error.message);
  }

  const fallbackResponse = await textract.send(new DetectDocumentTextCommand({
    Document: { S3Object: { Bucket: BUCKET_NAME, Name: s3Key } },
  }));
  return extractTextLines(fallbackResponse);
};

const splitPhoneForForm = (phone = "") => {
  const raw = String(phone).trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return { phone: "", countryCode: "" };
  if (raw.startsWith("+") && digits.length > 10) {
    return {
      countryCode: `+${digits.slice(0, -10)}`,
      phone: digits.slice(-10),
    };
  }
  return { phone: digits.slice(-10), countryCode: "" };
};

const normalizePassportFormData = (data = {}) => {
  const cleaned = { ...data };

  if (/file\s*(?:no|number)/i.test(cleaned.city || "")) cleaned.city = "";

  if (/\d/.test(String(cleaned.state || ""))) {
    // Never reinterpret an alphanumeric state value as a passport number.
    // File/reference numbers such as HY3066633310926 must be discarded.
    cleaned.state = "";
  }

  const commaParts = String(cleaned.addressLine1 || "")
    .split(/\s*,\s*/)
    .map(part => part.trim())
    .filter(Boolean);

  if (commaParts.length >= 4) {
    cleaned.addressLine1 = commaParts[0];
    if (!cleaned.addressLine2) cleaned.addressLine2 = commaParts[1];
    if (!cleaned.city) cleaned.city = cleanPlaceValue(commaParts[2]);
    if (!cleaned.state) {
      const stateCandidate = commaParts[commaParts.length - 1];
      if (INDIAN_STATES.has(normalizePassportLabel(stateCandidate))) {
        cleaned.state = cleanPlaceValue(stateCandidate);
      }
    }
  }

  cleaned.city = cleanPlaceValue(cleaned.city);
  cleaned.state = cleanPlaceValue(cleaned.state);
  if (!cleaned.city || isDistrictLikeCity(cleaned.city)) {
    cleaned.city = deriveCityFromAddress(cleaned);
  }
  if (/^ind(?:ia|ian)$/i.test(cleaned.country || "")) cleaned.country = "India";

  return cleaned;
};

const buildPassportFormDataFromLines = (allLines) => {
  console.log("[Passport OCR lines]", allLines);
  const { mrzLine1, mrzLine2 } = findMrzLines(allLines);
  const line1Data = mrzLine1 ? parseMrzLine1(mrzLine1) : {};
  const line2Data = mrzLine2 ? parseMrzLine2(mrzLine2) : {};
  const mrzPassportNumber = line2Data.passportNumber || "";
  const ocrData = parsePassportFromOcrLines(allLines, {
    extractPassportNumber: !mrzPassportNumber,
  });
  const ocrPassportCandidate = ocrData.passportNumber || "";
  const finalPassportNumber = mrzPassportNumber || ocrPassportCandidate;

  console.log("[Passport OCR] MRZ passport number:", mrzPassportNumber || "not found");
  console.log("[Passport OCR] OCR passport candidate:", ocrPassportCandidate || "not found");
  console.log("[Final passport number]", finalPassportNumber || "not found");

  const formFields = mapToFormFields(line1Data, line2Data, {
    ...ocrData,
    passportNumber: finalPassportNumber,
  });
  const passportMeta = formFields._passportMeta || {};
  const phoneParts = splitPhoneForForm(formFields.phone || ocrData.phone || "");
  const citizenship = passportMeta.nationality || ocrData.nationality || "";

  return normalizePassportFormData({
    firstName: formFields.firstName || "",
    middleName: formFields.middleName || "",
    lastName: formFields.lastName || "",
    birthDate: formFields.birthDate || "",
    gender: formFields.gender || "",
    phone: phoneParts.phone,
    countryCode: phoneParts.countryCode,
    passportNumber: passportMeta.passportNumber || "",
    passportIssueDate: passportMeta.issueDate || "",
    passportExpiryDate: passportMeta.expiryDate || "",
    issuingCountry: passportMeta.issuingCountry || "",
    citizenship,
    nationality: citizenship || passportMeta.issuingCountry || "",
    passportNationality: citizenship || passportMeta.issuingCountry || "",
    countryOfResidence: formFields.country || ocrData.country || passportMeta.issuingCountry || "",
    addressLine1: formFields.addressLine1 || "",
    addressLine2: formFields.addressLine2 || "",
    city: formFields.city || "",
    state: formFields.state || "",
    zipCode: formFields.zipCode || "",
    country: formFields.country || ocrData.country || "",
  });
};
const toTitleCase = (str) =>
  str.toLowerCase().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

/**
 * SUBJECT_WORDS
 * Common words found in grade/score tables that should NOT be
 * mistaken for a person's name.
 */
const SUBJECT_WORDS = new Set([
  "english","general","paper","mathematics","economics","psychology",
  "history","biology","physics","geography","science","chemistry",
  "literature","computing","music","art","design","business","accounting",
  "sociology","philosophy","religious","studies","physical","education",
  "technology","language","french","spanish","german","chinese","arabic",
  "further","statistics","mechanics","calculus","algebra","grade","level",
  "subject","predicted","uniform","mark","score","result","examination",
  "checkpoint","igcse","cambridge","international","advanced","subsidiary",
  "lower","secondary","primary","school","college","university","institute",
]);

const isLikelySubjectLine = (line) => {
  const words      = line.trim().toLowerCase().split(/\s+/);
  const matchCount = words.filter(w => SUBJECT_WORDS.has(w)).length;
  return words.length > 0 && matchCount / words.length > 0.4;
};

/**
 * extractNameFromCV
 *
 * Priority order:
 *  1. ALL-CAPS name in first 8 lines  e.g. "VEDA SHEENA RAJAN"
 *  2. Title-Case name in first 8 lines e.g. "Veda Sheena Rajan"
 *  3. Explicit "Name:" / "Full Name:" label anywhere in the document
 */
const extractNameFromCV = (lines) => {
  const SECTION_RE = /^(education|experience|work|employment|skills|testing|activities|awards|certifications|projects|internship|objective|summary|profile|contact|references|standardized|leadership|sports|interests|achievements|honours|honors|volunteering|publications|languages|training)/i;

  for (const line of lines.slice(0, 8)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) continue;
    if (SECTION_RE.test(trimmed))        continue;   // section heading
    if (/\d/.test(trimmed))              continue;   // contains digits
    if (/@/.test(trimmed))               continue;   // email
    if (/[,|;:]/.test(trimmed))          continue;   // address / metadata
    if (isLikelySubjectLine(trimmed))    continue;   // subject/grade keyword

    // ── ALL-CAPS: "VEDA SHEENA RAJAN" ──
    if (/^[A-Z][A-Z\s]{3,}$/.test(trimmed)) {
      const words = trimmed.split(/\s+/).filter(Boolean);
      if (words.length >= 2 && words.length <= 5 && words.every(w => /^[A-Z]+$/.test(w))) {
        const titled = toTitleCase(trimmed);
        const parts  = titled.split(/\s+/);
        return {
          firstName:  parts[0]                                         || "",
          middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
          lastName:   parts[parts.length - 1]                          || "",
        };
      }
    }

    // ── Title-Case: "Veda Sheena Rajan" ──
    if (/^[A-Z][a-z]+(?: [A-Z][a-z]*){1,4}$/.test(trimmed)) {
      const parts = trimmed.split(/\s+/);
      return {
        firstName:  parts[0]                                         || "",
        middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
        lastName:   parts[parts.length - 1]                          || "",
      };
    }
  }

  // ── Fallback: explicit "Name:" label ──
  const fullText      = lines.join("\n");
  const nameLabelMatch = fullText.match(/^(?:name|full\s+name)[:\s]+([A-Za-z\s]{3,40})$/im);
  if (nameLabelMatch) {
    const parts = toTitleCase(nameLabelMatch[1].trim()).split(/\s+/);
    return {
      firstName:  parts[0]                                         || "",
      middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
      lastName:   parts[parts.length - 1]                          || "",
    };
  }

  return { firstName: "", middleName: "", lastName: "" };
};

/**
 * parseCVFromOcrLines
 */
const normalizeExplicitDob = (rawDate) => {
  if (!rawDate) return undefined;

  const value = String(rawDate).trim();
  const numeric = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (numeric) {
    const year = numeric[3].length === 2 ? `19${numeric[3]}` : numeric[3];
    return `${year}-${numeric[2].padStart(2, "0")}-${numeric[1].padStart(2, "0")}`;
  }

  const monthMap = {
    january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
    july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
  };
  const monthDate = value.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthDate) {
    const month = monthMap[monthDate[1].toLowerCase()];
    if (month) return `${monthDate[3]}-${month}-${monthDate[2].padStart(2, "0")}`;
  }

  return undefined;
};

function extractDobOnlyIfExplicit(text) {
  const dobRegex =
    /\b(?:date\s*of\s*birth|dob|birth\s*date|born)\b\s*[:\-]?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})/i;

  const match = text.match(dobRegex);
  return match ? normalizeExplicitDob(match[1]) : undefined;
}

const parseCVFromOcrLines = (lines) => {
  const fullText = lines.join("\n");
  const result   = {};

  // ── NAME (handles ALL-CAPS names like "VEDA SHEENA RAJAN") ──
  const nameData    = extractNameFromCV(lines);
  result.firstName  = nameData.firstName;
  result.lastName   = nameData.lastName;

  // ── EMAIL ──
  const emailMatch = fullText.match(/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/);
  if (emailMatch) result._cvEmail = emailMatch[0];

  // ── PHONE ──
  const phoneMatch = fullText.match(/(?:phone|mobile|mob|tel|contact)?[\s:]*(\+?[\d][\d\s\-().]{8,14}\d)/i);
  if (phoneMatch) {
    result.phone              = phoneMatch[1].replace(/[\s\-().]/g, "").trim();
  }

  // ── ADDRESS — Indian format (comma-list + 6-digit PIN) ──
  const indianAddressMatch = fullText.match(
    /([A-Za-z][^,\n]+(?:,\s*[A-Za-z][^,\n]+){2,})[,\s–\-]+(\d{6})/
  );
  if (indianAddressMatch) {
    const fullAddr = indianAddressMatch[1].trim();
    const pin      = indianAddressMatch[2].trim();
    const parts    = fullAddr.split(",").map(p => p.trim()).filter(Boolean);

    const indianStates = [
      "Kerala","Tamil Nadu","Karnataka","Andhra Pradesh","Telangana",
      "Maharashtra","Gujarat","Rajasthan","Uttar Pradesh","Madhya Pradesh",
      "West Bengal","Bihar","Odisha","Punjab","Haryana","Himachal Pradesh",
      "Uttarakhand","Jharkhand","Chhattisgarh","Assam","Goa","Delhi",
      "Jammu and Kashmir","Ladakh","Manipur","Meghalaya","Mizoram",
      "Nagaland","Sikkim","Tripura","Arunachal Pradesh",
    ];

    const stateIdx   = parts.findIndex(p => indianStates.some(s => p.toLowerCase().includes(s.toLowerCase())));
    const countryIdx = parts.findIndex(p => /^india$/i.test(p.trim()));
    const cityIdx    = stateIdx > 0 ? stateIdx - 1 : parts.length - 2;

    result.addressLine1 = parts[0] || "";
    result.addressLine2 = cityIdx > 1 ? parts.slice(1, cityIdx).join(", ") : "";
    result.city         = parts[cityIdx]   || "";
    result.state        = stateIdx  !== -1 ? parts[stateIdx]   : "";
    result.country      = countryIdx !== -1 ? parts[countryIdx] : (result.country || "India");
    result.zipCode      = pin;
  }

  // Western address: "123 Main St, City, State 90210"
  if (!result.city) {
    const westernMatch = fullText.match(
      /(\d+[^,\n]+),\s*([A-Za-z\s]+),\s*([A-Za-z\s]+)[,\s]+(\d{5,6})/
    );
    if (westernMatch) {
      result.addressLine1 = westernMatch[1].trim();
      result.city         = westernMatch[2].trim();
      result.state        = westernMatch[3].trim();
      result.zipCode      = westernMatch[4].trim();
    }
  }

  // US "City, ST 10001"
  if (!result.city) {
    const cityStateMatch = fullText.match(/\b([A-Z][a-zA-Z\s]+),\s*([A-Z]{2})\s+(\d{5,6})\b/);
    if (cityStateMatch) {
      result.city    = cityStateMatch[1].trim();
      result.state   = cityStateMatch[2].trim();
      result.zipCode = cityStateMatch[3].trim();
    }
  }

  if (!result.zipCode) {
    const pinMatch = fullText.match(/\b(\d{6})\b/);
    if (pinMatch) result.zipCode = pinMatch[1];
  }

  // ── NATIONALITY / COUNTRY ──
  const natMatch = fullText.match(/(?:nationality|citizenship)[:\s]+([A-Za-z\s]+?)(?:\n|,|\.|;)/i);
  if (natMatch) {
    result.country           = natMatch[1].trim();
  }
  if (!result.country) {
    if (/\bindia\b/i.test(fullText) || /\b[1-9]\d{5}\b/.test(fullText)) {
      result.country           = "India";
    }
  }

  // ── DATE OF BIRTH: only when an explicit DOB label exists.
  // CVs contain many education/internship/activity dates; never use those as DOB.
  const explicitDob = extractDobOnlyIfExplicit(fullText);
  if (explicitDob) {
    result.dateOfBirth = explicitDob;
    result.dobWasExplicit = true;
  } else {
    result.dateOfBirth = undefined;
    result.birthDate = undefined;
    result.dobWasExplicit = false;
  }

  // ── GENDER ──
  const genderMatch = fullText.match(/\bgender[:\s]+(male|female|non-binary|other)\b/i);
  if (genderMatch) result.gender = genderMatch[1].toLowerCase();

  // ── PRIMARY LANGUAGE ──
  const langMatch = fullText.match(/(?:language|languages)[:\s]+([A-Za-z]+(?:,\s*[A-Za-z]+)*)/i);
  if (langMatch) result.primaryLanguage = langMatch[1].split(",")[0].trim();

  // ─────────────────────────────────────────
  // EDUCATION
  // ─────────────────────────────────────────
  result.education = [];

  const SECTION_HEADINGS_RE = /^(experience|work|employment|skills|testing|activities|awards|certifications|projects|internship|objective|summary|profile|references|standardized|leadership|sports|interests|achievements|honours|honors)/i;

  const educationStartIdx = lines.findIndex(l =>
    /^education$/i.test(l.trim()) ||
    /^academic\s+background$/i.test(l.trim()) ||
    /^educational\s+qualifications?$/i.test(l.trim())
  );

  let educationEndIdx = lines.length;
  if (educationStartIdx !== -1) {
    for (let i = educationStartIdx + 1; i < lines.length; i++) {
      if (SECTION_HEADINGS_RE.test(lines[i].trim())) { educationEndIdx = i; break; }
    }
  }

  if (educationStartIdx !== -1) {
    const eduLines = lines.slice(educationStartIdx + 1, educationEndIdx);
    const eduText  = eduLines.join("\n");

    const degreePattern = /\b(bachelor|master|b\.?tech|b\.?e\.?|m\.?tech|m\.?e\.?|b\.?sc|m\.?sc|mba|phd|ph\.d|diploma|associate|high\s+school|secondary|senior\s+secondary|class\s+x{1,2}|12th|10th|igcse|a\s+levels?|as\s+levels?|cambridge)\b/gi;
    const degrees = [];
    let degreeMatch;
    while ((degreeMatch = degreePattern.exec(eduText)) !== null) {
      degrees.push({ index: degreeMatch.index, degree: degreeMatch[0] });
    }

    degrees.forEach(({ index, degree }) => {
      const entry            = {};
      const charsBefore      = eduText.substring(0, index);
      const lineNumber       = charsBefore.split("\n").length - 1;
      const surroundingLines = eduLines.slice(Math.max(0, lineNumber - 1), lineNumber + 5);
      const entryText        = surroundingLines.join(" ");

      entry.degree = degree.trim();

      const institutionMatch = entryText.match(
        /(?:university|college|institute|school|iit|nit|bits|vit|srm|manipal|lpu|amity|trins|trivandrum)[^\n,;]*/i
      );
      if (institutionMatch) entry.institution = institutionMatch[0].trim();

      const yearMatch =
        entryText.match(/(\d{4})\s*[-–]\s*(\d{4}|\bpresent\b)/i) ||
        entryText.match(/\b(20\d{2}|19\d{2})\b/);
      if (yearMatch) { entry.startYear = yearMatch[1]; entry.endYear = yearMatch[2] || ""; }

      const gpaMatch =
        entryText.match(/(?:cgpa|gpa|percentage|%)[:\s]*([\d.]+)/i) ||
        entryText.match(/([\d.]+)\s*(?:cgpa|gpa|%)/i);
      if (gpaMatch) entry.gpa = gpaMatch[1];

      const majorMatch = entryText.match(
        /(?:in|of|major|specialization)[:\s]+([A-Za-z\s&]+?)(?:\s*,|\s*\(|\n|$)/i
      );
      if (majorMatch) entry.major = majorMatch[1].trim();

      if (entry.degree || entry.institution) result.education.push(entry);
    });
  }

  // ─────────────────────────────────────────
  // TESTING — standardised scores
  // ─────────────────────────────────────────
  result.testing = {};

  const satTotalMatch =
    fullText.match(/Total\s+Score[:\s]+([\d]+)\s*\/\s*1600/i) ||
    fullText.match(/\bSAT\b[^:\n]*Total[:\s]+([\d]+)/i)       ||
    fullText.match(/\bSAT\b[^:\n]*[:\s]+([\d]{3,4})\b/i)     ||
    fullText.match(/SAT\s+Score[:\s]+([\d]+)/i);
  if (satTotalMatch) result.testing.sat = satTotalMatch[1];

  const satRWMatch =
    fullText.match(/Reading\s+[&\/]\s+Writing[:\s]+([\d]+)\s*\/\s*800/i) ||
    fullText.match(/SAT\s+(?:Reading(?:\s+&\s+Writing)?|EBRW)[:\s]+([\d]+)/i);
  if (satRWMatch) result.testing.satReading = satRWMatch[1];

  const satMathMatch =
    fullText.match(/Mathematics[:\s]+([\d]+)\s*\/\s*800/i) ||
    fullText.match(/SAT\s+Math(?:ematics)?[:\s]+([\d]+)/i);
  if (satMathMatch) result.testing.satMath = satMathMatch[1];

  const actMatch =
    fullText.match(/\bACT\b[^:\n]*[:\s]+([\d]+)/i) ||
    fullText.match(/ACT\s+(?:Composite\s+)?Score[:\s]+([\d]+)/i);
  if (actMatch) result.testing.act = actMatch[1];

  const greMatch       = fullText.match(/GRE[:\s]+([\d]+)/i);
  const greVerbalMatch = fullText.match(/GRE\s+Verbal[:\s]+([\d]+)/i);
  const greQuantMatch  = fullText.match(/GRE\s+(?:Quant(?:itative)?)[:\s]+([\d]+)/i);
  if (greMatch)       result.testing.gre       = greMatch[1];
  if (greVerbalMatch) result.testing.greVerbal = greVerbalMatch[1];
  if (greQuantMatch)  result.testing.greQuant  = greQuantMatch[1];

  const gmatMatch = fullText.match(/GMAT[:\s]+([\d]+)/i);
  if (gmatMatch) result.testing.gmat = gmatMatch[1];

  const toeflTotalMatch =
    fullText.match(/TOEFL[^:\n]*Total\s+Score[:\s]+([\d]+)/i) ||
    fullText.match(/TOEFL[^:\n]*[:\s]+([\d]+)/i);
  if (toeflTotalMatch) result.testing.toefl = toeflTotalMatch[1];

  const toeflReadingMatch   = fullText.match(/Reading[:\s]+([\d]+).*?Listening/is);
  const toeflListeningMatch = fullText.match(/Listening[:\s]+([\d]+)/i);
  const toeflSpeakingMatch  = fullText.match(/Speaking[:\s]+([\d]+)/i);
  const toeflWritingMatch   = fullText.match(/Writing[:\s]+([\d]+)/i);
  if (toeflReadingMatch)   result.testing.toeflReading   = toeflReadingMatch[1];
  if (toeflListeningMatch) result.testing.toeflListening = toeflListeningMatch[1];
  if (toeflSpeakingMatch)  result.testing.toeflSpeaking  = toeflSpeakingMatch[1];
  if (toeflWritingMatch)   result.testing.toeflWriting   = toeflWritingMatch[1];

  const ieltsMatch    = fullText.match(/IELTS[:\s]+([\d.]+)/i);
  if (ieltsMatch) result.testing.ielts = ieltsMatch[1];

  const duolingoMatch = fullText.match(/Duolingo[:\s]+([\d]+)/i);
  if (duolingoMatch) result.testing.duolingo = duolingoMatch[1];

  const apMatches = [...fullText.matchAll(/AP\s+([A-Za-z\s]+?)[:\s]+([\d])\b/g)];
  if (apMatches.length > 0) {
    result.testing.apScores = apMatches.map(m => ({ subject: m[1].trim(), score: m[2].trim() }));
  }

  // ─────────────────────────────────────────
  // ACTIVITIES
  // ─────────────────────────────────────────
  result.activities = [];

  const activitiesStartIdx = lines.findIndex(l =>
    /^(?:extracurricular\s+)?activities$/i.test(l.trim())       ||
    /^clubs?\s+(&|and)?\s+activities$/i.test(l.trim())          ||
    /^leadership\s+(&\s+activities)?$/i.test(l.trim())          ||
    /^co-?curricular\s+activities$/i.test(l.trim())             ||
    /^work\s+experience\s+(&\s+internships?)?$/i.test(l.trim()) ||
    /^other\s+interests?.*co-?curricular/i.test(l.trim())
  );

  const activitiesEndIdx = (() => {
    if (activitiesStartIdx === -1) return lines.length;
    for (let i = activitiesStartIdx + 1; i < lines.length; i++) {
      if (SECTION_HEADINGS_RE.test(lines[i].trim()) && !/activities/i.test(lines[i].trim())) return i;
    }
    return lines.length;
  })();

  if (activitiesStartIdx !== -1) {
    lines.slice(activitiesStartIdx + 1, activitiesEndIdx).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 4 || /^\d{4}/.test(trimmed)) return;

      const entry = { description: trimmed };
      const yearMatch =
        trimmed.match(/(\d{4})\s*[-–]\s*(\d{4}|\bpresent\b)/i) ||
        trimmed.match(/\b(20\d{2}|19\d{2})\b/);
      if (yearMatch) {
        entry.startYear   = yearMatch[1];
        entry.endYear     = yearMatch[2] || "";
        entry.description = trimmed.replace(yearMatch[0], "").replace(/[,\s]+$/, "").trim();
      }
      const roleMatch = entry.description.match(/^([^,\-–|@]+?)(?:\s*[,\-–|]\s*|\s+at\s+|\s+@\s+)/i);
      if (roleMatch) {
        entry.role         = roleMatch[1].trim();
        entry.organization = entry.description.replace(roleMatch[0], "").trim();
      }
      if (entry.description) result.activities.push(entry);
    });
  }

  const volunteerMatches = [...fullText.matchAll(/(?:volunteer(?:ing)?|community\s+service)[:\s]+([^\n]+)/gi)];
  volunteerMatches.forEach(m => {
    const desc = m[1].trim();
    if (desc) result.activities.push({ description: desc, type: "volunteer" });
  });

  return result;
};

/**
 * mapCVToAllSections
 */
const mapCVToAllSections = (cvData) => ({
  // Account flat fields
  firstName:          cvData.firstName         || "",
  lastName:           cvData.lastName           || "",
  dateOfBirth:        cvData.dobWasExplicit ? cvData.dateOfBirth : undefined,
  dobWasExplicit:     cvData.dobWasExplicit === true,
  gender:             cvData.gender             || "",
  phone:              cvData.phone              || "",
  addressLine1:       cvData.addressLine1        || "",
  addressLine2:       cvData.addressLine2        || "",
  city:               cvData.city               || "",
  state:              cvData.state              || "",
  zipCode:            cvData.zipCode            || "",
  country:            cvData.country            || "",
  primaryLanguage:    cvData.primaryLanguage     || "",
  // ── Structured sections (arrays/objects — handled by their own components) ──
  cvEducation:  cvData.education  || [],
  cvTesting:    cvData.testing    || {},
  cvActivities: cvData.activities || [],
  // ── Meta ──
  _cvMeta: { email: cvData._cvEmail || "", parsedAt: new Date().toISOString(), dobWasExplicit: cvData.dobWasExplicit === true },
});

// ================================
// 🔐 FORGOT PASSWORD
// ================================

export const forgotPasswordRequestOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const account = await Account.findOne({ email: email.toLowerCase() });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email. Please create an account first.",
      });
    }

    await Otp.deleteMany({ email: email.toLowerCase(), purpose: "password_reset" });
    const otpCode  = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await Otp.create({ email: email.toLowerCase(), otp: otpCode, expiresAt: otpExpiry, purpose: "password_reset" });

    await sendPasswordResetOTPEmail(email, account.firstName, otpCode);

    res.status(200).json({ success: true, message: "OTP has been sent to your registered email." });
  } catch (error) {
    console.error("❌ Forgot password OTP error:", error);
    res.status(500).json({ success: false, message: "Server error sending OTP" });
  }
};

export const forgotPasswordReset = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;
    if (!email || !password || !confirmPassword)
      return res.status(400).json({ success: false, message: "Email, password, and confirmPassword are required" });
    if (password !== confirmPassword)
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    if (password.length < 8)
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });

    const normalizedEmail = email.toLowerCase();
    const account = await Account.findOne({ email: normalizedEmail });
    if (!account) return res.status(404).json({ success: false, message: "Account not found" });

    const token      = generateToken(account._id, account.email, account.studentType);
    account.password = password;
    await account.save();
    await Otp.deleteMany({ email: normalizedEmail, purpose: "password_reset" });

    const accountResponse = account.toObject();
    delete accountResponse.password;
    res.status(200).json({ success: true, message: "Password reset successful. You are now logged in.", token, account: accountResponse });
  } catch (error) {
    console.error("❌ Password reset error:", error);
    res.status(500).json({ success: false, message: "Server error resetting password" });
  }
};

// ================================
// 🟢 Register
// ================================
// ================================
// 🟢 Register
// ================================
export const createFirstYearAccount = async (req, res) => {
  try {
    // FIX: applicantType and applyingFor are now destructured here.
    // Before, they were never declared, which caused:
    // "ReferenceError: applicantType is not defined"
    const {
      email,
      password,
      confirmPassword,
      firstName,
      lastName,
      agreeToTerms,
      studentType,
      studentTempId,
      applicantType,
      applyingFor,
      ...otherData
    } = req.body;

    const normalizedEmail = email ? String(email).toLowerCase().trim() : "";
    const trimmedFirstName = normalizeName(firstName || "");
    const trimmedLastName = normalizeName(lastName || "");
    const trimmedPhone = otherData.phone ? String(otherData.phone).trim() : "";
    const trimmedPassportNumber = otherData.passportNumber ? String(otherData.passportNumber).trim() : "";
    const trimmedIssuingCountry = otherData.issuingCountry ? String(otherData.issuingCountry).trim() : "";
    const trimmedCitizenship = otherData.citizenship ? String(otherData.citizenship).trim() : "";
    const hasPassport = otherData.hasPassport === "yes";
    const initialUploadedDocuments = otherData.initialUploadedDocuments && typeof otherData.initialUploadedDocuments === "object"
      ? otherData.initialUploadedDocuments
      : null;

    // FIX: resolve these once, up front, so they are available everywhere below.
    const resolvedApplicantType =
      applicantType || (studentType === "transfer" ? "Transfer Student" : "First-Year Student");
    const resolvedApplyingFor = applyingFor || "Bachelor's";

    const sendRegisterResponse = (status, body) => {
      console.log("📝 Register response status:", status);
      return res.status(status).json(body);
    };

    if (!email || !password || !trimmedFirstName || !trimmedLastName)
      return sendRegisterResponse(400, { success: false, message: "Please fill all required fields" });

    if (!EMAIL_REGEX.test(normalizedEmail))
      return sendRegisterResponse(400, { success: false, message: "Please provide a valid email address" });
    if (password !== confirmPassword)
      return sendRegisterResponse(400, { success: false, message: "Passwords do not match" });
    if (!NAME_REGEX.test(trimmedFirstName))
      return sendRegisterResponse(400, { success: false, message: "First name can contain only letters and spaces" });
    if (!NAME_REGEX.test(trimmedLastName))
      return sendRegisterResponse(400, { success: false, message: "Last name can contain only letters and spaces" });
    if (otherData.phone && !PHONE_REGEX.test(trimmedPhone))
      return sendRegisterResponse(400, { success: false, message: "Phone number must be exactly 10 digits" });
    if (hasPassport && !trimmedPassportNumber)
      return sendRegisterResponse(400, { success: false, message: "Passport Number is required" });
    if (hasPassport && !otherData.passportIssueDate)
      return sendRegisterResponse(400, { success: false, message: "Passport Issue Date is required" });
    if (hasPassport && !otherData.passportExpiryDate)
      return sendRegisterResponse(400, { success: false, message: "Passport Expiry Date is required" });
    if (hasPassport && !trimmedIssuingCountry)
      return sendRegisterResponse(400, { success: false, message: "Issuing Country is required" });
    if (hasPassport && !trimmedCitizenship)
      return sendRegisterResponse(400, { success: false, message: "Citizenship is required" });
    if (hasPassport) {
      const passportIssueDate = new Date(otherData.passportIssueDate);
      const passportExpiryDate = new Date(otherData.passportExpiryDate);
      if (Number.isNaN(passportIssueDate.getTime()) || Number.isNaN(passportExpiryDate.getTime()))
        return sendRegisterResponse(400, { success: false, message: "Passport dates are invalid" });
      if (passportExpiryDate <= passportIssueDate)
        return sendRegisterResponse(400, { success: false, message: "Passport Expiry Date must be after Passport Issue Date" });
    }
    if (agreeToTerms === false || agreeToTerms === "false")
      return sendRegisterResponse(400, { success: false, message: "You must agree to the terms of use" });

    const existingUser = await Account.findOne({ email: normalizedEmail });
    const existingOtp = await Otp.findOne({ email: normalizedEmail, purpose: "email_verification" }).sort({ createdAt: -1 });

    console.log("🧾 Register normalized email:", normalizedEmail);
    console.log("👤 Register accountExists result:", existingUser ? { id: existingUser._id, isVerified: existingUser.isVerified } : null);
    console.log("🔐 Register otpExists result:", existingOtp ? { id: existingOtp._id, expiresAt: existingOtp.expiresAt } : null);

    if (existingUser?.isVerified) {
      return sendRegisterResponse(409, { success: false, message: "Email already registered" });
    }

    const sanitizedOtherData = { ...otherData };
    const resolvedPassportFileKey = resolveS3FileKey(otherData.passportFileKey || otherData.passportFileUrl || "");
    const passportFileKey = resolvedPassportFileKey && !resolvedPassportFileKey.includes("..")
      ? resolvedPassportFileKey
      : "";
    if (passportFileKey) {
      const uploadedAt = otherData.passportUploadedAt ? new Date(otherData.passportUploadedAt) : new Date();
      const fileSize = Number(otherData.passportFileSize || 0);
      const allowedValidationStatuses = new Set(["pending", "valid", "invalid", "not_checked"]);

      sanitizedOtherData.passportFileKey = passportFileKey;
      sanitizedOtherData.passportFileUrl = buildFileUrl(passportFileKey);
      sanitizedOtherData.passportFileName = String(otherData.passportFileName || path.basename(passportFileKey)).trim();
      sanitizedOtherData.passportOriginalName = String(otherData.passportOriginalName || sanitizedOtherData.passportFileName).trim();
      sanitizedOtherData.passportFileType = String(otherData.passportFileType || "").trim();
      sanitizedOtherData.passportFileSize = Number.isFinite(fileSize) ? Math.max(0, fileSize) : 0;
      sanitizedOtherData.passportUploadedAt = Number.isNaN(uploadedAt.getTime()) ? new Date() : uploadedAt;
      sanitizedOtherData.passportValidationStatus = allowedValidationStatuses.has(otherData.passportValidationStatus)
        ? otherData.passportValidationStatus
        : "pending";
    } else {
      delete sanitizedOtherData.passportFileName;
      delete sanitizedOtherData.passportFileKey;
      delete sanitizedOtherData.passportFileUrl;
      delete sanitizedOtherData.passportOriginalName;
      delete sanitizedOtherData.passportFileType;
      delete sanitizedOtherData.passportFileSize;
      delete sanitizedOtherData.passportUploadedAt;
      delete sanitizedOtherData.passportValidationStatus;
    }
    delete sanitizedOtherData.initialUploadedDocuments;
    // Create Account does not own first-year dashboard profile-only fields. Ignore
    // stale or hidden client values so they cannot trigger model validation.
    delete sanitizedOtherData.middleName;
    delete sanitizedOtherData.suffix;
    delete sanitizedOtherData.useDifferentFirstName;
    delete sanitizedOtherData.preferredFirstName;
    delete sanitizedOtherData.preferredPhoneType;
    delete sanitizedOtherData.alternatePhone;
    delete sanitizedOtherData.alternatePhoneType;
    delete sanitizedOtherData.alternateCountryCode;
    delete sanitizedOtherData.languagesProficient;
    delete sanitizedOtherData.languages;
    delete sanitizedOtherData.birthCountry;
    delete sanitizedOtherData.cityOfBirth;
    delete sanitizedOtherData.yearsInUS;
    delete sanitizedOtherData.citizenshipStatus;
    delete sanitizedOtherData.profileCompletion;
    delete sanitizedOtherData.birthDate;
    delete sanitizedOtherData.dateOfBirth;
    delete sanitizedOtherData.dob;
    delete sanitizedOtherData.addressLine1;
    delete sanitizedOtherData.addressLine2;
    delete sanitizedOtherData.city;
    delete sanitizedOtherData.state;
    delete sanitizedOtherData.zipCode;
    delete sanitizedOtherData.country;
    delete sanitizedOtherData.nationality;
    delete sanitizedOtherData.passportNationality;
    delete sanitizedOtherData.countryOfResidence;
    delete sanitizedOtherData.maritalStatus;
    delete sanitizedOtherData.europeanUnionResident;
    delete sanitizedOtherData.receiveComms;
    delete sanitizedOtherData.preferredCourse;
    delete sanitizedOtherData.selectedCourse;
    delete sanitizedOtherData.specialization;
    delete sanitizedOtherData.intake;
    delete sanitizedOtherData.studyMode;
    delete sanitizedOtherData.modeOfStudy;
    delete sanitizedOtherData.countryOfBirth;
    delete sanitizedOtherData.feeWaiverEligible;
    delete sanitizedOtherData.feeWaiverCriteria;
    delete sanitizedOtherData.ustriveMentor;
    if (trimmedPhone) sanitizedOtherData.phone = trimmedPhone;
    else delete sanitizedOtherData.phone;
    sanitizedOtherData.hasPassport = hasPassport ? "yes" : "no";
    if (hasPassport) {
      sanitizedOtherData.passportNumber = trimmedPassportNumber;
      sanitizedOtherData.passportIssueDate = otherData.passportIssueDate;
      sanitizedOtherData.passportExpiryDate = otherData.passportExpiryDate;
      sanitizedOtherData.issuingCountry = trimmedIssuingCountry;
      sanitizedOtherData.citizenship = trimmedCitizenship;
    } else {
      delete sanitizedOtherData.passportNumber;
      delete sanitizedOtherData.passportIssueDate;
      delete sanitizedOtherData.passportExpiryDate;
      delete sanitizedOtherData.issuingCountry;
      delete sanitizedOtherData.citizenship;

      delete sanitizedOtherData.passportFileName;
      delete sanitizedOtherData.passportFileKey;
      delete sanitizedOtherData.passportFileUrl;
      delete sanitizedOtherData.passportOriginalName;
      delete sanitizedOtherData.passportFileType;
      delete sanitizedOtherData.passportFileSize;
      delete sanitizedOtherData.passportUploadedAt;
      delete sanitizedOtherData.passportValidationStatus;
    }

    // Validate the email verification code before creating or modifying an
    // account, so an invalid/expired code cannot leave a partial account.
    const providedOtp = req.body.verificationCode || req.body.otp;
    const otpRecord = await Otp.findOne({ email: normalizedEmail, purpose: "email_verification" }).sort({ createdAt: -1 });
    const otpAlreadyVerified = Boolean(otpRecord?.isVerified);

    if (!otpAlreadyVerified) {
      if (!providedOtp) {
        return sendRegisterResponse(400, { success: false, message: "Email verification is required before creating an account." });
      }
      if (!otpRecord) {
        return sendRegisterResponse(400, { success: false, message: "Verification code not found or expired. Please click 'Send OTP' to receive a code." });
      }
      if (otpRecord.expiresAt.getTime() <= Date.now()) {
        await Otp.deleteOne({ _id: otpRecord._id });
        return sendRegisterResponse(400, { success: false, message: "Verification code has expired. Please request a new code." });
      }
      const isMatch = await otpRecord.compareOTP(String(providedOtp).trim());
      if (!isMatch) {
        return sendRegisterResponse(400, { success: false, message: "Invalid verification code. Please check your email and try again." });
      }
    }

    // FIX: applicantType / applyingFor / applicationStatus are now part of the
    // data written when the account is created or updated.
    const applicationFields = {
      applicantType: resolvedApplicantType,
      applyingFor: resolvedApplyingFor,
      applicationStatus: "Draft",
    };

    let newAccount = existingUser;
    if (newAccount) {
      Object.assign(newAccount, {
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        agreeToTerms,
        studentType: studentType || newAccount.studentType || "first-year",
        ...sanitizedOtherData,
        ...applicationFields,
      });
      newAccount.password = password;
      await newAccount.save();
    }
    if (!newAccount) {
      newAccount = await Account.create({
        email: normalizedEmail,
        password,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        agreeToTerms,
        studentType: studentType || "first-year",
        isVerified: false,
        status: "pending",
        isApprovedByAdmin: false,
        role: "student",
        ...sanitizedOtherData,
        ...applicationFields,
      });

      await createNewUserNotification(newAccount);
      // Notifications are secondary side effects. A notification storage
      // issue must not turn a successfully created account into a 500.
      try {
        await Notification.create({ type: "WELCOME", title: "Welcome to EduTechEx", message: `Hi ${trimmedFirstName}, your account has been created successfully!`, userId: newAccount._id, targetRole: "student", isRead: false });
        await Notification.create({ type: "PENDING_APPROVAL", title: "Account Pending Approval", message: "Your account is awaiting admin approval.", userId: newAccount._id, targetRole: "student", isRead: false });
      } catch (notificationError) {
        console.error("Student registration notification creation failed:", notificationError);
      }
    }

    if (studentTempId) {
      try {
        const updateResult = await AllDocument.updateMany(
          { studentTempId, userId: null },
          { $set: { userId: newAccount._id } }
        );
        console.log("=== DIAGNOSTIC LOG (accountController.js) ===");
        console.log("updateMany claim result for studentTempId:", studentTempId);
        console.log("matchedCount:", updateResult.matchedCount, "modifiedCount:", updateResult.modifiedCount);
      } catch (docClaimError) {
        console.warn("Could not claim orphaned AllDocument records:", docClaimError.message);
      }
    }
    if (initialUploadedDocuments) {
      try {
        await persistInitialUploadedDocuments(newAccount._id, initialUploadedDocuments);
      } catch (documentError) {
        console.warn("Could not persist initial uploaded documents:", documentError.message);
      }
    }

    if (otpAlreadyVerified) {
      await Otp.deleteMany({ email: normalizedEmail, purpose: "email_verification" });
    } else {
      await Otp.deleteOne({ _id: otpRecord._id });
    }

    newAccount.isVerified = true;
    if (!newAccount.isApprovedByAdmin) {
      newAccount.status = "pending";
      newAccount.isApprovedByAdmin = false;
    }
    await newAccount.save();

    const isAccountApproved = newAccount.isApprovedByAdmin && newAccount.status === "active";
    const token = isAccountApproved
      ? generateToken(newAccount._id, newAccount.email, newAccount.studentType)
      : undefined;
    const accountResponse = newAccount.toObject();
    delete accountResponse.password;
    const computedCaid = formatCaid(newAccount._id);
    accountResponse.caid = computedCaid;
    accountResponse.studentId = computedCaid;

    return sendRegisterResponse(201, {
      success: true,
      message: isAccountApproved
        ? "Account verified successfully."
        : "Email verified successfully. Your account is awaiting admin approval.",
      requireOtpVerification: false,
      ...(token ? { token } : {}),
      account: accountResponse,
      user: accountResponse,
    });
  } catch (error) {
    console.error("❌ Error creating account:", error);
    if (error.code === 11000) {
      console.log("📝 Register response status:", 409);
      return res.status(409).json({ success: false, message: "Email already registered" });
    }
    if (error.name === "ValidationError") {
      const message = Object.values(error.errors).map((err) => err.message).join(", ");
      console.log("📝 Register response status:", 400);
      return res.status(400).json({ success: false, message: message || "Invalid input. Please check your details." });
    }
    console.log("📝 Register response status:", 500);
    res.status(500).json({
      success: false,
      message: "Server error while creating account",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ================================
// 📩 Send Student OTP (Pre-Registration)
// ================================
export const sendStudentOtp = async (req, res) => {
  try {
    const { email, firstName } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email address is required" });
    }
    const normalizedEmail = String(email).toLowerCase().trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address" });
    }

    const existingUser = await Account.findOne({ email: normalizedEmail });
    if (existingUser?.isVerified) {
      return res.status(409).json({ success: false, message: "This email address is already registered. Please sign in." });
    }

    const otpCode = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await Otp.deleteMany({ email: normalizedEmail, purpose: "email_verification" });
    await Otp.create({ email: normalizedEmail, otp: otpCode, expiresAt: otpExpiry, purpose: "email_verification" });

    const studentName = firstName ? String(firstName).trim() : "Student";
    const emailResult = await sendEmailEnhanced({
      to: normalizedEmail,
      subject: "EduTechEX - Your Verification Code",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:30px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:600px;">
                  <!-- LOGO HEADER -->
                  <tr>
                    <td align="center" style="background:linear-gradient(135deg,#0e7490 0%,#155e75 100%);padding:28px 30px;">
                      <img src="cid:edutechex-logo" alt="EduTechEX" width="140" style="display:block;margin:0 auto 10px auto;max-width:140px;" />
                      <div style="color:#bae6fd;font-size:12px;margin-top:4px;letter-spacing:1px;font-family:Arial,sans-serif;">University Platform System</div>
                    </td>
                  </tr>
                  <!-- BODY -->
                  <tr>
                    <td style="padding:36px 40px 20px 40px;">
                      <h2 style="margin:0 0 16px 0;color:#0e7490;font-size:20px;font-family:Arial,sans-serif;">EduTechEX Verification Code</h2>
                      <p style="margin:0 0 10px 0;color:#374151;font-size:15px;font-family:Arial,sans-serif;">Hi <strong>${studentName}</strong>,</p>
                      <p style="margin:0 0 24px 0;color:#374151;font-size:15px;font-family:Arial,sans-serif;">Your verification code for creating your account is:</p>
                      <!-- OTP BOX -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding:16px 0 24px 0;">
                            <div style="background:#f0fdff;border:2px dashed #0e7490;border-radius:10px;padding:18px 40px;display:inline-block;">
                              <span style="font-size:38px;font-weight:900;letter-spacing:12px;color:#0e7490;font-family:'Courier New',Courier,monospace;">${otpCode}</span>
                            </div>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:0 0 8px 0;color:#374151;font-size:14px;font-family:Arial,sans-serif;">This code will expire in <strong>10 minutes</strong>.</p>
                      <p style="margin:0;color:#6b7280;font-size:13px;font-family:Arial,sans-serif;">If you did not request this, please ignore this email.</p>
                    </td>
                  </tr>
                  <!-- FOOTER -->
                  <tr>
                    <td style="padding:20px 40px 30px 40px;border-top:1px solid #e5e7eb;">
                      <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;font-family:Arial,sans-serif;">
                        Questions? Contact us at <a href="mailto:edutechexcollege@gmail.com" style="color:#0e7490;">edutechexcollege@gmail.com</a>
                      </p>
                      <p style="margin:8px 0 0 0;color:#d1d5db;font-size:11px;text-align:center;font-family:Arial,sans-serif;">&copy; EduTechEX University Platform System</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });

    if (!emailResult?.success) {
      console.error("❌ sendStudentOtp email delivery failed:", emailResult?.error);
      return res.status(500).json({
        success: false,
        message: "Failed to send verification code email. Please check your email configuration.",
        ...(process.env.NODE_ENV === "development" && { error: emailResult?.error }),
      });
    }

    res.status(200).json({
      success: true,
      message: `Verification code sent to ${normalizedEmail}. Please check your inbox.`,
    });
  } catch (error) {
    console.error("❌ sendStudentOtp error:", error);
    res.status(500).json({ success: false, message: "Failed to send verification code. Please try again." });
  }
};

// ================================
// 🔐 Verify OTP
// ================================
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP are required" });

    const normalizedEmail = email.toLowerCase();
    const otpRecord = await Otp.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
    if (!otpRecord) return res.status(400).json({ success: false, message: "OTP not found or expired" });

    if (otpRecord.expiresAt.getTime() <= Date.now()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    const isMatch = await otpRecord.compareOTP(otp);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid OTP" });

    if (otpRecord.purpose === "password_reset") {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(200).json({ success: true, message: "Password reset OTP verified successfully.", otpValid: true });
    }

    await Account.updateOne({ email: normalizedEmail }, { isVerified: true });
    await Otp.deleteOne({ _id: otpRecord._id });
    res.status(200).json({ success: true, message: "Account verified successfully. You can now log in." });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ success: false, message: "Server error during OTP verification" });
  }
};

// ================================
// 📩 Verify Email OTP (Registration Gate)
// ================================
export const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email address and verification code are required" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const otpRecord = await Otp.findOne({ email: normalizedEmail, purpose: "email_verification" }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "Verification code not found or expired. Please click 'Send OTP' to request a new code." });
    }

    if (otpRecord.expiresAt.getTime() <= Date.now()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, message: "Verification code has expired. Please click 'Send OTP' to request a new code." });
    }

    const isMatch = await otpRecord.compareOTP(String(otp).trim());
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid verification code. Please check your email and try again." });
    }

    // Mark as verified
    otpRecord.isVerified = true;
    await otpRecord.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully! You can now create your account.",
      emailVerified: true
    });
  } catch (error) {
    console.error("❌ verifyEmailOtp error:", error);
    res.status(500).json({ success: false, message: "Server error verifying code" });
  }
};

// ================================
// 🔑 Login
// ================================
export const loginAccount = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) 
      return res.status(400).json({ success: false, message: "Please provide email and password" });

    const account = await Account.findOne({ email: email.toLowerCase() });
    if (!account) 
      return res.status(401).json({ success: false, message: "Invalid email or password" });

    const isMatch = await account.comparePassword(password);
    if (!isMatch) 
      return res.status(401).json({ success: false, message: "Invalid email or password" });

    if (!account.isVerified) 
      return res.status(403).json({ success: false, message: "Please verify your email before logging in." });

    if (!account.isApprovedByAdmin || account.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: "Your account is pending admin approval.",
        requiresAdminApproval: true,
        isVerified: account.isVerified,
        isApprovedByAdmin: account.isApprovedByAdmin,
        status: account.status,
      });
    }

    if (account.status === 'suspended') 
      return res.status(403).json({ success: false, message: "Your account has been suspended.", isSuspended: true, status: account.status });
    
    if (account.status === 'inactive')  
      return res.status(403).json({ success: false, message: "Your account is inactive.", isInactive: true, status: account.status });

    // ✅ FIX: use updateOne to avoid triggering full model validation on old dirty data
    await Account.updateOne(
      { _id: account._id },
      { $set: { lastLogin: new Date() } }
    );

    const token = generateToken(account._id, account.email, account.studentType);
    const accountResponse = account.toObject();
    delete accountResponse.password;

    const computedCaid = formatCaid(account._id);
    accountResponse.caid = computedCaid;
    accountResponse.studentId = computedCaid;

    res.status(200).json({ 
      success: true, 
      message: "Login successful", 
      token, 
      account: accountResponse 
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ success: false, message: "Server error during login" });
  }
};

// ================================
// 🔍 Verify Token
// ================================
export const verifyToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: "Token is required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key-change-in-production");
    const account = await Account.findById(decoded.userId).select('status isApprovedByAdmin role');

    res.status(200).json({
      success: true,
      message: "Token verified successfully",
      user: { ...decoded, status: account?.status || 'unknown', isApprovedByAdmin: account?.isApprovedByAdmin || false, role: account?.role || 'student' },
    });
  } catch (error) {
    console.error("❌ Token verification error:", error);
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

// ================================
// 👤 Get Current Account
// ================================
export const getCurrentAccount = async (req, res) => {
  try {
    const userId = req.userId || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID missing in request" });
    }
    let account = await Account.findById(userId)
      .select("email firstName lastName gender citizenship phone countryCode studentType applicantType applyingFor applicationStatus applicationNumber submittedAt isLocked agreeToTerms isVerified lastLogin status role isApprovedByAdmin avatar joinDate adminNotes applicationProgress hasPassport passportNumber passportIssueDate passportExpiryDate passportFileName passportFileKey passportFileUrl passportOriginalName passportFileType passportFileSize passportUploadedAt passportExtractedData passportDetails personalInfo extractedData passportValidationStatus issuingCountry")
      .lean();

    if (!account) {
      const medicalAccount = await MedicalAccount.findById(userId).lean();
      if (medicalAccount) {
        account = {
          _id: medicalAccount._id,
          email: medicalAccount.email,
          firstName: medicalAccount.firstName,
          lastName: medicalAccount.lastName,
          phone: medicalAccount.mobileNumber,
          studentType: "medical",
          isVerified: medicalAccount.isVerified,
          isApproved: medicalAccount.isApproved,
          role: "student"
        };
      }
    }

    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    const allDocumentFilters = [{ userId }];
    if (account.email) allDocumentFilters.push({ "extractedData.email": cleanAccountText(account.email).toLowerCase() });
    if (account.passportNumber) allDocumentFilters.push({ "extractedData.passportNumber": cleanAccountText(account.passportNumber).toUpperCase() });
    if (account.firstName && account.lastName) {
      allDocumentFilters.push({
        "extractedData.firstName": new RegExp(`^${escapeAccountRegex(account.firstName)}$`, "i"),
        "extractedData.lastName": new RegExp(`^${escapeAccountRegex(account.lastName)}$`, "i"),
      });
    }

    const [personalInfo, latestAllDocument] = await Promise.all([
      Promise.resolve({}),
      AllDocument.findOne({ $or: allDocumentFilters }).sort({ createdAt: -1 }).lean(),
    ]);

    const personalInfoDob = formatDateForProfileInput(personalInfo?.dateOfBirth);
    const passportOcrDob = formatDateForProfileInput(latestAllDocument?.extractedData?.dateOfBirth);
    const accountDob = formatDateForProfileInput(account.birthDate || account.dateOfBirth || account.dob);
    const resolvedDob = personalInfoDob || passportOcrDob || accountDob || "";

    console.log("OCR DOB:", latestAllDocument?.extractedData?.dateOfBirth);
    console.log("API DOB:", resolvedDob);

    const computedCaid = formatCaid(account._id);

    return res.status(200).json({
      success: true,
      account: {
        ...account,
        caid: computedCaid,
        studentId: computedCaid,
        birthDate: resolvedDob || account.birthDate || "",
        dateOfBirth: resolvedDob,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching current account:", error);
    return res.status(500).json({ success: false, message: "Server error fetching account" });
  }
};


// ================================
// 🛡️ ADMIN: Get All Users
// ================================
export const getAllUsersForAdmin = async (req, res) => {
  try {
    const users = await Account.find().select("-password -otp");
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    console.error("❌ Admin get users error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

// ================================
// 🔔 Notifications
// ================================
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    const unread = notifications.filter(n => !n.isRead).length;
    res.status(200).json({ success: true, notifications, total: notifications.length, unread });
  } catch (error) {
    console.error("❌ Failed to fetch user notifications:", error);
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.body;
    const userId = req.user?.userId;
    if (!userId || !notificationId) return res.status(400).json({ success: false, message: "Invalid request" });

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId }, { isRead: true }, { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });

    res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error("❌ Mark as read failed:", error);
    res.status(500).json({ success: false, message: "Failed to mark as read" });
  }
};

// ================================
// 🛂 Parse Passport
// POST /api/students/passport/parse
// ================================
// ================================
// Registration Passport Upload OCR
// POST /api/students/parse-passport
// ================================
export const parsePassportUpload = async (req, res) => {
  let s3Key = null;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No passport file uploaded." });
    }

    s3Key = req.file.key;
    const allLines = await extractPassportLinesFromS3(s3Key, req.file.mimetype || "");

    if (!allLines.length) {
      return res.status(422).json({ success: false, message: "No text could be extracted. Please upload a clearer passport file." });
    }

    const extractedData = buildPassportFormDataFromLines(allLines);
    const filledCount = Object.values(extractedData)
      .filter((value) => value && String(value).trim() !== "")
      .length;

    if (filledCount === 0) {
      return res.status(422).json({ success: false, message: "Could not extract passport details. Please upload a clearer PDF, JPG, or PNG." });
    }

    const passportFileMetadata = buildPassportFileMetadata(req.file);
    return res.status(200).json({
      success: true,
      message: `Passport scanned successfully. ${filledCount} fields extracted.`,
      filledCount,
      data: { ...extractedData, ...passportFileMetadata },
    });
  } catch (error) {
    console.error("Passport registration parse error:", error);
    if (s3Key) {
      try { await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key })); } catch (_) {}
    }
    return res.status(500).json({ success: false, message: error.message || "Server error while parsing passport." });
  }
};
export const parsePassport = async (req, res) => {
  let s3Key = null;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No passport file uploaded." });

    s3Key = req.file.key;
    const userId = req.user?.userId;

    let textractResponse;
    try {
      textractResponse = await textract.send(new AnalyzeDocumentCommand({
        Document: { S3Object: { Bucket: BUCKET_NAME, Name: s3Key } },
        FeatureTypes: ["FORMS"],
      }));
    } catch {
      try {
        textractResponse = await textract.send(new DetectDocumentTextCommand({
          Document: { S3Object: { Bucket: BUCKET_NAME, Name: s3Key } },
        }));
      } catch {
        throw new Error("Could not read the passport. Please ensure the image is clear and try again.");
      }
    }

    const allLines  = extractTextLines(textractResponse);
    console.log("[Passport OCR lines]", allLines);
    const { mrzLine1, mrzLine2 } = findMrzLines(allLines);
    const line1Data = mrzLine1 ? parseMrzLine1(mrzLine1) : {};
    const line2Data = mrzLine2 ? parseMrzLine2(mrzLine2) : {};
    const mrzPassportNumber = line2Data.passportNumber || "";
    const ocrData = parsePassportFromOcrLines(allLines, {
      extractPassportNumber: !mrzPassportNumber,
    });
    const ocrPassportCandidate = ocrData.passportNumber || "";
    const finalPassportNumber = mrzPassportNumber || ocrPassportCandidate;

    console.log("[Passport OCR] MRZ passport number:", mrzPassportNumber || "not found");
    console.log("[Passport OCR] OCR passport candidate:", ocrPassportCandidate || "not found");
    console.log("[Final passport number]", finalPassportNumber || "not found");

    const formFields = mapToFormFields(line1Data, line2Data, {
      ...ocrData,
      passportNumber: finalPassportNumber,
    });

    const passportFileMetadata = buildPassportFileMetadata(req.file);

    if (!formFields.firstName && !formFields.lastName) {
      return res.status(422).json({ success: false, message: "Could not extract name fields. Please upload a clearer image." });
    }

    const filledCount = Object.entries(formFields)
      .filter(([key, val]) => key !== "_passportMeta" && val && String(val).trim() !== "")
      .length;

    if (userId) {
      const passportMeta = formFields._passportMeta || {};
      const passportNationality = passportMeta.nationality || passportMeta.issuingCountry || formFields.country || "";
      const passportResidence = formFields.country || passportMeta.issuingCountry || passportNationality || "";
      await Account.findByIdAndUpdate(userId, {
        ...passportFileMetadata,
        nationality: passportNationality,
        passportNationality,
        citizenship: passportNationality,
        issuingCountry: passportMeta.issuingCountry || formFields.country || "",
        countryOfResidence: passportResidence,
        countryOfBirth: passportMeta.issuingCountry || passportNationality || passportResidence,
        passportNumber: passportMeta.passportNumber || finalPassportNumber || undefined,
        passportIssueDate: passportMeta.issueDate || undefined,
        passportExpiryDate: passportMeta.expiryDate || undefined,
        passportExtractedData: { ...passportMeta, extractedAt: new Date() },
      });
    }

    res.status(200).json({
      success: true,
      message: `Passport scanned successfully. ${filledCount} fields extracted.`,
      filledCount,
      data: { ...formFields, ...passportFileMetadata },
    });
  } catch (error) {
    console.error("❌ Passport parse error:", error);
    if (s3Key) { try { await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key })); } catch (_) {} }
    res.status(500).json({ success: false, message: error.message || "Server error while parsing passport." });
  }
};

// ================================
// 🛂 Delete Passport
// DELETE /api/students/passport
// ================================
export const deletePassport = async (req, res) => {
  try {
    const userId  = req.user?.userId;
    const account = await Account.findById(userId);
    const passportFileKey = resolveS3FileKey(account?.passportFileKey || account?.passportFileUrl || "");
    if (!passportFileKey) return res.status(404).json({ success: false, message: "No passport found." });

    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: passportFileKey }));
    await Account.findByIdAndUpdate(userId, {
      $unset: {
        passportFileName: "",
        passportFileKey: "",
        passportFileUrl: "",
        passportOriginalName: "",
        passportFileType: "",
        passportFileSize: "",
        passportUploadedAt: "",
        passportValidationStatus: "",
        passportExtractedData: "",
      },
    });
    res.status(200).json({ success: true, message: "Passport deleted successfully." });
  } catch (error) {
    console.error("❌ Delete passport error:", error);
    res.status(500).json({ success: false, message: "Server error deleting passport." });
  }
};

// ================================
// 🪪 Parse Aadhaar / Govt ID
// POST /api/students/aadhaar/parse
// ================================
export const parseAadhaar = async (req, res) => {
  let s3Key = null;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded." });

    s3Key = req.file.key;
    const userId = req.user?.userId;

    let textractResponse;
    try {
      textractResponse = await textract.send(new AnalyzeDocumentCommand({
        Document: { S3Object: { Bucket: BUCKET_NAME, Name: s3Key } },
        FeatureTypes: ["FORMS"],
      }));
    } catch {
      try {
        textractResponse = await textract.send(new DetectDocumentTextCommand({
          Document: { S3Object: { Bucket: BUCKET_NAME, Name: s3Key } },
        }));
      } catch {
        throw new Error("Could not read the document. Please ensure the image is clear and try again.");
      }
    }

    const allLines = extractTextLines(textractResponse);
    const ocrData  = parsePassportFromOcrLines(allLines);

    const formFields = {
      firstName: ocrData.firstName || "", lastName: ocrData.lastName || "",
      birthDate: ocrData.dateOfBirth || "", gender: ocrData.sex || "",
      addressLine1: ocrData.addressLine1 || "", addressLine2: ocrData.addressLine2 || "",
      city: ocrData.city || "", state: ocrData.state || "",
      zipCode: ocrData.zipCode || "", country: ocrData.country || "India",
      phone: ocrData.phone || "",
    };

    const data = Object.fromEntries(Object.entries(formFields).filter(([_, v]) => v && String(v).trim() !== ""));
    if (Object.keys(data).length === 0) {
      return res.status(422).json({ success: false, message: "Could not extract data. Please upload a clearer image." });
    }

    if (userId) await Account.findByIdAndUpdate(userId, { aadhaarS3Key: s3Key, aadhaarUploadedAt: new Date() });

    res.status(200).json({ success: true, message: `Document scanned successfully. ${Object.keys(data).length} fields extracted.`, filledCount: Object.keys(data).length, data });
  } catch (error) {
    console.error("❌ Aadhaar parse error:", error);
    if (s3Key) { try { await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key })); } catch (_) {} }
    res.status(500).json({ success: false, message: error.message || "Server error while parsing document." });
  }
};

// ================================
// 📄 Parse CV / Résumé
// POST /api/students/cv/parse
// ================================
export const parseCV = async (req, res) => {
  let s3Key = null;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No CV file uploaded." });

    s3Key          = req.file.key;
    const userId   = req.user?.userId;
    const mimeType = req.file.mimetype || "";

    console.log("═══════════════════════════════════════");
    console.log("📄 CV Upload Debug Info:");
    console.log("  User ID     :", userId);
    console.log("  S3 Key      :", s3Key);
    console.log("  MIME Type   :", mimeType);
    console.log("  File size   :", req.file.size);
    console.log("  AWS Region  :", process.env.AWS_REGION);
    console.log("  Bucket Name :", process.env.AWS_BUCKET_NAME);
    console.log("═══════════════════════════════════════");

    // ── Step 1: verify file exists in S3 ──
    try {
      const s3Check = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key }));
      console.log("✅ S3 file verified. ContentType:", s3Check.ContentType);
    } catch (s3Err) {
      console.error("❌ S3 file NOT accessible:", s3Err.message);
      throw new Error(`S3 access failed: ${s3Err.message}`);
    }

    let allLines   = [];
    const isPdf    = mimeType === "application/pdf" || s3Key.toLowerCase().endsWith(".pdf");
    console.log("📋 Is PDF?", isPdf);

    if (isPdf) {
      console.log("📑 PDF — trying async Textract first...");
      try {
        allLines = await extractTextWithAsyncTextract(s3Key);
        console.log("✅ Async Textract succeeded. Lines:", allLines.length);
      } catch (asyncErr) {
        console.error("❌ Async Textract error name    :", asyncErr.name);
        console.error("❌ Async Textract error message :", asyncErr.message);
        console.error("❌ Async Textract HTTP status   :", asyncErr.$metadata?.httpStatusCode);

        // ── Fallback: sync Textract (works for single-page PDFs) ──
        console.log("⚠️ Falling back to sync Textract...");
        try {
          const textractResponse = await textract.send(new DetectDocumentTextCommand({
            Document: { S3Object: { Bucket: BUCKET_NAME, Name: s3Key } },
          }));
          allLines = extractTextLines(textractResponse);
          console.log("✅ Sync Textract fallback succeeded. Lines:", allLines.length);
        } catch (syncErr) {
          console.error("❌ Sync fallback also failed:", syncErr.message);
          console.error("❌ Sync fallback HTTP status :", syncErr.$metadata?.httpStatusCode);
          throw new Error(
            `Could not read the CV PDF. Async error: ${asyncErr.message} | Sync error: ${syncErr.message}`
          );
        }
      }
    } else {
      console.log("🖼️ Image — using sync Textract...");
      try {
        const textractResponse = await textract.send(new DetectDocumentTextCommand({
          Document: { S3Object: { Bucket: BUCKET_NAME, Name: s3Key } },
        }));
        allLines = extractTextLines(textractResponse);
        console.log("✅ Image Textract succeeded. Lines:", allLines.length);
      } catch (syncErr) {
        console.error("❌ Image Textract failed:", syncErr.message);
        console.error("❌ Image Textract HTTP status:", syncErr.$metadata?.httpStatusCode);
        throw new Error("Could not read the CV image. Please upload a clear JPG or PNG.");
      }
    }

    console.log(`📝 First 20 lines:`, allLines.slice(0, 20));

    if (allLines.length === 0) {
      return res.status(422).json({ success: false, message: "No text could be extracted. Please upload a text-based PDF or a clear image." });
    }

    const cvData     = parseCVFromOcrLines(allLines);
    const formFields = mapCVToAllSections(cvData);

    console.log("✅ CV name extracted:", {
      firstName:  formFields.firstName,
      middleName: formFields.middleName,
      lastName:   formFields.lastName,
    });

    const filledCount = Object.entries(formFields).filter(([key, val]) => {
      if (key.startsWith('_') || key.startsWith('cv') || key === "dobWasExplicit") return false;
      return val && String(val).trim() !== '';
    }).length;

    const totalExtracted =
      filledCount +
      (formFields.cvEducation?.length         || 0) +
      Object.keys(formFields.cvTesting || {}).length +
      (formFields.cvActivities?.length        || 0);

    console.log("📊 Extraction summary:", {
      filledCount,
      educationEntries:  formFields.cvEducation?.length         || 0,
      testingEntries:    Object.keys(formFields.cvTesting || {}).length,
      activitiesEntries: formFields.cvActivities?.length        || 0,
      totalExtracted,
    });

    if (totalExtracted === 0) {
      return res.status(422).json({ success: false, message: "Could not extract meaningful data. Please upload a clearer file." });
    }

    if (userId) {
      await Account.findByIdAndUpdate(userId, {
        cvS3Key:      s3Key,
        cvUploadedAt: new Date(),
        cvExtractedMeta: {
          email:           cvData._cvEmail          || "",
          educationCount:  (cvData.education  || []).length,
          activitiesCount: (cvData.activities || []).length,
          extractedAt:     new Date(),
        },
      });
    }

    res.status(200).json({
      success:     true,
      message:     `CV scanned successfully. ${totalExtracted} fields/entries extracted.`,
      filledCount: totalExtracted,
      summary: {
        profileFields:     filledCount,
        educationEntries:  formFields.cvEducation?.length         || 0,
        testingEntries:    Object.keys(formFields.cvTesting || {}).length,
        activitiesEntries: formFields.cvActivities?.length        || 0,
      },
      data: formFields,
    });

  } catch (error) {
    console.error("❌ CV parse error:", error.message);
    if (s3Key) {
      try { await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key })); } catch (_) {}
    }
    res.status(500).json({ success: false, message: error.message || "Server error while parsing CV." });
  }
};
