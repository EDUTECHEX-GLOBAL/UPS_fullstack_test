import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ApplicationProgressPage.css';
import { FaHeadset } from 'react-icons/fa';
import { openSupportHelpdesk } from './supportHelpdesk';

/* ── Circular Progress Ring ── */
const ProgressRing = ({ percent = 0, size = 80 }) => {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div style={{ width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="ringGradAP" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0891b2" />
            <stop offset="100%" stopColor="#0e7490" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="url(#ringGradAP)" strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x={size / 2} y={size / 2 + 5}
          textAnchor="middle" fontSize={size * 0.2}
          fontWeight="700" fill="#0f172a"
        >
          {Math.round(percent)}%
        </text>
      </svg>
    </div>
  );
};

const getPctClass = (progress) => {
  if (progress >= 100) return 'appage-pct--success';
  if (progress >= 50) return 'appage-pct--progress';
  if (progress > 0) return 'appage-pct--warning';
  return 'appage-pct--zero';
};

const getActionLabel = (section) => {
  if (section.locked) return 'Unlock';
  if (section.progress >= 100) return 'Review';
  if (section.progress > 0) return 'Continue';
  return 'Get Started';
};

const getActionClass = (section) => {
  if (section.locked) return 'appage-action--locked';
  if (section.progress >= 100) return 'appage-action--done';
  return '';
};

/* ══════════════════════════════════════════════════════════
   APPLICATION PROGRESS PAGE
   Route: /firstyear/dashboard/applicationprogress
══════════════════════════════════════════════════════════ */
const ApplicationProgressPage = ({
  applicationSections = [],
  overallProgress = 0,
  completedSections = 0,
  totalSections = 0,
  onSectionClick,
  onLockedCardClick,
  lockTooltip,
  setLockTooltip,
  basePath,
  userData,
}) => {
  const navigate = useNavigate();

  const handleSectionClick = (section) => {
    if (section.locked) {
      onLockedCardClick(section.lockedFor);
      return;
    }
    if (section?.path) navigate(section.path);
  };

  return (
    <div className="application-progress-dashboard">
      {/* Lock modal rendered at this level too when navigating directly */}
      {lockTooltip?.visible && (
        <div
          className="lock-overlay"
          onClick={() => setLockTooltip({ visible: false, appType: null })}
        >
          <div className="lock-modal" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="lock-modal__close"
              onClick={() => setLockTooltip({ visible: false, appType: null })}
              aria-label="Close"
            >
              ×
            </button>
            <div className="lock-modal__icon"></div>
            <h3 className="lock-modal__title">
              {lockTooltip.appType === 'university'
                ? 'University Application Locked'
                : 'Master Application Locked'}
            </h3>
            <p className="lock-modal__desc">  
              To unlock the{' '}
              <strong>
                {lockTooltip.appType === 'university'
                  ? 'University Application'
                  : 'Master Application'}
              </strong>
              , go to <strong>College Search</strong>, select a{' '}
              {lockTooltip.appType === 'university' ? "bachelor's" : "master's"} university,
              and choose a program.
            </p>
            <div className="lock-modal__actions">
              <button
                type="button"
                className="lock-modal__btn lock-modal__btn--primary"
                onClick={() => {
                  setLockTooltip({ visible: false, appType: null });
                  navigate(`${basePath}/college-search`);
                }}
              >
                Go to College Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="dashboard-header">
        <div className="dashboard-header__inner">
          <div className="dashboard-header__title-group">
            <button
              type="button"
              className="appage-back-btn"
              onClick={() => navigate(basePath)}
            >
              ← Back
            </button>
            <div>
              <h1 className="dashboard-header__welcome">Application Progress</h1>
              <p className="dashboard-header__subtitle">
                View and complete all sections of your application
              </p>
            </div>
          </div>
          <div className="dashboard-header__actions">
            <button type="button" className="dashboard-helpdesk-btn" onClick={() => openSupportHelpdesk("Application Progress")}><FaHeadset /><span>Help Desk</span></button>
          </div>
        </div>
      </div>

      <div className="dashboard-body">

        {/* ── Progress Banner ── */}
        <div className="dashboard-progress-banner-new">
          <ProgressRing percent={overallProgress} size={80} />
          <div className="dashboard-banner__content-new">
            <div className="dashboard-banner__chip">
              {completedSections} of {totalSections} Sections Complete
            </div>
            <h2 className="dashboard-banner__title-new">
              {overallProgress >= 100
                ? 'Application Complete! Ready to Submit.'
                : overallProgress >= 50
                ? "Keep Going! You're Making Great Progress."
                : "Let's Get Started on Your Application!"}
            </h2>
            <p className="dashboard-banner__desc-new">
              {overallProgress >= 100
                ? 'All sections are complete. Review your application and submit.'
                : 'Complete the remaining sections to submit your application.'}
            </p>
          </div>
        </div>

        {/* ── Full Section List Card ── */}
        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <h2 className="dashboard-card__title">Application Progress</h2>
            <span className="dashboard-badge">
              {completedSections} of {totalSections} sections complete
            </span>
          </div>

          <div className="appage-section-list">
            {applicationSections.map((section, idx) => (
              <div
                key={idx}
                className={`appage-section-row${section.locked ? ' appage-section-row--locked' : ''}${section.progress >= 100 ? ' appage-section-row--completed' : ''}`}
                onClick={() => handleSectionClick(section)}
              >
                <div className="appage-section-inner">
                  <div className="appage-section-info">
                    <div className="appage-section-name-row">
                      <h4 className="appage-section-name">{section.name}</h4>
                      {section.locked && (
                        <span className="appage-lock-tag">LOCKED</span>
                      )}
                    </div>
                    <p className="appage-section-desc">{section.desc}</p>
                    {!section.locked && section.progress > 0 && section.progress < 100 && (
                      <div className="appage-prog-bar">
                        <div
                          className="appage-prog-fill"
                          style={{ width: `${section.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="appage-section-right">
                    <span className={`appage-pct ${getPctClass(section.progress)}`}>
                      {section.progress}%
                    </span>
                    <button
                      type="button"
                      className={`appage-action-btn ${getActionClass(section)}`}
                      onClick={e => {
                        e.stopPropagation();
                        handleSectionClick(section);
                      }}
                    >
                      {getActionLabel(section)}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ApplicationProgressPage;





