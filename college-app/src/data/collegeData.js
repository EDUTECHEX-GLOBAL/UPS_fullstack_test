// College data constants - Centralized data management
export const SCHOOL_OPTIONS = [
  'College of Liberal Arts & Science',
  'School of Architecture & Design',
  'School of Business',
  'School of Education & Human Sciences',
  'School of Engineering',
  'School of Journalism & Mass Communication'
];

export const PRE_PROFESSIONAL_OPTIONS = [
  'Pre-Athletic Training',
  'Pre-Dentistry',
  'Pre-Law',
  'Pre-Dr. Medicine/Osteopathic',
  'Pre-Optometry',
  'Pre-Physical Therapy',
  'Pre-Physician Assistant',
  'Pre-Veterinary Medicine'
];

export const MAJOR_OPTIONS = {
  'College of Liberal Arts & Science': [
    'African and African-American Studies (BA)',
    'African and African-American Studies (BGS)',
    'American Studies (BA)',
    'American Studies (BGS)',
    'Anthropology (BA)',
    'Anthropology (BGS)',
    'Applied Behavioral Science (BA)',
    'Applied Behavioral Science (BGS)',
    'Astronomy (BA)',
    'Astronomy (BS)',
    'Atmospheric Science (BS)',
    'Behavioral Neuroscience (BS)',
    'Biological Chemistry (BA)',
    'Biology - Biochemistry (BA)',
    'Biology - Biochemistry (BS)',
    'Biology - Ecology, Evolutionary, and Organismal Biology (BA)',
    'Biology - Ecology, Evolutionary, and Organismal Biology (BS)',
    'Biology - Human Biology (BA)',
    'Biology - Microbiology (BA)',
    'Biology - Microbiology (BS)',
    'Biology - Molecular, Cellular, and Developmental Biology (BA)',
    'Biology - Molecular, Cellular, and Developmental Biology (BS)',
    'Biology (BA)',
    'Chemical Physics (BS)',
    'Chemistry (BA)',
    'Chemistry (BS)',
    'Classics (BA)',
    'Classics (BGS)',
    'Communication Studies (BA)',
    'Communication Studies (BGS)',
    'Deciding - Arts and Humanities',
    'Deciding - Biological Sciences',
    'Deciding - Physical Sciences',
    'Deciding - Social and Behavioral Sciences',
    'East Asian Languages and Cultures (BA)',
    'Economics (BA)',
    'Economics (BGS)',
    'Economics (BS)',
    'English (BA)',
    'English (BGS)',
    'Environmental Studies (BA)',
    'Environmental Studies (BGS)',
    'Environmental Studies (BS)',
    'French, Francophone and Italian Studies (BA)',
    'Geography (BA)',
    'Geography (BGS)',
    'Geography (BS)',
    'Geology (BA)',
    'Geology (BS)',
    'Global and International Studies (BA)',
    'History (BA)',
    'History (BGS)',
    'History of Art (BA) Liberal Arts',
    'History of Art (BGS) Liberal Arts',
    'Jewish Studies (BA)',
    'Law & Society (BA)',
    'Law & Society (BGS)',
    'Liberal Arts & Sciences (BGS)',
    'Linguistics (BA)',
    'Linguistics (BGS)',
    'Mathematics (BA)',
    'Mathematics (BS)',
    'Philosophy (BA)',
    'Philosophy (BGS)',
    'Physics (BA)',
    'Physics (BS)',
    'Political Science (BA)',
    'Political Science (BGS)',
    'Pre-Allied Health',
    'Pre-Clinical Laboratory Science',
    'Pre-Health Info Management',
    'Pre-Nursing',
    'Pre-Pharmacy',
    'Pre-Physical Ed/Hlth Tchr Ed',
    'Pre-Respiratory Care',
    'Pre-Sport Sci/Comm Health',
    'Psychology (BA)',
    'Psychology (BGS)',
    'Public Administration (BA)',
    'Public Administration (BGS)',
    'Religious Studies (BA)',
    'Religious Studies (BGS)',
    'Slavic, German, and Eurasian Studies (BA)',
    'Sociology (BA)',
    'Sociology (BGS)',
    'Spanish (BA)',
    'Speech-Language-Hearing (BA)',
    'Speech-Language-Hearing (BGS)',
    'Women\'s Studies (BA)',
    'Women\'s Studies (BGS)'
  ],
  'School of Architecture & Design': [
    'Architecture (M.Arch) 5-year',
    'Design (BFA)',
    'Design - Industrial Design',
    'Design - Visual Communication'
  ],
  'School of Business': [
    'Accounting (BSB)',
    'Business Analytics',
    'Finance',
    'Information Systems',
    'Management & Leadership',
    'Marketing',
    'Supply Chain Management'
  ],
  'School of Education & Human Sciences': [
    'Early Childhood, Unified (BSE)',
    'Applied Behavioral Science',
    'Community Health',
    'Education - Elementary',
    'Education - Secondary',
    'Exercise Science',
    'Sport Management'
  ],
  'School of Engineering': [
    'Aerospace Engineering',
    'Architectural Engineering',
    'Bioengineering',
    'Chemical Engineering',
    'Civil Engineering',
    'Computer Engineering',
    'Computer Science',
    'Electrical Engineering',
    'Engineering Physics (BS)',
    'Mechanical Engineering',
    'Petroleum Engineering'
  ],
  'School of Journalism & Mass Communication': [
    'Journalism (BSJ)',
    'Journalism - News and Information',
    'Journalism - Strategic Communication',
    'Film and Media Studies'
  ]
};

// Subplan options for majors that have them
export const SUBPLAN_OPTIONS = {
  'Design (BFA)': [
    'Illustration',
    'Graphic Design',
    'Photography',
    'Animation'
  ],
  'Engineering Physics (BS)': [
    'Digital Electronic Systems',
    'Mechanical Systems',
    'Optical Systems',
    'Quantum Systems'
  ],
  'Journalism (BSJ)': [
    'Digital Marketing Communications, Advertising and Public Relations',
    'News and Information',
    'Strategic Communication',
    'Sports Journalism'
  ]
};

// Conditional questions configuration
export const CONDITIONAL_QUESTIONS = {
  // Architecture & Design conditional questions
  'Architecture (M.Arch) 5-year': {
    visualArtQuestion: true
  },
  'Design (BFA)': {
    portfolioInfo: true
  },
  
  // Engineering conditional questions (applies to all Engineering majors)
  'ENGINEERING_ALL': {
    mathQuestions: true
  }
};

// Helper functions
export const getMajorsBySchool = (school) => {
  return MAJOR_OPTIONS[school] || [];
};

export const getSubplansByMajor = (major) => {
  return SUBPLAN_OPTIONS[major] || [];
};

export const hasEngineeringPrograms = (school) => {
  return school === 'School of Engineering';
};

export const hasMathQuestions = (school, major) => {
  return school === 'School of Engineering' || CONDITIONAL_QUESTIONS['ENGINEERING_ALL']?.mathQuestions;
};

export const hasVisualArtQuestion = (school, major) => {
  return school === 'School of Architecture & Design' && CONDITIONAL_QUESTIONS[major]?.visualArtQuestion;
};

export const hasPortfolioInfo = (school, major) => {
  return school === 'School of Architecture & Design' && CONDITIONAL_QUESTIONS[major]?.portfolioInfo;
};

export const hasSubplanSelection = (school, major) => {
  return getSubplansByMajor(major).length > 0;
};