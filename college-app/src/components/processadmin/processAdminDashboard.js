// ProcessAdminDashboard.js — Teal Design System + Real EDUTECHEX SVG Logo
import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./processAdminDashboard.css";
import API_BASE_URL from "../../config/api";

const GusUniversity = React.lazy(() => import("./gusuniversity"));
const MasterUniversity = React.lazy(() => import("./MasterUniversity"));
const MedicalUniversity = React.lazy(() => import("./medicaluniversity"));
const ProcessAdminSupportTickets = React.lazy(() => import("./ProcessAdminSupportTickets"));


const PROCESS_ADMIN_TAB_TO_PATH = {
  dashboard: "/process-admin-dashboard",
  "gus-applications": "/process-admin-dashboard/gus-applications",
  "master-applications": "/process-admin-dashboard/master-applications",
  "medical-applications": "/process-admin-dashboard/medical-applications",
  "support-tickets": "/process-admin-dashboard/support-tickets",
};

const PROCESS_ADMIN_PATH_TO_TAB = {
  "/process-admin-dashboard": "dashboard",
  "/process-admin-dashboard/dashboard": "dashboard",
  "/process-admin-dashboard/gus": "gus-applications",
  "/process-admin-dashboard/gus-applications": "gus-applications",
  "/process-admin-dashboard/bachelor-applications": "gus-applications",
  "/process-admin-dashboard/master": "master-applications",
  "/process-admin-dashboard/master-applications": "master-applications",
  "/process-admin-dashboard/medical": "medical-applications",
  "/process-admin-dashboard/medical-applications": "medical-applications",
  "/process-admin-dashboard/support": "support-tickets",
  "/process-admin-dashboard/support-tickets": "support-tickets",
};

const getProcessAdminTabFromPath = (pathname = "") => {
  const normalized = pathname.replace(/\/+$/, "") || "/process-admin-dashboard";
  return PROCESS_ADMIN_PATH_TO_TAB[normalized] || "dashboard";
};
/* ─── Helpers ─── */
const getProcessAdminToken = () => {
  const token = localStorage.getItem('processAdminToken');
  if (token) { console.log('✅ Using processAdminToken'); return token; }
  console.error('❌ No process-admin token found');
  return null;
};

/* ─── SVG Icons ─── */
const IcoGrid = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IcoGradCap = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
  </svg>
);
const IcoFileText = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const IcoChevDown = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IcoChevRight = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IcoChevLeft = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IcoSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IcoUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const IcoLogout = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IcoCheck = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcoLines = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="15" y2="18"/>
  </svg>
);
const IcoHamburger = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="3" y1="6"  x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const IcoClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6"  y1="6" x2="18" y2="18"/>
  </svg>
);
const IcoHeadset = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <path d="M4 14a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2v-2Z" />
    <path d="M20 14a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2v-2Z" />
    <path d="M18 18c0 2-2 3-5 3h-1" />
  </svg>
);
const IcoRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

/* ─── Master University Icon ─── */
const IcoMortarBoard = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 22 8.5 12 15 2 8.5 12 2"/>
    <path d="M6 11.5V17c0 0 2 3 6 3s6-3 6-3v-5.5"/>
    <line x1="22" y1="8.5" x2="22" y2="14"/>
  </svg>
);



/* ─── EDUTECHEX SVG LOGO ─── */
const EdutechExLogo = () => (
  <div className="pad-logo-wrap">
    <svg className="pad-logo-svg" viewBox="0 0 506 106" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="pad-lg1" gradientUnits="userSpaceOnUse" x1="516.3248" y1="53.11" x2="67.3956" y2="53.11" gradientTransform="matrix(1 0 0 -1 0 106.11)">
          <stop offset="0"    stopColor="#3C4C9B"/>
          <stop offset="0.08" stopColor="#3A4999"/>
          <stop offset="0.40" stopColor="#323E91"/>
          <stop offset="0.71" stopColor="#2A3887"/>
          <stop offset="1"    stopColor="#293682"/>
        </linearGradient>
        <linearGradient id="pad-lg2" gradientUnits="userSpaceOnUse" x1="398.72" y1="52.8" x2="485.17" y2="52.8">
          <stop offset="0"   stopColor="#14b8a6"/>
          <stop offset="0.5" stopColor="#0ea5e9"/>
          <stop offset="1"   stopColor="#6366f1"/>
        </linearGradient>
        <clipPath id="pad-cp1">
          <polygon points="460.82,22.08 446.1,22.08 467.17,49.13 398.72,49.13 398.72,57.31 467.13,57.32 446.73,83.52 461.45,83.52 485.17,53.35"/>
        </clipPath>
      </defs>
      <path fill="url(#pad-lg1)" d="M39.36,30.19c1.18,0,2.17-0.38,2.96-1.13c0.79-0.75,1.21-1.75,1.21-2.88c0-1.12-0.41-2.12-1.19-2.9c-0.79-0.79-1.79-1.19-2.98-1.19H3.97c-1.13,0-2.11,0.39-2.92,1.17C0.23,24.04-0.2,25.08-0.2,26.26v53.05c0,1.14,0.41,2.13,1.23,2.94c0.82,0.82,1.8,1.23,2.95,1.23h35.4c1.19,0,2.19-0.4,2.98-1.19c0.78-0.78,1.19-1.78,1.19-2.9c0-1.14-0.42-2.13-1.21-2.88c-0.79-0.75-1.78-1.13-2.96-1.13H8.15V56.76h22.4c1.09,0,2.05-0.37,2.84-1.09c0.83-0.77,1.33-1.87,1.33-3c0-1.12-0.41-2.12-1.19-2.9c-0.79-0.79-1.79-1.18-2.98-1.18H8.13V30.19H39.36zM85.62,26.01c-4.64-2.61-9.98-3.93-15.84-3.93H56.19c-1.18,0-2.19,0.4-2.98,1.18c-0.79,0.79-1.19,1.79-1.19,2.98V79.3c0,1.19,0.4,2.19,1.19,2.98c0.79,0.79,1.79,1.19,2.98,1.19h13.59c5.87,0,11.2-1.33,15.84-3.93c4.66-2.61,8.33-6.31,10.92-10.96c2.58-4.64,3.89-9.97,3.89-15.84c0-5.87-1.31-11.19-3.89-15.81C93.95,32.3,90.28,28.63,85.62,26.01zM89.31,64.6c-0.8,1.45-1.74,2.78-2.81,3.98c-1.47,1.65-3.17,3.06-5.12,4.2c-3.37,1.97-7.27,2.96-11.61,2.96h-9.42V29.81h9.42c3.99,0,7.61,0.85,10.79,2.49c0.28,0.14,0.56,0.28,0.83,0.44c0.51,0.29,0.99,0.61,1.47,0.94c1.6,1.1,3.01,2.41,4.23,3.91c0.82,1.01,1.57,2.1,2.22,3.28c1.9,3.47,2.87,7.47,2.87,11.86C92.17,57.13,91.21,61.13,89.31,64.6zM155.13,22.08c-1.19,0-2.19,0.4-2.98,1.19c-0.79,0.79-1.19,1.79-1.19,2.98v36.53c0,2.66-0.68,5.07-2.03,7.14c-1.36,2.09-3.26,3.75-5.66,4.93c-2.44,1.2-5.28,1.8-8.44,1.8c-3.22,0-6.11-0.61-8.6-1.8c-2.45-1.18-4.37-2.83-5.73-4.92c-1.34-2.07-2.03-4.48-2.03-7.14V26.25c0-1.18-0.4-2.19-1.19-2.98c-0.79-0.79-1.79-1.19-2.98-1.19c-1.19,0-2.19,0.4-2.98,1.19s-1.19,1.79-1.19,2.98v36.53c0,4.2,1.07,8.01,3.17,11.33c2.1,3.33,5.07,5.95,8.84,7.8c3.72,1.83,7.99,2.77,12.69,2.77c4.65,0,8.87-0.93,12.55-2.77c3.71-1.85,6.65-4.48,8.75-7.8c2.1-3.33,3.17-7.14,3.17-11.33V26.25c0-1.18-0.4-2.19-1.19-2.98C157.33,22.48,156.32,22.08,155.13,22.08zM214.04,23.19c-0.73-0.72-1.71-1.11-2.83-1.11h-41.73c-1.12,0-2.1,0.39-2.83,1.11c-0.74,0.74-1.12,1.69-1.12,2.83c0,1.07,0.39,2.02,1.11,2.75c0.74,0.74,1.69,1.12,2.83,1.12h16.66v49.42c0,1.14,0.41,2.13,1.23,2.94c0.8,0.8,1.82,1.23,2.95,1.23c1.27,0,2.37-0.5,3.17-1.44c0.67-0.8,1-1.84,1-2.88V29.89h16.74c1.14,0,2.09-0.37,2.83-1.11c0.73-0.73,1.12-1.68,1.12-2.75C215.15,24.9,214.77,23.92,214.04,23.19zM260.94,30.19c1.18,0,2.17-0.38,2.96-1.13c0.79-0.75,1.21-1.75,1.21-2.88c0-1.12-0.41-2.12-1.19-2.9c-0.79-0.79-1.79-1.19-2.98-1.19h-35.4c-1.13,0-2.11,0.39-2.92,1.17c-0.82,0.78-1.25,1.82-1.25,3v53.05c0,1.14,0.41,2.13,1.23,2.94c0.82,0.82,1.8,1.23,2.95,1.23h35.4c1.19,0,2.19-0.4,2.98-1.19c0.78-0.78,1.19-1.78,1.19-2.9c0-1.14-0.42-2.13-1.21-2.88c-0.79-0.75-1.78-1.13-2.96-1.13h-31.23V56.76h22.4c1.09,0,2.05-0.37,2.84-1.09c0.83-0.77,1.33-1.87,1.33-3c0-1.12-0.41-2.12-1.19-2.9c-0.79-0.79-1.79-1.18-2.98-1.18h-22.4V30.19H260.94zM290.19,32.53c3.41-2.1,7.15-3.18,11.13-3.18c2.91,0,5.5,0.38,7.68,1.14c2.15,0.75,4.17,1.96,5.99,3.6c0.73,0.66,1.64,0.99,2.71,0.99c0.61,0,1.2-0.15,1.74-0.47c0.45-0.26,0.8-0.6,1.02-1.02c0.37-0.24,0.67-0.56,0.92-0.95c0.32-0.52,0.48-1.1,0.48-1.74c0-1.15-0.46-2.09-1.27-2.68c-2.87-2.4-5.88-4.17-8.98-5.27c-3.09-1.1-6.55-1.66-10.3-1.66c-5.58,0-10.77,1.43-15.42,4.25c-4.64,2.82-8.36,6.67-11.07,11.46c-2.71,4.79-4.08,10.07-4.08,15.69c0,5.68,1.39,10.98,4.12,15.77c2.73,4.79,6.47,8.65,11.11,11.46c4.65,2.82,9.82,4.25,15.35,4.25c7.88,0,14.38-2.29,19.31-6.81l0.07-0.07c0.77-0.83,1.15-1.82,1.15-2.94c0-1.18-0.42-2.2-1.21-2.96c-0.79-0.75-1.73-1.13-2.8-1.13c-0.82,0-1.61,0.28-2.42,0.87c-4.18,3.33-8.93,5.02-14.11,5.02c-4.03,0-7.8-1.06-11.21-3.14c-3.42-2.09-6.17-4.96-8.17-8.53c-2-3.57-3.01-7.53-3.01-11.78c0-4.14,1.02-8.06,3.05-11.62C283.99,37.54,286.76,34.65,290.19,32.53zM378.8,22.08c-0.86-0.02-1.73,0.21-2.44,0.69c-1.2,0.81-1.84,2.04-1.84,3.48v22.32h-34.38V26.25c0-1.18-0.4-2.19-1.19-2.98c-0.79-0.79-1.79-1.19-2.98-1.19c-1.13,0-2.11,0.39-2.92,1.17c-0.82,0.78-1.25,1.82-1.25,3V79.3c0,1.14,0.41,2.13,1.23,2.94c0.82,0.82,1.8,1.23,2.95,1.23c1.27,0,2.37-0.5,3.17-1.44c0.67-0.8,1-1.84,1-2.88V56.3h34.38v23c0,1.12,0.42,2.14,1.23,2.94c0.82,0.82,1.8,1.23,2.95,1.23c1.27,0,2.37-0.5,3.17-1.44c0.67-0.8,1-1.84,1-2.88v-52.9c0-1.18-0.4-2.19-1.19-2.98C380.89,22.5,379.94,22.1,378.8,22.08z"/>
      <path fill="url(#pad-lg1)" d="M446.1,30.26l-47.37,0.01v-8.18h18.89h22.54L446.1,30.26z"/>
      <path fill="url(#pad-lg1)" d="M446.1,75.34l-47.37-0.01v8.18h18.89h22.54L446.1,75.34z"/>
      <path fill="url(#pad-lg1)" d="M505.57,83.52h-10.57L481.9,66.68l5.28-6.78L505.57,83.52z"/>
      <path fill="url(#pad-lg1)" d="M495.63,22.08l-13.68,17.56l5.28,6.78l18.96-24.35L495.63,22.08z"/>
      <polygon clipPath="url(#pad-cp1)" fill="url(#pad-lg2)" points="460.82,22.08 446.1,22.08 467.17,49.13 398.72,49.13 398.72,57.32 467.13,57.32 446.73,83.52 461.45,83.52 485.17,53.35"/>
    </svg>
  </div>
);

/* ─── Stat icon wrapper ─── */
const StatIcon = ({ bg, stroke, children }) => (
  <div className="pad-stat-ico" style={{ background: bg }}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  </div>
);

/* ─── Skeleton loader for stat cards ─── */
const SkeletonCard = () => (
  <div className="pad-stat-card" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
    <div style={{ width: 44, height: 44, borderRadius: 11, background: '#eef0f4', flexShrink: 0 }} />
    <div style={{ flex: 1 }}>
      <div style={{ width: 60, height: 24, borderRadius: 6, background: '#eef0f4', marginBottom: 8 }} />
      <div style={{ width: 90, height: 12, borderRadius: 4, background: '#f4f6f9' }} />
    </div>
  </div>
);

/* ─── Skeleton row for table ─── */
const SkeletonRow = () => (
  <tr>
    {[1,2,3,4,5].map(i => (
      <td key={i}>
        <div style={{ height: 14, borderRadius: 4, background: '#eef0f4', width: i === 1 ? '80%' : i === 4 ? 60 : '60%' }} />
      </td>
    ))}
    <td />
  </tr>
);

/* ════════════════════════════════════════
   COMPONENT
════════════════════════════════════════ */
const ProcessAdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen,       setSidebarOpen]       = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab,         setActiveTab]         = useState(() => getProcessAdminTabFromPath(window.location.pathname));
  const [processAdminData,  setProcessAdminData]  = useState(null);
  const [loading,           setLoading]           = useState(true);

  /* Sidebar expand state */
  const [gusExpanded,    setGusExpanded]    = useState(false);
  const [masterExpanded, setMasterExpanded] = useState(false);
  const [medicalExpanded, setMedicalExpanded] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  /* ── Dashboard API state ── */
  const [stats,           setStats]           = useState(null);
  const [statsLoading,    setStatsLoading]    = useState(false);
  const [recentApps,      setRecentApps]      = useState([]);
  const [recentLoading,   setRecentLoading]   = useState(false);
  const [dashboardError,  setDashboardError]  = useState(null);



  /* ── Mobile detection ── */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  useEffect(() => {
    document.body.style.overflow = mobileSidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileSidebarOpen]);

  useEffect(() => {
    const nextTab = getProcessAdminTabFromPath(location.pathname);
    setActiveTab((currentTab) => currentTab === nextTab ? currentTab : nextTab);
    setGusExpanded(nextTab === "gus-applications");
    setMasterExpanded(nextTab === "master-applications");
    setMedicalExpanded(nextTab === "medical-applications");
  }, [location.pathname]);
  /* ── Auth check ── */
  useEffect(() => {
    const token     = getProcessAdminToken();
    const adminData = localStorage.getItem('processAdminData');
    if (!token) { navigate("/process-admin-login"); return; }
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    try { if (adminData) setProcessAdminData(JSON.parse(adminData)); }
    catch (e) { console.error("Error parsing admin data:", e); }
    setLoading(false);
  }, [navigate]);

  /* ── Fetch dashboard data ── */
  const fetchDashboardData = useCallback(async () => {
    const token = getProcessAdminToken();
    if (!token) { navigate('/process-admin-login'); return; }

    setStatsLoading(true);
    setRecentLoading(true);
    setDashboardError(null);

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, recentRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/process-admin/dashboard/stats`,               { headers }),
        axios.get(`${API_BASE_URL}/api/process-admin/dashboard/recent-applications`, { headers }),
      ]);

      if (statsRes.data?.success)  setStats(statsRes.data.stats);
      if (recentRes.data?.success) setRecentApps(recentRes.data.data || []);

    } catch (error) {
      console.error('❌ Dashboard fetch error:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('processAdminToken');
        localStorage.removeItem('processAdminData');
        navigate('/process-admin-login');
      } else {
        setDashboardError('Failed to load dashboard data. Please try again.');
      }
    } finally {
      setStatsLoading(false);
      setRecentLoading(false);
    }
  }, [navigate]);

  /* Fetch when dashboard tab is active */
  useEffect(() => {
    if (activeTab === 'dashboard' && !loading) {
      fetchDashboardData();
    }
  }, [activeTab, loading, fetchDashboardData]);

  const handleLogout = () => {
    localStorage.removeItem('processAdminToken');
    localStorage.removeItem('processAdminData');
    localStorage.removeItem('processAdminEmail');
    delete axios.defaults.headers.common['Authorization'];
    navigate("/process-admin-login");
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(PROCESS_ADMIN_TAB_TO_PATH[tab] || PROCESS_ADMIN_TAB_TO_PATH.dashboard);
    closeMobileSidebar();
  };

  /* ── Status badge class ── */
  const getBadgeClass = (statusType) => {
    if (statusType === 'approved') return 'pad-badge pad-approved';
    if (statusType === 'review')   return 'pad-badge pad-review';
    return 'pad-badge pad-pending';
  };

  /* ── Status badge icon ── */
  const getBadgeIcon = (statusType) => {
    if (statusType === 'approved') return '✓ ';
    if (statusType === 'review')   return '● ';
    return '● ';
  };

  /* ── Type pill ── */
  const getTypePill = (type) => {
    if (type === 'master') {
      return (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px',
          borderRadius: 20, background: '#ede9fe', color: '#7c3aed',
          marginLeft: 6, verticalAlign: 'middle'
        }}>Master</span>
      );
    }
    return (
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '2px 8px',
        borderRadius: 20, background: '#e0f2fe', color: '#0284c7',
        marginLeft: 6, verticalAlign: 'middle'
      }}>Bachelor</span>
    );
  };

  /* ── Activity dot colour ── */
  const getActivityDot = (type) =>
    type === 'master' ? 'pad-act-dot pad-dot-indigo' : 'pad-act-dot pad-dot-teal';

  /* ── Dashboard render ── */
  const renderDashboard = () => (
    <div className="pad-dash">

      {/* Error banner */}
      {dashboardError && (
        <div style={{
          background: '#fff1f2', border: '1.5px solid #fecaca', borderRadius: 10,
          padding: '12px 18px', marginBottom: 16, display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
            ⚠ {dashboardError}
          </span>
          <button
            onClick={fetchDashboardData}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, border: 'none',
              background: '#ef4444', color: '#fff', fontSize: 12,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
            }}
          >
            <IcoRefresh /> Retry
          </button>
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="pad-stats-row">

        {statsLoading ? (
          [1,2,3,4,5].map(i => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="pad-stat-card">
              <StatIcon bg="#e0f2fe" stroke="#0284c7">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </StatIcon>
              <div>
                <div className="pad-sv">{stats?.totalApplications ?? 0}</div>
                <div className="pad-sl">Total Applications</div>
              </div>
            </div>

            <div className="pad-stat-card">
              <StatIcon bg="#ccfbf1" stroke="#0d9488">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </StatIcon>
              <div>
                <div className="pad-sv">{stats?.bachelor?.total ?? 0}</div>
                <div className="pad-sl">Bachelor Apps</div>
              </div>
            </div>

            <div className="pad-stat-card">
              <StatIcon bg="#ede9fe" stroke="#7c3aed">
                <polygon points="12 2 22 8.5 12 15 2 8.5 12 2"/>
                <path d="M6 11.5V17c0 0 2 3 6 3s6-3 6-3v-5.5"/>
                <line x1="22" y1="8.5" x2="22" y2="14"/>
              </StatIcon>
              <div>
                <div className="pad-sv">{stats?.master?.total ?? 0}</div>
                <div className="pad-sl">Master Apps</div>
              </div>
            </div>

            <div className="pad-stat-card">
              <StatIcon bg="#d1fae5" stroke="#059669">
                <polyline points="20 6 9 17 4 12"/>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              </StatIcon>
              <div>
                <div className="pad-sv">{stats?.totalCompleted ?? 0}</div>
                <div className="pad-sl">Completed</div>
              </div>
            </div>

            <div className="pad-stat-card">
              <StatIcon bg="#fef3c7" stroke="#d97706">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </StatIcon>
              <div>
                <div className="pad-sv">{stats?.totalPending ?? 0}</div>
                <div className="pad-sl">Pending Reviews</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Charts row ── */}
      <div className="pad-charts-row">
        {/* Bachelor breakdown chart */}
        <div className="pad-chart-card">
          <div className="pad-chart-hdr">
            <span className="pad-chart-title"><strong>Bachelor</strong> Applications</span>
            <div className="pad-pills">
              <span className="pad-pill pad-pill-teal">{stats?.bachelor?.total ?? 0} Total</span>
              <span className="pad-pill pad-pill-amber">{stats?.bachelor?.inProgress ?? 0} Active</span>
            </div>
          </div>
          <div className="pad-chart-body">
            <svg viewBox="0 0 500 120" preserveAspectRatio="none" width="100%" height="120">
              <defs>
                <linearGradient id="pad-lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.18"/>
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.01"/>
                </linearGradient>
              </defs>
              {[10,35,60,85].map((y, i) => (
                <line key={i} x1="22" y1={y} x2="498" y2={y} stroke="#eef0f4" strokeWidth="1"/>
              ))}
              <path d="M28,105 L98,80 L170,65 L244,63 L318,38 L393,50 L468,34 L468,112 L28,112Z" fill="url(#pad-lineGrad)"/>
              <path d="M28,105 L98,80 L170,65 L244,63 L318,38 L393,50 L468,34"
                stroke="#14b8a6" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              {[[28,105],[98,80],[170,65],[244,63],[318,38],[393,50],[468,34]].map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r={i === 4 ? 5 : 3.5}
                  fill={i === 4 ? "#14b8a6" : "white"} stroke="#14b8a6" strokeWidth="2"/>
              ))}
            </svg>
          </div>
          <div className="pad-chart-footer">
            <span className="pad-cfi">
              <span className="pad-cfd" style={{ background: '#14b8a6' }}></span>
              <strong>{stats?.bachelor?.completed ?? 0}</strong> Completed
            </span>
            <span className="pad-cfi">
              <span className="pad-cfd" style={{ background: '#0d9488' }}></span>
              <strong>{stats?.bachelor?.inProgress ?? 0}</strong> In Progress
            </span>
            <span className="pad-cfi">
              <span className="pad-cfd" style={{ background: '#f59e0b' }}></span>
              <strong>{stats?.bachelor?.incomplete ?? 0}</strong> Incomplete
            </span>
            <span className="pad-lines-ico"><IcoLines /></span>
          </div>
        </div>

        {/* Master breakdown chart */}
        <div className="pad-chart-card">
          <div className="pad-chart-hdr">
            <span className="pad-chart-title"><strong>Master</strong> Applications</span>
            <div className="pad-pills">
              <span className="pad-pill pad-pill-teal">{stats?.master?.total ?? 0} Total</span>
              <span className="pad-pill pad-pill-amber">{stats?.master?.underReview ?? 0} Review</span>
            </div>
          </div>
          <div className="pad-chart-body">
            <svg viewBox="0 0 400 120" preserveAspectRatio="none" width="100%" height="120">
              {[10,35,60,85].map((y, i) => (
                <line key={i} x1="22" y1={y} x2="398" y2={y} stroke="#eef0f4" strokeWidth="1"/>
              ))}
              {/* Dynamic bar heights based on real data */}
              {(() => {
                const total     = Math.max(stats?.master?.total ?? 1, 1);
                const submitted = stats?.master?.submitted    ?? 0;
                const draft     = stats?.master?.draft        ?? 0;
                const review    = stats?.master?.underReview  ?? 0;
                const maxH      = 95;
                const subH  = Math.max(Math.round((submitted / total) * maxH), 4);
                const draftH = Math.max(Math.round((draft    / total) * maxH), 4);
                const revH  = Math.max(Math.round((review   / total) * maxH), 4);
                return (
                  <>
                    <rect x="60"  y={105 - subH}  width="60" height={subH}  rx="5" fill="#14b8a6" opacity="0.85"/>
                    <rect x="170" y={105 - draftH} width="60" height={draftH} rx="5" fill="#f59e0b" opacity="0.85"/>
                    <rect x="280" y={105 - revH}   width="60" height={revH}  rx="5" fill="#7c3aed" opacity="0.85"/>
                  </>
                );
              })()}
            </svg>
          </div>
          <div className="pad-bar-xlbls">
            <span style={{ flex: 1, textAlign: 'center' }}>Submitted</span>
            <span style={{ flex: 1, textAlign: 'center' }}>Draft</span>
            <span style={{ flex: 1, textAlign: 'center' }}>Under Review</span>
          </div>
          <div className="pad-chart-footer">
            <span className="pad-cfi">
              <span className="pad-cfd" style={{ background: '#14b8a6' }}></span>
              <strong>{stats?.master?.submitted ?? 0}</strong> Submitted
            </span>
            <span className="pad-cfi">
              <span className="pad-cfd" style={{ background: '#f59e0b' }}></span>
              <strong>{stats?.master?.draft ?? 0}</strong> Draft
            </span>
            <span className="pad-cfi">
              <span className="pad-cfd" style={{ background: '#7c3aed' }}></span>
              <strong>{stats?.master?.underReview ?? 0}</strong> Review
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="pad-bottom-row">

        {/* Recent Applications table */}
        <div className="pad-table-card">
          <div className="pad-table-hdr">
            <span className="pad-section-title">Recent Applications</span>
            <button
              onClick={fetchDashboardData}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--primary)', fontSize: 12, fontWeight: 700,
                fontFamily: 'Outfit, sans-serif', padding: '4px 8px',
                borderRadius: 7, transition: 'background .2s',
              }}
              title="Refresh"
            >
              <IcoRefresh /> Refresh
            </button>
          </div>

          <table className="pad-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>University</th>
                <th>Program</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentLoading ? (
                [1,2,3,4,5].map(i => <SkeletonRow key={i} />)
              ) : recentApps.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '28px 18px', color: 'var(--text-lt)', fontSize: 13 }}>
                    No applications found.
                  </td>
                </tr>
              ) : (
                recentApps.map((app) => (
                  <tr key={app._id}>
                    <td style={{ fontWeight: 600 }}>
                      {app.studentName}
                      {getTypePill(app.type)}
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-mid)' }}>{app.university}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-lt)' }}>{app.program}</td>
                    <td>
                      <span className={getBadgeClass(app.statusType)}>
                        {getBadgeIcon(app.statusType)}{app.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-lt)' }}>{app.date}</td>
                    <td className="pad-chev">∨</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="pad-mobile-app-list">
            {recentLoading ? (
              [1, 2, 3].map((item) => <div className="pad-mobile-app-skeleton" key={item} />)
            ) : recentApps.length === 0 ? (
              <div className="pad-mobile-app-empty">No applications found.</div>
            ) : recentApps.map((app) => (
              <article className="pad-mobile-app-card" key={`mobile-${app._id}`}>
                <div className="pad-mobile-app-top">
                  <div className="pad-mobile-app-student">
                    <strong>{app.studentName || 'Student'}</strong>
                    {getTypePill(app.type)}
                  </div>
                  <span className={getBadgeClass(app.statusType)}>
                    {getBadgeIcon(app.statusType)}{app.status}
                  </span>
                </div>
                <div className="pad-mobile-app-detail">
                  <span>University</span>
                  <strong title={app.university}>{app.university || 'Not selected'}</strong>
                </div>
                {app.program && <div className="pad-mobile-app-detail program">
                  <span>Program</span>
                  <strong title={app.program}>{app.program}</strong>
                </div>}
                <div className="pad-mobile-app-date">{app.date}</div>
              </article>
            ))}
          </div>

          <div className="pad-table-footer">
            <button
              className="pad-view-all-btn"
              onClick={() => handleTabChange('gus-applications')}
            >
              View Bachelor &rsaquo;
            </button>
            <button
              className="pad-view-all-btn"
              style={{ marginLeft: 8 }}
              onClick={() => handleTabChange('master-applications')}
            >
              View Master &rsaquo;
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="pad-activity-card">
          <div className="pad-activity-hdr">
            <span className="pad-section-title">Recent Activity</span>
            <span className="pad-activity-arrow">‹</span>
          </div>
          <div className="pad-activity-list">
            {recentLoading ? (
              [1,2,3,4].map(i => (
                <div key={i} className="pad-act-item">
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#eef0f4', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 12, borderRadius: 4, background: '#eef0f4', width: '80%', marginBottom: 5 }} />
                    <div style={{ height: 10, borderRadius: 4, background: '#f4f6f9', width: '60%' }} />
                  </div>
                </div>
              ))
            ) : recentApps.length === 0 ? (
              <div style={{ color: 'var(--text-lt)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                No recent activity.
              </div>
            ) : (
              <>
                <div className="pad-act-day">Recent</div>
                {recentApps.slice(0, 5).map((app) => (
                  <div key={app._id} className="pad-act-item">
                    <span className={getActivityDot(app.type)}>
                      <IcoCheck />
                    </span>
                    <span className="pad-act-txt">
                      <strong>{app.studentName}:</strong>{' '}
                      {app.type === 'master' ? 'Master' : 'Bachelor'} application{' '}
                      <span style={{
                        color: app.statusType === 'approved' ? 'var(--primary)'
                             : app.statusType === 'review'   ? 'var(--blue)'
                             : '#92400e',
                        fontWeight: 600
                      }}>
                        {app.status.toLowerCase()}
                      </span>
                      {' '}— {app.university}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  /* Content switcher */
  const renderContent = () => {
    let ContentComponent = null;
    switch (activeTab) {
      case "dashboard":          return renderDashboard();
      case "gus-applications":   ContentComponent = GusUniversity; break;
      case "master-applications": ContentComponent = MasterUniversity; break;
      case "medical-applications": ContentComponent = MedicalUniversity; break;
      case "support-tickets": ContentComponent = ProcessAdminSupportTickets; break;
      default:                   return null;
    }
    return (
      <React.Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading application module...</div>}>
        <ContentComponent />
      </React.Suspense>
    );
  };

  if (loading) return (
    <div className="process-admin-dashboard">
      <div className="loading-container">
        <div className="loading-spinner"/>
        <p>Loading dashboard…</p>
      </div>
    </div>
  );

  const sidebarClass = [
    'sidebar',
    !isMobile && (sidebarOpen ? 'open' : 'closed'),
    isMobile  && mobileSidebarOpen && 'mobile-open',
  ].filter(Boolean).join(' ');

  return (
    <div className="process-admin-dashboard">

      {isMobile && (
        <div
          className={`pad-mob-overlay ${mobileSidebarOpen ? 'show' : ''}`}
          onClick={closeMobileSidebar}
        />
      )}

      {/* ══ SIDEBAR ══ */}
      <div className={sidebarClass}>
        <div className="sidebar-header">
          <EdutechExLogo />
          {!isMobile && (
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(p => !p)}>
              {sidebarOpen ? <IcoChevLeft /> : <IcoChevRight />}
            </button>
          )}
          {isMobile && (
            <button className="sidebar-toggle" onClick={closeMobileSidebar}>
              <IcoClose />
            </button>
          )}
        </div>

        <ul className="sidebar-menu">
          {/* Dashboard */}
          <li
            className={activeTab === "dashboard" ? "active" : ""}
            onClick={() => handleTabChange("dashboard")}
          >
            <span className="sb-ico sb-teal"><IcoGrid /></span>
            {(sidebarOpen || isMobile) && <span>Dashboard</span>}
          </li>

          {/* Bachelor Application */}
          <li
            className={`kansas-parent ${gusExpanded ? 'expanded' : ''}`}
            onClick={() => setGusExpanded(p => !p)}
          >
            <span className="sb-ico sb-teal"><IcoGradCap /></span>
            {(sidebarOpen || isMobile) && (
              <>
                <span>Bachelor Application</span>
                <span className="dropdown-arrow">
                  {gusExpanded ? <IcoChevDown /> : <IcoChevRight />}
                </span>
              </>
            )}
          </li>
          {gusExpanded && (sidebarOpen || isMobile) && (
            <ul className="sub-menu">
              <li
                className={activeTab === "gus-applications" ? "active" : ""}
                onClick={() => handleTabChange("gus-applications")}
              >
                <span className="sb-ico sb-ico-sm sb-teal"><IcoFileText /></span>
                <span>Applications</span>
              </li>
            </ul>
          )}

          {/* Master Application */}
          <li
            className={`kansas-parent ${masterExpanded ? 'expanded' : ''}`}
            onClick={() => setMasterExpanded(p => !p)}
          >
            <span className="sb-ico sb-indigo"><IcoMortarBoard /></span>
            {(sidebarOpen || isMobile) && (
              <>
                <span>Master Application</span>
                <span className="dropdown-arrow">
                  {masterExpanded ? <IcoChevDown /> : <IcoChevRight />}
                </span>
              </>
            )}
          </li>
          {masterExpanded && (sidebarOpen || isMobile) && (
            <ul className="sub-menu">
              <li
                className={activeTab === "master-applications" ? "active" : ""}
                onClick={() => handleTabChange("master-applications")}
              >
                <span className="sb-ico sb-ico-sm sb-teal"><IcoFileText /></span>
                <span>Applications</span>
              </li>
            </ul>
          )}

          {/* Medical Application */}
          <li
            className={`kansas-parent ${medicalExpanded ? 'expanded' : ''}`}
            onClick={() => setMedicalExpanded(p => !p)}
          >
            {(sidebarOpen || isMobile) && (
              <>
                <span>Medical Application</span>
                <span className="dropdown-arrow">
                  {medicalExpanded ? <IcoChevDown /> : <IcoChevRight />}
                </span>
              </>
            )}
          </li>
          {medicalExpanded && (sidebarOpen || isMobile) && (
            <ul className="sub-menu">
              <li
                className={activeTab === "medical-applications" ? "active" : ""}
                onClick={() => handleTabChange("medical-applications")}
              >
                <span className="sb-ico sb-ico-sm sb-teal"><IcoFileText /></span>
                <span>Applications</span>
              </li>
            </ul>
          )}

          <li
            className={activeTab === "support-tickets" ? "active" : ""}
            onClick={() => handleTabChange("support-tickets")}
          >
            <span className="sb-ico sb-blue"><IcoHeadset /></span>
            {(sidebarOpen || isMobile) && <span>Support Tickets</span>}
          </li>
        </ul>

        <div className="sidebar-footer">
          <button className="logout-btn-sidebar" onClick={handleLogout}>
            <span className="logout-circle"><IcoLogout /></span>
            {(sidebarOpen || isMobile) && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <div className="main-content">
        <nav className="navbar">
          <div className="navbar-left">
            <button
              className="pad-hamburger"
              onClick={() => setMobileSidebarOpen(p => !p)}
              aria-label="Toggle menu"
            >
              <IcoHamburger />
            </button>
            <h1>Process Admin <span>Dashboard</span></h1>
          </div>
          <div className="navbar-center">
            <div className="search-container">
              <span className="search-icon-left"><IcoSearch /></span>
              <input
                type="text"
                placeholder="Search applications, documents..."
                className="search-input"
              />
            </div>
          </div>
          <div className="navbar-right">
            
            <div className="admin-profile">
              <div className="profile-icon"><IcoUser /></div>
              <span className="profile-name">
                {processAdminData?.email || "process-admin@..."}
              </span>
            </div>
           
          </div>
        </nav>

        <div className="content-area">{renderContent()}</div>

        <footer className="dashboard-footer">
          © 2026 Process Admin Dashboard — EduTechEx. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default ProcessAdminDashboard;

