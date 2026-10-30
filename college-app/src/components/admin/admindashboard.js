import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
  lazy,
  Suspense,
  memo,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import EdutechLogo from "../../assets/Edutech-logo.svg";
import "./admindashboard.css";
import API_BASE_URL from "../../config/api";

// Phones + tablets (iPad Mini 768, Surface Pro 912, iPad Pro 13 1032) use the drawer layout.
// MUST match the max-width in the "@media (max-width: 1100px)" block in admindashboard.css.
const COMPACT_QUERY = "(max-width: 1100px)";
const isCompactScreen = () => window.matchMedia(COMPACT_QUERY).matches;

const lazyWithRetry = (factory, retries = 3) => {
  return lazy(async () => {
    let lastError;

    for (let i = 0; i < retries; i++) {
      try {
        return await factory();
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    throw lastError;
  });
};

const AdminUserManagement = lazyWithRetry(() => import("./adminuser"));
const Notifications = lazyWithRetry(() => import("./Notifications"));
const AdminVerifyDocuments = lazyWithRetry(() => import("./AdminVerifyDocuments"));

class LazySectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Failed to load admin section:", error);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="lazy-section-error">
        <p>Failed to load this section.</p>
        <div className="lazy-section-error-actions">
          <button type="button" onClick={() => this.setState({ hasError: false })}>
            Reload Section
          </button>
          <button type="button" onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}

const LazySection = ({ children, fallback = <TabFallback />, resetKey }) => (
  <LazySectionErrorBoundary resetKey={resetKey}>
    <Suspense fallback={fallback}>{children}</Suspense>
  </LazySectionErrorBoundary>
);

// ── Icons defined OUTSIDE component ───────────────────────────────────────
const ICONS = {
  dashboard: (color = "#64748b") => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  users: (color = "#0891b2") => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  userCheck: (color = "#10b981") => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
      <polyline points="17 11 19 13 23 9"/>
    </svg>
  ),
  shield: (color = "#8b5cf6") => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  userX: (color = "#f59e0b") => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
      <line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/>
    </svg>
  ),
  clock: (color = "#f59e0b") => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  checkCircle: (color = "#10b981") => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  alertTriangle: (color = "#0891b2") => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  xCircle: (color = "#ef4444") => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  bell: (color = "#8b5cf6") => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  messageSquare: (color = "#f59e0b") => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  logIn: (color = "#10b981") => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
    </svg>
  ),
  userPlus: (color = "#0891b2") => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
  ),
  activity: (color = "#64748b") => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  verifyDocuments: (color = "#64748b") => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/>
    </svg>
  ),
  notifications: (color = "#64748b") => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  settings: (color = "#64748b") => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  logout: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  collapse: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  expand: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  search: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  hamburger: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  refresh: (color = "#fff") => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  ),
};

// ── Cache duration: 60 seconds ────────────────────────────────────────────
const CACHE_TTL = 60_000;
let dashCache = { data: null, ts: 0 };
let dashboardRequest = null;

const EMPTY_USER_STATS = {};
const EMPTY_VERIFICATION_STATS = {};
const EMPTY_NOTIFICATION_STATS = {};
const EMPTY_ACTIVITY_STATS = {};
const EMPTY_QUICK_STATS = {};

const ADMIN_TAB_TO_PATH = {
  dashboard: "/admin-dashboard",
  users: "/admin-dashboard/users",
  "verify-documents": "/admin-dashboard/verify-documents",
  notifications: "/admin-dashboard/notifications",
  settings: "/admin-dashboard/settings",
};

const ADMIN_PATH_TO_TAB = {
  "": "dashboard",
  dashboard: "dashboard",
  users: "users",
  user: "users",
  "verify-documents": "verify-documents",
  "verify-document": "verify-documents",
  verification: "verify-documents",
  notifications: "notifications",
  notification: "notifications",
  settings: "settings",
};

const getAdminTabFromPath = (pathname = "") => {
  const base = "/admin-dashboard";
  if (pathname === base || pathname === `${base}/`) return "dashboard";
  if (!pathname.startsWith(`${base}/`)) return "dashboard";
  const section = pathname.slice(base.length + 1).split("/")[0].toLowerCase();
  return ADMIN_PATH_TO_TAB[section] || "dashboard";
};

// ── Shared Stat Card Component ───────────────────────────────────────────
const StatCard = memo(({ title, value, accent, icon, loading }) => (
  <div className={`stat-card stat-${accent}`}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-content">
      <h3>{title}</h3>
      <div className="stat-value">
        {loading ? <span className="stat-skeleton" /> : (value ?? "0")}
      </div>
    </div>
  </div>
));

const SectionLabel = memo(({ label }) => (
  <div className="dash-section-label">{label}</div>
));

const TabFallback = ({ label = "Loading..." } = {}) => (
  <div className="tab-loading">
    <div className="tab-loading-spinner" />
    <p style={{ textAlign: "center", color: "#64748b", fontSize: 13 }}>{label}</p>
  </div>
);

// ── ROW 1: User Stats Section ─────────────────────────────────────────────
const UserStatsRow = memo(({ userStats, loading }) => (
  <div className="dash-section">
    <SectionLabel label="USER OVERVIEW" />
    <div className="stats-grid stats-grid-4">
      <StatCard
        title="Total Users"
        value={userStats.totalUsers?.toLocaleString()}
        accent="blue"
        icon={ICONS.users("#0891b2")}
        loading={loading}
      />
      <StatCard
        title="Active Users"
        value={userStats.activeUsers?.toLocaleString()}
        accent="green"
        icon={ICONS.userCheck("#10b981")}
        loading={loading}
      />
      <StatCard
        title="Admin Accounts"
        value={userStats.adminUsers?.toLocaleString()}
        accent="purple"
        icon={ICONS.shield("#8b5cf6")}
        loading={loading}
      />
      <StatCard
        title="Inactive Users"
        value={userStats.inactiveUsers?.toLocaleString()}
        accent="orange"
        icon={ICONS.userX("#f59e0b")}
        loading={loading}
      />
    </div>
  </div>
));

// ── ROW 2: Document Verification Section ──────────────────────────────────
const VerificationStatsRow = memo(({ verificationStats, loading }) => (
  <div className="dash-section">
    <SectionLabel label="DOCUMENT VERIFICATION SECTION" />
    <div className="stats-grid stats-grid-4">
      <StatCard
        title="Pending Verifications"
        value={verificationStats.pending?.toLocaleString()}
        accent="orange"
        icon={ICONS.clock("#f59e0b")}
        loading={loading}
      />
      <StatCard
        title="Approved Documents"
        value={verificationStats.approved?.toLocaleString()}
        accent="green"
        icon={ICONS.checkCircle("#10b981")}
        loading={loading}
      />
      <StatCard
        title="Changes Requested"
        value={verificationStats.changesRequested?.toLocaleString()}
        accent="blue"
        icon={ICONS.alertTriangle("#0891b2")}
        loading={loading}
      />
      <StatCard
        title="Rejected Documents"
        value={verificationStats.rejected?.toLocaleString()}
        accent="red"
        icon={ICONS.xCircle("#ef4444")}
        loading={loading}
      />
    </div>
  </div>
));

// ── ROW 3: System Activity Section ─────────────────────────────────────────
const SystemActivityRow = memo(({ notificationStats, activityStats, loading }) => (
  <div className="dash-section">
    <SectionLabel label="SYSTEM ACTIVITY" />
    <div className="stats-grid stats-grid-4">
      <StatCard
        title="Notifications Sent"
        value={notificationStats.totalNotifications?.toLocaleString()}
        accent="purple"
        icon={ICONS.bell("#8b5cf6")}
        loading={loading}
      />
      <StatCard
        title="Unread Notifications"
        value={notificationStats.unreadNotifications?.toLocaleString()}
        accent="amber"
        icon={ICONS.messageSquare("#f59e0b")}
        loading={loading}
      />
      <StatCard
        title="Today's Logins"
        value={activityStats.todayLogins?.toLocaleString()}
        accent="green"
        icon={ICONS.logIn("#10b981")}
        loading={loading}
      />
      <StatCard
        title="New Registrations"
        value={activityStats.newRegistrations?.toLocaleString()}
        accent="blue"
        icon={ICONS.userPlus("#0891b2")}
        loading={loading}
      />
    </div>
  </div>
));

// ── Recent Activities Timeline (Left Side) ─────────────────────────────────
const RecentActivitiesTimeline = memo(({ activities = [], loading }) => {
  const getBadgeClass = (status = "") => {
    const s = String(status).toLowerCase();
    if (s.includes("approved") || s.includes("completed") || s.includes("active")) return "badge-success";
    if (s.includes("pending") || s.includes("review")) return "badge-pending";
    if (s.includes("rejected") || s.includes("failed")) return "badge-danger";
    if (s.includes("new")) return "badge-new";
    return "badge-info";
  };

  const getActivityIcon = (type = "") => {
    const t = String(type).toLowerCase();
    if (t.includes("registered") || t.includes("user")) return ICONS.userPlus("#0891b2");
    if (t.includes("approved")) return ICONS.checkCircle("#10b981");
    if (t.includes("rejected")) return ICONS.xCircle("#ef4444");
    if (t.includes("notification")) return ICONS.bell("#8b5cf6");
    return ICONS.activity("#64748b");
  };

  return (
    <div className="activities-timeline-card">
      <div className="timeline-header">
        <h3>
          <span className="header-dot" /> Recent Activities Timeline
        </h3>
        <span className="timeline-sub">Real-time system events</span>
      </div>
      <div className="timeline-body">
        {loading ? (
          <div className="timeline-loading">Loading recent activity...</div>
        ) : activities.length === 0 ? (
          <div className="timeline-empty">No recent activity logged yet</div>
        ) : (
          <div className="timeline-list">
            {activities.map((item, idx) => (
              <div className="timeline-item" key={item.id || idx}>
                <div className="timeline-icon-wrapper">
                  {getActivityIcon(item.type)}
                </div>
                <div className="timeline-content">
                  <div className="timeline-top">
                    <span className="timeline-user-name">{item.user || "System User"}</span>
                    <span className={`timeline-badge ${getBadgeClass(item.status)}`}>
                      {item.status || "Completed"}
                    </span>
                  </div>
                  <div className="timeline-title">{item.type}</div>
                  {item.message && <div className="timeline-desc">{item.message}</div>}
                  <div className="timeline-time">
                    {item.timestamp ? new Date(item.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : "Just now"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

// ── Quick Statistics (Right Side) ──────────────────────────────────────────
const QuickStatisticsPanel = memo(({ quickStats = {}, loading }) => {
  const usersGrowth = quickStats.usersGrowthPct ?? 12;
  const verificationSuccess = quickStats.verificationSuccessPct ?? 94;
  const systemHealth = quickStats.systemHealthPct ?? 99.9;
  const pendingReviews = quickStats.pendingReviewsCount ?? 0;

  return (
    <div className="quick-stats-card">
      <div className="quick-stats-header">
        <h3>Quick Statistics</h3>
        <span className="quick-stats-sub">System Health & Metrics</span>
      </div>

      <div className="quick-stats-list">
        {/* Widget 1: Users Growth */}
        <div className="quick-stat-widget">
          <div className="widget-label-row">
            <span className="widget-title">Users Growth %</span>
            <span className="widget-value text-cyan">+{usersGrowth}%</span>
          </div>
          <div className="widget-progress-bg">
            <div className="widget-progress-bar bg-cyan" style={{ width: `${Math.min(Math.max(usersGrowth, 5), 100)}%` }} />
          </div>
        </div>

        {/* Widget 2: Verification Success */}
        <div className="quick-stat-widget">
          <div className="widget-label-row">
            <span className="widget-title">Verification Success %</span>
            <span className="widget-value text-green">{verificationSuccess}%</span>
          </div>
          <div className="widget-progress-bg">
            <div className="widget-progress-bar bg-green" style={{ width: `${Math.min(verificationSuccess, 100)}%` }} />
          </div>
        </div>

        {/* Widget 3: System Health */}
        <div className="quick-stat-widget">
          <div className="widget-label-row">
            <span className="widget-title">System Health %</span>
            <span className="widget-value text-purple">{systemHealth}%</span>
          </div>
          <div className="widget-progress-bg">
            <div className="widget-progress-bar bg-purple" style={{ width: `${Math.min(systemHealth, 100)}%` }} />
          </div>
        </div>

        {/* Widget 4: Pending Reviews */}
        <div className="quick-stat-widget pending-reviews-box">
          <div className="pending-reviews-content">
            <span className="pending-reviews-title">Pending Reviews Count</span>
            <span className="pending-reviews-sub">Requires admin action</span>
          </div>
          <div className="pending-reviews-count-badge">
            {loading ? "..." : pendingReviews}
          </div>
        </div>
      </div>
    </div>
  );
});

// ── Dashboard Overview Layout ─────────────────────────────────────────────
const DashboardContent = memo(({
  apiError,
  refreshing,
  loading,
  userStats,
  verificationStats,
  notificationStats,
  activityStats,
  recentActivities,
  quickStats,
  onRefresh,
  onTabChange,
}) => (
  <div className="dashboard-content">
    {/* Welcome Header */}
    <div className="welcome-section">
      <div className="welcome-text">
        <h2>Admin Operations Dashboard</h2>
        <p>Real-time system statistics, user activities, and document verification control</p>
      </div>
      <div className="welcome-actions">
        {apiError && <div className="api-error-badge" title={apiError}>⚠ API Error</div>}
        <button
          className={`refresh-btn-sm ${refreshing ? "is-refreshing" : ""}`}
          onClick={onRefresh}
          disabled={refreshing}
          aria-busy={refreshing}
        >
          <span className={`refresh-icon ${refreshing ? "spinning" : ""}`} aria-hidden="true">{ICONS.refresh()}</span>
          <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>
    </div>

    {/* ROW 1: User Stats */}
    <UserStatsRow userStats={userStats} loading={loading} />

    {/* ROW 2: Document Verification */}
    <VerificationStatsRow verificationStats={verificationStats} loading={loading} />

    {/* ROW 3: System Activity */}
    <SystemActivityRow notificationStats={notificationStats} activityStats={activityStats} loading={loading} />

    {/* MAIN CONTENT: Left (Timeline) & Right (Quick Stats) */}
    <div className="main-content-split">
      <div className="split-left">
        <RecentActivitiesTimeline activities={recentActivities} loading={loading} />
      </div>
      <div className="split-right">
        <QuickStatisticsPanel quickStats={quickStats} loading={loading} />
      </div>
    </div>

    {/* BOTTOM SECTION: Quick Actions */}
    <div className="quick-access-section">
      <h3>Quick Actions</h3>
      <div className="quick-action-cards">
        {[
          { tab: "users",            icon: ICONS.users("#0891b2"),           title: "User Management",  desc: "Manage user accounts & permissions" },
          { tab: "verify-documents", icon: ICONS.verifyDocuments("#8b5cf6"), title: "Verify Documents", desc: "Review and verify student submitted documents" },
          { tab: "notifications",    icon: ICONS.notifications("#10b981"),   title: "Notifications",    desc: "View and send platform notifications" },
          { tab: "settings",         icon: ICONS.settings("#f59e0b"),        title: "Settings",         desc: "Configure platform & dashboard settings" },
        ].map(({ tab, icon, title, desc }) => (
          <div className="quick-action-card" key={tab} onClick={() => onTabChange(tab)}>
            <div className="quick-action-icon">{icon}</div>
            <div className="quick-action-content">
              <h4>{title}</h4>
              <p>{desc}</p>
            </div>
            <div className="quick-action-arrow">→</div>
          </div>
        ))}
      </div>
    </div>
  </div>
));

// ── Settings ──────────────────────────────────────────────────────────────
const ADMIN_TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "IST", label: "IST (India)" },
  { value: "EST", label: "EST (Eastern)" },
];

const SettingsTimezoneSelect = () => {
  const [value, setValue] = useState("UTC");
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const dropdownRef = useRef(null);
  const selected = ADMIN_TIMEZONES.find((timezone) => timezone.value === value);

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
      const menuHeight = Math.min(160, window.innerHeight * 0.35);
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < menuHeight && rect.top > spaceBelow);
    }
    setIsOpen((open) => !open);
  };

  return (
    <div className={`settings-timezone-select ${isOpen ? "open" : ""}`} ref={dropdownRef}>
      <button
        type="button"
        className="settings-control settings-timezone-trigger"
        onClick={toggleDropdown}
        aria-label="Timezone"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selected?.label || "Choose a timezone"}</span>
        <span className="settings-timezone-arrow" aria-hidden="true" />
      </button>
      {isOpen && (
        <div className={`settings-timezone-menu ${openUp ? "opens-up" : ""}`} role="listbox" aria-label="Timezone options">
          {ADMIN_TIMEZONES.map((timezone) => (
            <button
              type="button"
              key={timezone.value}
              role="option"
              aria-selected={value === timezone.value}
              className={value === timezone.value ? "selected" : ""}
              onClick={() => { setValue(timezone.value); setIsOpen(false); }}
            >
              {timezone.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Defined OUTSIDE AdminDashboard so it isn't re-created (and its state reset) on every render.
const SettingsContent = () => (
  <div className="settings-content">
    <div className="welcome-section">
      <div className="welcome-text">
        <h2>Settings</h2>
        <p>Manage your dashboard preferences and notifications.</p>
      </div>
    </div>
    <div className="settings-grid">
      <div className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-card-icon" aria-hidden="true">⚙</span>
          <div><h3>General Settings</h3><p>Basic details for this admin workspace.</p></div>
        </div>
        <div className="settings-field">
          <label htmlFor="admin-site-name">Site Name</label>
          <input id="admin-site-name" className="settings-control" type="text" defaultValue="Admin Operations Dashboard" />
        </div>
        <div className="settings-field">
          <span className="settings-field-label">Timezone</span>
          <SettingsTimezoneSelect />
        </div>
      </div>
      <div className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-card-icon notifications" aria-hidden="true">✉</span>
          <div><h3>Notification Settings</h3><p>Choose which admin updates you receive.</p></div>
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-copy"><label htmlFor="admin-email-notifications">Email Notifications</label><p>Receive important dashboard updates by email.</p></div>
          <label className="settings-switch" htmlFor="admin-email-notifications">
            <input id="admin-email-notifications" type="checkbox" defaultChecked />
            <span aria-hidden="true" />
          </label>
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-copy"><label htmlFor="admin-registration-alerts">User Registration Alerts</label><p>Get notified when a new user registers.</p></div>
          <label className="settings-switch" htmlFor="admin-registration-alerts">
            <input id="admin-registration-alerts" type="checkbox" defaultChecked />
            <span aria-hidden="true" />
          </label>
        </div>
      </div>
    </div>
  </div>
);

const NAV_TITLE = {
  dashboard: "Dashboard",
  users: "Users",
  notifications: "Notifications",
  "verify-documents": "Verify Documents",
  settings: "Settings",
};

// ── Main Component ────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(() => !isCompactScreen());
  const [activeTab,   setActiveTab]   = useState(() => getAdminTabFromPath(window.location.pathname));
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [apiError,    setApiError]    = useState(null);
  const [dashData,    setDashData]    = useState(null);
  const contentAreaRef = useRef(null);

  // ── Stable auth headers ───────────────────────────────────────────────
  const authHeaders = useCallback(() => {
    const token = localStorage.getItem("adminToken");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  // ── Sidebar: follows the SAME media query as the CSS ──────────────────
  // Only fires when the screen crosses the breakpoint (not on scroll / keyboard / address-bar resize).
  useEffect(() => {
    const mql = window.matchMedia(COMPACT_QUERY);
    const handleChange = (e) => setSidebarOpen(!e.matches); // desktop: open, phone/tablet: closed
    handleChange(mql);
    if (mql.addEventListener) mql.addEventListener("change", handleChange);
    else mql.addListener(handleChange); // older Safari
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", handleChange);
      else mql.removeListener(handleChange);
    };
  }, []);

  // ── Auth guard ────────────────────────────────────────────────────────
  useEffect(() => {
    const ok    = localStorage.getItem("adminLoggedIn") === "true";
    const email = localStorage.getItem("adminEmail");
    if (!ok || !email) navigate("/admin-login");
  }, [navigate]);

  // ── Data fetcher with cache ──────────────────────────────────────────
  const loadDashboardData = useCallback(async (silent = false) => {
    if (!silent && dashCache.data && Date.now() - dashCache.ts < CACHE_TTL) {
      setDashData(dashCache.data);
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    else setRefreshing(true);
    setApiError(null);

    try {
      if (!dashboardRequest) {
        const headers = authHeaders();
        dashboardRequest = fetch(`${API_BASE_URL}/api/admin/dashboard/overview`, { headers })
          .then(async (dashRes) => {
            if (!dashRes.ok) throw new Error(`HTTP ${dashRes.status}: ${dashRes.statusText}`);
            const dashJson = await dashRes.json();
            if (!dashJson.success) throw new Error(dashJson.message || "API error");
            return { ...dashJson.data };
          })
          .finally(() => {
            dashboardRequest = null;
          });
      }

      const merged = await dashboardRequest;
      dashCache = { data: merged, ts: Date.now() };
      setDashData(merged);
    } catch (err) {
      console.error("Dashboard load error:", err);
      setApiError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (activeTab === "dashboard") loadDashboardData();
  }, [activeTab, loadDashboardData]);

  // ── Logout ────────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    ["adminLoggedIn", "adminEmail", "adminToken"].forEach(k => localStorage.removeItem(k));
    navigate("/admin-login");
  }, [navigate]);

  const toggleSidebar   = useCallback(() => setSidebarOpen(p => !p), []);
  const handleSearch    = useCallback((e) => setSearchQuery(e.target.value), []);

  useEffect(() => {
    const nextTab = getAdminTabFromPath(location.pathname);
    const canonicalPath = ADMIN_TAB_TO_PATH[nextTab] || ADMIN_TAB_TO_PATH.dashboard;
    if (location.pathname !== canonicalPath) {
      navigate(canonicalPath, { replace: true });
      return;
    }
    setActiveTab((currentTab) => currentTab === nextTab ? currentTab : nextTab);
  }, [location.pathname, navigate]);

  useLayoutEffect(() => {
    if (contentAreaRef.current) contentAreaRef.current.scrollTop = 0;
  }, [activeTab, location.pathname]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    const targetPath = ADMIN_TAB_TO_PATH[tab] || ADMIN_TAB_TO_PATH.dashboard;
    if (location.pathname !== targetPath) navigate(targetPath);
    // Close the drawer on phones + tablets after choosing a page
    if (isCompactScreen()) setSidebarOpen(false);
  }, [location.pathname, navigate]);

  const handleDashboardRefresh = useCallback(() => {
    loadDashboardData(true);
  }, [loadDashboardData]);

  // ── Destructure data ──────────────────────────────────────────────────
  const userStats         = dashData?.userStats         || EMPTY_USER_STATS;
  const verificationStats = dashData?.verificationStats || EMPTY_VERIFICATION_STATS;
  const notificationStats = dashData?.notificationStats || EMPTY_NOTIFICATION_STATS;
  const activityStats     = dashData?.activityStats     || EMPTY_ACTIVITY_STATS;
  const recentActivities  = useMemo(() => dashData?.recentActivities || [], [dashData]);
  const quickStats        = dashData?.quickStats        || EMPTY_QUICK_STATS;

  // ── Content Router ────────────────────────────────────────────────────
  const adminEmail = localStorage.getItem("adminEmail");

  const dashboardContent = useMemo(() => (
    <DashboardContent
      apiError={apiError}
      refreshing={refreshing}
      loading={loading}
      userStats={userStats}
      verificationStats={verificationStats}
      notificationStats={notificationStats}
      activityStats={activityStats}
      recentActivities={recentActivities}
      quickStats={quickStats}
      onRefresh={handleDashboardRefresh}
      onTabChange={handleTabChange}
    />
  ), [
    apiError,
    refreshing,
    loading,
    userStats,
    verificationStats,
    notificationStats,
    activityStats,
    recentActivities,
    quickStats,
    handleDashboardRefresh,
    handleTabChange,
  ]);

  const renderContent = () => {
    if (activeTab === "notifications") {
      return (
        <div className="notifications-page">
          <div className="notifications-header">
            <h2>Notifications</h2>
            <p>Manage and view all your notifications here</p>
          </div>
          <LazySection resetKey={activeTab}>
            <Notifications adminId={adminEmail} fullView onUnreadCountChange={setUnreadCount} />
          </LazySection>
        </div>
      );
    }
    switch (activeTab) {
      case "dashboard":        return dashboardContent;
      case "users":            return <LazySection resetKey={activeTab} fallback={<TabFallback label="Loading users..." />}><AdminUserManagement /></LazySection>;
      case "verify-documents": return <LazySection resetKey={activeTab}><AdminVerifyDocuments /></LazySection>;
      case "settings":         return <SettingsContent />;
      default:                 return dashboardContent;
    }
  };

  // ── MenuItem (stable rendering) ────────────────────────────────────────
  const MenuItem = useCallback(({ tab, iconKey, label, badge }) => {
    const isActive  = activeTab === tab;
    const iconColor = isActive ? "#1e40af" : "#64748b";
    return (
      <li className={isActive ? "active" : ""} onClick={() => handleTabChange(tab)}>
        <span className="menu-icon">
          {ICONS[iconKey](iconColor)}
          {badge > 0 && <span className="notification-badge-sidebar">{badge}</span>}
        </span>
        {sidebarOpen && (
          <>
            <span className="menu-label">{label}</span>
            {badge > 0 && <span className="notification-count-sidebar">{badge}</span>}
          </>
        )}
      </li>
    );
  }, [activeTab, sidebarOpen, handleTabChange]);

  const MOBILE_NAV = [
    { tab: "dashboard",        iconKey: "dashboard",       label: "Home" },
    { tab: "users",            iconKey: "users",           label: "Users" },
    { tab: "verify-documents", iconKey: "verifyDocuments", label: "Verify" },
    { tab: "notifications",    iconKey: "notifications",   label: "Alerts", badge: unreadCount },
  ];

  return (
    <div className="admin-dashboard">
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-logo-strip">
          {sidebarOpen
            ? <img src={EdutechLogo} alt="EduTech" className="sidebar-logo" loading="lazy" />
            : <div className="sidebar-logo-icon">{ICONS.dashboard("#1e40af")}</div>}
          <button className="sidebar-toggle" onClick={toggleSidebar} aria-label="Toggle sidebar">
            {sidebarOpen ? ICONS.collapse : ICONS.expand}
          </button>
        </div>

        {sidebarOpen && <div className="nav-section-label">Main Menu</div>}

        <ul className="sidebar-menu">
          <MenuItem tab="dashboard"        iconKey="dashboard"       label="Dashboard"        />
          <MenuItem tab="users"            iconKey="users"           label="Users"            />
          <MenuItem tab="verify-documents" iconKey="verifyDocuments" label="Verify Documents" />
          <MenuItem tab="notifications"    iconKey="notifications"   label="Notifications" badge={unreadCount} />
          <MenuItem tab="settings"         iconKey="settings"        label="Settings"         />
        </ul>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <span className="menu-icon">{ICONS.logout}</span>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        <nav className="navbar">
          <div className="navbar-left">
            <button className="hamburger-btn" onClick={toggleSidebar} aria-label="Open menu">{ICONS.hamburger}</button>
            <h1>{NAV_TITLE[activeTab] || "Dashboard"}</h1>
          </div>
          <div className="navbar-center">
            <div className="search-container">
              <input type="text" placeholder="Search..." value={searchQuery} onChange={handleSearch} className="search-input" />
              <button className="search-btn">{ICONS.search}</button>
            </div>
          </div>
          <div className="navbar-right">
            <LazySection fallback={null} resetKey="navbar-notifications">
              <Notifications adminId={adminEmail} onUnreadCountChange={setUnreadCount} />
            </LazySection>
            <div className="admin-profile">
              <span className="profile-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <span className="profile-name">{adminEmail?.split("@")[0] || "Admin"}</span>
            </div>
          </div>
        </nav>

        <div className="content-area" ref={contentAreaRef}>{renderContent()}</div>

        <footer className="dashboard-footer">
          <p>© {new Date().getFullYear()} Admin Operations Dashboard. All rights reserved.</p>
        </footer>
      </div>

      {/* Mobile / Tablet Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        {MOBILE_NAV.map(({ tab, iconKey, label, badge }) => (
          <button key={tab} className={`mobile-nav-btn ${activeTab === tab ? "active" : ""}`} onClick={() => handleTabChange(tab)}>
            <span className="mobile-nav-icon">
              {ICONS[iconKey](activeTab === tab ? "#0891b2" : "#94a3b8")}
              {badge > 0 && <span className="mobile-nav-badge">{badge > 99 ? "99+" : badge}</span>}
            </span>
            <span className="mobile-nav-label">{label}</span>
          </button>
        ))}
        <button className="mobile-nav-btn" onClick={toggleSidebar}>
          <span className="mobile-nav-icon">{ICONS.hamburger}</span>
          <span className="mobile-nav-label">More</span>
        </button>
      </nav>
    </div>
  );
};

export default AdminDashboard;
