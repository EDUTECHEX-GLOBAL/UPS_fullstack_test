export const DocumentCategories = [
  "Identity Documents",
  "Academic Documents",
  "Language Test Documents",
  "Supporting Documents",
  "Country Specific Documents",
  "Visa Stage Documents"
];

export const DocumentRules = [
  // 1. Identity Documents
  { id: "passport", name: "Passport Copy", category: "Identity Documents", required: true, countries: ["All"], legacyField: "passport" },
  { id: "photo", name: "Passport-size Photograph", category: "Identity Documents", required: true, countries: ["All"], legacyField: "photo" },
  { id: "national_id", name: "National ID", category: "Identity Documents", required: false, countries: ["All"] },
  { id: "birth_cert", name: "Birth Certificate", category: "Identity Documents", required: false, countries: ["All"] },

  // 2. Academic Documents
  { id: "cert12th", name: "Secondary School Completion Certificate", category: "Academic Documents", required: true, countries: ["All"], legacyField: "cert12th" },
  { id: "cert10th", name: "Grade 10 Certificate", category: "Academic Documents", required: false, countries: ["United States", "India"], legacyField: "cert10th" },
  { id: "cert11th", name: "Grade 11 Certificate", category: "Academic Documents", required: false, countries: ["United States", "India"], legacyField: "cert11th" },
  { id: "cert9th", name: "Grade 9 Certificate", category: "Academic Documents", required: false, countries: ["United States", "India"], legacyField: "cert9th" },
  { id: "transcript", name: "Official Academic Transcripts", category: "Academic Documents", required: true, countries: ["All"], legacyField: "transcript" },
  { id: "diploma", name: "Predicted Grades", category: "Academic Documents", required: false, countries: ["United Kingdom", "Canada", "United States"], legacyField: "diploma" },
  { id: "certified_transcripts", name: "Certified Transcripts", category: "Academic Documents", required: false, countries: ["France", "Australia"] },
  { id: "certified_translation", name: "Certified Translation", category: "Academic Documents", required: false, countries: ["France", "Australia", "Canada"] },
  { id: "course_description", name: "Course Description", category: "Academic Documents", required: false, countries: ["Canada"] },
  { id: "credential_eval", name: "Credential Evaluation (WES/ECA)", category: "Academic Documents", required: false, countries: ["Canada"] },

  // 3. Language Test Documents
  { id: "ielts_score", name: "IELTS Score Report", category: "Language Test Documents", required: false, countries: ["All"] },
  { id: "toefl_score", name: "TOEFL Score Report", category: "Language Test Documents", required: false, countries: ["All"] },
  { id: "pte_score", name: "PTE Score Report", category: "Language Test Documents", required: false, countries: ["Australia", "Canada"] },
  { id: "duolingo_score", name: "Duolingo Score Report", category: "Language Test Documents", required: false, countries: ["United States"] },
  { id: "cael_score", name: "CAEL Score Report", category: "Language Test Documents", required: false, countries: ["Canada"] },
  { id: "celpip_score", name: "CELPIP Score Report", category: "Language Test Documents", required: false, countries: ["Canada"] },
  { id: "moi_cert", name: "MOI Certificate", category: "Language Test Documents", required: false, countries: ["France", "United Kingdom"] },
  { id: "delf", name: "DELF", category: "Language Test Documents", required: false, countries: ["France"] },
  { id: "dalf", name: "DALF", category: "Language Test Documents", required: false, countries: ["France"] },
  { id: "tef", name: "TEF", category: "Language Test Documents", required: false, countries: ["France", "Canada"] },
  { id: "tcf", name: "TCF", category: "Language Test Documents", required: false, countries: ["France", "Canada"] },

  // 4. Supporting Documents
  { id: "sop", name: "Statement of Purpose (SOP)", category: "Supporting Documents", required: false, countries: ["Australia", "Canada", "United States"] },
  { id: "personal_statement", name: "Personal Statement", category: "Supporting Documents", required: false, countries: ["United States", "Canada"] },
  { id: "recommendation_letter", name: "Recommendation Letter(s)", category: "Supporting Documents", required: false, countries: ["United States", "Australia", "Canada"] },
  { id: "cv", name: "CV / Resume", category: "Supporting Documents", required: false, countries: ["United States", "Australia", "Canada"], legacyField: "cv" },
  { id: "portfolio", name: "Portfolio", category: "Supporting Documents", required: false, countries: ["All"], programs: ["Architecture", "Design", "Art", "Fashion"] },

  // 5. Country Specific Documents
  { id: "cricos", name: "CRICOS Information", category: "Country Specific Documents", required: false, countries: ["Australia"] },
  { id: "ucas_ps", name: "UCAS Personal Statement", category: "Country Specific Documents", required: true, countries: ["United Kingdom"] },
  { id: "uk_academic_ref", name: "Academic Reference", category: "Country Specific Documents", required: true, countries: ["United Kingdom"] },
  { id: "wes_eca", name: "WES / ECA Report", category: "Country Specific Documents", required: true, countries: ["Canada"] },
  { id: "ca_course_desc", name: "Course Descriptions", category: "Country Specific Documents", required: false, countries: ["Canada"] },
  { id: "fr_motivation", name: "Motivation Letter", category: "Country Specific Documents", required: true, countries: ["France"] },
  
  // USA specific initial financial documents
  { id: "us_bank_statement", name: "Bank Statement", category: "Country Specific Documents", required: true, countries: ["United States"] },
  { id: "us_affidavit", name: "Affidavit of Financial Support", category: "Country Specific Documents", required: false, countries: ["United States"] },
  { id: "us_sponsor_letter", name: "Sponsor Letter", category: "Country Specific Documents", required: false, countries: ["United States"] },

  // 6. Visa Stage Documents (Hidden during initial app)
  { id: "coe", name: "Confirmation of Enrolment (CoE)", category: "Visa Stage Documents", required: true, stage: "visa", countries: ["Australia"] },
  { id: "gsr", name: "Genuine Student Requirement", category: "Visa Stage Documents", required: true, stage: "visa", countries: ["Australia"] },
  { id: "proof_finance_aus", name: "Proof of Financial Capacity", category: "Visa Stage Documents", required: true, stage: "visa", countries: ["Australia"] },
  { id: "oshc", name: "Overseas Student Health Cover (OSHC)", category: "Visa Stage Documents", required: true, stage: "visa", countries: ["Australia"] },
  
  { id: "cas", name: "CAS", category: "Visa Stage Documents", required: true, stage: "visa", countries: ["United Kingdom"] },
  { id: "proof_finance_uk", name: "Proof of Financial Support", category: "Visa Stage Documents", required: true, stage: "visa", countries: ["United Kingdom"] },

  { id: "loa", name: "Letter of Acceptance", category: "Visa Stage Documents", required: true, stage: "visa", countries: ["Canada"] },
  { id: "study_permit", name: "Study Permit", category: "Visa Stage Documents", required: true, stage: "visa", countries: ["Canada"] },
  { id: "biometrics", name: "Biometrics", category: "Visa Stage Documents", required: true, stage: "visa", countries: ["Canada"] },
  { id: "medical_exam", name: "Medical Examination", category: "Visa Stage Documents", required: true, stage: "visa", countries: ["Canada"] },

  { id: "campus_france", name: "Campus France Approval", category: "Visa Stage Documents", required: true, stage: "visa", countries: ["France"] },
  { id: "proof_finance_fr", name: "Proof of Financial Resources", category: "Visa Stage Documents", required: true, stage: "visa", countries: ["France"] },
  { id: "visa_interview", name: "Visa Interview Status", category: "Visa Stage Documents", required: true, stage: "visa", countries: ["France"] },
];

export const getDocumentsForUser = (country = 'United Kingdom', program = '', stage = 'initial') => {
  return DocumentRules.filter(doc => {
    // 1. Stage filter
    if (stage === 'initial' && doc.stage === 'visa') return false;
    
    // 2. Country filter
    const matchesCountry = doc.countries.includes("All") || doc.countries.includes(country);
    if (!matchesCountry) return false;

    // 3. Program filter (if the document specifies programs, the user's program MUST match)
    if (doc.programs) {
      if (!program) return false;
      
      const programMatch = doc.programs.some(p => program.toLowerCase().includes(p.toLowerCase()));
      if (!programMatch) return false;
    }
    
    return true;
  });
};

export const groupDocumentsByCategory = (documents) => {
  const grouped = {};
  DocumentCategories.forEach(cat => grouped[cat] = []);
  documents.forEach(doc => {
    if (grouped[doc.category]) {
      grouped[doc.category].push(doc);
    }
  });
  return grouped;
};
