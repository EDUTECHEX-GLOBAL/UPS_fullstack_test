import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaBell,
  FaBook,
  FaBuilding,
  FaCheck,
  FaChevronDown,
  FaCloudUploadAlt,
  FaCreditCard,
  FaEnvelope,
  FaFileAlt,
  FaFilter,
  FaGraduationCap,
  FaHeadset,
  FaInfoCircle,
  FaPaperPlane,
  FaSearch,
  FaTimes,
  FaTools,
  FaUser,
  FaUsers,
} from "react-icons/fa";
import EdutechLogo from "../../../assets/Edutech-logo.svg";
import supportImage from "../../../assets/support-system.png";
import {
  createSupportTicket,
  getHelpdeskContext,
  getLocalSupportTickets,
  getSupportTickets,
  getTicketCounts,
  markTicketRead,
} from "./supportTicketService";
import "./SupportHelpBot.css";

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "ST";
  return parts.map((part) => part[0]).slice(0, 2).join("").toUpperCase();
};

const getStoredObject = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const pathToTitle = (path = "") => {
  const last = String(path || "")
    .split("?")[0]
    .split("/")
    .filter(Boolean)
    .pop();
  return last ? last.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Application";
};

const getSourceFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const sourcePath = params.get("sourcePath") || sessionStorage.getItem("helpdeskSourcePath") || "";
  const sourceTitle = params.get("sourceTitle") || sessionStorage.getItem("helpdeskSourceTitle") || pathToTitle(sourcePath);
  return { sourcePath, sourceTitle };
};

const getFallbackIssueContext = (source = {}) => {
  const sourcePath = String(source.sourcePath || "").toLowerCase();
  const sourceTitle = String(source.sourceTitle || "").toLowerCase();
  const sourceText = `${sourceTitle} ${sourcePath}`;

  if (sourceText.includes("application progress")) return { category: "Application Progress", issueType: "Progress tracking issue", priority: "Medium" };
  if (sourceText.includes("document")) return { category: "Documents", issueType: "Upload issue", priority: "High" };
  if (sourceText.includes("test score") || sourceText.includes("testing") || sourceText.includes("/scores") || sourceText.includes("/tests")) return { category: "Test Scores", issueType: "Test score issue", priority: "Medium" };
  if (sourceText.includes("education") || sourceText.includes("academic") || sourceText.includes("firsteducation")) return { category: "Education Details", issueType: "Education details issue", priority: "Medium" };
  if (sourceText.includes("personal information") || sourceText.includes("/personal")) return { category: "Personal Information", issueType: "Personal information issue", priority: "Medium" };
  if (sourceText.includes("contact details") || sourceText.includes("/contact")) return { category: "Contact Details", issueType: "Contact details issue", priority: "Medium" };
  if (sourceText.includes("address") || sourceText.includes("/address")) return { category: "Address", issueType: "Address information issue", priority: "Medium" };
  if (sourceText.includes("language") || sourceText.includes("/language")) return { category: "Language", issueType: "Language information issue", priority: "Medium" };
  if (sourceText.includes("geography") || sourceText.includes("/geography")) return { category: "Geography", issueType: "Geography information issue", priority: "Medium" };
  if (sourceText.includes("special needs") || sourceText.includes("specialneeds")) return { category: "Profile", issueType: "Profile form issue", priority: "Medium" };
  if (sourceText.includes("activity") || sourceText.includes("activities")) return { category: "Activities", issueType: "Activities form issue", priority: "Medium" };
  if (sourceText.includes("writing") || sourceText.includes("essay")) return { category: "Writing", issueType: "Writing section issue", priority: "Medium" };
  if (sourceText.includes("family")) return { category: "Family", issueType: "Family information issue", priority: "Medium" };
  if (sourceText.includes("preview")) return { category: "Application Preview", issueType: "Preview or submit issue", priority: "Medium" };
  if (sourceText.includes("course selection") || sourceText.includes("college") || sourceText.includes("university") || sourceText.includes("course")) return { category: "University Selection", issueType: "Selection problem", priority: "Medium" };
  if (sourceText.includes("profile")) return { category: "Profile", issueType: "Profile form issue", priority: "Medium" };
  if (sourceText.includes("master application") || sourceText.includes("master-application")) return { category: "Master Application", issueType: "Master application form issue", priority: "Medium" };
  if (sourceText.includes("bachelor application") || sourceText.includes("/application")) return { category: "Bachelor Application", issueType: "Bachelor application form issue", priority: "Medium" };
  if (sourceText.includes("account") || sourceText.includes("otp") || sourceText.includes("password")) return { category: "Account", issueType: "OTP issue", priority: "High" };
  if (sourceTitle === "dashboard" || /\/firstyear\/dashboard\/?$/.test(sourcePath)) return { category: "Dashboard", issueType: "Dashboard page issue", priority: "Medium" };
  return { category: "Application", issueType: "Data not saving", priority: "Medium" };
};
const REPORT_SECTION_OPTIONS = [
  "Dashboard",
  "Documents",
  "Education Details",
  "Personal Information",
  "Address",
  "Test Scores",
  "University Selection",
  "Application Preview",
  "Account",
  "Payment",
  "Other",
];

const SupportSectionSelect = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);
  const selectedLabel = options.includes(value) ? value : "Other";
  const listboxId = "support-reported-section-listbox";

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!selectRef.current?.contains(event.target)) setIsOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <div ref={selectRef} className={`support-custom-select${isOpen ? " is-open" : ""}`}>
      <button
        type="button"
        className="support-custom-select-trigger"
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-haspopup="listbox"
      >
        <span>{selectedLabel}</span>
        <FaChevronDown aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="support-custom-select-menu" id={listboxId} role="listbox">
          {options.map((section) => (
            <button
              type="button"
              key={section}
              className={`support-custom-select-option${section === selectedLabel ? " is-selected" : ""}`}
              role="option"
              aria-selected={section === selectedLabel}
              onClick={() => handleSelect(section)}
            >
              {section}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
const getReportedSectionIssueContext = (section = "Other") => {
  if (section === "Dashboard") return { category: "Dashboard", issueType: "Dashboard page issue", priority: "Medium" };
  if (section === "Documents") return { category: "Documents", issueType: "Document requirement issue", priority: "High" };
  if (section === "Education Details") return { category: "Education Details", issueType: "Education details issue", priority: "Medium" };
  if (section === "Personal Information") return { category: "Personal Information", issueType: "Personal information issue", priority: "Medium" };
  if (section === "Address") return { category: "Address", issueType: "Address information issue", priority: "Medium" };
  if (section === "Test Scores") return { category: "Test Scores", issueType: "Test score issue", priority: "Medium" };
  if (section === "University Selection") return { category: "University Selection", issueType: "Selection problem", priority: "Medium" };
  if (section === "Application Preview") return { category: "Application Preview", issueType: "Preview or submit issue", priority: "Medium" };
  if (section === "Account") return { category: "Account", issueType: "OTP issue", priority: "High" };
  if (section === "Payment") return { category: "Payment", issueType: "Payment issue", priority: "High" };
  return { category: "Other", issueType: "General support query", priority: "Medium" };
};

const getFallbackContext = () => {
  const userData = getStoredObject("userData") || {};
  const userProfile = getStoredObject("userProfile") || {};
  const basicInfo = userProfile.basicInfo || {};
  const source = getSourceFromUrl();
  const fallbackIssue = getFallbackIssueContext(source);
  const fullName = basicInfo.fullName || [userData.firstName, userData.lastName].filter(Boolean).join(" ");
  const idSource = userData.studentId || userData.caId || userData._id || "";
  const studentId = String(idSource).startsWith("CAID")
    ? String(idSource).replace("CAID", "STU").replace(/\s+/g, "-")
    : idSource
      ? `STU-${String(idSource).slice(-6).toUpperCase()}`
      : "STU-000123";
  const progress = userData.applicationProgress || {};
  const currentProgress = Number(progress.application || 0);

  return {
    studentName: fullName || localStorage.getItem("userEmail") || "Student",
    studentEmail: basicInfo.email || userData.email || localStorage.getItem("userEmail") || "",
    studentId,
    applicationId: "EQHE-000021",
    currentSection: source.sourceTitle || "Application",
    sourcePath: source.sourcePath,
    sourceTitle: source.sourceTitle,
    currentProgress: currentProgress || 0,
    category: fallbackIssue.category,
    issueType: fallbackIssue.issueType,
    priority: fallbackIssue.priority,
    studyLevel: userProfile.programType === "PG" ? "Postgraduate (PG)" : "Undergraduate (UG)",
    selectedUniversity: userProfile.selectedUniversities?.[0]?.name || "Not selected",
    selectedCourse: userProfile.selectedUniversities?.[0]?.selectedCourses?.[0]?.title || "Not selected",
  };
};

const getApplicationDetails = (context) => [
  { label: "Student Name", value: context.studentName || "Student", icon: <FaUser /> },
  { label: "Student ID", value: context.studentId || "STU-000123", icon: <FaCreditCard /> },
  { label: "Application ID", value: context.applicationId || "EQHE-000021", icon: <FaFileAlt /> },
  { label: "Current Section", value: context.currentSection || "Application", icon: <FaBook /> },
  { label: "Current Progress", value: `${Number(context.currentProgress || 0)}%`, icon: <FaCheck /> },
  { label: "Study Level", value: context.studyLevel || "Undergraduate (UG)", icon: <FaGraduationCap /> },
  { label: "Selected University", value: context.selectedUniversity || "Not selected", icon: <FaBuilding /> },
  { label: "Selected Course", value: context.selectedCourse || "Not selected", icon: <FaFileAlt /> },
];

const timeAgo = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / 36e5);
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
};

const statusClass = (status = "") => status.toLowerCase().replace(/\s+/g, "-");

const actorLabel = (role = "") => {
  if (role === "student") return "You";
  if (role === "partner" || role === "admin") return "Support Partner";
  return "System";
};

const isImageAttachment = (ticket = {}) => String(ticket.screenshotMimeType || "").startsWith("image/");

const formatFileSize = (size = 0) => {
  const bytes = Number(size || 0);
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const categoryIcon = (category = "") => {
  if (category.includes("Document")) return <FaUsers />;
  if (category.includes("University")) return <FaTools />;
  if (category.includes("Profile")) return <FaEnvelope />;
  if (category.includes("Account")) return <FaEnvelope />;
  return <FaCreditCard />;
};

const SupportHelpBot = () => {
  const navigate = useNavigate();
  const source = useMemo(getSourceFromUrl, []);
  const [context, setContext] = useState(() => getFallbackContext());
  const [tickets, setTickets] = useState(() => getLocalSupportTickets());
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [screenshotName, setScreenshotName] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [successTicket, setSuccessTicket] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [loadingContext, setLoadingContext] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState("");
  const [ticketMode, setTicketMode] = useState("currentPage");
  const [reportedSection, setReportedSection] = useState("Other");

  useEffect(() => {
    let cancelled = false;

    const loadHelpdeskData = async () => {
      try {
        const [nextContext, nextTickets] = await Promise.all([
          getHelpdeskContext(source),
          getSupportTickets(),
        ]);
        if (cancelled) return;
        if (nextContext && Object.keys(nextContext).length) {
          setContext((current) => ({ ...current, ...nextContext }));
        }
        setTickets(nextTickets);
        setSelectedTicket((current) =>
          current ? nextTickets.find((ticket) => ticket.ticketNumber === current.ticketNumber) || current : null
        );
      } catch (error) {
        console.warn("Helpdesk data could not be loaded; continuing with local context.", error?.response?.status || error?.message);
      } finally {
        if (!cancelled) setLoadingContext(false);
      }
    };

    loadHelpdeskData();
    return () => { cancelled = true; };
  }, [source]);

  const appDetails = useMemo(() => getApplicationDetails(context), [context]);
  const counts = getTicketCounts(tickets);
  const selectedIssueContext = useMemo(
    () => ticketMode === "otherQuery"
      ? getReportedSectionIssueContext(reportedSection)
      : {
          category: context.category || "Application",
          issueType: context.issueType || "Support issue",
          priority: context.priority || "Medium",
        },
    [context.category, context.issueType, context.priority, reportedSection, ticketMode]
  );
  const subject = `${selectedIssueContext.category} - ${selectedIssueContext.issueType}`;
  const descriptionPlaceholder = ticketMode === "otherQuery"
    ? `Describe your ${reportedSection.toLowerCase()} question. Your current page context is already captured.`
    : "Describe what is going wrong on this page. The page, student, application, category, type, and priority are already captured.";
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = [ticket.id, ticket.ticketNumber, ticket.subject, ticket.description]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === "open") return ticket.status === "Open" || ticket.status === "In Progress";
    if (activeFilter === "unread") return ticket.unread;
    if (activeFilter === "resolved") return ticket.status === "Resolved";
    return true;
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const ticket = await createSupportTicket({
        ticketMode,
        reportedSection: ticketMode === "otherQuery" ? reportedSection : "",
        context,
        sourcePath: context.sourcePath,
        sourceTitle: context.sourceTitle,
        category: selectedIssueContext.category,
        issueType: selectedIssueContext.issueType,
        priority: selectedIssueContext.priority,
        subject,
        description: description.trim(),
        screenshotName,
        screenshot: screenshotFile,
      });

      const nextTickets = await getSupportTickets();
      setTickets(nextTickets);
      const createdTicket = nextTickets.find((item) => item.ticketNumber === ticket?.ticketNumber) || ticket;
      setSelectedTicket(createdTicket || null);
      setSuccessTicket(ticket);
      setDescription("");
      setScreenshotName("");
      setScreenshotFile(null);
    } catch (error) {
      console.warn("Support ticket submission failed.", error?.response?.status || error?.message);
      setSubmitError(error?.response?.data?.message || "Could not submit the support ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };


  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    if (!ticket?.unreadForStudent) return;

    try {
      const updatedTicket = await markTicketRead(ticket.ticketNumber);
      if (!updatedTicket) return;
      setTickets((currentTickets) =>
        currentTickets.map((item) =>
          item.ticketNumber === updatedTicket.ticketNumber ? updatedTicket : item
        )
      );
      setSelectedTicket(updatedTicket);
    } catch (error) {
      console.error("Failed to mark support ticket as read:", error);
    }
  };
  return (
    <div className="support-page">
      <aside className="support-sidebar">
        <div className="support-brand">
          <img src={EdutechLogo} alt="EdutechEX" />
          <button type="button" className="support-menu-btn" aria-label="Menu">
            <span />
            <span />
            <span />
          </button>
        </div>

        <div className="support-ticket-panel">
          <h2>My Tickets</h2>
          <p>Sorted by latest activity</p>

          <label className="support-search">
            <FaSearch />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tickets..."
            />
          </label>

          <button type="button" className="support-filter-btn" aria-label="Filter tickets">
            <FaFilter />
          </button>

          <div className="support-filters">
            {[
              ["all", `All (${counts.all})`],
              ["open", `Open (${counts.open})`],
              ["unread", `Unread (${counts.unread})`],
              ["resolved", `Resolved (${counts.resolved})`],
            ].map(([key, label]) => (
              <button
                type="button"
                key={key}
                className={activeFilter === key ? "active" : ""}
                onClick={() => setActiveFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="support-ticket-list">
            {filteredTickets.map((ticket) => (
              <article
                className={`support-ticket-card ${statusClass(ticket.status)} ${selectedTicket?.ticketNumber === ticket.ticketNumber ? "active" : ""}`}
                key={ticket.id || ticket.ticketNumber}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectTicket(ticket)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") handleSelectTicket(ticket);
                }}
              >
                <div className="support-ticket-icon">{categoryIcon(ticket.category)}</div>
                <div className="support-ticket-copy">
                  <span>{ticket.id || ticket.ticketNumber}{ticket.unreadForStudent ? " - New reply" : ""}</span>
                  <strong>{ticket.subject}</strong>
                  <p>{ticket.latestResponse?.message ? `Partner: ${ticket.latestResponse.message}` : ticket.description}</p>
                </div>
                <div className="support-ticket-meta">
                  <span className={`support-status ${statusClass(ticket.status)}`}>{ticket.status}</span>
                  <time>{timeAgo(ticket.updatedAt)}</time>
                </div>
              </article>
            ))}
          </div>
        </div>
      </aside>

      <main className="support-main">
        <header className="support-topbar">
          <button type="button" className="support-back-btn" onClick={() => window.close() || navigate(-1)}>
            <FaArrowLeft /> Back
          </button>
          <h1>Support Center</h1>
          <div className="support-user">
            <button type="button" className="support-bell" aria-label="Notifications">
              <FaBell />
              <span>3</span>
            </button>
            <div className="support-avatar">{getInitials(context.studentName)}</div>
            <div>
              <strong>{context.studentName}</strong>
              <span>{context.studentId}</span>
            </div>
            <FaChevronDown />
          </div>
        </header>

        <section className="support-card">
          <div className="support-hero">
            <div className="support-hero-copy">
              <div className="support-hero-title">
                <span className="support-headset"><FaHeadset /></span>
                <div>
                  <h2>Need Help?</h2>
                  <p>{loadingContext ? "Detecting your current application details..." : "Having trouble completing your application? Our support team is here to help."}</p>
                </div>
              </div>

              <div className="support-details">
                <h3>Your Current Application Details <span>(Auto-detected)</span></h3>
                <div className="support-details-grid">
                  {appDetails.map((item) => (
                    <div className="support-detail-item" key={item.label}>
                      <span>{item.icon}</span>
                      <div>
                        <p>{item.label}</p>
                        <strong>{item.value}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="support-illustration">
              <img src={supportImage} alt="Support assistant" />
            </div>
          </div>

          <div className="support-view-actions">
            <button type="button" className="support-new-ticket-btn" onClick={() => setSelectedTicket(null)}>
              <FaPaperPlane /> Create New Ticket
            </button>
          </div>

          {!selectedTicket && (
          <form className="support-form" onSubmit={handleSubmit}>
            <div className="support-mode-group" role="radiogroup" aria-label="Ticket type">
              <button
                type="button"
                className={`support-mode-card ${ticketMode === "currentPage" ? "active" : ""}`}
                onClick={() => setTicketMode("currentPage")}
                aria-pressed={ticketMode === "currentPage"}
              >
                <strong>Current Page Issue</strong>
                <span>{context.currentSection || context.sourceTitle || "Current page"}</span>
              </button>
              <button
                type="button"
                className={`support-mode-card ${ticketMode === "otherQuery" ? "active" : ""}`}
                onClick={() => setTicketMode("otherQuery")}
                aria-pressed={ticketMode === "otherQuery"}
              >
                <strong>Other Query</strong>
                <span>Choose a different application section</span>
              </button>
            </div>

            {ticketMode === "otherQuery" && (
              <div className="support-reported-section">
                <label>
                  <span>Reported Section <b>*</b></span>
                  <SupportSectionSelect
                    value={reportedSection}
                    options={REPORT_SECTION_OPTIONS}
                    onChange={setReportedSection}
                  />
                </label>
              </div>
            )}

            <div className="support-form-grid">
              <label>
                <span>Issue Category <b>*</b></span>
                <input type="text" value={selectedIssueContext.category} readOnly />
              </label>

              <label>
                <span>Issue Type <b>*</b></span>
                <input type="text" value={selectedIssueContext.issueType} readOnly />
              </label>

              <label>
                <span>Priority <b>*</b></span>
                <input type="text" value={selectedIssueContext.priority} readOnly />
              </label>
            </div>

            <div className="support-form-body">
              <div className="support-issue-fields">
                <label>
                  <span>Subject <b>*</b></span>
                  <input type="text" value={subject} readOnly />
                </label>

                <label>
                  <span>Describe Your Issue <b>*</b></span>
                  <textarea
                    value={description}
                    onChange={(event) => {
                      setDescription(event.target.value);
                      if (submitError) setSubmitError("");
                    }}
                    placeholder={descriptionPlaceholder}
                    required
                  />
                </label>
              </div>

              <label className="support-upload">
                <span>Upload Screenshot <em>(Optional)</em></span>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setScreenshotFile(file);
                    setScreenshotName(file?.name || "");
                  }}
                />
                <div>
                  <FaCloudUploadAlt />
                  <strong>{screenshotName || "Drag & drop your file here"}</strong>
                  <p>or click to upload</p>
                  <small>PNG, JPG, JPEG, PDF (Max. 5MB)</small>
                </div>
              </label>
            </div>

            <div className="support-info-line">
              <FaInfoCircle />
              <span>This ticket will be automatically allocated to the support partner.</span>
            </div>

            {successTicket && (
              <div className="support-success">
                <FaCheck />
                <span>Ticket {(successTicket.id || successTicket.ticketNumber)} submitted successfully.</span>
              </div>
            )}

            {submitError && (
              <div className="support-error">
                <FaInfoCircle />
                <span>{submitError}</span>
              </div>
            )}

            <footer className="support-actions">
              <button type="button" className="support-cancel" onClick={() => window.close() || navigate(-1)}>
                <FaTimes /> Cancel
              </button>
              <button type="submit" className="support-submit" disabled={submitting || !description.trim()}>
                <FaPaperPlane /> {submitting ? "Submitting..." : "Submit Support Ticket"}
              </button>
            </footer>
          </form>
          )}
          {selectedTicket && (
            <section className="support-ticket-detail" aria-label="Selected support ticket details">
              <div className="support-detail-header">
                <div>
                  <span>{selectedTicket.ticketNumber}</span>
                  <h2>{selectedTicket.subject}</h2>
                  <p>{selectedTicket.description}</p>
                </div>
                <div className="support-detail-actions">
                  <span className={`support-status ${statusClass(selectedTicket.status)}`}>{selectedTicket.status}</span>
                  <button type="button" className="support-new-ticket-btn compact" onClick={() => setSelectedTicket(null)}>
                    Create New Ticket
                  </button>
                </div>
              </div>

              <div className="support-detail-meta">
                <div><span>Category</span><strong>{selectedTicket.category || "Support"}</strong></div>
                <div><span>Section</span><strong>{selectedTicket.reportedSection || selectedTicket.currentSection || selectedTicket.sourceTitle || "Application"}</strong></div>
                <div><span>Last Activity</span><strong>{timeAgo(selectedTicket.updatedAt) || "Just now"}</strong></div>
              </div>

              {(selectedTicket.screenshotUrl || selectedTicket.screenshotName) && (
                <div className="support-attachment">
                  <div>
                    <strong>{selectedTicket.screenshotName || "Uploaded file"}</strong>
                    <span>{selectedTicket.screenshotMimeType || "Attachment"}{formatFileSize(selectedTicket.screenshotSize) ? ` - ${formatFileSize(selectedTicket.screenshotSize)}` : ""}</span>
                    {selectedTicket.screenshotUrl && (
                      <a href={selectedTicket.screenshotUrl} target="_blank" rel="noopener noreferrer">
                        View uploaded file
                      </a>
                    )}
                  </div>
                  {selectedTicket.screenshotUrl && isImageAttachment(selectedTicket) && (
                    <a href={selectedTicket.screenshotUrl} target="_blank" rel="noopener noreferrer" className="support-attachment-thumb">
                      <img src={selectedTicket.screenshotUrl} alt={selectedTicket.screenshotName || "Uploaded screenshot"} />
                    </a>
                  )}
                </div>
              )}

              <div className="support-conversation">
                <h3>Activity</h3>
                {(selectedTicket.activity || []).length ? (
                  (selectedTicket.activity || []).map((item, index) => (
                    <div className={`support-message ${item.actorRole || "system"}`} key={`${item.createdAt || index}-${index}`}>
                      <div>
                        <strong>{actorLabel(item.actorRole)}</strong>
                        <time>{timeAgo(item.createdAt)}</time>
                      </div>
                      <p>{item.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="support-empty-activity">No activity yet.</p>
                )}
              </div>
            </section>
          )}
        </section>

      </main>
    </div>
  );
};

export default SupportHelpBot;

