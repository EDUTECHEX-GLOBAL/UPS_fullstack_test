import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../../api/axiosInstance';
import { resolveFileUrl } from '../../../../utils/fileUrl';
import ApplicationConsistency from './ApplicationConsistency';
import { 
  FaUserCheck, FaFilePdf, FaEdit, FaCheckCircle, 
  FaLock, FaPaperPlane, FaShieldAlt, FaExternalLinkAlt
} from 'react-icons/fa';
import './review.css';

const ReviewApplication = ({ data = {}, onNavigateToStep, onBack, onOpenApplicationStatus }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [confirmedAccuracy, setConfirmedAccuracy] = useState(false);
  const [alert, setAlert] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedAppNum, setSubmittedAppNum] = useState('');

  const [summaryData, setSummaryData] = useState({
    accountInfo: {},
    personalDetails: {},
    educationDetails: {},
    additionalDocuments: [],
    testScores: {},
    documents: {},
    programSelection: {}
  });

  const normalizeTestScores = (raw = {}) => {
    const source = raw.testScores && typeof raw.testScores === 'object' ? raw.testScores : raw;
    const flatTests = Array.isArray(source.tests) ? source.tests : [];
    const languageTest = source.languageTest || flatTests.find((test) => test.category === 'language' || String(test.id) === 'lang_test') || null;
    const additionalTests = Array.isArray(source.additionalTests)
      ? source.additionalTests
      : flatTests.filter((test) => test !== languageTest && test.category !== 'language' && String(test.id) !== 'lang_test');
    return { ...source, languageTest, additionalTests, tests: flatTests };
  };

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get('/api/enrollment/review');
        if (res.data?.success && res.data?.data) {
          const serverData = res.data.data;
          const propTests = normalizeTestScores(data.testScores || {});
          const serverTests = normalizeTestScores(serverData.testScores || {});
          const serverHasTests = (Array.isArray(serverTests.tests) && serverTests.tests.length > 0) || serverTests.hasNotTaken;
          setSummaryData({
            ...serverData,
            additionalDocuments: Array.isArray(serverData.additionalDocuments) ? serverData.additionalDocuments : [],
            testScores: serverHasTests ? serverTests : propTests
          });
        } else {
          // Fallback to props data
          setSummaryData({
            accountInfo: data.accountInfo || {},
            personalDetails: data.personalDetails || {},
            educationDetails: data.educationDetails || {},
            additionalDocuments: data.additionalDocuments || [],
            testScores: normalizeTestScores(data.testScores || {}),
            documents: data.documents || {},
            programSelection: data.programSelection || {}
          });
        }
      } catch (err) {
        console.error("Error fetching review summary:", err);
        setSummaryData({
          accountInfo: data.accountInfo || {},
          personalDetails: data.personalDetails || {},
          educationDetails: data.educationDetails || {},
          additionalDocuments: data.additionalDocuments || [],
          testScores: normalizeTestScores(data.testScores || {}),
          documents: data.documents || {},
          programSelection: data.programSelection || {}
        });
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [data]);

  // Read user data from localStorage for fallback
  const storedUser = (() => {
    try {
      const u = localStorage.getItem('userData');
      return u && u !== 'undefined' ? JSON.parse(u) : {};
    } catch {
      return {};
    }
  })();

  const account = summaryData.accountInfo || {};
  const personal = summaryData.personalDetails || {};
  const education = summaryData.educationDetails || {};
  const testScores = summaryData.testScores || {};

  const applicantType = account.applicantType || personal.applicantType || storedUser.applicantType || 'First-Year Student';
  const applyingFor = account.applyingFor || personal.applyingFor || storedUser.applyingFor || "Bachelor's";
  const firstName = account.firstName || personal.firstName || storedUser.firstName || '';
  const lastName = account.lastName || personal.lastName || storedUser.lastName || '';
  const email = account.email || personal.email || storedUser.email || '';
  const phone = personal.phone || account.phone || storedUser.phone || '';

  const applicationStatus = String(account.applicationStatus || '').trim().toLowerCase();
  const isChangesRequested = applicationStatus === 'changes requested';
  // Use the current workflow status as the source of truth. The account lock
  // flag can remain true after a change request or an unrelated university
  // selection approval, both of which should still allow score corrections.
  const isLocked = !isChangesRequested && ['submitted for approval', 'under review', 'approved'].includes(applicationStatus);
  const applicationNumber = account.applicationNumber || storedUser.applicationNumber || '';

  const handleEditSection = (stepKey) => {
    if (onNavigateToStep) {
      onNavigateToStep(stepKey);
    } else {
      navigate(`/firstyear/enrollment/${stepKey}`);
    }
  };

  const handleOpenSubmitConfirm = () => {
    if (!confirmedAccuracy) {
      setAlert({
        type: 'error',
        message: 'Please confirm that the information provided is accurate and complete before submitting.'
      });
      return;
    }
    setAlert(null);
    setShowConfirmModal(true);
  };

  const handleSubmitApplication = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    setAlert(null);

    try {
      const response = await axiosInstance.post('/api/enrollment/submit-for-approval', {
        confirmedAccuracy: true
      });

      if (response.data?.success) {
        const appNum = response.data.applicationNumber || 'APP-2026-00001';
        setSubmittedAppNum(appNum);

        // Update localStorage user object
        try {
          const userStr = localStorage.getItem('userData');
          if (userStr) {
            const userObj = JSON.parse(userStr);
            userObj.applicationNumber = appNum;
            userObj.applicationStatus = 'Submitted for Approval';
            userObj.isLocked = true;
            localStorage.setItem('userData', JSON.stringify(userObj));
          }
        } catch (e) {
          console.error('Failed to update local storage user:', e);
        }

        setShowSuccessModal(true);
      } else {
        setAlert({
          type: 'error',
          message: response.data?.message || 'Failed to submit application. Please check all required fields.'
        });
      }
    } catch (error) {
      console.error("Error submitting application:", error);
      setAlert({
        type: 'error',
        message: error.response?.data?.message || 'Failed to submit application for approval. Please ensure all required fields in Basic Details and Education Details are filled.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResubmitApplication = async () => {
    setIsResubmitting(true);
    setAlert(null);
    try {
      const response = await axiosInstance.post('/api/enrollment/resubmit');
      if (!response.data?.success) throw new Error(response.data?.message || 'Failed to resubmit application.');
      setSummaryData((current) => ({
        ...current,
        accountInfo: {
          ...current.accountInfo,
          applicationStatus: 'Submitted for Approval',
          isLocked: true,
          submittedAt: response.data.submittedAt || new Date().toISOString(),
          changesRequestedNotes: '',
          changesRequestedSection: ''
        }
      }));
      try {
        const user = JSON.parse(localStorage.getItem('userData') || '{}');
        localStorage.setItem('userData', JSON.stringify({ ...user, applicationStatus: 'Submitted for Approval', isLocked: true }));
      } catch (error) {
        console.error('Failed to update local storage user:', error);
      }
      setAlert({ type: 'success', message: response.data.message || 'Application resubmitted for approval.' });
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.message || error.message || 'Unable to resubmit application.' });
    } finally {
      setIsResubmitting(false);
    }
  };

  // Helper to render document file link
  const renderDocLink = (doc) => {
    if (!doc) return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not uploaded</span>;
    const rawUrl = typeof doc === 'string' ? doc : (doc.fileUrl || doc.url || doc.s3Key || doc.fileKey || doc.file);
    const fileName = typeof doc === 'object' && (doc.fileName || doc.originalName)
      ? (doc.fileName || doc.originalName)
      : (rawUrl ? String(rawUrl).split('/').pop() : 'Document.pdf');
    const href = rawUrl ? resolveFileUrl(rawUrl) : null;

    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <FaFilePdf style={{ color: '#dc2626', fontSize: '1.1rem' }} />
        <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.85rem' }}>{fileName}</span>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '4px',
              color: '#2563eb',
              fontSize: '0.78rem',
              fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            View <FaExternalLinkAlt style={{ fontSize: '0.65rem' }} />
          </a>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="uni-review-loading">
        <span className="uni-review-spinner"></span>
        <span>Loading complete application review...</span>
      </div>
    );
  }

  // Format temporary and permanent addresses
  const tempAddressFormatted = [
    personal.tempAddress1,
    personal.tempAddress2,
    personal.tempCity,
    personal.tempState,
    personal.tempZip,
    personal.tempCountry
  ].filter(Boolean).join(', ');

  const permAddressFormatted = [
    personal.permAddress1,
    personal.permAddress2,
    personal.permCity,
    personal.permState,
    personal.permZip,
    personal.permCountry
  ].filter(Boolean).join(', ');

  // Extract education details
  const b = education.bachelorDetails || {};
  const t = education.transferDetails || {};
  const m = education.masterDetails || {};
  const med = education.medicalDetails || {};

  // Extract tests
  const testsList = Array.isArray(testScores.tests) ? testScores.tests : [];
  const languageTest = testScores.languageTest || testsList.find(x => x.category === 'language' || String(x.id) === 'lang_test') || null;
  const additionalTests = Array.isArray(testScores.additionalTests)
    ? testScores.additionalTests
    : testsList.filter(x => x.category === 'additional' || (String(x.id) !== 'lang_test' && x !== languageTest));

  return (
    <div className="uni-review-wrapper">
      <div className="uni-review-container">
        
        {/* Header Section */}
        <div className="uni-review-header">
          <div className="uni-review-header-title">
            <h2>Review &amp; Submit Application</h2>
            <div className="uni-header-actions">
              {isLocked ? (
                <span className="study-type-badge status-submitted" style={{ background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }}>
                  <FaLock style={{ marginRight: '6px' }} /> Application Submitted
                </span>
              ) : (
                <span className="study-type-badge">
                  Step 4 of 4: Final Review
                </span>
              )}
            </div>
          </div>
          <p className="uni-review-header-desc">
            Please carefully review all sections of your application before submitting. Once sent for approval, your application will be locked for verification by the admissions team.
          </p>
        </div>

        {/* Locked banner if already submitted */}
        {isLocked && (
          <div style={{
            background: '#ecfeff',
            border: '1.5px solid #06b6d4',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FaLock style={{ color: '#0891b2', fontSize: '1.3rem' }} />
              <div>
                <h4 style={{ margin: 0, color: '#0e7490', fontSize: '0.98rem', fontWeight: '700' }}>
                  Application Status: {account.applicationStatus || 'Submitted for Approval'}
                </h4>
                <p style={{ margin: '4px 0 0', color: '#155e75', fontSize: '0.85rem' }}>
                  {applicationNumber ? `Application ID: ${applicationNumber} | ` : ''}Your application is locked and currently being processed.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenApplicationStatus ? onOpenApplicationStatus() : navigate('/application-status')}
              style={{
                padding: '8px 16px',
                background: '#0891b2',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Go to Application Status &rarr;
            </button>
          </div>
        )}

        {/* Alert Notifications */}
        {alert && (
          <div className={`uni-review-alert ${alert.type}`}>
            <span>{alert.message}</span>
            <button type="button" className="uni-review-alert-close" onClick={() => setAlert(null)}>×</button>
          </div>
        )}

        <ApplicationConsistency />

        {/* SECTION 1: ACCOUNT INFORMATION (Read-only from Create Account) */}
        <div className="review-section-card" style={{ borderLeft: '4px solid #0891b2' }}>
          <div className="review-card-header">
            <h3 className="review-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaUserCheck style={{ color: '#0891b2' }} /> 1. Account Information
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>
              Verified from Registration
            </span>
          </div>

          <div className="review-info-grid">
            <div className="review-info-item">
              <span className="review-info-label">First Name</span>
              <span className="review-info-val">{firstName || '-'}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Last Name</span>
              <span className="review-info-val">{lastName || '-'}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Email Address</span>
              <span className="review-info-val">{email || '-'}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Applicant Type</span>
              <span className="review-info-val" style={{ color: '#0891b2', fontWeight: '700' }}>
                {applicantType}
              </span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Applying For</span>
              <span className="review-info-val" style={{ color: '#0891b2', fontWeight: '700' }}>
                {applyingFor}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: BASIC DETAILS */}
        <div className="review-section-card" style={{ borderLeft: '4px solid #2563eb' }}>
          <div className="review-card-header">
            <h3 className="review-card-title">2. Basic Details</h3>
            {!isLocked && (
              <button 
                type="button" 
                className="review-edit-btn" 
                onClick={() => handleEditSection('personal')}
              >
                <FaEdit /> Edit Basic Details
              </button>
            )}
          </div>

          <div className="review-sub-heading">Applicant Details</div>
          <div className="review-info-grid" style={{ marginBottom: '18px' }}>
            <div className="review-info-item">
              <span className="review-info-label">First Name</span>
              <span className="review-info-val">{firstName || '-'}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Last Name</span>
              <span className="review-info-val">{lastName || '-'}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Email Address</span>
              <span className="review-info-val">{email || '-'}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Phone Number</span>
              <span className="review-info-val">{personal.phone || phone || '-'}</span>
            </div>
          </div>

          <div className="review-sub-divider">
            <div className="review-sub-heading">Father's Information</div>
            <div className="review-info-grid" style={{ marginBottom: '18px' }}>
              <div className="review-info-item">
                <span className="review-info-label">Father's First Name</span>
                <span className="review-info-val">{personal.fatherFirstName || (personal.fatherName ? personal.fatherName.split(' ')[0] : '-')}</span>
              </div>
              <div className="review-info-item">
                <span className="review-info-label">Father's Last Name</span>
                <span className="review-info-val">{personal.fatherLastName || (personal.fatherName ? personal.fatherName.split(' ').slice(1).join(' ') : '-')}</span>
              </div>
              <div className="review-info-item">
                <span className="review-info-label">Father's Phone Number</span>
                <span className="review-info-val">{personal.fatherPhone || '-'}</span>
              </div>
              <div className="review-info-item">
                <span className="review-info-label">Father's Email ID</span>
                <span className="review-info-val">{personal.fatherEmail || '-'}</span>
              </div>
            </div>
          </div>

          <div className="review-sub-divider">
            <div className="review-sub-heading">Mother's Information</div>
            <div className="review-info-grid" style={{ marginBottom: '18px' }}>
              <div className="review-info-item">
                <span className="review-info-label">Mother's First Name</span>
                <span className="review-info-val">{personal.motherFirstName || (personal.motherName ? personal.motherName.split(' ')[0] : '-')}</span>
              </div>
              <div className="review-info-item">
                <span className="review-info-label">Mother's Last Name</span>
                <span className="review-info-val">{personal.motherLastName || (personal.motherName ? personal.motherName.split(' ').slice(1).join(' ') : '-')}</span>
              </div>
              <div className="review-info-item">
                <span className="review-info-label">Mother's Phone Number</span>
                <span className="review-info-val">{personal.motherPhone || '-'}</span>
              </div>
            </div>
          </div>

          <div className="review-sub-divider">
            <div className="review-sub-heading">Addresses</div>
            <div className="review-info-grid">
              <div className="review-info-item full-width">
                <span className="review-info-label">Temporary Address</span>
                <span className="review-info-val">{tempAddressFormatted || 'Not provided'}</span>
              </div>
              <div className="review-info-item full-width">
                <span className="review-info-label">Permanent Address</span>
                <span className="review-info-val">{permAddressFormatted || 'Not provided'}</span>
              </div>
            </div>
          </div>

          <div className="review-sub-divider">
            <div className="review-sub-heading">Passport Document</div>
            <div style={{ marginTop: '8px' }}>
              {renderDocLink(personal.passportDoc)}
            </div>
          </div>
        </div>

        {/* SECTION 3: EDUCATION DETAILS */}
        <div className="review-section-card" style={{ borderLeft: '4px solid #7c3aed' }}>
          <div className="review-card-header">
            <h3 className="review-card-title">3. Education Details ({applyingFor})</h3>
            {!isLocked && (
              <button 
                type="button" 
                className="review-edit-btn" 
                onClick={() => handleEditSection('education')}
              >
                <FaEdit /> Edit Education Details
              </button>
            )}
          </div>

          {/* Bachelor's Education Details */}
          {applyingFor === "Bachelor's" && (
            <div>
              <div className="review-sub-heading">10+2 / Higher Secondary Information</div>
              <div className="review-info-grid" style={{ marginBottom: '18px' }}>
                <div className="review-info-item">
                  <span className="review-info-label">Highest Education</span>
                  <span className="review-info-val">{b.highestEducation || '10+2 / Higher Secondary'}</span>
                </div>
                <div className="review-info-item">
                  <span className="review-info-label">School / Institution</span>
                  <span className="review-info-val">{b.schoolName || '-'}</span>
                </div>
                <div className="review-info-item">
                  <span className="review-info-label">Education Board</span>
                  <span className="review-info-val">{b.board || '-'}</span>
                </div>
                <div className="review-info-item">
                  <span className="review-info-label">Country</span>
                  <span className="review-info-val">{b.country || '-'}</span>
                </div>
                <div className="review-info-item">
                  <span className="review-info-label">State / Province</span>
                  <span className="review-info-val">{b.state || '-'}</span>
                </div>
                <div className="review-info-item">
                  <span className="review-info-label">Years of Study</span>
                  <span className="review-info-val">{b.startYear || '-'} – {b.completionYear || '-'}</span>
                </div>
                <div className="review-info-item">
                  <span className="review-info-label">Percentage / CGPA</span>
                  <span className="review-info-val" style={{ color: '#16a34a', fontWeight: '700' }}>
                    {b.percentageCgpa || '-'}
                  </span>
                </div>
                <div className="review-info-item full-width">
                  <span className="review-info-label">Education Certificate</span>
                  <div style={{ marginTop: '4px' }}>
                    {renderDocLink(b.certificateDoc)}
                  </div>
                </div>
              </div>

              {/* Bachelor's Transfer Details */}
              {applicantType === 'Transfer Student' && (
                <div className="review-sub-divider">
                  <div className="review-sub-heading">Transfer College Information</div>
                  <div className="review-info-grid">
                    <div className="review-info-item">
                      <span className="review-info-label">Current / Previous College</span>
                      <span className="review-info-val">{t.currentCollege || '-'}</span>
                    </div>
                    <div className="review-info-item">
                      <span className="review-info-label">Current Program / Course</span>
                      <span className="review-info-val">{t.currentProgram || '-'}</span>
                    </div>
                    <div className="review-info-item">
                      <span className="review-info-label">Major</span>
                      <span className="review-info-val">{t.major || '-'}</span>
                    </div>
                    <div className="review-info-item">
                      <span className="review-info-label">Duration</span>
                      <span className="review-info-val">{t.startDate || '-'} – {t.endDate || '-'}</span>
                    </div>
                    <div className="review-info-item">
                      <span className="review-info-label">Credits Completed</span>
                      <span className="review-info-val">{t.creditsCompleted || '-'}</span>
                    </div>
                    <div className="review-info-item">
                      <span className="review-info-label">GPA / CGPA</span>
                      <span className="review-info-val" style={{ color: '#16a34a', fontWeight: '700' }}>
                        {t.gpaCgpa || '-'}
                      </span>
                    </div>
                    <div className="review-info-item full-width">
                      <span className="review-info-label">College Transcript</span>
                      <div style={{ marginTop: '4px' }}>
                        {renderDocLink(t.transcriptDoc)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Master's Education Details */}
          {applyingFor === "Master's" && (
            <div>
              <div className="review-sub-heading">Undergraduate Education Information</div>
              <div className="review-info-grid" style={{ marginBottom: '18px' }}>
                <div className="review-info-item">
                  <span className="review-info-label">Highest Education</span>
                  <span className="review-info-val">{m.highestEducation || "Bachelor's Degree"}</span>
                </div>
                <div className="review-info-item">
                  <span className="review-info-label">Degree Type</span>
                  <span className="review-info-val">{m.degreeType || '-'}</span>
                </div>
                <div className="review-info-item">
                  <span className="review-info-label">University / Institution</span>
                  <span className="review-info-val">{m.university || '-'}</span>
                </div>
                <div className="review-info-item">
                  <span className="review-info-label">Course / Major</span>
                  <span className="review-info-val">{m.courseMajor || '-'}</span>
                </div>
                <div className="review-info-item">
                  <span className="review-info-label">Country &amp; State</span>
                  <span className="review-info-val">{[m.country, m.state].filter(Boolean).join(', ') || '-'}</span>
                </div>
                <div className="review-info-item">
                  <span className="review-info-label">Years of Study</span>
                  <span className="review-info-val">{m.startYear || '-'} – {m.graduationYear || '-'}</span>
                </div>
                <div className="review-info-item">
                  <span className="review-info-label">GPA / CGPA</span>
                  <span className="review-info-val" style={{ color: '#16a34a', fontWeight: '700' }}>
                    {m.gpaCgpa || '-'}
                  </span>
                </div>
                <div className="review-info-item">
                  <span className="review-info-label">Degree Certificate</span>
                  <div style={{ marginTop: '4px' }}>
                    {renderDocLink(m.degreeDoc || m.degreeCertificateDoc)}
                  </div>
                </div>
                <div className="review-info-item">
                  <span className="review-info-label">Transcript</span>
                  <div style={{ marginTop: '4px' }}>
                    {renderDocLink(m.transcriptDoc)}
                  </div>
                </div>
              </div>

              {applicantType === 'Transfer Student' && (
                <div className="review-sub-divider">
                  <div className="review-sub-heading">Previous Post-Graduate / Transfer Information</div>
                  <div className="review-info-grid">
                    <div className="review-info-item">
                      <span className="review-info-label">Previous Institution</span>
                      <span className="review-info-val">{t.currentCollege || '-'}</span>
                    </div>
                    <div className="review-info-item">
                      <span className="review-info-label">Program / Major</span>
                      <span className="review-info-val">{t.major || t.currentProgram || '-'}</span>
                    </div>
                    <div className="review-info-item">
                      <span className="review-info-label">Credits Completed</span>
                      <span className="review-info-val">{t.creditsCompleted || '-'}</span>
                    </div>
                    <div className="review-info-item full-width">
                      <span className="review-info-label">Transfer Transcript</span>
                      <div style={{ marginTop: '4px' }}>
                        {renderDocLink(t.transcriptDoc)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Medical Education Details */}
          {applyingFor === "Medical" && (
            <div>
              <div className="review-sub-heading">Medical Education Information</div>
              <div className="review-info-grid">
                <div className="review-info-item">
                  <span className="review-info-label">Highest Education</span>
                  <span className="review-info-val">{med.highestEducation || '-'}</span>
                </div>
                <div className="review-info-item">
                  <span className="review-info-label">School / College</span>
                  <span className="review-info-val">{med.schoolCollege || '-'}</span>
                </div>
                <div className="review-info-item">
                  <span className="review-info-label">Institution</span>
                  <span className="review-info-val">{med.institution || '-'}</span>
                </div>
                <div className="review-info-item">
                  <span className="review-info-label">Course</span>
                  <span className="review-info-val">{med.course || '-'}</span>
                </div>
                <div className="review-info-item">
                  <span className="review-info-label">Country &amp; State</span>
                  <span className="review-info-val">{[med.country, med.state].filter(Boolean).join(', ') || '-'}</span>
                </div>
                <div className="review-info-item">
                  <span className="review-info-label">Years of Study</span>
                  <span className="review-info-val">{med.startYear || '-'} – {med.completionYear || '-'}</span>
                </div>
                <div className="review-info-item">
                  <span className="review-info-label">GPA / Percentage</span>
                  <span className="review-info-val" style={{ color: '#16a34a', fontWeight: '700' }}>
                    {med.gpaPercentage || '-'}
                  </span>
                </div>
                <div className="review-info-item full-width">
                  <span className="review-info-label">Academic Documents</span>
                  <div style={{ marginTop: '4px' }}>
                    {renderDocLink(med.academicDoc)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {summaryData.additionalDocuments?.length > 0 && (
          <div className="review-section-card" style={{ borderLeft: '4px solid #0ea5e9' }}>
            <div className="review-card-header">
              <h3 className="review-card-title">Additional Uploaded Documents</h3>
            </div>
            <div className="review-info-grid">
              {summaryData.additionalDocuments.map((document) => (
                <div className="review-info-item" key={document.id || document.documentType}>
                  <span className="review-info-label">{document.documentName || document.documentType || 'Document'}</span>
                  <div style={{ marginTop: '4px' }}>{renderDocLink(document.file)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 4: TEST SCORES */}
        <div className="review-section-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="review-card-header">
            <h3 className="review-card-title">4. Test Scores</h3>
            {!isLocked && (
              <button 
                type="button" 
                className="review-edit-btn" 
                onClick={() => handleEditSection('test')}
              >
                <FaEdit /> Edit Test Scores
              </button>
            )}
          </div>

          {testScores.hasNotTaken ? (
            <div className="review-notice-box" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>
              ✓ Standardized test score requirements waived: Applicant has indicated no standardized test has been taken or tests are not required.
            </div>
          ) : (
            <div className="review-test-list">
              {/* Language Test Card */}
              {languageTest && languageTest.exam && (
                <div className="review-test-card" style={{ borderLeft: '3px solid #0891b2' }}>
                  <div className="review-test-header">
                    <span className="review-test-name">
                      {languageTest.exam} (Language Proficiency)
                    </span>
                    <span className="review-score-badge">
                      Overall Score: {languageTest.score || 'N/A'}
                    </span>
                  </div>

                  <div className="review-test-date">
                    Test Date: {languageTest.testDate || 'N/A'}
                  </div>

                  {/* Section scores breakdown */}
                  {(languageTest.listeningScore || languageTest.readingScore || languageTest.writingScore || languageTest.speakingScore) && (
                    <div className="review-subscores-section">
                      <div className="review-subscores-label">Section Scores:</div>
                      <div className="review-chips-flex">
                        {languageTest.listeningScore && <span className="review-chip">Listening: {languageTest.listeningScore}</span>}
                        {languageTest.readingScore && <span className="review-chip">Reading: {languageTest.readingScore}</span>}
                        {languageTest.writingScore && <span className="review-chip">Writing: {languageTest.writingScore}</span>}
                        {languageTest.speakingScore && <span className="review-chip">Speaking: {languageTest.speakingScore}</span>}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
                      Score Report Document:
                    </span>
                    <div style={{ marginTop: '4px' }}>
                      {renderDocLink(languageTest.reportFile)}
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Tests Cards */}
              {additionalTests.map((tItem, idx) => (
                <div key={tItem.id || idx} className="review-test-card" style={{ borderLeft: '3px solid #6366f1' }}>
                  <div className="review-test-header">
                    <span className="review-test-name">{tItem.exam}</span>
                    <span className="review-score-badge">
                      Score: {tItem.score || 'N/A'}
                    </span>
                  </div>

                  <div className="review-test-date">
                    Test Date: {tItem.testDate || 'N/A'}
                  </div>

                  {/* Additional section scores breakdown */}
                  {(tItem.verbalScore || tItem.quantitativeScore || tItem.analyticalWritingScore || tItem.dataInsightsScore || tItem.readingScore || tItem.chemicalPhysicalScore) && (
                    <div className="review-subscores-section">
                      <div className="review-subscores-label">Section Scores:</div>
                      <div className="review-chips-flex">
                        {tItem.verbalScore && <span className="review-chip">Verbal: {tItem.verbalScore}</span>}
                        {tItem.quantitativeScore && <span className="review-chip">Quant: {tItem.quantitativeScore}</span>}
                        {tItem.analyticalWritingScore && <span className="review-chip">Writing: {tItem.analyticalWritingScore}</span>}
                        {tItem.dataInsightsScore && <span className="review-chip">Data Insights: {tItem.dataInsightsScore}</span>}
                        {tItem.readingScore && <span className="review-chip">Reading/Writing: {tItem.readingScore}</span>}
                        {tItem.chemicalPhysicalScore && <span className="review-chip">Chem/Phys: {tItem.chemicalPhysicalScore}</span>}
                        {tItem.carsScore && <span className="review-chip">CARS: {tItem.carsScore}</span>}
                        {tItem.biologicalBiochemicalScore && <span className="review-chip">Bio/Biochem: {tItem.biologicalBiochemicalScore}</span>}
                        {tItem.psychologicalSocialScore && <span className="review-chip">Psych/Social: {tItem.psychologicalSocialScore}</span>}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
                      Score Report Document:
                    </span>
                    <div style={{ marginTop: '4px' }}>
                      {renderDocLink(tItem.reportFile)}
                    </div>
                  </div>
                </div>
              ))}

              {!languageTest?.exam && additionalTests.length === 0 && (
                <p className="review-empty-text">No test scores recorded.</p>
              )}
            </div>
          )}
        </div>

        {/* CONFIRMATION & FINAL SUBMISSION */}
        {!isLocked && (
          <div className="review-declaration-card">
            <label className="review-declaration-label">
              <input 
                type="checkbox" 
                id="declaration" 
                checked={confirmedAccuracy} 
                onChange={(e) => setConfirmedAccuracy(e.target.checked)} 
              />
              <span>
                <strong>I confirm that the information provided is accurate and complete.</strong>
                <br />
                <span style={{ fontSize: '0.82rem', color: '#166534', opacity: 0.9 }}>
                  I understand that once I click "Send for Approval", my application details and documents will be locked and forwarded to the admissions committee for verification.
                </span>
              </span>
            </label>
          </div>
        )}

        {/* Footer Actions */}
        <div className="review-footer-actions">
          <button 
            type="button" 
            className="btn-footer-back" 
            onClick={() => {
              if (onBack) onBack();
              else navigate('/firstyear/enrollment/test');
            }}
            disabled={isSubmitting}
          >
            &larr; Back to Test Scores
          </button>
          
          <div className="review-footer-right">
            {isChangesRequested ? (
              <button
                type="button"
                className="btn-footer-submit"
                onClick={handleResubmitApplication}
                disabled={isResubmitting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#d97706', borderColor: '#d97706' }}
              >
                <FaPaperPlane /> {isResubmitting ? 'Resubmitting...' : 'Resubmit Application'}
              </button>
            ) : !isLocked ? (
              <button 
                type="button" 
                className="btn-footer-submit"
                onClick={handleOpenSubmitConfirm}
                disabled={isSubmitting || !confirmedAccuracy}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: confirmedAccuracy ? '#0891b2' : '#94a3b8',
                  borderColor: confirmedAccuracy ? '#0891b2' : '#94a3b8',
                  cursor: confirmedAccuracy ? 'pointer' : 'not-allowed'
                }}
              >
                <FaPaperPlane /> {isSubmitting ? 'Sending for Approval...' : 'Send for Approval'}
              </button>
            ) : (
              <button
                type="button"
                className="btn-footer-submit is-submitted"
                onClick={() => onOpenApplicationStatus ? onOpenApplicationStatus() : navigate('/application-status')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <FaShieldAlt /> View Application Status
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="review-modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="review-modal-card" onClick={e => e.stopPropagation()}>
            <h3 className="review-modal-title">Confirm Application Submission</h3>
            <p className="review-modal-text">
              Are you sure you want to send your application for approval?
              <br /><br />
              All information including your Basic Details, Education Details, Test Scores, and uploaded documents will be submitted to the admissions committee.
              <br /><br />
              <strong>Your application will be locked for editing upon submission.</strong>
            </p>
            <div className="review-modal-actions">
              <button 
                type="button" 
                className="btn-modal-cancel" 
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-modal-confirm" 
                style={{ background: '#0891b2', borderColor: '#0891b2' }}
                onClick={handleSubmitApplication}
              >
                Yes, Send for Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="review-modal-overlay">
          <div className="review-modal-card success-card" onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <FaCheckCircle style={{ color: '#059669', fontSize: '3rem' }} />
            </div>
            <h3 className="review-modal-title" style={{ textAlign: 'center' }}>
              Application Submitted for Approval!
            </h3>
            <div style={{
              background: '#ecfeff',
              border: '1.5px solid #06b6d4',
              borderRadius: '8px',
              padding: '12px 16px',
              margin: '16px 0',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.82rem', color: '#0e7490', textTransform: 'uppercase', fontWeight: '700' }}>
                Your Application Number
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0891b2', marginTop: '4px' }}>
                {submittedAppNum}
              </div>
            </div>
            <p className="review-modal-text" style={{ textAlign: 'center' }}>
              Your application has been received and is currently under review by our admissions team. You will be notified once your application is reviewed.
            </p>
            <div className="review-modal-actions vertical">
              <button 
                type="button" 
                className="btn-modal-done"
                style={{ background: '#0891b2', borderColor: '#0891b2' }}
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/application-status');
                }}
              >
                Go to Application Status &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReviewApplication;
