import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
import "./adminuser.css";
import EdutechLogo from "../../assets/Edutech-logo.svg";

// ── Constants outside component (never recreated) ─────────────────────────
import API_BASE_URL from "../../config/api";

const ADMIN_API = `${API_BASE_URL}/api/admin/users`;
const PA_API    = `${API_BASE_URL}/api/process-admin`;
const MEDICAL_API = `${API_BASE_URL}/api/admin/users/medical-users`;
const USERS_PAGE_LIMIT = 10;
const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderator" },
];

const STATUS_MAP = {
  active:    "status-active",
  inactive:  "status-inactive",
  pending:   "status-pending",
  suspended: "status-suspended",
  rejected:  "status-rejected",
};

const PA_FILTERS = [
  { key: "pending_approval", label: "Pending"  },
  { key: "active",           label: "Approved" },
  { key: "rejected",         label: "Rejected" },
  { key: "all",              label: "All"       },
];

const UserFilterDropdown = ({ label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [menuMaxHeight, setMenuMaxHeight] = useState(220);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setIsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("touchstart", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("touchstart", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const menuHeight = Math.min(220, options.length * 42 + 10, window.innerHeight * 0.4);
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldOpenUp = spaceBelow < menuHeight && rect.top > spaceBelow;
      setOpenUp(shouldOpenUp);
      setMenuMaxHeight(Math.max(80, Math.min(menuHeight, (shouldOpenUp ? rect.top : spaceBelow) - 12)));
    }
    setIsOpen(open => !open);
  };

  const selectedOption = options.find(option => option.value === value);

  return (
    <div className={`filter-select-wrap ${isOpen ? "open" : ""}`} ref={dropdownRef}>
      <button
        type="button"
        className="filter-select-trigger"
        onClick={toggleDropdown}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedOption?.label || options[0]?.label}</span>
        <span className="filter-select-arrow" aria-hidden="true" />
      </button>
      {isOpen && (
        <div className={`filter-select-menu ${openUp ? "opens-up" : ""}`} role="listbox" aria-label={label} style={{ maxHeight: `${menuMaxHeight}px` }}>
          {options.map(option => (
            <button
              type="button"
              key={option.value}
              role="option"
              aria-selected={value === option.value}
              className={`filter-select-option ${value === option.value ? "active" : ""}`}
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

// ── SVG Icons as constants (never recreated on render) ────────────────────
const IconRefresh = memo(() => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.45"/>
  </svg>
));
const IconCheck = memo(() => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
));
const IconX = memo(() => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
));
const IconMinus = memo(() => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
));
const IconPlus = memo(() => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
));
const IconTrash = memo(() => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
  </svg>
));
const IconSearch = memo(() => (
  <svg className="search-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
));

// ── Utility functions outside component ───────────────────────────────────
const formatDate = (raw) => {
  if (!raw || raw === "Never") return "Never";
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch { return raw; }
};

const formatDateTime = (raw) => {
  if (!raw || raw === "Never") return "Never";
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return formatDate(raw) + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } catch { return raw; }
};

const getStatusBadgeClass = (status) =>
  STATUS_MAP[(status || "").toLowerCase()] || "status-inactive";

const getStatusDisplay = (status) =>
  status ? status.charAt(0).toUpperCase() + status.slice(1) : "—";

const needsApproval = (user) =>
  user.status === "inactive" || user.status === "pending" ||
  (user.role.toLowerCase() === "student" && user.isApprovedByAdmin !== true);

const transformUser = (user) => {
  const name = (user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown").trim();
  const role  = (user.role || "User").trim();
  const rawStatus = user.status || "inactive";
  const isApprovedByAdmin = user.isApprovedByAdmin === true;
  const status = role.toLowerCase() === "student" && !isApprovedByAdmin && rawStatus !== "suspended"
    ? "pending"
    : rawStatus;
  return {
    id:          user._id || user.id,
    name,
    email:       user.email || "unknown@example.com",
    role:        role.charAt(0).toUpperCase() + role.slice(1),
    status,
    lastLogin:   user.lastLogin || user.formattedLastLogin ? formatDateTime(user.lastLogin || user.formattedLastLogin) : "Never",
    joinDate:    user.joinDate  || user.formattedJoinDate  || user.createdAt ? formatDate(user.joinDate || user.formattedJoinDate || user.createdAt) : "N/A",
    avatar:      user.avatar || (name[0] ? name[0].toUpperCase() : "?"),
    otpVerified: user.otpVerified || user.isVerified || false,
    isApprovedByAdmin,
    signupDate:  user.createdAt || new Date().toISOString(),
  };
};

// ── Memoized sub-components ───────────────────────────────────────────────
const StatusBadge = memo(({ status, label }) => (
  <span className={`status-badge ${getStatusBadgeClass(status)}`}>
    {label || getStatusDisplay(status)}
  </span>
));

const UserAvatar = memo(({ char }) => (
  <div className="user-avatar">{char}</div>
));

const RejectModal = memo(({ onConfirm, onCancel, reason, setReason }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
    <div style={{ background:"#fff", borderRadius:12, padding:"28px 32px", width:400, maxWidth:"90vw", boxShadow:"0 8px 32px rgba(0,0,0,0.15)" }}>
      <h3 style={{ margin:"0 0 8px", fontSize:16, fontWeight:600 }}>Reject application</h3>
      <p style={{ margin:"0 0 14px", fontSize:13, color:"#64748b" }}>
        This reason will be included in the rejection email sent to the applicant.
      </p>
      <textarea
        rows={3}
        placeholder="e.g. Incomplete information provided…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        style={{ width:"100%", boxSizing:"border-box", fontSize:13, padding:"8px 10px", borderRadius:6, border:"1px solid #e2e8f0", resize:"vertical", fontFamily:"inherit" }}
      />
      <div style={{ display:"flex", gap:10, marginTop:16, justifyContent:"flex-end" }}>
        <button className="seed-users-btn" onClick={onCancel}>Cancel</button>
        <button className="btn-reject" onClick={onConfirm}>Confirm Reject</button>
      </div>
    </div>
  </div>
));

const SeedResultModal = memo(({ result, onClose }) => {
  if (!result) return null;
  return (
    <div
      role="presentation"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1100, display: "grid", placeItems: "center", padding: 20, background: "rgba(15, 23, 42, .48)" }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="seed-result-title"
        style={{ width: "min(540px, 100%)", padding: 24, borderRadius: 14, background: "#fff", boxShadow: "0 20px 60px rgba(15, 23, 42, .25)" }}
      >
        <h2 id="seed-result-title" style={{ margin: "0 0 8px", color: "#0f172a", fontSize: 20 }}>
          {result.count ? "Sample account created" : "Sample account ready"}
        </h2>
        <p style={{ margin: "0 0 16px", color: "#475569", lineHeight: 1.5 }}>
          {result.count
            ? "One student account was added. Its name and email will prefill the application. Use the sign-in credentials below."
            : "The sample student account already existed, so its password was reset. Use the sign-in credentials below."}
        </p>
        {result.credentials?.length > 0 && (
          <ul style={{ display: "grid", gap: 10, margin: "0 0 20px", padding: 14, borderRadius: 9, background: "#f8fafc", listStyle: "none", overflowWrap: "anywhere" }}>
            {result.credentials.map(({ email, password }) => (
              <li key={email} style={{ display: "grid", gap: 3, color: "#334155", fontSize: 13 }}>
                <strong>{email}</strong>
                <code style={{ color: "#0f766e" }}>{password}</code>
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="refresh-btn" onClick={onClose}>Done</button>
        </div>
      </section>
    </div>
  );
});

const CreateStudentModal = memo(({ open, loading, error, onClose, onSubmit }) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  useEffect(() => {
    if (open) {
      setFirstName("");
      setLastName("");
      setEmail("");
    }
  }, [open]);
  if (!open) return null;
  const inputStyle = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, font: "inherit" };
  return (
    <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 1200, display: "grid", placeItems: "center", padding: 20, background: "rgba(15, 23, 42, .5)" }}>
      <form role="dialog" aria-modal="true" aria-labelledby="create-student-title" onSubmit={(event) => { event.preventDefault(); onSubmit({ firstName, lastName, email }); }} style={{ width: "min(460px, 100%)", padding: 24, borderRadius: 14, background: "#fff", boxShadow: "0 20px 60px rgba(15, 23, 42, .25)" }}>
        <h2 id="create-student-title" style={{ margin: "0 0 8px", color: "#0f172a", fontSize: 20 }}>Create student account</h2>
        <p style={{ margin: "0 0 18px", color: "#64748b", lineHeight: 1.5 }}>Enter the student’s details. A sign-in password will be generated after the account is created.</p>
        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6, color: "#334155", fontSize: 13, fontWeight: 600 }}>First name<input required autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} style={inputStyle} /></label>
          <label style={{ display: "grid", gap: 6, color: "#334155", fontSize: 13, fontWeight: 600 }}>Last name<input required autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} style={inputStyle} /></label>
          <label style={{ display: "grid", gap: 6, color: "#334155", fontSize: 13, fontWeight: 600 }}>Student email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} style={inputStyle} /></label>
        </div>
        {error && <p role="alert" style={{ margin: "12px 0 0", color: "#b91c1c", fontSize: 13 }}>{error}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button type="button" className="seed-users-btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" className="refresh-btn" disabled={loading}>{loading ? "Creating…" : "Create account"}</button>
        </div>
      </form>
    </div>
  );
});

const NotificationModal = memo(({ popup, onClose }) => {
  if (!popup) return null;
  const isSuccess = popup.type !== "error";
  return (
    <div
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1300,
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: "min(420px, 100%)",
          padding: "32px 28px 24px",
          borderRadius: 18,
          background: "#ffffff",
          boxShadow: "0 24px 60px -12px rgba(15, 23, 42, 0.25)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <img src={EdutechLogo} alt="EDUTECHEX" style={{ height: 28, objectFit: "contain", marginBottom: 20 }} />
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: isSuccess ? "#ecfdf5" : "#fef2f2",
            border: `2px solid ${isSuccess ? "#a7f3d0" : "#fecaca"}`,
            display: "grid",
            placeItems: "center",
            marginBottom: 18,
          }}
        >
          {isSuccess ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          )}
        </div>

        <h3 style={{ margin: "0 0 8px", color: "#0f172a", fontSize: 20, fontWeight: 700 }}>
          {popup.title || (isSuccess ? "Success!" : "Notice")}
        </h3>

        <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: 14, lineHeight: 1.6, maxWidth: 360 }}>
          {popup.message}
        </p>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            padding: "12px 20px",
            borderRadius: 10,
            border: "none",
            background: isSuccess ? "#0d9488" : "#0f172a",
            color: "#ffffff",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: isSuccess ? "0 4px 12px rgba(13, 148, 136, 0.25)" : "none",
          }}
        >
          {popup.buttonText || "Got it"}
        </button>
      </div>
    </div>
  );
});

const StudentCredentialsModal = memo(({ credentials, onClose }) => {
  if (!credentials) return null;
  return (
    <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 1201, display: "grid", placeItems: "center", padding: 20, background: "rgba(15, 23, 42, .5)" }}>
      <section role="dialog" aria-modal="true" aria-labelledby="student-credentials-title" style={{ width: "min(500px, 100%)", padding: 24, borderRadius: 14, background: "#fff", boxShadow: "0 20px 60px rgba(15, 23, 42, .25)" }}>
        <h2 id="student-credentials-title" style={{ margin: "0 0 8px", color: "#0f172a", fontSize: 20 }}>Student account created</h2>
        <p style={{ margin: "0 0 16px", color: "#475569", lineHeight: 1.5 }}>Share these sign-in credentials with the student. The generated password is shown only now.</p>
        <div style={{ display: "grid", gap: 8, padding: 14, borderRadius: 9, background: "#f8fafc", overflowWrap: "anywhere" }}>
          <strong>{credentials.email}</strong><code style={{ color: "#0f766e" }}>{credentials.password}</code>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}><button type="button" className="refresh-btn" onClick={onClose}>Done</button></div>
      </section>
    </div>
  );
});

const DeleteUserModal = memo(({ userName, loading, onCancel, onConfirm }) => {
  if (!userName) return null;
  return (
    <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onCancel(); }} style={{ position: "fixed", inset: 0, zIndex: 1301, display: "grid", placeItems: "center", padding: 20, background: "rgba(15, 23, 42, .5)" }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="delete-user-title" aria-describedby="delete-user-description" style={{ width: "min(440px, 100%)", padding: 24, borderRadius: 16, background: "#fff", boxShadow: "0 24px 60px rgba(15, 23, 42, .25)" }}>
        <h2 id="delete-user-title" style={{ margin: "0 0 8px", color: "#0f172a", fontSize: 20 }}>Delete user?</h2>
        <p id="delete-user-description" style={{ margin: "0 0 20px", color: "#64748b", lineHeight: 1.5 }}>Are you sure you want to permanently delete <strong style={{ color: "#334155" }}>{userName}</strong>? This action cannot be undone.</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" className="seed-users-btn" onClick={onCancel} disabled={loading}>Cancel</button>
          <button type="button" className="btn-delete" onClick={onConfirm} disabled={loading} style={{ padding: "9px 14px", opacity: loading ? .7 : 1 }}>{loading ? "Deleting..." : "Delete user"}</button>
        </div>
      </section>
    </div>
  );
});

const ActionConfirmModal = memo(({ confirmation, loading, onCancel, onConfirm }) => {
  if (!confirmation) return null;
  return (
    <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onCancel(); }} style={{ position: "fixed", inset: 0, zIndex: 1301, display: "grid", placeItems: "center", padding: 20, background: "rgba(15, 23, 42, .5)" }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="action-confirm-title" style={{ width: "min(440px, 100%)", padding: 24, borderRadius: 16, background: "#fff", boxShadow: "0 24px 60px rgba(15, 23, 42, .25)" }}>
        <h2 id="action-confirm-title" style={{ margin: "0 0 8px", color: "#0f172a", fontSize: 20 }}>{confirmation.title}</h2>
        <p style={{ margin: "0 0 20px", color: "#64748b", lineHeight: 1.5 }}>{confirmation.message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" className="seed-users-btn" onClick={onCancel} disabled={loading}>Cancel</button>
          <button type="button" className={confirmation.danger ? "btn-delete" : "refresh-btn"} onClick={onConfirm} disabled={loading} style={{ padding: "9px 14px", opacity: loading ? .7 : 1 }}>{loading ? "Please wait..." : confirmation.confirmLabel || "Continue"}</button>
        </div>
      </section>
    </div>
  );
});

const LoadingSpinner = memo(() => (
  <div className="loading-container">
    <div className="loading-spinner" />
    <p>Loading…</p>
  </div>
));

// ── User row (desktop) ────────────────────────────────────────────────────
const UserRow = memo(({ user, onApprove, onReject, onUpdate, onDelete }) => (
  <tr className={user.status === "inactive" ? "user-inactive" : ""}>
    <td>
      <div className="user-info">
        <UserAvatar char={user.avatar} />
        <div className="user-details">
          <div className="user-name">{user.name}</div>
          <div className="user-email">{user.email}</div>
          {user.status === "inactive" && !user.otpVerified && (
            <div className="user-note">⚠ OTP not verified</div>
          )}
        </div>
      </div>
    </td>
    <td><span className="role-value">{user.role}</span></td>
    <td><StatusBadge status={user.status} /></td>
    <td className="last-login">{user.lastLogin}</td>
    <td className="join-date">{user.joinDate}</td>
    <td>
      <div className="action-buttons">
        {needsApproval(user) ? (
          <>
            <button className="btn-approve" onClick={() => onApprove(user.id)} title="Approve">
              <IconCheck /> Approve
            </button>
            <button className="btn-reject" onClick={() => onReject(user.id)} title="Reject">
              <IconX /> Reject
            </button>
          </>
        ) : (
          <button
            className={user.status === "active" ? "btn-deactivate" : "btn-activate"}
            onClick={() => onUpdate(user.id, "status", user.status === "active" ? "inactive" : "active")}
          >
            {user.status === "active" ? <><IconMinus /> Deactivate</> : <><IconPlus /> Activate</>}
          </button>
        )}
        <button className="btn-delete" onClick={() => onDelete(user.id, user.name)} title="Delete" aria-label={`Delete ${user.name}`}>
          <IconTrash /> Delete
        </button>
      </div>
    </td>
  </tr>
));

// ── Mobile user card ──────────────────────────────────────────────────────
const MobileUserCard = memo(({ user, expanded, onToggle, onApprove, onReject, onUpdate, onDelete }) => (
  <div className={`mobile-user-card ${user.status === "inactive" ? "user-inactive" : ""} ${expanded ? "expanded" : ""}`}>
    <div className="mobile-card-top" onClick={() => onToggle(user.id)}>
      <div className="user-info">
        <UserAvatar char={user.avatar} />
        <div className="user-details">
          <div className="user-name">{user.name}</div>
          <div className="user-email">{user.email}</div>
        </div>
      </div>
      <div className="mobile-card-right">
        <StatusBadge status={user.status} />
        <span className="mobile-expand-icon">{expanded ? "▲" : "▼"}</span>
      </div>
    </div>
    {expanded && (
      <div className="mobile-card-body">
        {user.status === "inactive" && !user.otpVerified && (
          <div className="user-note mobile-note">⚠ OTP not verified</div>
        )}
        <div className="mobile-meta-row">
          <div className="mobile-meta-item">
            <span className="mobile-meta-label">Role</span>
            <span className="mobile-meta-value">{user.role}</span>
          </div>
          <div className="mobile-meta-item">
            <span className="mobile-meta-label">Last Login</span>
            <span className="mobile-meta-value">{user.lastLogin}</span>
          </div>
          <div className="mobile-meta-item">
            <span className="mobile-meta-label">Joined</span>
            <span className="mobile-meta-value">{user.joinDate}</span>
          </div>
        </div>
        <div className="mobile-actions">
          {needsApproval(user) ? (
            <>
              <button className="btn-approve" onClick={() => onApprove(user.id)}>✓ Approve</button>
              <button className="btn-reject"  onClick={() => onReject(user.id)}>✗ Reject</button>
              <button className="btn-delete"  onClick={() => onDelete(user.id, user.name)}>Delete</button>
            </>
          ) : (
            <>
              <button
                className={user.status === "active" ? "btn-deactivate" : "btn-activate"}
                onClick={() => onUpdate(user.id, "status", user.status === "active" ? "inactive" : "active")}
              >
                {user.status === "active" ? "Deactivate" : "Activate"}
              </button>
              <button className="btn-delete" onClick={() => onDelete(user.id, user.name)}>Delete</button>
            </>
          )}
        </div>
      </div>
    )}
  </div>
));

// ── Main component ────────────────────────────────────────────────────────
const AdminUserManagement = ({ globalSearchQuery = "" }) => {
  const [loading,             setLoading]             = useState(false);
  const [searchQuery,         setSearchQuery]         = useState(globalSearchQuery);
  const [debouncedSearch,     setDebouncedSearch]     = useState("");
  const [roleFilter,          setRoleFilter]          = useState("all");
  const [statusFilter,        setStatusFilter]        = useState("all");
  const [users,               setUsers]               = useState([]);
  const [currentPage,         setCurrentPage]         = useState(1);
  const [totalPages,          setTotalPages]          = useState(1);
  const [totalUsersCount,     setTotalUsersCount]     = useState(0);
  const [expandedRow,         setExpandedRow]         = useState(null);
  const [userStats,           setUserStats]           = useState({ totalUsers:0, activeUsers:0, adminUsers:0, inactiveUsers:0 });
  const [activeTab,           setActiveTab]           = useState("users");
  const [processAdmins,       setProcessAdmins]       = useState([]);
  const [processAdminFilter,  setProcessAdminFilter]  = useState("pending_approval");
  const [paLoading,           setPaLoading]           = useState(false);
  const [pendingPaCount,      setPendingPaCount]      = useState(0);
  const [rejectTarget,        setRejectTarget]        = useState(null);
  const [rejectReason,        setRejectReason]        = useState("");
  const [medicalUsers,        setMedicalUsers]        = useState([]);
  const [medicalLoading,      setMedicalLoading]      = useState(false);
  const [seedResult,          setSeedResult]          = useState(null);
  const [createStudentOpen,   setCreateStudentOpen]   = useState(false);
  const [creatingStudent,     setCreatingStudent]     = useState(false);
  const [createStudentError,  setCreateStudentError]  = useState("");
  const [studentCredentials,  setStudentCredentials]  = useState(null);
  const [popup, setPopup] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [actionConfirmation, setActionConfirmation] = useState(null);
  const [confirmationLoading, setConfirmationLoading] = useState(false);
  const confirmationActionRef = useRef(null);

  const showPopup = useCallback((message, title = "Success!", type = "success") => {
    setPopup({ message, title, type });
  }, []);
  const requestConfirmation = useCallback((confirmation, action) => {
    confirmationActionRef.current = action;
    setActionConfirmation(confirmation);
  }, []);
  const runConfirmedAction = useCallback(async () => {
    if (!confirmationActionRef.current || confirmationLoading) return;
    setConfirmationLoading(true);
    try {
      await confirmationActionRef.current();
    } finally {
      confirmationActionRef.current = null;
      setActionConfirmation(null);
      setConfirmationLoading(false);
    }
  }, [confirmationLoading]);
  const lastUsersQueryRef = useRef("");

  useEffect(() => {
    setSearchQuery(globalSearchQuery);
  }, [globalSearchQuery]);

  // ── Stable auth headers ───────────────────────────────────────────────
  const getAdminHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("adminToken") || ""}`,
  }), []);

  const usersQueryKey = useMemo(() =>
    JSON.stringify({
      page: currentPage,
      limit: USERS_PAGE_LIMIT,
      search: debouncedSearch,
      role: roleFilter,
      status: statusFilter,
    }),
  [currentPage, debouncedSearch, roleFilter, statusFilter]);

  // ── Filtered process admins via useMemo ───────────────────────────────
  const filteredProcessAdmins = useMemo(() =>
    processAdminFilter === "all"
      ? processAdmins
      : processAdmins.filter(pa => pa.status === processAdminFilter),
  [processAdmins, processAdminFilter]);

  // ── Load users ────────────────────────────────────────────────────────
  const loadUsersData = useCallback(async () => {
    const startedAt = Date.now();
    setLoading(true);
    try {
      lastUsersQueryRef.current = usersQueryKey;
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(USERS_PAGE_LIMIT),
        search: debouncedSearch,
        role: roleFilter,
        status: statusFilter,
      });
      const response = await fetch(`${ADMIN_API}?${params.toString()}`, { headers: getAdminHeaders() }); // ✅ ADMIN_API
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (!data.success) {
        setUsers([]);
        setUserStats({ totalUsers:0, activeUsers:0, adminUsers:0, inactiveUsers:0 });
        setTotalUsersCount(0);
        setTotalPages(1);
        return;
      }

      const transformed = (data.users || data.data || [])
        .map(transformUser)
        .slice(0, USERS_PAGE_LIMIT);
      const pagination = data.pagination || {};
      setUsers(transformed);
      setUserStats(data.stats || {
        totalUsers:    transformed.length,
        activeUsers:   transformed.filter(u => u.status === "active").length,
        adminUsers:    transformed.filter(u => u.role.toLowerCase() === "admin").length,
        inactiveUsers: transformed.filter(u => u.status === "inactive").length,
      });
      setTotalUsersCount(pagination.total ?? transformed.length);
      setTotalPages(Math.max(1, pagination.totalPages || pagination.pages || 1));
      lastUsersQueryRef.current = usersQueryKey;
    } catch (err) {
      console.error("Error loading users:", err);
      showPopup("Failed to fetch users.", "Unable to load users", "error");
    } finally {
      console.log(`Users loaded in ${((Date.now() - startedAt) / 1000).toFixed(2)}s`);
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, roleFilter, statusFilter, usersQueryKey, getAdminHeaders, showPopup]);

  const loadPendingProcessAdminCount = useCallback(async () => {
    try {
      const res = await fetch(`${PA_API}/pending-count`, { headers: getAdminHeaders() });
      const data = await res.json();
      if (data?.success) setPendingPaCount(data.count || 0);
    } catch (err) {
      console.error("Error loading pending process admin count:", err);
    }
  }, [getAdminHeaders]);

  // ── Load process admins ───────────────────────────────────────────────
  const loadProcessAdmins = useCallback(async () => {
    const startedAt = Date.now();
    setPaLoading(true);
    try {
      const res  = await fetch(`${PA_API}/all`, { headers: getAdminHeaders() });
      const data = await res.json();
      const list = data.success ? (data.data || []) : [];
      setProcessAdmins(list);
      setPendingPaCount(list.filter(pa => pa.status === "pending_approval").length);
    } catch (err) {
      console.error("Error loading process admins:", err);
    } finally {
      console.log(`Process admins loaded in ${((Date.now() - startedAt) / 1000).toFixed(2)}s`);
      setPaLoading(false);
    }
  }, [getAdminHeaders]);

  useEffect(() => {
    loadPendingProcessAdminCount();
  }, [loadPendingProcessAdminCount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearch(searchQuery.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Remove the useEffect from here

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // ── Medical User handlers ────────────────────────────────────────────────
  const loadMedicalUsers = useCallback(async () => {
    setMedicalLoading(true);
    try {
      const res = await fetch(`${MEDICAL_API}`, { headers: getAdminHeaders() });
      const data = await res.json();
      if (data?.success) {
        setMedicalUsers(data.data || []);
      }
    } catch (err) {
      console.error("Error loading medical users:", err);
    } finally {
      setMedicalLoading(false);
    }
  }, [getAdminHeaders]);

  const handleApproveMedicalUser = useCallback(async (id) => {
    try {
      const res = await fetch(`${MEDICAL_API}/${id}/status`, {
        method: "PATCH", headers: getAdminHeaders(),
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (data?.success) {
        setMedicalUsers(prev => prev.map(u => u._id === id ? { ...u, isApproved: true, status: "Approved" } : u));
        showPopup("Medical user approved!", "Medical User Approved ✅", "success");
      } else showPopup(data.message || "Failed to approve.", "Approval failed", "error");
    } catch (err) { console.error(err); showPopup("Failed to approve medical user.", "Approval failed", "error"); }
  }, [getAdminHeaders, showPopup]);

  const handleRejectMedicalUser = useCallback((id) => {
    requestConfirmation({ title: "Reject medical user?", message: "This medical user will be marked as rejected.", confirmLabel: "Reject", danger: true }, async () => {
    try {
      const res = await fetch(`${MEDICAL_API}/${id}/status`, {
        method: "PATCH", headers: getAdminHeaders(),
        body: JSON.stringify({ action: "reject" }),
      });
      const data = await res.json();
      if (data?.success) {
        setMedicalUsers(prev => prev.map(u => u._id === id ? { ...u, isApproved: false, status: "Rejected" } : u));
        showPopup("Medical user rejected!", "Medical User Rejected", "success");
      } else showPopup(data.message || "Failed to reject.", "Rejection failed", "error");
    } catch (err) { console.error(err); showPopup("Failed to reject medical user.", "Rejection failed", "error"); }
    });
  }, [getAdminHeaders, requestConfirmation, showPopup]);

  useEffect(() => {
    if (
      activeTab === "users" &&
      lastUsersQueryRef.current !== usersQueryKey
    ) {
      loadUsersData();
    }
    if (activeTab === "processAdmins" && processAdmins.length === 0) {
      loadProcessAdmins();
    }
    if (activeTab === "medical" && medicalUsers.length === 0) {
      loadMedicalUsers();
    }
  }, [activeTab, processAdmins.length, medicalUsers.length, usersQueryKey, loadUsersData, loadProcessAdmins, loadMedicalUsers]);

  // ── User handlers ─────────────────────────────────────────────────────
  const handleApproveUser = useCallback(async (userId) => {
    try {
      const res  = await fetch(`${ADMIN_API}/${userId}/approve`, { // ✅ ADMIN_API
        method: "PATCH", headers: getAdminHeaders(),
        body: JSON.stringify({ approvedBy: localStorage.getItem("adminEmail") || "Admin", approvedAt: new Date().toISOString() }),
      });
      const data = await res.json();
      if (data?.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: "active" } : u));
        if (data.stats) setUserStats(data.stats);
        await loadUsersData();
        showPopup("User approved successfully! An approval email has been sent to the student.", "Account Approved ✅", "success");
      } else showPopup(data.message || "Failed to approve user", "Error", "error");
    } catch (err) { console.error(err); showPopup("Failed to approve user.", "Error", "error"); }
  }, [getAdminHeaders, loadUsersData, showPopup]);

  const handleRejectUser = useCallback((userId) => {
    requestConfirmation({ title: "Reject user?", message: "This user’s status will be changed to suspended.", confirmLabel: "Reject", danger: true }, async () => {
    try {
      const res  = await fetch(`${ADMIN_API}/${userId}/status`, { // ✅ ADMIN_API (was API_BASE_URL)
        method: "PATCH", headers: getAdminHeaders(),
        body: JSON.stringify({ status: "suspended", rejectedBy: localStorage.getItem("adminEmail") || "Admin", rejectedAt: new Date().toISOString() }),
      });
      const data = await res.json();
      if (data?.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: "suspended" } : u));
        if (data.stats) setUserStats(data.stats);
        await loadUsersData();
        showPopup("User rejected successfully!", "User Rejected", "success");
      } else showPopup(data.message || "Failed to reject user", "Rejection failed", "error");
    } catch (err) { console.error(err); showPopup("Failed to reject user.", "Rejection failed", "error"); }
    });
  }, [getAdminHeaders, loadUsersData, requestConfirmation, showPopup]);

  const handleUpdateUser = useCallback(async (userId, field, value) => {
    const isStatus = field === "status";
    const isRole   = field === "role";
    // ✅ All three branches now use ADMIN_API (was API_BASE_URL)
    const endpoint = isStatus ? `${ADMIN_API}/${userId}/status`
                   : isRole   ? `${ADMIN_API}/${userId}/role`
                   :             `${ADMIN_API}/${userId}`;
    const method   = isStatus || isRole ? "PATCH" : "PUT";
    const bodyData = isRole ? { role: value.toLowerCase() } : { [field]: value };
    try {
      const res  = await fetch(endpoint, { method, headers: getAdminHeaders(), body: JSON.stringify(bodyData) });
      const data = await res.json();
      if (data?.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: value } : u));
        if (data.stats) setUserStats(data.stats);
        await loadUsersData();
        showPopup(`User ${field} updated successfully!`, "User updated", "success");
      } else showPopup(data.message || "Failed to update user", "Update failed", "error");
    } catch (err) { console.error(err); showPopup("Failed to update user.", "Update failed", "error"); }
  }, [getAdminHeaders, loadUsersData, showPopup]);

  const handleDeleteUser = useCallback((userId, userName) => {
    setDeleteTarget({ id: userId, name: userName || "this user" });
  }, []);

  const confirmDeleteUser = useCallback(async () => {
    if (!deleteTarget || deletingUser) return;
    const userId = deleteTarget.id;
    const deleteUrl = `${ADMIN_API}/${encodeURIComponent(userId)}`;
    setDeletingUser(true);
    try {
      const headers = getAdminHeaders();
      delete headers["Content-Type"];
      const res = await fetch(deleteUrl, {
        method: "DELETE",
        headers,
        credentials: "include",
      });
      const responseText = await res.text();
      let data = {};
      try { data = responseText ? JSON.parse(responseText) : {}; } catch { /* Keep the HTTP status for non-JSON errors. */ }

      if (!res.ok || !data?.success) {
        throw new Error(data.message || `Delete request failed (HTTP ${res.status}).`);
      }

      setUsers(prev => prev.filter(u => u.id !== userId));
      if (data.stats) setUserStats(data.stats);
      await loadUsersData();
      setDeleteTarget(null);
      setPopup({ title: "User deleted", message: `${deleteTarget.name} was deleted successfully.`, type: "success" });
    } catch (err) {
      console.error(`Failed to delete user ${userId} via ${deleteUrl}:`, err);
      const message = err instanceof TypeError
        ? `Could not reach the admin API at ${ADMIN_API}. Check that the backend is running and allows this frontend origin.`
        : err.message || "Failed to delete user.";
      setDeleteTarget(null);
      setPopup({ title: "Delete failed", message, type: "error" });
    } finally {
      setDeletingUser(false);
    }
  }, [deleteTarget, deletingUser, getAdminHeaders, loadUsersData]);

  const handleSeedUsers = useCallback(() => {
    requestConfirmation({ title: "Create sample account?", message: "This will create or reset one sample student account.", confirmLabel: "Continue" }, async () => {
    try {
      const res  = await fetch(`${ADMIN_API}/seed`, { method: "POST", headers: getAdminHeaders() }); // ✅ ADMIN_API
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data.message || `Seed request failed (HTTP ${res.status}).`);
      }
      if (data.stats) setUserStats(data.stats);
      await loadUsersData();
      setSeedResult({
        count: data.count || 0,
        credentials: data.credentials ? [data.credentials] : [],
      });
    } catch (err) {
      console.error("Failed to seed users:", err);
      showPopup(err.message || "Failed to create sample users.", "Sample account failed", "error");
    }
    });
  }, [getAdminHeaders, loadUsersData, requestConfirmation, showPopup]);

  const handleCreateStudent = useCallback(async ({ firstName, lastName, email }) => {
    setCreatingStudent(true);
    setCreateStudentError("");
    try {
      const response = await fetch(`${ADMIN_API}/create-student`, {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ firstName, lastName, email }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data.message || "Could not create student account.");
      await loadUsersData();
      setCreateStudentOpen(false);
      setStudentCredentials(data.credentials);
    } catch (error) {
      setCreateStudentError(error.message || "Could not create student account.");
    } finally {
      setCreatingStudent(false);
    }
  }, [getAdminHeaders, loadUsersData]);

  // ── Process Admin handlers ────────────────────────────────────────────
  const handleApproveProcessAdmin = useCallback(async (id) => {
    try {
      const res  = await fetch(`${PA_API}/approve/${id}`, {
        method: "POST", headers: getAdminHeaders(),
        body: JSON.stringify({ approvedBy: localStorage.getItem("adminEmail") || "SuperAdmin" }),
      });
      const data = await res.json();
      if (data?.success) {
        setProcessAdmins(prev => prev.map(pa => pa._id === id ? { ...pa, status: "active", isApproved: true } : pa));
        setPendingPaCount(prev => Math.max(prev - 1, 0));
        showPopup("Process admin approved! Approval email sent.", "Process Admin Approved ✅", "success");
      } else showPopup(data.message || "Failed to approve.", "Approval failed", "error");
    } catch (err) { console.error(err); showPopup("Failed to approve process admin.", "Approval failed", "error"); }
  }, [getAdminHeaders, showPopup]);

  const openRejectModal = useCallback((id) => {
    setRejectTarget(id);
    setRejectReason("");
  }, []);

  const handleRejectProcessAdmin = useCallback(async () => {
    if (!rejectTarget) return;
    try {
      const res  = await fetch(`${PA_API}/reject/${rejectTarget}`, {
        method: "POST", headers: getAdminHeaders(),
        body: JSON.stringify({ reason: rejectReason || "Not specified" }),
      });
      const data = await res.json();
      if (data?.success) {
        setProcessAdmins(prev => prev.map(pa => pa._id === rejectTarget ? { ...pa, status: "rejected" } : pa));
        setPendingPaCount(prev => Math.max(prev - 1, 0));
        setRejectTarget(null);
        setRejectReason("");
        showPopup("Process admin rejected. Rejection email sent.", "Process Admin Rejected", "success");
      } else showPopup(data.message || "Failed to reject.", "Rejection failed", "error");
    } catch (err) { console.error(err); showPopup("Failed to reject process admin.", "Rejection failed", "error"); }
  }, [rejectTarget, rejectReason, getAdminHeaders, showPopup]);

  const handleDeactivateProcessAdmin = useCallback((id, currentStatus) => {
    const action = currentStatus === "active" ? "deactivate" : "reactivate";
    requestConfirmation({ title: `${action === "deactivate" ? "Deactivate" : "Reactivate"} process admin?`, message: `Are you sure you want to ${action} this process admin?`, confirmLabel: action === "deactivate" ? "Deactivate" : "Reactivate", danger: action === "deactivate" }, async () => {
    try {
      const res  = await fetch(`${PA_API}/deactivate/${id}`, { method: "PATCH", headers: getAdminHeaders() });
      const data = await res.json();
      if (data?.success) {
        setProcessAdmins(prev => prev.map(pa => pa._id === id ? { ...pa, status: data.data.status, isActive: data.data.isActive } : pa));
        showPopup(`Process admin ${action}d successfully.`, "Process admin updated", "success");
      } else showPopup(data.message || `Failed to ${action}.`, "Update failed", "error");
    } catch (err) { console.error(err); showPopup(`Failed to ${action} process admin.`, "Update failed", "error"); }
    });
  }, [getAdminHeaders, requestConfirmation, showPopup]);

  const toggleRow = useCallback((id) =>
    setExpandedRow(prev => prev === id ? null : id), []);

  const handleTabSwitch = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  // ── RENDER ────────────────────────────────────────────────────────────
  return (
    <div className="admin-users-container">
      <SeedResultModal result={seedResult} onClose={() => setSeedResult(null)} />
      <CreateStudentModal
        open={createStudentOpen}
        loading={creatingStudent}
        error={createStudentError}
        onClose={() => { setCreateStudentOpen(false); setCreateStudentError(""); }}
        onSubmit={handleCreateStudent}
      />
      <StudentCredentialsModal credentials={studentCredentials} onClose={() => setStudentCredentials(null)} />
      <NotificationModal popup={popup} onClose={() => setPopup(null)} />
      <DeleteUserModal
        userName={deleteTarget?.name}
        loading={deletingUser}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteUser}
      />
      <ActionConfirmModal
        confirmation={actionConfirmation}
        loading={confirmationLoading}
        onCancel={() => { confirmationActionRef.current = null; setActionConfirmation(null); }}
        onConfirm={runConfirmedAction}
      />

      {/* Header */}
      <div className="users-header">
        <div className="header-left">
          <h1>Users &amp; Roles</h1>
          <p>Manage accounts and permissions</p>
        </div>
        <div className="header-buttons">
          {activeTab === "users" ? (
            <>
              <button className="refresh-btn" onClick={() => { setCreateStudentError(""); setCreateStudentOpen(true); }}>
                <IconPlus /> Create Student
              </button>
              <button className="seed-users-btn" onClick={handleSeedUsers}>
                <IconRefresh /> Create Sample
              </button>
            </>
          ) : (
            <button className="refresh-btn" onClick={loadProcessAdmins} disabled={paLoading}>
              <IconRefresh /> {paLoading ? "Loading…" : "Refresh"}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="users-stats-grid">
        <div className="user-stat-card total-users">
          <div className="stat-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0e7490" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>Total Users</h3>
            <div className="stat-value">{userStats.totalUsers}</div>
          </div>
        </div>
        <div className="user-stat-card active-users">
          <div className="stat-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>Active</h3>
            <div className="stat-value">{userStats.activeUsers}</div>
          </div>
        </div>
        <div className="user-stat-card admin-users">
          <div className="stat-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>Admins</h3>
            <div className="stat-value">{userStats.adminUsers}</div>
          </div>
        </div>
      </div>

      <div className="divider" />

      {/* Tab switcher */}
      <div className="section-header" style={{ marginBottom:0, paddingBottom:0 }}>
        <div className="admin-tabs-group">
          <button
            className={activeTab === "users" ? "admin-tab-btn active" : "admin-tab-btn"}
            onClick={() => handleTabSwitch("users")}
          >
            Students &amp; Users
          </button>
          <button
            className={activeTab === "processAdmins" ? "admin-tab-btn active" : "admin-tab-btn"}
            onClick={() => handleTabSwitch("processAdmins")}
          >
            Process Admins
            {pendingPaCount > 0 && (
              <span className="admin-tab-badge">
                {pendingPaCount}
              </span>
            )}
          </button>

        </div>
      </div>

      {/* ── TAB: Students & Users ── */}
      {activeTab === "users" && (
        <div className="user-management-section">
          <div className="section-header">
            <h2>User Management</h2>
            <button className="refresh-btn" onClick={loadUsersData} disabled={loading} aria-busy={loading}>
              <IconRefresh /> Refresh
            </button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
          <div className="controls-container">
            <div className="controls-row">
              <div className="search-box">
                <IconSearch />
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {searchQuery && (
                  <button className="search-clear" onClick={() => setSearchQuery("")}>✕</button>
                )}
              </div>
              <div className="filter-pills">
                <div className="filter-group">
                  <span className="filter-label">Role</span>
                  <UserFilterDropdown
                    label="Role filter"
                    value={roleFilter}
                    onChange={(value) => { setCurrentPage(1); setRoleFilter(value); }}
                    options={[
                      { value: "all", label: "All Roles" },
                      { value: "admin", label: "Admin" },
                      { value: "user", label: "User" },
                      { value: "moderator", label: "Moderator" },
                    ]}
                  />
                </div>
                <div className="filter-group">
                  <span className="filter-label">Status</span>
                  <UserFilterDropdown
                    label="Status filter"
                    value={statusFilter}
                    onChange={(value) => { setCurrentPage(1); setStatusFilter(value); }}
                    options={[
                      { value: "all", label: "All Status" },
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                      { value: "pending", label: "Pending" },
                      { value: "suspended", label: "Suspended" },
                    ]}
                  />
                </div>
                <div className="results-count">
                  <span className="rc-num">{users.length}</span>
                  <span className="rc-sep">/</span>
                  <span>{totalUsersCount}</span>
                  <span className="rc-label">users</span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="users-table-container desktop-table">
            <table className="users-table">
              <thead>
                <tr>
                  <th style={{width:"27%"}}>User</th>
                  <th style={{width:"9%"}}>Role</th>
                  <th style={{width:"11%"}}>Status</th>
                  <th style={{width:"18%"}}>Last Login</th>
                  <th style={{width:"13%"}}>Joined</th>
                  <th style={{width:"22%"}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map(user => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onApprove={handleApproveUser}
                      onReject={handleRejectUser}
                      onUpdate={handleUpdateUser}
                      onDelete={handleDeleteUser}
                    />
                  ))
                ) : (
                  <tr><td colSpan="6" className="no-users">No users found matching your criteria</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="mobile-user-list">
            {users.length > 0 ? (
              users.map(user => (
                <MobileUserCard
                  key={user.id}
                  user={user}
                  expanded={expandedRow === user.id}
                  onToggle={toggleRow}
                  onApprove={handleApproveUser}
                  onReject={handleRejectUser}
                  onUpdate={handleUpdateUser}
                  onDelete={handleDeleteUser}
                />
              ))
            ) : (
              <div className="no-users-mobile">No users found matching your criteria</div>
            )}
          </div>

          <div className="pagination-container">
            <div className="pagination-info pagination-info-split">
              <span className="pagination-info-line">Page {currentPage} of {totalPages}</span>
              <span className="pagination-info-line">Showing {users.length} of {totalUsersCount} users</span>
              Page {currentPage} of {totalPages} &nbsp;·&nbsp; Showing {users.length} of {totalUsersCount} users
            </div>
            <div className="pagination-actions">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1 || loading}
              >
                Previous
              </button>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages || loading}
              >
                Next
              </button>
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: Process Admins ── */}
      {activeTab === "processAdmins" && (
        <div className="user-management-section">
          <div className="section-header">
            <h2>Process Admin Approvals</h2>
          </div>

          <div className="controls-container">
            <div className="controls-row">
              <div className="filter-pills">
                {PA_FILTERS.map(({ key, label }) => (
                  <button
                    key={key}
                    className={processAdminFilter === key ? "refresh-btn" : "seed-users-btn"}
                    onClick={() => setProcessAdminFilter(key)}
                    style={{ fontSize:13 }}
                  >
                    {label}
                  </button>
                ))}
                <div className="results-count">
                  <span className="rc-num">{filteredProcessAdmins.length}</span>
                  <span className="rc-label">admins</span>
                </div>
              </div>
            </div>
          </div>

          <div className="users-table-container desktop-table">
            {paLoading ? <LoadingSpinner /> : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th style={{width:"28%"}}>Name</th>
                    <th style={{width:"30%"}}>Email</th>
                    <th style={{width:"14%"}}>Registered</th>
                    <th style={{width:"12%"}}>Status</th>
                    <th style={{width:"16%"}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProcessAdmins.length > 0 ? (
                    filteredProcessAdmins.map(pa => (
                      <tr key={pa._id}>
                        <td>
                          <div className="user-info">
                            <UserAvatar char={(pa.firstName?.[0] || "P").toUpperCase()} />
                            <div className="user-details">
                              <div className="user-name">{pa.firstName} {pa.lastName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="last-login">{pa.email}</td>
                        <td className="join-date">{formatDate(pa.createdAt)}</td>
                        <td>
                          <StatusBadge
                            status={pa.status === "pending_approval" ? "pending" : pa.status}
                            label={pa.status === "pending_approval" ? "Pending" : undefined}
                          />
                        </td>
                        <td>
                          <div className="action-buttons">
                            {pa.status === "pending_approval" && (
                              <>
                                <button className="btn-approve" onClick={() => handleApproveProcessAdmin(pa._id)}>
                                  <IconCheck /> Approve
                                </button>
                                <button className="btn-reject" onClick={() => openRejectModal(pa._id)}>
                                  <IconX /> Reject
                                </button>
                              </>
                            )}
                            {(pa.status === "active" || pa.status === "suspended") && (
                              <button
                                className={pa.status === "active" ? "btn-deactivate" : "btn-activate"}
                                onClick={() => handleDeactivateProcessAdmin(pa._id, pa.status)}
                              >
                                {pa.status === "active" ? <><IconMinus /> Deactivate</> : <><IconPlus /> Reactivate</>}
                              </button>
                            )}
                            {pa.status === "rejected" && (
                              <span style={{ fontSize:12, color:"#dc2626" }} title={pa.rejectionReason || ""}>✗ Rejected</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5" className="no-users">No {processAdminFilter === "all" ? "" : processAdminFilter.replace("_"," ")} process admins found</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="mobile-user-list" style={{ display: paLoading ? "none" : undefined }}>
            {filteredProcessAdmins.length > 0 ? (
              filteredProcessAdmins.map(pa => (
                <div key={pa._id} className={`mobile-user-card ${expandedRow === pa._id ? "expanded" : ""}`}>
                  <div className="mobile-card-top" onClick={() => toggleRow(pa._id)}>
                    <div className="user-info">
                      <UserAvatar char={(pa.firstName?.[0] || "P").toUpperCase()} />
                      <div className="user-details">
                        <div className="user-name">{pa.firstName} {pa.lastName}</div>
                        <div className="user-email">{pa.email}</div>
                      </div>
                    </div>
                    <div className="mobile-card-right">
                      <StatusBadge
                        status={pa.status === "pending_approval" ? "pending" : pa.status}
                        label={pa.status === "pending_approval" ? "Pending" : undefined}
                      />
                      <span className="mobile-expand-icon">{expandedRow === pa._id ? "▲" : "▼"}</span>
                    </div>
                  </div>
                  {expandedRow === pa._id && (
                    <div className="mobile-card-body">
                      <div className="mobile-meta-row">
                        <div className="mobile-meta-item">
                          <span className="mobile-meta-label">Registered</span>
                          <span className="mobile-meta-value">{formatDate(pa.createdAt)}</span>
                        </div>
                      </div>
                      <div className="mobile-actions">
                        {pa.status === "pending_approval" && (
                          <>
                            <button className="btn-approve" onClick={() => handleApproveProcessAdmin(pa._id)}>✓ Approve</button>
                            <button className="btn-reject"  onClick={() => openRejectModal(pa._id)}>✗ Reject</button>
                          </>
                        )}
                        {(pa.status === "active" || pa.status === "suspended") && (
                          <button
                            className={pa.status === "active" ? "btn-deactivate" : "btn-activate"}
                            onClick={() => handleDeactivateProcessAdmin(pa._id, pa.status)}
                          >
                            {pa.status === "active" ? "Deactivate" : "Reactivate"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="no-users-mobile">No process admins found</div>
            )}
          </div>

          <div className="pagination-container" style={{ display: paLoading ? "none" : undefined }}>
            <div className="pagination-info">
              {filteredProcessAdmins.length} result{filteredProcessAdmins.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <RejectModal
          reason={rejectReason}
          setReason={setRejectReason}
          onConfirm={handleRejectProcessAdmin}
          onCancel={() => { setRejectTarget(null); setRejectReason(""); }}
        />
      )}

      {/* ── TAB: Medical Users ── */}
      {activeTab === "medical" && (
        <div className="user-management-section">
          <div className="section-header">
            <h2>Medical Users</h2>
            <button className="refresh-btn" onClick={loadMedicalUsers} disabled={medicalLoading}>
              <IconRefresh /> Refresh
            </button>
          </div>
          <div className="users-table-container desktop-table">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {medicalUsers.map(user => (
                  <tr key={user._id}>
                    <td>
                      <div className="user-info">
                        <UserAvatar char={(user.firstName?.[0] || "M").toUpperCase()} />
                        <div className="user-details">
                          <div className="user-name">{user.firstName} {user.lastName}</div>
                          <div className="user-email">{user.email}</div>
                          {!user.isVerified && <div className="user-note">⚠ OTP not verified</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${user.status === 'Approved' ? 'status-active' : user.status === 'Rejected' ? 'status-rejected' : 'status-pending'}`}>
                        {user.status || 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {user.status !== "Approved" && (
                          <button className="btn-approve" onClick={() => handleApproveMedicalUser(user._id)} title="Approve">
                            <IconCheck /> Approve
                          </button>
                        )}
                        {user.status !== "Rejected" && (
                          <button className="btn-reject" onClick={() => handleRejectMedicalUser(user._id)} title="Reject">
                            <IconX /> Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {medicalUsers.length === 0 && !medicalLoading && (
                  <tr><td colSpan="3" style={{ textAlign: "center", padding: "20px" }}>No medical users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards for Medical Users */}
          <div className="mobile-user-list">
            {medicalUsers.length > 0 ? (
              medicalUsers.map(user => (
                <div key={user._id} className={`mobile-user-card ${expandedRow === user._id ? "expanded" : ""}`}>
                  <div className="mobile-card-top" onClick={() => toggleRow(user._id)}>
                    <div className="user-info">
                      <UserAvatar char={(user.firstName?.[0] || "M").toUpperCase()} />
                      <div className="user-details">
                        <div className="user-name">{user.firstName} {user.lastName}</div>
                        <div className="user-email">{user.email}</div>
                        {!user.isVerified && <div className="user-note mobile-note">⚠ OTP not verified</div>}
                      </div>
                    </div>
                    <div className="mobile-card-right">
                      <span className={`status-badge ${user.status === 'Approved' ? 'status-active' : user.status === 'Rejected' ? 'status-rejected' : 'status-pending'}`}>
                        {user.status || 'Pending'}
                      </span>
                      <span className="mobile-expand-icon">{expandedRow === user._id ? "▲" : "▼"}</span>
                    </div>
                  </div>
                  
                  {expandedRow === user._id && (
                    <div className="mobile-card-body">
                      <div className="mobile-actions">
                        {user.status !== "Approved" && (
                          <button className="btn-approve" onClick={() => handleApproveMedicalUser(user._id)}>
                            ✓ Approve
                          </button>
                        )}
                        {user.status !== "Rejected" && (
                          <button className="btn-reject" onClick={() => handleRejectMedicalUser(user._id)}>
                            ✗ Reject
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              !medicalLoading && <div className="no-users-mobile">No medical users found.</div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminUserManagement;

