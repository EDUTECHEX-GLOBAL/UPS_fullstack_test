import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axiosInstance from '../../../../api/axiosInstance';
import ApplicationConsistency from './ApplicationConsistency';
import FileUpload from './FileUpload';
import { FaPlus, FaTrashAlt, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import './test-score.css';

export const LANGUAGE_TEST_OPTIONS = [
  'IELTS',
  'TOEFL',
  'PTE',
  'Duolingo English Test',
  'Cambridge English',
  'Other'
];

export const ADDITIONAL_TEST_OPTIONS = [
  'GRE',
  'GMAT',
  'SAT',
  'ACT',
  'MCAT',
  'LSAT',
  'NEET',
  'UCAT',
  'Other'
];

export const ADDITIONAL_TEST_OPTIONS_BY_LEVEL = {
  bachelor: ['SAT', 'ACT', 'Other'],
  master: ['GRE', 'GMAT', 'LSAT', 'Other'],
  medical: ['MCAT', 'NEET', 'UCAT', 'Other'],
  all: ADDITIONAL_TEST_OPTIONS
};

const TEST_CONFIG = {
  GRE: { title: 'GRE General Scores', fields: [{ key: 'verbalScore', label: 'Verbal Reasoning (130-170)', min: 130, max: 170, placeholder: 'e.g. 158' }, { key: 'quantitativeScore', label: 'Quantitative (130-170)', min: 130, max: 170, placeholder: 'e.g. 164' }, { key: 'analyticalWritingScore', label: 'Analytical Writing (0-6.0)', min: 0, max: 6, step: 0.5, placeholder: 'e.g. 4.5' }], total: { min: 260, max: 340, label: 'Total Score (260-340) *', placeholder: 'e.g. 322' } },
  GMAT: { title: 'GMAT Focus Edition Section Scores', fields: [{ key: 'quantitativeScore', label: 'Quantitative (60-90)', min: 60, max: 90, placeholder: 'e.g. 84' }, { key: 'verbalScore', label: 'Verbal (60-90)', min: 60, max: 90, placeholder: 'e.g. 82' }, { key: 'dataInsightsScore', label: 'Data Insights (60-90)', min: 60, max: 90, placeholder: 'e.g. 80' }], total: { min: 205, max: 805, label: 'Total Score (205-805) *', placeholder: 'e.g. 665' } },
  SAT: { title: 'SAT Section Scores', fields: [{ key: 'readingWritingScore', label: 'Reading / Writing (200-800)', min: 200, max: 800, placeholder: 'e.g. 720' }, { key: 'mathScore', label: 'Math (200-800)', min: 200, max: 800, placeholder: 'e.g. 760' }], total: { min: 400, max: 1600, label: 'Total Score (400-1600) *', placeholder: 'e.g. 1480' } },
  ACT: { title: 'ACT Section Scores (1-36)', fields: [{ key: 'englishScore', label: 'English', min: 1, max: 36, placeholder: 'e.g. 32' }, { key: 'mathScore', label: 'Math', min: 1, max: 36, placeholder: 'e.g. 34' }, { key: 'readingScore', label: 'Reading', min: 1, max: 36, placeholder: 'e.g. 33' }, { key: 'scienceScore', label: 'Science', min: 1, max: 36, placeholder: 'e.g. 31' }], total: { min: 1, max: 36, label: 'Composite Score *', placeholder: 'e.g. 33' } },
  MCAT: { title: 'MCAT Section Scores (118-132)', fields: [{ key: 'chemicalPhysicalScore', label: 'Chem & Phys (118-132)', min: 118, max: 132, placeholder: 'e.g. 128' }, { key: 'carsScore', label: 'CARS (118-132)', min: 118, max: 132, placeholder: 'e.g. 127' }, { key: 'biologicalBiochemicalScore', label: 'Bio & Biochem (118-132)', min: 118, max: 132, placeholder: 'e.g. 129' }, { key: 'psychologicalSocialScore', label: 'Psych & Social (118-132)', min: 118, max: 132, placeholder: 'e.g. 128' }], total: { min: 472, max: 528, label: 'Total Score (472-528) *', placeholder: 'e.g. 512' } },
  LSAT: { title: 'LSAT Score (120-180)', fields: [], total: { min: 120, max: 180, label: 'Total Score (120-180) *', placeholder: 'e.g. 165' } },
  NEET: { title: 'NEET Score (0-720)', fields: [{ key: 'physicsScore', label: 'Physics (optional)', min: 0, max: 180, placeholder: 'e.g. 160' }, { key: 'chemistryScore', label: 'Chemistry (optional)', min: 0, max: 180, placeholder: 'e.g. 170' }, { key: 'biologyScore', label: 'Biology (optional)', min: 0, max: 360, placeholder: 'e.g. 340' }], total: { min: 0, max: 720, label: 'Total Score (0-720) *', placeholder: 'e.g. 650' } },
  UCAT: { title: 'UCAT Cognitive Scores', fields: [{ key: 'verbalScore', label: 'Verbal Reasoning (300-900)', min: 300, max: 900, placeholder: 'e.g. 650' }, { key: 'decisionMakingScore', label: 'Decision Making (300-900)', min: 300, max: 900, placeholder: 'e.g. 700' }, { key: 'quantitativeScore', label: 'Quantitative Reasoning (300-900)', min: 300, max: 900, placeholder: 'e.g. 680' }, { key: 'abstractReasoningScore', label: 'Abstract Reasoning (300-900)', min: 300, max: 900, placeholder: 'e.g. 620' }, { key: 'situationalJudgementBand', label: 'Situational Judgement Band (1-4)', min: 1, max: 4, placeholder: 'e.g. 2' }], total: { min: 1200, max: 3600, label: 'Total Cognitive Score (1200-3600) *', placeholder: 'e.g. 2650' } }
};

const TestScoreSelect = ({ value, options, placeholder, onChange, disabled, invalid, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [menuMaxHeight, setMenuMaxHeight] = useState(220);
  const selectRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!selectRef.current?.contains(event.target)) setIsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('touchstart', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('touchstart', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const toggleMenu = () => {
    if (disabled) return;
    if (!isOpen && selectRef.current) {
      const rect = selectRef.current.getBoundingClientRect();
      const menuHeight = Math.min(220, window.innerHeight * 0.4);
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldOpenUp = spaceBelow < menuHeight && rect.top > spaceBelow;
      const availableSpace = shouldOpenUp ? rect.top : spaceBelow;
      setOpenUp(shouldOpenUp);
      setMenuMaxHeight(Math.max(80, Math.min(menuHeight, availableSpace - 12)));
    }
    setIsOpen(open => !open);
  };

  return (
    <div className={`test-score-select-wrap ${isOpen ? 'open' : ''} ${invalid ? 'is-invalid' : ''}`} ref={selectRef}>
      <button
        type="button"
        className="test-score-select-trigger"
        onClick={toggleMenu}
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={value ? 'selected-text' : 'placeholder-text'}>{value || placeholder}</span>
        <span className="test-score-select-arrow" aria-hidden="true" />
      </button>
      {isOpen && (
        <div className={`test-score-select-menu ${openUp ? 'opens-up' : ''}`} role="listbox" aria-label={label} style={{ maxHeight: `${menuMaxHeight}px` }}>
          {[{ value: '', label: placeholder }, ...options.map(option => ({ value: option, label: option }))].map(option => (
            <button
              type="button"
              key={option.value || 'placeholder'}
              role="option"
              aria-selected={value === option.value}
              className={`test-score-select-option ${value === option.value ? 'active' : ''}`}
              onClick={() => { onChange(option.value); setIsOpen(false); }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const toLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TestScoreDatePicker = ({ value, onChange, max, disabled, invalid, label = 'Test date' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [yearInput, setYearInput] = useState(String(new Date().getFullYear()));
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const parsed = value ? new Date(`${value}T00:00:00`) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  });
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const triggerRef = useRef(null);
  const calendarRef = useRef(null);
  const today = toLocalDateKey(new Date());
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const maxDate = new Date(`${max || today}T00:00:00`);
  const maxYear = Number.isNaN(maxDate.getTime()) ? new Date().getFullYear() : maxDate.getFullYear();
  const maxMonth = Number.isNaN(maxDate.getTime()) ? new Date().getMonth() : maxDate.getMonth();
  const selectedYear = value ? Number(value.slice(0, 4)) : 1950;
  const minYear = Number.isFinite(selectedYear) ? Math.min(1950, selectedYear) : 1950;
  const availableMonths = Array.from({ length: year === maxYear ? maxMonth + 1 : 12 }, (_, index) => index);
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const dayOffset = index - firstWeekday + 1;
    if (dayOffset < 1) {
      const date = new Date(year, month - 1, previousMonthDays + dayOffset);
      return { date, inMonth: false };
    }
    if (dayOffset > daysInMonth) {
      const date = new Date(year, month + 1, dayOffset - daysInMonth);
      return { date, inMonth: false };
    }
    return { date: new Date(year, month, dayOffset), inMonth: true };
  });

  useEffect(() => {
    setYearInput(String(year));
  }, [year]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnOutside = (event) => {
      if (!triggerRef.current?.contains(event.target) && !calendarRef.current?.contains(event.target)) setIsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    const closeOnScroll = () => setIsOpen(false);
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('touchstart', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('touchstart', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', closeOnScroll, true);
    };
  }, [isOpen]);

  const openCalendar = () => {
    if (disabled) return;
    if (value) {
      const parsed = new Date(`${value}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) setVisibleMonth(parsed);
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    const calendarWidth = Math.min(300, window.innerWidth - 24);
    const calendarHeight = 380;
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const opensUp = spaceBelow < calendarHeight && rect.top > spaceBelow;
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - calendarWidth - 12));
      const top = opensUp
        ? Math.max(12, rect.top - calendarHeight - 8)
        : Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - calendarHeight - 12));
      setPosition({ left, top });
    }
    setIsOpen(open => !open);
  };

  const chooseDate = (date) => {
    const dateKey = toLocalDateKey(date);
    if (max && dateKey > max) return;
    onChange(dateKey);
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`test-score-date-trigger ${invalid ? 'is-invalid' : ''}`}
        onClick={openCalendar}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-label={`${label}${value ? `, ${value}` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span>{value ? `${value.slice(8, 10)}-${value.slice(5, 7)}-${value.slice(0, 4)}` : 'DD-MM-YYYY'}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
      </button>
      {isOpen && createPortal(
        <div
          ref={calendarRef}
          className="test-score-calendar"
          role="dialog"
          aria-label={label}
          style={{ left: position.left, top: position.top }}
        >
          <div className="test-score-calendar-header">
            <button type="button" aria-label="Previous month" disabled={year === minYear && month === 0} onClick={() => setVisibleMonth(new Date(year, month - 1, 1))}>‹</button>
            <div className="test-score-calendar-period">
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                aria-label="Test date year"
                value={yearInput}
                onChange={(event) => {
                  const nextYearText = event.target.value.replace(/\D/g, '').slice(0, 4);
                  setYearInput(nextYearText);
                  if (nextYearText.length === 4) {
                    const nextYear = Number(nextYearText);
                    if (nextYear >= minYear && nextYear <= maxYear) {
                      setVisibleMonth(new Date(nextYear, nextYear === maxYear ? Math.min(month, maxMonth) : month, 1));
                    }
                  }
                }}
                onBlur={() => {
                  const enteredYear = Number(yearInput);
                  if (!/^\d{4}$/.test(yearInput) || enteredYear < minYear || enteredYear > maxYear) {
                    setYearInput(String(year));
                  }
                }}
                onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
              />
              <select
                aria-label="Test date month"
                value={month}
                onChange={(event) => setVisibleMonth(new Date(year, Number(event.target.value), 1))}
              >
                {availableMonths.map(monthIndex => (
                  <option key={monthIndex} value={monthIndex}>
                    {new Date(2000, monthIndex, 1).toLocaleDateString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" aria-label="Next month" disabled={year === maxYear && month === maxMonth} onClick={() => setVisibleMonth(new Date(year, month + 1, 1))}>›</button>
          </div>
          <div className="test-score-calendar-grid" aria-hidden="true">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => <span className="weekday" key={day}>{day}</span>)}
          </div>
          <div className="test-score-calendar-grid">
            {calendarDays.map(({ date, inMonth }, index) => {
              const dateKey = toLocalDateKey(date);
              const isSelected = value === dateKey;
              const isDisabled = Boolean(max && dateKey > max);
              return (
                <button
                  type="button"
                  key={`${dateKey}-${index}`}
                  className={`${inMonth ? '' : 'outside-month'} ${isSelected ? 'selected' : ''}`}
                  disabled={isDisabled}
                  onClick={() => chooseDate(date)}
                  aria-label={date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="test-score-calendar-footer">
            <button type="button" onClick={() => { onChange(''); setIsOpen(false); }}>Clear</button>
            <button type="button" onClick={() => chooseDate(new Date(`${today}T00:00:00`))}>Today</button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

const getEmptyLanguageTest = () => ({
  exam: '',
  customTestName: '',
  score: '',
  testDate: '',
  listeningScore: '',
  readingScore: '',
  writingScore: '',
  speakingScore: '',
  literacyScore: '',
  comprehensionScore: '',
  conversationScore: '',
  productionScore: '',
  reportFile: null
});

const getEmptyAdditionalTest = () => ({
  id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
  exam: '',
  customTestName: '',
  testDate: '',
  score: '',
  verbalScore: '',
  quantitativeScore: '',
  analyticalWritingScore: '',
  dataInsightsScore: '',
  readingWritingScore: '',
  mathScore: '',
  englishScore: '',
  readingScore: '',
  scienceScore: '',
  chemicalPhysicalScore: '',
  carsScore: '',
  biologicalBiochemicalScore: '',
  psychologicalSocialScore: '',
  physicsScore: '', chemistryScore: '', biologyScore: '', decisionMakingScore: '', abstractReasoningScore: '', situationalJudgementBand: '',
  reportFile: null
});

const TestScores = ({
  data = {},
  programLevel = 'all',
  programSelection = {},
  onUpdate,
  onNext,
  onBack,
  isLocked = false,
  onSaveDraft
}) => {
  const normalizedLevel = ['bachelor', 'master', 'medical'].includes(String(programLevel).toLowerCase()) ? String(programLevel).toLowerCase() : 'all';
  const hasLanguageSection = normalizedLevel !== 'medical';
  const additionalOptions = ADDITIONAL_TEST_OPTIONS_BY_LEVEL[normalizedLevel];
  const todayLocal = (() => { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 10); })();
  const initializedDataRef = useRef(null);
  const [hasNotTaken, setHasNotTaken] = useState(false);
  const [languageTest, setLanguageTest] = useState(getEmptyLanguageTest());
  const [additionalTests, setAdditionalTests] = useState([]);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [availableCountries, setAvailableCountries] = useState([]);
  const [selectedCountries, setSelectedCountries] = useState(
    Array.isArray(programSelection.selectedCountries) ? programSelection.selectedCountries : []
  );
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef(null);
  const countrySearchInputRef = useRef(null);

  const backendProgramType = normalizedLevel;
  const enrollmentProgramType = normalizedLevel === 'bachelor' ? 'bachelors'
    : normalizedLevel === 'master' ? 'masters' : normalizedLevel;

  useEffect(() => {
    if (!backendProgramType) {
      setAvailableCountries([]);
      return undefined;
    }
    const controller = new AbortController();
    setCountriesLoading(true);
    axiosInstance.get('/api/enrollment/program-selection/countries', {
      params: { programType: backendProgramType },
      signal: controller.signal,
    }).then(({ data: response }) => {
      if (response?.success) setAvailableCountries(response.countries || []);
      else setAvailableCountries([]);
    }).catch((error) => {
      if (error?.code !== 'ERR_CANCELED') {
        console.error('Unable to load countries for test score application:', error);
        setAvailableCountries([]);
      }
    }).finally(() => {
      if (!controller.signal.aborted) setCountriesLoading(false);
    });
    return () => controller.abort();
  }, [backendProgramType]);

  useEffect(() => {
    if (!availableCountries.length) return;
    const validCountryNames = new Map(availableCountries.map((country) => [country.toLowerCase(), country]));
    const savedCountries = Array.isArray(programSelection.selectedCountries)
      ? programSelection.selectedCountries
      : programSelection.countryName ? [programSelection.countryName] : [];
    const cleanedCountries = [...new Set(savedCountries
      .map((country) => validCountryNames.get(String(country).trim().toLowerCase()))
      .filter(Boolean))].slice(0, 5);
    setSelectedCountries(cleanedCountries);
    if (cleanedCountries.length !== savedCountries.length || cleanedCountries.some((country, index) => country !== savedCountries[index])) {
      onUpdate?.('programSelection', {
        ...programSelection,
        programType: programSelection.programType || enrollmentProgramType,
        selectedCountries: cleanedCountries,
        countryName: cleanedCountries[cleanedCountries.length - 1] || '',
      });
    }
  }, [availableCountries, normalizedLevel, onUpdate, programSelection]);

  useEffect(() => {
    const closeDropdown = (event) => {
      if (!countryDropdownRef.current?.contains(event.target)) setCountryDropdownOpen(false);
    };
    document.addEventListener('mousedown', closeDropdown);
    return () => document.removeEventListener('mousedown', closeDropdown);
  }, []);

  const updateSelectedCountries = (country) => {
    if (isLocked || selectedCountries.includes(country) || selectedCountries.length >= 5) return;
    const nextCountries = [...selectedCountries, country];
    setSelectedCountries(nextCountries);
    setCountrySearch('');
    setCountryDropdownOpen(nextCountries.length < 5);
    if (nextCountries.length < 5) {
      requestAnimationFrame(() => countrySearchInputRef.current?.focus());
    }
    onUpdate?.('programSelection', {
      ...programSelection,
      programType: programSelection.programType || enrollmentProgramType,
      selectedCountries: nextCountries,
      countryName: nextCountries[nextCountries.length - 1] || '',
    });
  };

  const saveCountrySelection = async () => {
    if (selectedCountries.length === 0) {
      throw new Error('Select at least one study country so your counselor can match universities to your application.');
    }
    const nextProgramSelection = {
      ...programSelection,
      programType: programSelection.programType || normalizedLevel,
      selectedCountries,
      countryName: selectedCountries[selectedCountries.length - 1],
    };
    await axiosInstance.post('/api/enrollment/program-selection', { programSelection: nextProgramSelection });
    onUpdate?.('programSelection', nextProgramSelection);
  };

  // Initialize from data
  useEffect(() => {
    if (!data) return;
    if (initializedDataRef.current) return;
    initializedDataRef.current = true;

    if (data.hasNotTaken !== undefined) {
      setHasNotTaken(Boolean(data.hasNotTaken));
    }

    // Prefer the structured form state, but reconstruct it from the saved flat
    // list when the application was saved before these fields were persisted.
    if (data.languageTest && data.languageTest.exam) {
      setLanguageTest({
        ...getEmptyLanguageTest(),
        ...data.languageTest
      });
    }

    if (Array.isArray(data.additionalTests) && data.additionalTests.length > 0) {
      setAdditionalTests(data.additionalTests);
    } else if (Array.isArray(data.tests) && data.tests.length > 0) {
      // Parse legacy or flat tests array
      const langOptionNames = ['ielts', 'toefl', 'pte', 'duolingo', 'cambridge'];
      let foundLang = null;
      const addList = [];

      data.tests.forEach((t) => {
        if (!t || !t.exam) return;
        const examLower = t.exam.toLowerCase();
        const isLang = langOptionNames.some((l) => examLower.includes(l));

        if (isLang && !foundLang) {
          let matchedExam = 'Other';
          if (examLower.includes('ielts')) matchedExam = 'IELTS';
          else if (examLower.includes('toefl')) matchedExam = 'TOEFL';
          else if (examLower.includes('pte')) matchedExam = 'PTE';
          else if (examLower.includes('duolingo')) matchedExam = 'Duolingo English Test';
          else if (examLower.includes('cambridge')) matchedExam = 'Cambridge English';

          foundLang = {
            ...getEmptyLanguageTest(),
            ...t,
            exam: matchedExam,
            customTestName: matchedExam === 'Other' ? t.exam : ''
          };
        } else {
          let matchedAdditional = 'Other';
          if (examLower.includes('gre subject')) matchedAdditional = 'Other';
          else if (examLower.includes('gre')) matchedAdditional = 'GRE';
          else if (examLower.includes('gmat')) matchedAdditional = 'GMAT';
          else if (examLower === 'lsat') matchedAdditional = 'LSAT';
          else if (examLower === 'gmat') matchedAdditional = 'GMAT';
          else if (examLower === 'mcat') matchedAdditional = 'MCAT';
          else if (examLower === 'sat') matchedAdditional = 'SAT';
          else if (examLower.includes('act')) matchedAdditional = 'ACT';
          else if (examLower === 'neet') matchedAdditional = 'NEET';
          else if (examLower === 'ucat') matchedAdditional = 'UCAT';

          addList.push({
            ...getEmptyAdditionalTest(),
            ...t,
            id: t.id || Date.now().toString() + Math.random().toString(36).substring(2, 7),
            exam: matchedAdditional,
            customTestName: matchedAdditional === 'Other' ? t.exam : ''
          });
        }
      });

      if (foundLang) setLanguageTest(foundLang);
      if (addList.length > 0) setAdditionalTests(addList);
    } else {
      setLanguageTest(getEmptyLanguageTest());
      setAdditionalTests([]);
    }
  }, [data]);

  // Handle Language Test changes
  const handleLanguageFieldChange = (field, value) => {
    setLanguageTest((prev) => ({
      ...prev,
      [field]: value
    }));
    if (errors[`lang_${field}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`lang_${field}`];
        return next;
      });
    }
  };

  const handleLanguageExamSelect = (examName) => {
    setLanguageTest({
      ...getEmptyLanguageTest(),
      exam: examName
    });
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith('lang_')) delete next[k];
      });
      return next;
    });
  };

  // Handle Additional Test changes
  const handleAddAdditionalTest = () => {
    if (isLocked) return;
    setAdditionalTests((prev) => [...prev, getEmptyAdditionalTest()]);
  };

  const handleRemoveAdditionalTest = (id) => {
    if (isLocked) return;
    setAdditionalTests((prev) => prev.filter((t) => t.id !== id));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`add_${id}`)) delete next[k];
      });
      return next;
    });
  };

  const handleAdditionalFieldChange = (id, field, value) => {
    setAdditionalTests((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      if (field === 'exam' && value !== t.exam) return { id: t.id, testDate: t.testDate, exam: value, customTestName: '', score: '', reportFile: null };
      return { ...t, [field]: value };
    }));
    if (errors[`add_${id}_${field}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`add_${id}_${field}`];
        return next;
      });
    }
  };

  const validateAll = () => {
    if (hasNotTaken) return true;

    const newErrors = {};

    // Medical applicants use admissions tests such as MCAT, NEET, or UCAT.
    if (hasLanguageSection && languageTest.exam) {
      if (languageTest.exam === 'Other' && !languageTest.customTestName.trim()) {
        newErrors.lang_customTestName = 'Please enter the language test name';
      }
      if (!String(languageTest.score ?? '').trim()) {
        newErrors.lang_score = 'Overall score / total score is required';
      }
      if (!languageTest.testDate) {
        newErrors.lang_testDate = 'Test date is required';
      }
      validateRange(languageTest.score, languageTest.exam === 'IELTS' ? { min: 0, max: 9, step: 0.5 } : languageTest.exam === 'TOEFL' ? { min: 0, max: 120 } : languageTest.exam === 'PTE' ? { min: 10, max: 90 } : languageTest.exam === 'Duolingo English Test' ? { min: 10, max: 160 } : null, 'lang_score', newErrors);
    }

    // Validate Additional Tests
    additionalTests.forEach((t, idx) => {
      if (!t.exam) {
        newErrors[`add_${t.id}_exam`] = `Please select test type for Test #${idx + 1}`;
      } else {
        if (t.exam === 'Other' && !t.customTestName.trim()) {
          newErrors[`add_${t.id}_customTestName`] = 'Please enter the test name';
        }
        if (!String(t.score ?? '').trim()) {
          newErrors[`add_${t.id}_score`] = 'Overall score / total score is required';
        }
        const config = TEST_CONFIG[t.exam];
        if (config) {
          validateRange(t.score, config.total, `add_${t.id}_score`, newErrors);
          config.fields.forEach((field) => validateRange(t[field.key], field, `add_${t.id}_${field.key}`, newErrors, true));
        }
        if (!t.testDate) {
          newErrors[`add_${t.id}_testDate`] = 'Test date is required';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateRange = (value, range, key, target, optional = false) => {
    if (!range || !String(value ?? '').trim()) return;
    const number = Number(value);
    if (!Number.isFinite(number) || number < range.min || number > range.max || (range.step && Math.abs((number - range.min) / range.step - Math.round((number - range.min) / range.step)) > 1e-8)) {
      target[key] = `Enter a score from ${range.min} to ${range.max}${range.step ? ` in ${range.step} steps` : ''}`;
    }
  };

  // Flatten tests array for DB compatibility
  const buildFlatTestsArray = () => {
    if (hasNotTaken) return [];

    const tests = [];
    if (hasLanguageSection && languageTest.exam) {
      tests.push({
        id: 'lang_test',
        category: 'language',
        exam: languageTest.exam === 'Other' ? (languageTest.customTestName || 'Other Language Test') : languageTest.exam,
        score: String(languageTest.score || ''),
        testDate: languageTest.testDate || '',
        listeningScore: String(languageTest.listeningScore || ''),
        readingScore: String(languageTest.readingScore || ''),
        writingScore: String(languageTest.writingScore || ''),
        speakingScore: String(languageTest.speakingScore || ''),
        literacyScore: String(languageTest.literacyScore || ''),
        comprehensionScore: String(languageTest.comprehensionScore || ''),
        conversationScore: String(languageTest.conversationScore || ''),
        productionScore: String(languageTest.productionScore || ''),
        reportFile: languageTest.reportFile || null
      });
    }

    additionalTests.forEach((t) => {
      if (!t.exam) return;
      tests.push({
        id: t.id,
        category: 'additional',
        exam: t.exam === 'Other' ? (t.customTestName || 'Other Standardized Test') : t.exam,
        score: String(t.score || ''),
        testDate: t.testDate || '',
        verbalScore: String(t.verbalScore || ''),
        quantitativeScore: String(t.quantitativeScore || ''),
        analyticalWritingScore: String(t.analyticalWritingScore || ''),
        dataInsightsScore: String(t.dataInsightsScore || ''),
        readingWritingScore: String(t.readingWritingScore || ''),
        readingScore: String(t.readingScore || ''),
        mathScore: String(t.mathScore || ''), englishScore: String(t.englishScore || ''), scienceScore: String(t.scienceScore || ''),
        literacyScore: String(t.literacyScore || ''), comprehensionScore: String(t.comprehensionScore || ''), conversationScore: String(t.conversationScore || ''), productionScore: String(t.productionScore || ''),
        physicsScore: String(t.physicsScore || ''), chemistryScore: String(t.chemistryScore || ''), biologyScore: String(t.biologyScore || ''),
        decisionMakingScore: String(t.decisionMakingScore || ''), abstractReasoningScore: String(t.abstractReasoningScore || ''), situationalJudgementBand: String(t.situationalJudgementBand || ''),
        chemicalPhysicalScore: String(t.chemicalPhysicalScore || ''),
        carsScore: String(t.carsScore || ''),
        biologicalBiochemicalScore: String(t.biologicalBiochemicalScore || ''),
        psychologicalSocialScore: String(t.psychologicalSocialScore || ''),
        reportFile: t.reportFile || null
      });
    });

    return tests;
  };

  // Save Draft
  const handleSaveDraftLocal = async () => {
    if (isLocked) return;
    try {
      setIsDraftSaving(true);
      setGlobalError('');

      const testsPayload = {
        hasNotTaken,
        languageTest: hasLanguageSection ? languageTest : getEmptyLanguageTest(),
        additionalTests,
        tests: buildFlatTestsArray()
      };

      await saveCountrySelection();
      if (onUpdate) onUpdate('testScores', testsPayload);
      if (onSaveDraft) {
        await onSaveDraft();
      } else {
        await axiosInstance.post('/api/enrollment/save-draft', {
          currentStep: 3,
          testScores: testsPayload
        });
      }

      setToastMsg('Draft saved successfully!');
      setTimeout(() => setToastMsg(''), 4000);
    } catch (err) {
      console.error('Error saving test scores draft:', err);
      setGlobalError('Failed to save draft. Please try again.');
    } finally {
      setIsDraftSaving(false);
    }
  };

  // Submit and Next
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked) {
      if (onNext) onNext();
      return;
    }

    setGlobalError('');
    if (!validateAll()) {
      setGlobalError('Please resolve the highlighted validation errors before continuing.');
      return;
    }

    // If neither waived nor any test entered, give friendly advice
    if (!hasNotTaken && (!hasLanguageSection || !languageTest.exam) && additionalTests.length === 0) {
      setGlobalError(normalizedLevel === 'medical'
        ? 'Please add a medical admissions test score, or check "I haven\'t taken any standardized test yet / Not required".'
        : 'Please select a Language Test, add an Additional Test score, or check "I haven\'t taken any standardized test yet / Not required".');
      return;
    }

    try {
      setIsSaving(true);
      await saveCountrySelection();
      const flatTests = buildFlatTestsArray();
      const payload = {
        hasNotTaken,
        languageTest: hasLanguageSection ? languageTest : getEmptyLanguageTest(),
        additionalTests,
        tests: flatTests,
        status: 'Completed'
      };

      // Persist to test scores endpoint
      const saveResponse = await axiosInstance.post('/api/enrollment/test-scores', {
        hasNotTaken,
        tests: flatTests,
        languageTest: hasLanguageSection ? languageTest : getEmptyLanguageTest(),
        additionalTests
      });

      if (onUpdate) {
        onUpdate('testScores', {
          ...payload,
          ...(saveResponse.data?.data || {})
        });
      }

      if (onNext) {
        onNext();
      }
    } catch (err) {
      console.error('Error saving test scores:', err);
      setGlobalError(err.response?.data?.message || 'Unable to save test scores. Please try again before continuing.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="test-score-section test-score-page">
      <ApplicationConsistency scope="test" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h2 className="test-score-title">Test Scores</h2>
          <p className="test-score-subtitle">
            {normalizedLevel === 'medical'
              ? 'Provide your medical admissions test scores, such as MCAT, NEET, or UCAT. Upload official score reports for admission review.'
              : 'Provide your standardized language and aptitude test scores. Upload official score reports for admission review.'}
          </p>
        </div>

      </div>


      {globalError && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem'
        }}>
          <FaExclamationCircle style={{ color: '#dc2626', fontSize: '1.1rem' }} />
          <span>{globalError}</span>
        </div>
      )}

      {/* Standardized test waiver / opt out checkbox */}
      <div className="test-score-opt-out">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={hasNotTaken}
            onChange={(e) => setHasNotTaken(e.target.checked)}
            disabled={isLocked}
          />
          <span>I haven't taken any standardized test yet / Not required for my program</span>
        </label>
        {hasNotTaken && (
          <p style={{ margin: '8px 0 0 28px', color: '#64748b', fontSize: '0.85rem' }}>
            Standardized test score requirements will be waived. You can proceed directly to the Review &amp; Submit step.
          </p>
        )}
      </div>

      <section className="test-score-country-selection" aria-labelledby="test-score-country-heading">
        <h3 id="test-score-country-heading">Study destination countries *</h3>
        <p>Select up to 5 countries you are interested in. Your counselor will use these preferences to choose suitable universities.</p>
        {countriesLoading ? <p>Loading countries…</p> : availableCountries.length === 0 ? (
          <p role="status">No countries are available for this program type yet.</p>
        ) : null}
        <div className="test-score-country-count">{selectedCountries.length}/5 selected</div>
        <div className="test-score-country-tags">
          {selectedCountries.map((country) => (
            <span className="test-score-country-tag" key={country}>
              {country}
              {!isLocked && <button type="button" onClick={() => {
                const nextCountries = selectedCountries.filter((item) => item !== country);
                setSelectedCountries(nextCountries);
                onUpdate?.('programSelection', {
                  ...programSelection,
                  programType: programSelection.programType || enrollmentProgramType,
                  selectedCountries: nextCountries,
                  countryName: nextCountries[nextCountries.length - 1] || '',
                });
              }} aria-label={`Remove ${country}`}>&times;</button>}
            </span>
          ))}
        </div>
        {!isLocked && selectedCountries.length < 5 && availableCountries.length > 0 && (
          <div className="test-score-country-dropdown" ref={countryDropdownRef}>
            <button type="button" className="test-score-country-trigger" onClick={() => setCountryDropdownOpen((open) => !open)}>
              {countriesLoading ? 'Loading countries…' : '+ Add a country'}
              <span aria-hidden="true">▾</span>
            </button>
            {countryDropdownOpen && (
              <div className="test-score-country-menu">
                <input
                  ref={countrySearchInputRef}
                  type="search"
                  value={countrySearch}
                  onChange={(event) => setCountrySearch(event.target.value)}
                  placeholder="Search countries…"
                  aria-label="Search countries"
                />
                <div className="test-score-country-list">
                  {availableCountries
                    .filter((country) => !selectedCountries.includes(country) && country.toLowerCase().includes(countrySearch.toLowerCase()))
                    .map((country) => (
                      <button type="button" key={country} onClick={() => updateSelectedCountries(country)}>{country}</button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {!hasNotTaken && (
        <form onSubmit={handleSubmit}>
          {/* SECTION 1: LANGUAGE PROFICIENCY TEST (not used for medical applications) */}
          {hasLanguageSection && (
          <div className="test-score-card" style={{ marginBottom: '28px', borderLeft: '4px solid #0891b2' }}>
            <div className="test-score-card-header">
              <div>
                <h3 style={{ fontSize: '1.15rem', color: '#0e7490' }}>1. English Language Proficiency Test</h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  Select the English proficiency test you appeared for (IELTS, TOEFL, PTE, Duolingo, Cambridge, or Other).
                </p>
              </div>
              {languageTest.exam && !isLocked && (
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => setLanguageTest(getEmptyLanguageTest())}
                >
                  Clear Test
                </button>
              )}
            </div>

            <div className="test-score-grid">
              <div className="test-score-field">
                <label>Language Test *</label>
                <TestScoreSelect
                  value={languageTest.exam}
                  onChange={handleLanguageExamSelect}
                  disabled={isLocked}
                  invalid={Boolean(errors.lang_exam)}
                  options={LANGUAGE_TEST_OPTIONS}
                  placeholder="-- Select Language Test --"
                  label="Language Test"
                />
                {errors.lang_exam && <span className="field-error-text">{errors.lang_exam}</span>}
              </div>

              {languageTest.exam === 'Other' && (
                <div className="test-score-field">
                  <label>Test Name *</label>
                  <input
                    type="text"
                    className={`test-score-input ${errors.lang_customTestName ? 'is-invalid' : ''}`}
                    placeholder="e.g. Oxford ELLT, Trinity ISE"
                    value={languageTest.customTestName}
                    onChange={(e) => handleLanguageFieldChange('customTestName', e.target.value)}
                    disabled={isLocked}
                  />
                  {errors.lang_customTestName && <span className="field-error-text">{errors.lang_customTestName}</span>}
                </div>
              )}

              {languageTest.exam && (
                <div className="test-score-field">
                  <label>Test Date *</label>
                  <TestScoreDatePicker
                    value={languageTest.testDate}
                    max={todayLocal}
                    onChange={(value) => handleLanguageFieldChange('testDate', value)}
                    disabled={isLocked}
                    invalid={Boolean(errors.lang_testDate)}
                    label="Language test date"
                  />
                  {errors.lang_testDate && <span className="field-error-text">{errors.lang_testDate}</span>}
                </div>
              )}
            </div>

            {/* Dynamic Score Fields based on Selected Language Test */}
            {languageTest.exam === 'IELTS' && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ fontSize: '0.92rem', color: '#334155', marginBottom: '12px', fontWeight: '600' }}>
                  IELTS Band Scores (0 – 9)
                </h4>
                <div className="test-score-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  <div className="test-score-field">
                    <label>Listening Score</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="9"
                      className="test-score-input"
                      placeholder="e.g. 7.5"
                      value={languageTest.listeningScore}
                      onChange={(e) => handleLanguageFieldChange('listeningScore', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="test-score-field">
                    <label>Reading Score</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="9"
                      className="test-score-input"
                      placeholder="e.g. 7.0"
                      value={languageTest.readingScore}
                      onChange={(e) => handleLanguageFieldChange('readingScore', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="test-score-field">
                    <label>Writing Score</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="9"
                      className="test-score-input"
                      placeholder="e.g. 6.5"
                      value={languageTest.writingScore}
                      onChange={(e) => handleLanguageFieldChange('writingScore', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="test-score-field">
                    <label>Speaking Score</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="9"
                      className="test-score-input"
                      placeholder="e.g. 8.0"
                      value={languageTest.speakingScore}
                      onChange={(e) => handleLanguageFieldChange('speakingScore', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="test-score-field">
                    <label>Overall Band Score *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="9"
                      className={`test-score-input ${errors.lang_score ? 'is-invalid' : ''}`}
                      placeholder="e.g. 7.5"
                      value={languageTest.score}
                      onChange={(e) => handleLanguageFieldChange('score', e.target.value)}
                      disabled={isLocked}
                    />
                    {errors.lang_score && <span className="field-error-text">{errors.lang_score}</span>}
                  </div>
                </div>
              </div>
            )}

            {languageTest.exam === 'TOEFL' && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ fontSize: '0.92rem', color: '#334155', marginBottom: '12px', fontWeight: '600' }}>
                  TOEFL iBT Section Scores (0 – 30)
                </h4>
                <div className="test-score-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  <div className="test-score-field">
                    <label>Reading (0-30)</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      className="test-score-input"
                      placeholder="e.g. 26"
                      value={languageTest.readingScore}
                      onChange={(e) => handleLanguageFieldChange('readingScore', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="test-score-field">
                    <label>Listening (0-30)</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      className="test-score-input"
                      placeholder="e.g. 27"
                      value={languageTest.listeningScore}
                      onChange={(e) => handleLanguageFieldChange('listeningScore', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="test-score-field">
                    <label>Speaking (0-30)</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      className="test-score-input"
                      placeholder="e.g. 24"
                      value={languageTest.speakingScore}
                      onChange={(e) => handleLanguageFieldChange('speakingScore', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="test-score-field">
                    <label>Writing (0-30)</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      className="test-score-input"
                      placeholder="e.g. 25"
                      value={languageTest.writingScore}
                      onChange={(e) => handleLanguageFieldChange('writingScore', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="test-score-field">
                    <label>Total Score (0-120) *</label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      className={`test-score-input ${errors.lang_score ? 'is-invalid' : ''}`}
                      placeholder="e.g. 102"
                      value={languageTest.score}
                      onChange={(e) => handleLanguageFieldChange('score', e.target.value)}
                      disabled={isLocked}
                    />
                    {errors.lang_score && <span className="field-error-text">{errors.lang_score}</span>}
                  </div>
                </div>
              </div>
            )}

            {languageTest.exam === 'PTE' && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ fontSize: '0.92rem', color: '#334155', marginBottom: '12px', fontWeight: '600' }}>
                  PTE Academic Scores (10 – 90)
                </h4>
                <div className="test-score-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  <div className="test-score-field">
                    <label>Listening (10-90)</label>
                    <input
                      type="number"
                      min="10"
                      max="90"
                      className="test-score-input"
                      placeholder="e.g. 68"
                      value={languageTest.listeningScore}
                      onChange={(e) => handleLanguageFieldChange('listeningScore', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="test-score-field">
                    <label>Reading (10-90)</label>
                    <input
                      type="number"
                      min="10"
                      max="90"
                      className="test-score-input"
                      placeholder="e.g. 70"
                      value={languageTest.readingScore}
                      onChange={(e) => handleLanguageFieldChange('readingScore', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="test-score-field">
                    <label>Speaking (10-90)</label>
                    <input
                      type="number"
                      min="10"
                      max="90"
                      className="test-score-input"
                      placeholder="e.g. 72"
                      value={languageTest.speakingScore}
                      onChange={(e) => handleLanguageFieldChange('speakingScore', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="test-score-field">
                    <label>Writing (10-90)</label>
                    <input
                      type="number"
                      min="10"
                      max="90"
                      className="test-score-input"
                      placeholder="e.g. 69"
                      value={languageTest.writingScore}
                      onChange={(e) => handleLanguageFieldChange('writingScore', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="test-score-field">
                    <label>Overall Score (10-90) *</label>
                    <input
                      type="number"
                      min="10"
                      max="90"
                      className={`test-score-input ${errors.lang_score ? 'is-invalid' : ''}`}
                      placeholder="e.g. 70"
                      value={languageTest.score}
                      onChange={(e) => handleLanguageFieldChange('score', e.target.value)}
                      disabled={isLocked}
                    />
                    {errors.lang_score && <span className="field-error-text">{errors.lang_score}</span>}
                  </div>
                </div>
              </div>
            )}

            {languageTest.exam === 'Duolingo English Test' && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ fontSize: '0.92rem', color: '#334155', marginBottom: '12px', fontWeight: '600' }}>
                  Duolingo Sub-Scores (10 – 160)
                </h4>
                <div className="test-score-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  <div className="test-score-field">
                    <label>Literacy</label>
                    <input
                      type="number"
                      min="10"
                      max="160"
                      className="test-score-input"
                      placeholder="e.g. 125"
                      value={languageTest.literacyScore}
                      onChange={(e) => handleLanguageFieldChange('literacyScore', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="test-score-field">
                    <label>Comprehension</label>
                    <input
                      type="number"
                      min="10"
                      max="160"
                      className="test-score-input"
                      placeholder="e.g. 130"
                      value={languageTest.comprehensionScore}
                      onChange={(e) => handleLanguageFieldChange('comprehensionScore', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="test-score-field">
                    <label>Conversation</label>
                    <input
                      type="number"
                      min="10"
                      max="160"
                      className="test-score-input"
                      placeholder="e.g. 120"
                      value={languageTest.conversationScore}
                      onChange={(e) => handleLanguageFieldChange('conversationScore', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="test-score-field">
                    <label>Production</label>
                    <input
                      type="number"
                      min="10"
                      max="160"
                      className="test-score-input"
                      placeholder="e.g. 115"
                      value={languageTest.productionScore}
                      onChange={(e) => handleLanguageFieldChange('productionScore', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="test-score-field">
                    <label>Overall Score (10-160) *</label>
                    <input
                      type="number"
                      min="10"
                      max="160"
                      className={`test-score-input ${errors.lang_score ? 'is-invalid' : ''}`}
                      placeholder="e.g. 125"
                      value={languageTest.score}
                      onChange={(e) => handleLanguageFieldChange('score', e.target.value)}
                      disabled={isLocked}
                    />
                    {errors.lang_score && <span className="field-error-text">{errors.lang_score}</span>}
                  </div>
                </div>
              </div>
            )}

            {(languageTest.exam === 'Cambridge English' || languageTest.exam === 'Other') && (
              <div style={{ marginTop: '20px' }}>
                <div className="test-score-grid">
                  <div className="test-score-field">
                    <label>Overall Score *</label>
                    <input
                      type="text"
                      className={`test-score-input ${errors.lang_score ? 'is-invalid' : ''}`}
                      placeholder="e.g. 185"
                      value={languageTest.score}
                      onChange={(e) => handleLanguageFieldChange('score', e.target.value)}
                      disabled={isLocked}
                    />
                    {errors.lang_score && <span className="field-error-text">{errors.lang_score}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Score Report Upload for Language Test */}
            {languageTest.exam && (
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
             <FileUpload
  docId="score_report_language"
  uploadUrl="/api/enrollment/test-scores/upload"
  label={`${languageTest.exam} Score Report (PDF)`}
  hint="Upload official score report / certificate in PDF format (Max 10MB)"
  value={languageTest.reportFile}
  consistencyScope="test"
  consistencyValues={{
    exam: languageTest.exam,
    score: languageTest.score,
    scoreFields: {
      listeningScore: languageTest.listeningScore,
      readingScore: languageTest.readingScore,
      writingScore: languageTest.writingScore,
      speakingScore: languageTest.speakingScore,
      literacyScore: languageTest.literacyScore,
      comprehensionScore: languageTest.comprehensionScore,
      conversationScore: languageTest.conversationScore,
      productionScore: languageTest.productionScore,
    },
  }}
  onChange={(fileObj) => handleLanguageFieldChange('reportFile', fileObj)}
  disabled={isLocked}
  requirePdf={true}
  maxSizeMB={10}
/>
              </div>
            )}
          </div>
          )}

          {/* SECTION 2: ADDITIONAL STANDARDIZED TESTS */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  {normalizedLevel === 'medical' ? '1. Medical Admissions Tests' : '2. Additional Standardized Tests'}
                </h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  {normalizedLevel === 'bachelor' ? 'Bachelor’s applicants can add SAT, ACT, or Other test scores.' : normalizedLevel === 'master' ? 'Master’s applicants can add GRE, GMAT, LSAT, or Other test scores.' : normalizedLevel === 'medical' ? 'Medical applicants can add MCAT, NEET, UCAT, or Other test scores.' : 'Add GRE, GMAT, SAT, ACT, MCAT, LSAT, NEET, UCAT, or Other test scores.'}
                </p>
              </div>

              {!isLocked && (
                <button
                  type="button"
                  onClick={handleAddAdditionalTest}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: '#eff6ff',
                    border: '1.5px solid #bfdbfe',
                    borderRadius: '8px',
                    color: '#2563eb',
                    fontWeight: '600',
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  <FaPlus /> Add Test Score
                </button>
              )}
            </div>

            {additionalTests.length === 0 && (
              <div style={{
                background: '#f8fafc',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '10px',
                padding: '24px',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  No additional standardized tests added. Click <strong>"Add Test Score"</strong> below to choose {normalizedLevel === 'medical' ? 'MCAT, NEET, UCAT, or Other' : normalizedLevel === 'master' ? 'GRE, GMAT, LSAT, or Other' : normalizedLevel === 'bachelor' ? 'SAT, ACT, or Other' : 'a standardized test'}.
                </p>
              </div>
            )}

            {additionalTests.map((test, index) => {
              const testErrPrefix = `add_${test.id}`;

              return (
                <div key={test.id} className="test-score-card" style={{ marginBottom: '20px', borderLeft: '4px solid #6366f1' }}>
                  <div className="test-score-card-header">
                    <div>
                      <h3 style={{ fontSize: '1.05rem', color: '#4338ca' }}>
                        Test #{index + 1}: {test.exam || 'Select Test Type'} {test.exam && !additionalOptions.includes(test.exam) && <span style={{ fontSize: '0.72rem', color: '#92400e', background: '#fef3c7', padding: '3px 7px', borderRadius: '999px' }}>Unavailable for this program level</span>}
                      </h3>
                    </div>
                    {!isLocked && (
                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => handleRemoveAdditionalTest(test.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <FaTrashAlt /> Remove
                      </button>
                    )}
                  </div>

                  <div className="test-score-grid">
                    <div className="test-score-field">
                      <label>Test Type *</label>
                      <TestScoreSelect
                        value={test.exam}
                        onChange={(value) => handleAdditionalFieldChange(test.id, 'exam', value)}
                        disabled={isLocked}
                        invalid={Boolean(errors[`${testErrPrefix}_exam`])}
                        options={additionalOptions}
                        placeholder="-- Select Test --"
                        label={`Test type ${index + 1}`}
                      />
                      {errors[`${testErrPrefix}_exam`] && (
                        <span className="field-error-text">{errors[`${testErrPrefix}_exam`]}</span>
                      )}
                    </div>

                    {test.exam === 'Other' && (
                      <div className="test-score-field">
                        <label>Test Name *</label>
                        <input
                          type="text"
                          className={`test-score-input ${errors[`${testErrPrefix}_customTestName`] ? 'is-invalid' : ''}`}
                          placeholder="e.g. LSAT, UCAT"
                          value={test.customTestName}
                          onChange={(e) => handleAdditionalFieldChange(test.id, 'customTestName', e.target.value)}
                          disabled={isLocked}
                        />
                        {errors[`${testErrPrefix}_customTestName`] && (
                          <span className="field-error-text">{errors[`${testErrPrefix}_customTestName`]}</span>
                        )}
                      </div>
                    )}

                    <div className="test-score-field">
                      <label>Test Date *</label>
                      <TestScoreDatePicker
                        value={test.testDate}
                        max={todayLocal}
                        onChange={(value) => handleAdditionalFieldChange(test.id, 'testDate', value)}
                        disabled={isLocked}
                        invalid={Boolean(errors[`${testErrPrefix}_testDate`])}
                        label={`${test.exam || 'Additional'} test date`}
                      />
                      {errors[`${testErrPrefix}_testDate`] && (
                        <span className="field-error-text">{errors[`${testErrPrefix}_testDate`]}</span>
                      )}
                    </div>
                  </div>

                  {/* Section Scores per Exam */}
                  {test.exam === 'GRE' && (
                    <div style={{ marginTop: '18px' }}>
                      <h4 style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '10px', fontWeight: '600' }}>
                        GRE General Scores
                      </h4>
                      <div className="test-score-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
                        <div className="test-score-field">
                          <label>Verbal Reasoning (130-170)</label>
                          <input
                            type="number"
                            min="130"
                            max="170"
                            className="test-score-input"
                            placeholder="e.g. 158"
                            value={test.verbalScore}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'verbalScore', e.target.value)}
                            disabled={isLocked}
                          />
                        </div>
                        <div className="test-score-field">
                          <label>Quantitative (130-170)</label>
                          <input
                            type="number"
                            min="130"
                            max="170"
                            className="test-score-input"
                            placeholder="e.g. 164"
                            value={test.quantitativeScore}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'quantitativeScore', e.target.value)}
                            disabled={isLocked}
                          />
                        </div>
                        <div className="test-score-field">
                          <label>Analytical Writing (0-6.0)</label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="6"
                            className="test-score-input"
                            placeholder="e.g. 4.5"
                            value={test.analyticalWritingScore}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'analyticalWritingScore', e.target.value)}
                            disabled={isLocked}
                          />
                        </div>
                        <div className="test-score-field">
                          <label>Total Score (260-340) *</label>
                          <input
                            type="number"
                            min="260"
                            max="340"
                            className={`test-score-input ${errors[`${testErrPrefix}_score`] ? 'is-invalid' : ''}`}
                            placeholder="e.g. 322"
                            value={test.score}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'score', e.target.value)}
                            disabled={isLocked}
                          />
                          {errors[`${testErrPrefix}_score`] && (
                            <span className="field-error-text">{errors[`${testErrPrefix}_score`]}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {test.exam === 'GMAT' && (
                    <div style={{ marginTop: '18px' }}>
                      <h4 style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '10px', fontWeight: '600' }}>
                        GMAT Focus Edition Section Scores
                      </h4>
                      <div className="test-score-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
                        <div className="test-score-field">
                          <label>Quantitative (60-90)</label>
                          <input
                            type="number"
                            min="60"
                            max="90"
                            className="test-score-input"
                            placeholder="e.g. 84"
                            value={test.quantitativeScore}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'quantitativeScore', e.target.value)}
                            disabled={isLocked}
                          />
                        </div>
                        <div className="test-score-field">
                          <label>Verbal (60-90)</label>
                          <input
                            type="number"
                            min="60"
                            max="90"
                            className="test-score-input"
                            placeholder="e.g. 82"
                            value={test.verbalScore}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'verbalScore', e.target.value)}
                            disabled={isLocked}
                          />
                        </div>
                        <div className="test-score-field">
                          <label>Data Insights (60-90)</label>
                          <input
                            type="number"
                            min="60"
                            max="90"
                            className="test-score-input"
                            placeholder="e.g. 80"
                            value={test.dataInsightsScore}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'dataInsightsScore', e.target.value)}
                            disabled={isLocked}
                          />
                        </div>
                        <div className="test-score-field">
                          <label>Total Score (205-805) *</label>
                          <input
                            type="number"
                            min="205"
                            max="805"
                            className={`test-score-input ${errors[`${testErrPrefix}_score`] ? 'is-invalid' : ''}`}
                            placeholder="e.g. 665"
                            value={test.score}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'score', e.target.value)}
                            disabled={isLocked}
                          />
                          {errors[`${testErrPrefix}_score`] && (
                            <span className="field-error-text">{errors[`${testErrPrefix}_score`]}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {test.exam === 'SAT' && (
                    <div style={{ marginTop: '18px' }}>
                      <h4 style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '10px', fontWeight: '600' }}>
                        SAT Section Scores
                      </h4>
                      <div className="test-score-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                        <div className="test-score-field">
                          <label>Reading / Writing (200-800)</label>
                          <input
                            type="number"
                            min="200"
                            max="800"
                            className="test-score-input"
                            placeholder="e.g. 720"
                            value={test.readingWritingScore}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'readingWritingScore', e.target.value)}
                            disabled={isLocked}
                          />
                        </div>
                        <div className="test-score-field">
                          <label>Math (200-800)</label>
                          <input
                            type="number"
                            min="200"
                            max="800"
                            className="test-score-input"
                            placeholder="e.g. 760"
                            value={test.mathScore}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'mathScore', e.target.value)}
                            disabled={isLocked}
                          />
                        </div>
                        <div className="test-score-field">
                          <label>Total Score (400-1600) *</label>
                          <input
                            type="number"
                            min="400"
                            max="1600"
                            className={`test-score-input ${errors[`${testErrPrefix}_score`] ? 'is-invalid' : ''}`}
                            placeholder="e.g. 1480"
                            value={test.score}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'score', e.target.value)}
                            disabled={isLocked}
                          />
                          {errors[`${testErrPrefix}_score`] && (
                            <span className="field-error-text">{errors[`${testErrPrefix}_score`]}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {test.exam === 'ACT' && (
                    <div style={{ marginTop: '18px' }}>
                      <h4 style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '10px', fontWeight: '600' }}>
                        ACT Section Scores (1 – 36)
                      </h4>
                      <div className="test-score-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                        <div className="test-score-field">
                          <label>English</label>
                          <input
                            type="number"
                            min="1"
                            max="36"
                            className="test-score-input"
                            placeholder="e.g. 32"
                            value={test.englishScore}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'englishScore', e.target.value)}
                            disabled={isLocked}
                          />
                        </div>
                        <div className="test-score-field">
                          <label>Math</label>
                          <input
                            type="number"
                            min="1"
                            max="36"
                            className="test-score-input"
                            placeholder="e.g. 34"
                            value={test.mathScore}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'mathScore', e.target.value)}
                            disabled={isLocked}
                          />
                        </div>
                        <div className="test-score-field">
                          <label>Reading</label>
                          <input
                            type="number"
                            min="1"
                            max="36"
                            className="test-score-input"
                            placeholder="e.g. 33"
                            value={test.readingScore}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'readingScore', e.target.value)}
                            disabled={isLocked}
                          />
                        </div>
                        <div className="test-score-field">
                          <label>Science</label>
                          <input
                            type="number"
                            min="1"
                            max="36"
                            className="test-score-input"
                            placeholder="e.g. 31"
                            value={test.scienceScore}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'scienceScore', e.target.value)}
                            disabled={isLocked}
                          />
                        </div>
                        <div className="test-score-field">
                          <label>Composite Score *</label>
                          <input
                            type="number"
                            min="1"
                            max="36"
                            className={`test-score-input ${errors[`${testErrPrefix}_score`] ? 'is-invalid' : ''}`}
                            placeholder="e.g. 33"
                            value={test.score}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'score', e.target.value)}
                            disabled={isLocked}
                          />
                          {errors[`${testErrPrefix}_score`] && (
                            <span className="field-error-text">{errors[`${testErrPrefix}_score`]}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {test.exam === 'MCAT' && (
                    <div style={{ marginTop: '18px' }}>
                      <h4 style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '10px', fontWeight: '600' }}>
                        MCAT Section Scores (118 – 132)
                      </h4>
                      <div className="test-score-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                        <div className="test-score-field">
                          <label>Chem &amp; Phys (118-132)</label>
                          <input
                            type="number"
                            min="118"
                            max="132"
                            className="test-score-input"
                            placeholder="e.g. 128"
                            value={test.chemicalPhysicalScore}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'chemicalPhysicalScore', e.target.value)}
                            disabled={isLocked}
                          />
                        </div>
                        <div className="test-score-field">
                          <label>CARS (118-132)</label>
                          <input
                            type="number"
                            min="118"
                            max="132"
                            className="test-score-input"
                            placeholder="e.g. 127"
                            value={test.carsScore}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'carsScore', e.target.value)}
                            disabled={isLocked}
                          />
                        </div>
                        <div className="test-score-field">
                          <label>Bio &amp; Biochem (118-132)</label>
                          <input
                            type="number"
                            min="118"
                            max="132"
                            className="test-score-input"
                            placeholder="e.g. 129"
                            value={test.biologicalBiochemicalScore}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'biologicalBiochemicalScore', e.target.value)}
                            disabled={isLocked}
                          />
                        </div>
                        <div className="test-score-field">
                          <label>Psych &amp; Social (118-132)</label>
                          <input
                            type="number"
                            min="118"
                            max="132"
                            className="test-score-input"
                            placeholder="e.g. 128"
                            value={test.psychologicalSocialScore}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'psychologicalSocialScore', e.target.value)}
                            disabled={isLocked}
                          />
                        </div>
                        <div className="test-score-field">
                          <label>Total Score (472-528) *</label>
                          <input
                            type="number"
                            min="472"
                            max="528"
                            className={`test-score-input ${errors[`${testErrPrefix}_score`] ? 'is-invalid' : ''}`}
                            placeholder="e.g. 512"
                            value={test.score}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'score', e.target.value)}
                            disabled={isLocked}
                          />
                          {errors[`${testErrPrefix}_score`] && (
                            <span className="field-error-text">{errors[`${testErrPrefix}_score`]}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {['LSAT', 'NEET', 'UCAT'].includes(test.exam) && TEST_CONFIG[test.exam] && (
                    <div style={{ marginTop: '18px' }}>
                      <h4 style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '10px', fontWeight: '600' }}>{TEST_CONFIG[test.exam].title}</h4>
                      <div className="test-score-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                        {TEST_CONFIG[test.exam].fields.map((field) => (
                          <div className="test-score-field" key={field.key}>
                            <label>{field.label}</label>
                            <input type="number" min={field.min} max={field.max} step={field.step || 1} className={`test-score-input ${errors[`${testErrPrefix}_${field.key}`] ? 'is-invalid' : ''}`} placeholder={field.placeholder} value={test[field.key] || ''} onChange={(e) => handleAdditionalFieldChange(test.id, field.key, e.target.value)} disabled={isLocked} />
                            {errors[`${testErrPrefix}_${field.key}`] && <span className="field-error-text">{errors[`${testErrPrefix}_${field.key}`]}</span>}
                          </div>
                        ))}
                        <div className="test-score-field">
                          <label>{TEST_CONFIG[test.exam].total.label}</label>
                          <input type="number" min={TEST_CONFIG[test.exam].total.min} max={TEST_CONFIG[test.exam].total.max} className={`test-score-input ${errors[`${testErrPrefix}_score`] ? 'is-invalid' : ''}`} placeholder={TEST_CONFIG[test.exam].total.placeholder} value={test.score} onChange={(e) => handleAdditionalFieldChange(test.id, 'score', e.target.value)} disabled={isLocked} />
                          {errors[`${testErrPrefix}_score`] && <span className="field-error-text">{errors[`${testErrPrefix}_score`]}</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  {test.exam === 'Other' && (
                    <div style={{ marginTop: '18px' }}>
                      <div className="test-score-grid">
                        <div className="test-score-field">
                          <label>Score *</label>
                          <input
                            type="text"
                            className={`test-score-input ${errors[`${testErrPrefix}_score`] ? 'is-invalid' : ''}`}
                            placeholder="e.g. 85%"
                            value={test.score}
                            onChange={(e) => handleAdditionalFieldChange(test.id, 'score', e.target.value)}
                            disabled={isLocked}
                          />
                          {errors[`${testErrPrefix}_score`] && (
                            <span className="field-error-text">{errors[`${testErrPrefix}_score`]}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Score Report Upload */}
                  {test.exam && (
                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                     <FileUpload
  docId={`score_report_${test.id}`}
  uploadUrl="/api/enrollment/test-scores/upload"
  label={`${test.exam} Official Score Report (PDF)`}
  hint="Upload score report in PDF format (Max 10MB)"
  value={test.reportFile}
  consistencyScope="test"
  consistencyValues={{
    exam: test.exam,
    score: test.score,
    scoreFields: {
      verbalScore: test.verbalScore,
      quantitativeScore: test.quantitativeScore,
      analyticalWritingScore: test.analyticalWritingScore,
      dataInsightsScore: test.dataInsightsScore,
      readingWritingScore: test.readingWritingScore,
      mathScore: test.mathScore,
      englishScore: test.englishScore,
      readingScore: test.readingScore,
      scienceScore: test.scienceScore,
      chemicalPhysicalScore: test.chemicalPhysicalScore,
      carsScore: test.carsScore,
      biologicalBiochemicalScore: test.biologicalBiochemicalScore,
      psychologicalSocialScore: test.psychologicalSocialScore,
      physicsScore: test.physicsScore,
      chemistryScore: test.chemistryScore,
      biologyScore: test.biologyScore,
      decisionMakingScore: test.decisionMakingScore,
      abstractReasoningScore: test.abstractReasoningScore,
      situationalJudgementBand: test.situationalJudgementBand,
    },
  }}
  onChange={(fileObj) => handleAdditionalFieldChange(test.id, 'reportFile', fileObj)}
  disabled={isLocked}
  requirePdf={true}
  maxSizeMB={10}
/>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="test-score-actions">
            {onBack && (
              <button
                type="button"
                className="btn-back"
                onClick={onBack}
                disabled={isSaving || isDraftSaving}
              >
                Back to Education
              </button>
            )}
            <button
              type="submit"
              className="btn-next"
              disabled={isSaving || isDraftSaving}
            >
              {isSaving ? 'Saving & Proceeding...' : 'Save & Continue to Review'}
            </button>
          </div>
        </form>
      )}

      {hasNotTaken && (
        <div className="test-score-actions" style={{ marginTop: '24px' }}>
          {onBack && (
            <button
              type="button"
              className="btn-back"
              onClick={onBack}
              disabled={isSaving || isDraftSaving}
            >
              Back to Education
            </button>
          )}
          <button
            type="button"
            className="btn-next"
            onClick={handleSubmit}
            disabled={isSaving || isDraftSaving}
          >
            Continue to Review &rarr;
          </button>
        </div>
      )}
    </div>
  );
};

export default TestScores;
