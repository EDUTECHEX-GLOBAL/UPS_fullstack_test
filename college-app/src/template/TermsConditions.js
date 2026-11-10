import React from 'react';
import './termsconditions.css';

const TermsConditions = () => {
  return (
    <div className="legal-page-v2">
      {/* Hero Header */}
      <section className="legal-v2-hero">
        <div className="legal-v2-hero-container">
          <div className="legal-v2-hero-text">
            <h1 className="legal-v2-hero-title">Terms &amp; Conditions</h1>
            <p className="legal-v2-hero-sub">
              Please read these terms carefully before using our platform.
            </p>
            <div className="legal-v2-hero-accent-line" />
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="legal-v2-content-section">
        <div className="legal-v2-card">
          {/* Effective Date Row */}
          <div className="legal-v2-date-row">
            <span className="legal-v2-calendar-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <span>Effective Date: 4 November 2026</span>
          </div>

          {/* 2-Column Content Grid */}
          <div className="legal-v2-grid">
            {/* Column 1 - Left */}
            {/* 1. Introduction */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">1</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">Introduction</h2>
                <p className="legal-v2-item-desc">
                  Welcome to EduTechEx. These Terms and Conditions govern your access to and use
                  of the EduTechEx website, SAT practice platform, mock examinations, learning
                  resources, and related services.
                </p>
                <p className="legal-v2-item-desc">
                  By creating an account or using our services, you agree to these Terms and Conditions.
                </p>
              </div>
            </div>

            {/* 6. Intellectual Property */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">6</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">Intellectual Property</h2>
                <p className="legal-v2-item-desc">
                  All content, including logos, designs, educational materials, and software, belongs to
                  EduTechEx or its licensors. You may not reproduce or distribute this content without
                  prior written permission.
                </p>
              </div>
            </div>

            {/* 2. Eligibility and Student Accounts */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">2</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">Eligibility and Student Accounts</h2>
                <ul className="legal-v2-item-list">
                  <li>Students must provide accurate and complete registration information.</li>
                  <li>Students are responsible for maintaining the confidentiality of their login credentials.</li>
                  <li>One account should be used by one individual student.</li>
                </ul>
              </div>
            </div>

            {/* 7. Test Results and Performance */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">7</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">Test Results and Performance</h2>
                <p className="legal-v2-item-desc">
                  Results are generated based on submitted answers and our scoring methodology.
                  Scores are intended to help you understand your practice performance and do not
                  guarantee actual SAT scores or university admission.
                </p>
              </div>
            </div>

            {/* 3. SAT Mock Tests and Practice Materials */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">3</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">SAT Mock Tests and Practice Materials</h2>
                <p className="legal-v2-item-desc">
                  EduTechEx provides SAT practice examinations, mock tests, educational resources,
                  and performance reports. Mock tests are intended for educational and practice
                  purposes.
                </p>
                <div className="legal-v2-disclaimer">
                  EduTechEx is an independent educational platform and is not affiliated with,
                  endorsed by, or officially associated with the College Board.
                </div>
              </div>
            </div>

            {/* 8. Service Availability */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">8</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">Service Availability</h2>
                <p className="legal-v2-item-desc">
                  We strive to ensure reliable platform availability. However, temporary interruptions
                  may occur due to maintenance, technical issues, or third-party services.
                </p>
              </div>
            </div>

            {/* 4. User Responsibilities */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">4</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">User Responsibilities</h2>
                <p className="legal-v2-item-desc">Students agree not to:</p>
                <ul className="legal-v2-item-list">
                  <li>Share account credentials with unauthorized individuals.</li>
                  <li>Copy, distribute, or commercially reproduce platform content.</li>
                  <li>Attempt to access restricted areas of the website.</li>
                </ul>
              </div>
            </div>

            {/* 9. Account Suspension and Termination */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">9</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">Account Suspension and Termination</h2>
                <p className="legal-v2-item-desc">
                  EduTechEx may restrict or suspend accounts that violate these Terms, misuse the
                  platform, or engage in fraudulent activities.
                </p>
              </div>
            </div>

            {/* 5. Subscription and Payment Terms */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">5</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">Subscription and Payment Terms</h2>
                <p className="legal-v2-item-desc">
                  Certain features and mock tests may require a paid subscription. Subscription prices
                  and available features will be displayed before payment. Payments may be processed
                  through authorized third-party payment providers.
                </p>
              </div>
            </div>

            {/* 10. Changes to These Terms */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">10</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">Changes to These Terms</h2>
                <p className="legal-v2-item-desc">
                  We may update these Terms and Conditions from time to time. Updated versions
                  will be published on this page.
                </p>
              </div>
            </div>

            {/* 11. Governing Law (spans or placed on right) */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">11</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">Governing Law</h2>
                <p className="legal-v2-item-desc">
                  These Terms shall be governed by the applicable laws of India.
                </p>
              </div>
            </div>

            {/* Contact Us Bottom Banner */}
            <div className="legal-v2-contact-banner">
              <div className="legal-v2-contact-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div className="legal-v2-contact-content">
                <h3 className="legal-v2-contact-title">Contact Us</h3>
                <p className="legal-v2-contact-text">
                  For questions regarding these Terms and Conditions, contact us at{' '}
                  <a href="mailto:support@edutechex.com">support@edutechex.com</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsConditions;
