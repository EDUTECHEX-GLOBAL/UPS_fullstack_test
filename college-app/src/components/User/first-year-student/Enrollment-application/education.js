import React, { useState, useEffect, useRef } from 'react';
import { FaGraduationCap, FaArrowLeft, FaArrowRight, FaSave, FaUniversity, FaFileAlt, FaCheckCircle } from 'react-icons/fa';
import axiosInstance from '../../../../api/axiosInstance';
import ApplicationConsistency from './ApplicationConsistency';
import FileUpload from './FileUpload';
import './education.css';

const BOARD_OPTIONS = [
  'CBSE',
  'ICSE',
  'State Board',
  'IB (International Baccalaureate)',
  'Cambridge (CIE)',
  'National Open School (NIOS)',
  'Other'
];

const MASTER_DEGREE_OPTIONS = [
  "Bachelor's Degree",
  'B.Tech',
  'B.E.',
  'B.Sc',
  'B.Com',
  'B.A.',
  'Equivalent Undergraduate Degree'
];

const MEDICAL_EDUCATION_OPTIONS = [
  'High School / Secondary School',
  'Senior Secondary (10+2)',
  'A-Levels',
  'International Baccalaureate (IB)',
  'Pre-Medical',
  'Other'
];

const EducationSelect = ({ value, options, onChange, disabled, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [menuMaxHeight, setMenuMaxHeight] = useState(240);
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
      const menuHeight = Math.min(240, window.innerHeight * 0.4);
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldOpenUp = spaceBelow < menuHeight && rect.top > spaceBelow;
      const availableSpace = shouldOpenUp ? rect.top : spaceBelow;
      setOpenUp(shouldOpenUp);
      setMenuMaxHeight(Math.max(80, Math.min(menuHeight, availableSpace - 12)));
    }
    setIsOpen(open => !open);
  };

  return (
    <div className={`education-select-wrap ${isOpen ? 'open' : ''}`} ref={selectRef}>
      <button
        type="button"
        className="education-select-trigger"
        onClick={toggleMenu}
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{value}</span><span className="education-select-arrow" aria-hidden="true" />
      </button>
      {isOpen && (
        <div className={`education-select-menu ${openUp ? 'opens-up' : ''}`} role="listbox" aria-label={label} style={{ maxHeight: `${menuMaxHeight}px` }}>
          {options.map(option => (
            <button
              type="button"
              key={option}
              role="option"
              aria-selected={value === option}
              className={`education-select-option ${value === option ? 'active' : ''}`}
              onClick={() => { onChange(option); setIsOpen(false); }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};



const EducationDetails = ({
  data = {},
  onUpdate,
  onNext,
  onBack,
  onSaveDraft,
  isLocked = false
}) => {
  // Read applicantType and applyingFor from account data or stored user
  const storedUser = (() => {
    try {
      const u = localStorage.getItem('userData');
      return u && u !== 'undefined' ? JSON.parse(u) : {};
    } catch {
      return {};
    }
  })();

  const [applicantType, setApplicantType] = useState(
    storedUser.applicantType || data.applicantType || 'First-Year Student'
  );
  const [applyingFor, setApplyingFor] = useState(
    storedUser.applyingFor || data.applyingFor || "Bachelor's"
  );

  // Bachelor's Form State
  const [bachelorDetails, setBachelorDetails] = useState({
    highestEducation: '10+2 / Higher Secondary',
    schoolName: '',
    board: 'CBSE',
    country: '',
    state: '',
    startYear: '',
    completionYear: '',
    percentage: '',
    certificateDoc: null,
    ...(data.bachelorDetails || {})
  });

  // Transfer Student Form State
  const [transferDetails, setTransferDetails] = useState({
    currentCollege: '',
    currentProgram: '',
    major: '',
    startDate: '',
    endDate: '',
    creditsCompleted: '',
    gpa: '',
    transcriptDoc: null,
    ...(data.transferDetails || {})
  });

  // Master's Form State
  const [masterDetails, setMasterDetails] = useState({
    highestEducation: "Bachelor's Degree",
    degreeType: "Bachelor's Degree",
    university: '',
    courseMajor: '',
    country: '',
    state: '',
    startYear: '',
    graduationYear: '',
    gpa: '',
    transcriptDoc: null,
    degreeDoc: null,
    ...(data.masterDetails || {})
  });

  // Medical Form State
  const [medicalDetails, setMedicalDetails] = useState({

    schoolCollege: '',
    institution: '',
    course: 'Pre-Medical / Medicine',
    country: '',
    state: '',
    startYear: '',
    completionYear: '',
    percentageGpa: '',
    academicDoc: null,
    ...(data.medicalDetails || {})
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [draftAlert, setDraftAlert] = useState('');

  // Fetch education details and account program info on mount
  useEffect(() => {
    const fetchEdu = async () => {
      try {
        const [eduRes, accRes] = await Promise.allSettled([
          axiosInstance.get('/api/enrollment/education'),
          axiosInstance.get('/api/students/me')
        ]);

        if (accRes.status === 'fulfilled' && accRes.value.data?.account) {
          const acc = accRes.value.data.account;
          if (acc.applicantType) setApplicantType(acc.applicantType);
          if (acc.applyingFor) setApplyingFor(acc.applyingFor);
        }

        if (eduRes.status === 'fulfilled' && eduRes.value.data?.data) {
          const d = eduRes.value.data.data;
          const loadedNameErrors = {};
          if (d.applicantType) setApplicantType(d.applicantType);
          if (d.applyingFor) setApplyingFor(d.applyingFor);

          if (d.bachelorDetails) {
            const schoolName = sanitizeInstitutionName(d.bachelorDetails.schoolName);
            if (schoolName !== (d.bachelorDetails.schoolName || '')) loadedNameErrors['bachelor.schoolName'] = 'Please re-enter the school name using letters only.';
            setBachelorDetails(prev => ({ ...prev, ...d.bachelorDetails, schoolName }));
          }
          if (d.transferDetails) {
            const currentCollege = sanitizeInstitutionName(d.transferDetails.currentCollege);
            if (currentCollege !== (d.transferDetails.currentCollege || '')) loadedNameErrors['transfer.currentCollege'] = 'Please re-enter the college name using letters only.';
            setTransferDetails(prev => ({ ...prev, ...d.transferDetails, currentCollege }));
          }
          if (d.masterDetails) {
            const university = sanitizeInstitutionName(d.masterDetails.university);
            if (university !== (d.masterDetails.university || '')) loadedNameErrors['master.university'] = 'Please re-enter the institution name using letters only.';
            setMasterDetails(prev => ({ ...prev, ...d.masterDetails, university }));
          }
          if (d.medicalDetails) {
            const schoolCollege = sanitizeInstitutionName(d.medicalDetails.schoolCollege);
            const institution = sanitizeInstitutionName(d.medicalDetails.institution);
            if (schoolCollege !== (d.medicalDetails.schoolCollege || '')) loadedNameErrors['medical.schoolCollege'] = 'Please re-enter the school / college name using letters only.';
            if (institution !== (d.medicalDetails.institution || '')) loadedNameErrors['medical.institution'] = 'Please re-enter the institution name using letters only.';
            setMedicalDetails(prev => ({ ...prev, ...d.medicalDetails, schoolCollege, institution }));
          }
          if (Object.keys(loadedNameErrors).length) setErrors(prev => ({ ...prev, ...loadedNameErrors }));
        }
      } catch (err) {
        console.error('Error fetching education details:', err);
      }
    };

    fetchEdu();
  }, []);

  const sanitizeYear = (value) => String(value ?? '').replace(/\D/g, '').slice(0, 4);
  const sanitizeLocation = (value) => String(value ?? '').replace(/[^\p{L}\s.'-]/gu, '').slice(0, 80);
  const sanitizeScore = (value) => String(value ?? '').replace(/[^\d.%/\s]/g, '').slice(0, 24);
  const sanitizeCredits = (value) => String(value ?? '').replace(/[^\d.]/g, '').slice(0, 8);
  const sanitizeAcademicName = (value) => String(value ?? '').replace(/[^\p{L}\p{N}\s&.,'()/-]/gu, '').slice(0, 120);
  const sanitizeInstitutionName = (value) => String(value ?? '').replace(/[^\p{L}\s&.,'()/-]/gu, '').slice(0, 120);

  const sanitizeEducationValue = (field, value) => {
    if (['country', 'state'].includes(field)) return sanitizeLocation(value);
    if (['startYear', 'completionYear', 'graduationYear'].includes(field)) return sanitizeYear(value);
    if (['percentage', 'percentageGpa', 'gpa'].includes(field)) return sanitizeScore(value);
    if (field === 'creditsCompleted') return sanitizeCredits(value);
    if (['schoolName', 'currentCollege', 'university', 'schoolCollege', 'institution'].includes(field)) return sanitizeInstitutionName(value);
    if (['schoolName', 'currentCollege', 'currentProgram', 'major', 'university', 'courseMajor', 'schoolCollege', 'institution', 'course'].includes(field)) return sanitizeAcademicName(value);
    return value;
  };

  const handleBachelorChange = (field, rawVal) => {
    const val = sanitizeEducationValue(field, rawVal);
    setBachelorDetails(p => ({ ...p, [field]: val }));
    if (errors[`bachelor.${field}`]) {
      setErrors(p => ({ ...p, [`bachelor.${field}`]: '' }));
    }
  };

  const handleTransferChange = (field, rawVal) => {
    const val = sanitizeEducationValue(field, rawVal);
    setTransferDetails(p => ({ ...p, [field]: val }));
    if (errors[`transfer.${field}`]) {
      setErrors(p => ({ ...p, [`transfer.${field}`]: '' }));
    }
  };

  const handleMasterChange = (field, rawVal) => {
    const val = sanitizeEducationValue(field, rawVal);
    setMasterDetails(p => ({ ...p, [field]: val }));
    if (errors[`master.${field}`]) {
      setErrors(p => ({ ...p, [`master.${field}`]: '' }));
    }
  };

  const handleMedicalChange = (field, rawVal) => {
    const val = sanitizeEducationValue(field, rawVal);
    setMedicalDetails(p => ({ ...p, [field]: val }));
    if (errors[`medical.${field}`]) {
      setErrors(p => ({ ...p, [`medical.${field}`]: '' }));
    }
  };

  const validate = () => {
    const errs = {};
    const validAcademicName = (value) => /^[\p{L}][\p{L}\p{N}\s&.,'()/-]{1,119}$/u.test(String(value || '').trim()) &&
      (String(value).match(/\d/g) || []).length <= 2;
    const validInstitutionName = (value) => /^[\p{L}][\p{L}\s&.,'()/-]{1,119}$/u.test(String(value || '').trim());
    const validLocation = (value) => /^[\p{L}][\p{L}\s.'-]{1,79}$/u.test(String(value || '').trim());
    const validYear = (value) => {
      if (!String(value || '').trim()) return true;
      const year = Number(value);
      return /^\d{4}$/.test(String(value)) && year >= 1950 && year <= new Date().getFullYear() + 10;
    };
    const validScore = (value) => {
      const score = String(value || '').trim();
      if (!score) return false;
      const number = '(?:\\d{1,3})(?:\\.\\d{1,2})?';
      const single = new RegExp(`^${number}%?$`);
      const scaled = new RegExp(`^${number}\\s*\\/\\s*${number}$`);
      if (!single.test(score) && !scaled.test(score)) return false;
      const values = score.split('/').map(part => Number(part.replace('%', '').trim()));
      return values.every(n => Number.isFinite(n) && n >= 0) &&
        (score.includes('/') ? values[0] <= values[1] : values[0] <= 100);
    };
    const validateNames = (fields, prefix) => fields.forEach(([key, label, value, required = false]) => {
      if ((required && !String(value || '').trim())) errs[`${prefix}.${key}`] = `${label} is required`;
      else if (String(value || '').trim() && !( ['schoolName', 'currentCollege', 'university', 'schoolCollege', 'institution'].includes(key) ? validInstitutionName(value) : validAcademicName(value))) errs[`${prefix}.${key}`] = `Enter a valid ${label.toLowerCase()}`;
    });
    const validateLocations = (fields, prefix) => fields.forEach(([key, label, value, required = false]) => {
      if (required && !String(value || '').trim()) errs[`${prefix}.${key}`] = `${label} is required`;
      else if (String(value || '').trim() && !validLocation(value)) errs[`${prefix}.${key}`] = `Enter a valid ${label.toLowerCase()}`;
    });
    const validateYearPair = (start, end, prefix, endKey, endLabel) => {
      if (start && !validYear(start)) errs[`${prefix}.startYear`] = 'Enter a valid four-digit start year';
      if (end && !validYear(end)) errs[`${prefix}.${endKey}`] = 'Enter a valid four-digit year';
      if (validYear(start) && validYear(end) && start && end && Number(start) > Number(end)) {
        errs[`${prefix}.${endKey}`] = `${endLabel} must be on or after the start year`;
      }
    };

    if (applyingFor === "Bachelor's") {
      if (!bachelorDetails.schoolName?.trim()) errs['bachelor.schoolName'] = 'School name is required';
      if (!bachelorDetails.board?.trim()) errs['bachelor.board'] = 'Board of education is required';
      if (!bachelorDetails.country?.trim()) errs['bachelor.country'] = 'Country is required';
      if (!bachelorDetails.completionYear?.trim()) errs['bachelor.completionYear'] = 'Completion year is required';
      if (!bachelorDetails.percentage?.trim()) errs['bachelor.percentage'] = 'Percentage or CGPA is required';
      validateNames([['schoolName', 'School / institution name', bachelorDetails.schoolName, true]], 'bachelor');
      validateLocations([['country', 'Country', bachelorDetails.country, true], ['state', 'State / province', bachelorDetails.state]], 'bachelor');
      validateYearPair(bachelorDetails.startYear, bachelorDetails.completionYear, 'bachelor', 'completionYear', 'Completion year');
      if (bachelorDetails.percentage?.trim() && !validScore(bachelorDetails.percentage)) errs['bachelor.percentage'] = 'Enter a valid percentage or score (for example, 88.5% or 3.8 / 4.0)';

      if (applicantType === 'Transfer Student') {
        if (!transferDetails.currentCollege?.trim()) errs['transfer.currentCollege'] = 'College name is required';
        if (!transferDetails.major?.trim()) errs['transfer.major'] = 'Major is required';
        if (!transferDetails.creditsCompleted?.trim()) errs['transfer.creditsCompleted'] = 'Credits completed is required';
        validateNames([['currentCollege', 'College name', transferDetails.currentCollege, true], ['major', 'Major', transferDetails.major, true], ['currentProgram', 'Program / course', transferDetails.currentProgram]], 'transfer');
        if (transferDetails.creditsCompleted?.trim() && (!/^\d{1,3}(?:\.\d{1,2})?$/.test(transferDetails.creditsCompleted) || Number(transferDetails.creditsCompleted) <= 0 || Number(transferDetails.creditsCompleted) > 300)) errs['transfer.creditsCompleted'] = 'Enter credits as a number between 0 and 300';
        if (transferDetails.gpa?.trim() && !validScore(transferDetails.gpa)) errs['transfer.gpa'] = 'Enter a valid GPA or score';
        if (transferDetails.startDate && transferDetails.endDate && transferDetails.startDate > transferDetails.endDate) errs['transfer.endDate'] = 'End date must be on or after the start date';
      }
    } else if (applyingFor === "Master's") {
      if (!masterDetails.university?.trim()) errs['master.university'] = 'University / Institution name is required';
      if (!masterDetails.courseMajor?.trim()) errs['master.courseMajor'] = 'Major / Course is required';
      if (!masterDetails.country?.trim()) errs['master.country'] = 'Country is required';
      if (!masterDetails.graduationYear?.trim()) errs['master.graduationYear'] = 'Graduation year is required';
      if (!masterDetails.gpa?.trim()) errs['master.gpa'] = 'Undergraduate GPA / Percentage is required';
      validateNames([['university', 'University / institution name', masterDetails.university, true], ['courseMajor', 'Major / course', masterDetails.courseMajor, true]], 'master');
      validateLocations([['country', 'Country', masterDetails.country, true], ['state', 'State / province', masterDetails.state]], 'master');
      validateYearPair(masterDetails.startYear, masterDetails.graduationYear, 'master', 'graduationYear', 'Graduation year');
      if (masterDetails.gpa?.trim() && !validScore(masterDetails.gpa)) errs['master.gpa'] = 'Enter a valid GPA or percentage';

      if (applicantType === 'Transfer Student') {
        if (!transferDetails.currentCollege?.trim()) errs['transfer.currentCollege'] = 'Current institution is required';
        validateNames([['currentCollege', 'Current institution', transferDetails.currentCollege, true]], 'transfer');
      }
    } else if (applyingFor === 'Medical') {
      if (!medicalDetails.schoolCollege?.trim()) errs['medical.schoolCollege'] = 'School/College name is required';
      if (!medicalDetails.institution?.trim()) errs['medical.institution'] = 'Institution is required';
      if (!medicalDetails.country?.trim()) errs['medical.country'] = 'Country is required';
      if (!medicalDetails.completionYear?.trim()) errs['medical.completionYear'] = 'Completion year is required';
      if (!medicalDetails.percentageGpa?.trim()) errs['medical.percentageGpa'] = 'Score / Percentage is required';
      validateNames([['schoolCollege', 'School / college name', medicalDetails.schoolCollege, true], ['institution', 'Institution', medicalDetails.institution, true], ['course', 'Course / specialization', medicalDetails.course]], 'medical');
      validateLocations([['country', 'Country', medicalDetails.country, true], ['state', 'State / province', medicalDetails.state]], 'medical');
      validateYearPair(medicalDetails.startYear, medicalDetails.completionYear, 'medical', 'completionYear', 'Completion year');
      if (medicalDetails.percentageGpa?.trim() && !validScore(medicalDetails.percentageGpa)) errs['medical.percentageGpa'] = 'Enter a valid percentage or score';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = () => ({
    applicantType,
    applyingFor,
    bachelorDetails,
    transferDetails: applicantType === 'Transfer Student' ? transferDetails : undefined,
    masterDetails,
    medicalDetails
  });

  const handleSaveDraft = async () => {
    try {
      setIsDraftSaving(true);
      setDraftAlert('');
      const payload = buildPayload();
      if (onSaveDraft) {
        await onSaveDraft(2, { educationDetails: payload });
      } else {
        await axiosInstance.post('/api/enrollment/save-draft', {
          currentStep: 2,
          educationDetails: payload
        });
      }
      setDraftAlert('✓ Education Details draft saved successfully!');
      setTimeout(() => setDraftAlert(''), 4000);
    } catch (err) {
      console.error('Failed to save draft:', err);
      alert('Failed to save draft.');
    } finally {
      setIsDraftSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setIsSaving(true);
      const payload = buildPayload();
      const res = await axiosInstance.post('/api/enrollment/education', payload);
      if (res.data?.success) {
        if (onUpdate) onUpdate('educationDetails', payload);
        if (onNext) onNext();
      }
    } catch (err) {
      console.error('Error saving education details:', err);
      alert(err.response?.data?.message || 'Failed to save education details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="personal-section education-page">
      <ApplicationConsistency scope="education" />
      <div className="personal-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="personal-title">Step 2: Education Details</h2>
            <p className="personal-subtitle">
              Provide your academic history. Education fields are tailored to your degree level and student category.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ background: '#ecfeff', border: '1px solid #a5f3fc', color: '#0891b2', padding: '6px 12px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700' }}>
              {applicantType}
            </span>
            <span style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', padding: '6px 12px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700' }}>
              {applyingFor} Program
            </span>
          </div>
        </div>
      </div>

      {draftAlert && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: '500'
        }}>
          <FaCheckCircle style={{ color: '#059669' }} /> {draftAlert}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* ── 1. BACHELOR'S EDUCATION FIELDS ── */}
        {applyingFor === "Bachelor's" && (
          <div className="education-form-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <FaGraduationCap style={{ color: '#0891b2', fontSize: '1.2rem' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                Highest Education: 10+2 / Higher Secondary
              </h3>
            </div>

            <div className="education-grid">
              <div className="education-field">
                <label>Highest Education</label>
                <input
                  type="text"
                  value={bachelorDetails.highestEducation}
                  readOnly
                  disabled
                  className="education-input"
                  style={{ background: '#f8fafc', color: '#475569', cursor: 'not-allowed' }}
                />
              </div>

              <div className="education-field">
                <label>
                  School / Institution Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={bachelorDetails.schoolName}
                  onChange={(e) => handleBachelorChange('schoolName', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. St. Xavier High School"
                  className={`education-input ${errors['bachelor.schoolName'] ? 'error' : ''}`}
                />
                {errors['bachelor.schoolName'] && <span className="personal-error-text">{errors['bachelor.schoolName']}</span>}
              </div>

              <div className="education-field">
                <label>
                  Board of Education <span className="required">*</span>
                </label>
                <EducationSelect
                  value={bachelorDetails.board}
                  onChange={(value) => handleBachelorChange('board', value)}
                  disabled={isLocked}
                  options={BOARD_OPTIONS}
                  label="Board of Education"
                />
                {errors['bachelor.board'] && <span className="personal-error-text">{errors['bachelor.board']}</span>}
              </div>

              <div className="education-field">
                <label>
                  Country <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={bachelorDetails.country}
                  onChange={(e) => handleBachelorChange('country', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. India or United States"
                  className={`education-input ${errors['bachelor.country'] ? 'error' : ''}`}
                />
                {errors['bachelor.country'] && <span className="personal-error-text">{errors['bachelor.country']}</span>}
              </div>

              <div className="education-field">
                <label>State / Province</label>
                <input
                  type="text"
                  value={bachelorDetails.state}
                  onChange={(e) => handleBachelorChange('state', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. Delhi or California"
                  className={`education-input ${errors['bachelor.state'] ? 'error' : ''}`}
                />
                {errors['bachelor.state'] && <span className="personal-error-text">{errors['bachelor.state']}</span>}
              </div>

              <div className="education-field">
                <label>Start Year</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={bachelorDetails.startYear}
                  onChange={(e) => handleBachelorChange('startYear', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. 2022"
                  className={`education-input ${errors['bachelor.startYear'] ? 'error' : ''}`}
                />
                {errors['bachelor.startYear'] && <span className="personal-error-text">{errors['bachelor.startYear']}</span>}
              </div>

              <div className="education-field">
                <label>
                  Completion / Passing Year <span className="required">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={bachelorDetails.completionYear}
                  onChange={(e) => handleBachelorChange('completionYear', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. 2024"
                  className={`education-input ${errors['bachelor.completionYear'] ? 'error' : ''}`}
                />
                {errors['bachelor.completionYear'] && <span className="personal-error-text">{errors['bachelor.completionYear']}</span>}
              </div>

              <div className="education-field">
                <label>
                  Percentage / CGPA <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={bachelorDetails.percentage}
                  onChange={(e) => handleBachelorChange('percentage', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. 88.5% or 3.8 / 4.0"
                  className={`education-input ${errors['bachelor.percentage'] ? 'error' : ''}`}
                />
                {errors['bachelor.percentage'] && <span className="personal-error-text">{errors['bachelor.percentage']}</span>}
              </div>
            </div>

            {/* Education Certificate Upload */}
            <div style={{ marginTop: '20px' }}>
              <FileUpload
                docId="education_certificate"
                label="Upload 10+2 / High School Certificate or Marksheet (PDF)"
                hint="PDF only, max 10MB"
                accept="application/pdf"
                requirePdf={true}
                value={bachelorDetails.certificateDoc}
                disabled={isLocked}
                consistencyScope="education"
                consistencyValues={{ schoolName: bachelorDetails.schoolName, board: bachelorDetails.board, country: bachelorDetails.country, state: bachelorDetails.state, startYear: bachelorDetails.startYear, completionYear: bachelorDetails.completionYear, percentage: bachelorDetails.percentage }}
                onChange={(fileObj) => handleBachelorChange('certificateDoc', fileObj)}
              />
            </div>
          </div>
        )}

        {/* ── 2. TRANSFER STUDENT SPECIFIC DETAILS ── */}
        {applicantType === 'Transfer Student' && (
          <div className="education-form-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <FaUniversity style={{ color: '#2563eb', fontSize: '1.2rem' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                Transfer Student: Current / Previous College Information
              </h3>
            </div>

            <div className="education-grid">
              <div className="education-field">
                <label>
                  Current / Previous College Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={transferDetails.currentCollege}
                  onChange={(e) => handleTransferChange('currentCollege', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. City University of Seattle"
                  className={`education-input ${errors['transfer.currentCollege'] ? 'error' : ''}`}
                />
                {errors['transfer.currentCollege'] && <span className="personal-error-text">{errors['transfer.currentCollege']}</span>}
              </div>

              <div className="education-field">
                <label>Current Program / Course</label>
                <input
                  type="text"
                  value={transferDetails.currentProgram}
                  onChange={(e) => handleTransferChange('currentProgram', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. Associate of Science"
                  className="education-input"
                />
              </div>

              <div className="education-field">
                <label>
                  Major <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={transferDetails.major}
                  onChange={(e) => handleTransferChange('major', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. Computer Science"
                  className={`education-input ${errors['transfer.major'] ? 'error' : ''}`}
                />
                {errors['transfer.major'] && <span className="personal-error-text">{errors['transfer.major']}</span>}
              </div>

              <div className="education-field">
                <label>Start Date</label>
                <input
                  type="date"
                  value={transferDetails.startDate}
                  onChange={(e) => handleTransferChange('startDate', e.target.value)}
                  disabled={isLocked}
                  className="education-input"
                />
              </div>

              <div className="education-field">
                <label>End Date / Expected Completion</label>
                <input
                  type="date"
                  value={transferDetails.endDate}
                  onChange={(e) => handleTransferChange('endDate', e.target.value)}
                  disabled={isLocked}
                  className={`education-input ${errors['transfer.endDate'] ? 'error' : ''}`}
                />
                {errors['transfer.endDate'] && <span className="personal-error-text">{errors['transfer.endDate']}</span>}
              </div>

              <div className="education-field">
                <label>
                  Credits Completed <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={transferDetails.creditsCompleted}
                  onChange={(e) => handleTransferChange('creditsCompleted', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. 45"
                  className={`education-input ${errors['transfer.creditsCompleted'] ? 'error' : ''}`}
                />
                {errors['transfer.creditsCompleted'] && <span className="personal-error-text">{errors['transfer.creditsCompleted']}</span>}
              </div>

              <div className="education-field">
                <label>Cumulative GPA / CGPA</label>
                <input
                  type="text"
                  value={transferDetails.gpa}
                  onChange={(e) => handleTransferChange('gpa', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. 3.65 / 4.0"
                  className={`education-input ${errors['transfer.gpa'] ? 'error' : ''}`}
                />
                {errors['transfer.gpa'] && <span className="personal-error-text">{errors['transfer.gpa']}</span>}
              </div>
            </div>

            {/* College Transcript Upload */}
            <div style={{ marginTop: '20px' }}>
              <FileUpload
                docId="college_transcript"
                label="Upload College / Transfer Transcript (PDF)"
                hint="Official or unofficial college transcript (PDF, max 10MB)"
                accept="application/pdf"
                requirePdf={true}
                value={transferDetails.transcriptDoc}
                disabled={isLocked}
                consistencyScope="education"
                consistencyValues={{ schoolName: transferDetails.currentCollege, completionYear: transferDetails.endDate, gpa: transferDetails.gpa }}
                onChange={(fileObj) => handleTransferChange('transcriptDoc', fileObj)}
              />
            </div>
          </div>
        )}

        {/* ── 3. MASTER'S EDUCATION FIELDS ── */}
        {applyingFor === "Master's" && (
          <div className="education-form-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <FaGraduationCap style={{ color: '#0891b2', fontSize: '1.2rem' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                Undergraduate Degree Information
              </h3>
            </div>

            <div className="education-grid">
              <div className="education-field">
                <label>Highest Education / Degree Type</label>
                <EducationSelect
                  value={masterDetails.degreeType}
                  onChange={(value) => handleMasterChange('degreeType', value)}
                  disabled={isLocked}
                  options={MASTER_DEGREE_OPTIONS}
                  label="Highest Education / Degree Type"
                />
              </div>

              <div className="education-field">
                <label>
                  University / Institution Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={masterDetails.university}
                  onChange={(e) => handleMasterChange('university', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. University of California, Berkeley"
                  className={`education-input ${errors['master.university'] ? 'error' : ''}`}
                />
                {errors['master.university'] && <span className="personal-error-text">{errors['master.university']}</span>}
              </div>

              <div className="education-field">
                <label>
                  Course / Major <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={masterDetails.courseMajor}
                  onChange={(e) => handleMasterChange('courseMajor', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. Electrical Engineering &amp; Computer Science"
                  className={`education-input ${errors['master.courseMajor'] ? 'error' : ''}`}
                />
                {errors['master.courseMajor'] && <span className="personal-error-text">{errors['master.courseMajor']}</span>}
              </div>

              <div className="education-field">
                <label>
                  Country <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={masterDetails.country}
                  onChange={(e) => handleMasterChange('country', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. United States or India"
                  className={`education-input ${errors['master.country'] ? 'error' : ''}`}
                />
                {errors['master.country'] && <span className="personal-error-text">{errors['master.country']}</span>}
              </div>

              <div className="education-field">
                <label>State / Province</label>
                <input
                  type="text"
                  value={masterDetails.state}
                  onChange={(e) => handleMasterChange('state', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. California"
                  className={`education-input ${errors['master.state'] ? 'error' : ''}`}
                />
                {errors['master.state'] && <span className="personal-error-text">{errors['master.state']}</span>}
              </div>

              <div className="education-field">
                <label>Start Year</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={masterDetails.startYear}
                  onChange={(e) => handleMasterChange('startYear', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. 2020"
                  className={`education-input ${errors['master.startYear'] ? 'error' : ''}`}
                />
                {errors['master.startYear'] && <span className="personal-error-text">{errors['master.startYear']}</span>}
              </div>

              <div className="education-field">
                <label>
                  Graduation / Passing Year <span className="required">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={masterDetails.graduationYear}
                  onChange={(e) => handleMasterChange('graduationYear', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. 2024"
                  className={`education-input ${errors['master.graduationYear'] ? 'error' : ''}`}
                />
                {errors['master.graduationYear'] && <span className="personal-error-text">{errors['master.graduationYear']}</span>}
              </div>

              <div className="education-field">
                <label>
                  Undergraduate GPA / CGPA <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={masterDetails.gpa}
                  onChange={(e) => handleMasterChange('gpa', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. 3.75 / 4.0 or 82%"
                  className={`education-input ${errors['master.gpa'] ? 'error' : ''}`}
                />
                {errors['master.gpa'] && <span className="personal-error-text">{errors['master.gpa']}</span>}
              </div>
            </div>

            {/* Document Uploads for Master's */}
            <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px', minWidth: 0 }}>
              <FileUpload
                docId="ug_transcript"
                label="Upload Undergraduate Transcript (PDF)"
                hint="Consolidated / Semester-wise transcript (PDF, max 10MB)"
                accept="application/pdf"
                requirePdf={true}
                value={masterDetails.transcriptDoc}
                disabled={isLocked}
                consistencyScope="education"
                consistencyValues={{ schoolName: masterDetails.university, country: masterDetails.country, state: masterDetails.state, startYear: masterDetails.startYear, completionYear: masterDetails.graduationYear, gpa: masterDetails.gpa }}
                onChange={(fileObj) => handleMasterChange('transcriptDoc', fileObj)}
              />

              <FileUpload
                docId="ug_degree"
                label="Upload Degree Certificate (PDF)"
                hint="Degree completion certificate or provisional (PDF, max 10MB)"
                accept="application/pdf"
                requirePdf={true}
                value={masterDetails.degreeDoc}
                disabled={isLocked}
                consistencyScope="education"
                consistencyValues={{ schoolName: masterDetails.university, country: masterDetails.country, state: masterDetails.state, startYear: masterDetails.startYear, completionYear: masterDetails.graduationYear, gpa: masterDetails.gpa }}
                onChange={(fileObj) => handleMasterChange('degreeDoc', fileObj)}
              />
            </div>
          </div>
        )}

        {/* ── 4. MEDICAL EDUCATION FIELDS ── */}
        {applyingFor === 'Medical' && (
          <div className="education-form-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <FaFileAlt style={{ color: '#0891b2', fontSize: '1.2rem' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                Pre-Medical / Academic Foundation Details
              </h3>
            </div>

            <div className="education-grid">
              <div className="education-field">
                <label>Highest Qualification</label>
                <EducationSelect
                  value={medicalDetails.highestEducation}
                  onChange={(value) => handleMedicalChange('highestEducation', value)}
                  disabled={isLocked}
                  options={MEDICAL_EDUCATION_OPTIONS}
                  label="Highest Qualification"
                />
              </div>

              <div className="education-field">
                <label>
                  School / College Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={medicalDetails.schoolCollege}
                  onChange={(e) => handleMedicalChange('schoolCollege', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. National College of Pre-Med"
                  className={`education-input ${errors['medical.schoolCollege'] ? 'error' : ''}`}
                />
                {errors['medical.schoolCollege'] && <span className="personal-error-text">{errors['medical.schoolCollege']}</span>}
              </div>

              <div className="education-field">
                <label>
                  Board / University / Institution <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={medicalDetails.institution}
                  onChange={(e) => handleMedicalChange('institution', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. State Medical Council Board"
                  className={`education-input ${errors['medical.institution'] ? 'error' : ''}`}
                />
                {errors['medical.institution'] && <span className="personal-error-text">{errors['medical.institution']}</span>}
              </div>

              <div className="education-field">
                <label>Course / Specialization</label>
                <input
                  type="text"
                  value={medicalDetails.course}
                  onChange={(e) => handleMedicalChange('course', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. Biology, Chemistry &amp; Physics"
                  className="education-input"
                />
              </div>

              <div className="education-field">
                <label>
                  Country <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={medicalDetails.country}
                  onChange={(e) => handleMedicalChange('country', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. India or Canada"
                  className={`education-input ${errors['medical.country'] ? 'error' : ''}`}
                />
                {errors['medical.country'] && <span className="personal-error-text">{errors['medical.country']}</span>}
              </div>

              <div className="education-field">
                <label>
                  Passing / Completion Year <span className="required">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={medicalDetails.completionYear}
                  onChange={(e) => handleMedicalChange('completionYear', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. 2024"
                  className={`education-input ${errors['medical.completionYear'] ? 'error' : ''}`}
                />
                {errors['medical.completionYear'] && <span className="personal-error-text">{errors['medical.completionYear']}</span>}
              </div>

              <div className="education-field">
                <label>
                  Score / Percentage / GPA <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={medicalDetails.percentageGpa}
                  onChange={(e) => handleMedicalChange('percentageGpa', e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. 92% or 3.9 GPA"
                  className={`education-input ${errors['medical.percentageGpa'] ? 'error' : ''}`}
                />
                {errors['medical.percentageGpa'] && <span className="personal-error-text">{errors['medical.percentageGpa']}</span>}
              </div>
            </div>

            {/* Medical Document Upload */}
            <div style={{ marginTop: '20px' }}>
              <FileUpload
                docId="medical_academic_doc"
                label="Upload Medical Foundation / Academic Document (PDF)"
                hint="Marksheets, academic diploma, or pre-med transcript (PDF, max 10MB)"
                accept="application/pdf"
                requirePdf={true}
                value={medicalDetails.academicDoc}
                disabled={isLocked}
                consistencyScope="education"
                consistencyValues={{ institution: medicalDetails.institution || medicalDetails.schoolCollege, country: medicalDetails.country, state: medicalDetails.state, startYear: medicalDetails.startYear, completionYear: medicalDetails.completionYear, percentage: medicalDetails.percentageGpa }}
                onChange={(fileObj) => handleMedicalChange('academicDoc', fileObj)}
              />
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <button
            type="button"
            onClick={onBack}
            className="education-btn-back"
            disabled={!onBack || isLocked}
            aria-label="Back to Basic Details"
          >
            <FaArrowLeft aria-hidden="true" /> Back to Basic Details
          </button>

          <div style={{ display: 'inline-flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={isSaving}
              className="personal-btn-next"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {isSaving ? 'Saving...' : 'Save & Continue'} <FaArrowRight />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EducationDetails;
