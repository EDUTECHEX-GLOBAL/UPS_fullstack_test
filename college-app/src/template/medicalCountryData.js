// Full country-guide content for the Medical (MBBS/MD abroad) pages.
// Source: MBBS_Abroad_Medical_Universities_Directory_and_Scoring.xlsx — data retrieved 31 Aug 2026.
// Figures are indicative; verify compliance, fees and pass-rate bands independently.

export const EYEBROW = 'MBBS / MD Abroad — Country Guide';

export const TOP_ADVISORY =
  'Data retrieved 31 Aug 2026 · No official NMC-approved list currently exists — compliance is verified via WDOMS listing, FMGL 2021, and the destination country’s own medical authority.';

export const FOOTER_NOTE =
  'Template generated from MBBS_Abroad_Medical_Universities_Directory_and_Scoring.xlsx — data retrieved 31 Aug 2026. Verify compliance, fee and pass-rate figures independently before advising any student.';

export const LICENSING_COPY =
  'FMGE remains the operative exam (status as of Aug 2026). The June 2026 FMGE session has been held, with an additional session planned for October 2026; from 2027, NBEMS plans three sessions a year. The National Exit Test (NExT) is intended to eventually replace FMGE for foreign graduates, but no official start date has been announced. A student beginning a 5–6 year programme in 2026 may graduate into a NExT-based system (around 2031–32) — the framework may change before they finish.';

export const SHARED_ELIGIBILITY = [
  'Academic: 10+2 with Physics, Chemistry, Biology — 50% aggregate (SC/ST/OBC: 40%)',
  'NEET: Qualifying NEET-UG score required for FMGE/NExT eligibility on return to India',
  'Age: 17 years by 31 Dec of admission year (most destinations)',
];

const UNI_COLUMNS = [
  'University',
  'Type',
  'Compliance',
  'FMGE Pass Band',
  '6-Yr Fee Band',
  'English Medium',
  'Clinical Exposure',
  'Notes',
];

export const medicalCountryContent = {
  georgia: {
    id: 'georgia',
    name: 'Georgia',
    titleTag: 'MBBS in Georgia for Indian Students — University Guide, Fees & Compliance (2026-27)',
    metaDescription:
      'Complete guide to MBBS in Georgia for Indian students — compliant private universities, 2026-27 public-university admission restriction, fees, FMGE pass bands and documents.',
    h1: "MBBS in Georgia — What's Actually Open for 2026-27 Intake",
    lead:
      'Georgia has long been a popular MBBS-abroad destination for Indian students, with historic public medical schools and a growing set of private universities. A 2026-27 policy shift changes which of those are realistically open to new international students this cycle — read the status section before shortlisting.',
    stats: [
      { label: 'Universities tracked', value: '14' },
      { label: 'Typical 6-yr fee band', value: '₹25–40L' },
      { label: 'Compliance snapshot', value: 'Private: Open · Public: Restricted' },
      { label: 'Medium of instruction', value: 'Full English' },
    ],
    advisories: [
      {
        tone: 'warn',
        title: 'Public universities: admission restricted for 2026-27',
        body: [
          "Georgia's Ministry of Education has announced that, starting the 2026-27 academic session, public (state) universities will largely stop admitting new international students. This affects Tbilisi State Medical University (TSMU), Tbilisi State University (TSU), Batumi Shota Rustaveli State University and Akaki Tsereteli State University.",
          "Private universities are unaffected — they are not covered by this restriction and remain the realistic options for 2026-27 admission. David Tvildiani Medical University, Georgian American University, New Vision University, University of Georgia and others below are all currently Compliant.",
        ],
      },
    ],
    whyChoose: [
      {
        title: 'No entrance test abroad',
        text: 'Direct admission based on 10+2 marks — NEET-UG qualification is still required for licensing on return to India, not for the Georgian admission itself.',
      },
      {
        title: 'American-model curricula',
        text: 'Several private universities, notably David Tvildiani Medical University, run a US-style MD curriculum with strong FMGE pass-rate history.',
      },
      {
        title: 'Full English-medium teaching',
        text: 'Programmes at both public and private institutions are taught fully in English throughout all six years.',
      },
      {
        title: 'EU-adjacent, low cost of living',
        text: 'Georgia offers a European academic environment with living costs well below Western Europe.',
      },
    ],
    universityColumns: UNI_COLUMNS,
    universities: [
      ['Tbilisi State Medical University (TSMU)', 'Public', 'Admission Restricted (Public, 2026-27)', 'High (>40%)', 'Mid (₹25-40L)', 'Full', 'Strong', 'Oldest (1918) & most prestigious govt medical university; largest clinical base; subject to the 2026-27 public-admission restriction — verify current status before applying.'],
      ['Ivane Javakhishvili Tbilisi State University (TSU)', 'Public', 'Admission Restricted (Public, 2026-27)', 'Unknown / Not independently verified', 'Mid (₹25-40L)', 'Full', 'Moderate', 'Oldest university in Georgia (1918); subject to the same 2026-27 restriction.'],
      ['Batumi Shota Rustaveli State University', 'Public', 'Admission Restricted (Public, 2026-27)', 'High (>40%)', 'Mid (₹25-40L)', 'Full', 'Moderate', 'Known for infrastructure; subject to the 2026-27 restriction.'],
      ['Akaki Tsereteli State University', 'Public', 'Admission Restricted (Public, 2026-27)', 'Moderate (25-40%)', 'Low (<₹25L)', 'Full', 'Moderate', 'Affordable; good historical FMGE record; subject to the 2026-27 restriction.'],
      ['David Tvildiani Medical University (DTMU)', 'Private', 'Compliant', 'High (>40%)', 'Mid (₹25-40L)', 'Full', 'Strong', 'American-model MD programme; among the highest FMGE pass rates cited for Georgia.'],
      ['Georgian American University', 'Private', 'Compliant', 'High (>40%)', 'Mid (₹25-40L)', 'Full', 'Moderate', 'An 80.3% FMGE pass rate was reported for 2024 by one source — verify independently.'],
      ['New Vision University', 'Private', 'Compliant', 'Unknown / Not independently verified', 'Mid (₹25-40L)', 'Full', 'Moderate', 'Emphasis on research and practical experience.'],
      ['University of Georgia', 'Private', 'Compliant', 'Unknown / Not independently verified', 'Mid (₹25-40L)', 'Full', 'Moderate', 'Compliant private option; verify current FMGE data.'],
      ['Caucasus University / Caucasus International University (CIU)', 'Private', 'Compliant', 'Unknown / Not independently verified', 'Mid (₹25-40L)', 'Full', 'Moderate', 'Compliant private option; verify current FMGE data.'],
      ['Alte University', 'Private', 'Compliant', 'Unknown / Not independently verified', 'Mid (₹25-40L)', 'Full', 'Moderate', 'Compliant private option; verify current FMGE data.'],
      ['East European University / East-West University Georgia', 'Private', 'Compliant', 'Unknown / Not independently verified', 'Mid (₹25-40L)', 'Full', 'Moderate', 'Compliant private option; verify current FMGE data.'],
      ['Georgian National University SEU', 'Private', 'Compliant', 'Unknown / Not independently verified', 'Mid (₹25-40L)', 'Full', 'Moderate', 'Compliant private option; verify current FMGE data.'],
      ['Grigol Robakidze University', 'Private', 'Compliant', 'Unknown / Not independently verified', 'Mid (₹25-40L)', 'Full', 'Limited/Unverified', 'Compliant private option; clinical exposure data limited.'],
      ['Ken Walker International University', 'Private', 'Unverified', 'Unknown / Not independently verified', 'Mid (₹25-40L)', 'Full', 'Limited/Unverified', 'Compliance status itself unverified — confirm directly before recommending.'],
    ],
    englishProficiency:
      'IELTS/PTE generally not mandatory for admission at most Georgian universities, but recommended for visa interviews.',
    intake: [
      'Main intake: September',
      'Secondary intake: Some private universities offer February/March',
      'Programme length: 6 years (MD), including internship',
    ],
    costs: [
      ['Public universities (where open)', '₹25–40L total, 6 years — admission currently restricted for 2026-27'],
      ['Private universities', '₹25–40L total, 6 years (typical); a few lower-cost options exist'],
      ['Hostel & living', '₹2.5–4L per year, Tbilisi/Batumi (approximate)'],
      ['Visa & residence permit', 'Add ₹15,000–40,000/year depending on category'],
    ],
    documents: [
      'Class 10 & 12 marksheets',
      'NEET-UG scorecard',
      'Passport (valid 18+ months)',
      'Passport-size photographs',
      'Invitation/admission letter from the university',
      'Medical fitness certificate',
      'Police clearance certificate',
      'Proof of funds / bank statement',
      'Visa application form',
      'Health/travel insurance',
    ],
    faqs: [
      {
        q: 'Can I still join a public university in Georgia for 2026-27?',
        a: 'Not as a new international admission, per the current Georgia Ministry of Education policy — Tbilisi State Medical University, Tbilisi State University, Batumi Shota Rustaveli State University and Akaki Tsereteli State University are marked Admission Restricted for this cycle. Confirm the latest status directly with the university before applying.',
      },
      {
        q: 'Which Georgian universities are open to Indian students right now?',
        a: 'Private universities are unaffected by the restriction — David Tvildiani Medical University, Georgian American University, New Vision University, University of Georgia, Caucasus University and several others listed above are currently Compliant and accepting applications.',
      },
      {
        q: 'Is NEET compulsory for MBBS in Georgia?',
        a: "Georgian universities themselves don't require NEET for admission, but a qualifying NEET-UG score is required to sit the FMGE/NExT licensing exam on return to India, so it's effectively mandatory for anyone planning to practise in India.",
      },
      {
        q: 'Is the MD from Georgia recognised in India?',
        a: "Recognition depends on the specific university being listed in the World Directory of Medical Schools (WDOMS) and satisfying the FMGL Regulations 2021 — there is no single official 'approved list' anymore. Verify each university's current status independently rather than relying on 'NMC-approved' claims from portals.",
      },
    ],
    cta: {
      heading: 'Considering MBBS in Georgia?',
      subtext: 'Get a shortlist cross-checked against current compliance status, FMGE pass-rate bands and your budget.',
      button: 'Book a Free Counselling Session',
    },
  },

  russia: {
    id: 'russia',
    name: 'Russia',
    titleTag: 'MBBS in Russia for Indian Students — Universities, Fees & Advisory Notes (2026)',
    metaDescription:
      'MBBS in Russia guide for Indian students — Kazan, Tver, RUDN, Volgograd and other compliant universities, fee bands, FMGE outcomes, and current travel/security advisory notes.',
    h1: 'MBBS in Russia — Compliant Universities & What to Check First',
    lead:
      'Russia remains one of the largest and most affordable MBBS-abroad destinations for Indian students, with well-established public medical universities and large resident Indian student communities. Given the ongoing regional security situation, checking current Government of India advisories is the first step, not the last.',
    stats: [
      { label: 'Universities tracked', value: '6' },
      { label: 'Typical 6-yr fee band', value: '₹25–40L' },
      { label: 'Compliance snapshot', value: 'All 6 tracked: Compliant' },
      { label: 'Medium of instruction', value: 'Pre-clinical English, local language in clinical years' },
    ],
    advisories: [
      {
        tone: 'warn',
        title: 'Verify current travel/security advisories before recommending',
        body: [
          'Independently check the current Government of India travel and study advisories for Russia given the ongoing regional security situation, before advising any student on a Russian university.',
          'Clinical-year language shift — most Russian medical universities teach the pre-clinical years fully in English, but clinical years commonly shift to local-language instruction alongside faculty support. Factor this into a student’s language readiness and timeline.',
        ],
      },
    ],
    whyChoose: [
      { title: 'Large, established Indian communities', text: 'Cities like Kazan, Tver and Volgograd host large, long-standing Indian student populations with mentorship networks and familiar food.' },
      { title: 'Strong teaching-hospital links', text: 'Public universities such as RUDN and North-West State Medical University have deep ties to major regional teaching hospitals.' },
      { title: 'Historically low tuition', text: 'Public-university tuition in Russia remains among the most affordable of any MBBS-abroad destination.' },
      { title: 'Long track record with FMGE', text: 'Decades of Indian students returning via FMGE means substantial peer data and coaching support exists for Russian graduates.' },
    ],
    universityColumns: UNI_COLUMNS,
    universities: [
      ['Kazan Federal University / Kazan State Medical University', 'Public', 'Compliant', 'Moderate (25-40%)', 'Mid (₹25-40L)', 'Full pre-clinical, local language in clinical years', 'Strong', 'Strong research reputation; historically one of the most recommended Russian universities.'],
      ['Tver State Medical University', 'Public', 'Compliant', 'Moderate (25-40%)', 'Low (<₹25L)', 'Full pre-clinical, local language in clinical years', 'Strong', 'One of the most historically established medical universities in Russia.'],
      ['RUDN University (Moscow)', 'Public', 'Compliant', 'Moderate (25-40%)', 'Mid (₹25-40L)', 'Full pre-clinical, local language in clinical years', 'Strong', 'Culturally diverse student body; strong teaching-hospital links.'],
      ['Volgograd State Medical University', 'Public', 'Compliant', 'Moderate (25-40%)', 'Low (<₹25L)', 'Full pre-clinical, local language in clinical years', 'Moderate', 'Reasonable fees; decent FMGE pass rates cited.'],
      ['North-West State Medical University (St. Petersburg)', 'Public', 'Compliant', 'High (>40%)', 'Mid (₹25-40L)', 'Full pre-clinical, local language in clinical years', 'Strong', 'High academic-performance reputation cited.'],
      ['Kursk State Medical University', 'Public', 'Compliant', 'Moderate (25-40%)', 'Low (<₹25L)', 'Full pre-clinical, local language in clinical years', 'Moderate', 'Frequently recommended budget option.'],
    ],
    englishProficiency:
      'No IELTS/TOEFL typically required for admission; basic Russian language coursework is usually built into year 1–2.',
    intake: [
      'Main intake: September',
      'Programme length: 6 years (5 years + 1-year internship)',
      'Language prep: Russian-language foundation course, typically year 1',
    ],
    costs: [
      ['Public universities', '₹15–30L total, 6 years (varies by city and university)'],
      ['Hostel & living', '₹1.5–3L per year (regional cities lower than Moscow/St. Petersburg)'],
      ['Visa & registration', 'Add ₹20,000–50,000/year depending on category'],
    ],
    documents: [
      'Class 10 & 12 marksheets',
      'NEET-UG scorecard',
      'Passport (valid 18+ months)',
      'Passport-size photographs',
      'Invitation letter from the university',
      'Medical fitness & HIV-test certificate',
      'Police clearance certificate',
      'Proof of funds / bank statement',
      'Visa application form',
      'Health/travel insurance',
    ],
    faqs: [
      { q: 'Is it currently safe/advisable to go to Russia for MBBS?', a: 'This depends on the current regional security situation and official Government of India guidance, which can change. Check the latest Ministry of External Affairs advisory before making a decision, rather than relying on older articles.' },
      { q: 'Will I be taught in English throughout the programme?', a: 'Pre-clinical years are typically taught fully in English at the universities listed here, but clinical years often shift to local-language instruction alongside faculty support — ask each university for its current language policy.' },
      { q: 'Are Russian MBBS degrees recognised for FMGE?', a: 'The universities listed above are currently marked Compliant, meaning they appear in the World Directory of Medical Schools and are expected to satisfy FMGL 2021 requirements — always verify current status directly with the university and via WDOMS before applying.' },
      { q: 'How large is the Indian student community in Russia?', a: 'Sizeable and well-established at all six universities listed here, with active student associations, Indian food availability and informal mentorship networks in most university cities.' },
    ],
    cta: {
      heading: 'Considering MBBS in Russia?',
      subtext: 'Get a shortlist cross-checked against current compliance status, FMGE pass-rate bands and your budget.',
      button: 'Book a Free Counselling Session',
    },
  },

  kazakhstan: {
    id: 'kazakhstan',
    name: 'Kazakhstan',
    titleTag: 'MBBS in Kazakhstan for Indian Students — Universities, IELTS Requirement & Fees',
    metaDescription:
      'MBBS in Kazakhstan guide for Indian students — Kazakh National Medical University, Astana, Karaganda and more, IELTS 5.5-6.5 admission requirement, fees and FMGE outcomes.',
    h1: 'MBBS in Kazakhstan — The One Destination That Requires IELTS',
    lead:
      "Kazakhstan offers modern medical universities, strong FMGE pass-rate bands comparable to Georgia, and large Indian communities in Almaty. It's also the one MBBS-abroad destination on this list that requires an IELTS score for admission — plan a student's English-test timeline accordingly.",
    stats: [
      { label: 'Universities tracked', value: '6' },
      { label: 'Typical 6-yr fee band', value: '₹25–40L' },
      { label: 'Compliance snapshot', value: 'All 6 tracked: Compliant' },
      { label: 'Medium of instruction', value: 'Full (IELTS required)' },
    ],
    advisories: [
      {
        tone: 'info',
        title: 'IELTS 5.5–6.5 required for admission',
        body: [
          "Unlike most other MBBS-abroad destinations, Kazakhstani universities require an IELTS score in the 5.5–6.5 range at the point of admission. Build this into the student's application timeline — it typically means starting IELTS preparation several months before the intended intake.",
        ],
      },
    ],
    whyChoose: [
      { title: 'Consistently strong FMGE bands', text: 'Kazakh National Medical University and KazMUNAI are cited in the 40–50% FMGE pass-rate range, comparable to the better-performing Georgian and Romanian universities.' },
      { title: 'Modern, planned-city infrastructure', text: "Astana Medical University benefits from Kazakhstan's purpose-built capital, with newer campus and hospital facilities." },
      { title: 'Large Indian community in Almaty', text: 'Almaty in particular has a strong Indian restaurant and community scene, easing the adjustment for new students.' },
      { title: 'Soviet-era academic rigor at established schools', text: 'Karaganda Medical University, the oldest government medical institution in the country, retains a reputation for rigorous coursework.' },
    ],
    universityColumns: UNI_COLUMNS,
    universities: [
      ['Kazakh National Medical University (Almaty)', 'Public', 'Compliant', 'High (>40%)', 'Mid (₹25-40L)', 'Full (IELTS required)', 'Strong', '40–50% FMGE pass rate cited — among the best in Kazakhstan; Almaty has a strong Indian restaurant/community scene.'],
      ['KazMUNAI (Almaty)', 'Private', 'Compliant', 'High (>40%)', 'Mid (₹25-40L)', 'Full (IELTS required)', 'Strong', '40–50% FMGE pass rate cited, comparable to Georgia/Romania.'],
      ['Astana Medical University', 'Public', 'Compliant', 'Moderate (25-40%)', 'Mid (₹25-40L)', 'Full (IELTS required)', 'Moderate', 'Capital-city location; modern planned-city infrastructure.'],
      ['Karaganda Medical University', 'Public', 'Compliant', 'Moderate (25-40%)', 'Mid (₹25-40L)', 'Full (IELTS required)', 'Strong', 'Oldest govt medical institution in Kazakhstan; Soviet-era academic rigor.'],
      ['KRMU (Kazakh-Russian Medical University)', 'Private', 'Compliant', 'Moderate (25-40%)', 'Mid (₹25-40L)', 'Full (IELTS required)', 'Moderate', 'Established FMGE coaching support cited; culturally diverse.'],
      ['ISoM Almaty (International School of Medicine)', 'Private', 'Compliant', 'Unknown / Not independently verified', 'Low (<₹25L)', 'Full (IELTS required)', 'Moderate', 'Affordable fee structure with strong clinical training cited.'],
    ],
    englishProficiency:
      'IELTS 5.5–6.5 mandatory at admission — the only destination in this set with a hard English-test requirement.',
    intake: [
      'Main intake: September',
      'Programme length: 6 years (5 years + 1-year internship)',
      'Prerequisite: IELTS 5.5–6.5 before application submission',
    ],
    costs: [
      ['Public universities', '₹25–40L total, 6 years'],
      ['Private universities', '₹15–40L total, 6 years (ISoM Almaty lower band)'],
      ['Hostel & living', '₹2–3.5L per year, Almaty/Astana (approximate)'],
      ['IELTS coaching & test fee', 'Budget separately — required before application'],
    ],
    documents: [
      'Class 10 & 12 marksheets',
      'NEET-UG scorecard',
      'IELTS scorecard (5.5–6.5)',
      'Passport (valid 18+ months)',
      'Passport-size photographs',
      'Invitation letter from the university',
      'Medical fitness certificate',
      'Police clearance certificate',
      'Proof of funds / bank statement',
      'Visa application form',
    ],
    faqs: [
      { q: 'Do I really need IELTS for MBBS in Kazakhstan?', a: 'Yes — Kazakhstani universities require an IELTS score, typically in the 5.5–6.5 band, as part of admission. This is different from most other MBBS-abroad destinations, so factor test preparation time into the application timeline.' },
      { q: "How do Kazakhstan's FMGE pass rates compare to other destinations?", a: 'Kazakh National Medical University and KazMUNAI are cited in the 40–50% FMGE pass-rate range, which is comparable to the higher-performing Georgian and Romanian universities — though all figures should be independently verified with current data.' },
      { q: 'Which Kazakhstan university is most affordable?', a: 'ISoM Almaty is cited in the Low (under ₹25L) six-year fee band, the most affordable option among the six tracked here, though its FMGE pass-rate data is not independently verified.' },
      { q: 'Is Kazakhstan currently NMC-flagged like Uzbekistan?', a: 'No — all six Kazakhstan universities tracked here are currently marked Compliant, with no advisory equivalent to the Uzbekistan situation as of this data’s retrieval date (31 Aug 2026). Always re-check current status before applying.' },
    ],
    cta: {
      heading: 'Considering MBBS in Kazakhstan?',
      subtext: 'Get a shortlist cross-checked against current compliance status, FMGE pass-rate bands and your budget.',
      button: 'Book a Free Counselling Session',
    },
  },

  kyrgyzstan: {
    id: 'kyrgyzstan',
    name: 'Kyrgyzstan',
    titleTag: 'MBBS in Kyrgyzstan for Indian Students — Affordable Universities & FMGE Outcomes',
    metaDescription:
      'MBBS in Kyrgyzstan guide for Indian students — KRSU, Osh State University and other compliant universities, low fee bands, FMGE pass rates and admission documents.',
    h1: 'MBBS in Kyrgyzstan — Low-Cost Option With a Strong FMGE Track Record',
    lead:
      "Kyrgyzstan is consistently one of the most affordable MBBS-abroad destinations for Indian students, anchored by Kyrgyz Russian Slavic University's strong, independently-cited FMGE pass rate. No current NMC advisory applies to the country as of this data's retrieval date.",
    stats: [
      { label: 'Universities tracked', value: '7' },
      { label: 'Typical 6-yr fee band', value: 'Low (<₹25L)' },
      { label: 'Compliance snapshot', value: 'All 7 tracked: Compliant' },
      { label: 'Medium of instruction', value: 'Full English' },
    ],
    advisories: [
      {
        tone: 'info',
        title: 'No current NMC advisory for Kyrgyzstan',
        body: [
          "As of this data's retrieval date (31 Aug 2026), no NMC advisory applies to Kyrgyzstan, and all seven universities tracked here are marked Compliant. As with any destination, verify current WDOMS listing and FMGL 2021 status independently before advising a student.",
        ],
      },
    ],
    whyChoose: [
      { title: 'Lowest fee bands in this comparison', text: 'Every university tracked in Kyrgyzstan falls in the Low (under ₹25L) six-year total-cost band — the most consistently affordable destination here.' },
      { title: "Kyrgyz Russian Slavic University's track record", text: 'KRSU is cited as the top FMGE performer in Kyrgyzstan, with a 39.66% pass rate reported in 2024 data.' },
      { title: 'Full English-medium instruction', text: 'Unlike Russia, Kyrgyz universities teach the full six-year programme in English, without a shift to local language in clinical years.' },
      { title: 'Established Indian communities at several campuses', text: 'KRSU, Kyrgyz State Medical Academy and ISM Bishkek all have large or moderate resident Indian student populations.' },
    ],
    universityColumns: UNI_COLUMNS,
    universities: [
      ['Kyrgyz Russian Slavic University (KRSU)', 'Public', 'Compliant', 'High (>40%)', 'Low (<₹25L)', 'Full', 'Strong', 'Top FMGE performer in Kyrgyzstan (39.66% in 2024 data cited); no NMC advisory as of Apr 2026.'],
      ['Osh State University', 'Public', 'Compliant', 'Moderate (25-40%)', 'Low (<₹25L)', 'Full', 'Moderate', 'Established government medical programme.'],
      ['Kyrgyz State Medical Academy', 'Public', 'Compliant', 'Moderate (25-40%)', 'Low (<₹25L)', 'Full', 'Moderate', 'One of the most established Kyrgyz medical institutions.'],
      ['Jalal-Abad State University', 'Public', 'Compliant', 'Unknown / Not independently verified', 'Low (<₹25L)', 'Full', 'Limited/Unverified', 'Regional public university; limited independent FMGE data found.'],
      ['International School of Medicine (ISM), Bishkek', 'Private', 'Compliant', 'Moderate (25-40%)', 'Low (<₹25L)', 'Full', 'Moderate', 'Large, well-established private programme in the capital.'],
      ['Bishkek International Medical Institute', 'Private', 'Compliant', 'Unknown / Not independently verified', 'Low (<₹25L)', 'Full', 'Limited/Unverified', 'Private programme; verify current accreditation status.'],
      ['Asian Medical Institute', 'Private', 'Compliant', 'Unknown / Not independently verified', 'Low (<₹25L)', 'Full', 'Limited/Unverified', 'Smaller private programme.'],
    ],
    englishProficiency: 'No IELTS/TOEFL typically required for admission.',
    intake: [
      'Main intake: September',
      'Programme length: 6 years (5 years + 1-year internship)',
    ],
    costs: [
      ['All tracked universities', 'Under ₹25L total, 6 years — the lowest band in this comparison'],
      ['Hostel & living', '₹1.2–2.5L per year, Bishkek/Osh (approximate)'],
      ['Visa & registration', 'Add ₹15,000–35,000/year depending on category'],
    ],
    documents: [
      'Class 10 & 12 marksheets',
      'NEET-UG scorecard',
      'Passport (valid 18+ months)',
      'Passport-size photographs',
      'Invitation letter from the university',
      'Medical fitness certificate',
      'Police clearance certificate',
      'Proof of funds / bank statement',
      'Visa application form',
    ],
    faqs: [
      { q: 'Is Kyrgyzstan cheaper than Georgia or Russia for MBBS?', a: 'Yes — every university tracked in Kyrgyzstan falls into the Low (under ₹25L) six-year fee band, generally lower than the Mid band typical of Georgia and much of Russia.' },
      { q: 'Which Kyrgyzstan university has the best FMGE track record?', a: 'Kyrgyz Russian Slavic University (KRSU) is cited as the top FMGE performer in the country, with a 39.66% pass rate reported in 2024 data — verify current figures before relying on this for advising a student.' },
      { q: 'Is teaching in Kyrgyzstan fully in English?', a: 'Yes, the universities tracked here teach the full six-year programme in English, unlike Russia where clinical years often shift to local-language instruction.' },
      { q: 'Are any Kyrgyzstan universities NMC-flagged?', a: 'No — as of this data’s retrieval date (31 Aug 2026), no NMC advisory applies to Kyrgyzstan, unlike the situation with several Uzbekistan universities. Always re-verify current status before applying.' },
    ],
    cta: {
      heading: 'Considering MBBS in Kyrgyzstan?',
      subtext: 'Get a shortlist cross-checked against current compliance status, FMGE pass-rate bands and your budget.',
      button: 'Book a Free Counselling Session',
    },
  },

  uzbekistan: {
    id: 'uzbekistan',
    name: 'Uzbekistan',
    flagged: true,
    titleTag: 'MBBS in Uzbekistan for Indian Students — NMC Advisory Alert (April 2026)',
    metaDescription:
      'Important NMC advisory update on MBBS in Uzbekistan — Tashkent, Samarkand and Bukhara medical universities flagged April 2026. Read before recommending any Uzbekistan university.',
    h1: 'MBBS in Uzbekistan — Read the April 2026 NMC Advisory First',
    lead:
      'Uzbekistan has historically been a low-cost MBBS-abroad destination, but three of its best-known universities were named in an NMC advisory in April 2026. This page leads with that alert because it changes which universities should currently be recommended.',
    stats: [
      { label: 'Universities tracked', value: '6' },
      { label: 'Typical 6-yr fee band', value: 'Low (<₹25L)' },
      { label: 'Compliance snapshot', value: '3 Flagged/Advisory · 3 Unverified' },
      { label: 'Medium of instruction', value: 'Pre-clinical English, local language in clinical years' },
    ],
    advisories: [
      {
        tone: 'danger',
        title: 'NMC advisory — 1 April 2026 (fifth in three years)',
        body: [
          "The NMC's UGMEB issued its fifth advisory in three years on 1 April 2026, naming Tashkent State Medical University, Samarkand State Medical University and Bukhara State Medical Institute — and, per some sources, an institution linked to TIT Bangalore — for violations of the FMGL Regulations 2021, including admitting students beyond intake capacity, weak hands-on clinical training, and medium of instruction not actually being English. These three universities should not be recommended pending resolution, even though several SEO-refreshed portals still list them as “top” Uzbekistan picks — that content is now stale.",
          'Remaining Uzbekistan universities: Unverified, not Flagged — Andijan State Medical Institute, Tashkent Medical Academy and Fergana Medical Institute of Public Health were not named in the April 2026 advisory, but country-level scrutiny on Uzbekistan is elevated. Treat any Uzbekistan recommendation as needing fresh verification against the latest NMC advisory before use.',
        ],
      },
    ],
    whyChoose: [
      { title: 'Historically the lowest fee band', text: 'All six universities tracked here fall in the Low (under ₹25L) six-year cost band, among the cheapest of any MBBS-abroad destination.' },
      { title: 'Geographic and cultural proximity', text: "Uzbekistan's proximity to India and established Indian community in Tashkent have made it a familiar option historically." },
      { title: 'Currently under elevated regulatory scrutiny', text: 'Given the April 2026 advisory and the country’s pattern of five advisories in three years, any recommendation here needs to be paired with a clear compliance check, not treated as routine.' },
    ],
    universityColumns: UNI_COLUMNS,
    universities: [
      ['Tashkent State Medical University (TSMU)', 'Public', 'Flagged/Advisory (NMC Apr 2026)', 'Low (<25%)', 'Low (<₹25L)', 'Full pre-clinical, local language in clinical years', 'Limited/Unverified', "Named in the NMC's 1 April 2026 alert for over-admission, weak clinical training and non-English instruction concerns — do not recommend pending resolution."],
      ['Samarkand State Medical University (SSMU)', 'Public', 'Flagged/Advisory (NMC Apr 2026)', 'Low (<25%)', 'Low (<₹25L)', 'Full pre-clinical, local language in clinical years', 'Limited/Unverified', "Named in the NMC's 1 April 2026 alert — do not recommend pending resolution; some older listings still call it 'top-ranked', which is stale."],
      ['Bukhara State Medical Institute (BSMI)', 'Public', 'Flagged/Advisory (NMC Apr 2026)', 'Low (<25%)', 'Low (<₹25L)', 'Full pre-clinical, local language in clinical years', 'Limited/Unverified', "Named in the NMC's 1 April 2026 alert — do not recommend pending resolution."],
      ['Andijan State Medical Institute', 'Public', 'Unverified', 'Unknown / Not independently verified', 'Low (<₹25L)', 'Full', 'Limited/Unverified', 'Not named in the April 2026 advisory, but country-level scrutiny is elevated — verify current status before recommending.'],
      ['Tashkent Medical Academy', 'Public', 'Unverified', 'Unknown / Not independently verified', 'Low (<₹25L)', 'Full', 'Limited/Unverified', 'Not named in the advisory; verify current status before recommending.'],
      ['Fergana Medical Institute of Public Health', 'Public', 'Unverified', 'Unknown / Not independently verified', 'Low (<₹25L)', 'Full', 'Limited/Unverified', 'Not named in the advisory; verify current status before recommending.'],
    ],
    englishProficiency: 'No IELTS/TOEFL typically required for admission.',
    intake: [
      'Main intake: September',
      'Programme length: 6 years (5 years + 1-year internship)',
      'Current advisory status: Verify against latest NMC/UGMEB bulletin before applying',
    ],
    costs: [
      ['All tracked universities', 'Under ₹25L total, 6 years — the lowest band in this comparison'],
      ['Hostel & living', '₹1–2L per year, Tashkent/Samarkand/Bukhara (approximate)'],
      ['Visa & registration', 'Add ₹15,000–30,000/year depending on category'],
    ],
    documents: [
      'Class 10 & 12 marksheets',
      'NEET-UG scorecard',
      'Passport (valid 18+ months)',
      'Passport-size photographs',
      'Invitation letter from the university',
      'Medical fitness certificate',
      'Police clearance certificate',
      'Proof of funds / bank statement',
      'Visa application form',
    ],
    faqs: [
      { q: 'Should I recommend Tashkent, Samarkand or Bukhara medical universities right now?', a: 'No, not currently. All three were named in the NMC’s 1 April 2026 advisory for over-admission, weak clinical training and non-English instruction concerns. They should not be recommended pending resolution of that advisory, regardless of what older or SEO-refreshed portal content says.' },
      { q: 'Are any Uzbekistan universities still safe to recommend?', a: 'Andijan State Medical Institute, Tashkent Medical Academy and Fergana Medical Institute of Public Health were not named in the April 2026 advisory, but they carry an Unverified status and country-level scrutiny is elevated — confirm current status directly before recommending any of them.' },
      { q: 'Why does Uzbekistan keep getting NMC advisories?', a: "The April 2026 notice was the fifth advisory the NMC's UGMEB has issued on Uzbekistan in three years, reflecting recurring concerns about over-admission relative to capacity, clinical-training quality, and whether instruction is genuinely delivered in English as advertised." },
      { q: 'Is Uzbekistan still one of the cheapest MBBS destinations?', a: 'Yes, on cost alone — all six universities tracked here sit in the Low (under ₹25L) six-year fee band. But given the current advisory, cost alone should not drive a recommendation without a fresh compliance check.' },
    ],
    cta: {
      heading: 'Considering MBBS in Uzbekistan?',
      subtext: 'Get a shortlist cross-checked against current compliance status, FMGE pass-rate bands and your budget.',
      button: 'Book a Free Counselling Session',
    },
  },

  philippines: {
    id: 'philippines',
    name: 'Philippines',
    titleTag: 'MD in the Philippines for Indian Students — Universities, Fees & USMLE Pathway',
    metaDescription:
      'Guide to studying Doctor of Medicine (MD) in the Philippines for Indian students — NMC-compliant universities, fee bands, FMGE outcomes and the USMLE/ECFMG pathway.',
    h1: 'MD in the Philippines — NMC-Compliant, With a US Pathway Option',
    lead:
      "The Philippines runs a US-pattern medical curriculum leading to a Doctor of Medicine (MD) — not 'MBBS' — which the NMC treats as equivalent for FMGE/NExT eligibility. The same US-style curriculum also opens a USMLE/ECFMG pathway for students weighing US residency alongside, or instead of, returning to India.",
    stats: [
      { label: 'Universities tracked', value: '5' },
      { label: 'Typical 6-yr fee band', value: 'Mid (₹25–40L)' },
      { label: 'Compliance snapshot', value: 'All 5 tracked: Compliant' },
      { label: 'Medium of instruction', value: 'Full English' },
    ],
    advisories: [
      {
        tone: 'info',
        title: 'Degree is titled "MD", not "MBBS" — this is expected, not a red flag',
        body: [
          'The Philippines awards a Doctor of Medicine (MD), which the NMC treats as equivalent to MBBS for FMGE/NExT eligibility. The US-pattern curriculum also opens a USMLE/ECFMG pathway for students considering US residency alongside, or instead of, Indian practice.',
        ],
      },
    ],
    whyChoose: [
      { title: 'Genuinely NMC-compliant across the board', text: 'All five universities tracked here are marked Compliant, with no advisory equivalent to the Uzbekistan situation.' },
      { title: 'Dual pathway: FMGE or USMLE', text: 'The US-pattern curriculum means graduates can pursue FMGE/NExT for Indian practice or USMLE/ECFMG for US residency, without switching curricula.' },
      { title: 'Strong historical FMGE pass rates', text: 'University of Northern Philippines, Our Lady of Fatima University and Davao Medical School Foundation are all cited in the High (>40%) FMGE pass-rate band.' },
      { title: 'Affordable government option available', text: 'University of Northern Philippines is a state-funded institution cited at roughly ₹15.5–25L total — one of the most affordable NMC-compliant options anywhere in this comparison.' },
    ],
    universityColumns: UNI_COLUMNS,
    universities: [
      ['University of Northern Philippines (UNP)', 'Public (state-funded)', 'Compliant', 'High (>40%)', 'Low (<₹25L)', 'Full', 'Strong', 'Government-run, USMLE-aligned curriculum; cited at approx. ₹15.5–25L total — one of the most affordable NMC-compliant options anywhere.'],
      ['Our Lady of Fatima University (OLFU) — College of Medicine', 'Private', 'Compliant', 'High (>40%)', 'Mid (₹25-40L)', 'Full', 'Strong', 'Established 1973; WHO/NMC/ECFMG accredited; high historical FMGE pass rates; scholarships available.'],
      ['Davao Medical School Foundation (DMSF)', 'Private', 'Compliant', 'High (>40%)', 'Mid (₹25-40L)', 'Full', 'Strong', 'Premier, long-established institution; strong FMGE reputation among Indian students.'],
      ['AMA School of Medicine (AMASOM), Makati', 'Private', 'Compliant', 'Moderate (25-40%)', 'Mid (₹25-40L)', 'Full', 'Moderate', 'Founded 2008; part of AMA Education System; NMC/WHO recognised.'],
      ['UV Gullas College of Medicine', 'Private', 'Compliant', 'Moderate (25-40%)', 'Mid (₹25-40L)', 'Full', 'Moderate', '6-year MD programme; NMC recognised.'],
    ],
    englishProficiency:
      'No IELTS/TOEFL typically required — English is the primary language of instruction nationally.',
    intake: [
      'Main intake: August/September',
      'Programme length: Pre-med bridge (if required) + 4-year MD + 1-year internship',
      'Alternate pathway: USMLE/ECFMG track available alongside FMGE/NExT track',
    ],
    costs: [
      ['University of Northern Philippines (public)', 'Approx. ₹15.5–25L total'],
      ['Private universities', '₹25–40L total, typical'],
      ['Hostel & living', '₹2–3.5L per year (Manila higher, regional cities lower)'],
      ['USMLE/ECFMG track (if pursued)', 'Additional exam & registration fees, budgeted separately'],
    ],
    documents: [
      'Class 10 & 12 marksheets',
      'NEET-UG scorecard',
      'Passport (valid 18+ months)',
      'Passport-size photographs',
      'Invitation/admission letter from the university',
      'Medical fitness certificate',
      'Police clearance certificate',
      'Proof of funds / bank statement',
      'Visa application (student visa 9(f))',
      'Health/travel insurance',
    ],
    faqs: [
      { q: "Why does the Philippines give an 'MD' instead of 'MBBS'?", a: 'The Philippines follows a US-pattern medical education model, where the qualification is titled Doctor of Medicine (MD) rather than MBBS. The NMC treats this MD as equivalent to MBBS for FMGE/NExT eligibility purposes, so this naming difference is expected, not a compliance concern.' },
      { q: 'Can I pursue US residency after studying in the Philippines?', a: 'The US-pattern curriculum is structured to also support a USMLE/ECFMG pathway, so students weighing US residency alongside, or instead of, Indian practice have that option — though it requires separate exams and planning from the FMGE/NExT route.' },
      { q: 'Which Philippines university is most affordable?', a: 'University of Northern Philippines, a state-funded institution, is cited at roughly ₹15.5–25L total for the programme — the most affordable NMC-compliant option in this comparison.' },
      { q: 'Are Philippines MD programmes NMC-compliant?', a: 'All five universities tracked here are currently marked Compliant, with no advisory situation comparable to Uzbekistan. As always, verify current WDOMS listing and FMGL 2021 status directly before advising a student.' },
    ],
    cta: {
      heading: 'Considering MBBS in Philippines?',
      subtext: 'Get a shortlist cross-checked against current compliance status, FMGE pass-rate bands and your budget.',
      button: 'Book a Free Counselling Session',
    },
  },

  caribbean: {
    id: 'caribbean',
    name: 'Caribbean',
    titleTag: 'MD in the Caribbean for Indian Students — US-Residency Pathway, Not FMGE',
    metaDescription:
      'Guide to Caribbean medical schools (Saba, Nevis, Cayman Islands) for Indian students — GUS-owned institutions built for USMLE/ECFMG and US residency, not FMGE/NExT.',
    h1: 'Caribbean Medical Schools — Built for US Residency, Not Indian Practice',
    lead:
      'The three Caribbean medical schools tracked here are GUS-owned institutions priced and structured for the US market. They lead to USMLE/ECFMG and US residency, not FMGE/NExT — this is the right fit only for students whose goal is practising in the US, not returning to India.',
    stats: [
      { label: 'Universities tracked', value: '3' },
      { label: 'Typical 6-yr fee band', value: 'High (>₹40L)' },
      { label: 'Compliance snapshot', value: 'All 3: Compliant (US pathway)' },
      { label: 'Medium of instruction', value: 'Full English' },
    ],
    advisories: [
      {
        tone: 'info',
        title: 'US-market pathway, not India-return',
        body: [
          "Saba University School of Medicine, Medical University of the Americas (Nevis) and St. Matthew's University (Cayman Islands) are GUS-owned institutions priced and structured for the US market — the USMLE/ECFMG residency pathway — rather than India-return via FMGE/NExT. Fees run far higher than the Asian, CIS and European destinations covered elsewhere in this directory. This is the best fit for students specifically targeting US residency, not primarily Indian medical practice.",
        ],
      },
    ],
    whyChoose: [
      { title: 'US clinical-rotation model', text: 'Clinical rotations are conducted at US-affiliated teaching hospitals, mirroring the training pathway of US-based medical schools.' },
      { title: 'Existing institutional relationship', text: 'All three schools are already GUS-owned institutions, representing an existing collaboration rather than a new partner to vet.' },
      { title: 'Strong fit for the USMLE/ECFMG track', text: 'Curricula are purpose-built for students pursuing US residency rather than the FMGE/NExT route back to India.' },
      { title: 'Additional programme options', text: "Medical University of the Americas (Nevis) and St. Matthew's University (Cayman Islands) also offer veterinary medicine programmes." },
    ],
    universityColumns: UNI_COLUMNS,
    universities: [
      ['Saba University School of Medicine', 'Private (GUS-owned)', 'Compliant', 'Unknown / Not independently verified (ECFMG/USMLE-oriented, not FMGE-tracked)', 'High (>₹40L)', 'Full', 'Strong', 'GUS-owned; US clinical-rotation model, primarily aimed at the USMLE/US residency pathway rather than India-return via FMGE.'],
      ['Medical University of the Americas (Nevis)', 'Private (GUS-owned)', 'Compliant', 'Unknown / Not independently verified (ECFMG/USMLE-oriented, not FMGE-tracked)', 'High (>₹40L)', 'Full', 'Strong', 'GUS-owned; also offers veterinary medicine; US-affiliated teaching hospitals for clinical years.'],
      ["St. Matthew's University (Cayman Islands)", 'Private (GUS-owned)', 'Compliant', 'Unknown / Not independently verified (ECFMG/USMLE-oriented, not FMGE-tracked)', 'High (>₹40L)', 'Full', 'Strong', 'GUS-owned; medicine + veterinary medicine; US-pattern curriculum.'],
    ],
    englishProficiency:
      'No IELTS/TOEFL typically required for Indian applicants; MCAT may be relevant if applying via a pre-med bridge.',
    intake: [
      'Intakes: Multiple per year (varies by school — typically January, May, September)',
      'Programme length: Approx. 4 years basic sciences + clinical rotations (US-model)',
      'Target outcome: USMLE Step exams — US residency match',
    ],
    costs: [
      ['All three tracked schools', 'Above ₹40L total — the highest band in this comparison'],
      ['US clinical rotations', 'Additional living costs during US-based clinical years'],
      ['USMLE Step exam fees', 'Budgeted separately, required for the residency pathway'],
    ],
    documents: [
      "Bachelor's degree transcripts (pre-med prerequisite courses)",
      'MCAT score (school-dependent)',
      'Passport (valid 18+ months)',
      'Passport-size photographs',
      'Letters of recommendation',
      'Statement of purpose',
      'Proof of funds / bank statement',
      'Visa/entry documentation for the island jurisdiction',
      'Health/travel insurance',
    ],
    faqs: [
      { q: 'Should I recommend a Caribbean medical school to a student planning to practise in India?', a: 'Generally no. These three schools are structured and priced for the USMLE/ECFMG pathway to US residency, not for FMGE/NExT and India-return — a student focused on Indian practice will usually find better value and a clearer licensing path at the other six destinations in this directory.' },
      { q: 'Who is the right fit for these Caribbean schools?', a: 'Students specifically targeting US residency, who want a US-pattern curriculum and US-based clinical rotations, and who have the budget for the High (above ₹40L) fee band.' },
      { q: 'Are these schools NMC-compliant?', a: "They're marked Compliant in this directory, but their FMGE pass-rate data is not tracked because their pathway is oriented toward USMLE/ECFMG rather than FMGE — that's a structural difference, not a red flag, but it does mean India-return outcomes data isn't the right lens for evaluating them." },
      { q: 'Why are the fees so much higher than Georgia, Kyrgyzstan or Uzbekistan?', a: 'These are GUS-owned institutions built around the US medical-education market, with US-affiliated teaching hospitals for clinical rotations — that positioning and infrastructure carries a materially higher cost than the Asian, CIS or European destinations.' },
    ],
    cta: {
      heading: 'Considering MBBS in the Caribbean?',
      subtext: 'Get a shortlist cross-checked against current compliance status, FMGE pass-rate bands and your budget.',
      button: 'Book a Free Counselling Session',
    },
  },
};

export const medicalCountryList = Object.values(medicalCountryContent).map((c) => ({
  id: c.id,
  name: c.name,
}));
