import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import './gusuniversity.css';
import API_BASE_URL from '../../config/api';
import { resolveFileUrl } from '../../utils/fileUrl';
import EduTechLogo from '../../assets/edutech-logo.png';

/* ─── jsPDF lazy-loader ──────────────────────────────────── */
const loadJsPDF = () =>
    new Promise((resolve, reject) => {
        if (window.jspdf) { resolve(window.jspdf.jsPDF); return; }
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s.onload  = () => resolve(window.jspdf.jsPDF);
        s.onerror = reject;
        document.head.appendChild(s);
    });

/* ─── Reusable premium detail-section (matches PDF card style) ──────── */
const isBlank = (v) => v === undefined || v === null || String(v).trim() === '' || String(v).trim() === ' ';

const getApplicationSelectionKey = (app = {}) => [
    app.source || '',
    app.applicationId || '',
    app.studentId || app.userId || app._id || app.email || '',
].join('|');

const getApplicantSelectionKey = (app = {}) =>
    getApplicationSelectionKey(app);

const DetailSection = ({ title, dotClass = 'gus-dot-blue', fields = [] }) => {
    const visible = fields.filter((f) => !isBlank(f.value));
    if (!visible.length) return null;
    return (
        <div className="review-section-card">
            <h3 className="review-card-title">
                <span className={`gus-sec-dot ${dotClass}`} style={{ marginRight: '8px' }} />
                {title}
            </h3>
            <div className="review-info-grid">
                {visible.map((f) => (
                    <div className="review-info-item" key={f.label}>
                        <span className="review-info-label">{f.label}</span>
                        <span className="review-info-val">{f.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const GusUniversity = () => {

    const [applications, setApplications] = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState(null);
    const [searchQuery, setSearchQuery]   = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const [statusDropdownUp, setStatusDropdownUp] = useState(false);
    const statusDropdownRef = useRef(null);
    const [selectedApp, setSelectedApp]   = useState(null);
    const [universityMatchesApp, setUniversityMatchesApp] = useState(null);
    const [selectedUniversityKeysByApplicant, setSelectedUniversityKeysByApplicant] = useState({});
    const universityMatchesAppKeyRef = useRef(null);
    const [savingUniversitySelection, setSavingUniversitySelection] = useState(false);
    const [universitySelectionMessage, setUniversitySelectionMessage] = useState('');
    const [pdfLoading, setPdfLoading]     = useState(null);
    const [stats, setStats]               = useState({ total: 0, approved: 0, completed: 0, incomplete: 0, underReview: 0 });
    const [docViewer, setDocViewer]       = useState(null);
    const [downloadingDoc, setDownloadingDoc] = useState(false);
    const [emailModal, setEmailModal]     = useState(null); // { app, docLabel }
    const [emailSending, setEmailSending] = useState(false);
    const [emailNote, setEmailNote]       = useState('');
    const [emailReason, setEmailReason]   = useState('incorrect_format');
    const [emailSuccess, setEmailSuccess] = useState(null);
    const [verifyModal, setVerifyModal] = useState(null);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyError, setVerifyError] = useState('');
    const [expandedModalSections, setExpandedModalSections] = useState({
        university: true,
        student: true,
        contact: false,
        family: false,
        address: false,
        passport: false,
        documents: false,
        education: false,
        scores: false,
        specialNeeds: false,
    });

    useEffect(() => {
        if (!statusDropdownOpen) return undefined;
        const closeOnOutsideClick = (event) => {
            if (!statusDropdownRef.current?.contains(event.target)) setStatusDropdownOpen(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') setStatusDropdownOpen(false);
        };
        document.addEventListener('mousedown', closeOnOutsideClick);
        document.addEventListener('touchstart', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick);
            document.removeEventListener('touchstart', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [statusDropdownOpen]);

    const toggleStatusDropdown = () => {
        if (!statusDropdownOpen && statusDropdownRef.current) {
            const rect = statusDropdownRef.current.getBoundingClientRect();
            const menuHeight = Math.min(180, window.innerHeight * 0.35);
            const spaceBelow = window.innerHeight - rect.bottom;
            setStatusDropdownUp(spaceBelow < menuHeight && rect.top > spaceBelow);
        }
        setStatusDropdownOpen((open) => !open);
    };

    const apiRef = useRef(null);
    if (!apiRef.current) {
        
        const instance = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });
        instance.interceptors.request.use((config) => {
            const token =
                localStorage.getItem('processAdminToken') ||
                localStorage.getItem('token')             ||
                localStorage.getItem('adminToken');
            if (token) config.headers.Authorization = `Bearer ${token}`;
            config.headers['Content-Type'] = 'application/json';
            return config;
        }, (err) => Promise.reject(err));
        instance.interceptors.response.use(
            (res) => res,
            (err) => {
                if (err.response?.status === 401) console.log('Auth failed');
                if (err.response?.status === 403) console.log('Forbidden');
                return Promise.reject(err);
            }
        );
        apiRef.current = instance;
    }
    const api = apiRef.current;

    const selectedUniversityKeys = selectedUniversityKeysByApplicant[
        getApplicantSelectionKey(universityMatchesApp || {})
    ] || [];
   

    /* Formatters */
    const formatDate = (d) => {
        if (!d) return ' ';
        try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
        catch { return ' '; }
    };

    const val      = (v) => (v !== undefined && v !== null && v !== '') ? v : ' ';
    const yesNo    = (v) => v === true ? 'Yes' : v === false ? 'No' : ' ';
    const capFirst = (value) => {
        if (Array.isArray(value)) {
            const formatted = value.map(item => capFirst(item)).filter(item => item !== ' ');
            return formatted.length ? formatted.join(', ') : ' ';
        }
        const s = String(value || '').trim();
        return s ? s.charAt(0).toUpperCase() + s.slice(1) : ' ';
    };
    const formatUsCitizenshipStatus = (value) => {
        const labels = {
            us_citizen_or_national: 'U.S. citizen or U.S. national',
            us_dual_citizen: 'U.S. dual citizen',
            us_permanent_resident: 'U.S. permanent resident (green card holder)',
            non_us_citizen: 'Citizen of non-U.S. country',
            us_resident: 'U.S. resident',
        };
        return labels[value] || val(value);
    };

    const formatGender = (s) => {
        const normalized = String(s || '').trim().toLowerCase();
        const labels = {
            male: 'Male',
            female: 'Female',
            other: 'Other',
            'prefer-not-to-say': 'Prefer Not To Say',
        };
        return labels[normalized] || 'Not Provided';
    };

    const getFileTypeText = (fileType) => {
        if (!fileType) return 'File';
        const t = fileType.toLowerCase();
        if (t === 'pdf') return 'PDF';
        if (['jpg','jpeg','png','webp'].includes(t)) return 'Image';
        if (['doc','docx'].includes(t)) return 'Document';
        return 'File';
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatExpectedDate = (ym) => {
        if (!ym) return null;
        try {
            const [year, month] = ym.split('-');
            return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } catch { return ym; }
    };

    const displayDash = (value) => {
        const text = String(value ?? '').trim();
        return text && text !== '?' && text !== '???' ? text : '-';
    };

    const formatIntake = (programme = {}) => {
        const value = [programme.intakeMonth, programme.intakeYear].filter(Boolean).join(' ').trim();
        return displayDash(value || programme.intake || programme.startDate);
    };

    const formatApplicationFee = (value) => {
        if (value === undefined || value === null || value === '') return '-';
        const numericValue = Number(value);
        if (Number.isFinite(numericValue)) return 'EUR ' + numericValue;
        return displayDash(value);
    };

    // Keep these helpers above status formatting: getStatusLabel is evaluated
    // during the initial render, so later const declarations are still in TDZ.
    const isFinalApplicationApproved = (app = {}) =>
        String(app.applicationStatus || '').trim().toLowerCase() === 'approved' &&
        String(app.universitySelectionStatus || '').trim().toLowerCase() === 'completed';

    const isProgramApproved = (app = {}) =>
        String(app.programApprovalStatus || '').trim().toLowerCase() === 'approved';

    const canApproveUniversitySelection = (app = {}) =>
        isProgramApproved(app) && !isFinalApplicationApproved(app) &&
        Array.isArray(app.selectedUniversities) && app.selectedUniversities.length >= 1 &&
        app.selectedUniversities.length <= 5;

    const getStatusLabel = (app) => {
        if (isFinalApplicationApproved(app)) return 'APPROVED';
        if (isProgramApproved(app) && (app.selectedUniversities || []).length > 0) return 'UNIVERSITIES SELECTED';
        if (isProgramApproved(app)) return 'AWAITING UNIVERSITIES';
        if (app.overviewStatus === 'completed'  || app.completionPercentage === 100) return 'COMPLETED';
        if (app.overviewStatus === 'in_progress' || (app.completionPercentage > 0 && app.completionPercentage < 100)) return 'IN PROGRESS';
        return 'INCOMPLETE';
    };

    const getApplicationProgressBucket = (app = {}) => {
        const accountStatus = String(app.applicationStatus || '').trim().toLowerCase();
        const overviewStatus = String(app.overviewStatus || '').trim().toLowerCase();
        // University approval is a separate workflow outcome, not an
        // application-completion state.
        if (isFinalApplicationApproved(app)) return 'approved';
        if (
            Number(app.completionPercentage) >= 100 ||
            app.isCompleted === true ||
            overviewStatus === 'completed' ||
            ['completed', 'submitted for approval', 'under review'].includes(accountStatus)
        ) return 'completed';
        if (
            Number(app.completionPercentage) > 0 ||
            overviewStatus === 'in_progress' ||
            ['changes requested', 'rejected'].includes(accountStatus)
        ) return 'inprogress';
        return 'incomplete';
    };

    const getStatusClass = (app) => {
        const s = getStatusLabel(app);
        if (s === 'APPROVED') return 'status-approved';
        if (s === 'COMPLETED')   return 'status-completed';
        if (s === 'IN PROGRESS') return 'status-inprogress';
        return 'status-incomplete';
    };

    const getInitials    = (name) => (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const avatarColors   = ['#0891b2','#0e7490','#6366f1','#8b5cf6','#10b981'];
    const getAvatarColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];

    const pickDisplayValue = (...values) => {
        for (const value of values) {
            if (typeof value === 'string' && value.trim()) return value.trim();
        }
        return ' ';
    };

    const getScoreMatchedUniversityNames = (app = {}) => {
        // Prefer the detail payload, whose bachelor matches are recalculated
        // from the score requirements. The list payload is only a fallback.
        const tests = Array.isArray(app.scores?.tests) && app.scores.tests.length
            ? app.scores.tests
            : (Array.isArray(app.testScores) ? app.testScores : []);
        const matches = tests.flatMap(test => {
            const submittedScoreText = String(test.score ?? '').replace(/,/g, '').trim();
            const submittedScore = submittedScoreText && /^\d+(?:\.\d+)?$/.test(submittedScoreText)
                ? Number(submittedScoreText)
                : NaN;
            const universities = Array.isArray(test.selectedUniversities) && test.selectedUniversities.length
                ? test.selectedUniversities
                : (Array.isArray(test.eligibleUniversities) ? test.eligibleUniversities : []);
            return universities.map(university => {
                if (typeof university === 'string') {
                    return { name: university.trim(), country: '', minimum: null, score: submittedScore };
                }
                return {
                    name: String(university?.universityName || university?.university || university?.name || '').trim(),
                    country: String(university?.country || '').trim(),
                    minimum: String(university?.minScoreRequired ?? '').trim() !== '' && Number.isFinite(Number(university.minScoreRequired))
                        ? Number(university.minScoreRequired)
                        : null,
                    score: submittedScore,
                };
            });
        }).filter(university => (
            university.name && Number.isFinite(university.score) &&
            university.minimum !== null && university.score >= university.minimum
        ));
        const uniqueMatches = new Map();
        matches.forEach(university => {
            const key = `${university.name.toLocaleLowerCase()}|${university.country.toLocaleLowerCase()}`;
            const current = uniqueMatches.get(key);
            if (!current || (university.minimum !== null && (current.minimum === null || university.minimum < current.minimum))) {
                uniqueMatches.set(key, university);
            }
        });
        const selectedCountries = Array.isArray(app.selectedCountries) && app.selectedCountries.length
            ? app.selectedCountries
            : (Array.isArray(app.programSelection?.selectedCountries) && app.programSelection.selectedCountries.length
                ? app.programSelection.selectedCountries
                : [app.programSelection?.countryName || app.countryName].filter(Boolean));
        const allowedCountries = new Set(selectedCountries.map((country) => String(country || '').trim().toLocaleLowerCase()).filter(Boolean));
        // A bachelor match must satisfy both the submitted score and one of
        // the countries selected in the student's program preferences.
        if (!allowedCountries.size) return [];
        return Array.from(uniqueMatches.values()).filter((university) =>
            allowedCountries.has(university.country.toLocaleLowerCase())
        );
    };

    const getUniversityMatchKey = (university) =>
        `${university.name.toLocaleLowerCase()}|${university.country.toLocaleLowerCase()}`;

    const openUniversityMatches = async (app) => {
        const appKey = getApplicationSelectionKey(app);
        universityMatchesAppKeyRef.current = appKey;
        setUniversityMatchesApp({ ...app, _loadingUniversityMatches: true });
        const applicantKey = getApplicantSelectionKey(app);
        setSelectedUniversityKeysByApplicant((current) => ({ ...current, [applicantKey]: [] }));
        setUniversitySelectionMessage('');

        let currentApp = app;
        try {
            // Pull the latest saved selections for this student before opening
            // the editor; the list response may be stale after another update.
            const response = await fetchApplicationDetails(app.studentId || app.userId, app.source);
            if (universityMatchesAppKeyRef.current !== appKey) return;
            if (response?.success && response.data) currentApp = response.data;
        } catch (loadError) {
            console.error('Failed to refresh university selections:', loadError);
        }

        if (universityMatchesAppKeyRef.current !== appKey) return;
        const matches = getScoreMatchedUniversityNames(currentApp);
        const eligibleKeys = new Set(matches.map(getUniversityMatchKey));
        const savedKeys = (Array.isArray(currentApp.selectedUniversities) ? currentApp.selectedUniversities : [])
            .map((university) => ({
                name: String(university.universityName || university.university || university.name || '').trim(),
                country: String(university.country || '').trim(),
            }))
            .filter((university) => university.name)
            .map(getUniversityMatchKey)
            .filter((key) => eligibleKeys.has(key))
            .slice(0, 5);
        setSelectedUniversityKeysByApplicant((current) => ({ ...current, [applicantKey]: savedKeys }));
        setUniversityMatchesApp(currentApp);
    };

    const closeUniversityMatches = () => {
        universityMatchesAppKeyRef.current = null;
        setUniversityMatchesApp(null);
        setUniversitySelectionMessage('');
    };

    const toggleUniversitySelection = (university) => {
        const key = getUniversityMatchKey(university);
        const applicantKey = getApplicantSelectionKey(universityMatchesApp || {});
        setSelectedUniversityKeysByApplicant((current) => {
            const applicantSelection = current[applicantKey] || [];
            if (applicantSelection.includes(key)) {
                return { ...current, [applicantKey]: applicantSelection.filter((item) => item !== key) };
            }
            if (applicantSelection.length >= 5) return current;
            return { ...current, [applicantKey]: [...applicantSelection, key] };
        });
        setUniversitySelectionMessage('');
    };

    const saveUniversityMatches = async () => {
        const appToSave = universityMatchesApp;
        if (!appToSave) return;
        const appKey = getApplicationSelectionKey(appToSave);
        const keysToSave = selectedUniversityKeysByApplicant[getApplicantSelectionKey(appToSave)] || [];
        const matches = getScoreMatchedUniversityNames(appToSave);
        const selectedUniversities = matches
            .filter((university) => keysToSave.includes(getUniversityMatchKey(university)))
            .map((university) => ({
                universityName: university.name,
                country: university.country,
                minScoreRequired: university.minimum,
            }));
        if (!selectedUniversities.length || selectedUniversities.length > 5) {
            setUniversitySelectionMessage('Select between 1 and 5 universities before saving.');
            return;
        }
        setSavingUniversitySelection(true);
        setUniversitySelectionMessage('');
        try {
            await api.post('/api/application/process-admin/gus-university/save-university-selection', {
                studentId: appToSave.studentId || appToSave.userId || appToSave._id,
                selectedUniversities,
            });
            const saved = selectedUniversities.map((university) => ({
                universityId: `${university.universityName}|${university.country}`,
                universityName: university.universityName,
                country: university.country,
            }));
            setApplications((current) => current.map((app) => getApplicationSelectionKey(app) === appKey
                ? { ...app, selectedUniversities: saved, universityName: saved.map((university) => university.universityName).join(', ') }
                : app));
            setUniversityMatchesApp((current) => current && getApplicationSelectionKey(current) === appKey
                ? { ...current, selectedUniversities: saved }
                : current);
            if (universityMatchesAppKeyRef.current === appKey) {
                setUniversitySelectionMessage('University selections saved.');
            }
        } catch (saveError) {
            if (universityMatchesAppKeyRef.current === appKey) {
                setUniversitySelectionMessage(saveError.response?.data?.message || 'Unable to save university selections.');
            }
        } finally {
            setSavingUniversitySelection(false);
        }
    };

    const getUniversityName = (app = {}) => {
        if (!isProgramApproved(app)) return '—';
        const savedUniversity = pickDisplayValue(
            app.applicationUniversityName,
            app.completedUniversityName,
            app.selectedUniversity?.name,
            app.selectedUniversity?.universityName,
            app.selectedCourse?.universityName,
            app.selectedCourse?.university,
            app.universityName,
            app.university
        );
        if (savedUniversity !== ' ') return savedUniversity;

        const matches = getScoreMatchedUniversityNames(app);
        if (matches.length > 1) return `${matches[0].name} + ${matches.length - 1} more eligible`;
        return matches[0]?.name || '—';
    };

    const getMobileUniversityNames = (app = {}) => {
        if (!isProgramApproved(app)) return [];
        const savedUniversities = Array.isArray(app.selectedUniversities) && app.selectedUniversities.length
            ? app.selectedUniversities
            : (Array.isArray(app.applicationUniversities) ? app.applicationUniversities : []);
        const names = savedUniversities
            .map((university) => typeof university === 'string'
                ? university.trim()
                : String(university?.universityName || university?.name || university?.university || '').trim())
            .filter(Boolean);
        return names.length ? [...new Set(names)] : [getUniversityName(app)];
    };

    const getProgramName = (app = {}) =>
        pickDisplayValue(
            app.applicationProgramName,
            app.completedProgramName,
            app.selectedCourse?.programName,
            app.selectedCourse?.title,
            app.selectedCourse?.name,
            app.programName
        );
    const getSelectedProgrammes = (app = {}) => {
        if (Array.isArray(app.selectedProgrammes) && app.selectedProgrammes.length) return app.selectedProgrammes;
        if (Array.isArray(app.applicationUniversities) && app.applicationUniversities.length) {
            return app.applicationUniversities.flatMap((university = {}) => {
                const courses = Array.isArray(university.selectedCourses) ? university.selectedCourses : [];
                return courses.map((course = {}) => ({
                    ...course,
                    universityName: pickDisplayValue(university.universityName, university.name, course.universityName, course.university),
                    programName: pickDisplayValue(course.programName, course.title, course.name),
                    country: course.country || university.country || '',
                    campus: course.campus || university.campus || '',
                }));
            });
        }
        return app.selectedCourse ? [{ ...app.selectedCourse, universityName: getUniversityName(app), programName: getProgramName(app) }] : [];
    };

    const getUniversityProgrammeSummary = (app = {}) => {
        const programmes = getSelectedProgrammes(app);
        if (programmes.length > 1) {
            const universityCount = new Set(programmes.map(programme => programme.universityName).filter(Boolean)).size;
            return (universityCount || 1) + ' universities, ' + programmes.length + ' programmes';
        }
        return getProgramName(app);
    };

    const getUniversityLocation = (app = {}) => {
        const programmes = getSelectedProgrammes(app);
        if (programmes.length > 0) {
            const p = programmes[0];
            const city = p.campus || p.city || p.location;
            const country = p.country;
            if (city && country) return `${city}, ${country}`;
            if (country) return country;
            if (city) return city;
        }
        if (Array.isArray(app.selectedCountries) && app.selectedCountries.length > 0) {
            return app.selectedCountries.join(', ');
        }
        if (app.address?.country) {
            return app.address.country;
        }
        return 'Global';
    };

    const formatTuitionFee = (programme = {}) => {
        const value = programme.tuitionFee || programme.annualTuitionFee || programme.annualFee || programme.fee;
        if (value === undefined || value === null || value === '') return '-';
        const numericValue = Number(value);
        if (Number.isFinite(numericValue)) return 'CAD ' + new Intl.NumberFormat('en-US').format(numericValue);
        return displayDash(value);
    };

    const getProgrammeType = (programme = {}) =>
        displayDash(programme.programmeType || programme.programType || programme.degree || programme.level || programme.majorArea);

    const getStudyMode = (programme = {}) =>
        displayDash(programme.studyMode || programme.deliveryMode || programme.mode);

    const getDuration = (programme = {}) =>
        displayDash(programme.duration || programme.programDuration || programme.length);

    const getProgrammeGroups = (app = {}) => {
        const programmes = getSelectedProgrammes(app);
        if (!programmes.length) {
            return [{
                universityName: getUniversityName(app),
                location: displayDash(app.universityLocation || app.location || app.country),
                country: displayDash(app.country),
                programmes: [{ universityName: getUniversityName(app), programName: getProgramName(app) }],
            }];
        }

        const groups = new Map();
        programmes.forEach((programme = {}, index) => {
            const universityName = displayDash(programme.universityName || programme.university || getUniversityName(app));
            if (!groups.has(universityName)) {
                groups.set(universityName, {
                    universityName,
                    location: displayDash(programme.location || programme.campus || programme.country),
                    country: displayDash(programme.country),
                    programmes: [],
                });
            }
            groups.get(universityName).programmes.push({ ...programme, _programmeIndex: index });
        });

        return Array.from(groups.values());
    };

    const getTimelineItems = (app = {}) => [
        { label: 'Profile', date: formatDate(app.createdAt || app.joinDate), complete: true },
        { label: 'Passport', date: app.passportUploaded || app.passportFileName ? 'Uploaded' : 'Pending', complete: !!(app.passportUploaded || app.passportFileName) },
        { label: 'Documents', date: app.documents ? String(app.documents.docsCompletionPct || 0) + '% complete' : 'Pending', complete: !!app.documents },
        { label: 'Universities', date: getUniversityProgrammeSummary(app), complete: getSelectedProgrammes(app).length > 0 },
        { label: 'Submitted', date: formatDate(app.submittedAt || app.updatedAt), complete: getStatusLabel(app) !== 'INCOMPLETE' },
        { label: 'Completed', date: String(app.completionPercentage || 0) + '%', complete: (app.completionPercentage || 0) >= 100 },
    ];

    const getModalStats = (app = {}) => {
        const programmes = getSelectedProgrammes(app);
        const universityCount = getProgrammeGroups(app).length;
        const countries = new Set([
            ...programmes.map(programme => displayDash(programme.country)),
            ...(Array.isArray(app.selectedCountries) ? app.selectedCountries : []),
            ...(Array.isArray(app.programSelection?.selectedCountries) ? app.programSelection.selectedCountries : [])
        ].filter(country => country !== '-'));

        return [
            { label: 'Submitted On', value: formatDate(app.submittedAt || app.completedAt || app.updatedAt || app.createdAt) },
            { label: 'Total Programmes', value: programmes.length || 1 },
            { label: 'Universities', value: universityCount || 1 },
            { label: 'Countries', value: countries.size || '-' },
        ];
    };

    const handlePrintApplication = () => {
        window.print();
    };

    const formatAddressLine = (parts = []) =>
        parts.filter((part) => part !== undefined && part !== null && part !== '').join(', ') || ' ';

    const getPermanentAddress = (address = {}) =>
        address.permanentAddress || formatAddressLine([
            address.careOf ? `c/o ${address.careOf}` : '',
            address.streetAndHouseNumber,
            address.city,
            address.stateProvince,
            address.country,
            address.postcode,
        ]);

    const getCorrespondenceAddress = (address = {}) => {
        if (!address.hasDifferentCorrespondenceAddress) return getPermanentAddress(address);
        return formatAddressLine([
            address.correspondenceCareOf ? `c/o ${address.correspondenceCareOf}` : '',
            address.correspondenceStreetAndHouseNumber,
            address.correspondenceCity,
            address.correspondenceStateProvince,
            address.correspondenceCountry,
            address.correspondencePostcode,
        ]);
    };

    const calculateStats = useCallback((apps) => {
        setStats({
            total:       apps.length,
            completed:   apps.filter(a => getApplicationProgressBucket(a) === 'completed').length,
            approved:    apps.filter(a => getApplicationProgressBucket(a) === 'approved').length,
            incomplete:  apps.filter(a => getApplicationProgressBucket(a) === 'incomplete').length,
            underReview: apps.filter(a => getApplicationProgressBucket(a) === 'inprogress').length,
        });
    }, []);

    const fetchApplications = useCallback(async () => {
        setLoading(true); setError(null);
        const token =
            localStorage.getItem('processAdminToken') ||
            localStorage.getItem('token')             ||
            localStorage.getItem('adminToken');
        if (!token) { setError('No authentication token found. Please login again.'); setLoading(false); return; }
        try {
            const response = await api.get('/api/application/process-admin/gus-university/applications?type=bachelors');
            if (response.data.success) {
                const apps = response.data.data || [];
                setApplications(apps);
                calculateStats(apps);
            } else {
                setError('Failed to load applications. Please try again.');
            }
        } catch (err) {
            if (err.response?.status === 401)      setError('Authentication failed. Please login again.');
            else if (err.response?.status === 403) setError('You do not have permission to view these applications.');
            else                                   setError('Failed to load applications. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [api, calculateStats]);

    useEffect(() => { fetchApplications(); }, [fetchApplications]);

    const filtered = applications.filter(app => {
        const q = searchQuery.toLowerCase();
        const uniName = getUniversityName(app).toLowerCase();
        const matchSearch =
            app.studentName?.toLowerCase().includes(q) ||
            app.email?.toLowerCase().includes(q)       ||
            String(app.studentId).includes(q)          ||
            app.applicationId?.toLowerCase().includes(q) ||
            uniName.includes(q) ||
            getSelectedProgrammes(app).some(programme => [programme.universityName, programme.programName, programme.title, programme.name].some(value => String(value || '').toLowerCase().includes(q)));
        const s = getApplicationProgressBucket(app);
        const matchFilter =
            filterStatus === 'all'                                 ||
            filterStatus === s;
        return matchSearch && matchFilter;
    });

    const fetchApplicationDetails = useCallback(async (studentId, source) => {
        const query = source ? `?source=${source}` : '';
        const res = await api.get(`/api/application/process-admin/gus-university/applications/${studentId}${query}`);
        return res.data;
    }, [api]);

    const openModal = async (app) => {
        setExpandedModalSections({
            university: true,
            student: true,
            contact: false,
            family: false,
            address: false,
            passport: false,
            documents: false,
            education: false,
            scores: false,
            specialNeeds: false,
        });
        setSelectedApp({ ...app, _loadingDetails: true });

        try {
            const res = await fetchApplicationDetails(app.studentId, app.source);
            if (res.success) {
                setSelectedApp(res.data);
            } else {
                setSelectedApp({ ...app, _detailsError: true });
            }
        } catch (err) {
            console.error("Failed to load application details:", err);
            setSelectedApp({ ...app, _detailsError: true });
        }
    };

    const closeModal = () => setSelectedApp(null);

    const toggleModalSection = (section) => {
        setExpandedModalSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const getDocumentUrl = (meta, label) => {
        if (!meta?.fileName && !meta?.fileUrl && !meta?.fileKey) return null;
        if (meta.fileKey || meta.fileUrl) return resolveFileUrl(meta.fileKey || meta.fileUrl);
        return null;
    };

    const openDocViewer = (meta, label) => {
        const url = getDocumentUrl(meta, label);
        if (!url) return;
        const name = meta.originalName || meta.fileName || '';
        let fileType = meta.fileType || '';
        if (!fileType && name) {
            fileType = name.split('.').pop();
        }
        setDocViewer({ url, label, fileType, originalName: name });
    };

    const closeDocViewer = () => setDocViewer(null);
    const isImageType    = (ft) => ['jpg','jpeg','png','webp','gif'].includes((ft || '').toLowerCase());
    const isPdfType      = (ft, name = '') => {
        const s = (ft || '').toLowerCase();
        const n = (name || '').toLowerCase();
        return s.includes('pdf') || s === 'application/pdf' || n.endsWith('.pdf');
    };

    const handleDownloadDoc = async () => {
        if (!docViewer?.url) return;
        setDownloadingDoc(true);
        let downloadUrl = docViewer.url;
        try {
            const urlObj = new URL(downloadUrl, window.location.origin);
            urlObj.searchParams.set('download', 'true');
            downloadUrl = urlObj.toString();
        } catch {
            downloadUrl += (downloadUrl.includes('?') ? '&' : '?') + 'download=true';
        }
        try {
            const token =
                localStorage.getItem('processAdminToken') ||
                localStorage.getItem('token')             ||
                localStorage.getItem('adminToken');
            const isAwsUrl = downloadUrl.includes('amazonaws.com');
            const response = await fetch(downloadUrl, {
                headers: (token && !isAwsUrl) ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob    = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a       = document.createElement('a');
            a.href        = blobUrl;
            a.download    = docViewer.originalName || docViewer.label || 'document';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.warn('Fetch download failed, falling back to direct navigation:', err);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.target = '_blank';
            a.download = docViewer.originalName || docViewer.label || 'document';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } finally {
            setDownloadingDoc(false);
        }
    };

    const canVerifyApplication = (app = {}) => {
        if (!app || isProgramApproved(app) || isFinalApplicationApproved(app)) return false;
        const status = String(app.overviewStatus || app.applicationStatus || app.status || '').toLowerCase();
        return app.completionPercentage === 100 || ['submitted', 'completed'].includes(status) || app.isCompleted === true;
    };

    const submitVerification = async () => {
        if (!verifyModal) return;
        setVerifyLoading(true);
        setVerifyError('');
        try {
            await api.post('/api/application/process-admin/gus-university/approve-program', {
                studentId: verifyModal.studentId || verifyModal.userId || verifyModal._id,
            });
            setVerifyModal(null);
            await fetchApplications();
        } catch (err) {
            setVerifyError(err.response?.data?.message || 'Failed to approve program selection.');
        } finally {
            setVerifyLoading(false);
        }
    };

    const approveUniversitySelection = async (app) => {
        try {
            await api.post('/api/application/process-admin/gus-university/approve-university-selection', {
                studentId: app.studentId || app.userId || app._id,
            });
            await fetchApplications();
        } catch (err) {
            window.alert(err.response?.data?.message || 'Failed to approve university selections.');
        }
    };
    /* Send Document Re-upload Email */

    const handleSendDocEmail = async () => {
        if (!emailModal) return;
        setEmailSending(true);
        try {
            const token =
                localStorage.getItem('processAdminToken') ||
                localStorage.getItem('token')             ||
                localStorage.getItem('adminToken');
            const response = await fetch(
                `${API_BASE_URL}/api/application/process-admin/gus-university/send-doc-email`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                        studentId:     emailModal.app.studentId,
                        studentName:   emailModal.app.studentName,
                        studentEmail:  emailModal.app.email,
                        documentLabel: emailModal.docLabel,
                        reason:        emailReason,
                        adminNotes:    emailNote,
                    }),
                }
            );
            const data = await response.json();
            if (data.success) {
                setEmailSuccess(`Email sent successfully to ${emailModal.app.email}`);
                setTimeout(() => {
                    setEmailModal(null);
                    setEmailSuccess(null);
                    setEmailNote('');
                    setEmailReason('incorrect_format');
                }, 2500);
            } else {
                alert(`Failed to send email: ${data.message}`);
            }
        } catch (err) {
            alert('Error sending email. Please try again.');
        } finally {
            setEmailSending(false);
        }
    };

    const handleDownloadPDF = async (appSummary) => {
        setPdfLoading(appSummary.studentId);
        try {
            let app = appSummary;
            if ((!app.documents || !app.familyDetails) && app.studentId) {
                const detailRes = await fetchApplicationDetails(app.studentId, app.source);
                if (detailRes.success) app = detailRes.data;
            }

            const JsPDF = await loadJsPDF();
            const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const page = { width: 210, height: 297, margin: 14, footerY: 286 };
            const contentWidth = page.width - page.margin * 2;
            const colors = {
                navy: [31, 67, 117],
                cyan: [0, 151, 183],
                text: [51, 65, 85],
                muted: [100, 116, 139],
                line: [211, 224, 238],
            };
            let y = 39;

            const logoData = await new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = image.naturalWidth;
                    canvas.height = image.naturalHeight;
                    canvas.getContext('2d').drawImage(image, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                };
                image.onerror = reject;
                image.src = EduTechLogo;
            });

            const drawHeader = () => {
                doc.setFillColor(255, 255, 255);
                doc.rect(0, 0, page.width, page.height, 'F');
                doc.addImage(logoData, 'PNG', page.margin, 10, 37, 5.3);
                doc.setTextColor(...colors.navy);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(17);
                doc.text('Application Summary', page.width - page.margin, 16, { align: 'right' });
                doc.setTextColor(...colors.muted);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.text('Application ID: ' + (app.applicationId || app.studentId || '-'), page.width - page.margin, 24, { align: 'right' });
                doc.setDrawColor(...colors.line);
                doc.setLineWidth(0.35);
                doc.line(page.margin, 31, page.width - page.margin, 31);
                y = 39;
            };
            const ensureSpace = (height) => {
                if (y + height > page.footerY - 4) {
                    doc.addPage();
                    drawHeader();
                }
            };
            const addSection = (title) => {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10.5);
                const titleLines = doc.splitTextToSize(title, contentWidth);
                const titleHeight = titleLines.length * 5;
                ensureSpace(titleHeight + 7);
                doc.setTextColor(...colors.navy);
                doc.text(titleLines, page.margin, y);
                doc.setDrawColor(...colors.cyan);
                doc.setLineWidth(0.45);
                doc.line(page.margin, y + titleHeight - 2.5, page.margin + Math.min(20, doc.getTextWidth(titleLines[0] || title)), y + titleHeight - 2.5);
                y += titleHeight + 3;
            };
            const addRows = (rows) => {
                rows.filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '').forEach(([label, value]) => {
                    const valueLines = doc.splitTextToSize(String(value), 119);
                    const rowHeight = Math.max(8.5, valueLines.length * 4.1 + 4);
                    ensureSpace(rowHeight);
                    doc.setTextColor(...colors.cyan);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(6.6);
                    doc.text(String(label).toUpperCase(), page.margin, y + 2.1);
                    doc.setTextColor(...colors.text);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8.4);
                    doc.text(valueLines, page.margin + 59, y + 2.1);
                    y += rowHeight;
                });
                y += 3;
            };

            drawHeader();
            addSection('Applicant Profile');
            addRows([
                ['Full Name', app.studentName || app.fullName],
                ['Email', app.email],
                ['Phone', app.phone],
                ['Status', getStatusLabel(app)],
            ]);

            const groups = getProgrammeGroups(app);
            groups.forEach((group, groupIndex) => {
                const heading = 'Selected University ' + (groupIndex + 1) + ': ' + group.universityName;
                addSection(heading);
                (group.programmes || []).forEach((programme, programmeIndex) => {
                    addRows([
                        ['Programme ' + (programmeIndex + 1), programme.programName || programme.title || programme.name || getProgramName(app)],
                        ['Degree / Level', getProgrammeType(programme)],
                        ['Study Mode', getStudyMode(programme)],
                    ]);
                });
            });

            const education = app.education || app.educationDetails || {};
            const academicEntries = Array.isArray(app.academicEntries) ? app.academicEntries
                : Array.isArray(app.academics?.entries) ? app.academics.entries
                    : Array.isArray(education.entries) ? education.entries
                        : Array.isArray(education.academicEntries) ? education.academicEntries
                            : Array.isArray(education) ? education : [];
            if (academicEntries.length) {
                academicEntries.forEach((entry, index) => {
                    addSection('Academic Entry ' + (index + 1));
                    addRows([
                        ['Qualification', entry.qualification || entry.degree],
                        ['Institution', entry.institution || entry.institutionName || entry.schoolName],
                        ['Board / University', entry.boardUniversity || entry.board || entry.university],
                        ['Score', entry.score || entry.gpa],
                        ['Year', entry.year || entry.yearOfPassing || entry.endDate],
                    ]);
                });
            } else if (Object.keys(education).length) {
                addSection('Academic Background');
                addRows([
                    ['Qualification', education.degree || education.qualification],
                    ['Institution', education.institutionName || education.schoolName],
                    ['Board / University', education.boardUniversity || education.university],
                    ['Score', education.score || education.gpa],
                    ['Year', education.year || education.yearOfPassing],
                ]);
            }

            const tests = Array.isArray(app.testScores?.tests) ? app.testScores.tests : [];
            const testRows = tests.map((test) => [test.exam || test.test || test.name || 'Test', test.score || test.scores || test.result]);
            if (!testRows.length && app.scores && typeof app.scores === 'object') {
                Object.entries(app.scores).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && String(value).trim()) {
                        testRows.push([key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()), value]);
                    }
                });
            }
            if (testRows.length) {
                addSection('Test Scores');
                addRows(testRows);
            }

            if (app.documents) {
                const documents = DOC_LIST_DEF(app.documents);
                if (documents.length) {
                    addSection('Document Checklist');
                    addRows(documents.map((item) => [
                        item.lbl,
                        item.up ? 'Uploaded' : item.exp ? 'Expected by ' + formatExpectedDate(item.exp) : item.required ? 'Required - not uploaded' : 'Not uploaded',
                    ]));
                }
            }

            const pageCount = doc.getNumberOfPages();
            for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
                doc.setPage(pageNumber);
                doc.setDrawColor(...colors.line);
                doc.setLineWidth(0.3);
                doc.line(page.margin, page.footerY, page.width - page.margin, page.footerY);
                doc.setTextColor(...colors.muted);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.text('Page ' + pageNumber + ' of ' + pageCount, page.width - page.margin, page.footerY + 5, { align: 'right' });
            }

            doc.save((app.applicationId || app.studentId || 'application') + '.pdf');
        } catch (err) {
            console.error('PDF generation error:', err);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setPdfLoading(null);
        }
    };
    const DOC_LIST_DEF = (d = {}) => {
        const hasFile = (file) => Boolean(file && typeof file === 'object' &&
            (file.fileName || file.originalName || file.fileUrl || file.s3Key || file.fileKey || file.path));
        const fixedDocs = [
            { lbl:'CV', required:true, up:d.cvUploaded || hasFile(d.cv), st:d.cvStatus || d.cv?.documentStatus, meta:d.cvMeta || d.cv, exp:null },
            { lbl:'Passport', required:true, up:d.passportUploaded || hasFile(d.passport), st:d.passportStatus || d.passport?.documentStatus, meta:d.passportMeta || d.passport, exp:null },
            { lbl:'Photograph', required:true, up:d.photoUploaded || hasFile(d.photo), st:d.photoStatus || d.photo?.documentStatus, meta:d.photoMeta || d.photo, exp:null },
            { lbl:'Certificate 9th', required:true, up:d.cert9thUploaded || hasFile(d.cert9th), st:d.cert9thStatus || d.cert9th?.documentStatus, meta:d.cert9thMeta || d.cert9th, exp:d.cert9thExpectedDate },
            { lbl:'Certificate 10th', required:true, up:d.cert10thUploaded || hasFile(d.cert10th), st:d.cert10thStatus || d.cert10th?.documentStatus, meta:d.cert10thMeta || d.cert10th, exp:d.cert10thExpectedDate },
            { lbl:'Certificate 11th', required:true, up:d.cert11thUploaded || hasFile(d.cert11th), st:d.cert11thStatus || d.cert11th?.documentStatus, meta:d.cert11thMeta || d.cert11th, exp:d.cert11thExpectedDate },
            { lbl:'Certificate 12th', required:true, up:d.cert12thUploaded || hasFile(d.cert12th), st:d.cert12thStatus || d.cert12th?.documentStatus, meta:d.cert12thMeta || d.cert12th, exp:d.cert12thExpectedDate },
        ];
        const representedKeys = new Set([
            'cv', 'passport', 'photo', 'cert9th', 'cert10th', 'cert11th', 'cert12th',
            'cvUploaded', 'cvStatus', 'cvMeta', 'passportUploaded', 'passportStatus', 'passportMeta',
            'photoUploaded', 'photoStatus', 'photoMeta', 'cert9thUploaded', 'cert9thStatus', 'cert9thMeta',
            'cert10thUploaded', 'cert10thStatus', 'cert10thMeta', 'cert11thUploaded', 'cert11thStatus', 'cert11thMeta',
            'cert12thUploaded', 'cert12thStatus', 'cert12thMeta'
        ]);
        const extraDocs = Object.entries(d)
            .filter(([key, file]) => !representedKeys.has(key) && hasFile(file))
            .map(([key, file]) => ({
                lbl: file.label || file.documentName || key.replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').replace(/^./, (letter) => letter.toUpperCase()),
                required: false,
                up: true,
                st: file.documentStatus || file.status || 'Uploaded',
                meta: file,
                exp: null
            }));
        return [...fixedDocs.filter((doc) => doc.up), ...extraDocs];
    };

    const renderDocCard = ({ lbl, required, up, st, meta, exp }) => {
        const hasExpected  = !up && !!exp;
        const statusLabel  = up ? (st==='approved'?'Approved':st==='rejected'?'Rejected':'Uploaded') : hasExpected?'Expected':'Not Uploaded';
        const isUploaded   = up;

        return (
            <div key={lbl} className="review-doc-row">
                <div className="review-doc-title-group">
                    <span className="review-doc-name">{lbl}</span>
                    {required && <span className="review-req-tag">Required</span>}
                    {up && meta?.originalName && (
                        <span className="gus-doc-filename" style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '4px' }}>
                            ({meta.originalName})
                        </span>
                    )}
                </div>
                <div className="review-doc-actions">
                    <span className={`review-doc-badge ${isUploaded ? 'status-uploaded' : 'status-pending'}`}>
                        {statusLabel}
                    </span>
                    {up && meta && (
                        <button type="button" className="btn-doc-view" onClick={() => openDocViewer(meta, lbl)}>
                            View
                        </button>
                    )}
                    <button
                        type="button"
                        className="btn-doc-view"
                        style={{ background: '#f8fafc', color: '#475569', borderColor: '#cbd5e1' }}
                        title={`Request upload of ${lbl}`}
                        onClick={() => {
                            setEmailNote('');
                            setEmailReason(up ? 'incorrect_format' : 'wrong_document');
                            setEmailModal({ app: selectedApp, docLabel: lbl });
                        }}
                    >
                        Email Student
                    </button>
                </div>
            </div>
        );
    };

    if (loading) return (
        <div className="gus-loading">
            <div className="gus-spinner" />
            <p>Loading GUS University Applications...</p>
        </div>
    );

    if (error) return (
        <div className="gus-loading">
            <div className="gus-error-icon">!</div>
            <p className="gus-error-msg">{error}</p>
            <div className="gus-error-actions">
                <button className="gus-refresh-btn" onClick={fetchApplications}>Retry</button>
                <button className="gus-refresh-btn" onClick={() => window.location.href='/process-admin-login'}>Go to Login</button>
            </div>
        </div>
    );

    return (
        <div className="gus-wrap">

            {/* ── Page Header Matching Image 1 ── */}
            <div className="gus-page-header">
                <div className="gus-page-header-left">
                    <div className="gus-header-icon-box">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                        </svg>
                    </div>
                    <div>
                        <h1 className="gus-page-title">University Applications</h1>
                        <p className="gus-page-sub">Track and manage your university applications</p>
                    </div>
                </div>
                <div className="gus-page-header-right">
                    <div className="gus-search-box">
                        <span className="gus-search-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"/>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                        </span>
                        <input
                            type="text" className="gus-search-input"
                            placeholder="Search by university name or application ID..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && <button className="gus-search-clear" onClick={() => setSearchQuery('')}>×</button>}
                    </div>
                    <div className={`gus-filter-select-wrap ${statusDropdownOpen ? 'is-open' : ''}`} ref={statusDropdownRef}>
                        <button
                            type="button"
                            className="gus-filter-select"
                            onClick={toggleStatusDropdown}
                            aria-haspopup="listbox"
                            aria-expanded={statusDropdownOpen}
                            aria-label="Filter applications by status"
                        >
                            <span>{{
                                all: 'All Status',
                                approved: 'Approved',
                                completed: 'Completed',
                                inprogress: 'In Progress',
                                incomplete: 'Incomplete',
                            }[filterStatus]}</span>
                            <span className="gus-filter-select-arrow" aria-hidden="true" />
                        </button>
                        {statusDropdownOpen && (
                            <div className={`gus-filter-select-menu ${statusDropdownUp ? 'opens-up' : ''}`} role="listbox" aria-label="Application status">
                                {[
                                    { value: 'all', label: 'All Status' },
                                    { value: 'approved', label: 'Approved' },
                                    { value: 'completed', label: 'Completed' },
                                    { value: 'inprogress', label: 'In Progress' },
                                    { value: 'incomplete', label: 'Incomplete' },
                                ].map((option) => (
                                    <button
                                        type="button"
                                        key={option.value}
                                        role="option"
                                        aria-selected={filterStatus === option.value}
                                        className={filterStatus === option.value ? 'active' : ''}
                                        onClick={() => { setFilterStatus(option.value); setStatusDropdownOpen(false); }}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button className="gus-refresh-btn" onClick={fetchApplications} title="Refresh Applications">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 4}}>
                            <polyline points="23 4 23 10 17 10"/>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="gus-stats-row">
                {[
                    { cls:'gus-stat-total',      label:'TOTAL APPLICATIONS', val:stats.total },
                    { cls:'gus-stat-approved',   label:'APPROVED',           val:stats.approved },
                    { cls:'gus-stat-completed',   label:'COMPLETED',          val:stats.completed },
                    { cls:'gus-stat-review',      label:'IN PROGRESS',        val:stats.underReview },
                    { cls:'gus-stat-incomplete',  label:'INCOMPLETE',         val:stats.incomplete },
                ].map(({ cls, label, val: v }) => (
                    <div key={cls} className={`gus-stat-card ${cls}`}>
                        <div className="gus-stat-text">
                            <span className="gus-stat-label">{label}</span>
                            <span className="gus-stat-num">{v}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Desktop Table Cards Row ── */}
            <div className="gus-table-card gus-desktop-table">
                <div className="gus-table-wrap-scroll">
                    <table className="gus-table">
                        <thead>
                            <tr className="gus-thead-row">
                                <th>APPLICATION ID</th>
                                <th>UNIVERSITY</th>
                                <th>STUDENT</th>
                                <th>STATUS</th>
                                <th>SUBMITTED</th>
                                <th>PROGRESS</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="7">
                                        <div className="gus-empty-state">
                                            <p>{applications.length===0?'No applications found.':'No applications match your search.'}</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((app, idx) => (
                                    <tr key={app._id||idx} className="gus-tbody-row" style={{animationDelay:`${idx*0.04}s`}}>
                                        <td>
                                            <div className="gus-appid-cell">
                                                <div className="gus-appid-badge">{app.applicationId || '—'}</div>
                                                <div className="gus-appid-sub">{app.studentId?.slice(-8)}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="gus-uni-cell">
                                                <span className="gus-uni-name">{getUniversityName(app)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="gus-student-cell">
                                                <div className="gus-avatar" style={{background:getAvatarColor(app.studentName)}}>
                                                    {getInitials(app.studentName)}
                                                </div>
                                                <div className="gus-student-details">
                                                    <span className="gus-student-name">{app.studentName||'Unknown'}</span>
                                                    <span className="gus-student-email">{app.email||'—'}</span>
                                                    {app.phone && <span className="gus-student-phone">{app.phone}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`gus-badge ${getStatusClass(app)}`}>
                                                <span className="gus-badge-dot" />
                                                {getStatusLabel(app)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="gus-date-text">{formatDate(app.updatedAt||app.createdAt)}</span>
                                        </td>
                                        <td>
                                            <div className="gus-prog-cell">
                                                <div className="gus-prog-track">
                                                    <div className="gus-prog-fill" style={{width:`${app.completionPercentage||0}%`}}/>
                                                </div>
                                                <span className="gus-prog-pct">{app.completionPercentage||0}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="gus-action-group">
                                                <button className="gus-btn-view" onClick={() => openModal({...app})}>View</button>
                                                <button className="gus-btn-dl" onClick={() => handleDownloadPDF(app)} disabled={pdfLoading===app.studentId} title="Download PDF">
                                                    {pdfLoading===app.studentId ? <span className="gus-btn-spinner"/> : 'PDF'}
                                                </button>
                                                {isFinalApplicationApproved(app) ? (
                                                    <span className="gus-sent-badge">Approved</span>
                                                ) : canVerifyApplication(app) ? (
                                                    <button className="gus-btn-verify" onClick={() => { setVerifyError(''); setVerifyModal(app); }}>Approve Program</button>
                                                ) : isProgramApproved(app) ? (
                                                    <span className="gus-stage-badge">{canApproveUniversitySelection(app) ? 'Ready for approval' : 'Awaiting universities'}</span>
                                                ) : null}
                                                {isProgramApproved(app) && (
                                                    <button
                                                        type="button"
                                                        className="gus-university-matches-btn"
                                                        onClick={() => openUniversityMatches(app)}
                                                    >
                                                        View Universities
                                                    </button>
                                                )}
                                                {canApproveUniversitySelection(app) && (
                                                    <button className="gus-btn-final-approve" type="button" onClick={() => approveUniversitySelection(app)}>
                                                        Approve Selection
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="gus-table-footer">
                    Showing <strong>{filtered.length}</strong> of <strong>{applications.length}</strong> applications
                </div>
            </div>

            {/* ── Mobile Cards ── */}
            <div className="gus-mobile-cards">
                {filtered.length === 0 ? (
                    <div className="gus-empty-state" style={{background:'#fff',borderRadius:14,padding:'2rem'}}>
                        <p>{applications.length===0?'No applications found.':'No applications match your search.'}</p>
                    </div>
                ) : (
                    <>
                        {filtered.map((app, idx) => (
                            <div key={app._id||idx} className="gus-mob-card" style={{animationDelay:`${idx*0.05}s`}}>
                                <div className="gus-mob-card-top">
                                    <span className="gus-college-badge">{app.applicationId||'—'}</span>
                                    <span className={`gus-badge ${getStatusClass(app)}`}>{getStatusLabel(app)}</span>
                                </div>
                                <div className="gus-mob-card-body">
                                    <div className="gus-mob-uni-row">
                                        <span className="gus-mob-uni-label">Universities</span>
                                        <div className="gus-mob-uni-list">
                                            {getMobileUniversityNames(app).map((university, universityIndex) => (
                                                <span className="gus-mob-uni-name" key={`${university}-${universityIndex}`}>{university}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="gus-mob-student">
                                        <div className="gus-avatar gus-avatar-md" style={{background:getAvatarColor(app.studentName)}}>
                                            {getInitials(app.studentName)}
                                        </div>
                                        <div className="gus-mob-student-info">
                                            <div className="gus-mob-name">{app.studentName||'Unknown'}</div>
                                            <div className="gus-mob-email">{app.email||'—'}</div>
                                            {app.phone && <div className="gus-mob-phone">{app.phone}</div>}
                                        </div>
                                    </div>
                                    <div className="gus-mob-meta-grid">
                                        <div className="gus-mob-meta-item">
                                            <span className="gus-mob-meta-lbl">Submitted</span>
                                            <span className="gus-mob-meta-val">{formatDate(app.updatedAt||app.createdAt)}</span>
                                        </div>
                                        <div className="gus-mob-meta-item">
                                            <span className="gus-mob-meta-lbl">Student ID</span>
                                            <span className="gus-mob-meta-val">{app.studentId?.slice(-8)||'—'}</span>
                                        </div>
                                        <div className="gus-mob-meta-item gus-mob-full">
                                            <span className="gus-mob-meta-lbl">Progress</span>
                                            <div className="gus-mob-prog-row">
                                                <div className="gus-prog-track">
                                                    <div className="gus-prog-fill" style={{width:`${app.completionPercentage||0}%`}}/>
                                                </div>
                                                <span className="gus-prog-pct">{app.completionPercentage||0}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="gus-mob-card-footer">
                                    <button className="gus-btn-view gus-mob-btn-full" onClick={() => openModal({...app})}>
                                        View Details
                                    </button>
                                    <button className="gus-btn-dl" onClick={() => handleDownloadPDF(app)} disabled={pdfLoading===app.studentId} title="Download PDF">
                                        {pdfLoading===app.studentId ? <span className="gus-btn-spinner"/> : 'PDF'}
                                    </button>
                                    {isFinalApplicationApproved(app) ? (
                                        <span className="gus-sent-badge">Approved</span>
                                    ) : canVerifyApplication(app) ? (
                                        <button className="gus-btn-verify" onClick={() => { setVerifyError(''); setVerifyModal(app); }}>Approve Program</button>
                                    ) : isProgramApproved(app) ? (
                                        <span className="gus-stage-badge">{canApproveUniversitySelection(app) ? 'Ready for approval' : 'Awaiting universities'}</span>
                                    ) : null}
                                    {isProgramApproved(app) && (
                                        <button className="gus-university-matches-btn" type="button" onClick={() => openUniversityMatches(app)}>
                                            View Universities
                                        </button>
                                    )}
                                    {canApproveUniversitySelection(app) && (
                                        <button className="gus-btn-final-approve" type="button" onClick={() => approveUniversitySelection(app)}>
                                            Approve Selection
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div className="gus-mob-list-footer">
                            <span>Showing <strong>{filtered.length}</strong> of <strong>{applications.length}</strong></span>
                            <button className="gus-refresh-btn" onClick={fetchApplications}>Refresh</button>
                        </div>
                    </>
                )}
            </div>

            {/* ── Application Detail Modal ── */}
            {verifyModal && (
                <div className="gus-overlay" onClick={() => !verifyLoading && setVerifyModal(null)}>
                    <div className="gus-verify-modal" onClick={event => event.stopPropagation()}>
                        <div className="gus-verify-header">
                            <div><h3>Approve Program Selection</h3><p>Approve this student's program selection.</p></div>
                            <button type="button" onClick={() => setVerifyModal(null)} disabled={verifyLoading}>&times;</button>
                        </div>
                        <div className="gus-verify-details">
                            <div><span>Student</span><strong>{verifyModal.studentName || 'Unknown'}</strong></div>
                            <div><span>Application ID</span><strong>{verifyModal.applicationId || '-'}</strong></div>
                            <div><span>Target Countries</span><strong>{Array.isArray(verifyModal.selectedCountries) && verifyModal.selectedCountries.length > 0 ? verifyModal.selectedCountries.join(', ') : '-'}</strong></div>
                        </div>
                        <p className="gus-verify-message">Once approved, the student will be able to select their specific university in the enrollment portal.</p>
                        {verifyError && <div className="gus-verify-error">{verifyError}</div>}
                        <div className="gus-verify-actions">
                            <button type="button" className="gus-verify-cancel" onClick={() => setVerifyModal(null)} disabled={verifyLoading}>Cancel</button>
                            <button type="button" className="gus-verify-submit" onClick={submitVerification} disabled={verifyLoading}>{verifyLoading ? 'Approving...' : 'Approve'}</button>
                        </div>
                    </div>
                </div>
            )}
            {universityMatchesApp && (
                <div className="gus-overlay gus-university-matches-overlay" onClick={closeUniversityMatches}>
                    <section className="gus-university-matches-modal" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="gus-university-matches-title">
                        <header className="gus-university-matches-header">
                            <div>
                                <span>APPROVED APPLICATION</span>
                                <h2 id="gus-university-matches-title">University matches</h2>
                                <p>{universityMatchesApp.studentName || 'Student'} · {universityMatchesApp.applicationId || ''}</p>
                            </div>
                            <button type="button" onClick={closeUniversityMatches} aria-label="Close university matches">×</button>
                        </header>
                        {getScoreMatchedUniversityNames(universityMatchesApp).length > 0 ? (
                            <div className="gus-university-matches-list">
                                {getScoreMatchedUniversityNames(universityMatchesApp).map((university, index) => {
                                    const key = getUniversityMatchKey(university);
                                    const isSelected = selectedUniversityKeys.includes(key);
                                    return (
                                    <div className="gus-university-match-item" key={`${university.name}-${university.country}-${index}`}>
                                        <span className="gus-university-match-index">{index + 1}</span>
                                        <strong>{university.name}{university.country ? ` (${university.country})` : ''}</strong>
                                        <button
                                            type="button"
                                            className={`gus-university-select-btn${isSelected ? ' is-selected' : ''}`}
                                            onClick={() => toggleUniversitySelection(university)}
                                            disabled={!isSelected && selectedUniversityKeys.length >= 5}
                                        >
                                            {isSelected ? 'Selected' : 'Select'}
                                        </button>
                                    </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="gus-university-matches-empty">
                                No university matches were found for the submitted test scores.
                            </p>
                        )}
                        {getScoreMatchedUniversityNames(universityMatchesApp).length > 0 && (
                            <footer className="gus-university-matches-footer">
                                <span>{selectedUniversityKeys.length} / 5 selected</span>
                                {universitySelectionMessage && <span className="gus-university-selection-message">{universitySelectionMessage}</span>}
                                <button type="button" onClick={saveUniversityMatches} disabled={savingUniversitySelection || selectedUniversityKeys.length === 0}>
                                    {savingUniversitySelection ? 'Saving…' : 'Save selections'}
                                </button>
                            </footer>
                        )}
                    </section>
                </div>
            )}
            {selectedApp && (
                <div className="gus-overlay" onClick={closeModal}>
                    <div className="gus-modal" onClick={e => e.stopPropagation()}>

                        <div className="gus-modal-hdr gus-premium-hdr">
                            <div className="gus-modal-hdr-left gus-premium-student">
                                <div className="gus-modal-avatar gus-premium-avatar">
                                    {getInitials(selectedApp.studentName)}
                                </div>
                                <div>
                                    <p className="gus-premium-eyebrow">EDUTECHEX Application</p>
                                    <h2 className="gus-modal-title gus-premium-title">{selectedApp.studentName || '-'}</h2>
                                    <p className="gus-modal-appid gus-premium-appid">ID: {selectedApp.applicationId || '-'}</p>
                                </div>
                            </div>
                            <div className="gus-modal-hdr-right gus-premium-actions">
                                <div className="gus-status-card">
                                    <div>
                                        <span>Application Status</span>
                                        <strong>{getStatusLabel(selectedApp)}</strong>
                                        <em>{selectedApp.isVerified ? 'Verified' : 'All Documents Verified'}</em>
                                    </div>
                                </div>
                                <button className="gus-premium-outline-btn" type="button" onClick={handlePrintApplication}>Print</button>
                                <button className="gus-premium-gradient-btn" type="button" onClick={() => handleDownloadPDF(selectedApp)} disabled={pdfLoading===selectedApp.studentId}>
                                    {pdfLoading===selectedApp.studentId ? 'Generating...' : 'Download PDF'}
                                </button>
                                <button className="gus-modal-x gus-premium-close" type="button" onClick={closeModal} aria-label="Close">×</button>
                            </div>
                        </div>

                        <div className="gus-modal-body">
                            {selectedApp?._loadingDetails && (
                                <div className="gus-modal-loading">
                                    Loading application details...
                                </div>
                            )}

                            {selectedApp?._detailsError && (
                                <div className="gus-modal-loading">
                                    Failed to load application details. Please close and try again.
                                </div>
                            )}

                            {!selectedApp?._loadingDetails && !selectedApp?._detailsError && (
                                <>

                            <div className="gus-premium-stats-row">
                                {getModalStats(selectedApp).map((stat) => (
                                    <div className="gus-premium-stat-card" key={stat.label}>
                                        <div>
                                            <span>{stat.label}</span>
                                            <strong>{stat.value}</strong>
                                        </div>
                                    </div>
                                ))}
                            </div>

                           

                            <DetailSection
                                title="Student Information"
                                dotClass="gus-dot-blue"
                                fields={[
                                    { label: 'Application ID', value: val(selectedApp.applicationNumber || selectedApp.applicationId) },
                                    { label: 'Student ID', value: val(selectedApp.studentId) },
                                    { label: 'Title', value: val(selectedApp.title) },
                                    { label: 'Full Name', value: val(selectedApp.studentName) },
                                    { label: 'Applicant Type', value: val(selectedApp.applicantType) },
                                    { label: 'Program Type', value: val(selectedApp.programType) },
                                    { label: 'Target Countries', value: Array.isArray(selectedApp.selectedCountries) && selectedApp.selectedCountries.length > 0 ? selectedApp.selectedCountries.join(', ') : '' },
                                    { label: 'Gender', value: selectedApp.gender ? formatGender(selectedApp.gender) : '' },
                                    { label: 'Date of Birth', value: formatDate(selectedApp.dateOfBirth) },
                                    { label: 'Place of Birth', value: val(selectedApp.placeOfBirth) },
                                    { label: 'Country of Birth', value: val(selectedApp.countryOfBirth) },
                                ]}
                            />

                            <DetailSection
                                title="Contact Information"
                                dotClass="gus-dot-blue"
                                fields={[
                                    { label: 'Email', value: val(selectedApp.email) },
                                    { label: 'Mobile', value: val(selectedApp.phone) },
                                    { label: 'Landline', value: val(selectedApp.landline) },
                                    { label: 'Country of Residence', value: val(selectedApp.countryOfResidence) },
                                    { label: 'Correspondence Language', value: capFirst(selectedApp.correspondenceLanguage) },
                                    { label: 'Years Lived in United States', value: val(selectedApp.yearsLivedInUnitedStates) },
                                    { label: 'U.S. Citizenship Status', value: selectedApp.usCitizenshipStatus ? formatUsCitizenshipStatus(selectedApp.usCitizenshipStatus) : '' },
                                    { label: 'Last Updated', value: formatDate(selectedApp.updatedAt) },
                                ]}
                            />

                            {selectedApp.familyDetails && (
                                <DetailSection
                                    title="Family Details"
                                    dotClass="gus-dot-blue"
                                    fields={[
                                        { label: 'Parent 1 Relationship', value: capFirst(selectedApp.familyDetails?.parent1?.relationship) },
                                        { label: 'Parent 1 Full Name', value: val(selectedApp.familyDetails?.parent1?.fullName) },
                                        { label: 'Parent 1 Email', value: val(selectedApp.familyDetails?.parent1?.email) },
                                        { label: 'Parent 1 Phone', value: val(selectedApp.familyDetails?.parent1?.phone) },
                                        ...(selectedApp.familyDetails?.parent2?.enabled === true ? [
                                            { label: 'Parent 2 Relationship', value: capFirst(selectedApp.familyDetails?.parent2?.relationship) },
                                            { label: 'Parent 2 Full Name', value: val(selectedApp.familyDetails?.parent2?.fullName) },
                                            { label: 'Parent 2 Email', value: val(selectedApp.familyDetails?.parent2?.email) },
                                            { label: 'Parent 2 Phone', value: val(selectedApp.familyDetails?.parent2?.phone) },
                                        ] : []),
                                    ]}
                                />
                            )}

                            {selectedApp.address && (
                                <DetailSection
                                    title="Address Information"
                                    dotClass="gus-dot-blue"
                                    fields={[
                                        { label: 'Permanent Address', value: selectedApp.address ? getPermanentAddress(selectedApp.address) : [selectedApp.personal?.permanentAddress1 || selectedApp.personal?.address1, selectedApp.personal?.permanentAddress2 || selectedApp.personal?.address2, selectedApp.personal?.permanentCity, selectedApp.personal?.permanentState, selectedApp.personal?.permanentPostalCode, selectedApp.personal?.permanentCountry].filter(Boolean).join(', ') },
                                        { label: 'Correspondence Address', value: getCorrespondenceAddress(selectedApp.address) },
                                        { label: 'Care Of', value: val(selectedApp.address?.careOf) },
                                        { label: 'City', value: val(selectedApp.address?.city) },
                                        { label: 'State', value: val(selectedApp.address?.stateProvince) },
                                        { label: 'Country', value: val(selectedApp.address?.country) },
                                        { label: 'Postcode', value: val(selectedApp.address?.postcode) },
                                        ...(selectedApp.address?.hasDifferentCorrespondenceAddress ? [
                                            { label: 'Correspondence Care Of', value: val(selectedApp.address?.correspondenceCareOf) },
                                            { label: 'Correspondence City', value: val(selectedApp.address?.correspondenceCity) },
                                            { label: 'Correspondence State', value: val(selectedApp.address?.correspondenceStateProvince) },
                                            { label: 'Correspondence Country', value: val(selectedApp.address?.correspondenceCountry) },
                                            { label: 'Correspondence Postcode', value: val(selectedApp.address?.correspondencePostcode) },
                                        ] : []),
                                    ]}
                                />
                            )}

                            <DetailSection
                                title="Passport & Travel"
                                dotClass="gus-dot-purple"
                                fields={[
                                    { label: 'Citizenship', value: val(selectedApp.citizenship) },
                                    { label: 'Passport Number', value: val(selectedApp.passportNumber) },
                                    { label: 'Issue Date', value: formatDate(selectedApp.passportIssueDate) },
                                    { label: 'Expiry Date', value: formatDate(selectedApp.passportExpiryDate) },
                                    { label: 'Issuing Country', value: val(selectedApp.issuingCountry) },
                                    { label: 'Document Type', value: capFirst(selectedApp.documentType) },
                                    { label: 'EU Citizen', value: selectedApp.isEUCitizen !== undefined ? yesNo(selectedApp.isEUCitizen) : '' },
                                    { label: 'Needs Visa', value: capFirst(selectedApp.needVisa) },
                                    { label: 'Passport Uploaded', value: selectedApp.passportUploaded ? 'Yes' : '' },
                                ]}
                            />

                            {selectedApp.documents && (
                                <div className="review-section-card">
                                    <h3 className="review-card-title">
                                        <span className="gus-sec-dot gus-dot-purple" style={{ marginRight: '8px' }} />
                                        Uploaded Application Documents
                                    </h3>
                                    <div className="gus-doc-progress-wrap" style={{ marginBottom: '16px' }}>
                                        <div className="gus-doc-progress-track">
                                            <div className="gus-doc-progress-fill" style={{ width: `${selectedApp.documents.docsCompletionPct || 0}%` }} />
                                        </div>
                                        <span className="gus-doc-progress-label">{selectedApp.documents.docsCompletionPct || 0}% Complete</span>
                                    </div>
                                    <div className="review-docs-grid">
                                        {DOC_LIST_DEF(selectedApp.documents).map(renderDocCard)}
                                    </div>
                                    {selectedApp.documents.portfolioLink && (
                                        <div className="gus-doc-portfolio" style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                                            <span className="review-info-label">Portfolio Link</span>
                                            <a href={selectedApp.documents.portfolioLink} target="_blank" rel="noopener noreferrer" className="gus-doc-portfolio-link">
                                                {selectedApp.documents.portfolioLink}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedApp.educationSummary && selectedApp.educationSummary.length > 0 ? (
                                <div className="review-section-card">
                                    <h3 className="review-card-title">
                                        <span className="gus-sec-dot gus-dot-blue" style={{ marginRight: '8px' }} />
                                        Educational History ({selectedApp.educationSummary.length})
                                    </h3>
                                    <div className="review-table-wrapper">
                                        <table className="review-table">
                                            <thead>
                                                <tr>
                                                    <th>Qualification</th>
                                                    <th>Institution / School</th>
                                                    <th>Board / University</th>
                                                    <th>Year</th>
                                                    <th>Score / CGPA</th>
                                                    <th>Country</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedApp.educationSummary.map((edu, idx) => (
                                                    <tr key={idx}>
                                                        <td className="cell-primary">{edu.qualification || edu.degree || '-'}</td>
                                                        <td>{edu.schoolName || edu.institutionName || '-'}</td>
                                                        <td>{edu.boardUniversity || edu.specialisation || '-'}</td>
                                                        <td>{edu.yearOfPassing || edu.year || '-'}</td>
                                                        <td className="cell-score">{edu.score || edu.percentage || '-'}</td>
                                                        <td>{edu.country || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : selectedApp.education && (
                                <DetailSection
                                    title="Education Background"
                                    dotClass="gus-dot-blue"
                                    fields={[
                                        { label: '10+2 School', value: val(selectedApp.education.bachelorDetails?.schoolName) },
                                        { label: 'Education Board', value: val(selectedApp.education.bachelorDetails?.board) },
                                        { label: '10+2 Completion Year', value: val(selectedApp.education.bachelorDetails?.completionYear) },
                                        { label: '10+2 Score', value: val(selectedApp.education.bachelorDetails?.percentage) },
                                        { label: 'Transfer College', value: val(selectedApp.education.transferDetails?.currentCollege) },
                                        { label: 'Transfer Program / Major', value: val(selectedApp.education.transferDetails?.currentProgram || selectedApp.education.transferDetails?.major) },
                                        { label: 'Transfer Credits', value: val(selectedApp.education.transferDetails?.creditsCompleted) },
                                        { label: 'Master’s University', value: val(selectedApp.education.masterDetails?.university) },
                                        { label: 'Master’s Major', value: val(selectedApp.education.masterDetails?.courseMajor) },
                                        { label: 'Master’s Graduation Year', value: val(selectedApp.education.masterDetails?.graduationYear) },
                                        { label: 'Medical Institution', value: val(selectedApp.education.medicalDetails?.institution || selectedApp.education.medicalDetails?.schoolCollege) },
                                        { label: 'Medical Course', value: val(selectedApp.education.medicalDetails?.course) },
                                        { label: 'Was Enrolled', value: selectedApp.education.wasEnrolled !== undefined ? yesNo(selectedApp.education.wasEnrolled) : '' },
                                        { label: 'Currently Enrolled', value: selectedApp.education.isCurrentlyEnrolled !== undefined ? yesNo(selectedApp.education.isCurrentlyEnrolled) : '' },
                                        { label: 'Institution', value: val(selectedApp.education.institutionName) },
                                        { label: 'Degree', value: capFirst(selectedApp.education.degree) },
                                        { label: 'Specialisation', value: val(selectedApp.education.specialisation) },
                                        { label: 'Edu. Completion', value: selectedApp.education.eduCompletionPct ? `${selectedApp.education.eduCompletionPct}%` : '' },
                                    ]}
                                />
                            )}

                            {/* STANDARDIZED TEST SCORES SECTION */}
                            {((Array.isArray(selectedApp.testScores) && selectedApp.testScores.length > 0) ||
                              (Array.isArray(selectedApp.scores?.tests) && selectedApp.scores.tests.length > 0) ||
                              selectedApp.scores?.hasNotTaken ||
                              selectedApp.hasNotTakenTests) && (
                                <div className="review-section-card">
                                    <h3 className="review-card-title">
                                        <span className="gus-sec-dot gus-dot-pink" style={{ marginRight: '8px' }} />
                                        Standardized Test Scores
                                    </h3>

                                    {(selectedApp.scores?.hasNotTaken || selectedApp.hasNotTakenTests) ? (
                                        <div className="review-notice-box">
                                            Declared: Standardized test scores not taken.
                                        </div>
                                    ) : (
                                        <div className="review-test-list">
                                            {(
                                                (Array.isArray(selectedApp.scores?.tests) && selectedApp.scores.tests.length > 0)
                                                    ? selectedApp.scores.tests
                                                    : (Array.isArray(selectedApp.testScores) ? selectedApp.testScores : [])
                                            ).map((t, tIdx) => {
                                                const fileName = typeof t.reportFile === 'string'
                                                    ? t.reportFile
                                                    : (t.reportFile?.fileName || t.reportFile?.name || '');

                                                const savedSelectedUnis = Array.isArray(t.selectedUniversities) && t.selectedUniversities.length > 0
                                                    ? t.selectedUniversities
                                                    : (Array.isArray(t.eligibleUniversities) ? t.eligibleUniversities : []);
                                                const isBachelorApplication = /bachelor|undergraduate|^ug$/i.test(String(selectedApp.programType || ''));
                                                const selectedCountries = Array.isArray(selectedApp.selectedCountries) && selectedApp.selectedCountries.length
                                                    ? selectedApp.selectedCountries
                                                    : (Array.isArray(selectedApp.programSelection?.selectedCountries) && selectedApp.programSelection.selectedCountries.length
                                                        ? selectedApp.programSelection.selectedCountries
                                                        : [selectedApp.programSelection?.countryName || selectedApp.countryName].filter(Boolean));
                                                const allowedCountries = new Set(selectedCountries.map(country => String(country || '').trim().toLocaleLowerCase()).filter(Boolean));
                                                const submittedScoreText = String(t.score ?? '').replace(/,/g, '').trim();
                                                const submittedScore = submittedScoreText && /^\d+(?:\.\d+)?$/.test(submittedScoreText) ? Number(submittedScoreText) : NaN;
                                                const selectedUnis = isBachelorApplication
                                                    ? (allowedCountries.size ? savedSelectedUnis.filter((university, index, all) => {
                                                        const name = typeof university === 'string'
                                                            ? university.trim()
                                                            : String(university?.universityName || university?.university || university?.name || '').trim();
                                                        const country = typeof university === 'object' ? String(university?.country || '').trim().toLocaleLowerCase() : '';
                                                        const minimumText = String(university?.minScoreRequired ?? '').trim();
                                                        const minimum = typeof university === 'object' && minimumText !== '' && Number.isFinite(Number(minimumText))
                                                            ? Number(minimumText)
                                                            : NaN;
                                                        return name && all.findIndex(item => {
                                                            const itemName = typeof item === 'string'
                                                                ? item.trim()
                                                                : String(item?.universityName || item?.university || item?.name || '').trim();
                                                            return itemName.toLocaleLowerCase() === name.toLocaleLowerCase();
                                                        }) === index && country && allowedCountries.has(country) && Number.isFinite(submittedScore) && Number.isFinite(minimum) && submittedScore >= minimum;
                                                    }) : [])
                                                    : savedSelectedUnis;

                                                return (
                                                    <div key={tIdx} className="review-test-card">
                                                        <div className="review-test-header">
                                                            <span className="review-test-name">{t.exam || `Test #${tIdx + 1}`}</span>
                                                            {t.score && (
                                                                <span className="review-score-badge">
                                                                    Score: {t.score}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {t.testDate && (
                                                            <div className="review-test-date">Test Date: {t.testDate}</div>
                                                        )}

                                                        {(t.readingScore || t.listeningScore || t.speakingScore || t.writingScore || t.verbalScore || t.quantitativeScore || t.percentile || t.allIndiaRank || t.sjtBand) && (
                                                            <div className="review-subscores-section">
                                                                <div className="review-subscores-label">Sub-Scores Breakdown:</div>
                                                                <div className="review-chips-flex">
                                                                    {t.readingScore && <span className="review-chip">Reading: {t.readingScore}</span>}
                                                                    {t.listeningScore && <span className="review-chip">Listening: {t.listeningScore}</span>}
                                                                    {t.speakingScore && <span className="review-chip">Speaking: {t.speakingScore}</span>}
                                                                    {t.writingScore && <span className="review-chip">Writing: {t.writingScore}</span>}
                                                                    {t.verbalScore && <span className="review-chip">Verbal: {t.verbalScore}</span>}
                                                                    {t.quantitativeScore && <span className="review-chip">Quantitative: {t.quantitativeScore}</span>}
                                                                    {t.percentile && <span className="review-chip">Percentile: {t.percentile}%</span>}
                                                                    {t.allIndiaRank && <span className="review-chip">AIR: {t.allIndiaRank}</span>}
                                                                    {t.sjtBand && <span className="review-chip">SJT Band: {t.sjtBand}</span>}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {fileName && (
                                                            <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#059669', fontWeight: 600 }}>
                                                                Score Report Document: {fileName}
                                                            </div>
                                                        )}

                                                        {isProgramApproved(selectedApp) && selectedUnis && selectedUnis.length > 0 && (
                                                            <div className="review-qualifying-unis review-qualifying-unis--matched">
                                                                <div className="review-qualifying-label">
                                                                    Eligible universities for this score ({selectedUnis.length}):
                                                                </div>
                                                                <div className="review-chips-flex">
                                                                    {selectedUnis.map((uniObj, uIdx) => {
                                                                        const name = typeof uniObj === 'string' ? uniObj : (uniObj.university || uniObj.universityName);
                                                                        const country = typeof uniObj === 'object' && uniObj.country ? ` (${uniObj.country})` : '';
                                                                        const minimum = typeof uniObj === 'object' && uniObj.minScoreRequired
                                                                            ? ` · minimum ${uniObj.minScoreRequired}`
                                                                            : '';
                                                                        return (
                                                                            <span key={uIdx} className="review-chip font-medium primary-chip review-matched-university">
                                                                                <strong>{name}</strong>{country}{minimum}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {isProgramApproved(selectedApp) && (!selectedUnis || selectedUnis.length === 0) && (
                                                            <div className="review-no-university-match">
                                                                No score-matched universities are available for this test.
                                                            </div>
                                                        )}
                                                        {!isProgramApproved(selectedApp) && (
                                                            <div className="review-no-university-match">
                                                                Score-based university matches will be shown after the program is approved.
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SELECTED UNIVERSITIES & PROGRAMS SECTION */}
                            {isProgramApproved(selectedApp) && getSelectedProgrammes(selectedApp).length > 0 && (
                                <div className="review-section-card">
                                    <h3 className="review-card-title">
                                        <span className="gus-sec-dot gus-dot-blue" style={{ marginRight: '8px' }} />
                                        Selected Universities &amp; Programs ({getSelectedProgrammes(selectedApp).length})
                                    </h3>
                                    <div className="review-uni-list">
                                        {getProgrammeGroups(selectedApp).map((group, idx) => (
                                            <div key={idx} className="review-uni-card">
                                                <div className="review-uni-header">
                                                    <span className="review-uni-name">{group.universityName}</span>
                                                    <span className="review-uni-country">{group.country || group.location}</span>
                                                </div>
                                                <div className="review-uni-courses-label">Selected Program(s):</div>
                                                <div className="review-chips-flex">
                                                    {group.programmes.map((prog, pIdx) => (
                                                        <span key={pIdx} className="review-chip primary-chip">
                                                            {prog.programName || prog.title || prog.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedApp.specialNeeds?.hasSpecialNeeds === 'yes' && (
                                <DetailSection
                                    title="Special Needs"
                                    dotClass="gus-dot-pink"
                                    fields={[
                                        { label: 'Has Special Needs', value: 'Yes' },
                                        { label: 'Status', value: capFirst(selectedApp.specialNeeds.snStatus) },
                                        { label: 'Special Needs', value: selectedApp.specialNeeds.specialNeeds?.length ? selectedApp.specialNeeds.specialNeeds.join(', ') : '' },
                                        { label: 'Required Arrangements', value: selectedApp.specialNeeds.requiredArrangements?.length ? selectedApp.specialNeeds.requiredArrangements.join(', ') : '' },
                                    ]}
                                />
                            )}

                            <DetailSection
                                title="Application Status"
                                dotClass="gus-dot-green"
                                fields={[
                                    { label: 'App Status', value: capFirst(selectedApp.applicationStatus) },
                                    { label: 'Verified', value: selectedApp.isVerified !== undefined ? (selectedApp.isVerified ? 'Yes' : 'No') : '' },
                                    { label: 'Account Status', value: capFirst(selectedApp.accountStatus) },
                                    { label: 'Role', value: capFirst(selectedApp.role) },
                                    { label: 'Joined', value: formatDate(selectedApp.joinDate) },
                                    { label: 'Last Login', value: formatDate(selectedApp.lastLogin) },
                                    { label: 'Created At', value: formatDate(selectedApp.createdAt) },
                                    { label: 'Last Updated', value: formatDate(selectedApp.updatedAt) },
                                ]}
                            />

                            <div className="review-section-card">
                                <h3 className="review-card-title">
                                    <span className="gus-sec-dot gus-dot-green" style={{ marginRight: '8px' }} />
                                    Application Completion Progress
                                </h3>
                                <div className="gus-modal-prog-wrap">
                                    <div className="gus-modal-prog-track">
                                        <div className="gus-modal-prog-fill" style={{ width: `${selectedApp.completionPercentage || 0}%` }} />
                                    </div>
                                    <span className="gus-modal-prog-lbl">{selectedApp.completionPercentage || 0}% Complete</span>
                                </div>
                            </div>
                                </>
                            )}

                        </div>

                        <div className="gus-modal-ftr gus-premium-ftr">
                            <div className="gus-premium-footer-info">
                                <p>This is a summary of the programmes you have applied to. Please contact support if any information is incorrect.</p>
                            </div>
                            <button className="gus-modal-close-btn" type="button" onClick={closeModal}>Close</button>
                        </div>

                    </div>
                </div>
            )}

            {/* ── Document Viewer ── */}
            {docViewer && (
                <div className="gus-docviewer-overlay" onClick={closeDocViewer}>
                    <div className="gus-docviewer-box" onClick={e => e.stopPropagation()}>
                        <div className="gus-docviewer-hdr">
                            <div className="gus-docviewer-hdr-left">
                                <span className="gus-docviewer-icon">
                                    {isImageType(docViewer.fileType) ? 'Image' : (isPdfType(docViewer.fileType, docViewer.originalName) ? 'PDF' : 'File')}
                                </span>
                                <div>
                                    <div className="gus-docviewer-title">{docViewer.label}</div>
                                    <div className="gus-docviewer-filename">{docViewer.originalName}</div>
                                </div>
                            </div>
                            <div className="gus-docviewer-hdr-right">
                                <a href={docViewer.url} target="_blank" rel="noopener noreferrer" className="gus-docviewer-open-btn" title="Open in new tab">
                                    Open
                                </a>
                                <button className="gus-docviewer-open-btn" disabled={downloadingDoc} onClick={handleDownloadDoc}>
                                    {downloadingDoc ? 'Downloading...' : 'Download'}
                                </button>
                                <button className="gus-docviewer-close" onClick={closeDocViewer}>×</button>
                            </div>
                        </div>
                        <div className="gus-docviewer-body">
                            {isImageType(docViewer.fileType) ? (
                                <div className="gus-docviewer-img-wrap">
                                    <img src={docViewer.url} alt={docViewer.originalName} className="gus-docviewer-img"
                                        onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}}/>
                                    <div className="gus-docviewer-fallback" style={{display:'none'}}>
                                        <p>Could not load image preview.</p>
                                        <button className="gus-docviewer-open-btn" onClick={handleDownloadDoc} disabled={downloadingDoc}>
                                            {downloadingDoc?'Downloading...':'Download File'}
                                        </button>
                                    </div>
                                </div>
                            ) : isPdfType(docViewer.fileType, docViewer.originalName) ? (
                                <iframe
                                    src={docViewer.url}
                                    title={docViewer.originalName || docViewer.label}
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                />
                            ) : (
                                <div className="gus-docviewer-fallback">
                                    <p style={{fontWeight:600,color:'#374151'}}>{docViewer.originalName}</p>
                                    <p style={{color:'#9ca3af',fontSize:13}}>Preview not available for <strong>.{docViewer.fileType}</strong> files.</p>
                                    <button className="gus-docviewer-open-btn" onClick={handleDownloadDoc} disabled={downloadingDoc}>
                                        {downloadingDoc?'Downloading...':'Download File'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Email Modal — CORRECTLY outside docViewer ── */}
            {emailModal && (
                <div className="gus-overlay" onClick={() => { setEmailModal(null); setEmailSuccess(null); }}>
                    <div className="gus-email-modal" onClick={e => e.stopPropagation()}>

                        <div className="gus-email-modal-hdr">
                            <div>
                                <h3 className="gus-email-modal-title">Request Document Re-upload</h3>
                                <p className="gus-email-modal-sub">
                                    Sending to: <strong>{emailModal.app.email}</strong>
                                </p>
                            </div>
                            <button className="gus-modal-x" onClick={() => { setEmailModal(null); setEmailSuccess(null); }}>×</button>
                        </div>

                        {emailSuccess ? (
                            <div className="gus-email-success">
                                <div className="gus-email-success-icon">✓</div>
                                <p>{emailSuccess}</p>
                            </div>
                        ) : (
                            <div className="gus-email-modal-body">
                                <div className="gus-email-field">
                                    <label className="gus-email-label">Student</label>
                                    <div className="gus-email-value">{emailModal.app.studentName}</div>
                                </div>

                                <div className="gus-email-field">
                                    <label className="gus-email-label">Document</label>
                                    <div className="gus-email-doc-badge">{emailModal.docLabel}</div>
                                </div>

                                <div className="gus-email-field">
                                    <label className="gus-email-label">Reason for Re-upload</label>
                                    <select
                                        className="gus-email-select"
                                        value={emailReason}
                                        onChange={e => setEmailReason(e.target.value)}
                                    >
                                        <option value="incorrect_format">Incorrect Format</option>
                                        <option value="fake_document">Suspicious / Fake Document</option>
                                        <option value="blurry">Blurry / Unreadable</option>
                                        <option value="incomplete">Incomplete / Missing Pages</option>
                                        <option value="wrong_document">Wrong Document Uploaded</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div className="gus-email-field">
                                    <label className="gus-email-label">
                                        Additional Notes <span style={{color:'#94a3b8',fontWeight:400}}>(optional)</span>
                                    </label>
                                    <textarea
                                        className="gus-email-textarea"
                                        rows={3}
                                        placeholder="e.g. Please ensure the document is in PDF format and all pages are included..."
                                        value={emailNote}
                                        onChange={e => setEmailNote(e.target.value)}
                                    />
                                </div>

                                <div className="gus-email-preview">
                                    <span className="gus-email-preview-label">Email Preview</span>
                                    <p className="gus-email-preview-text">
                                        An email will be sent to <strong>{emailModal.app.studentName}</strong> asking them
                                        to re-upload their <strong>{emailModal.docLabel}</strong>.
                                        {emailNote && <> Admin note: "<em>{emailNote}</em>"</>}
                                    </p>
                                </div>

                                <div className="gus-email-modal-ftr">
                                    <button
                                        className="gus-email-cancel-btn"
                                        onClick={() => { setEmailModal(null); setEmailSuccess(null); }}
                                        disabled={emailSending}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="gus-email-send-btn"
                                        onClick={handleSendDocEmail}
                                        disabled={emailSending}
                                    >
                                        {emailSending ? (
                                            <><span className="gus-btn-spinner"/> Sending...</>
                                        ) : (
                                            'Send Email'
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}

        </div>
    );
};

export default GusUniversity;
