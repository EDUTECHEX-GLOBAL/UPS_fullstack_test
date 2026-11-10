import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaCheckCircle, FaClock, FaExclamationTriangle, FaTimesCircle,
  FaFilePdf, FaCopy, FaSignOutAlt, FaArrowLeft, FaPrint, FaDownload,
  FaUserCheck, FaHourglassHalf, FaLock, FaExternalLinkAlt, FaRedo
} from 'react-icons/fa';
import * as jsPDFModule from 'jspdf';
import EdutechLogo from '../../../assets/Edutech-logo.svg';
import axiosInstance from '../../../api/axiosInstance';
import './ApplicationStatus.css';

const ApplicationStatus = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [downloadingSummary, setDownloadingSummary] = useState(false);
  const [toastMessage, setToastMessage] = useState(
    location.state?.justSubmitted
      ? { type: 'success', text: 'Application successfully submitted for approval!' }
      : null
  );

  const [resubmitting, setResubmitting] = useState(false);

  const [statusData, setStatusData] = useState({
    applicationNumber: location.state?.applicationNumber || '',
    applicationStatus: 'Submitted for Approval',
    submittedAt: location.state?.submittedAt || null,
    applicantType: 'First-Year Student',
    applyingFor: "Bachelor's",
    isLocked: true,
    changesRequestedNotes: '',
    changesRequestedSection: '',
    summary: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      personal: {},
      education: {},
      testScores: {}
    }
  });

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/api/enrollment/application-status');
      if (res.data?.success && res.data?.data) {
        setStatusData(prev => ({
          ...prev,
          ...res.data.data
        }));
      }
    } catch (err) {
      console.error('Failed to load application status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCopyAppNumber = () => {
    if (!statusData.applicationNumber) return;
    navigator.clipboard.writeText(statusData.applicationNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSummary = () => {
    if (downloadingSummary) return;
    setDownloadingSummary(true);
    try {
      const JsPDFConstructor = [
        jsPDFModule.jsPDF,
        jsPDFModule.default?.jsPDF,
        jsPDFModule.default,
      ].find((candidate) => typeof candidate === 'function');
      if (!JsPDFConstructor) throw new Error('PDF generator is unavailable.');

      const doc = new JsPDFConstructor({ unit: 'mm', format: 'a4' });
      const margin = 16;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      const ensureSpace = (height) => {
        if (y + height > pageHeight - margin) {
          doc.addPage();
          y = 18;
        }
      };

      const addSection = (title, rows) => {
        ensureSpace(14);
        doc.setFillColor(8, 145, 178);
        doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(title, margin + 3, y + 5.5);
        y += 12;

        rows.filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '').forEach(([label, value]) => {
          const safeValue = Array.isArray(value) ? value.join(', ') : String(value);
          const valueLines = doc.splitTextToSize(safeValue, contentWidth - 57);
          const rowHeight = Math.max(6, valueLines.length * 4.5 + 1);
          ensureSpace(rowHeight);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(71, 85, 105);
          doc.text(String(label), margin + 1, y + 3.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(15, 23, 42);
          doc.text(valueLines, margin + 57, y + 3.5);
          y += rowHeight;
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, y, pageWidth - margin, y);
        });
        y += 7;
      };

      const bachelor = education.bachelorDetails || {};
      const master = education.masterDetails || {};
      const medical = education.medicalDetails || {};
      const educationRows = applyingFor === "Master's"
        ? [['Degree', master.degreeType], ['Institution', master.university], ['Major', master.courseMajor], ['GPA', master.gpa], ['Graduation Year', master.graduationYear]]
        : applyingFor === 'Medical'
          ? [['Highest Education', medical.highestEducation], ['Institution', medical.institution], ['Score / GPA', medical.percentageGpa]]
          : [['Highest Education', bachelor.highestEducation || '10+2 / Higher Secondary'], ['Institution', bachelor.schoolName], ['Board', bachelor.board], ['Score / Percentage', bachelor.percentage ? `${bachelor.percentage}%` : ''], ['Completion Year', bachelor.completionYear]];

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(22, 59, 108);
      doc.text('Application Summary', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Application ID: ${applicationNumber || 'Pending'}`, margin, y + 6);
      y += 14;

      addSection('APPLICATION STATUS', [
        ['Status', applicationStatus],
        ['Submitted', submittedAt ? formatSubmissionDate(submittedAt) : 'Pending'],
        ['Applicant Type', applicantType],
        ['Applying For', applyingFor]
      ]);
      addSection('APPLICANT', [
        ['Name', fullName], ['Email', email], ['Phone', summary.phone || personal.phone || personal.mobile],
        ['Date of Birth', personal.dateOfBirth], ['Gender', personal.gender], ['Citizenship', personal.citizenship]
      ]);
      addSection('EDUCATION', educationRows);

      const testRows = [];
      if (languageTest?.exam) {
        const languageParts = [
          `Score: ${languageTest.score || languageTest.overallScore || 'Submitted'}`,
          languageTest.testDate ? `Date: ${languageTest.testDate}` : '',
          ...[['Listening', languageTest.listeningScore], ['Reading', languageTest.readingScore], ['Writing', languageTest.writingScore], ['Speaking', languageTest.speakingScore], ['Literacy', languageTest.literacyScore], ['Comprehension', languageTest.comprehensionScore], ['Conversation', languageTest.conversationScore], ['Production', languageTest.productionScore]].filter(([, score]) => score).map(([label, score]) => `${label}: ${score}`)
        ].filter(Boolean);
        testRows.push([languageTest.exam, languageParts.join(' | ')]);
      }
      additionalTests.forEach((test) => {
        const parts = [`Score: ${test.score || 'Recorded'}`, test.testDate ? `Date: ${test.testDate}` : ''].filter(Boolean);
        testRows.push([test.exam || 'Additional Test', parts.join(' | ')]);
      });
      if (testScores.hasNotTaken) testRows.push(['Test declaration', 'No standardized tests taken / required']);
      if (!testRows.length) testRows.push(['Test scores', 'No test scores recorded']);
      addSection('STANDARDIZED & LANGUAGE TEST SCORES', testRows);

      doc.save(`Application-Summary-${applicationNumber || 'application'}.pdf`);
    } catch (error) {
      console.error('Unable to download application summary:', error);
    } finally {
      setDownloadingSummary(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    navigate('/sign-in');
  };

  const handleResubmit = async () => {
    try {
      setResubmitting(true);
      setToastMessage(null);
      const res = await axiosInstance.post('/api/enrollment/resubmit');
      if (res.data?.success) {
        const updatedStatus = {
          applicationStatus: res.data.status || 'Submitted for Approval',
          applicationNumber: res.data.applicationNumber || statusData.applicationNumber,
          submittedAt: res.data.submittedAt || new Date().toISOString(),
          isLocked: true,
          changesRequestedNotes: '',
          changesRequestedSection: ''
        };
        setStatusData((current) => ({ ...current, ...updatedStatus }));
        try {
          const user = JSON.parse(localStorage.getItem('userData') || '{}');
          localStorage.setItem('userData', JSON.stringify({ ...user, ...updatedStatus }));
        } catch (storageError) {
          console.error('Unable to update local user status:', storageError);
        }
        setToastMessage({
          type: 'success',
          text: res.data.message || 'Application re-submitted for approval successfully!'
        });
      } else {
        setToastMessage({
          type: 'error',
          text: res.data?.message || 'Failed to re-submit application.'
        });
      }
    } catch (err) {
      console.error('Resubmit error:', err);
      setToastMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Unable to re-submit application. Please try again.'
      });
    } finally {
      setResubmitting(false);
    }
  };

  const handleEditRequestedSection = () => {
    const section = String(statusData.changesRequestedSection || '')
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, ' ');
    const sectionRoutes = {
      personal: 'personal',
      'basic details': 'personal',
      'personal details': 'personal',
      'personal information': 'personal',
      education: 'education',
      'education details': 'education',
      academics: 'education',
      test: 'test',
      'test score': 'test',
      'test scores': 'test',
      testscores: 'test',
      'test score details': 'test',
      documents: 'test',
      document: 'test'
    };
    const sec = sectionRoutes[section] || 'personal';
    navigate(`/firstyear/enrollment/${sec}`);
  };

  const formatSubmissionDate = (isoString) => {
    if (!isoString) return 'Pending Submission';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch (e) {
      return isoString;
    }
  };

  if (loading) {
    return (
      <div className="status-page-wrapper">
        <div className="status-loading-box">
          <div className="status-spinner"></div>
          <p>Loading application status...</p>
        </div>
      </div>
    );
  }

  const {
    applicationNumber,
    applicationStatus = 'Submitted for Approval',
    submittedAt,
    applicantType,
    applyingFor,
    changesRequestedNotes,
    changesRequestedSection,
    summary = {}
  } = statusData;

  const personal = summary.personal || {};
  const education = summary.education || {};
  const testScores = summary.testScores || {};
  const savedTests = Array.isArray(testScores.tests) ? testScores.tests : [];
  const languageTest = testScores.languageTest || savedTests.find((test) =>
    test.category === 'language' || String(test.id) === 'lang_test'
  );
  const additionalTests = Array.isArray(testScores.additionalTests)
    ? testScores.additionalTests
    : savedTests.filter((test) => test !== languageTest && test.category !== 'language' && String(test.id) !== 'lang_test');
  const fullName = `${summary.firstName || personal.firstName || 'Student'} ${summary.lastName || personal.lastName || ''}`.trim();
  const email = summary.email || personal.email || '';

  // Calculate timeline state
  // Steps: 1. Account Verified -> 2. Application Form Completed -> 3. Submitted / Under Review -> 4. Decision
  const isDraft = applicationStatus === 'Draft';
  const isSubmitted = applicationStatus === 'Submitted for Approval';
  const isUnderReview = applicationStatus === 'Under Review';
  const isChangesRequested = applicationStatus === 'Changes Requested';
  const isApproved = applicationStatus === 'Approved';
  const isRejected = applicationStatus === 'Rejected';
  const canEnterDashboard = isApproved && statusData.universitySelectionStatus === 'Completed' &&
    Array.isArray(statusData.selectedUniversities) && statusData.selectedUniversities.length > 0;

  return (
    <div className="status-page-wrapper">
      {/* Top Header */}
      <header className="status-header">
        <div className="status-header-inner">
          <div className="status-logo-link">
            <img src={EdutechLogo} alt="EduTechEX Global" className="status-logo-img" />
            <span className="status-header-tagline">Application Portal</span>
          </div>

          <div className="status-header-right">
            <div className="status-user-pill">
              <div className="status-user-avatar">
                {(fullName[0] || 'U').toUpperCase()}
              </div>
              <span>{fullName}</span>
            </div>

            <button onClick={handleLogout} className="status-signout-btn">
              <FaSignOutAlt /> Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="status-content-container">
        {toastMessage && (
          <div className={`status-toast-alert ${toastMessage.type}`}>
            {toastMessage.type === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Hero / Overview Card */}
        <section className="status-hero-card">
          <div className="status-hero-top">
            <div className="status-app-badge-group">
              <span className="status-app-label">Application Number</span>
              <div className="status-app-number-row">
                <span className="status-app-number">
                  {applicationNumber || 'APP-2026-PENDING'}
                </span>
                {applicationNumber && (
                  <button onClick={handleCopyAppNumber} className="status-copy-btn">
                    <FaCopy /> {copied ? 'Copied!' : 'Copy'}
                  </button>
                )}
              </div>
            </div>

            <div>
              {isSubmitted && (
                <div className="status-badge submitted">
                  <FaClock /> Submitted for Approval
                </div>
              )}
              {isUnderReview && (
                <div className="status-badge under-review">
                  <FaHourglassHalf /> Under Review
                </div>
              )}
              {isChangesRequested && (
                <div className="status-badge changes-requested">
                  <FaExclamationTriangle /> Changes Requested
                </div>
              )}
              {isApproved && (
                <div className="status-badge approved">
                  <FaCheckCircle /> Approved
                </div>
              )}
              {isRejected && (
                <div className="status-badge rejected">
                  <FaTimesCircle /> Rejected
                </div>
              )}
              {isDraft && (
                <div className="status-badge draft">
                  <FaClock /> Draft
                </div>
              )}
            </div>
          </div>

          <div className="status-hero-meta-row">
            <div className="status-meta-item">
              <span>Applicant Type</span>
              <span>{applicantType || 'First-Year Student'}</span>
            </div>
            <div className="status-meta-item">
              <span>Applying For</span>
              <span>{applyingFor || "Bachelor's"}</span>
            </div>
            <div className="status-meta-item">
              <span>Submission Date</span>
              <span>{formatSubmissionDate(submittedAt)}</span>
            </div>
            <div className="status-meta-item">
              <span>Registered Email</span>
              <span>{email || 'N/A'}</span>
            </div>
          </div>
        </section>

        {/* Dynamic Status Notice Banner */}
        {isSubmitted && (
          <div className="status-notice-banner submitted">
            <FaLock className="status-notice-icon" />
            <div className="status-notice-content">
              <h4>Your application has been submitted and is currently under review.</h4>
              <p>
                Our admissions committee is evaluating your academic profile, credentials, and test scores.
                All application fields are locked for editing. You will receive updates here and on your registered email address.
              </p>
            </div>
          </div>
        )}

        {isUnderReview && (
          <div className="status-notice-banner under-review">
            <FaHourglassHalf className="status-notice-icon" />
            <div className="status-notice-content">
              <h4>Admissions Committee Review in Progress</h4>
              <p>
                Your application dossier is being reviewed by the admissions officers. We will notify you once verification is complete.
              </p>
            </div>
          </div>
        )}

        {isApproved && (
          <div className="status-notice-banner approved">
            <FaCheckCircle className="status-notice-icon" />
            <div className="status-notice-content">
              <h4>Congratulations! Your Application Has Been Approved.</h4>
              <p>
                Your university application has cleared verification. Your admissions advisor will connect with you regarding the next steps for formal admission and visa processing.
              </p>
            </div>
          </div>
        )}

        {canEnterDashboard && (
          <div className="status-approved-dashboard-action">
            <div>
              <strong>Your application is complete.</strong>
              <span>Your partner has approved your application and university selection.</span>
            </div>
            <button type="button" onClick={() => navigate('/firstyear/enrollment/dashboard', { replace: true })}>
              Go to Dashboard <FaExternalLinkAlt />
            </button>
          </div>
        )}

        {isDraft && (
          <div className="status-notice-banner draft">
            <FaClock className="status-notice-icon" />
            <div className="status-notice-content">
              <h4>Application In Draft</h4>
              <p>
                Your application details have been saved, but your application has not yet been submitted for approval.
              </p>
            </div>
          </div>
        )}

        {/* Changes Requested Action Card */}
        {isChangesRequested && (
          <div className="changes-requested-card">
            <div className="changes-requested-header">
              <FaExclamationTriangle style={{ fontSize: '1.4rem' }} />
              <h3>Action Required: Admissions Feedback</h3>
            </div>
            <div className="changes-notes-box">
              <strong>Notes from Admissions:</strong>
              <p style={{ margin: '8px 0 0 0' }}>
                {changesRequestedNotes || 'Please review your uploaded documents and educational details and provide the requested corrections.'}
              </p>
            </div>
            <div className="changes-action-buttons">
              <button onClick={handleEditRequestedSection} className="btn-edit-requested">
                Edit {changesRequestedSection ? `${changesRequestedSection.charAt(0).toUpperCase() + changesRequestedSection.slice(1)} Details` : 'Application Section'} &rarr;
              </button>
              <button onClick={handleResubmit} disabled={resubmitting} className="btn-resubmit-app">
                <FaRedo /> {resubmitting ? 'Re-submitting...' : 'Resubmit Application'}
              </button>
            </div>
          </div>
        )}

        {/* Visual Progress Timeline Tracker */}
        <section className="status-timeline-card">
          <h3 className="status-card-title">Application Journey Tracker</h3>
          <div className="status-timeline">
            {/* Step 1 */}
            <div className="timeline-step completed">
              <div className="timeline-step-icon">
                <FaUserCheck />
              </div>
              <span className="timeline-step-title">Account Verified</span>
              <span className="timeline-step-subtitle">Email OTP verified &amp; account created</span>
            </div>

            {/* Step 2 */}
            <div className={`timeline-step ${!isDraft ? 'completed' : 'active'}`}>
              <div className="timeline-step-icon">
                {!isDraft ? <FaCheckCircle /> : <FaClock />}
              </div>
              <span className="timeline-step-title">Application Form</span>
              <span className="timeline-step-subtitle">Profile, Education &amp; Test Scores</span>
            </div>

            {/* Step 3 */}
            <div className={`timeline-step ${
              isChangesRequested ? 'warning' :
              (isSubmitted || isUnderReview) ? 'active' :
              isApproved ? 'completed' : ''
            }`}>
              <div className="timeline-step-icon">
                {isApproved ? <FaCheckCircle /> :
                 isChangesRequested ? <FaExclamationTriangle /> :
                 (isSubmitted || isUnderReview) ? <FaHourglassHalf /> :
                 <FaClock />}
              </div>
              <span className="timeline-step-title">
                {isChangesRequested ? 'Changes Requested' : 'Admissions Review'}
              </span>
              <span className="timeline-step-subtitle">
                {isChangesRequested ? 'Action required by applicant' : 'Under evaluation by committee'}
              </span>
            </div>

            {/* Step 4 */}
            <div className={`timeline-step ${isApproved ? 'completed' : ''}`}>
              <div className="timeline-step-icon">
                {isApproved ? <FaCheckCircle /> : <FaClock />}
              </div>
              <span className="timeline-step-title">Final Decision</span>
              <span className="timeline-step-subtitle">
                {isApproved ? 'Approved for Enrollment' : 'Approval & Next Steps'}
              </span>
            </div>
          </div>
        </section>

        {/* Submitted Details Summary Card */}
        <section className="status-summary-card">
          <h3 className="status-card-title">Submitted Application Summary</h3>
          <div className="summary-sections-grid">
            {/* Basic Personal Details */}
            <div className="summary-section-box">
              <div className="summary-section-header">
                <FaUserCheck style={{ color: '#0891b2' }} />
                <h4>Personal &amp; Contact Details</h4>
              </div>
              <table className="summary-data-table">
                <tbody>
                  <tr>
                    <td>Full Name:</td>
                    <td>{fullName || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Email Address:</td>
                    <td>{email || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Phone Number:</td>
                    <td>{summary.phone || personal.phone || personal.mobile || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Father's Name:</td>
                    <td>{[personal.fatherFirstName, personal.fatherLastName].filter(Boolean).join(' ') || personal.fatherName || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Father's Phone:</td>
                    <td>{personal.fatherPhone || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Father's Email:</td>
                    <td>{personal.fatherEmail || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Mother's Name:</td>
                    <td>{[personal.motherFirstName, personal.motherLastName].filter(Boolean).join(' ') || personal.motherName || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Mother's Phone:</td>
                    <td>{personal.motherPhone || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Address:</td>
                    <td>
                      {[
                        personal.tempAddress1,
                        personal.tempAddress2,
                        personal.tempCity,
                        personal.tempState,
                        personal.tempCountry,
                        personal.tempZip
                      ].filter(Boolean).join(', ') || 'N/A'}
                    </td>
                  </tr>
                  <tr>
                    <td>Passport Document:</td>
                    <td>
                      {personal.passportDoc?.fileUrl ? (
                        <a
                          href={personal.passportDoc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="summary-doc-link"
                        >
                          <FaFilePdf /> View Passport PDF <FaExternalLinkAlt style={{ fontSize: '0.75rem' }} />
                        </a>
                      ) : (
                        'Verified'
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Education Details */}
            <div className="summary-section-box">
              <div className="summary-section-header">
                <FaCheckCircle style={{ color: '#0891b2' }} />
                <h4>Education Information</h4>
              </div>
              <table className="summary-data-table">
                <tbody>
                  {applyingFor === "Bachelor's" && education.bachelorDetails && (
                    <>
                      <tr>
                        <td>Highest Education:</td>
                        <td>{education.bachelorDetails.highestEducation || '10+2 / Higher Secondary'}</td>
                      </tr>
                      <tr>
                        <td>Institution Name:</td>
                        <td>{education.bachelorDetails.schoolName || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td>Board of Education:</td>
                        <td>{education.bachelorDetails.board || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td>Score / Percentage:</td>
                        <td>{education.bachelorDetails.percentage ? `${education.bachelorDetails.percentage}%` : 'N/A'}</td>
                      </tr>
                      <tr>
                        <td>Certificate:</td>
                        <td>
                          {education.bachelorDetails.certificateDoc?.fileUrl ? (
                            <a
                              href={education.bachelorDetails.certificateDoc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="summary-doc-link"
                            >
                              <FaFilePdf /> View 10+2 Certificate <FaExternalLinkAlt style={{ fontSize: '0.75rem' }} />
                            </a>
                          ) : (
                            'Uploaded'
                          )}
                        </td>
                      </tr>
                    </>
                  )}

                  {applicantType === 'Transfer Student' && education.transferDetails && (
                    <>
                      <tr>
                        <td>Transfer College:</td>
                        <td>{education.transferDetails.currentCollege || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td>Program / Major:</td>
                        <td>{education.transferDetails.major || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td>Credits Completed:</td>
                        <td>{education.transferDetails.creditsCompleted || 'N/A'}</td>
                      </tr>
                    </>
                  )}

                  {applyingFor === "Master's" && education.masterDetails && (
                    <>
                      <tr>
                        <td>Undergraduate Degree:</td>
                        <td>{education.masterDetails.degreeType || 'Bachelor Degree'}</td>
                      </tr>
                      <tr>
                        <td>University:</td>
                        <td>{education.masterDetails.university || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td>Major / Course:</td>
                        <td>{education.masterDetails.courseMajor || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td>Undergraduate GPA:</td>
                        <td>{education.masterDetails.gpa || 'N/A'}</td>
                      </tr>
                    </>
                  )}

                  {applyingFor === 'Medical' && education.medicalDetails && (
                    <>
                      <tr>
                        <td>Pre-Med Education:</td>
                        <td>{education.medicalDetails.highestEducation || 'Medical Qualification'}</td>
                      </tr>
                      <tr>
                        <td>Medical College/Institution:</td>
                        <td>{education.medicalDetails.institution || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td>Pre-Med GPA / Score:</td>
                        <td>{education.medicalDetails.percentageGpa || 'N/A'}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Test Scores */}
            <div className="summary-section-box">
              <div className="summary-section-header">
                <FaCheckCircle style={{ color: '#0891b2' }} />
                <h4>Standardized &amp; Language Test Scores</h4>
              </div>
              <table className="summary-data-table">
                <tbody>
                  {languageTest?.exam ? (
                    <tr>
                      <td>Language Test:</td>
                      <td>
                        <strong>{languageTest.exam}</strong> &mdash; Score: {languageTest.score || languageTest.overallScore || 'Submitted'}
                        {languageTest.testDate ? ` (Date: ${languageTest.testDate})` : ''}
                        {[
                          ['Listening', languageTest.listeningScore],
                          ['Reading', languageTest.readingScore],
                          ['Writing', languageTest.writingScore],
                          ['Speaking', languageTest.speakingScore],
                          ['Literacy', languageTest.literacyScore],
                          ['Comprehension', languageTest.comprehensionScore],
                          ['Conversation', languageTest.conversationScore],
                          ['Production', languageTest.productionScore]
                        ].filter(([, score]) => score).map(([label, score]) => ` · ${label}: ${score}`).join('')}
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td>Test Scores:</td>
                      <td>{testScores.hasNotTaken ? 'No standardized tests taken / required.' : 'No test scores recorded.'}</td>
                    </tr>
                  )}

                  {additionalTests.length > 0 ? (
                    additionalTests.map((t, idx) => (
                      <tr key={idx}>
                        <td>{t.exam || `Additional Test ${idx + 1}`}:</td>
                        <td>
                          Score: {t.score || 'Recorded'}{t.testDate ? ` (Date: ${t.testDate})` : ''}
                          {[
                            ['Verbal', t.verbalScore], ['Quantitative', t.quantitativeScore],
                            ['Analytical Writing', t.analyticalWritingScore], ['Reading & Writing', t.readingWritingScore],
                            ['Math', t.mathScore], ['English', t.englishScore], ['Science', t.scienceScore],
                            ['Data Insights', t.dataInsightsScore], ['Percentile', t.percentile], ['Rank', t.allIndiaRank]
                          ].filter(([, score]) => score).map(([label, score]) => ` · ${label}: ${score}`).join('')}
                        </td>
                      </tr>
                    ))
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Bottom Actions */}
        <div className="status-bottom-actions">
          {isDraft ? (
            <button
              onClick={() => navigate('/firstyear/enrollment/personal')}
              className="status-action-btn-primary"
            >
              Continue Registration &rarr;
            </button>
          ) : (
            <button
              onClick={() => navigate('/firstyear/enrollment/review')}
              className="status-action-btn-secondary"
            >
              <FaArrowLeft /> View Full Form Review
            </button>
          )}

          <button
            onClick={handleDownloadSummary}
            className="status-action-btn-secondary"
            disabled={downloadingSummary}
            type="button"
          >
            <FaDownload /> {downloadingSummary ? 'Preparing PDF...' : 'Download Summary'}
          </button>

          <button
            onClick={() => window.print()}
            className="status-action-btn-secondary"
          >
            <FaPrint /> Print Application Summary
          </button>
        </div>
      </main>
    </div>
  );
};

export default ApplicationStatus;

