import fs from "fs";
import path from "path";
import PDFParser from "pdf2json";
import { EventEmitter } from "events";

// ✅ FIX: Prevent MaxListenersExceededWarning globally
EventEmitter.defaultMaxListeners = 20;

/* =====================================================
   KNOWN DOCUMENT TYPES
===================================================== */
const KNOWN_TYPES = [
  "passport",
  "tenthMarksheet",
  "twelfthMarksheet",
];

/* =====================================================
   SAFE HELPERS
===================================================== */

// ✅ Keep '<' character — critical for MRZ detection (e.g. P<IND<SHARMA<<RAHUL)
const normalize = (txt) =>
  String(txt || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s\/\-\:\.%<]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

/* =====================================================
   TEXT EXTRACTION
===================================================== */

// pdf2json (works without system binaries, no tesseract needed)
export const extractPDFText = (filePath) =>
  new Promise((resolve) => {
    try {
      if (!fs.existsSync(filePath)) return resolve("");

      const pdfParser = new PDFParser();
      pdfParser.setMaxListeners(20);

      const timeout = setTimeout(() => {
        try { pdfParser.destroy(); } catch { /* ignore */ }
        console.warn("⚠️ pdf2json timeout");
        resolve("");
      }, 7000);

      pdfParser.on("pdfParser_dataError", (err) => {
        clearTimeout(timeout);
        console.warn("⚠️ pdf2json failed:", err);
        resolve("");
      });

      pdfParser.on("pdfParser_dataReady", (data) => {
        clearTimeout(timeout);
        try {
          const pages = data?.Pages || [];
          const text = pages
            .map((p) =>
              (p.Texts || [])
                .map((t) =>
                  (t.R || [])
                    .map((r) => decodeURIComponent(r.T || ""))
                    .join(" ")
                )
                .join(" ")
            )
            .join(" ");
          const normalized = normalize(text);
          console.log(`📄 pdf2json extracted ${normalized.length} chars`);
          resolve(normalized);
        } catch {
          resolve("");
        }
      });

      pdfParser.loadPDF(filePath);
    } catch {
      resolve("");
    }
  });

// Image text extraction — no OCR (tesseract removed), accepted by file type
export const extractImageText = async (_filePath) => {
  console.warn("⚠️ Image OCR not available — tesseract.js removed. File will be accepted by type.");
  return "";
};

/* =====================================================
   PASSPORT VALIDATOR
===================================================== */
const validatePassport = (text) => {
  console.log("🔍 Validating passport, text length:", text.length);

  const KEYWORDS = [
    "passport", "surname", "given name", "nationality",
    "date of birth", "place of birth", "date of issue",
    "date of expiry", "passport number", "p<",
  ];

  const details = {
    mrz:         /[a-z0-9<]{25,}/i.test(text),
    number:      /\b[a-z]{1,2}[0-9]{6,8}\b/i.test(text),
    hasYear:     /(19|20)\d{2}/.test(text),
    hasPassport: /passport|pass\s*port/i.test(text),
    hasGovt:     /government|republic|federal|ministry/i.test(text),
    hasPersonal: /date of birth|place of birth|nationality/i.test(text),
    keywords:    KEYWORDS.filter((k) => text.includes(k)),
  };

  let confidence = 0;
  if (details.mrz)         confidence += 40;
  if (details.number)      confidence += 25;
  if (details.hasYear)     confidence += 10;
  if (details.hasPassport) confidence += 30;
  if (details.hasGovt)     confidence += 20;
  if (details.hasPersonal) confidence += 15;
  confidence += details.keywords.length * 5;

  console.log("📊 Passport confidence:", confidence, "| details:", details);

  return {
    valid:           confidence >= 35,
    confidence:      Math.min(confidence, 100),
    matchedKeywords: details.keywords,
    message: confidence >= 35
      ? `Valid passport (${confidence}% confidence)`
      : `Invalid passport (${confidence}% confidence)`,
  };
};

/* =====================================================
   MARKSHEET VALIDATOR
===================================================== */
const validateMarksheet = (text, grade) => {
  console.log(`\n🔍 Validating ${grade} marksheet, length: ${text.length}`);

  let confidence = 0;
  let matchedKeywords = [];

  if (/name[:\s]*[a-z\s]+/i.test(text)) {
    confidence += 10; matchedKeywords.push("name");
  }
  if (/roll\s*no[:\s]*\d+/i.test(text)) {
    confidence += 15; matchedKeywords.push("roll number");
  }
  if (/(19|20)\d{2}/.test(text)) {
    confidence += 10; matchedKeywords.push("year");
  }

  const subjects = [
    /mathematics|maths|math/i, /science/i,
    /english/i, /physics/i, /chemistry/i,
    /biology/i, /hindi/i, /social\s*science/i,
  ];
  const matchedSubjects = subjects.filter((p) => p.test(text)).length;
  if (matchedSubjects > 0) {
    confidence += Math.min(matchedSubjects * 5, 25);
    matchedKeywords.push(`${matchedSubjects} subjects`);
  }

  const marksPatterns = [
    /max\s*marks|maximum\s*marks/i,
    /marks\s*obtained/i,
    /total[:\s]*\d+/i,
    /\d+\s*\/\s*\d+/,
  ];
  const marksCount = marksPatterns.filter((p) => p.test(text)).length;
  if (marksCount > 0) {
    confidence += Math.min(marksCount * 5, 20);
    matchedKeywords.push("marks info");
  }

  if (/percentage[:\s]*\d+/i.test(text)) {
    confidence += 15; matchedKeywords.push("percentage");
  }
  if (/result[:\s]*pass/i.test(text)) {
    confidence += 10; matchedKeywords.push("pass result");
  }

  if (grade === "10th") {
    if (/(10th|tenth|class\s*x|ssc|secondary)/i.test(text)) {
      confidence += 20; matchedKeywords.push("10th terms");
    }
  } else if (grade === "12th") {
    if (/(12th|twelfth|class\s*xii|hsc|higher\s*secondary|intermediate)/i.test(text)) {
      confidence += 20; matchedKeywords.push("12th terms");
    }
  }

  // Soft boost only when marks-related keywords are present
  const hasMarksKeyword = matchedKeywords.some((k) =>
    ["marks info", "percentage", "pass result"].includes(k)
  );
  if (hasMarksKeyword && matchedKeywords.length >= 2 && confidence < 40) {
    confidence = 45;
    console.log("⚠️ Soft boost applied — marks-related keywords found");
  }

  const valid = confidence >= 40;
  console.log(`📊 ${grade} marksheet: confidence=${confidence}, valid=${valid}, keywords=[${matchedKeywords.join(", ")}]`);

  return {
    valid,
    confidence: Math.min(confidence, 100),
    matchedKeywords,
    message: valid
      ? `Valid ${grade} marksheet (${confidence}% confidence)`
      : `Invalid ${grade} marksheet. Found: ${matchedKeywords.join(", ") || "nothing"} (${confidence}% confidence)`,
  };
};

/* =====================================================
   QUICK BASIC VALIDATION
===================================================== */
export const quickValidatePassport = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, message: "File not found" };
    }

    const stats = fs.statSync(filePath);
    const ext   = path.extname(filePath).toLowerCase();

    if (![".pdf", ".png", ".jpg", ".jpeg"].includes(ext)) {
      return { valid: false, message: "Invalid file type" };
    }
    if (stats.size > 10 * 1024 * 1024) {
      return { valid: false, message: "File too large (10MB max)" };
    }

    return { valid: true, confidence: 40, message: "Basic validation passed" };
  } catch (error) {
    return { valid: false, message: error.message };
  }
};

/* =====================================================
   MAIN VALIDATOR
===================================================== */
export const validateDocumentType = async (filePath, expectedType) => {
  console.log(`\n🔍 Validating: ${expectedType} | file: ${filePath}`);

  if (!KNOWN_TYPES.includes(expectedType)) {
    console.warn(`⚠️ Unknown document type: "${expectedType}" — will auto-accept`);
  }

  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, confidence: 0, message: "File not found" };
    }

    const stats = fs.statSync(filePath);
    if (stats.size > 10 * 1024 * 1024) {
      return { valid: false, confidence: 0, message: "File too large (10MB max)" };
    }

    const ext = path.extname(filePath).toLowerCase();
    let text = "";
    let extractionMethod = "none";

    if (ext === ".pdf") {
      text = await extractPDFText(filePath);
      extractionMethod = "pdf2json";

    } else if ([".png", ".jpg", ".jpeg"].includes(ext)) {
      // No OCR available — fall through to type-based acceptance below
      extractionMethod = "image-type-accepted";

    } else {
      return { valid: false, confidence: 0, message: "Unsupported file type" };
    }

    console.log(`📄 Extracted ${text.length} chars via ${extractionMethod}`);

    // No text extracted (image file or scanned/unreadable PDF)
    if (!text || text.trim().length < 20) {
      if (expectedType === "tenthMarksheet" || expectedType === "twelfthMarksheet") {
        console.log("⚠️ No text extracted — accepting marksheet by file type (scanned/image)");
        return {
          valid:           true,
          confidence:      55,
          matchedKeywords: ["file type accepted"],
          message:         "Accepted based on file type (scanned document)",
          extractionMethod,
        };
      }

      if (expectedType === "passport") {
        const quick = await quickValidatePassport(filePath);
        return { ...quick, extractionMethod: "basic-validation" };
      }

      // Unknown / generic types — auto-accept
      return {
        valid:           true,
        confidence:      50,
        matchedKeywords: [],
        message:         "Generic document accepted",
        extractionMethod,
      };
    }

    // Run type-specific validation on extracted PDF text
    let result;
    if (expectedType === "passport") {
      result = validatePassport(text);
    } else if (expectedType === "tenthMarksheet") {
      result = validateMarksheet(text, "10th");
    } else if (expectedType === "twelfthMarksheet") {
      result = validateMarksheet(text, "12th");
    } else {
      result = {
        valid:           true,
        confidence:      50,
        matchedKeywords: [],
        message:         "Generic document accepted",
      };
    }

    result.extractionMethod = extractionMethod;
    console.log(`✅ Result for ${expectedType}:`, result);
    return result;

  } catch (error) {
    console.error("❌ Validation error:", error);
    return { valid: false, confidence: 0, message: error.message };
  }
};

/* =====================================================
   DEFAULT EXPORT
===================================================== */
export default {
  validateDocumentType,
  quickValidatePassport,
  extractPDFText,
  extractImageText,
};