// Partner-network destinations for Bachelor's & Master's study abroad.
// Source: University Partnership Directory (GUS / Shorelight / Study Group), retrieved 28 Aug 2026.
// Institution lists for the larger countries are a curated sample of each network's public roster.

export const INSTITUTION_COLUMNS = ['Institution', 'Network', 'Partnership model', 'Degree levels', 'Program fields'];

export const STUDY_FOOTER_NOTE =
  'Compiled from Global University Systems (GUS), Shorelight and Study Group public partner pages — retrieved 28 Aug 2026. Program/field coverage is an indicative categorisation, not a verbatim course catalogue. Confirm exact programme lists with the institution before applying.';

export const partnerCountries = [
  {
    id: 'uk',
    name: 'United Kingdom',
    tagline: 'The largest partner network — comprehensive universities across every field.',
    fields: ['Business & Management', 'Engineering', 'Computer Science & IT', 'Law', 'Health & Nursing', 'Arts, Design & Media'],
    bachelorNote:
      '3-year honours degrees (4 in Scotland). Foundation and International Year One routes bridge students who just miss direct-entry requirements.',
    masterNote:
      "Mostly 1-year taught Master's. The Graduate Route gives 2 years of post-study work rights after graduation.",
    networks: 'GUS, Study Group',
    degreeLevels: "Bachelor's, Master's, English Language (non-degree)",
    totalInstitutions: 30,
    truncated: true,
    institutions: [
      ['University of Leeds', 'Study Group', 'International Study Centre', "Bachelor's, Master's", 'All 8 fields (comprehensive)'],
      ['Durham University', 'Study Group', 'International Study Centre', "Bachelor's, Master's", 'All 8 fields (comprehensive)'],
      ['University of Sheffield', 'Study Group', 'International Study Centre', "Bachelor's, Master's", 'All 8 fields (comprehensive)'],
      ['University of Bath', 'Study Group', 'International Study Centre', "Bachelor's, Master's", 'All 8 fields (comprehensive)'],
      ['University of Surrey', 'Study Group', 'International Study Centre', "Bachelor's, Master's", 'All 8 fields (comprehensive)'],
      ['University of Sussex', 'Study Group', 'International Study Centre', "Bachelor's, Master's", 'All 8 fields (comprehensive)'],
      ['Cardiff University', 'Study Group', 'International Study Centre', "Bachelor's, Master's", 'All 8 fields (comprehensive)'],
      ['University of Aberdeen', 'Study Group', 'International Study Centre', "Bachelor's, Master's", 'All 8 fields (comprehensive)'],
      ['University of Strathclyde', 'Study Group', 'International Study Centre', "Bachelor's, Master's", 'All 8 fields (comprehensive)'],
      ['Royal Holloway, University of London', 'Study Group', 'International Study Centre / Direct Entry', "Bachelor's, Master's", 'All 8 fields (comprehensive)'],
      ['Kingston University', 'GUS / Study Group', 'Academic Partner / ISC', "Bachelor's, Master's", 'Business, Engineering, Health, Arts & Design'],
      ['Manchester Metropolitan University', 'GUS', 'Academic Partner', "Bachelor's, Master's", 'Business, Health, Sciences, Arts & Design'],
      ['Sheffield Hallam University', 'GUS', 'Academic Partner', "Bachelor's, Master's", 'Business, Engineering, Computer Science, Health'],
      ['University of Greenwich', 'GUS', 'Academic Partner', "Bachelor's, Master's", 'Business, Engineering, Sciences'],
      ['Arden University', 'GUS', 'Owned Institution', "Bachelor's, Master's", 'Business, Computer Science, Health, Law'],
      ['The University of Law', 'GUS', 'Owned Institution', "Bachelor's, Master's", 'Law, Business, Social Sciences'],
    ],
  },
  {
    id: 'usa',
    name: 'United States',
    tagline: 'Pathway and direct-entry access to research universities and liberal-arts colleges.',
    fields: ['Business & Management', 'Engineering', 'Computer Science & IT', 'Natural & Physical Sciences', 'Health & Nursing', 'Social Sciences'],
    bachelorNote:
      '4-year degrees with a flexible major/minor structure. Pathway and Global-First-Year programs count toward the degree while building English and credits.',
    masterNote:
      "1–2 year Master's, many STEM-designated for up to 3 years of OPT work authorisation. Graduate-only entry available at several partners.",
    networks: 'GUS, Shorelight, Study Group',
    degreeLevels: "Bachelor's, Master's, JD / LL.M.",
    totalInstitutions: 109,
    truncated: true,
    institutions: [
      ['University of California, Berkeley', 'Shorelight', 'Standard Partner', "Bachelor's, Master's (select)", 'Business, Engineering, Computer Science, Sciences'],
      ['Johns Hopkins University', 'Shorelight', 'Standard Partner', "Master's (graduate only)", 'All 8 fields (comprehensive)'],
      ['University of Virginia', 'Shorelight', 'Standard Partner', "Master's (graduate only)", 'All 8 fields (comprehensive)'],
      ['Villanova University', 'Shorelight', 'Standard Partner', "Master's (graduate only)", 'All 8 fields (comprehensive)'],
      ['Rutgers University – New Brunswick', 'Shorelight', 'Standard Partner', "Bachelor's, Master's (select)", 'All 8 fields (comprehensive)'],
      ['Tulane University', 'Shorelight', 'Signature School', "Master's (graduate only)", 'All 8 fields (comprehensive)'],
      ['University at Buffalo', 'Shorelight', 'Standard Partner', "Bachelor's, Master's (select)", 'All 8 fields (comprehensive)'],
      ['Stony Brook University', 'Shorelight', 'Standard Partner', "Bachelor's, Master's (select)", 'All 8 fields (comprehensive)'],
      ['University of Illinois at Chicago', 'Shorelight', 'Signature School', "Bachelor's, Master's (select)", 'All 8 fields (comprehensive)'],
      ['Auburn University', 'Shorelight', 'Signature School', "Bachelor's, Master's (select)", 'All 8 fields (comprehensive)'],
      ['Florida International University', 'Shorelight', 'Signature School', "Bachelor's, Master's (select)", 'All 8 fields (comprehensive)'],
      ['Louisiana State University', 'Shorelight', 'Signature School', "Bachelor's, Master's (select)", 'All 8 fields (comprehensive)'],
      ['University of Utah', 'Shorelight', 'Signature School', "Bachelor's, Master's (select)", 'All 8 fields (comprehensive)'],
      ['University of Central Florida', 'Shorelight', 'Signature School', "Bachelor's, Master's (select)", 'All 8 fields (comprehensive)'],
      ['American University', 'Shorelight', 'Signature School', "Bachelor's, Master's (select)", 'All 8 fields (comprehensive)'],
      ['Gonzaga University', 'Shorelight', 'Signature School', "Bachelor's, Master's (select)", 'Business, Engineering, Computer Science, Health'],
      ['Seattle University', 'Shorelight', 'Signature School', "Bachelor's, Master's (select)", 'Business, Engineering, Computer Science, Health'],
      ['Missouri University of Science and Technology', 'Shorelight', 'Signature School', "Bachelor's, Master's (select)", 'Engineering, Computer Science, Sciences, Business'],
      ['DePaul University', 'Study Group', 'Direct Entry', "Bachelor's, Master's", 'All 8 fields (comprehensive)'],
      ['New Jersey Institute of Technology (NJIT)', 'Study Group', 'Direct Entry', "Bachelor's, Master's", 'All 8 fields (comprehensive)'],
      ['Herzing University', 'GUS', 'InUni Partner', "Bachelor's, Master's", 'Business, Computer Science, Health'],
      ['Penn State Dickinson Law', 'GUS', 'InUni Partner', 'JD, LL.M.', 'Law'],
    ],
  },
  {
    id: 'canada',
    name: 'Canada',
    tagline: 'Career-focused universities and colleges with strong post-graduation work options.',
    fields: ['Business & Management', 'Computer Science & IT', 'Engineering', 'Hospitality', 'Media & Communication'],
    bachelorNote:
      'Bachelor degrees and 2–3 year diplomas with co-op placements. Multiple intakes per year at most partners.',
    masterNote:
      "Master's and post-graduate certificates that lead to the Post-Graduation Work Permit (up to 3 years).",
    networks: 'GUS, Shorelight',
    degreeLevels: "Bachelor's, Master's, English Language (non-degree)",
    totalInstitutions: 11,
    institutions: [
      ['University of Waterloo', 'GUS', 'Academic Partner', "Bachelor's, Master's", 'Engineering, Computer Science, Sciences'],
      ['University Canada West', 'GUS', 'Owned Institution', "Bachelor's, Master's", 'Business, Computer Science, MBA'],
      ['University of Niagara Falls Canada', 'GUS', 'Owned Institution', "Bachelor's, Master's", 'Business, Hospitality, Computer Science'],
      ['Toronto School of Management', 'GUS', 'Owned Institution', "Bachelor's, Master's", 'Business, Hospitality, IT'],
      ['Canadian College of Technology and Business', 'GUS', 'Owned Institution', "Bachelor's, Master's", 'Business, Technology'],
      ['The Ontario Institute of Health and Innovation', 'GUS', 'Owned Institution', "Bachelor's, Master's", 'Health Sciences, Natural Sciences'],
      ['Fleming College Toronto', 'GUS', 'Owned Institution', "Bachelor's, Master's", 'Applied / vocational programs'],
      ['Niagara College Canada (Toronto campus)', 'GUS', 'Owned Institution', "Bachelor's, Master's", 'Applied / vocational programs'],
      ['Trebas Institute', 'GUS', 'Owned Institution', "Bachelor's, Master's", 'Music business, audio, entertainment'],
      ['Corpus Christi and St. Mark’s College (Vancouver)', 'Shorelight', 'Standard Partner', "Bachelor's, Master's (select)", 'Business, Social Sciences, Sciences, Arts, Health'],
    ],
  },
  {
    id: 'germany',
    name: 'Germany',
    tagline: 'Applied-sciences universities with low fees and an English-taught catalogue.',
    fields: ['Business & Management', 'Computer Science & IT', 'Engineering', 'Arts, Design & Media'],
    bachelorNote:
      'Practice-oriented Bachelor degrees with mandatory internship semesters. Foundation year available for non-qualifying applicants.',
    masterNote:
      "1.5–2 year Master's; the 18-month post-study job-seeker visa lets graduates stay and work.",
    networks: 'GUS',
    degreeLevels: "Bachelor's, Master's",
    totalInstitutions: 3,
    institutions: [
      ['University of Europe for Applied Sciences', 'GUS', 'Owned Institution', "Bachelor's, Master's", 'Business, Design, Sport, Art, Psychology'],
      ['GISMA University of Applied Sciences', 'GUS', 'Owned Institution', "Bachelor's, Master's", 'Business, IT, Engineering'],
      ['Berlin School of Business and Innovation (BSBI)', 'GUS', 'Owned Institution', "Bachelor's, Master's", 'Business, Management, Marketing'],
    ],
  },
  {
    id: 'ireland',
    name: 'Ireland',
    tagline: 'English-speaking EU option with a two-year post-study stay-back.',
    fields: ['Business & Management', 'Computer Science & IT', 'Data & Analytics'],
    bachelorNote:
      'Ordinary (3-year) and honours (4-year) Bachelor degrees; International Study Centre foundation routes at partner universities.',
    masterNote:
      "1-year taught Master's with the Third Level Graduate Programme allowing 24 months to find work.",
    networks: 'GUS, Study Group',
    degreeLevels: "Bachelor's, Master's",
    totalInstitutions: 2,
    institutions: [
      ['Dublin International Study Centre (partner universities)', 'Study Group', 'International Study Centre', "Bachelor's, Master's", 'All 8 fields (comprehensive)'],
      ['IBAT College Dublin', 'GUS', 'Owned Institution', "Bachelor's, Master's", 'Business, IT, Computing'],
    ],
  },
  {
    id: 'netherlands',
    name: 'Netherlands',
    tagline: 'A broad English-taught degree catalogue in the heart of Europe.',
    fields: ['Business & Management', 'Arts, Design & Media', 'Social Sciences'],
    bachelorNote:
      'Applied-sciences Bachelor degrees taught fully in English, with strong industry placement components.',
    masterNote:
      "1–2 year Master's; the one-year orientation ('zoekjaar') visa supports the job search after graduation.",
    networks: 'GUS',
    degreeLevels: "Bachelor's, Master's",
    totalInstitutions: 1,
    institutions: [
      ['University of Applied Sciences Europe – Amsterdam', 'GUS', 'Owned Institution', "Bachelor's, Master's", 'Business, Design, Psychology'],
    ],
  },
  {
    id: 'singapore',
    name: 'Singapore',
    tagline: 'A regional hub delivering UK and Australian degrees close to home.',
    fields: ['Business & Management', 'Finance & Accounting', 'Social Sciences'],
    bachelorNote:
      'Bachelor degrees awarded by UK/Australian partners, delivered locally with multiple intakes.',
    masterNote:
      "Taught Master's (incl. MBA) from partner universities, completed in 12–18 months.",
    networks: 'GUS, Study Group',
    degreeLevels: "Bachelor's, Master's",
    totalInstitutions: 3,
    institutions: [
      ['ERC Institute (Deakin University AU & University of Chichester UK degrees)', 'Study Group', 'Tailored Partnership', "Bachelor's, Master's", 'Business, Social Sciences'],
      ['The London School of Business and Finance – Singapore', 'GUS', 'Owned Institution', "Bachelor's, Master's", 'Business, Finance'],
      ['Victoria World Academy (delivery partner)', 'Study Group', 'Bellerbys Global Study Centre', "Bachelor's, Master's", 'Business, Social Sciences'],
    ],
  },
  {
    id: 'uae',
    name: 'United Arab Emirates',
    tagline: 'A UK university campus in Dubai with regional career links.',
    fields: ['Business & Management', 'Engineering', 'Computer Science & IT'],
    bachelorNote:
      'Bachelor degrees identical to the UK home campus, with the option to transfer between Dubai, Malaysia and Edinburgh.',
    masterNote:
      "Taught Master's on the Dubai campus with the same award as the UK; strong Gulf employer network.",
    networks: 'Shorelight',
    degreeLevels: "Bachelor's, Master's (select programs)",
    totalInstitutions: 1,
    institutions: [
      ['Heriot-Watt University Dubai', 'Shorelight', 'Signature School', "Bachelor's, Master's (select)", 'Business, Engineering, Computer Science, Sciences, Health'],
    ],
  },
  {
    id: 'france',
    name: 'France',
    tagline: 'GUS-owned grande-école-style schools for business, design and tourism.',
    fields: ['Business & Management', 'Arts, Design & Media', 'Tourism'],
    bachelorNote:
      'Bachelor / Bachelor-of-Business-Administration programmes taught in English at GUS-owned schools.',
    masterNote:
      "Specialised Master's and MBA programmes in management, design and tourism.",
    networks: 'GUS',
    degreeLevels: "Bachelor's, Master's",
    totalInstitutions: 4,
    institutions: [
      ['South Champagne Business School (SCBS)', 'GUS', 'Owned Institution', "Bachelor's, Master's", 'Business'],
      ["Ecole Internationale du Management et de l’Entrepreneuriat (EIME)", 'GUS', 'Owned Institution', "Bachelor's, Master's", 'Management, Entrepreneurship'],
      ['Ecole Superieure de Design (ESD)', 'GUS', 'Owned Institution', "Bachelor's, Master's", 'Design'],
      ['Ecole Superieure de Tourisme (EST)', 'GUS', 'Owned Institution', "Bachelor's, Master's", 'Tourism Management'],
    ],
  },
  {
    id: 'china',
    name: 'China',
    tagline: 'Study Group Bellerbys Global centres and joint-venture universities.',
    fields: ['Business & Management', 'Social Sciences', 'Engineering', 'Computer Science & IT'],
    bachelorNote:
      'Bachelor degrees at joint-venture universities and Bellerbys Global study centres, taught in English.',
    masterNote:
      "Taught Master's at partner universities, with Bellerbys Global pre-master routes available.",
    networks: 'Study Group',
    degreeLevels: "Bachelor's, Master's",
    totalInstitutions: 6,
    institutions: [
      ['Beijing Normal University – Hong Kong Baptist University United International College (BNBU)', 'Study Group', 'Bellerbys Global', "Bachelor's, Master's", 'Business, Social Sciences'],
      ['East China University of Science and Technology (ECUST)', 'Study Group', 'Bellerbys Global', "Bachelor's, Master's", 'All 8 fields (comprehensive)'],
      ["Xi’an Eurasia University", 'Study Group', 'Bellerbys Global', "Bachelor's, Master's", 'All 8 fields (comprehensive)'],
      ['Tianjin (TSH / TSHES)', 'Study Group', 'Bellerbys Global', "Bachelor's, Master's", 'Business, Social Sciences'],
      ['NOVO', 'Study Group', 'Bellerbys Global', "Bachelor's, Master's", 'Business, Social Sciences'],
      ['QED', 'Study Group', 'Bellerbys Global', "Bachelor's, Master's", 'Business, Social Sciences'],
    ],
  },
];

export const partnerCountryMap = Object.fromEntries(partnerCountries.map((c) => [c.id, c]));
