import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import VerificationMessageModal, { MAX_VERIFICATION_MESSAGE_LENGTH, MIN_VERIFICATION_MESSAGE_LENGTH, VERIFICATION_MESSAGE_ERROR } from './VerificationMessageModal';
import './AdminVerifyDocuments.css';

const UniversityVerification = React.lazy(() => import('../universityVerification/UniversityVerification'));

const REQUEST_CHANGE_TEMPLATES = [
  'Please upload a clearer copy of the document. The uploaded file is not readable.',
  'The uploaded document is incomplete. Please upload all pages before resubmitting your application.',
  'The uploaded document has expired. Kindly upload a valid and updated document.',
  'The uploaded document does not match the information provided in your application. Please upload the correct document.',
  'One or more required documents are missing. Please upload the remaining documents to continue your application.',
];
const REJECT_TEMPLATES = [
  'Your application has been rejected because the uploaded documents could not be verified.',
  'Your application has been rejected because the submitted documents do not meet the admission requirements.',
  'Your application has been rejected because mandatory documents were not provided.',
  'The uploaded documents were found to be invalid or inconsistent with the submitted information.',
  'Unfortunately, your application has been rejected after document verification. Please contact our admissions team if you require additional clarification.',
];

const statusLabels = {
  pending_admin_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  changes_requested: 'Changes Requested',
};
const statusClasses = {
  pending_admin_review: 'avd-status-pending',
  approved: 'avd-status-approved',
  rejected: 'avd-status-rejected',
  changes_requested: 'avd-status-changes',
};
const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending_admin_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'changes_requested', label: 'Changes Requested' },
];
const formatDate = value => value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const resolveDocumentUrl = value => !value ? '' : (value.startsWith('http://') || value.startsWith('https://') ? value : API_BASE_URL + (value.startsWith('/') ? '' : '/') + value);
const getInitials = name => String(name || 'Unknown').split(' ').filter(Boolean).map(word => word[0]).slice(0, 2).join('').toUpperCase();
const pickDisplayValue = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};
const getSelectedProgrammes = (app = {}) => {
  if (Array.isArray(app.selectedProgrammes) && app.selectedProgrammes.length) return app.selectedProgrammes;
  if (Array.isArray(app.applicationUniversities) && app.applicationUniversities.length) {
    return app.applicationUniversities.flatMap((university = {}) => {
      const courses = Array.isArray(university.selectedCourses) ? university.selectedCourses : [];
      return courses.map((course = {}) => ({
        ...course,
        universityName: pickDisplayValue(university.universityName, university.name, course.universityName, course.university),
        programName: pickDisplayValue(course.programName, course.title, course.name),
        country: pickDisplayValue(course.country, university.country),
        campus: pickDisplayValue(course.campus, university.campus),
        location: pickDisplayValue(course.location, university.location),
      }));
    });
  }
  return app.selectedCourse ? [{ ...app.selectedCourse, universityName: app.university, programName: app.programme }] : [];
};
const getProgrammeGroups = (app = {}) => {
  const programmes = getSelectedProgrammes(app);
  const groups = new Map();
  programmes.forEach((programme = {}) => {
    const universityName = pickDisplayValue(programme.universityName, programme.university, app.university) || '-';
    if (!groups.has(universityName)) {
      groups.set(universityName, {
        universityName,
        country: pickDisplayValue(programme.country, app.country),
        campus: pickDisplayValue(programme.campus, programme.location),
        programmes: [],
      });
    }
    groups.get(universityName).programmes.push(programme);
  });
  return Array.from(groups.values());
};
const getProgrammeSummary = (app = {}) => {
  const programmes = getSelectedProgrammes(app);
  if (programmes.length > 1) return `${programmes.length} programmes selected`;
  return pickDisplayValue(programmes[0]?.programName, programmes[0]?.title, programmes[0]?.name, app.programme) || '-';
};
const getUniversitySummary = (app = {}) => {
  const groups = getProgrammeGroups(app);
  if (groups.length > 1) return `${groups.length} universities selected`;
  return groups[0]?.universityName || app.university || '-';
};
const SearchIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const RefreshIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;

const StatusBadge = ({ status }) => (
  <span className={`avd-status ${statusClasses[status] || 'avd-status-pending'}`}>
    <span className="avd-status-dot" />{statusLabels[status] || 'Pending Review'}
  </span>
);

const StatCard = ({ label, value, accent }) => <div className={`avd-stat-card ${accent}`}><div className="avd-stat-label">{label}</div><div className="avd-stat-value">{value}</div></div>;

const QUEUE_CACHE_KEY = 'admin-verify-documents-queue';
const readQueueCache = () => {
  if (typeof window === 'undefined') return [];
  if (Array.isArray(window.__avdQueueCache?.data)) return window.__avdQueueCache.data;
  try {
    const cached = JSON.parse(window.sessionStorage.getItem(QUEUE_CACHE_KEY) || 'null');
    return Array.isArray(cached?.data) ? cached.data : [];
  } catch {
    return [];
  }
};

const AdminVerifyDocuments = () => {
  const [applications, setApplications] = useState(readQueueCache);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(() => readQueueCache().length === 0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [reason, setReason] = useState('');
  const [decisionAction, setDecisionAction] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [applicationSection, setApplicationSection] = useState('all');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);
  const token = localStorage.getItem('adminToken') || localStorage.getItem('token') || '';
  const api = useCallback(config => axios({ baseURL: API_BASE_URL, ...config, headers: { Authorization: `Bearer ${token}`, ...(config.headers || {}) } }), [token]);

  const loadQueue = useCallback(async (force = false) => {
    const cachedData = readQueueCache();
    const cacheTimestamp = window.__avdQueueCache?.ts || (() => {
      try { return Number(JSON.parse(window.sessionStorage.getItem(QUEUE_CACHE_KEY) || '{}').ts) || 0; }
      catch { return 0; }
    })();
    if (cachedData.length) {
      setApplications(cachedData);
      setLoading(false);
      if (!force && Date.now() - cacheTimestamp < 30000) return;
    }

    if (!cachedData.length) setLoading(true);
    setError('');
    try {
      const response = await api({ method: 'get', url: '/api/admin/verification/verify-documents' });
      const data = response.data.data || [];
      window.__avdQueueCache = { data, ts: Date.now() };
      try { window.sessionStorage.setItem(QUEUE_CACHE_KEY, JSON.stringify(window.__avdQueueCache)); } catch { /* session storage may be unavailable */ }
      setApplications(data);
    } catch (err) { setError(err.response?.data?.message || 'Failed to load verification queue.'); }
    finally { setLoading(false); }
  }, [api]);
  useEffect(() => { loadQueue(); }, [loadQueue]);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(null), 4000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    const handleClickOutside = event => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setStatusDropdownOpen(false);
      }
    };
    const handleEscape = event => {
      if (event.key === 'Escape') setStatusDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const getAppType = useCallback(app => String(app?.applicationType || 'bachelor').toLowerCase().trim(), []);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applications.filter(app => {
      const matchesStatus = !statusFilter || app.verificationStatus === statusFilter;
      const matchesSection = applicationSection === 'all' || getAppType(app) === applicationSection;
      const matchesSearch = !query || [app.applicationId, app.studentName, app.email, app.university, app.programme, getUniversitySummary(app), getProgrammeSummary(app)].some(value => String(value || '').toLowerCase().includes(query)) || getSelectedProgrammes(app).some(programme => [programme.universityName, programme.university, programme.programName, programme.title, programme.name].some(value => String(value || '').toLowerCase().includes(query)));
      return matchesStatus && matchesSection && matchesSearch;
    });
  }, [applications, search, statusFilter, applicationSection, getAppType]);

  const selectedStatusLabel = STATUS_OPTIONS.find(option => option.value === statusFilter)?.label || 'All Status';

  const stats = useMemo(() => ({
    total: applications.length,
    pending: applications.filter(app => app.verificationStatus === 'pending_admin_review').length,
    approved: applications.filter(app => app.verificationStatus === 'approved').length,
    changes: applications.filter(app => app.verificationStatus === 'changes_requested').length,
  }), [applications]);
  const sectionCounts = useMemo(() => ({
    all: applications.length,
    bachelor: applications.filter(app => getAppType(app) === 'bachelor').length,
    master: applications.filter(app => getAppType(app) === 'master').length,
    medical: applications.filter(app => getAppType(app) === 'medical').length,
  }), [applications, getAppType]);

  const openDetail = async applicationId => {
    setDetailLoading(true); setError(''); setReason('');
    try { const response = await api({ method: 'get', url: `/api/admin/verification/verify-documents/${encodeURIComponent(applicationId)}` }); setSelected(response.data.data); }
    catch (err) { setError(err.response?.data?.message || 'Failed to load application details.'); }
    finally { setDetailLoading(false); }
  };

  const openPdf = async (applicationId, download = false) => {
    try {
      const response = await api({ method: 'get', url: `/api/admin/verification/verify-documents/${encodeURIComponent(applicationId)}/pdf`, responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      if (download) { const link = document.createElement('a'); link.href = url; link.download = `Application_${applicationId}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
      else { window.open(url, '_blank', 'noopener,noreferrer'); setTimeout(() => URL.revokeObjectURL(url), 60000); }
    } catch (err) { setError(err.response?.data?.message || 'Failed to open application PDF.'); }
  };

  const openDecisionModal = action => {
    setReason('');
    setDecisionError('');
    setDecisionAction(action);
  };

  const closeDecisionModal = () => {
    if (actionLoading) return;
    setDecisionAction('');
    setDecisionError('');
    setReason('');
  };

  const submitDecision = async action => {
    if (!selected) return;
    if (action !== 'approve' && (reason.trim().length < MIN_VERIFICATION_MESSAGE_LENGTH || reason.length > MAX_VERIFICATION_MESSAGE_LENGTH)) {
      setDecisionError(VERIFICATION_MESSAGE_ERROR);
      return;
    }
    const endpoints = { approve: 'approve-application', reject: 'reject-application', changes: 'request-changes' };
    const applicationId = selected.applicationId;
    setActionLoading(action);
    setError('');
    setDecisionError('');
    try {
      await api({ method: 'post', url: `/api/admin/verification/${endpoints[action]}`, data: { applicationId, reason: reason.trim() } });
      setDecisionAction('');
      setReason('');
      await loadQueue(true);
      await openDetail(applicationId);
      if (action !== 'approve') setToast({ type: 'success', message: 'Message sent successfully and verification data refreshed.' });
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update application status.';
      if (action === 'approve') setError(message);
      else { setDecisionError(message); setToast({ type: 'error', message }); }
    } finally { setActionLoading(''); }
  };

  const RowActions = ({ app, mobile = false }) => <div className={`avd-actions ${mobile ? 'avd-mobile-actions' : ''}`}><button className="avd-view-btn" type="button" onClick={() => openDetail(app.applicationId)} disabled={detailLoading}>View</button><button className="avd-pdf-btn" type="button" onClick={() => openPdf(app.applicationId)}>PDF</button></div>;

  return (
    <div className="avd-page-root">
      <div className="avd-wrapper">
        <div className="avd-page-header">
          <div><h1 className="avd-page-title">Verify Documents</h1><p className="avd-page-sub">Review application summaries and uploaded documents sent by Process Admin.</p></div>
          <button className="avd-refresh-btn" type="button" onClick={() => loadQueue(true)} disabled={loading}><RefreshIcon />{loading ? 'Refreshing...' : 'Refresh'}</button>
        </div>
        {error && <div className="avd-error"><span>{error}</span><button type="button" onClick={() => setError('')}>&times;</button></div>}
        <div className="avd-stats-grid">
          <StatCard label="Total Verified" value={stats.total} accent="accent-blue" />
          <StatCard label="Pending Review" value={stats.pending} accent="accent-amber" />
          <StatCard label="Approved" value={stats.approved} accent="accent-green" />
          <StatCard label="Changes Requested" value={stats.changes} accent="accent-purple" />
        </div>

        <div className="avd-table-card">
          <div className="avd-table-header">
            <div className="avd-table-title-row"><div className="avd-table-title">{applicationSection === 'medical' ? 'Medical Verification Queue' : 'Verification Queue'} <span className="avd-count-badge">{filteredApplications.length}</span></div></div>
            <div className="avd-section-tabs" role="tablist" aria-label="Application sections">
              {[['all', 'All Applications'], ['bachelor', 'Bachelors'], ['master', 'Masters'], ['medical', 'Medical']].map(([section, label]) => <button key={section} type="button" role="tab" aria-selected={applicationSection === section} className={`avd-section-tab ${applicationSection === section ? 'active' : ''}`} onClick={() => setApplicationSection(section)}>{label}<span>{sectionCounts[section]}</span></button>)}
            </div>
            <div className="avd-controls">
              <div className="avd-search-wrap"><span className="avd-search-icon"><SearchIcon /></span><input className="avd-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search application ID, student, university, programme..." />{search && <button className="avd-clear-search" type="button" onClick={() => setSearch('')}>&times;</button>}</div>
              <div className={`avd-custom-select ${statusDropdownOpen ? 'open' : ''}`} ref={statusDropdownRef}><button type="button" className="avd-custom-select-trigger" aria-haspopup="listbox" aria-expanded={statusDropdownOpen} onClick={() => setStatusDropdownOpen(previous => !previous)}><span>{selectedStatusLabel}</span><span className="avd-custom-select-arrow" aria-hidden="true" /></button>{statusDropdownOpen && <div className="avd-custom-select-menu" role="listbox" aria-label="Filter by status">{STATUS_OPTIONS.map(option => <button type="button" role="option" aria-selected={statusFilter === option.value} key={option.value || 'all'} className={`avd-custom-select-option ${statusFilter === option.value ? 'active' : ''}`} onClick={() => { setStatusFilter(option.value); setStatusDropdownOpen(false); }}>{option.label}</button>)}</div>}</div>
            </div>
          </div>

          {loading ? <div className="avd-state"><div className="avd-spinner" />Loading verification queue...</div> : filteredApplications.length === 0 ? <div className="avd-state"><SearchIcon /><span>No {applicationSection === 'medical' ? 'medical ' : ''}verification applications found.</span></div> : <>
            <div className="avd-table-wrap avd-desktop-table"><table className="avd-table"><thead>{applicationSection === 'medical' ? <tr><th>Application ID</th><th>Medical Student</th><th>Medical Course</th><th>NEET Score / Rank</th><th>Verified Date</th><th>Status</th><th>Actions</th></tr> : <tr><th>Application ID</th><th>Student</th><th>University</th><th>Programme</th><th>Verified Date</th><th>Status</th><th>Actions</th></tr>}</thead><tbody>{filteredApplications.map(app => <tr className="avd-tr" key={app.applicationId}><td><strong className="avd-app-id">{app.applicationId}</strong></td><td><div className="avd-student-cell"><span className="avd-avatar">{getInitials(app.studentName)}</span><div><div className="avd-student-name">{app.studentName}</div><div className="avd-student-email">{app.email}</div></div></div></td>{applicationSection === 'medical' ? <><td><div className="avd-medical-course"><strong>{getProgrammeSummary(app)}</strong><span>{getUniversitySummary(app)}</span></div></td><td><span className="avd-neet-score">{app.neetScore || '-'}<small>{app.neetRank ? `Rank: ${app.neetRank}` : 'Rank: -'}</small></span></td></> : <><td><span className="avd-primary-text" title={getUniversitySummary(app)}>{getUniversitySummary(app)}</span></td><td><span className="avd-programme" title={getProgrammeSummary(app)}>{getProgrammeSummary(app)}</span></td></>}<td><span className="avd-date">{formatDate(app.verifiedAt)}</span></td><td><StatusBadge status={app.verificationStatus} /></td><td><RowActions app={app} /></td></tr>)}</tbody></table></div>
            <div className="avd-mobile-list">{filteredApplications.map(app => <article className="avd-mobile-card" key={app.applicationId}><div className="avd-mobile-top"><div className="avd-student-cell"><span className="avd-avatar">{getInitials(app.studentName)}</span><div><div className="avd-student-name">{app.studentName}</div><div className="avd-student-email">{app.email}</div></div></div><StatusBadge status={app.verificationStatus} /></div><div className="avd-mobile-grid avd-mobile-meta-grid"><div><span>Application ID</span><strong>{app.applicationId}</strong></div><div><span>Verified</span><strong>{formatDate(app.verifiedAt)}</strong></div><div className="avd-mobile-wide"><span>{applicationSection === 'medical' ? 'Medical Course' : 'University'}</span><strong>{applicationSection === 'medical' ? getProgrammeSummary(app) : getUniversitySummary(app)}</strong></div>{applicationSection === 'medical' ? <div className="avd-mobile-wide"><span>NEET Score / Rank</span><strong>{app.neetScore || '-'} {app.neetRank ? `/ ${app.neetRank}` : ''}</strong></div> : <div className="avd-mobile-wide"><span>Programme</span><strong>{getProgrammeSummary(app)}</strong></div>}</div><RowActions app={app} mobile /></article>)}</div>
          </>}
        </div>
      </div>
      <div className="avd-footer">&copy; 2026 Admin Dashboard. All rights reserved.</div>
      {toast && <div className={`avd-toast avd-toast-${toast.type}`} role="status"><span>{toast.type === 'success' ? '✓' : '!'}</span>{toast.message}<button onClick={() => setToast(null)}>&times;</button></div>}

      {selected && <div className="avd-overlay" onClick={() => setSelected(null)}><div className="avd-modal" onClick={event => event.stopPropagation()}><div className="avd-modal-header"><div><h2>Application Verification</h2><span>{selected.applicationId}</span></div><button type="button" onClick={() => setSelected(null)}>&times;</button></div><div className="avd-modal-body">
        <section><h3>Application Information</h3><div className="avd-info-grid">{[['Application ID', selected.applicationId], ['Student Name', selected.studentName], ['Email', selected.email], ['Phone', selected.phone], ['University', getUniversitySummary(selected)], ['Programme', getProgrammeSummary(selected)], ['Submitted Date', formatDate(selected.submittedAt)], ['Verified Date', formatDate(selected.verifiedAt)]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || '-'}</strong></div>)}</div></section>
      
        <section><h3>Contact & Address</h3><div className="avd-info-grid">{[["Email", selected.contact?.emailAddress || selected.email], ["Mobile", selected.contact?.mobileNumber || selected.phone], ["Alternate Phone", selected.contact?.alternatePhone || selected.personal?.parent1?.phone], ["Address Line 1", selected.contact?.addressLine1 || selected.personal?.address1 || selected.personal?.permanentAddress || selected.personal?.address], ["Address Line 2", selected.contact?.addressLine2 || selected.personal?.address2], ["City", selected.contact?.city || selected.city || selected.personal?.city || selected.personal?.permCity], ["State", selected.contact?.state || selected.state || selected.personal?.state || selected.personal?.permState], ["Postal Code", selected.contact?.postalCode || selected.postalCode || selected.personal?.postalCode || selected.personal?.permZip], ["Country", selected.contact?.country || selected.country || selected.personal?.country || selected.personal?.permCountry]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || "-"}</strong></div>)}</div></section>
        <section><h3>Parent & Family Details</h3><div className="avd-info-grid">{[["Father / Guardian Name", selected.parent?.fatherName || selected.personal?.parent1?.name || selected.personal?.fatherName], ["Father Contact", selected.parent?.fatherPhone || selected.personal?.parent1?.phone || selected.personal?.fatherPhone], ["Father Email", selected.parent?.fatherEmail || selected.personal?.parent1?.email || selected.personal?.fatherEmail], ["Mother Name", selected.parent?.motherName || selected.personal?.parent2?.name || selected.personal?.motherName], ["Mother Contact", selected.parent?.motherPhone || selected.personal?.parent2?.phone || selected.personal?.motherPhone], ["Mother Email", selected.parent?.motherEmail || selected.personal?.parent2?.email || selected.personal?.motherEmail]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || "-"}</strong></div>)}</div></section>
        <section><h3>Academic History</h3><div className="avd-programme-groups">{(selected.education || []).length ? selected.education.map((edu, index) => <div className="avd-programme-group avd-academic-record" key={index}><div className="avd-programme-group-head"><strong>{edu.qualification || ("Education Record " + (index + 1))}</strong><span>{[edu.schoolName, edu.boardUniversity].filter(Boolean).join(' · ') || "-"}</span></div><div className="avd-info-grid avd-academic-grid">{[["Institution / School", edu.schoolName], ["Board / Major / University", edu.boardUniversity], ["Year of Passing", edu.yearOfPassing], ["Score / CGPA / %", edu.score], ["Country", edu.country]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || "-"}</strong></div>)}</div></div>) : (selected.academics?.entries || []).length ? selected.academics.entries.map((entry, index) => <div className="avd-programme-group avd-academic-record" key={entry._id || index}><div className="avd-programme-group-head"><strong>{entry.degree || ("Academic Entry " + (index + 1))}</strong><span>{entry.university || "-"}</span></div><div className="avd-info-grid avd-academic-grid">{[["Field of Study / Major", entry.fieldOfStudy], ["Country", entry.country], ["Start Date", entry.startDate], ["End Date / Year", entry.endDate], ["GPA / Grade / Score", entry.gpa]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || "-"}</strong></div>)}</div></div>) : <div className="avd-state">No academic records found.</div>}</div></section>
        <section><h3>Test Scores</h3><div className="avd-info-grid">{(selected.tests?.summary || []).length ? selected.tests.summary.map((test, index) => <div key={index}><span>{test.test || "Test"}</span><strong>{test.scores || "-"}</strong></div>) : (selected.testScores?.tests || []).length ? selected.testScores.tests.map((test, index) => <div key={index}><span>{test.exam || "Test"}</span><strong>Score: {test.score || "-"} {test.testDate ? `(Date: ${test.testDate})` : ''}</strong></div>) : <div><span>Status</span><strong>No test scores recorded.</strong></div>}</div></section>
        <section><h3>University & Programme Details</h3><div className="avd-programme-groups">{getProgrammeGroups(selected).map(group => <div className="avd-programme-group" key={group.universityName}><div className="avd-programme-group-head"><strong>{group.universityName}</strong>{group.country && <span>{group.country}</span>}</div><div className="avd-programme-list">{group.programmes.map((programme, index) => <div className="avd-programme-row" key={`${group.universityName}-${programme.programId || programme.programName || index}`}><div><strong>{pickDisplayValue(programme.programName, programme.title, programme.name) || '-'}</strong><span>{pickDisplayValue(programme.degreeLevel, programme.degree, programme.level, programme.majorArea) || '-'}</span></div><div><span>Intake</span><strong>{pickDisplayValue(programme.intake, [programme.intakeMonth, programme.intakeYear].filter(Boolean).join(' ')) || '-'}</strong></div><div><span>Campus</span><strong>{pickDisplayValue(programme.campus, programme.location) || '-'}</strong></div></div>)}</div></div>)}</div></section>
        <section><h3>Application PDF</h3><div className="avd-file-actions"><button type="button" onClick={() => openPdf(selected.applicationId)}>View PDF</button><button type="button" onClick={() => openPdf(selected.applicationId, true)}>Download PDF</button></div></section>        <section><h3>Uploaded Documents</h3><div className="avd-doc-list">{(selected.documents || []).filter(doc => doc.uploaded || doc.reqStatus === 'required').map(doc => <div className={`avd-doc-row ${doc.uploaded ? 'avd-doc-uploaded' : doc.expected ? 'avd-doc-expected' : 'avd-doc-missing'}`} key={doc.key}><div className="avd-doc-copy"><strong>{doc.label}</strong>{doc.uploaded && <small>{doc.fileName}</small>}{doc.expected && <small>Expected {formatDate(doc.expectedDate)}</small>}</div><div className="avd-doc-status-actions">{doc.uploaded ? <><span className="avd-document-badge avd-document-uploaded">Uploaded</span><div className="avd-file-actions"><a href={resolveDocumentUrl(doc.fileUrl)} target="_blank" rel="noopener noreferrer">View</a><a href={resolveDocumentUrl(doc.fileUrl)} download>Download</a></div></> : doc.expected ? <span className="avd-document-badge avd-document-expected">Expected {formatDate(doc.expectedDate)}</span> : <span className="avd-document-badge avd-document-missing">Not Uploaded</span>}</div></div>)}</div></section>
        
        <Suspense fallback={<div className="avd-state" style={{ padding: '16px' }}><div className="avd-spinner" />Loading verification details...</div>}>
          <UniversityVerification 
            application={selected} 
            onSuccess={() => { loadQueue(true); openDetail(selected.applicationId); }} 
          />
        </Suspense>
        
        <section><h3>Admin Decision</h3><div className="avd-decision-actions"><button className="avd-approve" onClick={() => submitDecision('approve')} disabled={!!actionLoading}>{actionLoading === 'approve' ? 'Approving...' : 'Approve'}</button><button className="avd-reject" onClick={() => openDecisionModal('reject')} disabled={!!actionLoading}>Reject</button><button className="avd-changes" onClick={() => openDecisionModal('changes')} disabled={!!actionLoading}>Request Changes</button></div></section>
      </div></div></div>}

      {decisionAction && selected && <VerificationMessageModal title={decisionAction === 'reject' ? 'Reject Application' : 'Request Changes'} templates={decisionAction === 'reject' ? REJECT_TEMPLATES : REQUEST_CHANGE_TEMPLATES} message={reason} onChange={value => { setReason(value); if (decisionError) setDecisionError(''); }} onSubmit={() => submitDecision(decisionAction)} onClose={closeDecisionModal} loading={!!actionLoading} />}
    </div>
  );
};
export default AdminVerifyDocuments;

