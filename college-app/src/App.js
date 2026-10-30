// src/App.js - Updated for admin folder
import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

const RoleSelection = lazy(() => import("./components/RoleSelection"));
const AdminLogin = lazy(() => import("./components/AdminLogin"));
const AdminForgotPassword = lazy(() => import("./components/AdminForgotPassword"));
const ProcessAdminLogin = lazy(() => import("./components/processadmin/ProcessAdminLogin"));
const AdminDashboard = lazy(() => import("./components/admin/admindashboard"));
const ProcessAdminDashboard = lazy(() => import("./components/processadmin/processAdminDashboard"));
const Home = lazy(() => import("./components/Home"));
const CreateAccount = lazy(() => import("./components/CreateAccount"));
const FirstYearAccount = lazy(() => import("./components/User/first-year-student/FirstYearAccount"));
const SupportHelpBot = lazy(() => import("./components/User/first-year-student/SupportHelpBot"));
const SignIn = lazy(() => import("./components/SignIn"));
const ForgotPassword = lazy(() => import("./components/ForgotPassword"));
const Dashboard = lazy(() => import("./components/User/first-year-student/Dashboard"));
const EnrollmentDashboard = lazy(() => import("./components/User/first-year-student/Enrollment-application/enrollmentdashboard"));
const StudentDashboardGuard = lazy(() => import("./components/User/first-year-student/StudentDashboardGuard"));
const ApplicationStatus = lazy(() => import("./components/User/first-year-student/ApplicationStatus"));
const TemplateLandingPage = lazy(() => import("./template/TemplateLandingPage"));
const PageFallback = () => <div className="app-page-loading">Loading...</div>;
function App() {
  return (
    <Router>
      <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Study abroad template landing page */}
        <Route path="/" element={<TemplateLandingPage />} />
        <Route path="/roles" element={<RoleSelection />} />

        {/* Old Homepage */}
        <Route path="/home" element={<Home />} />

        {/* Create Account pages */}
        <Route path="/create-account" element={<FirstYearAccount />} />
        <Route path="/create-account/first-year" element={<FirstYearAccount />} />
        <Route path="/create-account/transfer" element={<FirstYearAccount />} />

        {/* Sign In */}
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/helpdesk" element={<SupportHelpBot />} />

        {/* Admin Routes */}
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin-forgot-password" element={<AdminForgotPassword />} />
        <Route path="/admin-dashboard/*" element={<AdminDashboard />} />

        {/* Process Admin Routes */}
        <Route path="/process-admin-login" element={<ProcessAdminLogin />} />
        <Route path="/process-admin-dashboard/*" element={<ProcessAdminDashboard />} />

       

        {/* Forgot Password Routes */}
        <Route path="/firstyear/forgot-password" element={<ForgotPassword />} />

        {/* Dashboard Routes */}
        <Route path="/firstyear/dashboard/*" element={<StudentDashboardGuard><Dashboard studentType="firstyear" /></StudentDashboardGuard>} />
        <Route path="/firstyear/enrollment/:section?" element={<EnrollmentDashboard />} />
        <Route path="/application-status" element={<ApplicationStatus />} />

        {/* Redirects */}
        <Route path="/admin-dashboard-old" element={<Navigate to="/sign-in" replace />} />
        <Route path="/student-dashboard" element={<Navigate to="/home" replace />} />

        {/* Catch All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
