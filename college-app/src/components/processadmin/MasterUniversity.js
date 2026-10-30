import React, { useState, useEffect, useCallback, useMemo } from "react";
import * as jsPDFModule from "jspdf";
import { FiBookOpen, FiCalendar, FiCheckCircle, FiDownload, FiFileText, FiFolder, FiGlobe, FiHome, FiMail, FiMapPin, FiPrinter } from "react-icons/fi";
import "./MasterUniversity.css";
import API_BASE_URL from "../../config/api";
import { resolveFileUrl } from "../../utils/fileUrl";

/* ──────────────────────────────────────────────────────────────────────────────────────────────────
   API CONFIG & HEADERS
────────────────────────────────────────────────────────────────────────────────────────────────── */
const API_BASE = `${API_BASE_URL}/api/master-university`;

const getToken = () =>
  localStorage.getItem("processAdminToken") ||
  localStorage.getItem("token") ||
  sessionStorage.getItem("processAdminToken") ||
  "";

const authHeaders = () => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

/* ──────────────────────────────────────────────────────────────────────────────────────────────────
   API FUNCTIONS
────────────────────────────────────────────────────────────────────────────────────────────────── */
const fetchStats = async () => {
  const res = await fetch(`${API_BASE}/process-admin/stats`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);
  return res.json();
};

const fetchApplications = async ({
  page = 1,
  limit = 50,
  status = "all",
  search = "",
} = {}) => {
  const params = new URLSearchParams({ page, limit, status, search });
  const res = await fetch(`${API_BASE}/process-admin/all?${params}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Applications fetch failed: ${res.status}`);
  return res.json();
};

const fetchApplicationDetail = async (id) => {
  const res = await fetch(`${API_BASE}/process-admin/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Detail fetch failed: ${res.status}`);
  return res.json();
};

const sendDocumentEmail = async (payload) => {
  const res = await fetch(`${API_BASE}/process-admin/send-document-email`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Email send failed: ${res.status}`);
  return res.json();
};

const verifyApplication = async (application) => {
  const res = await fetch(`${API_BASE_URL}/api/process-admin/verify-application`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      applicationId: application.applicationId,
      studentId: application.studentId,
    }),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.message || `Verification failed: ${res.status}`);
  return result;
};

/* ──────────────────────────────────────────────────────────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────────────────────────────────────────────────────────── */
const getStatusLabel = (applicationStatus) => {
  if (applicationStatus === "submitted")    return "COMPLETED";
  if (applicationStatus === "draft")        return "INCOMPLETE";
  if (applicationStatus === "under_review") return "IN PROGRESS";
  return applicationStatus?.toUpperCase() || "UNKNOWN";
};

const getStatusClass = (applicationStatus) => {
  if (applicationStatus === "submitted")    return "status-completed";
  if (applicationStatus === "draft")        return "status-incomplete";
  if (applicationStatus === "under_review") return "status-inprogress";
  return "status-incomplete";
};

const getInitials = (name = "") =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase() || "?";

const formatDate = (d) => {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return "-"; }
};

const formatDateShort = (d) => {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short", day: "numeric",
    });
  } catch { return "-"; }
};

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const RefreshMark = () => (
  <svg className="master-refresh-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

/* ──────────────────────────────────────────────────────────────────────────────────────────────────
   DOCUMENT EMAIL MODAL
────────────────────────────────────────────────────────────────────────────────────────────────── */
const ISSUE_REASONS = [
  { value: "incorrect_format",    label: "Incorrect Format" },
  { value: "fake_document",       label: "Fake / Suspicious Document" },
  { value: "blurry",              label: "Blurry / Unreadable" },
  { value: "incomplete",          label: "Incomplete / Missing Pages" },
  { value: "wrong_document",      label: "Wrong Document Uploaded" },
  { value: "not_uploaded",        label: "Document Not Uploaded" },
  { value: "other",               label: "Other Issue" },
];

const DocumentEmailModal = ({ doc, studentEmail, studentName, studentId, onClose }) => {
  const [reason,     setReason]     = useState("not_uploaded");
  const [adminNotes, setAdminNotes] = useState("");
  const [deadline,   setDeadline]   = useState(7);
  const [sending,    setSending]    = useState(false);
  const [sent,       setSent]       = useState(false);
  const [error,      setError]      = useState("");

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSend = async () => {
    setError("");
    setSending(true);
    try {
      const res = await sendDocumentEmail({
        studentId,
        studentEmail,
        studentName,
        documentKey:  doc.key,
        documentName: doc.label,
        reason,
        adminNotes: adminNotes.trim(),
        deadlineDays: deadline,
      });
      if (res.success) {
        setSent(true);
      } else {
        setError(res.message || "Failed to send email. Please try again.");
      }
    } catch (e) {
      setError(e.message || "Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="email-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="email-modal-box" role="dialog" aria-modal="true" aria-labelledby="document-email-title">
        <div className="email-modal-header">
          <div className="email-modal-header-icon">Email</div>
          <div className="email-modal-header-text">
            <div className="email-modal-title" id="document-email-title">Send Document Request</div>
            <div className="email-modal-subtitle">Notify student to re-upload document</div>
          </div>
          <button className="email-modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        {sent ? (
          <div className="email-modal-success">
            <div className="email-success-icon">✓</div>
            <div className="email-success-title">Email Sent Successfully!</div>
            <div className="email-success-msg">
              A notification has been sent to <strong>{studentEmail}</strong> requesting
              them to re-upload the <strong>{doc.label}</strong>.
            </div>
            <button className="email-modal-btn-primary" onClick={onClose}>Done</button>
          </div>
        ) : (
          <div className="email-modal-body">
            <div className="email-info-strip">
              <div className="email-info-row">
                <span className="email-info-label">To</span>
                <span className="email-info-value">{studentName} &lt;{studentEmail}&gt;</span>
              </div>
              <div className="email-info-row">
                <span className="email-info-label">Document</span>
                <span className="email-info-value email-doc-name">{doc.label}</span>
              </div>
              <div className="email-info-row">
                <span className="email-info-label">Status</span>
                <span className={`email-doc-status-pill ${doc.uploaded ? "pill-uploaded" : "pill-missing"}`}>
                  {doc.uploaded ? "Uploaded" : "Not Uploaded"}
                </span>
              </div>
            </div>

            <div className="email-field">
              <label className="email-field-label">Issue / Reason *</label>
              <select
                className="email-select"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {ISSUE_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="email-field">
              <label className="email-field-label">
                Additional Notes <span className="email-optional">(optional)</span>
              </label>
              <textarea
                className="email-textarea"
                placeholder="e.g. The uploaded certificate seems to have altered dates. Please re-upload the original document."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="email-field">
              <label className="email-field-label">Deadline for Student</label>
              <div className="email-deadline-row">
                {[3, 5, 7, 14].map((d) => (
                  <button
                    key={d}
                    className={`email-deadline-chip ${deadline === d ? "deadline-chip-active" : ""}`}
                    onClick={() => setDeadline(d)}
                  >
                    {d} days
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="email-error-box">Warning: {error}</div>}

            <div className="email-modal-actions">
              <button className="email-modal-btn-cancel" onClick={onClose} disabled={sending}>
                Cancel
              </button>
              <button
                className="email-modal-btn-primary"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────────────────────────────
   DETAIL MODAL
────────────────────────────────────────────────────────────────────────────────────────────────── */
const getProgrammeGroups = (d) => {
  if (!d) return [];

  if (Array.isArray(d.course?.applicationUniversities) && d.course.applicationUniversities.length > 0) {
    return d.course.applicationUniversities;
  }
  if (Array.isArray(d.course?.universityApplications) && d.course.universityApplications.length > 0) {
    return d.course.universityApplications;
  }

  if (Array.isArray(d.selectedUniversities) && d.selectedUniversities.length > 0) {
    const map = {};
    d.selectedUniversities.forEach((u) => {
      const uniName = u.universityName || u.name || u.university || 'Selected University';
      if (!map[uniName]) {
        map[uniName] = {
          universityId: u.universityId || uniName,
          universityName: uniName,
          country: u.country || d.primaryCountry || '',
          location: u.country || d.primaryCountry || '',
          selectedCourses: []
        };
      }
      map[uniName].selectedCourses.push({
        programId: u.programId || u.programName,
        title: u.programName || u.degree || d.programName || 'Degree Program',
        degree: u.degree || d.programType || 'Master',
        level: u.level || 'Master',
        studyMode: 'On Campus'
      });
    });
    return Object.values(map);
  }

  if (d.programSelection?.universityName || d.universityName) {
    const uniName = d.programSelection?.universityName || d.universityName;
    return [{
      universityName: uniName,
      country: d.primaryCountry || d.selectedCountries?.[0] || '',
      location: d.primaryCountry || '',
      selectedCourses: [{
        title: d.programName || d.programType || 'Master Program',
        degree: d.programType || 'Master',
        level: 'Master',
        studyMode: 'On Campus'
      }]
    }];
  }

  if (Array.isArray(d.selectedCountries) && d.selectedCountries.length > 0) {
    return d.selectedCountries.map(c => ({
      universityName: `Universities in ${c}`,
      country: c,
      location: c,
      selectedCourses: [{
        title: d.programType ? `${d.programType} Degree Program` : 'Master Program',
        degree: d.programType || 'Master',
        level: 'Master',
        studyMode: 'On Campus'
      }]
    }));
  }

  return [];
};

const getNormalizedDocuments = (d) => {
  if (!d) return { list: [], uploadedCount: 0, totalDocs: 0 };

  const DOC_LABELS = {
    passport:                'Passport / ID Proof',
    photo:                   'Passport-Size Photo',
    cv:                      'Resume / CV',
    resumeCv:                'Resume / CV',
    collegeTranscript:       "College / Transfer Transcript",
    undergraduateTranscript: "Bachelor's Degree Transcript",
    bachelorDegree:          "Bachelor's Degree Certificate",
    transferCertificate:     'Transfer Certificate',
    schoolLeavingCertificate:'School Leaving Certificate',
    gapCertificate:          'Gap Certificate',
    medicalAcademicDocument: 'Medical Academic Document',
    cert9th:                 '9th Grade Marksheet',
    cert10th:                '10th Grade Certificate',
    tenthMarksheet:          '10th Grade Marksheet',
    tenthCertificate:        '10th Grade Certificate',
    cert11th:                '11th Grade Marksheet',
    cert12th:                '12th Grade Certificate',
    twelfthMarksheet:        '12th Grade Marksheet',
    twelfthCertificate:      '12th Grade Certificate',
    bachelorTranscript:      "Bachelor's Degree Transcript",
    bachelorDegree:          "Bachelor's Degree Certificate",
    provisionalCertificate:  'Provisional Certificate',
    consolidatedMarksheet:   'Consolidated Marksheet',
    statementOfPurpose:      'Statement of Purpose (SOP)',
    lettersOfRecommendation: 'Letters of Recommendation',
    englishCertificate:      'English Language Proficiency',
    testScores:              'Standardized Test Scores (GRE / GMAT / IELTS / TOEFL)',
    workExperience:          'Work Experience / Experience Letter',
    idProof:                 'Identity Proof',
    birthCertificate:        'Birth Certificate',
    migrationCertificate:    'Migration Certificate',
    transferCertificate:     'Transfer Certificate',
  };

  const rawDocs = d.documents?.fields || d.documents || d.allDocuments || {};
  const list = [];
  let uploadedCount = 0;

  Object.entries(rawDocs).forEach(([key, val]) => {
    if (!val || key === 'uploadedCount' || key === 'totalDocs' || key === 'completionPct') return;

    if (Array.isArray(val)) {
      val.forEach((item, idx) => {
        if (!item) return;
        const fileUrl = item.fileUrl || (item.fileKey ? resolveFileUrl(item.fileKey) : null);
        const hasFile = !!(item.uploaded || fileUrl || item.fileName);
        if (hasFile) uploadedCount++;
        list.push({
          key: `${key}_${idx}`,
          label: DOC_LABELS[key] || key,
          fileName: item.fileName || item.originalName || `${key}_${idx + 1}`,
          fileUrl,
          fileKey: item.fileKey || null,
          uploaded: hasFile
        });
      });
    } else if (typeof val === 'object') {
      const fileUrl = val.fileUrl || (val.fileKey ? resolveFileUrl(val.fileKey) : null);
      const hasFile = !!(val.uploaded || fileUrl || val.fileName);
      if (hasFile) uploadedCount++;
      list.push({
        key,
        label: DOC_LABELS[key] || val.label || key,
        fileName: val.fileName || val.originalName || key,
        fileUrl,
        fileKey: val.fileKey || null,
        uploaded: hasFile
      });
    }
  });

  return { list, uploadedCount, totalDocs: Math.max(list.length, 1) };
};

const getNormalizedTests = (d) => {
  if (!d) return { list: [], hasNotTaken: false };

  const hasNotTaken = Boolean(
    d.hasNotTakenTests || 
    d.scores?.hasNotTaken || 
    d.tests?.hasNotTaken
  );

  let rawList = [];

  if (Array.isArray(d.testScores) && d.testScores.length > 0) {
    rawList = d.testScores;
  } else if (Array.isArray(d.scores?.tests) && d.scores.tests.length > 0) {
    rawList = d.scores.tests;
  } else if (Array.isArray(d.tests) && d.tests.length > 0) {
    rawList = d.tests;
  } else if (Array.isArray(d.tests?.summary) && d.tests.summary.length > 0) {
    rawList = d.tests.summary;
  } else if (d.tests && typeof d.tests === 'object') {
    const summary = [];
    Object.entries(d.tests).forEach(([key, val]) => {
      if (Array.isArray(val) && val.length > 0 && key !== 'summary') {
        val.forEach((item) => {
          if (item && typeof item === 'object') {
            summary.push({
              exam: item.exam || item.test || key.toUpperCase(),
              score: item.score || item.scores || item.overall || item.total || '-',
              testDate: item.testDate || item.date || '',
              selectedUniversities: item.selectedUniversities || item.eligibleUniversities || []
            });
          }
        });
      }
    });
    if (summary.length > 0) rawList = summary;
  }

  const list = rawList.map((t) => {
    const examName = t.exam || t.test || t.name || 'Test';
    const scoreVal = t.score || t.scores || t.overall || t.total || t.percentile || '-';
    const selectedUnis = Array.isArray(t.selectedUniversities) && t.selectedUniversities.length > 0
      ? t.selectedUniversities
      : Array.isArray(t.eligibleUniversities) ? t.eligibleUniversities : [];
    return {
      exam: String(examName).toUpperCase(),
      score: String(scoreVal),
      testDate: t.testDate || '',
      selectedUniversities: selectedUnis
    };
  }).filter(t => t.exam && t.exam !== 'HASNOTTAKEN');

  return { list, hasNotTaken };
};

const getNormalizedAcademics = (d) => {
  if (!d) return [];

  if (Array.isArray(d.educationSummary) && d.educationSummary.length > 0) {
    return d.educationSummary.map(e => ({
      qualification: e.qualification || e.degree || 'Degree',
      schoolName: e.schoolName || e.university || '-',
      boardUniversity: e.boardUniversity || e.country || '-',
      score: e.score || e.gpa || '-',
      yearOfPassing: e.yearOfPassing || '-'
    }));
  }

  if (Array.isArray(d.education?.entries) && d.education.entries.length > 0) {
    return d.education.entries.map(e => ({
      qualification: e.qualification || e.degree || 'Degree',
      schoolName: e.schoolName || e.university || '-',
      boardUniversity: e.boardUniversity || e.country || '-',
      score: e.score || e.gpa || '-',
      yearOfPassing: e.yearOfPassing || '-'
    }));
  }

  if (Array.isArray(d.academics?.entries) && d.academics.entries.length > 0) {
    return d.academics.entries.map(e => ({
      qualification: e.degree || 'Degree',
      schoolName: e.university || '-',
      boardUniversity: e.country || '-',
      score: e.gpa || '-',
      yearOfPassing: e.endDate || '-'
    }));
  }

  return [];
};

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '' || String(v).trim() === '-';

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

const DetailModal = ({ studentId, onClose }) => {
    const [detail, setDetail] = useState(null);
    const [eligibleUniversities, setEligibleUniversities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [pdfLoading, setPdfLoading] = useState(false);
    const [emailDoc, setEmailDoc] = useState(null);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previousOverflow; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setEligibleUniversities([]);
        fetchApplicationDetail(studentId)
            .then((res) => { if (!cancelled) setDetail(res.data); })
            .catch((e) => { if (!cancelled) setError(e.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        fetch(`${API_BASE}/process-admin/${studentId}/universities`, { headers: authHeaders() })
            .then((res) => res.ok ? res.json() : null)
            .then((res) => { if (!cancelled && res?.success) setEligibleUniversities(res.data?.universities || []); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [studentId]);

    useEffect(() => {
        if (emailDoc) return;
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose, emailDoc]);

    const handleDownloadPDF = () => {
        if (!detail || pdfLoading) return;
        setPdfLoading(true);
        try {
            const JsPDFConstructor = [
                jsPDFModule.jsPDF,
                jsPDFModule.default?.jsPDF,
                jsPDFModule.default,
            ].find((candidate) => typeof candidate === "function");
            if (!JsPDFConstructor) throw new Error("jsPDF constructor is unavailable");
            const doc = new JsPDFConstructor({ unit: "mm", format: "a4" });
            const margin = 14;
            const pageWidth = doc.internal.pageSize.getWidth();
            let y = 18;
            const addHeader = () => {
                doc.setTextColor(8, 145, 178); doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text("EDUTECHEX", margin, 17);
                doc.setTextColor(22, 59, 108); doc.setFontSize(20); doc.text("Application Summary", pageWidth - margin, 17, { align: "right" });
                doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(`Application ID: ${detail.applicationId || "-"}`, pageWidth - margin, 24, { align: "right" });
                doc.setDrawColor(220, 232, 245); doc.line(margin, 30, pageWidth - margin, 30); y = 40;
            };
            const ensureSpace = (height) => { if (y + height > 272) { doc.addPage(); addHeader(); } };
            const pdfText = (value) => {
                if (Array.isArray(value)) return value.map(pdfText).filter(Boolean).join(", ");
                if (value && typeof value === "object") {
                    return Object.entries(value)
                        .filter(([, nested]) => nested !== undefined && nested !== null && nested !== "")
                        .map(([key, nested]) => `${key}: ${pdfText(nested)}`)
                        .join(" | ");
                }
                return value === undefined || value === null ? "" : String(value);
            };
            const addSection = (title, rows) => {
                const visible = rows.map(([label, value]) => [label, pdfText(value)]).filter(([, value]) => value.trim() && value !== "-");
                if (!visible.length) return;
                ensureSpace(18 + visible.length * 10);
                doc.setTextColor(22, 59, 108); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text(title, margin, y);
                doc.setDrawColor(8, 145, 178); doc.line(margin, y + 2, margin + 18, y + 2); y += 9;
                visible.forEach(([label, value]) => {
                    ensureSpace(12); doc.setTextColor(8, 145, 178); doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.text(String(label).toUpperCase(), margin, y);
                    doc.setTextColor(15, 23, 42); doc.setFontSize(9.5); doc.setFont("helvetica", "normal"); doc.text(String(value), margin + 55, y, { maxWidth: 120 }); y += 9;
                });
                y += 7;
            };
            addHeader();
            addSection("Applicant Profile", [["Full Name", detail.fullName || detail.studentName], ["Date of Birth", formatDate(detail.dateOfBirth)], ["Gender", detail.gender], ["Nationality", detail.nationality], ["Email", detail.contact?.emailAddress || detail.email], ["Mobile", detail.contact?.mobileNumber], ["Passport", detail.passportNumber], ["Status", getStatusLabel(detail.applicationStatus)]]);
            const applications = getProgrammeGroups(detail);
            applications.forEach((university, index) => addSection(`Selected University ${index + 1}: ${university.universityName || "University"}`, (university.selectedCourses || []).flatMap((program, programIndex) => [[`Programme ${programIndex + 1}`, program.title], ["Degree / Level", [program.degree, program.level].filter(Boolean).join(" - ")], ["Intake", [program.intakeMonth, program.intakeYear].filter(Boolean).join(" ")], ["Study Mode", program.studyMode]])));
            getNormalizedAcademics(detail).forEach((entry, index) => addSection(`Academic Entry ${index + 1}`, [["Qualification", entry.qualification], ["Institution", entry.schoolName], ["Board / Univ", entry.boardUniversity], ["Score", entry.score], ["Year", entry.yearOfPassing]]));
            addSection("Test Scores", getNormalizedTests(detail).list.map(item => [item.exam, item.score]));
            const { list: pdfDocs } = getNormalizedDocuments(detail);
            addSection("Document Checklist", pdfDocs.map(item => [item.label, item.uploaded ? "Uploaded" : "Not uploaded"]));
            const pages = doc.internal.getNumberOfPages();
            for (let page = 1; page <= pages; page += 1) { doc.setPage(page); doc.setDrawColor(220, 232, 245); doc.line(margin, 282, pageWidth - margin, 282); doc.setTextColor(100, 116, 139); doc.setFontSize(7.5); doc.text(`Page ${page} of ${pages}`, pageWidth - margin, 288, { align: "right" }); }
            doc.save(detail.pdfFileName || `Application_${detail.applicationId || studentId}.pdf`);
        } catch (err) {
            console.error("Master application PDF generation failed:", err);
            window.alert("Failed to generate PDF. Please try again.");
        } finally {
            setPdfLoading(false);
        }
    };

    const handlePrintApplication = () => window.print();

    if (loading) {
        return (
            <div className="gus-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <div className="gus-modal">
                    <div className="gus-modal-loading">Loading application details...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="gus-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <div className="gus-modal">
                    <div className="gus-modal-loading" style={{ color: '#ef4444' }}>
                        Error loading application: {error}
                        <br />
                        <button className="gus-premium-outline-btn" style={{ marginTop: '12px' }} onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        );
    }

    const programmeGroups = getProgrammeGroups(detail);
    const { list: docList, uploadedCount: docUploadedCount, totalDocs: docTotalDocs } = getNormalizedDocuments(detail);
    const docsCompletionPct = Math.round((docUploadedCount / Math.max(docTotalDocs, 1)) * 100);
    const academicsList = getNormalizedAcademics(detail);
    const testsData = getNormalizedTests(detail);
    const personal = detail?.personal || {};
    const contact = detail?.contact || {};
    const family = detail?.familyDetails || {};
    const fullName = detail?.fullName || detail?.studentName || [personal.firstName, personal.lastName].filter(Boolean).join(" ");
    const studentEmail = contact.emailAddress || detail?.email || personal.email || "";
    const studentPhone = contact.mobileNumber || detail?.phone || personal.mobile || "";

    return (
        <div className="gus-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="gus-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="application-detail-title">
                
                {/* ── Premium Modal Header ── */}
                <div className="gus-modal-hdr gus-premium-hdr">
                    <div className="gus-modal-hdr-left gus-premium-student">
                        <div className="gus-modal-avatar gus-premium-avatar">
                            {getInitials(fullName)}
                        </div>
                        <div>
                            <p className="gus-premium-eyebrow">EDUTECHEX Application</p>
                            <h2 className="gus-modal-title gus-premium-title" id="application-detail-title">{fullName || 'Student'}</h2>
                            <p className="gus-modal-appid gus-premium-appid">ID: {detail?.applicationId || '-'}</p>
                        </div>
                    </div>
                    <div className="gus-modal-hdr-right gus-premium-actions">
                        <div className="gus-status-card">
                            <div>
                                <span>Application Status</span>
                                <strong>{getStatusLabel(detail?.applicationStatus || detail?.status)}</strong>
                                <em>{docUploadedCount} of {docTotalDocs} documents uploaded</em>
                            </div>
                        </div>
                        <button className="gus-premium-outline-btn" type="button" onClick={handlePrintApplication}><FiPrinter style={{ marginRight: 4 }} /> Print</button>
                        <button className="gus-premium-gradient-btn" type="button" onClick={handleDownloadPDF} disabled={pdfLoading}>
                            <FiDownload style={{ marginRight: 4 }} /> {pdfLoading ? "Generating..." : "Download PDF"}
                        </button>
                        <button className="gus-modal-x gus-premium-close" type="button" onClick={onClose} aria-label="Close">×</button>
                    </div>
                </div>

                {/* ── Modal Body Section Cards ── */}
                <div className="gus-modal-body">
                    
                    {/* Premium Stats Bar */}
                    <div className="gus-premium-stats-row">
                        <div className="gus-premium-stat-card"><div><span>Submitted On</span><strong>{formatDate(detail?.submittedAt || detail?.createdAt)}</strong></div></div>
                        <div className="gus-premium-stat-card"><div><span>Total Programmes</span><strong>{programmeGroups.reduce((tot, u) => tot + (u.selectedCourses?.length || 1), 0)}</strong></div></div>
                        <div className="gus-premium-stat-card"><div><span>Universities</span><strong>{programmeGroups.length}</strong></div></div>
                        <div className="gus-premium-stat-card"><div><span>Completion</span><strong>{detail?.completionPercentage || 0}%</strong></div></div>
                    </div>

                    {/* Student Information Card */}
                    <DetailSection
                        title="Student Information"
                        dotClass="gus-dot-blue"
                        fields={[
                            { label: 'Application ID', value: detail?.applicationId },
                            { label: 'Student ID', value: detail?.studentId },
                            { label: 'Full Name', value: fullName },
                            { label: 'Date of Birth', value: formatDate(personal.dateOfBirth || detail?.dateOfBirth) },
                            { label: 'Gender', value: personal.gender || detail?.gender },
                            { label: 'Nationality / Citizenship', value: personal.citizenship || personal.nationality || detail?.nationality },
                            { label: 'Passport Number', value: personal.passportNumber || detail?.passportNumber },
                            { label: 'Marital Status', value: personal.maritalStatus || detail?.maritalStatus },
                        ]}
                    />

                    {/* Contact Information Card */}
                    <DetailSection
                        title="Contact Information"
                        dotClass="gus-dot-blue"
                        fields={[
                            { label: 'Email', value: studentEmail },
                            { label: 'Mobile Number', value: studentPhone },
                            { label: 'Alternate Phone', value: contact.alternatePhone },
                            { label: 'Address', value: [personal.address1 || contact.addressLine1, personal.address2 || contact.addressLine2, contact.city, contact.state, contact.postalCode, contact.country || personal.countryOfBirth].filter(Boolean).join(', ') },
                        ]}
                    />

                    {/* Family Details Card */}
                    {(family.parent1 || detail?.parent1FullName) && (
                        <DetailSection
                            title="Family Details"
                            dotClass="gus-dot-blue"
                            fields={[
                                { label: 'Parent 1 Relationship', value: family.parent1?.relationship || detail?.parent1Relationship },
                                { label: 'Parent 1 Full Name', value: family.parent1?.fullName || detail?.parent1FullName },
                                { label: 'Parent 1 Email', value: family.parent1?.email || detail?.parent1Email },
                                { label: 'Parent 1 Phone', value: family.parent1?.phone || detail?.parent1Phone },
                                ...(family.parent2?.fullName || detail?.parent2FullName ? [
                                    { label: 'Parent 2 Relationship', value: family.parent2?.relationship || detail?.parent2Relationship },
                                    { label: 'Parent 2 Full Name', value: family.parent2?.fullName || detail?.parent2FullName },
                                    { label: 'Parent 2 Email', value: family.parent2?.email || detail?.parent2Email },
                                    { label: 'Parent 2 Phone', value: family.parent2?.phone || detail?.parent2Phone },
                                ] : []),
                            ]}
                        />
                    )}

                    {/* Educational History Section */}
                    {academicsList.length > 0 && (
                        <div className="review-section-card">
                            <h3 className="review-card-title">
                                <span className="gus-sec-dot gus-dot-blue" style={{ marginRight: '8px' }} />
                                Educational History ({academicsList.length})
                            </h3>
                            <div className="review-table-wrapper">
                                <table className="review-table">
                                    <thead>
                                        <tr>
                                            <th>Qualification</th>
                                            <th>School / Institution</th>
                                            <th>Board / University</th>
                                            <th>Score / CGPA</th>
                                            <th>Year of Passing</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {academicsList.map((edu, idx) => (
                                            <tr key={idx}>
                                                <td className="cell-primary">{edu.qualification}</td>
                                                <td>{edu.schoolName}</td>
                                                <td>{edu.boardUniversity}</td>
                                                <td className="cell-score">{edu.score}</td>
                                                <td>{edu.yearOfPassing}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Standardized Test Scores Section */}
                    {(testsData.hasNotTaken || testsData.list.length > 0) && (
                        <div className="review-section-card">
                            <h3 className="review-card-title">
                                <span className="gus-sec-dot gus-dot-pink" style={{ marginRight: '8px' }} />
                                Entrance &amp; Proficiency Test Scores
                            </h3>
                            {testsData.hasNotTaken && !testsData.list.length ? (
                                <div className="review-notice-box">
                                    Applicant declared: No test scores taken.
                                </div>
                            ) : (
                                <div className="review-test-list">
                                    {testsData.list.map((t, idx) => (
                                        <div key={idx} className="review-test-card">
                                            <div className="review-test-header">
                                                <span className="review-test-name">{t.exam}</span>
                                                <span className="review-score-badge">Score: {t.score}</span>
                                            </div>
                                            {t.testDate && <div className="review-test-date">Test Date: {t.testDate}</div>}
                                            {t.selectedUniversities && t.selectedUniversities.length > 0 && (
                                                <div className="review-qualifying-unis">
                                                    <div className="review-qualifying-label">Eligible universities for this score ({t.selectedUniversities.length}):</div>
                                                    <div className="review-chips-flex">
                                                        {t.selectedUniversities.map((uObj, uIdx) => {
                                                            const uName = typeof uObj === 'string' ? uObj : (uObj.university || uObj.universityName);
                                                            const country = typeof uObj === 'object' && uObj.country ? ` (${uObj.country})` : '';
                                                            const minimum = typeof uObj === 'object' && uObj.minScoreRequired !== undefined ? ` · minimum ${uObj.minScoreRequired}` : '';
                                                            return (
                                                                <span key={uIdx} className="review-chip primary-chip">
                                                                    {uName}{country}{minimum}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Selected Universities & Programs Section */}
                    {programmeGroups.length > 0 && (
                        <div className="review-section-card">
                            <h3 className="review-card-title">
                                <span className="gus-sec-dot gus-dot-blue" style={{ marginRight: '8px' }} />
                                Selected Universities &amp; Programmes ({programmeGroups.length})
                            </h3>
                            <div className="review-uni-list">
                                {programmeGroups.map((group, idx) => (
                                    <div key={idx} className="review-uni-card">
                                        <div className="review-uni-header">
                                            <span className="review-uni-name">{group.universityName || 'University'}</span>
                                            <span className="review-uni-country">{group.country || group.location}</span>
                                        </div>
                                        <div className="review-uni-courses-label">Selected Programme(s):</div>
                                        <div className="review-chips-flex">
                                            {(group.selectedCourses || []).map((prog, pIdx) => (
                                                <span key={pIdx} className="review-chip primary-chip">
                                                    {prog.title || prog.degree || 'Degree Program'}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <section className="review-qualifying-unis" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                        <div className="review-qualifying-label" style={{ color: '#166534', fontWeight: 700, marginBottom: 10 }}>
                            Eligible universities for this score ({eligibleUniversities.length}):
                        </div>
                        {eligibleUniversities.length ? (
                            <div className="review-chips-flex">
                                {eligibleUniversities.map((university, index) => (
                                    <span key={`${university.universityName}-${university.country}-${index}`} className="review-chip font-medium primary-chip review-matched-university">
                                        <strong>{university.universityName}</strong>{university.country ? ` (${university.country})` : ''}{university.minScoreRequired !== undefined ? ` · minimum ${university.minScoreRequired}` : ''}
                                    </span>
                                ))}
                            </div>
                        ) : <div className="review-no-university-match">No score-matched universities are available for the selected country.</div>}
                    </section>

                    {/* Uploaded Application Documents Section */}
                    {docList.length > 0 && (
                        <div className="review-section-card">
                            <h3 className="review-card-title">
                                <span className="gus-sec-dot gus-dot-purple" style={{ marginRight: '8px' }} />
                                Uploaded Application Documents
                            </h3>
                            <div className="gus-doc-progress-wrap" style={{ marginBottom: '16px' }}>
                                <div className="gus-doc-progress-track">
                                    <div className="gus-doc-progress-fill" style={{ width: `${docsCompletionPct}%` }} />
                                </div>
                                <span className="gus-doc-progress-label">{docsCompletionPct}% Complete</span>
                            </div>
                            <div className="review-docs-grid">
                                {docList.map((doc) => (
                                    <div key={doc.key} className="review-doc-card">
                                        <div className="review-doc-top">
                                            <span className="review-doc-badge">
                                                {doc.fileName?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'File'}
                                            </span>
                                            <span className={`review-doc-status ${doc.uploaded ? 'status-uploaded' : 'status-missing'}`}>
                                                {doc.uploaded ? '✓ Uploaded' : 'Pending'}
                                            </span>
                                        </div>
                                        <div className="review-doc-name">{doc.label}</div>
                                        <div className="review-doc-file">{doc.fileName || 'Not uploaded'}</div>
                                        <div className="review-doc-footer">
                                            {doc.uploaded && doc.fileUrl ? (
                                                <a href={resolveFileUrl(doc.fileUrl)} target="_blank" rel="noopener noreferrer" className="review-doc-view-btn">
                                                    View
                                                </a>
                                            ) : (
                                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>No File</span>
                                            )}
                                            <button
                                                type="button"
                                                className="doc-email-btn"
                                                title={`Send email request for ${doc.label}`}
                                                onClick={() => setEmailDoc({ key: doc.key, label: doc.label, uploaded: doc.uploaded })}
                                            >
                                                <FiMail style={{ marginRight: 4 }} /> Email
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                   

                </div>

                {/* ── Premium Modal Footer ── */}
                <div className="gus-modal-ftr gus-premium-ftr">
                    <div className="gus-premium-footer-info">
                        <p>This is a summary of the programmes and documents submitted for this application. Please contact support if any information is incorrect.</p>
                    </div>
                    <button className="gus-modal-close-btn" type="button" onClick={onClose}>Close</button>
                </div>

            </div>

            {/* Document Email Request Modal */}
            {emailDoc && (
                <DocumentEmailModal
                    doc={emailDoc}
                    studentEmail={studentEmail}
                    studentName={fullName}
                    studentId={studentId}
                    onClose={() => setEmailDoc(null)}
                />
            )}
        </div>
    );
};

/* ──────────────────────────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
────────────────────────────────────────────────────────────────────────────────────────────────── */
const MasterLoadingState = ({ label = "Loading applications..." }) => (
  <div className="master-loading-state" role="status" aria-live="polite">
    <span className="master-loading-spinner" aria-hidden="true" />
    <span>{label}</span>
  </div>
);

export default function MasterUniversity() {
  const [stats,              setStats]              = useState({ total: 0, submitted: 0, draft: 0, underReview: 0 });
  const [applications,       setApplications]       = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [statsLoading,       setStatsLoading]       = useState(true);
  const [error,              setError]              = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState(null);
  const [activeFilter,       setActiveFilter]       = useState("All");
  const [searchQuery,        setSearchQuery]        = useState("");
  const [pagination,         setPagination]         = useState({ total: 0, pages: 1 });
  const [page,               setPage]               = useState(1);
  const [expandedSidebar,    setExpandedSidebar]    = useState({});
  const [selectedId,         setSelectedId]         = useState(null);
  const [verifyModal,        setVerifyModal]        = useState(null);
  const [verifyLoading,      setVerifyLoading]      = useState(false);
  const [verifyError,        setVerifyError]        = useState("");
  const [universities,       setUniversities]       = useState([]);
  const [universityMatchesApp, setUniversityMatchesApp] = useState(null);
  const [selectedMasterUniversityKeys, setSelectedMasterUniversityKeys] = useState([]);
  const [universitySelectionBusy, setUniversitySelectionBusy] = useState(false);
  const [universitySelectionError, setUniversitySelectionError] = useState('');
  const [mobileMenuOpen,     setMobileMenuOpen]     = useState(false);

  const LIMIT = 50;

  const filterToStatus = useMemo(() => ({
    All: "all",
    Completed: "submitted",
    Incomplete: "draft",
    "In Progress": "under_review",
  }), []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetchStats();
      if (res.success) setStats(res.stats);
    } catch (e) {
      console.error("Stats error:", e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchApplications({
        page,
        limit: LIMIT,
        status: filterToStatus[activeFilter] || "all",
        search: searchQuery,
      });

      if (res.success) {
        const data = res.data || [];
        setApplications(data);
        setPagination(res.pagination || { total: 0, pages: 1 });

        const seen = new Set();
        const unis = [];
        data.forEach((app) => {
          const name = app.course?.universityName;
          if (name && !seen.has(name)) {
            seen.add(name);
            unis.push({ id: name, name });
          }
        });
        setUniversities(unis);
      } else {
        setError(res.message || "Failed to load applications.");
      }
    } catch (e) {
      setError(e.message || "Network error.");
    } finally {
      setLoading(false);
    }
  }, [page, activeFilter, searchQuery, filterToStatus]);

  useEffect(() => { loadStats(); },        [loadStats]);
  useEffect(() => { loadApplications(); }, [loadApplications]);

  useEffect(() => {
    const handler = () => {
      if (window.innerWidth > 900) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const toggleSidebar = (id) =>
    setExpandedSidebar((prev) => ({ ...prev, [id]: !prev[id] }));

  const selectUniversity = (uni) => {
    setSelectedUniversity(uni);
    setActiveFilter("All");
    setSearchQuery("");
    setPage(1);
    setMobileMenuOpen(false);
  };

  const handleRefresh = () => {
    if (loading || statsLoading) return;
    loadStats();
    loadApplications();
  };

  const openMasterUniversityMatches = async (app, readOnly = false) => {
    setUniversitySelectionError('');
    setUniversityMatchesApp({ ...app, loading: true, readOnly });
    try {
      const studentId = app.studentId || app.userId;
      const response = await fetch(`${API_BASE}/process-admin/${studentId}/universities`, { headers: authHeaders() });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || `Unable to load universities (${response.status}).`);
      const data = result.data || {};
      const eligibleKeys = new Set((data.universities || []).map((university) => `${university.universityName}|${university.country}`));
      const selectedUniversities = data.selectedUniversities || app.selectedUniversities || [];
      setSelectedMasterUniversityKeys(selectedUniversities
        .filter((university) => eligibleKeys.has(`${university.universityName}|${university.country}`))
        .map((university) => `${university.universityName}|${university.country}`));
      setUniversityMatchesApp({ ...app, ...data, loading: false, readOnly });
    } catch (error) {
      setUniversityMatchesApp({ ...app, universities: [], loading: false, readOnly });
      setUniversitySelectionError(error.message || 'Unable to load eligible master universities.');
    }
  };

  const toggleMasterUniversity = (university) => {
    const key = `${university.universityName}|${university.country}`;
    setSelectedMasterUniversityKeys((current) => current.includes(key)
      ? current.filter((item) => item !== key)
      : current.length < 5 ? [...current, key] : current);
  };

  const saveMasterUniversityMatches = async () => {
    if (!universityMatchesApp || !selectedMasterUniversityKeys.length) return;
    setUniversitySelectionBusy(true);
    setUniversitySelectionError('');
    try {
      const selectedUniversities = universityMatchesApp.universities.filter((university) => selectedMasterUniversityKeys.includes(`${university.universityName}|${university.country}`));
      const response = await fetch(`${API_BASE}/process-admin/university-selection/save`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ studentId: universityMatchesApp.studentId || universityMatchesApp.userId, selectedUniversities }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || `Unable to save selections (${response.status}).`);
      setUniversityMatchesApp(null);
      await Promise.all([loadApplications(), loadStats()]);
    } catch (error) {
      setUniversitySelectionError(error.message || 'Failed to save university selections.');
    } finally {
      setUniversitySelectionBusy(false);
    }
  };

  const approveMasterUniversityMatches = async (app) => {
    setUniversitySelectionBusy(true);
    setUniversitySelectionError('');
    try {
      const response = await fetch(`${API_BASE}/process-admin/university-selection/approve`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ studentId: app.studentId || app.userId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || `Unable to approve selections (${response.status}).`);
      setUniversityMatchesApp(null);
      await Promise.all([loadApplications(), loadStats()]);
    } catch (error) {
      const message = error.message || 'Failed to approve university selections.';
      setUniversitySelectionError(message);
      if (!universityMatchesApp) window.alert(message);
    } finally {
      setUniversitySelectionBusy(false);
    }
  };

  const renderMasterUniversityActions = (app) => {
    const universityStatus = String(app.universitySelectionStatus || '').toLowerCase();
    const universityApproved = universityStatus === 'completed';
    const programApproved = String(app.programApprovalStatus || '').toLowerCase() === 'approved' ||
      String(app.overviewStatus || '').toLowerCase() === 'approved' || app.processAdminVerified ||
      String(app.applicationStatus || '').toLowerCase() === 'approved' || String(app.status || '').toLowerCase() === 'approved';
    const hasSavedUniversities = Array.isArray(app.selectedUniversities) && app.selectedUniversities.length > 0;
    return <>
      {hasSavedUniversities ? (
        <button type="button" className="mu-btn-universities" onClick={() => openMasterUniversityMatches(app, universityApproved)}>View University</button>
      ) : programApproved ? (
        <button type="button" className="mu-btn-universities" onClick={() => openMasterUniversityMatches(app)}>View Universities</button>
      ) : null}
      {hasSavedUniversities && !universityApproved && programApproved && (
        <button type="button" className="mu-btn-final-approve" onClick={() => approveMasterUniversityMatches(app)}>Approve Selection</button>
      )}
      {universityApproved ? <span className="mu-badge-approved">✓ Approved</span> : !programApproved ? (
        <button type="button" className="mu-btn-approve" onClick={async () => {
          if (!window.confirm(`Approve the master program for ${app.fullName || app.studentName || 'this student'}?`)) return;
          try {
            const response = await fetch(`${API_BASE_URL}/api/enrollment-admin/masters/applications/${app.studentId || app.userId}/approve`, { method: 'PATCH', headers: authHeaders() });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.success) throw new Error(result.message || 'Failed to approve program.');
            await Promise.all([loadApplications(), loadStats()]);
          } catch (error) { window.alert(error.message || 'Failed to approve program.'); }
        }}>Approve Program</button>
      ) : null}
    </>;
  };

  const submitVerification = async () => {
    if (!verifyModal || verifyLoading) return;
    setVerifyLoading(true);
    setVerifyError("");
    try {
      await verifyApplication(verifyModal);
      setVerifyModal(null);
      await Promise.all([loadApplications(), loadStats()]);
    } catch (verificationError) {
      setVerifyError(verificationError.message || "Failed to send application to Admin Verification Queue.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const filteredApps = selectedUniversity
    ? applications.filter((app) => app.course?.universityName === selectedUniversity.id)
    : applications;

  const displayStats = selectedUniversity
    ? {
        total:      filteredApps.length,
        completed:  filteredApps.filter((a) => a.applicationStatus === "submitted").length,
        incomplete: filteredApps.filter((a) => a.applicationStatus === "draft").length,
        inProgress: filteredApps.filter((a) => a.applicationStatus === "under_review").length,
      }
    : {
        total:      statsLoading ? "..." : stats.total,
        completed:  statsLoading ? "..." : stats.submitted,
        incomplete: statsLoading ? "..." : stats.draft,
        inProgress: statsLoading ? "..." : stats.underReview,
      };

  return (
    <div className="mu-wrapper">
      <aside className={`mu-sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="mu-sidebar-header">
          <span className="mu-sidebar-header-brand">EDU TECH</span>
          <button
            className="mobile-menu-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            &times;
          </button>
        </div>

        <div className="mu-sidebar-logo">EDU TECH</div>

        <nav className="mu-nav">
          <div
            className="mu-nav-item mu-nav-item--dashboard"
            onClick={() => {
              setSelectedUniversity(null);
              setActiveFilter("All");
              setSearchQuery("");
              setPage(1);
              setMobileMenuOpen(false);
            }}
          >
            Dashboard
          </div>

          {universities.map((uni) => (
            <div key={uni.id} className="mu-nav-group">
              <div
                className={`mu-nav-item mu-nav-item--university ${
                  selectedUniversity?.id === uni.id ? "mu-nav-item--active" : ""
                }`}
                onClick={() => {
                  toggleSidebar(uni.id);
                  selectUniversity(uni);
                }}
              >
                <span className="mu-nav-uni-name">{uni.name}</span>
                <span className="mu-nav-chevron">
                  {expandedSidebar[uni.id] ? "−" : "+"}
                </span>
              </div>

              {expandedSidebar[uni.id] && (
                <div className="mu-nav-sub">
                  <div className="mu-nav-sub-item">Applications</div>
                  <div className="mu-nav-sub-item">Documents</div>
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="mu-sidebar-logout">Logout</div>
      </aside>

      {mobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <main className="mu-main">
        <header className="mu-topbar">
          <div className="mu-topbar-title">
            <span className="mu-topbar-label">Process</span>
            <span className="mu-topbar-sub">Admin</span>
          </div>
          <div className="mu-topbar-search">
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="mu-search-input"
            />
          </div>
          <button
            className="refresh-mobile"
            onClick={handleRefresh}
            aria-label="Refresh"
            aria-busy={loading || statsLoading}
            disabled={loading || statsLoading}
          >
            {loading || statsLoading ? <span className="master-refresh-spinner" aria-hidden="true" /> : <RefreshMark />}
          </button>
        </header>

        <div className="mu-banner">
          <div className="mu-banner-left">
            <h2 className="mu-banner-title">Applications</h2>
            {selectedUniversity && (
              <span className="mu-banner-uni-badge" title={selectedUniversity.name}>
                {selectedUniversity.name}
              </span>
            )}
          </div>
          <div className="mu-banner-right">
            <button
              className="btn-outline"
              onClick={() => {
                setSelectedUniversity(null);
                setActiveFilter("All");
                setSearchQuery("");
                setPage(1);
              }}
            >
              All Universities
            </button>
            <button className="btn-primary" onClick={handleRefresh} aria-busy={loading || statsLoading} disabled={loading || statsLoading}>
              <RefreshMark />
              <span>{loading || statsLoading ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card stat-card-total">
            <div className="stat-card-text">
              <div className="stat-label">Total</div>
              <div className="stat-value">{displayStats.total}</div>
            </div>
          </div>
          <div className="stat-card stat-card-incomplete">
            <div className="stat-card-text">
              <div className="stat-label">Draft</div>
              <div className="stat-value">{displayStats.incomplete}</div>
            </div>
          </div>
          <div className="stat-card stat-card-completed">
            <div className="stat-card-text">
              <div className="stat-label">Done</div>
              <div className="stat-value">{displayStats.completed}</div>
            </div>
          </div>
          <div className="stat-card stat-card-inprogress">
            <div className="stat-card-text">
              <div className="stat-label">Review</div>
              <div className="stat-value">{displayStats.inProgress}</div>
            </div>
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-search-bar">
            <span className="filter-search-icon"><SearchIcon /></span>
            <input
              type="text"
              className="filter-search-input"
              placeholder="Search by name, email or application ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
            {searchQuery && (
              <button
                className="filter-search-clear"
                onClick={() => { setSearchQuery(""); setPage(1); }}
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>

          <div className="filter-btns-scroll">
            {["All", "Completed", "Incomplete", "In Progress"].map((f) => (
              <button
                key={f}
                className={`filter-btn ${activeFilter === f ? "filter-btn-active" : ""}`}
                onClick={() => { setActiveFilter(f); setPage(1); }}
              >
                {f === "In Progress" ? "Progress" : f}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="error-box">Warning: {error}</div>}

        {/* Mobile Cards */}
        <div className="mobile-cards">
          {loading ? (
            <div className="loading-cards"><MasterLoadingState /></div>
          ) : filteredApps.length === 0 ? (
            <div className="empty-cards">No applications found.</div>
          ) : (
            <>
              {filteredApps.map((app) => (
                <div key={app._id} className="mobile-card">
                  <div className="mobile-card-header">
                    <div className="mobile-card-id">{app.applicationId}</div>
                    <span className={`status-badge ${getStatusClass(app.applicationStatus)}`}>
                      {getStatusLabel(app.applicationStatus)}
                    </span>
                  </div>

                  <div className="mobile-card-body">
                    <div className="mobile-student-row">
                      <div className="avatar-small">
                        {getInitials(app.fullName || app.studentName)}
                      </div>
                      <div className="mobile-student-info">
                        <div className="mobile-student-name">
                          {app.fullName || app.studentName}
                        </div>
                        <div className="mobile-student-email">{app.email}</div>
                        {app.contact?.mobileNumber && (
                          <div className="mobile-student-phone">
                            {app.contact.mobileNumber}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mobile-meta-grid">
                      <div className="mobile-meta-item full-width">
                        <span className="mobile-meta-label">University</span>
                        <div className="mobile-university-list">
                          {(getProgrammeGroups(app)
                            .map((group) => group.universityName)
                            .filter((name) => name && !/^Universities in /i.test(name)).length
                            ? [...new Set(getProgrammeGroups(app)
                              .map((group) => group.universityName)
                              .filter((name) => name && !/^Universities in /i.test(name)))]
                            : [app.course?.universityName || app.universityName || "-"]
                          ).map((university, index) => (
                            <span className="mobile-university-chip" key={`${university}-${index}`}>
                              {university}
                            </span>
                          ))}
                        </div>
                        {(app.course?.preferredCourse || app.programName || app.programType) && (
                          <span className="mobile-meta-sub">
                            {app.course?.preferredCourse || app.programName || app.programType}
                          </span>
                        )}
                      </div>

                      <div className="mobile-meta-item">
                        <span className="mobile-meta-label">Submitted</span>
                        <span className="mobile-meta-value">
                          {formatDateShort(app.submittedAt)}
                        </span>
                      </div>

                      <div className="mobile-meta-item">
                        <span className="mobile-meta-label">Progress</span>
                        <span className="mobile-meta-value">{app.completionPercentage}%</span>
                      </div>

                      <div className="mobile-meta-item full-width">
                        <div className="mobile-progress">
                          <div className="progress-bar-mobile">
                            <div
                              className="progress-fill-mobile"
                              style={{ width: `${app.completionPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mobile-card-footer">
                    <button
                      className="btn-view-mobile"
                      onClick={() => setSelectedId(app.studentId)}
                    >
                      View Details
                    </button>
                    {renderMasterUniversityActions(app)}
                  </div>
                </div>
              ))}

              <div className="mobile-showing-label">
                Showing {filteredApps.length} of {pagination.total} applications
              </div>
            </>
          )}
        </div>

        {/* Desktop Table */}
        <div className="desktop-table-view">
          <div className="table-wrap">
            {loading ? (
              <div className="table-loading"><MasterLoadingState /></div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
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
                  {filteredApps.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="table-empty">
                        No applications found.
                      </td>
                    </tr>
                  ) : (
                    filteredApps.map((app) => (
                      <tr key={app._id} className="table-row">
                        <td>
                          <div className="app-id">{app.applicationId}</div>
                          <div className="app-subid">
                            {app.studentId ? app.studentId.slice(-8) : "-"}
                          </div>
                        </td>

                        <td>
                          <div className="uni-name-main">
                            {app.course?.universityName || app.universityName || "-"}
                          </div>
                          {(app.course?.preferredCourse || app.programName || app.programType) && (
                            <div className="uni-course-sub">
                              {app.course?.preferredCourse || app.programName || app.programType}
                            </div>
                          )}
                        </td>

                        <td>
                          <div className="student-cell">
                            <div className="avatar">
                              {getInitials(app.fullName || app.studentName)}
                            </div>
                            <div className="student-info">
                              <div className="student-name" title={app.fullName || app.studentName}>
                                {app.fullName || app.studentName}
                              </div>
                              <div className="student-email" title={app.email}>
                                {app.email}
                              </div>
                              {app.contact?.mobileNumber && (
                                <div className="student-phone">
                                  {app.contact.mobileNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={`status-badge ${getStatusClass(app.applicationStatus)}`}>
                            {getStatusLabel(app.applicationStatus)}
                          </span>
                        </td>

                        <td>
                          <span className="submitted-date">
                            {formatDateShort(app.submittedAt)}
                          </span>
                        </td>

                        <td>
                          <div className="progress-wrap">
                            <div className="progress-bar">
                              <div
                                className="progress-fill"
                                style={{ width: `${app.completionPercentage}%` }}
                              />
                            </div>
                            <span className="progress-pct">
                              {app.completionPercentage}%
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="action-btns">
                            <button
                              className="btn-view"
                              onClick={() => setSelectedId(app.studentId)}
                            >
                              View
                            </button>
                            {renderMasterUniversityActions(app)}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="table-footer">
            {pagination.pages > 1 ? (
              <div className="table-footer-inner">
                <span className="showing-label">
                  Showing {filteredApps.length} of {pagination.total} applications
                </span>
                <div className="pagination">
                  <button
                    className="page-btn"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <span className="page-info">{page} / {pagination.pages}</span>
                  <button
                    className="page-btn"
                    disabled={page === pagination.pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              <div className="table-footer-inner">
                <span className="showing-label">
                  Showing {filteredApps.length} of {pagination.total} applications
                </span>
              </div>
            )}
          </div>
        </div>
      </main>

      {universityMatchesApp && (
        <div className="master-university-overlay" onClick={() => !universitySelectionBusy && setUniversityMatchesApp(null)}>
          <section className="master-university-picker" role="dialog" aria-modal="true" aria-labelledby="master-university-title" onClick={(event) => event.stopPropagation()}>
            <header className="master-university-header">
              <div>
                <span className="master-university-eyebrow">MASTER APPLICATION · UNIVERSITY MATCHING</span>
                <h2 id="master-university-title">{universityMatchesApp.readOnly ? 'Selected Universities' : 'Eligible Master Universities'}</h2>
                <p>{universityMatchesApp.fullName || universityMatchesApp.studentName || 'Student'} · {universityMatchesApp.applicationId || 'Application'}</p>
              </div>
              <button type="button" aria-label="Close" disabled={universitySelectionBusy} onClick={() => setUniversityMatchesApp(null)}>×</button>
            </header>
            <div className="master-university-body">
              <p className="master-university-hint">Matches are based on the student's submitted entrance and English test scores. Select up to five universities.</p>
              {universitySelectionError && <div className="master-university-error" role="alert">{universitySelectionError}</div>}
              {universityMatchesApp.loading ? <div className="master-university-empty">Loading eligible universities…</div> : (
                <div className="master-university-list">
                  {(universityMatchesApp.universities || [])
                    .filter((university) => !universityMatchesApp.readOnly || selectedMasterUniversityKeys.includes(`${university.universityName}|${university.country}`))
                    .map((university, index) => {
                      const key = `${university.universityName}|${university.country}`;
                      const selected = selectedMasterUniversityKeys.includes(key);
                      return (
                        <article className={`master-university-option ${selected ? 'is-selected' : ''}`} key={key}>
                          <span className="master-university-index">{String(index + 1).padStart(2, '0')}</span>
                          <div className="master-university-copy">
                            <h3>{university.universityName}</h3>
                            <p>{university.country || 'Country not listed'}</p>
                            {Array.isArray(university.selectedPrograms) && university.selectedPrograms.length > 0 && <small>{university.selectedPrograms.join(' · ')}</small>}
                          </div>
                          <div className="master-university-score">
                            <strong>{university.matchedExam || 'Score'} min {university.minScoreRequired ?? '—'}</strong>
                            {university.studentScore != null && <span>Student: {university.studentScore}</span>}
                          </div>
                          {!universityMatchesApp.readOnly && <button type="button" className={`master-university-select ${selected ? 'is-selected' : ''}`} disabled={!selected && selectedMasterUniversityKeys.length >= 5} onClick={() => toggleMasterUniversity(university)}>{selected ? 'Selected' : 'Select'}</button>}
                        </article>
                      );
                    })}
                  {!universityMatchesApp.loading && (universityMatchesApp.universities || []).length === 0 && <div className="master-university-empty">No universities currently match the student's recorded scores.</div>}
                </div>
              )}
            </div>
            <footer className="master-university-footer">
              <span>{selectedMasterUniversityKeys.length} / 5 selected</span>
              <div>
                <button type="button" className="master-university-close" disabled={universitySelectionBusy} onClick={() => setUniversityMatchesApp(null)}>Close</button>
                {!universityMatchesApp.readOnly && <button type="button" className="master-university-save" disabled={universitySelectionBusy || !selectedMasterUniversityKeys.length} onClick={saveMasterUniversityMatches}>{universitySelectionBusy ? 'Saving…' : 'Save Selection'}</button>}
              </div>
            </footer>
          </section>
        </div>
      )}
      {verifyModal && (
        <div className="master-verify-overlay" onClick={() => !verifyLoading && setVerifyModal(null)}>
          <div className="master-verify-modal" role="dialog" aria-modal="true" aria-labelledby="master-verify-title" onClick={(event) => event.stopPropagation()}>
            <div className="master-verify-header">
              <div><h3 id="master-verify-title">Verify Master Application</h3><p>Send this completed application and all uploaded documents to Admin Verification.</p></div>
              <button type="button" aria-label="Close" onClick={() => setVerifyModal(null)} disabled={verifyLoading}>&times;</button>
            </div>
            <div className="master-verify-details">
              <div><span>Student</span><strong>{verifyModal.fullName || verifyModal.studentName || "Unknown"}</strong></div>
              <div><span>Application ID</span><strong>{verifyModal.applicationId || "-"}</strong></div>
              <div><span>University</span><strong>{verifyModal.course?.universityName || "-"}</strong></div>
              <div><span>Programme</span><strong>{verifyModal.course?.preferredCourse || "-"}</strong></div>
              <div><span>Documents</span><strong>{verifyModal.documents?.uploadedCount || 0} / {verifyModal.documents?.totalDocs || 0}</strong></div>
              <div><span>Completion</span><strong>{verifyModal.completionPercentage || 0}%</strong></div>
            </div>
            {verifyError && <div className="master-verify-error">{verifyError}</div>}
            <div className="master-verify-actions">
              <button type="button" className="master-verify-cancel" onClick={() => setVerifyModal(null)} disabled={verifyLoading}>Cancel</button>
              <button type="button" className="master-verify-submit" onClick={submitVerification} disabled={verifyLoading}>{verifyLoading ? "Sending..." : "Verify & Send"}</button>
            </div>
          </div>
        </div>
      )}

      {selectedId && (
        <DetailModal
          studentId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
