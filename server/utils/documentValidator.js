import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

class DocumentValidator {
  constructor() {
    this.documentKeywords = {
      'transcript': [
        'transcript', 'academic record', 'grade report', 'marks', 'grades',
        'semester', 'quarter', 'credit', 'gpa', 'cumulative', 'report card',
        'high school', 'secondary school', 'percentage', 'score', 'subject',
        'mathematics', 'science', 'english', 'social studies', 'academic year',
        'course', 'credits', 'final grade', 'total credits', 'graduation date'
      ],
      'diploma': [
        'diploma', 'certificate', 'graduation', 'degree', 'awarded',
        'conferred', 'certify', 'successfully completed', 'this is to certify',
        'has completed', 'graduated from', 'diploma certificate',
        'high school diploma', 'secondary school', 'completion',
        'issued by', 'principal', 'school seal', 'signature',
        'graduation date', 'date of graduation', 'awarded to',
        'is hereby awarded', 'certificate of graduation',
        'high school certificate', 'school leaving certificate',
        'certificate of', 'leadership', 'training', 'program',
        'specialized', 'recognition', 'proudly presented',
        'in recognition', 'successful completion', 'presented to',
        'course', 'company director', 'course instructor', 'certificate no',
        'issuing date', 'certificate of graduation', 'completion of'
      ],
      'test_scores': [
        'sat', 'act', 'toefl', 'ielts', 'duolingo', 'test score',
        'examination', 'college board', 'educational testing service',
        'test date', 'score report', 'total score', 'section scores',
        'reading', 'writing', 'math', 'science', 'composite',
        'gre', 'gmat', 'score', 'percentile', 'verbal', 'quantitative'
      ],
      'language_proficiency': [
        'toefl', 'ielts', 'duolingo', 'pte', 'english proficiency',
        'language test', 'test of english', 'international english',
        'language testing', 'english language', 'proficiency test'
      ],
      'recommendation_letter': [
        'recommendation', 'reference', 'letter of recommendation',
        'to whom it may concern', 'dear admissions committee',
        'sincerely', 'respectfully', 'credentials', 'endorsement',
        'character', 'ability', 'potential', 'recommend', 'endorse',
        'confidential', 'evaluation', 'assessment', 'student',
        'performance', 'achievement', 'qualities', 'strengths'
      ],
      'recommendation': [
        'recommendation', 'reference', 'letter of recommendation',
        'to whom it may concern', 'dear admissions committee',
        'sincerely', 'respectfully', 'credentials', 'endorsement',
        'character', 'ability', 'potential', 'recommend', 'endorse'
      ],
      'resume': [
        'resume', 'curriculum vitae', 'cv', 'experience',
        'education', 'skills', 'projects', 'work history',
        'extracurricular', 'activities', 'achievements',
        'objective', 'summary', 'contact', 'phone', 'email',
        'work experience', 'internship', 'volunteer', 'leadership'
      ],
      'passport': [
        'passport', 'government', 'republic', 'identity', 'nationality',
        'passport number', 'date of issue', 'date of expiry',
        'place of issue', 'authority', 'international travel'
      ],
      'financial_documents': [
        'bank statement', 'financial statement', 'sponsorship letter',
        'affidavit of support', 'proof of funds', 'bank certificate',
        'income tax return', 'salary certificate', 'employment letter',
        'balance', 'account holder', 'bank name', 'currency', 'available funds',
        'financial guarantee', 'scholarship letter', 'loan approval'
      ],
      'id_proof': [
        'passport', 'national id', 'driving license', 'government id',
        'identification', 'date of birth', 'place of birth', 'citizenship',
        'nationality', 'photo id', 'identity card', 'permanent address',
        'issued by', 'expiry date', 'document number', 'government of'
      ],
      'personal_statement': [
        'personal statement', 'statement of purpose', 'application essay',
        'why i want to study', 'my goals', 'future plans', 'career objectives',
        'academic interests', 'motivation', 'aspirations', 'background',
        'experience', 'challenges', 'achievements', 'why this university',
        'why this program', 'contribute', 'diversity', 'passion'
      ],
      'other': [],

      'marksheet_9th': [
        '9th', 'ninth', 'grade 9', 'class ix', 'class 9', 'freshman',
        'secondary school', 'high school', 'marksheet', 'report card',
        'annual examination', 'board examination', 'school leaving',
        'academic year', 'promotion', 'grade nine', 'standard ix',
        'result', 'progress report', 'annual report', 'student progress',
        'academic performance', 'yearly examination', 'final examination'
      ],
      'marksheet_10th': [
        '10th', 'tenth', 'grade 10', 'class x', 'class 10', 'sophomore',
        'secondary school certificate', 'ssc', 'matriculation',
        'matric', 'secondary', 'school final', 'board examination',
        'high school', 'marksheet', 'report card', 'matriculation certificate',
        'board of secondary education', 'state board', 'cbse', 'icse',
        'all india', 'secondary examination', 'class tenth',
        'secondary school leaving certificate', 'sslc', 'final examination'
      ],
      'marksheet_12th': [
        '12th', 'twelfth', 'grade 12', 'class xii', 'class 12', 'senior',
        'higher secondary certificate', 'hsc', 'intermediate',
        'senior secondary', 'pre-university', 'puc', 'plus two',
        'board of higher secondary education', 'marksheet',
        'report card', 'inter', 'senior secondary certificate',
        'all india senior school certificate', 'aissc', 'isc',
        'cbse', 'state board', 'higher secondary examination',
        'class twelve', 'final year', 'senior school certificate'
      ]
    };
  }

  // Extract text from PDF using pdf-parse (no tesseract needed)
  async extractTextFromPDF(pdfBuffer) {
    try {
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('Empty PDF buffer');
      }

      const data = await pdfParse(pdfBuffer);
      return data.text || '';
    } catch (error) {
      console.error('Error extracting text from PDF:', error.message);

      if (error.message.includes('Invalid PDF structure') ||
          error.message.includes('Failed to parse PDF')) {
        console.log('PDF parsing failed, attempting fallback...');
        try {
          const bufferString = pdfBuffer.toString('utf8', 0, Math.min(1000, pdfBuffer.length));
          if (bufferString.includes('%PDF')) {
            console.log('PDF header found but parsing failed - returning empty text');
            return '';
          }
        } catch (fallbackError) {
          console.error('Fallback parsing also failed:', fallbackError.message);
        }
        return '';
      }

      throw new Error(`PDF processing error: ${error.message}`);
    }
  }

  // ✅ Image text extraction — tesseract removed, returns empty string
  // Images are accepted by file type in validateDocument()
  async extractTextFromImage(imageBuffer) {
    console.warn('⚠️ Image OCR not available — tesseract.js removed. File will be accepted by type.');
    return '';
  }

  // Extract text from text-based files
  async extractTextFromTextFile(fileBuffer) {
    try {
      return fileBuffer.toString('utf-8') || '';
    } catch (error) {
      console.error('Error extracting text from text file:', error);
      return '';
    }
  }

  // Extract text from document based on file type
  async extractTextFromDocument(fileBuffer, fileType) {
    const mimeType = fileType.toLowerCase();

    try {
      if (mimeType === 'application/pdf') {
        return await this.extractTextFromPDF(fileBuffer);
      } else if (mimeType.startsWith('image/')) {
        // No OCR — return empty, validated by file type below
        return await this.extractTextFromImage(fileBuffer);
      } else if (
        mimeType === 'text/plain' ||
        mimeType === 'application/msword' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        return await this.extractTextFromTextFile(fileBuffer);
      } else {
        console.warn(`Unsupported file type for text extraction: ${mimeType}`);
        return '';
      }
    } catch (error) {
      console.error(`Error extracting text from ${mimeType}:`, error.message);
      return '';
    }
  }

  // Enhanced diploma validation
  validateDiplomaContent(text, documentType) {
    if (documentType !== 'diploma') return null;

    console.log('Starting diploma validation...');

    if (!text || text.trim().length === 0) {
      console.log('No text extracted, accepting diploma anyway');
      return {
        isValid: true,
        confidence: 50,
        matches: 0,
        totalKeywords: 0,
        foundKeywords: [],
        reason: 'Diploma accepted (OCR may have failed)'
      };
    }

    const lowerText = text.toLowerCase();
    const diplomaKeywords = [
      'certificate', 'graduation', 'diploma', 'awarded', 'presented',
      'completion', 'completed', 'program', 'training', 'leadership',
      'specialized', 'recognition', 'proudly', 'in recognition',
      'successful completion', 'course', 'company', 'director',
      'instructor', 'certificate no', 'issuing date', 'certify',
      'this is to certify', 'has completed', 'graduated from',
      'issued by', 'signature', 'date'
    ];

    let matches = 0;
    const foundKeywords = [];

    for (const keyword of diplomaKeywords) {
      if (lowerText.includes(keyword)) {
        matches++;
        foundKeywords.push(keyword);
      }
    }

    console.log('Diploma validation matches:', matches, 'out of', diplomaKeywords.length);

    if (matches >= 1) {
      const confidence = Math.min(100, matches * 20);
      return {
        isValid: true,
        confidence,
        matches,
        totalKeywords: diplomaKeywords.length,
        foundKeywords,
        reason: `Diploma validated with ${matches} keyword matches (${confidence}% confidence)`
      };
    } else {
      return {
        isValid: true,
        confidence: 10,
        matches: 0,
        totalKeywords: diplomaKeywords.length,
        foundKeywords: [],
        reason: 'Diploma accepted (no keywords found but accepted anyway)'
      };
    }
  }

  // Enhanced validation for marksheets
  validateMarksheetContent(text, documentType) {
    const lowerText = text.toLowerCase();
    const baseKeywords = this.documentKeywords[documentType] || [];

    const gradeSpecificChecks = {
      'marksheet_9th': [
        (text) => text.match(/\b(9|nine|ix|ninth)\b.*\b(grade|class|standard)\b/i),
        (text) => text.match(/\b(promotion|annual|yearly)\b.*\b(exam|examination)\b/i)
      ],
      'marksheet_10th': [
        (text) => text.match(/\b(10|ten|x|tenth|matric|ssc|sslc|secondary)\b.*\b(certificate|exam|board)\b/i),
        (text) => text.match(/\b(secondary.*school|certificate|board.*examination)\b/i)
      ],
      'marksheet_12th': [
        (text) => text.match(/\b(12|twelve|xii|twelfth|hsc|intermediate|senior.*secondary)\b.*\b(certificate|exam|board)\b/i),
        (text) => text.match(/\b(higher.*secondary|pre.*university|puc|plus.*two)\b/i)
      ]
    };

    let matches = 0;
    const foundKeywords = [];

    for (const keyword of baseKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matches++;
        foundKeywords.push(keyword);
      }
    }

    const checks = gradeSpecificChecks[documentType] || [];
    for (const check of checks) {
      if (check(lowerText)) matches += 2;
    }

    return { matches, foundKeywords };
  }

  validateDocumentContent(text, documentType) {
    console.log('validateDocumentContent called for:', documentType);
    console.log('Text length:', text?.length || 0);

    if (documentType === 'diploma') {
      const diplomaValidation = this.validateDiplomaContent(text, documentType);
      if (diplomaValidation) return diplomaValidation;
    }

    if (!text || text.trim().length === 0) {
      if (documentType.startsWith('marksheet_')) {
        return {
          isValid: true,
          confidence: 0,
          matches: 0,
          totalKeywords: 0,
          foundKeywords: [],
          reason: 'No text could be extracted from marksheet. Document accepted for manual review.'
        };
      }
      return {
        isValid: true,
        confidence: 0,
        matches: 0,
        totalKeywords: 0,
        foundKeywords: [],
        reason: 'No text could be extracted from the document. Document accepted but may need manual review.'
      };
    }

    const lowerText = text.toLowerCase();
    const keywords = this.documentKeywords[documentType] || [];

    if (keywords.length === 0) {
      return {
        isValid: true,
        confidence: 100,
        matches: 0,
        totalKeywords: 0,
        foundKeywords: [],
        reason: 'No validation keywords defined for this document type. Document accepted.'
      };
    }

    let matches = 0;
    let foundKeywords = [];

    if (documentType.startsWith('marksheet_')) {
      const marksheetValidation = this.validateMarksheetContent(text, documentType);
      matches = marksheetValidation.matches;
      foundKeywords = marksheetValidation.foundKeywords;
    } else {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          matches++;
          foundKeywords.push(keyword);
        }
      }
    }

    const confidence = keywords.length > 0 ? (matches / keywords.length) * 100 : 0;
    const minConfidence = 10;
    const minMatches = Math.max(1, Math.floor(keywords.length * 0.05));
    const isValid = matches >= minMatches && confidence >= minConfidence;

    if (isValid) {
      return {
        isValid: true,
        confidence: Math.round(confidence),
        matches,
        totalKeywords: keywords.length,
        foundKeywords,
        reason: `Document validated with ${Math.round(confidence)}% confidence (${matches}/${keywords.length} keywords matched)`
      };
    }

    const optionalDocTypes = ['test_scores', 'language_proficiency', 'recommendation_letter', 'resume', 'marksheet_9th'];
    const requiredDocTypes = ['transcript', 'diploma', 'marksheet_10th', 'marksheet_12th', 'id_proof', 'passport'];

    if (documentType.startsWith('marksheet_')) {
      return {
        isValid: true,
        confidence: Math.round(confidence),
        matches,
        totalKeywords: keywords.length,
        foundKeywords,
        reason: `Marksheet accepted with low confidence (${Math.round(confidence)}%). Needs manual review.`
      };
    }

    if (optionalDocTypes.includes(documentType)) {
      return {
        isValid: true,
        confidence: Math.round(confidence),
        matches,
        totalKeywords: keywords.length,
        foundKeywords,
        reason: `Document accepted (optional document type). Found ${matches} matching keywords.`
      };
    }

    if (requiredDocTypes.includes(documentType)) {
      if (documentType === 'diploma') {
        return {
          isValid: true,
          confidence: Math.round(confidence),
          matches,
          totalKeywords: keywords.length,
          foundKeywords,
          reason: `Diploma accepted with low confidence (${Math.round(confidence)}%). Needs manual review.`
        };
      }
      return {
        isValid: false,
        confidence: Math.round(confidence),
        matches,
        totalKeywords: keywords.length,
        foundKeywords,
        reason: `Document validation failed. Found only ${matches} matching keywords (${Math.round(confidence)}% confidence). For ${documentType.replace('_', ' ')} documents, expected at least ${minMatches} matches.`
      };
    }

    return {
      isValid: false,
      confidence: Math.round(confidence),
      matches,
      totalKeywords: keywords.length,
      foundKeywords,
      reason: `Document validation failed. Found only ${matches} matching keywords (${Math.round(confidence)}% confidence). Expected at least ${minMatches} matches.`
    };
  }

  async validateDocument(fileBuffer, fileType, documentType) {
    try {
      console.log('=== START VALIDATION ===');
      console.log('Document Type:', documentType);
      console.log('File Type:', fileType);
      console.log('Buffer size:', fileBuffer.length);

      if (!this.documentKeywords[documentType]) {
        console.warn(`Unknown document type: ${documentType}. Using generic validation.`);
      }

      const extractedText = await this.extractTextFromDocument(fileBuffer, fileType);
      console.log('Extracted text length:', extractedText?.length || 0);

      const validationResult = this.validateDocumentContent(extractedText, documentType);

      console.log('Validation result:', {
        isValid: validationResult.isValid,
        confidence: validationResult.confidence,
        reason: validationResult.reason
      });
      console.log('=== END VALIDATION ===');

      return {
        ...validationResult,
        extractedTextLength: extractedText?.length || 0,
        extractedTextSample: extractedText && extractedText.length > 0
          ? extractedText.substring(0, 300)
          : 'No text extracted'
      };
    } catch (error) {
      console.error('Document validation error:', error.message);

      if (documentType.startsWith('marksheet_') || documentType === 'diploma') {
        return {
          isValid: true,
          confidence: 0,
          matches: 0,
          totalKeywords: 0,
          foundKeywords: [],
          reason: `Validation error but document accepted for review: ${error.message}`,
          extractedTextLength: 0,
          extractedTextSample: 'Error during validation - manual review required'
        };
      }

      return {
        isValid: false,
        confidence: 0,
        matches: 0,
        totalKeywords: 0,
        foundKeywords: [],
        reason: `Validation error: ${error.message}`,
        extractedTextLength: 0,
        extractedTextSample: 'Error during text extraction'
      };
    }
  }

  validateFileMetadata(file, allowedTypes, maxSize) {
    const errors = [];
    const allowedMimeTypes = allowedTypes.split(',').map(type => type.trim());
    let typeMatched = false;

    for (const allowedType of allowedMimeTypes) {
      if (file.mimetype === allowedType) {
        typeMatched = true;
        break;
      }
    }

    if (!typeMatched) {
      errors.push(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes}`);
    }

    if (file.size > maxSize) {
      const sizeInMB = (maxSize / (1024 * 1024)).toFixed(2);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      errors.push(`File size ${fileSizeMB}MB exceeds maximum allowed size of ${sizeInMB}MB`);
    }

    return { isValid: errors.length === 0, errors };
  }

  getDocumentTypeFromTitle(title) {
    const titleLower = title.toLowerCase();

    if (titleLower.includes('9th') || titleLower.includes('nine') || titleLower.includes('class ix') || titleLower.includes('grade 9')) {
      return 'marksheet_9th';
    }
    if (titleLower.includes('10th') || titleLower.includes('ten') || titleLower.includes('class x') || titleLower.includes('grade 10') || titleLower.includes('matric')) {
      return 'marksheet_10th';
    }
    if (titleLower.includes('12th') || titleLower.includes('twelve') || titleLower.includes('class xii') || titleLower.includes('grade 12') || titleLower.includes('hsc')) {
      return 'marksheet_12th';
    }

    const typeMap = {
      'transcript': 'transcript',
      'diploma': 'diploma',
      'certificate': 'diploma',
      'test scores': 'test_scores',
      'sat': 'test_scores',
      'act': 'test_scores',
      'toefl': 'language_proficiency',
      'ielts': 'language_proficiency',
      'duolingo': 'language_proficiency',
      'recommendation': 'recommendation_letter',
      'lor': 'recommendation_letter',
      'resume': 'resume',
      'cv': 'resume',
      'passport': 'id_proof',
      'id': 'id_proof',
      'financial': 'financial_documents',
      'bank': 'financial_documents'
    };

    for (const [key, value] of Object.entries(typeMap)) {
      if (titleLower.includes(key)) return value;
    }

    return 'other';
  }
}

export default new DocumentValidator();