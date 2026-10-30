import React, { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import { useNavigate, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import './Dashboard.css';
import DashboardLayout from './DashboardLayout';
import { FaHeadset } from 'react-icons/fa';
import { openSupportHelpdesk } from './supportHelpdesk';
const ChatWidget = lazy(() => import('./Chatbot/ChatWidget'));
const ApplicationProgressPage = lazy(() => import('./ApplicationProgressPage'));

const DashboardRouteFallback = () => (
  <div className="dashboard-loading">
    <div className="dashboard-loading__spinner"></div>
    <p>Loading section...</p>
  </div>
);


/* ----------------------------------------------------------
   LOCK UTILITY
---------------------------------------------------------- */
const getUnlockedAppType = () => {
  try { return localStorage.getItem('unlockedApplicationType') || null; }
  catch { return null; }
};

const hasValidSelectedCourse = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw === "undefined" || raw === "null") return false;
    const data = JSON.parse(raw);

    const universityId =
      data.universityId || data.UNITID || data.id || data.collegeId ||
      data.collegeData?._id || data.collegeData?.UNITID;

    const universityName =
      data.universityName || data.university || data.INSTNM || data.name ||
      data.collegeData?.universityName || data.collegeData?.INSTNM;

    const course =
      data.selectedCourse || data.course || data.program ||
      data.programDetails || data.selectedCourses?.[0];

    return Boolean(universityId && universityName && course);
  } catch {
    return false;
  }
};

const getUniversityName = (uni = {}) =>
  uni.name ||
  uni.university ||
  uni.universityName ||
  uni.INSTNM ||
  uni.collegeData?.name ||
  uni.collegeData?.university ||
  uni.collegeData?.universityName ||
  uni.collegeData?.INSTNM ||
  'Unknown University';

const getUniversityLocation = (uni = {}) =>
  uni.location?.display ||
  uni.location?.country ||
  (typeof uni.location === 'string' ? uni.location : '') ||
  uni.country ||
  uni.COUNTRY ||
  uni.collegeData?.location?.display ||
  uni.collegeData?.location?.country ||
  (typeof uni.collegeData?.location === 'string' ? uni.collegeData.location : '') ||
  uni.collegeData?.country ||
  uni.collegeData?.COUNTRY ||
  'Location not specified';

const getCollegeId = (college = {}) =>
  college.id ||
  college.unitid ||
  college.UNITID ||
  college._id ||
  college.collegeId ||
  college.collegeData?.UNITID ||
  college.collegeData?._id ||
  null;

const normalizeSelectedUniversity = (uni = {}) => {
  const id = getCollegeId(uni);
  const name = getUniversityName(uni);
  const location = getUniversityLocation(uni);

  return {
    ...uni,
    id,
    collegeId: id,
    UNITID: id,
    INSTNM: name,
    name,
    location,
    selectedCourses: uni.selectedCourses || [],
  };
};

const buildCourseNavigationCollege = (college = {}, collegeId) => {
  const name = getUniversityName(college);
  const courseCollege = {
    ...college,
    ...(college.collegeData || {}),
    UNITID: collegeId,
    INSTNM: name,
    selectedCourses: college.selectedCourses || [],
  };

  return courseCollege;
};

const openCollegeCourses = (navigate, basePath, college = {}) => {
  const collegeId = getCollegeId(college);
  if (!collegeId) return;

  const courseCollege = buildCourseNavigationCollege(college, collegeId);
  const sameObject = {
    ...courseCollege,
    UNITID: collegeId,
    INSTNM: getUniversityName(courseCollege),
    selectedCourses: courseCollege.selectedCourses || []
  };

  localStorage.setItem(`university_${collegeId}`, JSON.stringify(sameObject));
  localStorage.setItem('currentUniversity', JSON.stringify(sameObject));

  if (sameObject.selectedCourses?.length) {
    localStorage.setItem(
      `university_courses_${collegeId}`,
      JSON.stringify(sameObject.selectedCourses)
    );
  }

  navigate(`${basePath}/courses/${collegeId}`, {
    state: {
      university: sameObject,
      selectedCourses: sameObject.selectedCourses || []
    }
  });
};

const LockTooltip = ({ visible, onClose, appType, onGoToSearch }) => {
  if (!visible) return null;
  const isUniversity = appType === 'university';
  return (
    <div className="lock-overlay" onClick={onClose}>
      <div className="lock-modal" onClick={e => e.stopPropagation()}>
        <button className="lock-modal__close" onClick={onClose} aria-label="Close">&times;</button>
        <div className="lock-modal__icon"></div>
        <h3 className="lock-modal__title">
          {isUniversity ? 'University Application Locked' : 'Master Application Locked'}
        </h3>
        <p className="lock-modal__desc">
          To unlock the{' '}
          <strong>{isUniversity ? 'University Application' : 'Master Application'}</strong>,
          go to <strong>College Search</strong>, select a{' '}
          {isUniversity ? "bachelor's" : "master's"} university, and choose a program.
        </p>
        <div className="lock-modal__actions">
          <button
            className="lock-modal__btn lock-modal__btn--primary"
            onClick={() => { onClose(); onGoToSearch(); }}
          >
            Go to College Search
          </button>
        </div>
      </div>
    </div>
  );
};

/* -- Circular Progress Ring -- */
const safeGetLocalStorage = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getApplicationStorageKey = (studentId) =>
  studentId ? `gusApplicationData_${studentId}` : 'gusApplicationData';

const getLocalApplicationData = (studentId) => {
  const scopedData = studentId ? safeGetLocalStorage(getApplicationStorageKey(studentId)) : null;
  const legacyData = safeGetLocalStorage('gusApplicationData');

  if (scopedData && legacyData) return { ...legacyData, ...scopedData };
  return scopedData || legacyData || null;
};

const getMasterApplicationStorageKey = (studentId) =>
  studentId ? `masterApplicationData_${studentId}` : 'masterApplicationData';

const getLocalMasterApplicationData = (studentId) => {
  const scopedData = studentId ? safeGetLocalStorage(getMasterApplicationStorageKey(studentId)) : null;
  const legacyData = safeGetLocalStorage('masterApplicationData');

  if (scopedData && legacyData) return { ...legacyData, ...scopedData };
  return scopedData || legacyData || null;
};

const APPLICATION_PROGRESS_ALIASES = {
  personal: ['personal'],
  address: ['address'],
  universitySelect: ['universitySelect', 'university-select'],
  'university-select': ['universitySelect', 'university-select'],
  specialNeeds: ['specialNeeds', 'special-needs'],
  'special-needs': ['specialNeeds', 'special-needs'],
  education: ['education'],
  documents: ['documents'],
  testScores: ['testScores', 'test-scores'],
  'test-scores': ['testScores', 'test-scores'],
  preview: ['preview'],
};

const APPLICATION_SECTION_PROGRESS_KEYS = [
  'personal',
  'address',
  'universitySelect',
  'specialNeeds',
  'education',
  'documents',
  'testScores',
  'preview',
];

const getProgressValue = (progress = {}, key) => {
  const aliases = APPLICATION_PROGRESS_ALIASES[key] || [key];
  for (const alias of aliases) {
    if (progress?.[alias] !== undefined && progress?.[alias] !== null) return Number(progress[alias]) || 0;
  }
  return 0;
};

const calculateSidebarApplicationProgress = (progress = {}) => {
  const total = APPLICATION_SECTION_PROGRESS_KEYS.reduce((sum, key) => sum + getProgressValue(progress, key), 0);
  return Math.round(total / APPLICATION_SECTION_PROGRESS_KEYS.length);
};

const mergeApplicationProgress = (existingProgress = {}, updates = {}, source = 'applicationProgress update') => {
  const before = { ...(existingProgress || {}) };
  delete before.profile;
  delete before.family;
  const expandedUpdates = {};

  Object.entries(updates || {}).forEach(([key, value]) => {
    const aliases = APPLICATION_PROGRESS_ALIASES[key] || [key];
    aliases.forEach(alias => {
      expandedUpdates[alias] = value;
    });
  });

  const updatedProgress = {
    ...before,
    ...expandedUpdates,
  };
  delete updatedProgress.profile;
  delete updatedProgress.family;

  const hasSectionProgress = APPLICATION_SECTION_PROGRESS_KEYS.some(key => {
    const aliases = APPLICATION_PROGRESS_ALIASES[key] || [key];
    return aliases.some(alias => updatedProgress[alias] !== undefined && updatedProgress[alias] !== null);
  });

  if (updates.application === undefined || hasSectionProgress) {
    updatedProgress.application = calculateSidebarApplicationProgress(updatedProgress);
  }

  console.log(`${source} Before:`, before);
  console.log(`${source} After:`, updatedProgress);
  return updatedProgress;
};

const ProgressRing = ({ percent = 0, size = 80 }) => {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0891b2" />
            <stop offset="100%" stopColor="#0e7490" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="url(#ringGrad)" strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x={size / 2} y={size / 2 + 5}
          textAnchor="middle" fontSize={size * 0.2}
          fontWeight="700" fill="#0f172a"
        >
          {Math.round(percent)}%
        </text>
      </svg>
    </div>
  );
};

/* ----------------------------------------------------------
   MAIN DASHBOARD
---------------------------------------------------------- */
const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMainSection] = useState('dashboard');
  const [userColleges, setUserColleges] = useState([]);
  const [applicationProgress, setApplicationProgress] = useState(0);
  const [selectedCourseData, setSelectedCourseData] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [masterAppProgress, setMasterAppProgress] = useState(0);
  const [, setUnlockedAppType] = useState(getUnlockedAppType);
  const [lockTooltip, setLockTooltip] = useState({ visible: false, appType: null });

  const isFirstYear = location.pathname.includes('/firstyear/');
  const basePath = isFirstYear ? '/firstyear/dashboard' : '/transfer/dashboard';

  const calculateLocalApplicationProgress = (appData) => {
    if (!appData) return 0;
    let completedFields = 0, totalFields = 0;
    const isFieldFilled = (v) => {
      if (v === null || v === undefined) return false;
      if (typeof v === 'string') return v.trim() !== '';
      if (typeof v === 'boolean') return true;
      if (typeof v === 'number') return true;
      if (typeof v === 'object') {
        if (v.grade9 || v.grade10 || v.grade11 || v.grade12 || v.satTotal || v.act || v.toefl || v.ielts) return true;
        return Object.keys(v).length > 0;
      }
      return !!v;
    };

    const isAnyFieldFilled = (fields) => fields.some(f => isFieldFilled(appData[f]));
    const countFields = (fields) =>
      fields.forEach(f => {
        totalFields++;
        if (Array.isArray(f) ? isAnyFieldFilled(f) : isFieldFilled(appData[f])) completedFields++;
      });

    countFields([
      'firstName',
      'lastName',
      'email',
      'dateOfBirth',
      'placeOfBirth',
      'countryOfBirth',
      'citizenship',
      'passportNumber',
      'passportIssueDate',
      'passportExpiryDate',
      'issuingCountry',
      'mobile',
      'correspondenceLanguage',
      ['passportFileName', 'passportOriginalName'],
      ['photographFileName', 'photographOriginalName']
    ]);
    totalFields++; if (Array.isArray(appData.applicationUniversities) && appData.applicationUniversities.length > 0) completedFields++;
    countFields([
      ['currentAddress', 'streetAndHouseNumber'],
      'city',
      'country',
      ['state', 'stateProvince'],
      ['postalCode', 'postcode']
    ]);
    totalFields++; if (isFieldFilled(appData['hasSpecialNeeds'])) completedFields++;
    if (appData.hasSpecialNeeds === 'yes') { totalFields++; if (isFieldFilled(appData.specialNeedsDescription)) completedFields++; }
    countFields(['qualificationLevel', 'institutionName', 'boardUniversity', 'countryOfStudy', 'startYear', 'endYear', 'educationCity', 'wasEnrolled', 'isCurrentlyEnrolled', 'educationEntries']);
    totalFields++; if (isFieldFilled(appData['scores'])) completedFields++;
    countFields(['sopFileName', 'lor1FileName', 'lor2FileName', 'portfolioFileName', 'researchProposalFileName']);
    return Math.round((completedFields / totalFields) * 100);
  };

  const calculateMasterApplicationProgress = (masterData) => {
    if (!masterData) return 0;
    let totalSections = 0, completedSections = 0;
    const hasPersonalComplete = (personal = {}) => !!(
      personal.fullName &&
      personal.dateOfBirth &&
      personal.gender &&
      personal.nationality &&
      personal.passportNumber &&
      personal.maritalStatus
    );
    const hasContactComplete = (contact = {}) => (
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.emailAddress || contact.email || '') &&
      /^\+?\d{8,15}$/.test(contact.mobileNumber || '') &&
      /^[A-Za-z0-9\s,/-]+$/.test(contact.addressLine1 || '') &&
      /^[A-Za-z\s-]+$/.test(contact.city || '') &&
      /^[A-Za-z\s-]+$/.test(contact.state || '') &&
      !!(contact.country || '').trim() &&
      !!(contact.postalCode || '').trim()
    );
    const sections = ['personal', 'contact', 'course', 'academic', 'tests', 'documents', 'declaration'];
    sections.forEach(section => {
      totalSections++;
      const sd = masterData[section];
      if (section === 'personal' && hasPersonalComplete(sd)) completedSections++;
      else if (section === 'contact' && hasContactComplete(sd)) completedSections++;
      else if (sd && sd._isValid === true) completedSections++;
      else if (section === 'tests') completedSections++;
      else if (section === 'documents') completedSections++;
      else if (sd && Object.keys(sd).length > 0 && sd._isValid !== false) {
        if (Object.keys(sd).some(k => k !== '_isValid' && sd[k])) completedSections += 0.5;
      }
    });
    return Math.round((completedSections / totalSections) * 100);
  };

const refreshUserData = useCallback(async () => {
  try {
  const token = localStorage.getItem('token'); // ? keep for null check
if (!token) { navigate('/sign-in'); return; }
const response = await axiosInstance.get('/api/students/me');
      if (response.data.success && response.data.account) {
        const user = response.data.account;
        const gusApplicationData = getLocalApplicationData(user._id);
        let appProgress = 0;
        if (gusApplicationData) {
          appProgress = calculateLocalApplicationProgress(gusApplicationData);
        }
        let masterProgress = 0;
        const masterAppData = getLocalMasterApplicationData(user._id);
        if (masterAppData) {
          try {
            masterProgress = calculateMasterApplicationProgress(masterAppData);
            setMasterAppProgress(masterProgress);
          } catch (e) {}
        }
        const selectedCourse = localStorage.getItem('selectedCourseForApplication');
        if (selectedCourse) {
          try { setSelectedCourseData(JSON.parse(selectedCourse)); } catch (e) {}
        }
        const storedUserData = safeGetLocalStorage('userData') || {};
        const mergedApplicationProgress = mergeApplicationProgress(
          {
            ...(user.applicationProgress || {}),
            ...(storedUserData.applicationProgress || {}),
          },
          { application: appProgress, masterApplication: masterProgress },
          'refreshUserData applicationProgress'
        );
        const nextUserData = {
          ...user,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          studentId: user._id ? `CAID ${user._id.toString().slice(-8).toUpperCase()}` : 'CAID 48555228',
          firstName: user.firstName,
          lastName: user.lastName,
          educationProgress: getProgressValue(mergedApplicationProgress, 'education'),
          writingProgress: mergedApplicationProgress.writing || 0,
          activitiesProgress: mergedApplicationProgress.activities || 0,
          applicationProgress: mergedApplicationProgress,
        };
        setUserData(nextUserData);
        localStorage.setItem('userData', JSON.stringify(nextUserData));
        setApplicationProgress(mergedApplicationProgress.application || 0);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  }, [navigate]);

  const fetchUserColleges = useCallback(async () => {
    try {
    const token = localStorage.getItem('token'); // ? keep for null check
      if (!token) return;
      const response = await axiosInstance.get('/api/user/profile');
      const selected = response.data?.data?.selectedUniversities || [];
      setUserColleges(selected.map(normalizeSelectedUniversity));
    } catch (error) {
      console.error('Error fetching user colleges:', error);
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    await refreshUserData();
    await fetchUserColleges();
  }, [refreshUserData, fetchUserColleges]);


  const handleCourseSelection = (courseData) => {
    const level = (courseData?.programDetails?.level || '').toLowerCase();
    const isMaster = level === 'master' || localStorage.getItem('selectedMasterCourseForApplication') !== null;
    if (isMaster) {
      localStorage.setItem('selectedMasterCourseForApplication', JSON.stringify(courseData));
      localStorage.setItem('unlockedApplicationType', 'master');
      localStorage.removeItem('selectedCourseForApplication');
      setUnlockedAppType('master');
      navigate(`${basePath}/master-application/overview`, {
        state: { fromCoursesPage: true, courseData, isMasterApplication: true }
      });
    } else {
      setSelectedCourseData(courseData);
      localStorage.setItem('selectedCourseForApplication', JSON.stringify(courseData));
      localStorage.setItem('unlockedApplicationType', 'bachelor');
      setUnlockedAppType('bachelor');
      navigate(`${basePath}/application/overview`, { state: { fromCoursesPage: true, courseData } });
    }
  };

  const handleMasterApplicationUpdate = useCallback(() => {
    const masterAppData = getLocalMasterApplicationData(userData?._id);
    if (masterAppData) {
      try {
        const progress = calculateMasterApplicationProgress(masterAppData);
        setMasterAppProgress(progress);
        if (userData) {
          setUserData(prev => {
            const updatedProgress = mergeApplicationProgress(
              prev?.applicationProgress || {},
              { masterApplication: progress },
              'handleMasterApplicationUpdate applicationProgress'
            );
            const nextUserData = {
              ...prev,
              applicationProgress: updatedProgress,
            };
            localStorage.setItem('userData', JSON.stringify(nextUserData));
            return nextUserData;
          });
        }
      } catch (e) {}
    }
  }, [userData]);

  useEffect(() => {
    const recalculateLocalApplicationProgress = () => {
      const gusApplicationData = getLocalApplicationData(userData?._id);
      if (gusApplicationData) {
        try {
          const progress = calculateLocalApplicationProgress(gusApplicationData);
          setApplicationProgress(progress);
          if (userData) {
            setUserData(prev => {
              const updatedProgress = mergeApplicationProgress(
                prev?.applicationProgress || {},
                { application: progress },
                'recalculateLocalApplicationProgress applicationProgress'
              );
              const nextUserData = {
                ...prev,
                applicationProgress: updatedProgress,
              };
              localStorage.setItem('userData', JSON.stringify(nextUserData));
              return nextUserData;
            });
          }
        } catch (e) {}
      }
    };

    const handleAppUpdate = () => {
      recalculateLocalApplicationProgress();
    };

    const handleApplicationSectionUpdate = (event) => {
      const detail = event.detail || {};
      const section = detail.section || detail.subsection;
      const percentage = detail.percentage ?? detail.completionPercentage;

      if (section && percentage !== undefined) {
        setUserData(prev => {
          if (!prev) return prev;
          const updatedProgress = mergeApplicationProgress(
            prev.applicationProgress || {},
            { [section]: percentage },
            `applicationSectionUpdated:${section}`
          );
          setApplicationProgress(updatedProgress.application || 0);
          const nextUserData = {
            ...prev,
            applicationProgress: updatedProgress,
          };
          localStorage.setItem('userData', JSON.stringify(nextUserData));
          return nextUserData;
        });

        try {
          const parsedUserData = safeGetLocalStorage('userData');
          if (parsedUserData) {
            const updatedProgress = mergeApplicationProgress(
              parsedUserData.applicationProgress || {},
              { [section]: percentage },
              `localStorage applicationSectionUpdated:${section}`
            );
            localStorage.setItem('userData', JSON.stringify({
              ...parsedUserData,
              applicationProgress: updatedProgress,
            }));
          }
        } catch (error) {}
      }
    };

    window.addEventListener('applicationUpdated', handleAppUpdate);
    window.addEventListener('applicationSectionUpdated', handleApplicationSectionUpdate);
    window.addEventListener('masterApplicationUpdated', handleMasterApplicationUpdate);
    return () => {
      window.removeEventListener('applicationUpdated', handleAppUpdate);
      window.removeEventListener('applicationSectionUpdated', handleApplicationSectionUpdate);
      window.removeEventListener('masterApplicationUpdated', handleMasterApplicationUpdate);
    };
  }, [handleMasterApplicationUpdate]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
       const token = localStorage.getItem('token');
if (!token) { navigate('/sign-in'); return; }
const response = await axiosInstance.get('/api/students/me');
        if (response.data.success && response.data.account) {
          const user = response.data.account;
          const gusApplicationData = getLocalApplicationData(user._id);
          let appProgress = 0;
          if (gusApplicationData) {
            appProgress = calculateLocalApplicationProgress(gusApplicationData);
          }
          const masterAppData = getLocalMasterApplicationData(user._id);
          let masterProgress = 0;
          if (masterAppData) {
            try {
              masterProgress = calculateMasterApplicationProgress(masterAppData);
              setMasterAppProgress(masterProgress);
            } catch (e) {}
          }
          const selectedCourse = localStorage.getItem('selectedCourseForApplication');
          if (selectedCourse) {
            try { setSelectedCourseData(JSON.parse(selectedCourse)); } catch (e) {}
          }
          const storedUserData = safeGetLocalStorage('userData') || {};
          const mergedApplicationProgress = mergeApplicationProgress(
            {
              ...(user.applicationProgress || {}),
              ...(storedUserData.applicationProgress || {}),
            },
            {
              application: appProgress,
              masterApplication: masterProgress,
            },
            'fetchUserProfile applicationProgress'
          );
          const nextUserData = {
            ...user,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            studentId: user._id ? `CAID ${user._id.toString().slice(-8).toUpperCase()}` : 'CAID 48555228',
            firstName: user.firstName,
            lastName: user.lastName,
            educationProgress: getProgressValue(mergedApplicationProgress, 'education'),
              writingProgress: mergedApplicationProgress.writing || 0,
            activitiesProgress: mergedApplicationProgress.activities || 0,
            applicationProgress: mergedApplicationProgress,
            };
          setUserData(nextUserData);
          localStorage.setItem('userData', JSON.stringify(nextUserData));
          setApplicationProgress(mergedApplicationProgress.application || 0);
        }
      } catch (error) {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData && storedUserData !== 'undefined') {
          try {
            const parsedData = JSON.parse(storedUserData);
            setUserData(parsedData);
            const gusApplicationData = getLocalApplicationData(parsedData?._id);
            if (gusApplicationData) {
              setApplicationProgress(calculateLocalApplicationProgress(gusApplicationData));
            }
            const masterAppData = getLocalMasterApplicationData(parsedData?._id);
            if (masterAppData) {
              try { setMasterAppProgress(calculateMasterApplicationProgress(masterAppData)); } catch (e) {}
            }
          } catch (e) {}
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUserProfile();
    fetchUserColleges();
  }, [navigate, fetchUserColleges]);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/dashboard') || path.includes('/colleges') || path.includes('/college-search')) {
      refreshAllData();
    }
  }, [location.pathname, refreshAllData]);

  useEffect(() => {
    window.addEventListener('collegesUpdated', fetchUserColleges);
    return () => window.removeEventListener('collegesUpdated', fetchUserColleges);
  }, [fetchUserColleges]);

  const handleSectionChange = (section) => {
    if (section === 'master-application' && !isMasterAppUnlocked) {
      handleLockedCardClick('master');
      return;
    }
    const routes = {
      dashboard: `${basePath}`,
      application: `${basePath}/application`,
      'master-application': `${basePath}/master-application`,
      colleges: `${basePath}/colleges`,
      family: `${basePath}/family`,
      'college-search': `${basePath}/college-search`,
    };
    if (routes[section]) { navigate(routes[section]); return; }
    navigate(basePath);
  };

  const hasMasterCourse = hasValidSelectedCourse("selectedMasterCourseForApplication");
  const hasBachelorCourse = hasValidSelectedCourse("selectedCourseForApplication");

  const isMasterAppUnlocked =
    localStorage.getItem("unlockedApplicationType") === "master" && hasMasterCourse;

  const isUniversityAppUnlocked =
    localStorage.getItem("unlockedApplicationType") === "bachelor" && hasBachelorCourse;

  const safeMasterProgress = isMasterAppUnlocked ? masterAppProgress : 0;
  const safeMedicalProgress = userData?.applicationProgress?.medicalApplication || 0;
  const safeApplicationProgress = isUniversityAppUnlocked ? applicationProgress : 0;
  const safeApplicationProgressMap = {
    ...(userData?.applicationProgress || {}),
    application: safeApplicationProgress,
    masterApplication: safeMasterProgress,
    medicalApplication: safeMedicalProgress,
  };

  const completedSections = userData?.applicationProgress
    ? Object.values(safeApplicationProgressMap).filter(p => p >= 100).length
    : 0;
  const totalSections = userData?.applicationProgress
    ? Object.keys(safeApplicationProgressMap).length
    : 0;
  const overallProgress = userData?.applicationProgress
    ? Math.round(
        Object.values(safeApplicationProgressMap).reduce((s, p) => s + p, 0) /
        Math.max(1, Object.values(safeApplicationProgressMap).length)
      )
    : 0;

  const isUniversityAppLocked = !isUniversityAppUnlocked;
  const isMasterAppLocked = !isMasterAppUnlocked;
  const handleLockedCardClick = (appType) => setLockTooltip({ visible: true, appType });

  /* -- Build applicationSections array (shared between dashboard & detail page) -- */
  const applicationSections = [
    {
      name: 'Master Application',
      progress: safeMasterProgress,
      path: `${basePath}/master-application`,
      locked: isMasterAppLocked,
      lockedFor: 'master',
      desc: 'Complete your university registration form'
    },
    {
      name: 'Medical Application',
      progress: safeMedicalProgress,
      path: `${basePath}/medical-application/overview`,
      locked: false,
      desc: 'Complete your medical university admission form'
    },
    {
      name: 'University Application',
      progress: safeApplicationProgress,
      path: `${basePath}/application/overview`,
      locked: isUniversityAppLocked,
      lockedFor: 'university',
      desc: 'Apply to universities in simple steps'
    },
  ];

  const handleSectionClick = (section) => {
    if (section.locked) { handleLockedCardClick(section.lockedFor); return; }
    if (section?.path) navigate(section.path);
  };

  /* ----------------------------------------------------------
     DASHBOARD HOME  Application Progress shown as SUMMARY BOX only.
     Clicking navigates to /applicationprogress detail page.
  ---------------------------------------------------------- */
  const DashboardHome = () => {
    return (
      <>
        <LockTooltip
          visible={lockTooltip.visible}
          appType={lockTooltip.appType}
          onClose={() => setLockTooltip({ visible: false, appType: null })}
          onGoToSearch={() => navigate(`${basePath}/college-search`)}
        />

        {/* -- Top Header -- */}
        <div className="dashboard-header">
          <div className="dashboard-header__inner">
            <div className="dashboard-header__title-group">
              <div>
                <h1 className="dashboard-header__welcome">My Application</h1>
                <p className="dashboard-header__subtitle">Track your progress and complete your application</p>
              </div>
            </div>
            <div className="dashboard-header__actions">
              <button type="button" className="dashboard-helpdesk-btn" onClick={() => openSupportHelpdesk("Dashboard")}><FaHeadset /><span>Help Desk</span></button>
            </div>
          </div>
        </div>

        <div className="dashboard-body">

          {/* -- Overall Progress Banner -- */}
          <div className="dashboard-progress-banner-new">
            <ProgressRing percent={overallProgress} size={80} />
            <div className="dashboard-banner__content-new">
              <div className="dashboard-banner__chip">
                {completedSections} of {totalSections} Sections Complete
              </div>
              <h2 className="dashboard-banner__title-new">
                {overallProgress >= 100
                  ? 'Application Complete! Ready to Submit.'
                  : overallProgress >= 50
                  ? "Keep Going! You're Making Great Progress."
                  : "Let's Get Started on Your Application!"}
              </h2>
              <p className="dashboard-banner__desc-new">
                {overallProgress >= 100
                  ? 'All sections are complete. Review your application and submit.'
                  : 'Complete the remaining sections to submit your application.'}
              </p>
            </div>
          </div>

         <div className="dashboard-three-cards-row">

  {/* -- CARD 1: My Application -- */}
  <div className="dash-info-card dash-info-card--teal">
    <div className="dash-info-card__topbar dash-info-card__topbar--teal"></div>
    <div className="dash-info-card__body">
      <div className="dash-info-card__label">MY APPLICATION</div>
      <div className="dash-info-card__inner">
        <div className="dash-info-card__icon dash-info-card__icon--teal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </div>
        <div>
          <div className="dash-info-card__value">{overallProgress}%</div>
          <div className="dash-info-card__sub">{completedSections} of {totalSections} sections complete</div>
        </div>
      </div>
      <div className="dash-info-card__start-box">
        <div className="dash-info-card__start-title">Start Your Application Here</div>
        <div className="dash-info-card__start-desc">Pick up where you left off or begin a new section.</div>
        <button
          type="button"
          className="dash-info-card__start-btn"
          onClick={() => navigate(`${basePath}/applicationprogress`)}
        >
          Continue Application &rarr;
        </button>
      </div>
    </div>
  </div>

  {/* -- CARD 2: My Colleges -- */}
  <div className="dash-info-card">
    <div className="dash-info-card__topbar dash-info-card__topbar--blue"></div>
    <div className="dash-info-card__body">
      <div className="dash-info-card__label">MY COLLEGES</div>
      <div className="dash-info-card__inner">
        <div className="dash-info-card__icon dash-info-card__icon--blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div>
          <div className="dash-info-card__value">{userColleges.length}</div>
          <div className="dash-info-card__sub">colleges added</div>
        </div>
      </div>
      {userColleges.length === 0 ? (
        <div className="dash-info-card__empty">
          <h4>No universities selected yet</h4>
          <p className="dash-info-card__empty-desc">
            Click "Search Colleges" to explore universities, search courses,
            and add your preferred programs.
          </p>
          <div className="college-steps">

          </div>
          <div className="college-tip">
            Tip: Choose universities based on your preferred course and study destination.
          </div>
          <button
            type="button"
            className="dash-info-card__start-btn"
            onClick={() => navigate(`${basePath}/college-search`)}
          >
            Search Colleges &rarr;
          </button>
        </div>
      ) : (
        <div className="dash-info-card__college-list">
          {userColleges.slice(0, 3).map(college => (
            <div
              key={college.collegeId}
              className="dash-info-card__college-item"
              onClick={() => openCollegeCourses(navigate, basePath, college)}
            >
              <div>
                <div className="dash-info-card__college-name">{college.name}</div>
                <div className="dash-info-card__college-loc">{getUniversityLocation(college)}</div>
              </div>
              <span className={`college-status college-status--${college.status || 'researching'}`}>
                {college.status || 'searching'}
              </span>
            </div>
          ))}
          {userColleges.length > 3 && (
            <button type="button" className="view-all-btn" onClick={() => navigate(`${basePath}/colleges`)}>
              View all {userColleges.length} colleges &rarr;
            </button>
          )}
        </div>
      )}
    </div>
  </div>

  {/* -- CARD 3: Quick Access -- */}
  <div className="dash-info-card">
    <div className="dash-info-card__topbar dash-info-card__topbar--purple"></div>
    <div className="dash-info-card__body">
      <div className="dash-info-card__label">QUICK ACCESS</div>
      <div className="dash-info-card__inner">
        <div className="dash-info-card__icon dash-info-card__icon--purple">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
          </svg>
        </div>
        <div>
          <div className="dash-info-card__value" style={{fontSize:'16px', color:'var(--purple)'}}>Shortcuts</div>
          <div className="dash-info-card__sub">quick links</div>
        </div>
      </div>
      <div className="dash-info-card__qa-list">
        <div
          className="dash-info-card__qa-item"
          onClick={() => navigate(`${basePath}/college-search`)}
        >
          <div className="dash-info-card__qa-icon dash-info-card__qa-icon--teal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <div>
            <div className="dash-info-card__qa-title">Explore Programs</div>
            <div className="dash-info-card__qa-sub">Browse partner universities</div>
          </div>
        </div>
        <div
          className="dash-info-card__qa-item"
          onClick={() => navigate(`${basePath}/colleges`)}
        >
          <div className="dash-info-card__qa-icon dash-info-card__qa-icon--purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </div>
          <div>
            <div className="dash-info-card__qa-title">View all colleges</div>
            <div className="dash-info-card__qa-sub">Manage college applications</div>
          </div>
        </div>
      </div>
    </div>
  </div>

</div>

          {/* -- Help & Support -- */}
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <h2 className="dashboard-card__title">Help &amp; Support</h2>
            </div>
            <div className="help-search">
              <div className="help-search-wrapper">
                <input
                  type="text"
                  placeholder="Search FAQs..."
                  className="help-search-input"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="faq-list">
              {[
                {
                  question: "How can I add a college to My colleges?",
                  answer: "Select College search from the navigation menu, browse and click 'Add to My Colleges'."
                },
                {
                  question: "I already submitted, can I change some of my answers?",
                  answer: "You can return at any time and change most answers before final submission."
                },
                {
                  question: "How many colleges can I add to My colleges list?",
                  answer: "You can add up to 20 colleges to your My Colleges list."
                },
                {
                  question: "What is the Master Application?",
                  answer: "The Master Application collects all info for university admission including personal details, course selection, academic history, test scores and documents."
                },
              ]
                .filter(faq =>
                  !searchQuery ||
                  faq.question.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((faq, i) => (
                  <div key={i} className="faq-item">
                    <div className="faq-question">{faq.question}</div>
                    <div className="faq-answer">{faq.answer}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loading__spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }


  return (
    <>
      <DashboardLayout
        userData={userData}
        activeMainSection={activeMainSection}
        onSectionChange={handleSectionChange}
        onLockedApplicationClick={handleLockedCardClick}
        userColleges={userColleges}
        onRefreshColleges={fetchUserColleges}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      >
        <Suspense fallback={<DashboardRouteFallback />}>
        <Routes>
          <Route path="/" element={DashboardHome()} />

          {/* -- NEW: Application Progress detail page -- */}
          <Route
            path="/applicationprogress"
            element={
              <ApplicationProgressPage
                applicationSections={applicationSections}
                overallProgress={overallProgress}
                completedSections={completedSections}
                totalSections={totalSections}
                onSectionClick={handleSectionClick}
                onLockedCardClick={handleLockedCardClick}
                lockTooltip={lockTooltip}
                setLockTooltip={setLockTooltip}
                basePath={basePath}
                userData={userData}
              />
            }
          />

          <Route path="/colleges" element={<CollegesSection />} />
          <Route path="/profile/*" element={<Navigate to={basePath} replace />} />
          <Route path="/family/*" element={<Navigate to={basePath} replace />} />
        </Routes>
        </Suspense>
      </DashboardLayout>
      <Suspense fallback={null}><ChatWidget /></Suspense>
    </>
  );
};

/* ----------------------------------------------------------
   COLLEGES SECTION (unchanged)
---------------------------------------------------------- */
const CollegesSection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isFirstYear = location.pathname.includes('/firstyear/');
  const basePath = isFirstYear ? '/firstyear/dashboard' : '/transfer/dashboard';
  const [userColleges, setUserColleges] = useState([]);

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await axiosInstance.get('/api/user/profile');
        const selected = response.data?.data?.selectedUniversities || [];
        setUserColleges(selected.map(normalizeSelectedUniversity));
      } catch (error) {
        console.error('Error fetching colleges:', error);
      }
    };
    fetchColleges();
    window.addEventListener('collegesUpdated', fetchColleges);
    return () => window.removeEventListener('collegesUpdated', fetchColleges);
  }, []);

  return (
    <>
      <div className="dashboard-header">
        <div className="dashboard-header__inner">
          <div className="dashboard-header__title-group">
            <div>
              <h1 className="dashboard-header__welcome">My Colleges</h1>
              <p className="dashboard-header__subtitle">
                Manage your college applications and track progress
              </p>
            </div>
          </div>
            <div className="dashboard-header__actions">
            <button type="button" className="dashboard-helpdesk-btn" onClick={() => openSupportHelpdesk("My Colleges")}><FaHeadset /><span>Help Desk</span></button>
            <button type="button" className="header-user-chip">
              <span className="header-user-chip__avatar">AA</span>
              <span className="header-user-chip__name">Account</span>
              <span className="header-user-chip__caret">&#9662;</span>
            </button>
          </div>
        </div>
      </div>
      <div className="dashboard-body">
        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <h2 className="dashboard-card__title">Your College List</h2>
            <span className="dashboard-badge">{userColleges.length} colleges</span>
          </div>
          {userColleges.length === 0 ? (
            <div className="dashboard-empty-state">
              <p>No colleges added yet</p>
              <button
                type="button"
                className="dashboard-btn dashboard-btn--primary"
                onClick={() => navigate(`${basePath}/college-search`)}
              >
                Search Colleges
              </button>
            </div>
          ) : (
            <div className="my-colleges-list">
              {userColleges.map(college => (
                <div
                  key={college.collegeId}
                  className="my-college-item"
                  onClick={() => openCollegeCourses(navigate, basePath, college)}
                >
                  <div className="my-college-item__info">
                    <h4 className="my-college-item__name">{college.name}</h4>
                    <p className="my-college-item__location">
                      {getUniversityLocation(college)}
                    </p>
                  </div>
                  <button type="button" className="view-details-btn">View Details</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;


