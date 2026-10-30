import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../../config/api";
import "./ProcessAdminSupportTickets.css";

const getProcessAdminToken = () => localStorage.getItem("processAdminToken");

const IcoMail = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const IcoRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const formatTicketDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const SUPPORT_STATUS_OPTIONS = ["In Progress", "Resolved", "Closed", "Open"];
const getAxiosErrorMessage = (error, fallback = "Failed to load support tickets. Please try again.") => {
  const status = error?.response?.status;
  const apiMessage = error?.response?.data?.message;
  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 404) return "Support ticket API route was not found. Please restart the backend server.";
  if (status === 403) return "You do not have permission to view support tickets.";
  if (status === 500 && apiMessage) return apiMessage;
  if (apiMessage) return apiMessage;
  if (error?.code === "ERR_NETWORK") return "Cannot reach the backend server. Please check that it is running.";
  return fallback;
};

const SupportStatusSelect = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);
  const listboxId = "process-support-status-listbox";
  const selectedStatus = SUPPORT_STATUS_OPTIONS.includes(value) ? value : "In Progress";

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

  const handleSelect = (nextStatus) => {
    onChange(nextStatus);
    setIsOpen(false);
  };

  return (
    <div ref={selectRef} className={`pad-support-status-select${isOpen ? " is-open" : ""}`}>
      <button
        type="button"
        className="pad-support-status-trigger"
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
        <span>{selectedStatus}</span>
        <span aria-hidden="true">?</span>
      </button>

      {isOpen && (
        <div className="pad-support-status-menu" id={listboxId} role="listbox">
          {SUPPORT_STATUS_OPTIONS.map((status) => (
            <button
              type="button"
              key={status}
              className={`pad-support-status-option${status === selectedStatus ? " is-selected" : ""}`}
              role="option"
              aria-selected={status === selectedStatus}
              onClick={() => handleSelect(status)}
            >
              {status}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
const statusClass = (status = "") => String(status || "").toLowerCase().replace(/\s+/g, "-");

const actorLabel = (role = "") => {
  if (role === "student") return "Student";
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

const ProcessAdminSupportTickets = () => {
  const navigate = useNavigate();
  const [supportTickets, setSupportTickets] = useState([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportError, setSupportError] = useState(null);
  const [supportFilter, setSupportFilter] = useState("all");
  const [selectedSupportTicket, setSelectedSupportTicket] = useState(null);
  const [supportReply, setSupportReply] = useState("");
  const [supportReplyStatus, setSupportReplyStatus] = useState("In Progress");
  const [supportSending, setSupportSending] = useState(false);

  const fetchSupportTickets = useCallback(async () => {
    const token = getProcessAdminToken();
    if (!token) {
      navigate("/process-admin-login");
      return;
    }

    setSupportLoading(true);
    setSupportError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/support-process/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tickets = response.data?.tickets || [];
      setSupportTickets(tickets);
      setSelectedSupportTicket((current) => {
        if (!current) return tickets[0] || null;
        return tickets.find((ticket) => ticket.ticketNumber === current.ticketNumber) || tickets[0] || null;
      });
    } catch (error) {
      console.warn("Support tickets fetch failed:", error?.response?.status || error?.code || error?.message);
      if (error.response?.status === 401) {
        localStorage.removeItem("processAdminToken");
        localStorage.removeItem("processAdminData");
        navigate("/process-admin-login");
      } else {
        setSupportError(getAxiosErrorMessage(error));
      }
    } finally {
      setSupportLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchSupportTickets();
  }, [fetchSupportTickets]);

  const visibleTickets = useMemo(() => supportTickets.filter((ticket) => {
    if (supportFilter === "open") return ticket.status === "Open" || ticket.status === "In Progress";
    if (supportFilter === "resolved") return ticket.status === "Resolved" || ticket.status === "Closed";
    if (supportFilter === "unread") return ticket.unreadForPartner;
    return true;
  }), [supportFilter, supportTickets]);

  const activeTicket = selectedSupportTicket || visibleTickets[0] || supportTickets[0] || null;
  const openCount = supportTickets.filter((ticket) => ticket.status === "Open" || ticket.status === "In Progress").length;
  const unreadCount = supportTickets.filter((ticket) => ticket.unreadForPartner).length;

  const handleSelectSupportTicket = (ticket) => {
    setSelectedSupportTicket(ticket);
    setSupportReply("");
    setSupportReplyStatus(ticket.status === "Resolved" || ticket.status === "Closed" ? ticket.status : "In Progress");
  };

  const handleSendSupportReply = async () => {
    if (!activeTicket || !supportReply.trim()) return;
    const token = getProcessAdminToken();
    if (!token) {
      navigate("/process-admin-login");
      return;
    }

    setSupportSending(true);
    setSupportError(null);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/support-process/tickets/${activeTicket.ticketNumber}/replies`,
        { message: supportReply.trim(), status: supportReplyStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedTicket = response.data?.ticket;
      if (updatedTicket) {
        setSupportTickets((current) => current.map((ticket) =>
          ticket.ticketNumber === updatedTicket.ticketNumber ? updatedTicket : ticket
        ));
        setSelectedSupportTicket(updatedTicket);
      }
      setSupportReply("");
    } catch (error) {
      console.warn("Support reply failed:", error?.response?.status || error?.code || error?.message);
      setSupportError(getAxiosErrorMessage(error, "Failed to send reply. Please try again."));
    } finally {
      setSupportSending(false);
    }
  };

  return (
    <div className="pad-support-page">
      <div className="pad-support-header">
        <div>
          <span className="pad-support-kicker">Partner Helpdesk</span>
          <h2>Student Support Tickets</h2>
          <p>Review student queries, track the source page, and reply back to the student.</p>
        </div>
        <button className="pad-support-refresh" onClick={fetchSupportTickets} disabled={supportLoading}>
          <IcoRefresh /> {supportLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {supportError && <div className="pad-support-error">{supportError}</div>}

      <div className="pad-support-stats">
        <div><strong>{supportTickets.length}</strong><span>Total Tickets</span></div>
        <div><strong>{openCount}</strong><span>Open / In Progress</span></div>
        <div><strong>{unreadCount}</strong><span>Unread</span></div>
      </div>

      <div className="pad-support-filters">
        {[
          ["all", "All"],
          ["open", "Open"],
          ["unread", "Unread"],
          ["resolved", "Resolved"],
        ].map(([key, label]) => (
          <button key={key} className={supportFilter === key ? "active" : ""} onClick={() => setSupportFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      <div className="pad-support-layout">
        <div className="pad-support-list">
          {supportLoading ? (
            <div className="pad-support-empty">Loading support tickets...</div>
          ) : visibleTickets.length === 0 ? (
            <div className="pad-support-empty">No tickets found.</div>
          ) : visibleTickets.map((ticket) => (
            <button
              type="button"
              key={ticket.ticketNumber}
              className={`pad-support-ticket ${activeTicket?.ticketNumber === ticket.ticketNumber ? "active" : ""}`}
              onClick={() => handleSelectSupportTicket(ticket)}
            >
              <div className="pad-support-ticket-top">
                <strong>{ticket.ticketNumber}{ticket.unreadForPartner ? " - New" : ""}</strong>
                <span className={`pad-support-status ${statusClass(ticket.status)}`}>{ticket.status}</span>
              </div>
              <h3>{ticket.subject}</h3>
              <p>{ticket.studentName} - {ticket.category}</p>
              <small>{formatTicketDate(ticket.updatedAt)}</small>
              {(ticket.hasAttachment || ticket.screenshotUrl || ticket.screenshotName || ticket.screenshotKey) && (
                <span className={`pad-support-attachment-chip ${ticket.attachmentAvailable || ticket.screenshotUrl ? "available" : "missing"}`}>
                  {ticket.attachmentAvailable || ticket.screenshotUrl ? "Attachment" : "Attachment missing URL"}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="pad-support-detail">
          {!activeTicket ? (
            <div className="pad-support-empty">Select a ticket to view details.</div>
          ) : (
            <>
              <div className="pad-support-detail-head">
                <div>
                  <span>{activeTicket.ticketNumber}</span>
                  <h2>{activeTicket.subject}</h2>
                  <p>{activeTicket.studentName} ({activeTicket.studentId || "No student ID"})</p>
                </div>
                <span className={`pad-support-status large ${statusClass(activeTicket.status)}`}>{activeTicket.status}</span>
              </div>

              <div className="pad-support-meta-grid">
                <div><span>Email</span><strong>{activeTicket.studentEmail || "-"}</strong></div>
                <div><span>Current Page</span><strong>{activeTicket.currentSection || activeTicket.sourceTitle || "-"}</strong></div>
                <div><span>Reported Section</span><strong>{activeTicket.reportedSection || activeTicket.category || "-"}</strong></div>
                <div><span>Priority</span><strong>{activeTicket.priority || "-"}</strong></div>
                <div><span>Study Level</span><strong>{activeTicket.studyLevel || "-"}</strong></div>
                <div><span>Progress</span><strong>{Number(activeTicket.currentProgress || 0)}%</strong></div>
              </div>

              <div className="pad-support-message-block">
                <span>Student Description</span>
                <p>{activeTicket.description}</p>
              </div>

              {(activeTicket.hasAttachment || activeTicket.screenshotUrl || activeTicket.screenshotName || activeTicket.screenshotKey) && (
                <div className={`pad-support-attachment ${activeTicket.screenshotUrl ? "available" : "missing"}`}>
                  <div>
                    <span>Uploaded File</span>
                    <strong>{activeTicket.screenshotName || activeTicket.screenshotKey || "Attachment"}</strong>
                    <p>
                      {activeTicket.screenshotMimeType || "Attachment"}
                      {formatFileSize(activeTicket.screenshotSize) ? ` - ${formatFileSize(activeTicket.screenshotSize)}` : ""}
                    </p>
                    {activeTicket.screenshotKey && <small>S3 key: {activeTicket.screenshotKey}</small>}
                    {activeTicket.screenshotUrl ? (
                      <a href={activeTicket.screenshotUrl} target="_blank" rel="noopener noreferrer">View uploaded file</a>
                    ) : (
                      <em>{activeTicket.attachmentMissingReason || "Uploaded file URL is missing. Ask the student to re-upload the file."}</em>
                    )}
                  </div>
                  {activeTicket.screenshotUrl && isImageAttachment(activeTicket) && (
                    <a className="pad-support-attachment-thumb" href={activeTicket.screenshotUrl} target="_blank" rel="noopener noreferrer">
                      <img src={activeTicket.screenshotUrl} alt={activeTicket.screenshotName || "Uploaded screenshot"} />
                    </a>
                  )}
                </div>
              )}

              <div className="pad-support-timeline">
                <h3>Conversation</h3>
                {(activeTicket.activity || []).length ? (
                  (activeTicket.activity || []).map((item, index) => (
                    <div className={`pad-support-activity ${item.actorRole || "system"}`} key={`${item.createdAt || index}-${index}`}>
                      <strong>{actorLabel(item.actorRole)}</strong>
                      <p>{item.message}</p>
                      <time>{formatTicketDate(item.createdAt)}</time>
                    </div>
                  ))
                ) : (
                  <div className="pad-support-empty">No conversation activity yet.</div>
                )}
              </div>

              <div className="pad-support-reply-box">
                <div className="pad-support-reply-row">
                  <label>
                    <span>Status after reply</span>
                    <SupportStatusSelect value={supportReplyStatus} onChange={setSupportReplyStatus} />
                  </label>
                </div>
                <textarea
                  value={supportReply}
                  onChange={(event) => setSupportReply(event.target.value)}
                  placeholder="Type reply for the student..."
                />
                <button className="pad-support-send" disabled={supportSending || !supportReply.trim()} onClick={handleSendSupportReply}>
                  <IcoMail /> {supportSending ? "Sending..." : "Send Reply to Student"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcessAdminSupportTickets;
