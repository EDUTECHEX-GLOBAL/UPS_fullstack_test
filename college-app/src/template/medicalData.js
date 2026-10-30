// Destinations covered by the MBBS-Abroad directory.
// Source: MBBS_Abroad_Medical_Universities_Directory_and_Scoring (retrieved 31 Aug 2026).
// Notes/fee/FMGE bands are indicative and must be verified with the university/embassy/NMC.

export const medicalCountries = [
  {
    id: 'georgia',
    name: 'Georgia',
   
    tagline: 'English-medium MD programmes with a large Indian student base.',
    fmge: 'Moderate – High',
    fees: '₹25–40L (6 yrs)',
    english: 'Full programme in English',
    advisory:
      'From the 2026–27 session, Georgia’s public/state universities stop admitting new international students. Private universities are unaffected and remain the realistic option.',
    universities: [
      'David Tvildiani Medical University (DTMU)',
      'Georgian American University',
      'New Vision University',
      'University of Georgia',
      'Caucasus International University (CIU)',
    ],
  },
  {
    id: 'russia',
    name: 'Russia',
   
    tagline: 'Long-established government medical universities at low-to-mid cost.',
    fmge: 'Moderate',
    fees: '<₹25–40L (6 yrs)',
    english: 'English pre-clinical, local language in clinical years',
    advisory:
      'Independently verify the current Government of India travel/study advisories before applying, given the regional security situation.',
    universities: [
      'Kazan Federal University',
      'Tver State Medical University',
      'RUDN University (Moscow)',
      'Volgograd State Medical University',
      'North-West State Medical University (St. Petersburg)',
    ],
  },
  {
    id: 'kazakhstan',
    name: 'Kazakhstan',
    
    tagline: 'Full English-medium MBBS with modern, planned-city infrastructure.',
    fmge: 'Moderate – High',
    fees: '₹25–40L (6 yrs)',
    english: 'Full English (IELTS 5.5–6.5 required)',
    advisory:
      'Unique among these destinations in requiring IELTS for admission — factor the extra prep time into the student’s timeline.',
    universities: [
      'Kazakh National Medical University (Almaty)',
      'Astana Medical University',
      'Karaganda Medical University',
      'KRMU (Kazakh-Russian Medical University)',
      'KazMUNAI (Almaty)',
    ],
  },
  {
    id: 'kyrgyzstan',
    name: 'Kyrgyzstan',
    
    tagline: 'Among the most affordable English-medium options, with an established community in Bishkek.',
    fmge: 'Moderate',
    fees: '<₹25L (6 yrs)',
    english: 'Full programme in English',
    advisory: '',
    universities: [
      'Kyrgyz State Medical Academy',
      'Kyrgyz Russian Slavic University (KRSU)',
      'Osh State University',
      'International School of Medicine (ISM), Bishkek',
      'Asian Medical Institute',
    ],
  },
  {
    id: 'uzbekistan',
    name: 'Uzbekistan',
   
    tagline: 'Currently under heightened NMC scrutiny.',
    fmge: 'Low',
    fees: '<₹25L (6 yrs)',
    english: 'Varies — confirm medium of instruction directly',
    advisory:
      'The NMC advisory of 1 April 2026 named Tashkent State, Samarkand State and Bukhara State Medical Institute for over-admission and weak clinical training. Do not proceed without fresh verification against the latest advisory.',
    flagged: true,
    universities: [
      'Tashkent State Medical University — flagged (Apr 2026)',
      'Samarkand State Medical University — flagged (Apr 2026)',
      'Bukhara State Medical Institute — flagged (Apr 2026)',
      'Tashkent Medical Academy — verify status',
      'Andijan State Medical Institute — verify status',
    ],
  },
  {
    id: 'philippines',
    name: 'Philippines',
   
    tagline: 'US-pattern "Doctor of Medicine (MD)" — NMC treats it as MBBS-equivalent.',
    fmge: 'Moderate – High',
    fees: '<₹25–40L (6 yrs)',
    english: 'Full programme in English',
    advisory:
      'The US-pattern curriculum also opens a USMLE/ECFMG pathway for students considering US residency alongside or instead of Indian practice.',
    universities: [
      'University of Northern Philippines (UNP)',
      'Our Lady of Fatima University (OLFU)',
      'Davao Medical School Foundation (DMSF)',
      'AMA School of Medicine (AMASOM), Makati',
      'UV Gullas College of Medicine',
    ],
  },
  {
    id: 'caribbean',
    name: 'Caribbean',
  
    tagline: 'US clinical-rotation model aimed at USMLE / US residency rather than India-return.',
    fmge: 'Not FMGE-tracked',
    fees: '>₹40L (6 yrs)',
    english: 'Full programme in English',
    advisory:
      'Priced and structured for the US market. Best fit for students targeting US residency, not primarily Indian practice via FMGE/NExT.',
    universities: [
      'Saba University School of Medicine',
      'Medical University of the Americas (Nevis)',
      "St. Matthew's University (Cayman Islands)",
    ],
  },
];
