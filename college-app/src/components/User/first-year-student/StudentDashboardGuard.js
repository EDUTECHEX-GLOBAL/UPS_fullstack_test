import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

export const isApplicationApproved = (user) => {
  if (!user) return false;
  return (user.applicationStatus || '').trim() === 'Approved';
};

const StudentDashboardGuard = ({ children }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // Check cached user data first
  const getCachedUser = () => {
    try {
      const raw = localStorage.getItem('userData');
      if (!raw || raw === 'undefined') return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const [checking, setChecking] = useState(Boolean(token));
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const verifyStatus = async () => {
      try {
        const [res, universityRes] = await Promise.all([
          axiosInstance.get('/api/students/me'),
          axiosInstance.get('/api/enrollment/university-selection'),
        ]);
        if (!isMounted) return;

        if (res.data?.success && res.data?.account) {
          const account = res.data.account;
          const universitySelection = universityRes.data?.data || {};
          const selectedUniversities = universitySelection.selectedUniversities || [];
          // Update localStorage with fresh account data
          try {
            const current = getCachedUser() || {};
            localStorage.setItem('userData', JSON.stringify({ ...current, ...account }));
          } catch (e) {}

          const hasSelectedUniversity = Array.isArray(selectedUniversities) &&
            selectedUniversities.length > 0 && universitySelection.status === 'Completed';
          const isApproved = isApplicationApproved(account) && hasSelectedUniversity;
          setAllowed(isApproved);

          if (!isApproved) {
            const status = (account.applicationStatus || '').trim();
            if (status === 'University Selection Pending' || (status === 'Approved' && !hasSelectedUniversity)) {
              navigate('/firstyear/enrollment/university', { replace: true });
            } else {
              const hasSubmitted = ['Submitted for Approval', 'Under Review'].includes(status);
              navigate(hasSubmitted ? '/firstyear/enrollment/review' : '/firstyear/enrollment/personal', { replace: true });
            }
          }
        }
      } catch (err) {
        if (!isMounted) return;
        // If 401 or token expired, redirect to sign-in
        if (err.response?.status === 401) {
          navigate('/sign-in', { replace: true });
        } else {
          setAllowed(false);
          navigate('/firstyear/enrollment/personal', { replace: true });
        }
      } finally {
        if (isMounted) setChecking(false);
      }
    };

    verifyStatus();

    return () => {
      isMounted = false;
    };
  }, [token, navigate]);

  // If no auth token, redirect to login
  if (!token) {
    return <Navigate to="/sign-in" replace />;
  }

  if (checking) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'Inter, system-ui, sans-serif',
        background: '#f8fafc',
        color: '#334155'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#0891b2',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '16px'
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Verifying application status...</p>
      </div>
    );
  }

  // If allowed, render the dashboard
  return allowed ? children : <Navigate to="/firstyear/enrollment/personal" replace />;
};

export default StudentDashboardGuard;
