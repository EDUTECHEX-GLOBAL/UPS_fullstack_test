import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './medicaluniversity.css';
import API_BASE_URL from '../../config/api';
import { resolveFileUrl } from '../../utils/fileUrl';

const MedicalUniversity = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const [statusDropdownUp, setStatusDropdownUp] = useState(false);
    const statusDropdownRef = useRef(null);
    const [selectedApp, setSelectedApp] = useState(null);
    const [stats, setStats] = useState({ total: 0, approved: 0, completed: 0, incomplete: 0, underReview: 0 });
    const [docViewer, setDocViewer] = useState(null);
    const [universityModal, setUniversityModal] = useState(null);
    const [selectedUniversityKeys, setSelectedUniversityKeys] = useState([]);
    const [universityActionBusy, setUniversityActionBusy] = useState(false);
    const [universityActionError, setUniversityActionError] = useState('');
    const [approveModal, setApproveModal] = useState(null);
    const [approveLoading, setApproveLoading] = useState(false);
    const [approveError, setApproveError] = useState('');

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

    const submitMedicalApproval = async () => {
        if (!approveModal || approveLoading) return;
        setApproveLoading(true);
        setApproveError('');
        try {
            await axios.patch(`${API_BASE_URL}/api/enrollment-admin/medical/applications/${approveModal.studentId || approveModal.userId}/approve`, {}, { headers: getAuthHeaders() });
            setApproveModal(null);
            await fetchApplications();
        } catch (err) {
            setApproveError(err.response?.data?.message || err.message || 'Failed to approve program selection.');
        } finally {
            setApproveLoading(false);
        }
    };

    const toggleStatusDropdown = () => {
        if (!statusDropdownOpen && statusDropdownRef.current) {
            const rect = statusDropdownRef.current.getBoundingClientRect();
            const menuHeight = Math.min(180, window.innerHeight * 0.35);
            const spaceBelow = window.innerHeight - rect.bottom;
            const preferUpwardOnMobile = window.matchMedia('(max-width: 540px)').matches && rect.top > menuHeight;
            setStatusDropdownUp(preferUpwardOnMobile || (spaceBelow < menuHeight && rect.top > spaceBelow));
        }
        setStatusDropdownOpen((open) => !open);
    };

    const getAuthHeaders = () => {
        const token = localStorage.getItem('processAdminToken') || localStorage.getItem('token') || localStorage.getItem('adminToken');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const formatDate = (d) => {
        if (!d) return ' ';
        try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
        catch { return ' '; }
    };

    const pickDisplayValue = (...values) => {
        for (const value of values) {
            if (typeof value === 'string' && value.trim()) return value.trim();
        }
        return ' ';
    };

    const getUniversityName = (app = {}) => {
        const val = pickDisplayValue(
            app.universityName,
            app.applicationUniversityName,
            app.completedUniversityName,
            app.selectedUniversity?.name,
            app.selectedUniversity?.universityName,
            app.selectedCourse?.universityName,
            app.selectedCourse?.university,
            app.university,
            app.course?.university,
            app.programSelection?.universityName,
            app.programSelection?.institutionName,
            app.primaryCountry,
            Array.isArray(app.selectedCountries) && app.selectedCountries.length ? app.selectedCountries.join(', ') : '',
            Array.isArray(app.programSelection?.selectedCountries) && app.programSelection.selectedCountries.length ? app.programSelection.selectedCountries.join(', ') : ''
        );
        return val !== ' ' ? val : '-';
    };

    const getMobileUniversityNames = (app = {}) => {
        const universities = Array.isArray(app.selectedUniversities) ? app.selectedUniversities : [];
        const names = universities
            .map((university) => typeof university === 'string'
                ? university.trim()
                : String(university?.universityName || university?.name || university?.university || '').trim())
            .filter(Boolean);
        return names.length ? [...new Set(names)] : [getUniversityName(app)];
    };

    const getProgramName = (app = {}) => {
        const val = pickDisplayValue(
            app.programName,
            app.applicationProgramName,
            app.completedProgramName,
            app.selectedCourse?.programName,
            app.selectedCourse?.title,
            app.selectedCourse?.name,
            app.course?.courseApplied,
            app.course?.title,
            app.course?.name,
            app.programType
        );
        return val !== ' ' ? val : '-';
    };

    const isMedicalFinalApproved = (app = {}) =>
        String(app.applicationStatus || '').trim().toLowerCase() === 'approved' &&
        String(app.universitySelectionStatus || '').trim().toLowerCase() === 'completed';

    const isMedicalProgramApproved = (app = {}) =>
        String(app.programApprovalStatus || '').trim().toLowerCase() === 'approved';

    const getProgressBucket = (app = {}) => {
        const accountStatus = String(app.applicationStatus || '').trim().toLowerCase();
        const overviewStatus = String(app.overviewStatus || '').trim().toLowerCase();
        if (isMedicalFinalApproved(app)) return 'approved';
        if (
            Number(app.completionPercentage) >= 100 || app.isCompleted === true ||
            overviewStatus === 'completed' ||
            ['completed', 'submitted', 'submitted for approval', 'under review'].includes(accountStatus)
        ) return 'completed';
        if (Number(app.completionPercentage) > 0 || overviewStatus === 'in_progress' ||
            ['changes requested', 'rejected'].includes(accountStatus)) return 'inprogress';
        return 'incomplete';
    };

    const getStatusLabel = (app = {}) => {
        if (isMedicalFinalApproved(app)) return 'APPROVED';
        if (isMedicalProgramApproved(app) && (app.selectedUniversities || []).length > 0) return 'UNIVERSITIES SELECTED';
        if (isMedicalProgramApproved(app)) return 'AWAITING UNIVERSITIES';
        const bucket = getProgressBucket(app);
        if (bucket === 'completed') return 'COMPLETED';
        if (bucket === 'inprogress') return 'IN PROGRESS';
        return 'INCOMPLETE';
    };

    const getStatusClass = (app) => {
        const label = getStatusLabel(app);
        if (label === 'APPROVED') return 'status-approved';
        if (label === 'COMPLETED') return 'status-completed';
        if (label === 'IN PROGRESS' || label === 'UNIVERSITIES SELECTED' || label === 'AWAITING UNIVERSITIES') return 'status-review';
        return 'status-incomplete';
    };

    const fetchApplications = async () => {
        setLoading(true); setError(null);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/application/process-admin/medical-university/applications`, {
                headers: getAuthHeaders()
            });
            if (res.data.success) {
                const apps = res.data.data || [];
                setApplications(apps);
                setStats({
                    total: apps.length,
                    approved: apps.filter(a => getProgressBucket(a) === 'approved').length,
                    completed: apps.filter(a => getProgressBucket(a) === 'completed').length,
                    incomplete: apps.filter(a => getProgressBucket(a) === 'incomplete').length,
                    underReview: apps.filter(a => getProgressBucket(a) === 'inprogress').length,
                });
            } else {
                setError('Failed to load applications.');
            }
        } catch (err) {
            setError('Error loading applications. Note: The backend route may not exist yet.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchApplications(); }, []);

    const filtered = applications.filter(app => {
        const q = searchQuery.toLowerCase();
        const uniName = getUniversityName(app).toLowerCase();
        const progName = getProgramName(app).toLowerCase();
        const matchSearch =
            (app.studentName || '').toLowerCase().includes(q) ||
            (app.email || '').toLowerCase().includes(q)       ||
            String(app.studentId || '').includes(q)          ||
            (app.applicationId || '').toLowerCase().includes(q) ||
            uniName.includes(q) ||
            progName.includes(q);
        const matchFilter = filterStatus === 'all' || filterStatus === getProgressBucket(app);
        return matchSearch && matchFilter;
    });

    const openModal = async (app) => {
        setSelectedApp({ ...app, _loading: true });
        try {
            const res = await axios.get(`${API_BASE_URL}/api/application/process-admin/medical-university/applications/${app.studentId || app.userId}`, {
                headers: getAuthHeaders()
            });
            if (res.data.success) {
                let eligibleScoreUniversities = [];
                try {
                    const matches = await axios.get(`${API_BASE_URL}/api/application/process-admin/medical-university/applications/${app.studentId || app.userId}/universities`, {
                        headers: getAuthHeaders()
                    });
                    if (matches.data?.success) eligibleScoreUniversities = matches.data.data?.universities || [];
                } catch (matchesError) {
                    console.error('Failed to load eligible medical universities:', matchesError);
                }
                setSelectedApp({ ...res.data.data, eligibleScoreUniversities });
            }
        } catch (err) {
            console.error('Failed to load details', err);
            // Display partial details if API fails
            setSelectedApp(app);
        }
    };

    const hasSavedUniversity = (app = {}) => (
        (Array.isArray(app.selectedUniversities) && app.selectedUniversities.length > 0) ||
        [app.universityName, app.applicationUniversityName, app.completedUniversityName,
            app.selectedUniversity?.name, app.selectedUniversity?.universityName,
            app.programSelection?.universityName, app.programSelection?.institutionName]
            .some((value) => typeof value === 'string' && value.trim() && value.trim() !== '-')
    );

    const openUniversityModal = async (app, readOnly = false) => {
        setUniversityActionError('');
        setUniversityModal({ ...app, loading: true, readOnly });
        try {
            const studentId = app.studentId || app.userId;
            const res = await axios.get(`${API_BASE_URL}/api/application/process-admin/medical-university/applications/${studentId}/universities`, { headers: getAuthHeaders() });
            const data = res.data?.data || {};
            const eligibleKeys = new Set((data.universities || []).map((item) => `${item.universityName}|${item.country}`));
            const selected = data.selectedUniversities || app.selectedUniversities || [];
            const visibleSelected = selected.filter((item) => eligibleKeys.has(`${item.universityName}|${item.country}`));
            setSelectedUniversityKeys(visibleSelected.map((item) => `${item.universityName}|${item.country}`));
            setUniversityModal({ ...app, ...data, loading: false, readOnly });
        } catch (err) {
            setUniversityModal({ ...app, loading: false, readOnly, universities: [], selectedUniversities: app.selectedUniversities || [] });
            setUniversityActionError(err.response?.data?.message || 'Unable to load NEET eligible medical universities.');
        }
    };

    const toggleUniversity = (university) => {
        const key = `${university.universityName}|${university.country}`;
        setSelectedUniversityKeys((current) => current.includes(key)
            ? current.filter((item) => item !== key)
            : current.length < 5 ? [...current, key] : current);
    };

    const saveMedicalUniversities = async () => {
        if (!universityModal || !selectedUniversityKeys.length) return;
        setUniversityActionBusy(true);
        setUniversityActionError('');
        try {
            const selectedUniversities = universityModal.universities.filter((university) => selectedUniversityKeys.includes(`${university.universityName}|${university.country}`));
            await axios.post(`${API_BASE_URL}/api/application/process-admin/medical-university/save-university-selection`, {
                studentId: universityModal.studentId || universityModal.userId,
                selectedUniversities,
            }, { headers: getAuthHeaders() });
            setUniversityModal(null);
            await fetchApplications();
        } catch (err) {
            setUniversityActionError(err.response?.data?.message || 'Failed to save university selections.');
        } finally {
            setUniversityActionBusy(false);
        }
    };

    const approveMedicalUniversities = async (app) => {
        setUniversityActionBusy(true);
        setUniversityActionError('');
        try {
            await axios.post(`${API_BASE_URL}/api/application/process-admin/medical-university/approve-university-selection`, {
                studentId: app.studentId || app.userId,
            }, { headers: getAuthHeaders() });
            setUniversityModal(null);
            await fetchApplications();
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to approve medical university selection.';
            setUniversityActionError(message);
            if (!universityModal) window.alert(message);
        } finally {
            setUniversityActionBusy(false);
        }
    };

    const [downloadingDoc, setDownloadingDoc] = useState(false);

    const isImageType = (ft) => ['jpg','jpeg','png','webp','gif'].includes((ft || '').toLowerCase());
    const isPdfType   = (ft, name = '') => {
        const s = (ft || '').toLowerCase();
        const n = (name || '').toLowerCase();
        return s.includes('pdf') || s === 'application/pdf' || n.endsWith('.pdf');
    };

    const getFileType = (url, fileType) => {
        if (fileType) return fileType.toLowerCase();
        if (typeof url === 'string') {
            const ext = url.split('.').pop().toLowerCase();
            if (['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return ext;
        }
        return '';
    };

    const openDocViewer = (url, label, docObj = {}) => {
        if (!url) return;
        const fileType = getFileType(url, docObj.fileType);
        setDocViewer({ url: resolveFileUrl(url), label, fileType, originalName: docObj.fileName || label });
    };

    const closeDocViewer = () => setDocViewer(null);

    const visibleMedicalUniversities = universityModal?.readOnly
        ? (universityModal.universities || []).filter((university) => selectedUniversityKeys.includes(`${university.universityName}|${university.country}`))
        : (universityModal?.universities || []);

    const handleDownloadDoc = async () => {
        if (!docViewer?.url) return;
        setDownloadingDoc(true);
        
        let downloadUrl = docViewer.url;
        try {
            const urlObj = new URL(downloadUrl);
            urlObj.searchParams.set('download', 'true');
            downloadUrl = urlObj.toString();
        } catch {
            downloadUrl += (downloadUrl.includes('?') ? '&' : '?') + 'download=true';
        }

        try {
            const token = localStorage.getItem('processAdminToken') || localStorage.getItem('token') || localStorage.getItem('adminToken');
            const isAwsUrl = downloadUrl.includes('amazonaws.com');
            const response = await fetch(downloadUrl, {
                headers: (token && !isAwsUrl) ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = docViewer.originalName || docViewer.label || 'document';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.warn('Fetch download failed (likely CORS), falling back to direct navigation:', error);
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

    return (
        <div className="med-wrap">
            <div className="med-page-header">
                <div className="med-page-header-accent"></div>
                <div className="med-page-header-left">
                    <h1 className="med-page-title">Medical Applications</h1>
                    <p className="med-page-sub">Process and verify medical student applications</p>
                </div>
                <div className="med-page-header-right">
                    <button type="button" className="med-refresh-btn" onClick={fetchApplications} disabled={loading}>
                        <svg className={`med-refresh-icon${loading ? ' is-spinning' : ''}`} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M20 7v5h-5" />
                            <path d="M4 17v-5h5" />
                            <path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3" />
                        </svg>
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            <div className="med-stats-row">
                <div className="med-stat-card med-stat-total">
                    <div className="med-stat-text">
                        <span className="med-stat-label">Total Applications</span>
                        <span className="med-stat-num">{stats.total}</span>
                    </div>
                </div>
                <div className="med-stat-card med-stat-approved">
                    <div className="med-stat-text">
                        <span className="med-stat-label">Approved</span>
                        <span className="med-stat-num">{stats.approved}</span>
                    </div>
                </div>
                <div className="med-stat-card med-stat-completed">
                    <div className="med-stat-text">
                        <span className="med-stat-label">Completed</span>
                        <span className="med-stat-num">{stats.completed}</span>
                    </div>
                </div>
                <div className="med-stat-card med-stat-review">
                    <div className="med-stat-text">
                        <span className="med-stat-label">In Progress</span>
                        <span className="med-stat-num">{stats.underReview}</span>
                    </div>
                </div>
                <div className="med-stat-card med-stat-incomplete">
                    <div className="med-stat-text">
                        <span className="med-stat-label">Incomplete</span>
                        <span className="med-stat-num">{stats.incomplete}</span>
                    </div>
                </div>
            </div>

            <div className="med-controls">
                <div className="med-search-box">
                    <input type="text" className="med-search-input" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <div className={`med-status-select-wrap ${statusDropdownOpen ? 'is-open' : ''}`} ref={statusDropdownRef}>
                    <button
                        type="button"
                        className="med-status-select"
                        onClick={toggleStatusDropdown}
                        aria-haspopup="listbox"
                        aria-expanded={statusDropdownOpen}
                        aria-label="Filter medical applications by status"
                    >
                        <span>{{ all: 'All Status', approved: 'Approved', completed: 'Completed', inprogress: 'In Progress', incomplete: 'Incomplete' }[filterStatus]}</span>
                        <span className="med-status-select-arrow" aria-hidden="true" />
                    </button>
                    {statusDropdownOpen && (
                        <div className={`med-status-select-menu ${statusDropdownUp ? 'opens-up' : ''}`} role="listbox" aria-label="Medical application status">
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
            </div>

            <div className="med-table-card med-desktop-table">
                <div className="med-table-wrap-scroll">
                    <table className="med-table">
                        <thead>
                            <tr className="med-thead-row">
                                <th>Student</th>
                                <th>App ID</th>
                                <th>University</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px'}}>{error || 'Loading...'}</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px'}}>No applications found.</td></tr>
                            ) : filtered.map(app => (
                                <tr key={app.studentId || app.userId} className="med-tbody-row">
                                    <td>
                                        <div className="med-student-cell">
                                            <div className="med-student-details">
                                                <span className="med-student-name">{app.studentName || 'N/A'}</span>
                                                <span className="med-student-email">{app.email || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span className="med-college-badge">{app.applicationId || '-'}</span></td>
                                    <td>
                                        <div className="med-uni-cell">
                                            <span className="med-uni-name">{getUniversityName(app)}</span>
                                            {getProgramName(app) !== '-' && (
                                                <span className="med-uni-program">{getProgramName(app)}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`med-badge ${getStatusClass(app)}`}>{getStatusLabel(app)}</span>
                                    </td>
                                    <td>
                                        <div className="med-table-actions">
                                            <button className="med-btn-view" onClick={() => openModal(app)}>View Details</button>
                                            {hasSavedUniversity(app) ? (
                                                <button className="med-btn-view" onClick={() => openUniversityModal(app, String(app.universitySelectionStatus || '').toLowerCase() === 'completed')}>View University</button>
                                            ) : null}
                                            {(String(app.programApprovalStatus || '').toLowerCase() === 'approved' || String(app.applicationStatus || '').toLowerCase() === 'approved') && !hasSavedUniversity(app) ? (
                                                <button className="med-btn-view" onClick={() => openUniversityModal(app)}>View Universities</button>
                                            ) : null}
                                            {hasSavedUniversity(app) && String(app.universitySelectionStatus || '').toLowerCase() !== 'completed' && (String(app.programApprovalStatus || '').toLowerCase() === 'approved' || String(app.applicationStatus || '').toLowerCase() === 'approved') ? (
                                                <button className="med-btn-verify" onClick={() => approveMedicalUniversities(app)}>Approve Selection</button>
                                            ) : null}
                                            {String(app.universitySelectionStatus || '').toLowerCase() === 'completed' ? (
                                                <span className="med-sent-badge" style={{ background: '#dcfce7', color: '#166534' }}>Approved</span>
                                            ) : null}
                                            {String(app.programApprovalStatus || '').toLowerCase() !== 'approved' && app.universitySelectionStatus !== 'Completed' && String(app.applicationStatus || '').toLowerCase() !== 'approved' && (
                                                <button className="med-btn-verify" onClick={() => {
                                                    setApproveError('');
                                                    setApproveModal(app);
                                                }}>Approve Program</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="med-mobile-cards">
                {loading ? (
                    <div className="med-empty-cards">{error || 'Loading applications...'}</div>
                ) : filtered.length === 0 ? (
                    <div className="med-empty-cards">{error || 'No applications found.'}</div>
                ) : filtered.map((app, index) => {
                    const status = getStatusLabel(app);
                    const hasUniversity = hasSavedUniversity(app);
                    const programApproved = String(app.programApprovalStatus || '').toLowerCase() === 'approved' ||
                        String(app.applicationStatus || '').toLowerCase() === 'approved';
                    const universityApproved = String(app.universitySelectionStatus || '').toLowerCase() === 'completed';
                    return (
                        <article className="med-mob-card" key={app.studentId || app.userId || app._id || index}>
                            <div className="med-mob-card-top">
                                <span className="med-college-badge">{app.applicationId || '-'}</span>
                                <span className={`med-badge ${getStatusClass(app)}`}>{status}</span>
                            </div>
                            <div className="med-mob-card-body">
                                <div className="med-mob-uni-row">
                                    <span className="med-mob-uni-label">Universities</span>
                                    <div className="med-mob-uni-list">
                                        {getMobileUniversityNames(app).map((university, uniIndex) => (
                                            <span className="med-mob-uni-name" key={`${university}-${uniIndex}`}>{university}</span>
                                        ))}
                                    </div>
                                    {getProgramName(app) !== '-' && <span className="med-mob-program">{getProgramName(app)}</span>}
                                </div>
                                <div className="med-mob-student">
                                    <div className="med-avatar med-avatar-md" style={{ background: '#2563eb' }}>{(app.studentName || 'N/A').slice(0, 1).toUpperCase()}</div>
                                    <div className="med-mob-student-info">
                                        <div className="med-mob-name">{app.studentName || 'N/A'}</div>
                                        <div className="med-mob-email">{app.email || 'N/A'}</div>
                                        {app.phone && <div className="med-mob-phone">{app.phone}</div>}
                                    </div>
                                </div>
                                <div className="med-mob-meta-grid">
                                    <div className="med-mob-meta-item">
                                        <span className="med-mob-meta-lbl">Submitted</span>
                                        <span className="med-mob-meta-val">{formatDate(app.updatedAt || app.createdAt) || '-'}</span>
                                    </div>
                                    <div className="med-mob-meta-item">
                                        <span className="med-mob-meta-lbl">Progress</span>
                                        <div className="med-mob-prog-row">
                                            <div className="med-prog-track">
                                                <div className="med-prog-fill" style={{ width: `${Math.min(100, Number(app.completionPercentage) || 0)}%` }} />
                                            </div>
                                            <span className="med-prog-pct">{Math.min(100, Number(app.completionPercentage) || 0)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="med-mob-card-footer">
                                <button className="med-btn-view med-mob-action-primary" onClick={() => openModal(app)}>View Details</button>
                                {hasUniversity ? (
                                    <button className="med-btn-view" onClick={() => openUniversityModal(app, universityApproved)}>View University</button>
                                ) : programApproved ? (
                                    <button className="med-btn-view" onClick={() => openUniversityModal(app)}>View Universities</button>
                                ) : null}
                                {hasUniversity && !universityApproved && programApproved ? (
                                    <button className="med-btn-verify" onClick={() => approveMedicalUniversities(app)}>Approve Selection</button>
                                ) : null}
                                {universityApproved ? (
                                    <span className="med-sent-badge med-mob-status-approved">Approved</span>
                                ) : !programApproved ? (
                                    <button className="med-btn-verify" onClick={() => {
                                        setApproveError('');
                                        setApproveModal(app);
                                    }}>Approve Program</button>
                                ) : null}
                            </div>
                        </article>
                    );
                })}
            </div>

            {universityModal && (
                <div className="med-overlay med-university-overlay" onClick={() => !universityActionBusy && setUniversityModal(null)}>
                    <section className="med-university-picker" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="med-university-picker-title">
                        <header className="med-university-picker-header">
                            <div>
                                <span>{universityModal.readOnly ? 'APPROVED MEDICAL APPLICATION' : 'NEET ELIGIBLE OPTIONS'}</span>
                                <h2 id="med-university-picker-title">{universityModal.readOnly ? 'Selected University' : 'Medical university matches'}</h2>
                                <p>{universityModal.studentName || 'Student'} · {universityModal.applicationId || ''} · NEET score: {universityModal.neetScore ?? 'not found'}</p>
                            </div>
                            <button type="button" onClick={() => setUniversityModal(null)} aria-label="Close university selector">×</button>
                        </header>
                        {universityActionError && <p className="med-university-picker-error" role="alert">{universityActionError}</p>}
                        {!universityModal.loading && universityModal.neetScore !== null && universityModal.neetScore !== undefined && (
                            <p className="med-university-picker-note">Eligible universities have a minimum NEET score at or below {universityModal.neetScore}. Closest cutoffs appear first.</p>
                        )}
                        {universityModal.loading ? (
                            <p className="med-university-picker-empty">Loading eligible universities…</p>
                        ) : visibleMedicalUniversities.length ? (
                            <div className="med-university-picker-list">
                                {visibleMedicalUniversities.map((university, index) => {
                                    const key = `${university.universityName}|${university.country}`;
                                    const isSelected = selectedUniversityKeys.includes(key);
                                    return (
                                        <article className="med-university-match-item" key={key}>
                                            <span className="med-university-match-index">{index + 1}</span>
                                            <div className="med-university-match-copy">
                                                <strong>{university.universityName}</strong>
                                                <span>{university.country} · {university.programName}</span>
                                            </div>
                                            <span className="med-university-match-score">Exact NEET score match: {university.minScoreRequired}</span>
                                            <button type="button" className={`med-university-select-btn${isSelected ? ' is-selected' : ''}`} onClick={() => toggleUniversity(university)} disabled={universityModal.readOnly || (!isSelected && selectedUniversityKeys.length >= 5)}>
                                                {universityModal.readOnly ? (isSelected ? 'Selected' : 'Eligible') : (isSelected ? 'Selected' : 'Select')}
                                            </button>
                                        </article>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="med-university-picker-empty">No medical universities match this student’s NEET score.</p>
                        )}
                        <footer className="med-university-picker-footer">
                            <span>{universityModal.readOnly ? `${selectedUniversityKeys.length} selected` : `${selectedUniversityKeys.length} / 5 selected`}</span>
                            <div>
                                <button type="button" className="med-university-close-btn" onClick={() => setUniversityModal(null)} disabled={universityActionBusy}>Close</button>
                                {!universityModal.readOnly && <button type="button" className="med-university-save-btn" onClick={saveMedicalUniversities} disabled={universityActionBusy || selectedUniversityKeys.length === 0}>{universityActionBusy ? 'Saving…' : 'Save selections'}</button>}
                            </div>
                        </footer>
                    </section>
                </div>
            )}

            {selectedApp && (
                <div className="med-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedApp(null); }}>
                    <div className="med-modal">
                        <div className="med-modal-hdr med-premium-hdr">
                            <div className="med-modal-hdr-left med-premium-student">
                                <div className="med-modal-avatar med-premium-avatar">
                                    {(selectedApp.studentName || 'A').substring(0,2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="med-premium-eyebrow">Medical Application</p>
                                    <h2 className="med-modal-title med-premium-title">{selectedApp.studentName || '-'}</h2>
                                    <p className="med-modal-appid med-premium-appid">App ID: {selectedApp.applicationId || '-'}</p>
                                </div>
                            </div>
                            <div className="med-modal-hdr-right med-premium-actions">
                                <div className="med-status-card">
                                    <div>
                                        <span>Application Status</span>
                                        <strong>{getStatusLabel(selectedApp)}</strong>
                                    </div>
                                </div>
                                <button type="button" className="med-modal-x med-premium-close" onClick={() => setSelectedApp(null)}>×</button>
                            </div>
                        </div>

                        <div className="med-modal-body" style={{ padding: '24px', background: '#f8fafc' }}>
                            {/* 1. SELECTED UNIVERSITIES & PROGRAMS */}
                            <div className="review-section-card">
                                <h3 className="review-card-title">Selected Universities &amp; Programs</h3>
                                {getUniversityName(selectedApp) !== '-' ? (
                                    <div className="review-uni-list">
                                        <div className="review-uni-card">
                                            <div className="review-uni-header">
                                                <span className="review-uni-name">{getUniversityName(selectedApp)}</span>
                                                {(selectedApp.primaryCountry || (Array.isArray(selectedApp.selectedCountries) && selectedApp.selectedCountries.length > 0)) && (
                                                    <span className="review-uni-country">
                                                        {selectedApp.primaryCountry || selectedApp.selectedCountries.join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                            {getProgramName(selectedApp) !== '-' && (
                                                <>
                                                    <div className="review-uni-courses-label">Selected Program / Course:</div>
                                                    <div className="review-chips-flex">
                                                        <span className="review-chip primary-chip">{getProgramName(selectedApp)}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ) : selectedApp.programSelection && selectedApp.programSelection.selectedCountries?.length > 0 ? (
                                    <div className="review-uni-list">
                                        <div className="review-uni-card">
                                            <div className="review-uni-header">
                                                <span className="review-uni-name">
                                                    {selectedApp.programSelection.universityName || selectedApp.programSelection.institutionName || 'Selected Countries'}
                                                </span>
                                                <span className="review-uni-country">
                                                    {selectedApp.programSelection.selectedCountries.join(', ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="review-empty-text">No university details available.</p>
                                )}
                            </div>

                            {/* 2. PERSONAL & CONTACT DETAILS */}
                            <div className="review-section-card">
                                <h3 className="review-card-title">Personal &amp; Contact Details</h3>
                                <div className="review-info-grid">
                                    <div className="review-info-item">
                                        <span className="review-info-label">Full Name</span>
                                        <span className="review-info-val">{selectedApp.studentName || '-'}</span>
                                    </div>
                                    <div className="review-info-item">
                                        <span className="review-info-label">Email Address</span>
                                        <span className="review-info-val">{selectedApp.email || selectedApp.personal?.email || '-'}</span>
                                    </div>
                                    <div className="review-info-item">
                                        <span className="review-info-label">Phone / Mobile</span>
                                        <span className="review-info-val">{selectedApp.phone || selectedApp.personal?.phone || '-'}</span>
                                    </div>
                                    {selectedApp.personal?.permAddress && (
                                        <div className="review-info-item full-width">
                                            <span className="review-info-label">Permanent Address</span>
                                            <span className="review-info-val">{selectedApp.personal.permAddress || selectedApp.personal?.address1 || '-'}</span>
                                        </div>
                                    )}
                                    {selectedApp.personal?.corrAddress && (
                                        <div className="review-info-item full-width">
                                            <span className="review-info-label">Correspondence Address</span>
                                            <span className="review-info-val">{selectedApp.personal.corrAddress || selectedApp.personal?.address2 || '-'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 3. PARENT / GUARDIAN DETAILS */}
                            <div className="review-section-card">
                                <h3 className="review-card-title">Parent / Guardian Details</h3>
                                <div className="review-info-grid">
                                    <div className="review-info-item">
                                        <span className="review-info-label">Parent / Guardian Name</span>
                                        <span className="review-info-val">{selectedApp.personal?.parentName || selectedApp.familyDetails?.parent1?.fullName || '-'}</span>
                                    </div>
                                    <div className="review-info-item">
                                        <span className="review-info-label">Relationship</span>
                                        <span className="review-info-val">{selectedApp.personal?.parentType || selectedApp.familyDetails?.parent1?.relationship || '-'}</span>
                                    </div>
                                    <div className="review-info-item">
                                        <span className="review-info-label">Phone Number</span>
                                        <span className="review-info-val">{selectedApp.personal?.parentPhone || selectedApp.familyDetails?.parent1?.phone || '-'}</span>
                                    </div>
                                    <div className="review-info-item">
                                        <span className="review-info-label">Email Address</span>
                                        <span className="review-info-val">{selectedApp.personal?.parentEmail || selectedApp.familyDetails?.parent1?.email || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 4. ACADEMIC QUALIFICATIONS */}
                            <div className="review-section-card">
                                <h3 className="review-card-title">Academic Qualifications</h3>
                                {selectedApp.education?.entries?.length > 0 ? (
                                    <div className="review-table-wrapper">
                                        <table className="review-table">
                                            <thead>
                                                <tr>
                                                    <th>Qualification</th>
                                                    <th>School / College</th>
                                                    <th>Board / Univ</th>
                                                    <th>Score / %</th>
                                                    <th>Passing Year</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedApp.education.entries.map((edu, idx) => (
                                                    <tr key={idx}>
                                                        <td className="cell-primary">{edu.qualification || '-'}</td>
                                                        <td>{edu.schoolName || '-'}</td>
                                                        <td>{edu.boardUniversity || '-'}</td>
                                                        <td className="cell-score">{edu.score || '-'}</td>
                                                        <td>{edu.yearOfPassing || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="review-info-grid">
                                        <div className="review-info-item"><span className="review-info-label">10th Board</span><span className="review-info-val">{selectedApp.academic?.tenthBoard || '-'}</span></div>
                                        <div className="review-info-item"><span className="review-info-label">10th School</span><span className="review-info-val">{selectedApp.academic?.tenthSchool || '-'}</span></div>
                                        <div className="review-info-item"><span className="review-info-label">10th %</span><span className="review-info-val">{selectedApp.academic?.tenthPercent || '-'}</span></div>
                                        <div className="review-info-item"><span className="review-info-label">12th Board</span><span className="review-info-val">{selectedApp.academic?.twelfthBoard || '-'}</span></div>
                                        <div className="review-info-item"><span className="review-info-label">12th School</span><span className="review-info-val">{selectedApp.academic?.twelfthSchool || '-'}</span></div>
                                        <div className="review-info-item"><span className="review-info-label">12th %</span><span className="review-info-val">{selectedApp.academic?.twelfthPercent || '-'}</span></div>
                                        <div className="review-info-item"><span className="review-info-label">PCB %</span><span className="review-info-val">{selectedApp.academic?.pcbPercent || '-'}</span></div>
                                        <div className="review-info-item"><span className="review-info-label">NEET Score</span><span className="review-info-val">{selectedApp.academic?.neetScore || '-'}</span></div>
                                        <div className="review-info-item"><span className="review-info-label">NEET Rank</span><span className="review-info-val">{selectedApp.academic?.neetRank || '-'}</span></div>
                                        <div className="review-info-item"><span className="review-info-label">NEET Roll No</span><span className="review-info-val">{selectedApp.academic?.neetRoll || '-'}</span></div>
                                    </div>
                                )}
                            </div>

                            {/* 5. STANDARDIZED & ENTRANCE TEST SCORES */}
                            {((Array.isArray(selectedApp.scores?.tests) && selectedApp.scores.tests.length > 0) ||
                              (Array.isArray(selectedApp.testScores) && selectedApp.testScores.length > 0)) && (
                                <div className="review-section-card">
                                    <h3 className="review-card-title">Standardized &amp; Entrance Test Scores</h3>
                                    <div className="review-test-list">
                                        {(
                                            (Array.isArray(selectedApp.scores?.tests) && selectedApp.scores.tests.length > 0)
                                                ? selectedApp.scores.tests
                                                : (Array.isArray(selectedApp.testScores) ? selectedApp.testScores : [])
                                        ).map((test, idx) => {
                                            const selectedUnis = Array.isArray(test.selectedUniversities) && test.selectedUniversities.length > 0
                                                ? test.selectedUniversities
                                                : (Array.isArray(test.eligibleUniversities) ? test.eligibleUniversities : []);

                                            return (
                                                <div key={idx} className="review-test-card">
                                                    <div className="review-test-header">
                                                        <span className="review-test-name">{test.exam || '-'}</span>
                                                        <span className="review-score-badge">
                                                            Score: {test.score || test.verbalScore || test.percentile || '-'}
                                                        </span>
                                                    </div>
                                                    <div className="review-test-date">
                                                        Test Date: {test.testDate || 'N/A'}
                                                    </div>
                                                    {selectedUnis.length > 0 && (
                                                        <div className="review-qualifying-unis">
                                                            <div className="review-qualifying-label">Eligible universities for this score ({selectedUnis.length}):</div>
                                                            <div className="review-chips-flex">
                                                                {selectedUnis.map((u, uIdx) => {
                                                                    const uName = typeof u === 'string' ? u : (u.university || u.universityName || 'University');
                                                                    const country = typeof u === 'object' && u.country ? ` (${u.country})` : '';
                                                                    const minimum = typeof u === 'object' && u.minScoreRequired !== undefined ? ` · minimum ${u.minScoreRequired}` : '';
                                                                    return (
                                                                        <span key={uIdx} className="review-chip font-medium">
                                                                            {uName}{country}{minimum}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <section className="review-qualifying-unis" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                                <div className="review-qualifying-label" style={{ color: '#166534', fontWeight: 700, marginBottom: 10 }}>
                                    Eligible universities for this score ({(selectedApp.eligibleScoreUniversities || []).length}):
                                </div>
                                {(selectedApp.eligibleScoreUniversities || []).length ? (
                                    <div className="review-chips-flex">
                                        {selectedApp.eligibleScoreUniversities.map((university, index) => (
                                            <span key={`${university.universityName}-${university.country}-${index}`} className="review-chip font-medium primary-chip review-matched-university">
                                                <strong>{university.universityName}</strong>{university.country ? ` (${university.country})` : ''}{university.minScoreRequired !== undefined ? ` · minimum ${university.minScoreRequired}` : ''}
                                            </span>
                                        ))}
                                    </div>
                                ) : <div className="review-no-university-match">No score-matched universities are available for the selected country.</div>}
                            </section>

                            {/* 6. UPLOADED APPLICATION DOCUMENTS */}
                            <div className="review-section-card">
                                <h3 className="review-card-title">Uploaded Application Documents</h3>
                                <div className="review-docs-grid">
                                    {(() => {
                                        const DOC_LABELS = {
                                            photo: 'Passport Photo',
                                            signature: 'Signature',
                                            idProof: 'ID Proof',
                                            birthCertificate: 'Birth Certificate',
                                            passport: 'Passport',
                                            ninthMarksheet: '9th Marksheet',
                                            tenthMarksheet: '10th Marksheet',
                                            tenthCertificate: '10th Certificate',
                                            eleventhMarksheet: '11th Marksheet',
                                            twelfthMarksheet: '12th Marksheet',
                                            twelfthCertificate: '12th Certificate',
                                            migrationCertificate: 'Migration Certificate',
                                            transferCertificate: 'Transfer Certificate',
                                            transferCert: 'Transfer Certificate',
                                            characterCertificate: 'Character Certificate',
                                            neetScorecard: 'NEET Scorecard',
                                            neetAdmitCard: 'NEET Admit Card',
                                            categoryCert: 'Category / Caste Certificate',
                                            ewsCertificate: 'EWS Certificate',
                                            domicileCertificate: 'Domicile / Residence Certificate',
                                            disabilityCertificate: 'PwD / Disability Certificate',
                                            medicalFitnessCertificate: 'Medical Fitness Certificate',
                                            gapCertificate: 'Gap Certificate',
                                            englishProficiencyCertificate: 'English Language Proficiency Certificate',
                                            ucatScorecard: 'UCAT Scorecard',
                                            financialDocuments: 'Financial / Sponsorship Documents',
                                            universitySupportingDocuments: 'University-Specific Supporting Documents',
                                            otherSupportingDocuments: 'Other Supporting Documents',
                                        };

                                        if (!selectedApp.documents) return <p className="review-empty-text">No documents uploaded.</p>;

                                        const docItems = Object.entries(selectedApp.documents).flatMap(([key, value]) => {
                                            const files = Array.isArray(value) ? value : [value];
                                            return files.map((fileObj, index) => {
                                                if (!fileObj || typeof fileObj !== 'object' || !fileObj.fileUrl) return null;
                                                const uniqueKey = Array.isArray(value) && value.length > 1 ? `${key}-${index}` : key;
                                                return (
                                                    <div key={uniqueKey} className="review-doc-row">
                                                        <div className="review-doc-title-group" style={{ flex: 1, minWidth: 0, paddingRight: '10px' }}>
                                                            <span className="review-doc-name" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {DOC_LABELS[key] || fileObj.label || key} {Array.isArray(value) && value.length > 1 ? `(${index + 1})` : ''}
                                                            </span>
                                                        </div>
                                                        <div className="review-doc-actions">
                                                            <span className="review-doc-badge status-uploaded">Uploaded</span>
                                                            <button
                                                                type="button"
                                                                className="btn-doc-view"
                                                                onClick={() => openDocViewer(fileObj.fileUrl, fileObj.fileName || key, fileObj)}
                                                            >
                                                                View
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        }).filter(Boolean);

                                        return docItems.length > 0 ? docItems : <p className="review-empty-text">No documents available.</p>;
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Approve Medical Program Modal ── */}
            {approveModal && (
                <div className="gus-overlay" onClick={() => !approveLoading && setApproveModal(null)}>
                    <div className="gus-verify-modal" role="dialog" aria-modal="true" aria-labelledby="medical-program-approval-title" onClick={event => event.stopPropagation()}>
                        <div className="gus-verify-header" style={{ background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)', borderBottom: '1px solid #fecdd3' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 2v2" />
                                        <path d="M5 2v2" />
                                        <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
                                        <path d="M8 15a6 6 0 0 0 12 0v-3" />
                                        <circle cx="20" cy="10" r="2" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 id="medical-program-approval-title" style={{ margin: '0 0 4px', color: '#0f2942', fontSize: 18, fontWeight: 700 }}>Approve this medical application?</h3>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: 12.5 }}>Confirm the partner review of this student’s submitted program details.</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setApproveModal(null)} disabled={approveLoading}>&times;</button>
                        </div>
                        <div className="gus-verify-details">
                            <div><span>Student</span><strong>{approveModal.fullName || approveModal.studentName || 'Unknown'}</strong></div>
                            <div><span>Application ID</span><strong>{approveModal.applicationId || '-'}</strong></div>
                            <div><span>NEET Score / Rank</span><strong>{approveModal.neetScore || approveModal.education?.medicalDetails?.neetScore || '-'} {approveModal.neetRank ? `(Rank ${approveModal.neetRank})` : ''}</strong></div>
                            <div><span>Target Countries</span><strong>{Array.isArray(approveModal.selectedCountries) && approveModal.selectedCountries.length > 0 ? approveModal.selectedCountries.join(', ') : (approveModal.country || '-')}</strong></div>
                        </div>
                        <p className="gus-verify-message">This approves the student’s medical program review and moves the application to university assignment. You will select and approve the universities; the student can view the assignment after your approval.</p>
                        {approveError && <div className="gus-verify-error">{approveError}</div>}
                        <div className="gus-verify-actions">
                            <button type="button" className="gus-verify-cancel" onClick={() => setApproveModal(null)} disabled={approveLoading}>Cancel</button>
                            <button type="button" className="gus-verify-submit" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 0, color: '#fff', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)' }} onClick={submitMedicalApproval} disabled={approveLoading}>
                                {approveLoading ? 'Approving...' : 'Confirm program approval'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {docViewer && (
                <div className="med-docviewer-overlay" onClick={closeDocViewer}>
                    <div className="med-docviewer-box" onClick={e => e.stopPropagation()}>
                        <div className="med-docviewer-hdr">
                            <div className="med-docviewer-hdr-left">
                                <span className="med-docviewer-icon">
                                    {isImageType(docViewer.fileType) ? 'Image' : (isPdfType(docViewer.fileType, docViewer.originalName) ? 'PDF' : 'File')}
                                </span>
                                <div>
                                    <div className="med-docviewer-title">{docViewer.label}</div>
                                    <div className="med-docviewer-filename">{docViewer.originalName}</div>
                                </div>
                            </div>
                            <div className="med-docviewer-hdr-right">
                                <a href={docViewer.url} target="_blank" rel="noopener noreferrer" className="med-docviewer-open-btn" title="Open in new tab">
                                    Open
                                </a>
                                <button className="med-docviewer-open-btn" disabled={downloadingDoc} onClick={handleDownloadDoc}>
                                    {downloadingDoc ? 'Downloading...' : 'Download'}
                                </button>
                                <button className="med-docviewer-close" onClick={closeDocViewer}>×</button>
                            </div>
                        </div>
                        <div className="med-docviewer-body">
                            {isImageType(docViewer.fileType) ? (
                                <div className="med-docviewer-img-wrap">
                                    <img src={docViewer.url} alt={docViewer.originalName} className="med-docviewer-img"
                                        onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}}/>
                                    <div className="med-docviewer-fallback" style={{display:'none'}}>
                                        <p>Could not load image preview.</p>
                                        <button className="med-docviewer-open-btn" onClick={handleDownloadDoc} disabled={downloadingDoc}>
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
                                <div className="med-docviewer-fallback">
                                    <p style={{fontWeight:600,color:'#374151'}}>{docViewer.originalName}</p>
                                    <p style={{color:'#9ca3af',fontSize:13}}>Preview not available for <strong>.{docViewer.fileType}</strong> files.</p>
                                    <button className="med-docviewer-open-btn" onClick={handleDownloadDoc} disabled={downloadingDoc}>
                                        {downloadingDoc?'Downloading...':'Download File'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MedicalUniversity;
