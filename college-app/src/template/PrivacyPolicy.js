import React from 'react';
import './policy.css';

const PrivacyPolicy = () => {
  return (
    <div className="legal-page-v2">
      {/* Hero Header */}
      <section className="legal-v2-hero">
        <div className="legal-v2-hero-container">
          <div className="legal-v2-hero-text">
            <h1 className="legal-v2-hero-title">Privacy Policy</h1>
            <p className="legal-v2-hero-sub">
              Please read our privacy policy carefully before using our platform.
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
                  EduTechEx respects your privacy and is committed to protecting the personal
                  information of students and website visitors.
                </p>
                <p className="legal-v2-item-desc">
                  This Privacy Policy explains what information we collect, how we use it, how we
                  protect it, and when it may be shared with third parties.
                </p>
                <p className="legal-v2-item-desc">
                  By using our website and services, you acknowledge this Privacy Policy.
                </p>
              </div>
            </div>

            {/* 7. Cookies and Tracking Technologies */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">7</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">Cookies and Tracking Technologies</h2>
                <p className="legal-v2-item-desc">Our website may use cookies and similar technologies to:</p>
                <ul className="legal-v2-item-list">
                  <li>Maintain login sessions.</li>
                  <li>Remember user preferences.</li>
                  <li>Improve website functionality.</li>
                  <li>Understand website usage.</li>
                  <li>Support security features.</li>
                </ul>
                <p className="legal-v2-item-desc" style={{ marginTop: '6px' }}>
                  Users may manage cookies through their browser settings. Disabling certain cookies
                  may affect website functionality.
                </p>
              </div>
            </div>

            {/* 2. Information We Collect */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">2</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">Information We Collect</h2>
                <p className="legal-v2-item-desc">We may collect the following categories of information:</p>

                <p className="legal-v2-item-desc" style={{ fontWeight: 600, color: '#0F172A', marginTop: '6px' }}>
                  A. Personal Information:
                </p>
                <ul className="legal-v2-item-list">
                  <li>Student name, email address, mobile number, educational curriculum, and account registration details.</li>
                </ul>

                <p className="legal-v2-item-desc" style={{ fontWeight: 600, color: '#0F172A', marginTop: '6px' }}>
                  B. Examination Information:
                </p>
                <ul className="legal-v2-item-list">
                  <li>SAT mock test participation, answers submitted, examination scores, test completion status, performance reports, and examination history.</li>
                </ul>

                <p className="legal-v2-item-desc" style={{ fontWeight: 600, color: '#0F172A', marginTop: '6px' }}>
                  C. Payment Information:
                </p>
                <p className="legal-v2-item-desc">
                  When students purchase subscriptions or paid services, payments are processed through third-party payment providers. We do not store complete payment card details on our servers.
                </p>

                <p className="legal-v2-item-desc" style={{ fontWeight: 600, color: '#0F172A', marginTop: '6px' }}>
                  D. Technical Information:
                </p>
                <ul className="legal-v2-item-list">
                  <li>IP address, browser information, device information, website usage, login timestamps, and error/security logs.</li>
                </ul>
              </div>
            </div>

            {/* 8. Student Privacy and Children's Information */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">8</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">Student Privacy and Children&apos;s Information</h2>
                <p className="legal-v2-item-desc">
                  EduTechEx may be used by school students, including individuals under 18 years of age.
                </p>
                <p className="legal-v2-item-desc">
                  Where required by applicable law, we will obtain verifiable parental or guardian
                  consent before processing children&apos;s personal information.
                </p>
                <p className="legal-v2-item-desc">
                  We do not knowingly use children&apos;s personal information for prohibited tracking,
                  targeted advertising, or other unlawful purposes.
                </p>
              </div>
            </div>

            {/* 3. How We Use Your Information */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">3</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">How We Use Your Information</h2>
                <p className="legal-v2-item-desc">We use collected information to:</p>
                <ul className="legal-v2-item-list">
                  <li>Create and manage student accounts.</li>
                  <li>Provide access to SAT mock examinations.</li>
                  <li>Save examination answers and results.</li>
                  <li>Generate student performance reports.</li>
                  <li>Process subscription payments.</li>
                  <li>Send account verification and service notifications.</li>
                  <li>Provide customer support.</li>
                  <li>Improve website performance and user experience.</li>
                  <li>Detect unauthorized access and prevent fraudulent activities.</li>
                </ul>
              </div>
            </div>

            {/* 9. Your Privacy Rights */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">9</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">Your Privacy Rights</h2>
                <p className="legal-v2-item-desc">Subject to applicable law, users may have the right to:</p>
                <ul className="legal-v2-item-list">
                  <li>Request access to their personal information.</li>
                  <li>Request correction of inaccurate information.</li>
                  <li>Request deletion of personal information.</li>
                  <li>Withdraw consent where processing is based on consent.</li>
                  <li>Raise concerns about the processing of their information.</li>
                  <li>Submit privacy-related complaints.</li>
                </ul>
              </div>
            </div>

            {/* 4. How We Share Information */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">4</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">How We Share Information</h2>
                <p className="legal-v2-item-desc">
                  We do not sell students&apos; personal information. Information may be shared with
                  authorized service providers when necessary to operate our platform, including:
                </p>
                <ul className="legal-v2-item-list">
                  <li>Payment gateway providers.</li>
                  <li>Email and OTP verification providers.</li>
                  <li>Cloud hosting and database providers.</li>
                  <li>Website analytics and security providers.</li>
                </ul>
                <p className="legal-v2-item-desc" style={{ marginTop: '6px' }}>
                  These providers process information only for authorized purposes subject to appropriate
                  contractual and security safeguards. We may also disclose information when required by law.
                </p>
              </div>
            </div>

            {/* 10. Third-Party Websites and Services */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">10</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">Third-Party Websites and Services</h2>
                <p className="legal-v2-item-desc">
                  Our platform may contain links to third-party websites or use external services.
                </p>
                <p className="legal-v2-item-desc">
                  EduTechEx is not responsible for the privacy practices of independent third-party
                  websites. Users should review their respective privacy policies.
                </p>
              </div>
            </div>

            {/* 5. Data Storage and Security */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">5</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">Data Storage and Security</h2>
                <p className="legal-v2-item-desc">
                  We take reasonable technical and organizational measures to protect student information
                  against unauthorized access, alteration, disclosure, or destruction.
                </p>
                <ul className="legal-v2-item-list">
                  <li>Secure authentication and access controls.</li>
                  <li>Encrypted data transmission.</li>
                  <li>Secure database storage, monitoring, and security procedures.</li>
                </ul>
                <div className="legal-v2-disclaimer">
                  Please note that no online platform can guarantee absolute security.
                </div>
              </div>
            </div>

            {/* 11. Changes to This Privacy Policy */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">11</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">Changes to This Privacy Policy</h2>
                <p className="legal-v2-item-desc">
                  We may update this Privacy Policy to reflect changes in our services, technology, or
                  applicable legal requirements. Any updates will be published on this page with a revised
                  effective date.
                </p>
              </div>
            </div>

            {/* 6. Data Retention */}
            <div className="legal-v2-item">
              <span className="legal-v2-number-badge">6</span>
              <div className="legal-v2-item-body">
                <h2 className="legal-v2-item-title">Data Retention</h2>
                <p className="legal-v2-item-desc">
                  We retain personal information only for as long as reasonably necessary to provide our
                  services, fulfill legitimate business purposes, meet legal obligations, and resolve disputes.
                </p>
                <p className="legal-v2-item-desc">
                  Students may request account deletion, subject to applicable legal retention requirements.
                </p>
              </div>
            </div>

            {/* Contact Us Bottom Banner (Section 12) */}
            <div className="legal-v2-contact-banner">
              <div className="legal-v2-contact-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div className="legal-v2-contact-content">
                <h3 className="legal-v2-contact-title">12. Contact Us</h3>
                <p className="legal-v2-contact-text">
                  For privacy-related questions, requests, or complaints, contact us at{' '}
                  <a href="mailto:support@edutechex.com">support@edutechex.com</a>
                  {' '}or{' '}
                  <a href="mailto:info@edutechex.com">info@edutechex.com</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
