const StandardizedTestConfig = {
  "English Language": {
    "IELTS Academic": [
      { name: "ieltsOverall", label: "Overall Band", type: "number", min: 0, max: 9, step: 0.5, required: true },
      { name: "ieltsListening", label: "Listening", type: "number", min: 0, max: 9, step: 0.5, required: true },
      { name: "ieltsReading", label: "Reading", type: "number", min: 0, max: 9, step: 0.5, required: true },
      { name: "ieltsWriting", label: "Writing", type: "number", min: 0, max: 9, step: 0.5, required: true },
      { name: "ieltsSpeaking", label: "Speaking", type: "number", min: 0, max: 9, step: 0.5, required: true },
      { name: "trfNumber", label: "TRF Number", type: "text", required: true }
    ],
    "TOEFL iBT": [
      { name: "toeflTotal", label: "Total Score", type: "number", min: 0, max: 120, required: true },
      { name: "toeflReading", label: "Reading", type: "number", min: 0, max: 30, required: true },
      { name: "toeflListening", label: "Listening", type: "number", min: 0, max: 30, required: true },
      { name: "toeflSpeaking", label: "Speaking", type: "number", min: 0, max: 30, required: true },
      { name: "toeflWriting", label: "Writing", type: "number", min: 0, max: 30, required: true }
    ],
    "PTE Academic": [
      { name: "pteOverall", label: "Overall Score", type: "number", min: 10, max: 90, required: true },
      { name: "pteListening", label: "Listening", type: "number", min: 10, max: 90, required: true },
      { name: "pteReading", label: "Reading", type: "number", min: 10, max: 90, required: true },
      { name: "pteSpeaking", label: "Speaking", type: "number", min: 10, max: 90, required: true },
      { name: "pteWriting", label: "Writing", type: "number", min: 10, max: 90, required: true }
    ],
    "Duolingo English Test": [
      { name: "duolingoOverall", label: "Overall Score", type: "number", min: 10, max: 160, step: 5, required: true },
      { name: "duolingoLiteracy", label: "Literacy", type: "number", min: 10, max: 160, step: 5, required: true },
      { name: "duolingoComprehension", label: "Comprehension", type: "number", min: 10, max: 160, step: 5, required: true },
      { name: "duolingoConversation", label: "Conversation", type: "number", min: 10, max: 160, step: 5, required: true },
      { name: "duolingoProduction", label: "Production", type: "number", min: 10, max: 160, step: 5, required: true }
    ],
    "CAEL": [{ name: "overallScore", label: "Overall Score", type: "number", required: true }],
    "CELPIP": [{ name: "overallScore", label: "Overall Score", type: "number", required: true }],
    "Cambridge English": [
      { name: "cambridgeOverall", label: "Overall Score", type: "number", min: 80, max: 230, required: true },
      { name: "cambridgeGrade", label: "Grade", type: "select", options: [{label: "A", value: "A"}, {label: "B", value: "B"}, {label: "C", value: "C"}, {label: "Pass", value: "Pass"}], required: true },
      { name: "cambridgeCefr", label: "CEFR Level", type: "select", options: [{label: "A1", value: "A1"}, {label: "A2", value: "A2"}, {label: "B1", value: "B1"}, {label: "B2", value: "B2"}, {label: "C1", value: "C1"}, {label: "C2", value: "C2"}], required: true }
    ],
    "Medium of Instruction (MOI)": [] // No dynamic fields, just document
  },
  
  "Undergraduate Admission": {
    "SAT": [
      { name: "satTotal", label: "Total Score", type: "number", min: 400, max: 1600, step: 10, required: true },
      { name: "satReadingWriting", label: "Reading & Writing", type: "number", min: 200, max: 800, step: 10, required: true },
      { name: "satMath", label: "Math", type: "number", min: 200, max: 800, step: 10, required: true },
      { name: "satEssay", label: "Essay (Optional)", type: "number", required: false }
    ],
    "ACT": [
      { name: "actComposite", label: "Composite Score", type: "number", min: 1, max: 36, required: true },
      { name: "actEnglish", label: "English", type: "number", min: 1, max: 36, required: true },
      { name: "actMath", label: "Mathematics", type: "number", min: 1, max: 36, required: true },
      { name: "actReading", label: "Reading", type: "number", min: 1, max: 36, required: true },
      { name: "actScience", label: "Science", type: "number", min: 1, max: 36, required: true },
      { name: "actWriting", label: "Writing (Optional)", type: "number", min: 2, max: 12, required: false }
    ]
  },

  "French Language": {
    "DELF": [
      { name: "level", label: "Level", type: "select", options: [{label:"A1", value:"A1"}, {label:"A2", value:"A2"}, {label:"B1", value:"B1"}, {label:"B2", value:"B2"}], required: true },
      { name: "overallScore", label: "Overall Score", type: "number", required: true }
    ],
    "DALF": [
      { name: "level", label: "Level", type: "select", options: [{label:"C1", value:"C1"}, {label:"C2", value:"C2"}], required: true },
      { name: "overallScore", label: "Overall Score", type: "number", required: true }
    ],
    "TEF": [
      { name: "level", label: "Level", type: "select", options: [{label:"A1", value:"A1"}, {label:"A2", value:"A2"}, {label:"B1", value:"B1"}, {label:"B2", value:"B2"}, {label:"C1", value:"C1"}, {label:"C2", value:"C2"}], required: true },
      { name: "overallScore", label: "Overall Score", type: "number", required: true }
    ],
    "TCF": [
      { name: "level", label: "Level", type: "select", options: [{label:"A1", value:"A1"}, {label:"A2", value:"A2"}, {label:"B1", value:"B1"}, {label:"B2", value:"B2"}, {label:"C1", value:"C1"}, {label:"C2", value:"C2"}], required: true },
      { name: "overallScore", label: "Overall Score", type: "number", required: true }
    ]
  },

  "International Curriculum": {
    "IB Diploma": [
      { name: "totalPoints", label: "Total Points", type: "number", min: 0, max: 45, required: true },
      { name: "predictedOrFinal", label: "Predicted / Final", type: "select", options: [{label:"Predicted", value:"Predicted"}, {label:"Final", value:"Final"}], required: true }
    ],
    "A Levels": [
      { name: "subjects", label: "Subjects (comma separated)", type: "text", required: true },
      { name: "grades", label: "Grades (comma separated)", type: "text", required: true }
    ],
    "AS Levels": [
      { name: "subjects", label: "Subjects (comma separated)", type: "text", required: true },
      { name: "grades", label: "Grades (comma separated)", type: "text", required: true }
    ],
    "IGCSE": [
      { name: "subjects", label: "Subjects (comma separated)", type: "text", required: true },
      { name: "grades", label: "Grades (comma separated)", type: "text", required: true }
    ]
  },

  "Other": {
    "AP Exams": [
      { name: "apSubjects", label: "Subjects", type: "text", required: true },
      { name: "overallScore", label: "Scores", type: "text", required: true }
    ],
    "Other": [
      { name: "testDescription", label: "Test Description", type: "text", required: true },
      { name: "overallScore", label: "Overall Score / Result", type: "text", required: true }
    ]
  }
};

export const getCategories = () => Object.keys(StandardizedTestConfig);

export const getTestsForCategory = (category) => 
  category && StandardizedTestConfig[category] ? Object.keys(StandardizedTestConfig[category]) : [];

export const getTestFields = (category, testName) => {
  if (category && testName && StandardizedTestConfig[category]?.[testName]) {
    return StandardizedTestConfig[category][testName];
  }
  return [];
};

export default StandardizedTestConfig;
