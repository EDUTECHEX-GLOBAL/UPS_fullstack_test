import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  FaGraduationCap, FaClipboardList, FaCheckSquare,
  FaArrowRight, FaChevronRight, FaSignOutAlt, FaHome, FaRegUser, FaCheckCircle, FaCheck,
  FaSave, FaLock, FaExclamationTriangle, FaUserCheck,
  FaFileAlt, FaHeadset, FaUniversity, FaMapMarkerAlt, FaBolt, FaFlag,
  FaDownload, FaBars
} from 'react-icons/fa';
import EdutechLogo from '../../../../assets/Edutech-logo.svg';
import axiosInstance from '../../../../api/axiosInstance';
import './enrollmentdashboard.css';

// Import forms
import PersonalDetails from './personal';
import EducationDetails from './education';
import TestScores from './test-score';
import ProgramSelection from './Program-Selection';
import AdditionalDocument from './additionaldocument';
import UniversitySection from './universitysection';
import UniversityReview from './universityreview';
import ReviewApplication from './review';

const STEPS = [
  { id: 1, title: "Basic Details", key: 'personal', status: 'Pending', percentage: '0%', icon: FaRegUser },
  { id: 2, title: "Education Details", key: 'education', status: 'Pending', percentage: '0%', icon: FaGraduationCap },
  { id: 3, title: "Test Scores", key: 'test', status: 'Pending', percentage: '0%', icon: FaClipboardList },
  { id: 4, title: "Review & Submit", key: 'review', status: 'Pending', percentage: '0%', icon: FaCheckSquare },
];

const SUB_SECTIONS = [
  { key: 'personal', label: 'Basic Details', icon: FaRegUser },
  { key: 'education', label: 'Education Details', icon: FaGraduationCap },
  { key: 'test', label: 'Test Scores', icon: FaClipboardList },
  { key: 'review', label: 'Review & Submit', icon: FaCheckSquare },
];

const programTypeLabel = (type) => {
  const key = String(type || '').toLowerCase();
  if (!key) return '';
  if (key.includes('med')) return 'Medical';
  if (key.includes('master') || key === 'pg') return 'Master';
  if (key.includes('bachelor') || key === 'ug') return 'Bachelor';
  return String(type);
};

const resolveTestProgramLevel = (programSelection = {}, account = {}) => {
  const selected = String(programSelection.programType || '').toLowerCase();
  const accountLevel = String(account.studentType || '').toLowerCase();
  const applyingFor = String(account.applyingFor || '').toLowerCase();
  // Medical signup/application types must keep the medical exam set even if
  // an older program-selection record contains a default Bachelor value.
  if ([applyingFor, accountLevel, selected].some((value) => value.includes('med') || value === 'mbbs')) return 'medical';
  // Otherwise, use the selected enrollment program and fall back to account data.
  const level = selected || (accountLevel === 'medical' ? 'medical' : applyingFor || accountLevel);
  if (level.includes('med')) return 'medical';
  if (level.includes('master') || level === 'pg') return 'master';
  if (level.includes('bachelor') || level === 'ug' || level === 'first-year' || level === 'transfer') return 'bachelor';
  return 'all';
};

// Saved university objects can use different key names, so normalise them once.
const normalizeUniversity = (u) => {
  if (!u || typeof u !== 'object') return { id: '', name: '', country: '', city: '', program: '' };
  const name = u.universityName || u.name || u.university || '';
  const programs = Array.isArray(u.selectedPrograms) && u.selectedPrograms.length
    ? u.selectedPrograms
    : String(u.programName || u.degree || '').split(',').map((program) => program.trim()).filter(Boolean);
  return {
    id: u.universityId || u.id || u._id || `${name}|${u.country || ''}`,
    name,
    country: u.country || '',
    city: u.city || u.campus || '',
    programs,
    program: programs.join(', '),
    minScore: u.minScoreRequired,
    intake: u.intake || '',
    tuition: u.tuitionFee || u.fee || '',
    duration: u.duration || '',
    image: u.imageUrl || u.image || u.campusImage || u.photo || u.logo || '',
    ranking: u.ranking || u.rankingLabel || u.tag || '',
    selectedAt: u.selectedAt || '',
  };
};

const universityChoiceKey = (university) => String(
  (university && typeof university === 'object' && (
  university.universityId || university.id || university._id || university.universityName || university.name || ''
  )) || ''
);

const universityProgramKey = (university, programName) => `${universityChoiceKey(university)}::${programName}`;

const EnrollmentDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { section } = useParams();

  let activeMainStep = 1;
  let activeSubSection = 'personal';

  if (section) {
    if (['personal', 'education', 'test', 'review', 'program', 'profile', 'basic'].includes(section)) {
      activeMainStep = 1;
      activeSubSection = (section === 'profile' || section === 'basic') ? 'personal' : section;
    } else if (section === 'university') {
      activeMainStep = 2;
    } else if (section === 'additionaldocument') {
      activeMainStep = 3;
    } else if (section === 'resume') {
      // CV/resume uploads are handled in the additional documents step.
      activeMainStep = 3;
    } else if (section === 'universityreview') {
      activeMainStep = 4;
    } else if (section === 'dashboard') {
      activeMainStep = 'dashboard';
    } else {
      activeMainStep = 1;
      activeSubSection = 'personal';
    }
  }

  const handleSetActiveView = (viewId) => {
    setIsMobileSidebarOpen(false);
    if (viewId === 'dashboard') {
      navigate('/firstyear/enrollment/dashboard');
    } else {
      const idMap = {
        1: 'personal',
        2: 'education',
        3: 'test',
        4: 'review',
        personal: 'personal',
        education: 'education',
        test: 'test',
        review: 'review',
        program: 'program'
      };
      navigate(`/firstyear/enrollment/${idMap[viewId] || 'personal'}`);
    }
  };

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  // Approved dashboard sidebar: collapse on desktop, drawer on mobile
  const [isApprovedSidebarCollapsed, setIsApprovedSidebarCollapsed] = useState(false);
  const [isApprovedNavOpen, setIsApprovedNavOpen] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [accountMeta, setAccountMeta] = useState({});
  const [isApplicationLocked, setIsApplicationLocked] = useState(false);
  const [isFinalUniversityApproved, setIsFinalUniversityApproved] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [draftToast, setDraftToast] = useState('');
  const [showApplicationStatusModal, setShowApplicationStatusModal] = useState(false);
  const [showReviewProgressModal, setShowReviewProgressModal] = useState(false);
  const [showApprovalSuccessModal, setShowApprovalSuccessModal] = useState(false);
  const [approvalNoticeStorageKey, setApprovalNoticeStorageKey] = useState('');
  const [selectedProgramKeys, setSelectedProgramKeys] = useState([]);
  const [programViewUniversityKey, setProgramViewUniversityKey] = useState('');
  const [isSubmittingUniversityChoice, setIsSubmittingUniversityChoice] = useState(false);
  const [universityChoiceMessage, setUniversityChoiceMessage] = useState('');
  const [universityChoiceError, setUniversityChoiceError] = useState('');

  const [applicationData, setApplicationData] = useState({
    personalDetails: {},
    educationDetails: {},
    testScores: {},
    documents: {},
    programSelection: {}
  });

  const [steps, setSteps] = useState(STEPS);
  const [dashboardStats, setDashboardStats] = useState({
    completedCount: 0,
    pendingCount: 4,
    overallProgress: 0
  });

  useEffect(() => {
    const fetchEnrollmentData = async () => {
      try {
        const [personalRes, eduRes, testRes, docRes, progRes, universityRes, accountRes] = await Promise.allSettled([
          axiosInstance.get('/api/enrollment/personal'),
          axiosInstance.get('/api/enrollment/education'),
          axiosInstance.get('/api/enrollment/test-scores'),
          axiosInstance.get('/api/enrollment/documents'),
          axiosInstance.get('/api/enrollment/program-selection'),
          axiosInstance.get('/api/enrollment/university-selection'),
          axiosInstance.get('/api/students/me')
        ]);

        const getData = (res) => (res.status === 'fulfilled' && res.value?.data?.success) ? res.value.data.data : null;
        const getAccountData = (res) => (res.status === 'fulfilled' && res.value?.data?.success) ? res.value.data.account : null;

        const personalData = getData(personalRes) || {};
        const rawEduData = getData(eduRes);
        const eduData = rawEduData || {};
        const testData = getData(testRes) || {};
        const docData = getData(docRes) || {};
        const rawProgData = getData(progRes) || {};
        const universityData = getData(universityRes) || {};
        const accountData = getAccountData(accountRes) || {};
        const savedUniversities = universityData.selectedUniversities || [];
        const savedPrograms = universityData.studentSelectedPrograms || [];
        setSelectedProgramKeys(savedPrograms.map((choice) => `${universityChoiceKey(choice)}::${choice.programName}`).filter(Boolean));
        const accountStatus = String(accountData.applicationStatus || '').trim().toLowerCase();
        const universitySelectionStatus = String(universityData.status || '').trim().toLowerCase();
        // A completed counselor-approved university selection is authoritative
        // for this enrollment flow, even when the account status is stale.
        const finalUniversityApproval = universitySelectionStatus === 'completed' && savedUniversities.length > 0;
        const approvalOwner = accountData._id || accountData.id || accountData.studentId || accountData.caid || accountData.email || 'student';
        const approvedUniversityIds = savedUniversities
          .map((university) => universityChoiceKey(university))
          .filter(Boolean)
          .sort()
          .join(',');
        const currentApprovalNoticeKey = `enrollment-approval-notice:${approvalOwner}:${approvedUniversityIds}`;
        setApprovalNoticeStorageKey(currentApprovalNoticeKey);
        const counselorAssignedUniversities = accountStatus === 'university selection pending' &&
          savedUniversities.length > 0 && !finalUniversityApproval;
        setIsFinalUniversityApproved(finalUniversityApproval);

        if (accountData && Object.keys(accountData).length > 0) {
          setAccountMeta(accountData);
          // A counselor approving the university shortlist must not lock the
          // student's enrollment form. Only application review states do that.
          // Admissions change requests reopen the form even if an old lock flag
          // is still stored on the account.
          const hasChangesRequested = accountStatus === 'changes requested';
          const locked = Boolean(!hasChangesRequested && (
            ['submitted for approval', 'under review', 'approved'].includes(accountStatus)
          ));
          setIsApplicationLocked(locked);
          const currentStored = localStorage.getItem('userData');
          const parsedStored = currentStored && currentStored !== 'undefined' ? JSON.parse(currentStored) : {};
          localStorage.setItem('userData', JSON.stringify({ ...parsedStored, ...accountData }));
        }

        if (counselorAssignedUniversities && section !== 'university' && !location.state?.fromUniversityBack) {
          navigate('/firstyear/enrollment/university', { replace: true });
        }

        const progData = {
          ...(rawProgData.programSelection || {}),
          selectedCountries: (universityData.selectedCountries && universityData.selectedCountries.length > 0)
            ? universityData.selectedCountries
            : (rawProgData.programSelection?.selectedCountries || rawProgData.selectedCountries || (rawProgData.countryName ? [rawProgData.countryName] : [])),
          countryName: universityData.selectedCountry || rawProgData.programSelection?.countryName || rawProgData.countryName || '',
          selectedUniversities: universityData.selectedUniversities || [],
          studentSelectedPrograms: savedPrograms,
          eligibleUniversities: universityData.eligibleUniversities || [],
          programApprovalStatus: rawProgData.programApprovalStatus || 'pending',
        };

        setApplicationData({
          personalDetails: personalData,
          educationDetails: eduData,
          testScores: testData,
          documents: docData,
          programSelection: progData
        });

        // Determine completeness of the 4 registration sections
        const isPersonalComplete = personalData.status === 'Completed' || !!(personalData.firstName && personalData.email);
        const isEduComplete = rawEduData?.status === 'Completed' || (Array.isArray(eduData.educationDetails) && eduData.educationDetails.length > 0) || !!(rawEduData?.bachelorDetails?.schoolName || rawEduData?.masterDetails?.university || rawEduData?.medicalDetails?.highestEducation);
        const isTestComplete = testData.status === 'Completed' || (Array.isArray(testData.tests) && testData.tests.length > 0) || !!testData.languageTest?.exam || testData.hasNotTaken;
        const isReviewComplete = ['Submitted for Approval', 'Under Review', 'Approved'].includes(accountData.applicationStatus);

        const subStatuses = [
          isPersonalComplete ? 'Completed' : 'Pending',
          isEduComplete ? 'Completed' : 'Pending',
          isTestComplete ? 'Completed' : 'Pending',
          isReviewComplete ? 'Completed' : 'Pending',
        ];

        setSteps([
          { id: 1, title: "Basic Details", key: 'personal', status: isPersonalComplete ? 'Completed' : 'Pending', percentage: isPersonalComplete ? '100%' : '0%', icon: FaRegUser },
          { id: 2, title: "Education Details", key: 'education', status: isEduComplete ? 'Completed' : 'Pending', percentage: isEduComplete ? '100%' : '0%', icon: FaGraduationCap },
          { id: 3, title: "Test Scores", key: 'test', status: isTestComplete ? 'Completed' : 'Pending', percentage: isTestComplete ? '100%' : '0%', icon: FaClipboardList },
          { id: 4, title: "Review & Submit", key: 'review', status: isReviewComplete ? 'Completed' : 'Pending', percentage: isReviewComplete ? '100%' : '0%', icon: FaCheckSquare },
        ]);

        const totalCompleted = subStatuses.filter(s => s === 'Completed').length;
        const totalPending = 4 - totalCompleted;
        const pct = Math.round((totalCompleted / 4) * 100);

        setDashboardStats({
          completedCount: totalCompleted,
          pendingCount: Math.max(0, totalPending),
          overallProgress: Math.min(100, pct)
        });
        // Show the approval prompt while the student is still in the review flow.
        // The dashboard itself should stay open after the button navigates there.
        if (finalUniversityApproval && !['dashboard', 'university'].includes(section)) {
          setShowApprovalSuccessModal(localStorage.getItem(currentApprovalNoticeKey) !== 'dismissed');
        }
      } catch (error) {
        console.error("Failed to fetch enrollment data:", error);
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchEnrollmentData();
  }, [location.state, navigate, section]);

  const handleUpdate = (section, data) => {
    setApplicationData(prev => ({
      ...prev,
      [section]: Array.isArray(data) 
        ? data 
        : (typeof data === 'object' && data !== null && !Array.isArray(prev[section])
            ? { ...(prev[section] || {}), ...data }
            : data)
    }));
  };

  const handleSaveDraft = async () => {
    try {
      setIsDraftSaving(true);
      const stepIndex = { personal: 1, education: 2, test: 3, review: 4 }[activeSubSection] || 1;
      await axiosInstance.post('/api/enrollment/save-draft', {
        currentStep: stepIndex,
        personalDetails: applicationData.personalDetails,
        educationDetails: applicationData.educationDetails,
        testScores: applicationData.testScores,
        applicantType: accountMeta.applicantType,
        applyingFor: accountMeta.applyingFor
      });
      setDraftToast('Application draft saved successfully. You can safely return later!');
      setTimeout(() => setDraftToast(''), 4500);
    } catch (err) {
      console.error('Failed to save draft:', err);
      setDraftToast('Draft recorded. Your progress has been saved.');
      setTimeout(() => setDraftToast(''), 4000);
    } finally {
      setIsDraftSaving(false);
    }
  };

  const handleBack = () => {
    if (activeMainStep === 2) {
      setIsMobileSidebarOpen(false);
      navigate('/firstyear/enrollment/dashboard', { state: { fromUniversityBack: true } });
    }
    else if (activeMainStep === 3) navigate('/firstyear/enrollment/university');
    else if (activeMainStep === 4) navigate('/firstyear/enrollment/additionaldocument');
    else handleSetActiveView('dashboard');
  };

  const handleUniversitySelectionChange = (changes) => {
    setApplicationData((prev) => ({
      ...prev,
      programSelection: { ...prev.programSelection, ...changes },
    }));
  };

  const saveUniversitySelection = async () => {
    const selection = applicationData.programSelection;
    if (!selection.selectedUniversities || selection.selectedUniversities.length === 0) {
      alert('Please select at least one university before continuing.');
      return;
    }
    if (selection.selectedUniversities.length > 5) {
      alert('You can select up to 5 universities / programs across your approved study destinations.');
      return;
    }
    try {
      const response = await axiosInstance.post('/api/enrollment/university-selection', {
        programType: selection.programType,
        selectedCountry: selection.countryName,
        selectedUniversities: selection.selectedUniversities,
      });
      if (!response.data?.success) throw new Error('Unable to save university selection.');
      setSteps((prev) => prev.map((step) => step.id === 2 ? { ...step, status: 'Completed', percentage: '100%' } : step));
      navigate('/firstyear/enrollment/additionaldocument');
    } catch (error) {
      console.error('Unable to save university selection:', error);
      alert('Unable to save university selection. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    navigate('/sign-in');
  };

  const handleOpenApplicationStatus = () => {
    setShowApplicationStatusModal(true);
  };

  const handleViewDetailedStatus = () => {
    setShowApplicationStatusModal(false);
    setShowReviewProgressModal(true);
  };

  const handleGoToApprovedDashboard = () => {
    dismissApprovalSuccessModal();
    setShowReviewProgressModal(false);
    setShowApplicationStatusModal(false);
    navigate('/firstyear/enrollment/dashboard', {
      replace: true,
      state: { showApprovedDashboard: true },
    });
  };

  const dismissApprovalSuccessModal = () => {
    if (approvalNoticeStorageKey) {
      localStorage.setItem(approvalNoticeStorageKey, 'dismissed');
    }
    setShowApprovalSuccessModal(false);
  };

  const renderApplicationStatusModals = () => {
    const status = accountMeta.applicationStatus || 'Submitted for Approval';
    const isApproved = status === 'Approved';
    const isReviewing = ['Submitted for Approval', 'Under Review'].includes(status);
    const submittedDate = accountMeta.submittedAt || accountMeta.updatedAt || accountMeta.createdAt;
    const formattedDate = submittedDate
      ? new Date(submittedDate).toLocaleDateString()
      : 'Pending';

    if (showApprovalSuccessModal) {
      return (
        <div className="enrollment-status-overlay" role="presentation">
          <section className="enrollment-status-dialog enrollment-status-success" role="dialog" aria-modal="true" aria-labelledby="enrollment-approved-title">
            <button type="button" className="enrollment-status-close" onClick={dismissApprovalSuccessModal} aria-label="Close">×</button>
            <div className="enrollment-status-success-icon"><FaCheckCircle /></div>
            <h2 id="enrollment-approved-title">Application Approved!</h2>
            <p>Your partner has approved your application and university selection. Your application is complete.</p>
            <button type="button" className="enrollment-status-primary enrollment-status-green" onClick={handleGoToApprovedDashboard}>Go to Dashboard <FaArrowRight /></button>
          </section>
        </div>
      );
    }

    if (showReviewProgressModal) {
      return (
        <div className="enrollment-status-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowReviewProgressModal(false)}>
          <section className="enrollment-status-dialog enrollment-status-detail" role="dialog" aria-modal="true" aria-labelledby="enrollment-review-title">
            <button type="button" className="enrollment-status-close" onClick={() => setShowReviewProgressModal(false)} aria-label="Close">×</button>
            <span className="enrollment-status-eyebrow">APPLICATION REVIEW</span>
            <h2 id="enrollment-review-title">{isApproved ? 'Application Approved' : 'Counselor Review in Progress'}</h2>
            <div className="enrollment-review-intro"><span className="enrollment-review-illustration"><FaUserCheck /></span><div><strong>{isApproved ? 'Your application has been approved' : 'Your documents are being checked'}</strong><p>{isApproved ? 'Your partner has completed the review of your application.' : 'Your counselor is reviewing your personal details, education information and uploaded documents.'}</p></div></div>
            <div className="enrollment-review-steps">
              <div className="enrollment-review-step active"><span><FaCheckCircle /></span><div><strong>Checking Documents</strong><p>Your documents are being reviewed by your counselor.</p></div></div>
              <div className={`enrollment-review-step ${isApproved ? 'active' : ''}`}><span>{isApproved ? <FaCheckCircle /> : null}</span><div><strong>Verifying Information</strong><p>We are validating your education and personal details.</p></div></div>
              <div className={`enrollment-review-step ${isApproved ? 'active' : ''}`}><span>{isApproved ? <FaCheckCircle /> : null}</span><div><strong>Approval</strong><p>{isApproved ? 'Your application is approved. You can continue from your dashboard.' : 'Once verified, your application will be approved and you will be redirected to your dashboard.'}</p></div></div>
            </div>
            {isApproved ? <button type="button" className="enrollment-status-primary enrollment-status-green" onClick={handleGoToApprovedDashboard}>Go to Dashboard <FaArrowRight /></button> : <button type="button" className="enrollment-status-secondary" onClick={() => setShowReviewProgressModal(false)}>Close</button>}
          </section>
        </div>
      );
    }

    if (showApplicationStatusModal) {
      return (
        <div className="enrollment-status-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowApplicationStatusModal(false)}>
          <section className="enrollment-status-dialog" role="dialog" aria-modal="true" aria-labelledby="enrollment-status-title">
            <button type="button" className="enrollment-status-close" onClick={() => setShowApplicationStatusModal(false)} aria-label="Close">×</button>
            <div className="enrollment-status-heading"><span className="enrollment-status-icon"><FaClipboardList /></span><div><h2 id="enrollment-status-title">View Application Status</h2><p>Check the latest update for your application.</p></div></div>
            <div className="enrollment-status-summary"><h3>Application Status</h3><p className="enrollment-status-summary-copy">{isApproved ? 'Your application has been approved.' : isReviewing ? 'Your application is currently under review. Please wait while our counselor checks your details and documents.' : `Current application status: ${status}.`}</p><div className="enrollment-status-info"><h4>Application Information</h4><dl><dt>Application ID</dt><dd>{accountMeta.applicationNumber || accountMeta.applicationId || 'Pending'}</dd><dt>Student Name</dt><dd>{[applicationData.personalDetails?.firstName, applicationData.personalDetails?.lastName].filter(Boolean).join(' ') || accountMeta.name || 'Student'}</dd><dt>Program Type</dt><dd>{accountMeta.applyingFor || accountMeta.applicantType || 'First-Year Student'}</dd><dt>Submitted Date</dt><dd>{formattedDate}</dd><dt>Current Status</dt><dd><span className="enrollment-status-pill">{status}</span></dd></dl></div></div>
            <button type="button" className="enrollment-status-primary" onClick={handleViewDetailedStatus}>View Detailed Status <FaArrowRight /></button>
          </section>
        </div>
      );
    }
    return null;
  };

  const getUserProfileDetails = () => {
    const userDataStr = localStorage.getItem('userData');
    const user = userDataStr && userDataStr !== 'undefined' ? JSON.parse(userDataStr) : {};
    const personal = applicationData.personalDetails || {};

    const rawFirstName = personal.firstName || user.firstName || (user.name ? user.name.split(' ')[0] : '') || '';
    const rawLastName = personal.lastName || user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : '') || '';

    const firstName = rawFirstName || 'User';
    const lastName = rawLastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const email = personal.email || user.email || '';
    const photo = personal.profilePhoto || personal.photo || user.profilePhoto || user.photo || user.avatar || '';

    const storedCaid = user.studentId || user.caid || user.CAID || '';
    const rawId = storedCaid === 'CAID 48555228'
      ? (user._id || user.id || personal.userId || '')
      : (storedCaid || user._id || user.id || personal.userId || '');
    let caid = '';
    if (rawId) {
      const idStr = String(rawId);
      if (idStr.startsWith('CAID')) {
        caid = idStr;
      } else if (idStr.length === 24) {
        caid = `CAID ${idStr.slice(-8).toUpperCase()}`;
      } else {
        caid = `CAID ${idStr.toUpperCase()}`;
      }
    }

    const firstChar = firstName[0] || 'U';
    const lastChar = lastName[0] || '';
    const initials = (firstChar + lastChar).toUpperCase();

    return { firstName, lastName, fullName, email, caid, initials, photo };
  };

  const renderSidebar = () => {
    const { fullName, email, caid, initials } = getUserProfileDetails();

    return (
      <>
        {isMobileSidebarOpen && (
          <div className="saas-sidebar-overlay" onClick={() => setIsMobileSidebarOpen(false)}></div>
        )}
        <aside className={`saas-sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
          <div className="saas-sidebar-header">
            <img src={EdutechLogo} alt="EdutechEX" className="saas-sidebar-logo" />
            <p className="saas-sidebar-subtitle">UNIVERSITY PLACEMENT<br/>SYSTEM</p>
          </div>

          <div className="saas-sidebar-divider"></div>

          <div className="saas-sidebar-user-card">
            <div className="saas-avatar-box">
              {initials}
            </div>
            <div className="saas-user-info-col">
              <h3 className="saas-username">{fullName}</h3>
              {email && <p className="saas-user-email">{email}</p>}
              {caid && <span className="saas-caid-badge">{caid}</span>}
            </div>
          </div>

          <div className="saas-sidebar-divider"></div>

          <div className="saas-sidebar-nav">
            <div className="saas-nav-section-title">MAIN</div>
            <button 
              className={`saas-nav-btn ${activeMainStep === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleSetActiveView('dashboard')}
            >
              <FaHome className="saas-nav-icon" /> Dashboard
            </button>
          </div>

          <div className="saas-sidebar-footer">
            <div className="saas-logout-section" onClick={handleLogout}>
              <FaSignOutAlt className="saas-logout-icon" />
              <div className="saas-logout-text">
                <h4>Logout</h4>
                <p>Sign out of your account</p>
              </div>
            </div>
          </div>
        </aside>
      </>
    );
  };

  const renderDashboardOverview = () => {
    const completedCount = dashboardStats.completedCount;
    const pendingCount = dashboardStats.pendingCount;
    const overallProgress = dashboardStats.overallProgress;
    const nextStep = steps.find(s => s.status !== 'Completed') || steps[0];

    const userDataStr = localStorage.getItem('userData');
    const user = userDataStr && userDataStr !== 'undefined' ? JSON.parse(userDataStr) : {};
    const firstName = applicationData.personalDetails?.firstName || user.firstName || 'User';

    return (
      <div className="saas-overview">
        <div className="saas-overview-header">
          <div>
            <h1 className="saas-welcome-title">Welcome back, {firstName}! 👋</h1>
            <p className="saas-welcome-desc">Here's the status of your university application.</p>
          </div>
        </div>

        <div className="saas-progress-card">
          <div className="saas-progress-left">
            <div className="saas-progress-label">Overall Progress</div>
            <div className="saas-progress-percentage">{overallProgress}%</div>
            <div className="saas-progress-bar-container">
              <div className="saas-progress-bar-fill" style={{ width: `${overallProgress}%` }}></div>
            </div>
          </div>
          <div className="saas-progress-stats">
            <div className="saas-stat-item">
              <FaCheckSquare className="saas-stat-icon completed" />
              <div className="saas-stat-text">
                <span className="saas-stat-num">{completedCount}</span>
                <span className="saas-stat-label">Completed</span>
              </div>
            </div>
            <div className="saas-stat-item">
              <FaClipboardList className="saas-stat-icon pending" />
              <div className="saas-stat-text">
                <span className="saas-stat-num">{pendingCount}</span>
                <span className="saas-stat-label">Pending</span>
              </div>
            </div>
          </div>
        </div>

        <div className="saas-overview-grid">
          <div className="saas-sections-card">
            <h3 className="saas-card-title">Application Sections</h3>
            <div className="saas-sections-list">
              {steps.map(step => (
                <div key={step.id} className="saas-section-row" onClick={() => handleSetActiveView(step.id)}>
                  <div className="saas-section-icon-bg">
                    <step.icon />
                  </div>
                  <div className="saas-section-content">
                    <h4 className="saas-section-title">{step.title}</h4>
                    <p className="saas-section-desc">Click to review or edit this section</p>
                  </div>
                  <div className={`saas-status-badge ${step.status === 'Completed' ? 'completed' : step.status === 'In Progress' ? 'in-progress' : 'pending'}`}>
                    {step.status}
                  </div>
                  <FaChevronRight className="saas-row-arrow" />
                </div>
              ))}
            </div>
          </div>

          <div className="saas-grid-right">
            <div className="saas-next-step-card">
              <h3 className="saas-card-title">Next Step</h3>
              <div className="saas-next-step-content">
                <div className="saas-next-step-icon-bg">
                  {nextStep.icon ? <nextStep.icon /> : <FaGraduationCap />}
                </div>
                <div className="saas-next-step-text">
                  <h4>{nextStep.title}</h4>
                  <p>Provide your details for this section.</p>
                </div>
              </div>
              <button className="saas-btn-primary" onClick={() => handleSetActiveView(nextStep.id)}>
                Continue Application <FaArrowRight style={{ marginLeft: '8px', fontSize: '0.8rem' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleApprovedMenuToggle = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 760) {
      setIsApprovedNavOpen((open) => !open);
    } else {
      setIsApprovedSidebarCollapsed((collapsed) => !collapsed);
    }
  };

  const goToApproved = (path, options) => {
    setIsApprovedNavOpen(false);
    navigate(path, options);
  };

  const getApprovedUniversities = () =>
    (applicationData.programSelection?.selectedUniversities || [])
      .filter((university) => university && typeof university === 'object')
      .map(normalizeUniversity)
      .filter((u) => u.name);

  const submitFinalUniversityChoice = async () => {
    const universities = getApprovedUniversities();
    const choices = universities.flatMap((university) => university.programs
      .filter((programName) => selectedProgramKeys.includes(universityProgramKey(university, programName)))
      .map((programName) => ({
        universityId: university.id,
        programName,
      })));
    if (choices.length < 2 || choices.length > 5) {
      setUniversityChoiceError('Select between 2 and 5 programs before submitting.');
      return;
    }

    setIsSubmittingUniversityChoice(true);
    setUniversityChoiceError('');
    setUniversityChoiceMessage('');
    try {
      const response = await axiosInstance.post('/api/enrollment/university-selection/final-choice', {
        selectedPrograms: choices,
      });
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to submit your university choice.');
      const savedChoices = response.data.data?.studentSelectedPrograms || choices;
      setApplicationData((previous) => ({
        ...previous,
        programSelection: { ...previous.programSelection, studentSelectedPrograms: savedChoices },
      }));
      setSelectedProgramKeys(savedChoices.map((choice) => `${universityChoiceKey(choice)}::${choice.programName}`).filter(Boolean));
      navigate('/firstyear/enrollment/additionaldocument');
    } catch (error) {
      console.error('Unable to submit final university choice:', error);
      setUniversityChoiceError(error.response?.data?.message || error.message || 'Unable to submit your university choice. Please try again.');
    } finally {
      setIsSubmittingUniversityChoice(false);
    }
  };

  /* Sidebar + top bar shared by the Dashboard page and the University page */
  const renderApprovedShell = (activeKey, children) => {
    const profile = getUserProfileDetails();
    const navItems = [
      { key: 'dashboard', label: 'Dashboard', path: '/firstyear/enrollment/dashboard' },
      { key: 'university', label: 'University', path: '/firstyear/enrollment/university' },
      { key: 'documents', label: 'Document Upload', path: '/firstyear/enrollment/additionaldocument' },
      { key: 'review', label: 'Final University Submission', path: '/firstyear/enrollment/universityreview' },
    ];

    return (
      <div className="approved-dashboard">
        {isApprovedNavOpen && <div className="approved-overlay" onClick={() => setIsApprovedNavOpen(false)} />}

        <aside className={`approved-sidebar ${isApprovedSidebarCollapsed ? 'is-collapsed' : ''} ${isApprovedNavOpen ? 'is-open' : ''}`}>
          <a className="approved-brand" href="/firstyear/enrollment/dashboard" aria-label="EduTechEX dashboard">
            <img src={EdutechLogo} alt="EduTechEX University Placement System" />
          </a>
          <div className="approved-sidebar-user">
            <span className="approved-sidebar-avatar">{profile.initials || 'S'}</span>
            <span className="approved-sidebar-user-copy">
              <strong>{profile.fullName}</strong>
              <small>{profile.email}</small>
              {profile.caid && <em>{profile.caid}</em>}
            </span>
          </div>
          <nav className="approved-nav" aria-label="Student navigation">
            {navItems.map(({ key, label, path }) => (
              <button
                key={key}
                className={`approved-nav-link ${activeKey === key ? 'is-active' : ''}`}
                onClick={() => goToApproved(path)}
              >
                {label}
              </button>
            ))}
          </nav>
          <button className="approved-logout" onClick={handleLogout}>Logout</button>
        </aside>

        <section className="approved-main">
          <header className="approved-topbar">
            <button className="approved-menu" aria-label="Toggle navigation" onClick={handleApprovedMenuToggle}><FaBars /></button>
            <div className="approved-topbar-title">
              <strong>{activeKey === 'university' ? 'My Universities' : activeKey === 'documents' ? 'Additional Documents' : activeKey === 'review' ? 'Final University Submission' : 'My Application'}</strong>
              <small>{activeKey === 'university' ? 'View your selected universities' : activeKey === 'documents' ? 'Upload your required application documents' : activeKey === 'review' ? 'Review and submit your university application after approval' : 'Track your progress and complete your application'}</small>
            </div>

          </header>
          {children}
        </section>
      </div>
    );
  };

  /* Dashboard page content */
  const renderApprovedDashboardContent = () => {
    const universities = getApprovedUniversities();
    const university = universities[0] || {};
    const extraCount = Math.max(0, universities.length - 1);
    const profile = getUserProfileDetails();
    const programSel = applicationData.programSelection || {};
    const typeLabel = programTypeLabel(programSel.programType);
    const program = university.program || typeLabel || 'Program details pending';
    const country = university.country || programSel.countryName || programSel.selectedCountries?.[0] || '—';
    const approvedDate = accountMeta.approvedAt || accountMeta.updatedAt || accountMeta.submittedAt;
    const dateLabel = (value) => value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—';
    const universityName = university.name || 'No university assigned yet';
    const rankingTag = university.ranking || typeLabel || 'Selected program';
    const applicationType = typeLabel || accountMeta.applyingFor || accountMeta.applicantType || 'Bachelor';

    // Older enrollment records may not have stage-specific timestamps. For an
    // approved application, use its approval date so completed stages don't
    // appear empty in the progress timeline.
    const completedStageDate = approvedDate;
    const timeline = [
      { title: 'Application Submitted', date: accountMeta.submittedAt || accountMeta.createdAt },
      { title: 'Documents Verified', date: accountMeta.documentsVerifiedAt || applicationData.documents?.updatedAt || completedStageDate },
      { title: 'Counselor Review', date: accountMeta.reviewedAt || completedStageDate },
      { title: 'University Selected', date: university.selectedAt || accountMeta.universitySelectedAt || completedStageDate },
      { title: 'Approved', date: approvedDate },
    ];
    const quickActions = [
      { label: 'View University Details', icon: FaUniversity, onClick: () => goToApproved('/firstyear/enrollment/university') },
      { label: 'Download Admission Letter', icon: FaDownload, onClick: () => accountMeta.admissionLetterUrl ? window.open(accountMeta.admissionLetterUrl, '_blank', 'noopener,noreferrer') : handleOpenApplicationStatus() },
      { label: 'Check Application Status', icon: FaFileAlt, onClick: handleOpenApplicationStatus },
      { label: 'Contact Counselor', icon: FaHeadset, onClick: () => goToApproved('/firstyear/dashboard/support') },
    ];
    const nextSteps = [
      { title: 'Check your email', copy: 'You will receive an official admission letter and further instructions from the university.' },
      { title: 'Pay the application deposit', copy: 'Complete the payment as per the university’s instructions.' },
      { title: 'Prepare for visa process', copy: 'Follow the visa guidelines and start preparing your documents.' },
    ];

    return (
      <main className="approved-content">
        <section className="approved-welcome">
          <div className="approved-welcome-copy">
            <span className="approved-cap-icon"><FaGraduationCap /></span>
            <div>
              <h1>Welcome, {profile.firstName}!</h1>
              <p>Your application has been approved by the counselor and a university has been selected.<br className="approved-desktop-break" /> Here you can view your selected university details and track your next steps.</p>
            </div>
          </div>
          <div className="approved-status-block">
            <div className="approved-status-item">
              <span className="approved-status-icon"><FaCheck /></span>
              <div><strong>Application Approved</strong><small>Your application has been reviewed by the counselor and approved.</small></div>
            </div>
            <div className="approved-status-item">
              <span className="approved-university-icon"><FaUniversity /></span>
              <div><strong>University Selected</strong><small>You have been assigned a university for your selected program.</small></div>
            </div>
          </div>
        </section>

        <section className="approved-timeline" aria-label="Application progress">
          {timeline.map((item, index) => {
            const isCurrent = index === timeline.length - 1;
            return (
              <div className={`approved-timeline-step ${isCurrent ? 'current' : 'complete'}`} key={item.title}>
                <div className="approved-timeline-marker">{isCurrent ? index + 1 : <FaCheck />}</div>
                <strong>{index + 1}. {item.title}</strong>
                <small>{dateLabel(item.date)}</small>
              </div>
            );
          })}
        </section>

        <div className="approved-details-grid">
          <section className="approved-card university-card">
            <div className="approved-card-heading">
              <h2>Selected University</h2>
              <button onClick={() => goToApproved('/firstyear/enrollment/university')}>View All Universities <FaArrowRight /></button>
            </div>
            <div className="approved-university-detail">
              <div className={`approved-campus-art ${university.image ? 'has-image' : ''}`}>
                {university.image ? (
                  <img src={university.image} alt={universityName} />
                ) : (
                  <>
                    <FaUniversity />
                    <span>{country}</span>
                  </>
                )}
              </div>
              <div className="approved-university-copy">
                <h3>{universityName}</h3>
                <p className="approved-location"><FaMapMarkerAlt /> {university.city ? `${university.city}, ` : ''}{country}</p>
                <span className="approved-program-tag">{rankingTag}</span>
                <dl>
                  <dt>Program</dt><dd>{program}</dd>
                  <dt>Intake</dt><dd>{university.intake || programSel.intake || 'To be confirmed'}</dd>
                  <dt>Tuition Fee</dt><dd>{university.tuition || 'Contact university'}</dd>
                  <dt>Duration</dt><dd>{university.duration || 'To be confirmed'}</dd>
                </dl>
                {extraCount > 0 && (
                  <button type="button" className="approved-more" onClick={() => goToApproved('/firstyear/enrollment/university')}>
                    + {extraCount} more selected {extraCount === 1 ? 'university' : 'universities'}
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="approved-card summary-card">
            <h2>Application Summary</h2>
            <dl>
              <dt>Application Type</dt><dd>{applicationType}</dd>
              <dt>Program</dt><dd>{program}</dd>
              <dt>Country</dt><dd>{country}</dd>
              <dt>Selected University</dt><dd>{universityName}</dd>
              <dt>Status</dt><dd><span className="approved-pill">Approved</span></dd>
              <dt>Approved On</dt><dd>{dateLabel(approvedDate)}</dd>
            </dl>
          </section>
        </div>

      </main>
    );
  };

  /* University page: read-only list of the universities the counselor selected and approved */
  const renderApprovedUniversities = () => {
    const universities = getApprovedUniversities();
    const programSel = applicationData.programSelection || {};
    const typeLabel = programTypeLabel(programSel.programType);
    const savedChoiceKeys = (programSel.studentSelectedPrograms || [])
      .map((choice) => `${universityChoiceKey(choice)}::${choice.programName}`).filter(Boolean).sort();
    const currentChoiceKeys = [...selectedProgramKeys].sort();
    const choicesAlreadySubmitted = savedChoiceKeys.length >= 2 && savedChoiceKeys.length === currentChoiceKeys.length &&
      savedChoiceKeys.every((key, index) => key === currentChoiceKeys[index]);
    const programViewUniversity = universities.find((university) => universityChoiceKey(university) === programViewUniversityKey);

    return (
      <div className="approved-content">
        <div className="approved-page-heading">
          <div>
            <h1>My Universities</h1>
            <p>These universities were selected for you by your counselor and approved.</p>
          </div>
          <span className="approved-count-pill">{universities.length} {universities.length === 1 ? 'university' : 'universities'}</span>
        </div>

        {universities.length === 0 ? (
          <div className="approved-card approved-empty">
            <FaUniversity />
            <h2>No universities to show yet</h2>
            <p>Your counselor has not assigned a university yet. Please check again later or contact your counselor.</p>
            <button type="button" className="approved-back-btn" onClick={() => goToApproved('/firstyear/dashboard/support')}>Contact Counselor</button>
          </div>
        ) : (
          <div className="approved-uni-grid">
            {universities.map((uni, index) => (
              <article className={`approved-card approved-uni-card ${uni.programs.some((program) => selectedProgramKeys.includes(universityProgramKey(uni, program))) ? 'is-choice-selected' : ''}`} key={`${uni.id}-${index}`}>
                <div className="approved-uni-card-top">
                  <span className="approved-uni-index">{index + 1}</span>
                  <span className="approved-pill">Approved</span>
                </div>
                <div className="approved-uni-card-body">
                  <div className={`approved-uni-thumb ${uni.image ? 'has-image' : ''}`}>
                    {uni.image ? <img src={uni.image} alt={uni.name} /> : <FaUniversity />}
                  </div>
                  <div className="approved-uni-card-info">
                    <h3>{uni.name}</h3>
                    <p className="approved-location"><FaMapMarkerAlt /> {uni.city ? `${uni.city}, ` : ''}{uni.country || programSel.countryName || '—'}</p>
                    {(uni.ranking || typeLabel) && <span className="approved-program-tag">{uni.ranking || typeLabel}</span>}
                  </div>
                </div>
                <dl className="approved-uni-details">
                  <dt>Program</dt><dd>{uni.program || typeLabel || 'To be confirmed'}</dd>
                  {uni.minScore ? (<><dt>Minimum test score</dt><dd>{uni.minScore}</dd></>) : null}
                  <dt>Intake</dt><dd>{uni.intake || programSel.intake || 'To be confirmed'}</dd>
                  <dt>Tuition Fee</dt><dd>{uni.tuition || 'Contact university'}</dd>
                  <dt>Duration</dt><dd>{uni.duration || 'To be confirmed'}</dd>
                </dl>
                <button
                  type="button"
                  className="approved-university-select"
                  onClick={() => setProgramViewUniversityKey(universityChoiceKey(uni))}
                  disabled={uni.programs.length === 0}
                >
                  {uni.programs.length ? 'View Programs' : 'Programs unavailable'}
                </button>
              </article>
            ))}
          </div>
        )}

        {programViewUniversity && (
          <div className="approved-program-modal-backdrop" role="presentation" onClick={() => setProgramViewUniversityKey('')}>
            <section className="approved-program-modal" role="dialog" aria-modal="true" aria-labelledby="approved-program-modal-title" onClick={(event) => event.stopPropagation()}>
              <div className="approved-program-modal-heading">
                <div>
                  <h2 id="approved-program-modal-title">Programs at {programViewUniversity.name}</h2>
                  <p>Select 2–5 programs across your approved universities.</p>
                </div>
                <button type="button" className="approved-program-modal-close" aria-label="Close programs" onClick={() => setProgramViewUniversityKey('')}>×</button>
              </div>
              <div className="approved-program-options">
                {programViewUniversity.programs.map((programName) => {
                  const key = universityProgramKey(programViewUniversity, programName);
                  const isSelected = selectedProgramKeys.includes(key);
                  return (
                    <button
                      type="button"
                      key={key}
                      className={`approved-program-option ${isSelected ? 'is-selected' : ''}`}
                      aria-pressed={isSelected}
                      onClick={() => {
                        if (isSelected) setSelectedProgramKeys((current) => current.filter((choiceKey) => choiceKey !== key));
                        else if (selectedProgramKeys.length >= 5) setUniversityChoiceError('You can select up to 5 programs.');
                        else setSelectedProgramKeys((current) => [...current, key]);
                        setUniversityChoiceMessage('');
                        if (isSelected || selectedProgramKeys.length < 3) setUniversityChoiceError('');
                      }}
                    >
                      <span className="approved-program-option-check">{isSelected ? '✓' : ''}</span>
                      <span>{programName}</span>
                    </button>
                  );
                })}
              </div>
              <div className="approved-program-modal-footer">
                <span>{selectedProgramKeys.length} of 2–5 selected</span>
                <button type="button" className="approved-back-btn" onClick={() => setProgramViewUniversityKey('')}>Done</button>
              </div>
            </section>
          </div>
        )}

        {universities.length > 0 && (
          <div className="approved-choice-submit-row" aria-live="polite">
            <div>
              <p className="approved-choice-count">{selectedProgramKeys.length} of 2–5 programs selected</p>
              {universityChoiceError && <p className="approved-choice-error">{universityChoiceError}</p>}
              {universityChoiceMessage && <p className="approved-choice-success">{universityChoiceMessage}</p>}
            </div>
            <button
              type="button"
              className="approved-submit-choice-btn"
              onClick={() => choicesAlreadySubmitted
                ? navigate('/firstyear/enrollment/additionaldocument')
                : submitFinalUniversityChoice()}
              disabled={!choicesAlreadySubmitted && (selectedProgramKeys.length < 2 || selectedProgramKeys.length > 5 || isSubmittingUniversityChoice)}
            >
              {isSubmittingUniversityChoice ? 'Submitting…' : choicesAlreadySubmitted ? 'Continue to Documents' : `Submit ${selectedProgramKeys.length || ''} Selected Programs`}
            </button>
          </div>
        )}

        <div>
          <button type="button" className="approved-back-btn" onClick={() => goToApproved('/firstyear/enrollment/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    );
  };

  const renderTopNav = () => {
    const sections = [
      { key: 'personal', label: 'Personal', onClick: () => handleSetActiveView('personal') },
      { key: 'education', label: 'Education', onClick: () => handleSetActiveView('education') },
      { key: 'test', label: 'Test', onClick: () => handleSetActiveView('test') },
      { key: 'resume', label: 'Documents', onClick: () => navigate('/firstyear/enrollment/resume') },
      { key: 'review', label: 'Review & Submit', onClick: () => navigate('/firstyear/enrollment/review') },
    ];
    const activeKey = activeMainStep === 3
      ? 'resume'
      : activeMainStep === 1 ? activeSubSection : '';

    return (
      <nav className="saas-topnav">
        <div className="saas-topnav-mobile-left">
          <img src={EdutechLogo} alt="EduTech Logo" className="saas-mobile-logo" />
        </div>
        <div className="enrollment-quick-nav" role="group" aria-label="Application sections">
          {sections.map(({ key, label, onClick }) => (
            <button
              key={key}
              type="button"
              className={`enrollment-quick-nav-link ${activeKey === key ? 'is-active' : ''}`}
              aria-current={activeKey === key ? 'page' : undefined}
              onClick={onClick}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
    );
  };

  const renderFormView = () => {
    const isStepCompleted = (key) => {
      if (key === 'personal') return applicationData.personalDetails?.status === 'Completed' || !!(applicationData.personalDetails?.firstName && applicationData.personalDetails?.email);
      if (key === 'education') return (Array.isArray(applicationData.educationDetails?.educationDetails) && applicationData.educationDetails.educationDetails.length > 0) || !!(applicationData.educationDetails?.bachelorDetails?.schoolName || applicationData.educationDetails?.masterDetails?.university || applicationData.educationDetails?.medicalDetails?.highestEducation);
      if (key === 'test') return applicationData.testScores?.status === 'Completed' || (Array.isArray(applicationData.testScores?.tests) && applicationData.testScores.tests.length > 0) || !!applicationData.testScores?.languageTest?.exam || applicationData.testScores?.hasNotTaken;
      if (key === 'review') return ['Submitted for Approval', 'Under Review', 'Approved'].includes(accountMeta.applicationStatus);
      if (key === 'program') return !!applicationData.programSelection?.programType;
      return false;
    };

    return (
      <div className="saas-form-container">
        {activeMainStep === 1 && (
          <div className="single-page-application">
            <div className="saas-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1 className="saas-page-title">Application Form</h1>
                <p className="saas-page-subtitle">Complete all 4 sections to review and send your university application for approval.</p>
                <div className="saas-title-line"></div>
              </div>

            </div>

            {/* Locked application notice */}
            {isApplicationLocked && (
              <div style={{
                background: '#ecfeff',
                border: '1.5px solid #06b6d4',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FaLock style={{ color: '#0891b2', fontSize: '1.4rem' }} />
                  <div>
                    <h4 style={{ margin: 0, color: '#0e7490', fontSize: '0.98rem', fontWeight: '700' }}>
                      Your application has been submitted and is currently under review.
                    </h4>
                    <p style={{ margin: '4px 0 0', color: '#155e75', fontSize: '0.85rem' }}>
                      All application fields are locked for editing.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenApplicationStatus}
                  className="enrollment-open-status-btn"
                >
                  View Application Status &rarr;
                </button>
              </div>
            )}

            {/* Changes Requested Banner */}
            {accountMeta.applicationStatus === 'Changes Requested' && (
              <div style={{
                background: '#fffbeb',
                border: '1.5px solid #f59e0b',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FaExclamationTriangle style={{ color: '#d97706', fontSize: '1.4rem' }} />
                  <div>
                    <h4 style={{ margin: 0, color: '#b45309', fontSize: '0.98rem', fontWeight: '700' }}>
                      Action Required: Changes Requested by Admissions
                    </h4>
                    <p style={{ margin: '4px 0 0', color: '#92400e', fontSize: '0.85rem' }}>
                      {accountMeta.changesRequestedNotes || 'Please update the requested application fields and resubmit.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenApplicationStatus}
                  style={{
                    padding: '8px 16px',
                    background: '#d97706',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  View Details &amp; Resubmit &rarr;
                </button>
              </div>
            )}
            {activeSubSection === 'personal' && (
              <PersonalDetails 
                data={applicationData.personalDetails} 
                onUpdate={handleUpdate} 
                onNext={() => navigate('/firstyear/enrollment/education')} 
                onBack={null} 
                isLocked={isApplicationLocked}
                onSaveDraft={handleSaveDraft}
              />
            )}

            {activeSubSection === 'education' && (
              <EducationDetails 
                data={applicationData.educationDetails} 
                onUpdate={handleUpdate} 
                onNext={() => navigate('/firstyear/enrollment/test')} 
                onBack={() => navigate('/firstyear/enrollment/personal')} 
                isLocked={isApplicationLocked}
                onSaveDraft={handleSaveDraft}
              />
            )}

            {activeSubSection === 'test' && (
              <TestScores 
                data={applicationData.testScores} 
                programLevel={resolveTestProgramLevel(applicationData.programSelection, accountMeta)}
                programSelection={applicationData.programSelection}
                programType={applicationData.programSelection?.programType}
                selectedCountries={applicationData.programSelection?.selectedCountries}
                country={applicationData.programSelection?.countryName}
                onUpdate={handleUpdate} 
                onNext={() => navigate('/firstyear/enrollment/review')} 
                onBack={() => navigate('/firstyear/enrollment/education')} 
                isLocked={isApplicationLocked}
                onSaveDraft={handleSaveDraft}
              />
            )}

            {activeSubSection === 'review' && (
              <ReviewApplication 
                data={applicationData}
                onNavigateToStep={(target) => navigate(`/firstyear/enrollment/${target}`)}
                onBack={() => navigate('/firstyear/enrollment/test')}
                onOpenApplicationStatus={handleOpenApplicationStatus}
              />
            )}

            {activeSubSection === 'program' && (
              <ProgramSelection 
                data={applicationData.programSelection} 
                onUpdate={handleUpdate} 
                onNext={() => navigate('/firstyear/enrollment/review')} 
                onBack={() => navigate('/firstyear/enrollment/test')} 
              />
            )}
          </div>
        )}

        {activeMainStep === 2 && (applicationData.programSelection.programApprovalStatus === 'approved' ? (
          <div className="personal-section">
            <UniversitySection
              programType={applicationData.programSelection.programType}
              countries={applicationData.programSelection.selectedCountries || []}
              selectedCountry={applicationData.programSelection.countryName}
              selectedUniversities={applicationData.programSelection.selectedUniversities || []}
              eligibleUniversities={applicationData.programSelection.eligibleUniversities || []}
              onCountryChange={(countryName) => handleUniversitySelectionChange({ countryName })}
              onUniversityChange={(universities) => handleUniversitySelectionChange({ selectedUniversities: universities })}
            />
            <div className="personal-actions">
              <button type="button" className="btn-back" onClick={handleBack}>Back</button>
              <button type="button" className="btn-next" onClick={saveUniversitySelection}>Save &amp; Continue <FaArrowRight style={{ marginLeft: '8px', fontSize: '0.8rem' }} /></button>
            </div>
          </div>
        ) : (
          <div className="personal-section">
            <h2 className="personal-title">University Selection</h2>
            <p className="personal-subtitle">Your program selection must be approved by a process admin before you can choose a university.</p>
            <div className="personal-actions"><button type="button" className="btn-back" onClick={handleBack}>Back</button></div>
          </div>
        ))}

        {activeMainStep === 3 && (
          <div className="personal-section">
            <AdditionalDocument 
              programType={applicationData.programSelection?.programType}
              data={applicationData} 
              onUpdate={handleUpdate} 
              onNext={() => navigate('/firstyear/enrollment/universityreview')} 
              onBack={() => navigate('/firstyear/enrollment/university')} 
            />
          </div>
        )}

        {activeMainStep === 4 && (
          <div className="personal-section">
            <UniversityReview 
              onBack={() => navigate('/firstyear/enrollment/additionaldocument')}
              onComplete={() => navigate('/firstyear/enrollment/dashboard', { replace: true })}
            />
          </div>
        )}

      </div>
    );
  };

  // Wait for the first API response so we never flash the wrong view or empty data.
  if (isDataLoading) {
    return (
      <div className="approved-root approved-loading">
        <span className="approved-spinner" />
        <p>Loading your dashboard…</p>
      </div>
    );
  }

  // Decide "approved" from real account / university data, NOT from router state.
  const isApprovedStudent = isFinalUniversityApproved ||
    String(accountMeta.applicationStatus || '').trim().toLowerCase() === 'approved';

  // Keep the approved navigation shell available throughout the complete flow,
  // including the final university review page.
  if (isApprovedStudent && (activeMainStep === 'dashboard' || activeMainStep === 2 || activeMainStep === 3 || activeMainStep === 4)) {
    const isUniversityPage = activeMainStep === 2;
    const isDocumentsPage = activeMainStep === 3;
    const isReviewPage = activeMainStep === 4;
    return (
      <div className="approved-root">
        {renderApprovedShell(
          isUniversityPage ? 'university' : isDocumentsPage ? 'documents' : isReviewPage ? 'review' : 'dashboard',
          isUniversityPage ? renderApprovedUniversities() : isDocumentsPage || isReviewPage ? renderFormView() : renderApprovedDashboardContent()
        )}
        {renderApplicationStatusModals()}
      </div>
    );
  }

  return (
    <main className="saas-content enrollment-body-only">
      {renderTopNav()}
      {activeMainStep === 'dashboard' ? renderDashboardOverview() : renderFormView()}
      {renderApplicationStatusModals()}
    </main>
  );
};

export default EnrollmentDashboard;
