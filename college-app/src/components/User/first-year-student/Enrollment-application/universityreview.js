import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../../api/axiosInstance';
import { resolveFileUrl } from '../../../../utils/fileUrl';
import './universityreview.css';

const UniversityReview = ({ onBack, onComplete, readOnly = false }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [alert, setAlert] = useState(null);
  const [agreedTerms, setAgreedTerms] = useState(true);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const fetchReviewData = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get('/api/enrollment/university-review');
        if (res.data?.success) {
          setReviewData(res.data.data);
        } else {
          setAlert({ type: 'error', message: res.data?.message || 'Failed to load review data.' });
        }
      } catch (err) {
        console.error('Error fetching university review data:', err);
        setAlert({
          type: 'error',
          message: err.response?.data?.message || 'Failed to fetch application review summary.'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReviewData();
  }, []);

  const handleOpenSubmitConfirm = () => {
    if (readOnly) return;
    if (!agreedTerms) {
      setAlert({ type: 'error', message: 'Please agree to the declaration statement before submitting.' });
      return;
    }
    setShowConfirmModal(true);
  };

  const handleSubmitApplication = async () => {
    if (readOnly) return;
    setShowConfirmModal(false);
    setSubmitting(true);
    setAlert(null);

    try {
      const res = await axiosInstance.post('/api/enrollment/university-review/submit');
      if (res.data?.success) {
        setReviewData(prev => ({ ...prev, isSubmitted: true }));
        setShowSuccessModal(true);
      } else {
        setAlert({ type: 'error', message: res.data?.message || 'Failed to submit application.' });
      }
    } catch (err) {
      console.error('Error submitting application:', err);
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to submit application.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloadingPdf(true);
    setAlert(null);
    try {
      const res = await axiosInstance.get('/api/enrollment/university-review/download-pdf', {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const typeName = reviewData?.studyType || 'Application';
      const cleanType = typeName.charAt(0).toUpperCase() + typeName.slice(1);
      link.setAttribute('download', `${cleanType}_Application_Summary.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setAlert({ type: 'success', message: 'Application Summary PDF downloaded successfully!' });
    } catch (err) {
      console.error('Download PDF error:', err);
      setAlert({ type: 'error', message: 'Failed to download PDF summary.' });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleResendEmail = async () => {
    setSendingEmail(true);
    setAlert(null);
    try {
      const res = await axiosInstance.post('/api/enrollment/university-review/resend-email');
      if (res.data?.success) {
        setAlert({ type: 'success', message: res.data.message || 'Confirmation email and PDF resent successfully!' });
      } else {
        setAlert({ type: 'error', message: res.data?.message || 'Failed to resend email.' });
      }
    } catch (err) {
      console.error('Resend email error:', err);
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to resend confirmation email.' });
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="uni-review-loading">
        <span className="uni-review-spinner"></span>
        <span>Compiling complete application summary...</span>
      </div>
    );
  }

  const {
    studyType: rawStudyType = 'Bachelor',
    applicantInfo = {},
    educationSummary = [],
    testScores = {},
    universitySelection = {},
    documents = {},
    isSubmitted = false
  } = reviewData || {};

  const studyType = String(rawStudyType).charAt(0).toUpperCase() + String(rawStudyType).slice(1);

  const formatDocTitle = (docKey) => {
    if (!docKey) return '';
    const map = {
      'passport': 'Passport',
      'photo': 'Photograph',
      'cv': 'CV / Resume',
      'transcript': 'Academic Transcript',
      'diploma': 'Diploma / Degree Certificate',
      'cert9th': '9th Grade Certificate',
      'cert10th': '10th Grade Certificate',
      'cert11th': '11th Grade Certificate',
      'cert12th': '12th Grade Certificate',
      'doc-passport': 'Passport',
      'doc-photo': 'Photograph',
      'doc-cv': 'CV / Resume',
      'doc-9th': '9th Grade Certificate',
      'doc-10th': '10th Grade Certificate',
      'doc-11th': '11th Grade Certificate',
      'doc-12th': '12th Grade Certificate',
      'doc-transcript': 'Academic Transcript'
    };
    if (map[docKey]) return map[docKey];
    const cleanKey = String(docKey).replace(/^doc-/i, '');
    return cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1).replace(/([A-Z])/g, ' $1');
  };

  const commonDocs = documents.common || [];
  const additionalDocs = documents.additional || [];
  const selectedUnis = universitySelection.selectedUniversities || [];
  const testList = testScores.tests || [];

  return (
    <div className="uni-review-wrapper">
      <div className="uni-review-container">
        {/* Header Section */}
        <div className="uni-review-header">
          <div className="uni-review-header-title">
            <h2>Review &amp; Submit Application</h2>
            <div className="uni-header-actions">
              <button 
                type="button" 
                className="btn-header-download"
                onClick={handleDownloadPDF} 
                disabled={downloadingPdf}
              >
                {downloadingPdf ? 'Downloading...' : 'Download PDF Report'}
              </button>
              <span className="study-type-badge">
                {studyType} Application
              </span>
            </div>
          </div>
          <p className="uni-review-header-desc">
            Comprehensive overview of your personal details, educational background, test scores, selected universities/courses, and documents.
          </p>
        </div>

        {/* Alert Notifications */}
        {alert && (
          <div className={`uni-review-alert ${alert.type}`}>
            <span>{alert.message}</span>
            <button className="uni-review-alert-close" onClick={() => setAlert(null)}>×</button>
          </div>
        )}

        {/* 1. APPLICANT PERSONAL & CONTACT DETAILS */}
        <div className="review-section-card">
          <h3 className="review-card-title">Personal &amp; Contact Details</h3>
          
          <div className="review-info-grid">
            <div className="review-info-item">
              <span className="review-info-label">Full Name</span>
              <span className="review-info-val">{applicantInfo.name || '-'}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Email Address</span>
              <span className="review-info-val">{applicantInfo.email || '-'}</span>
            </div>
            <div className="review-info-item">
              <span className="review-info-label">Phone / Mobile</span>
              <span className="review-info-val">{applicantInfo.phone || '-'}</span>
            </div>
            
          
           
         
          </div>

          {/* Address & Passport Sub-section */}
          {(applicantInfo.address || applicantInfo.correspondenceAddress || applicantInfo.passportNumber) && (
            <div className="review-sub-divider">
              <div className="review-info-grid">
                {applicantInfo.address && (
                  <div className="review-info-item full-width">
                    <span className="review-info-label">Permanent / Residential Address</span>
                    <span className="review-info-val">{applicantInfo.permanentAddress || applicantInfo.address}</span>
                  </div>
                )}
                {applicantInfo.correspondenceAddress && (
                  <div className="review-info-item full-width">
                    <span className="review-info-label">Correspondence Address</span>
                    <span className="review-info-val">{applicantInfo.correspondenceAddress}</span>
                  </div>
                )}
                {applicantInfo.passportNumber && (
                  <>
                    <div className="review-info-item">
                      <span className="review-info-label">Passport Number</span>
                      <span className="review-info-val">{applicantInfo.passportNumber}</span>
                    </div>
                    <div className="review-info-item">
                      <span className="review-info-label">Passport Validity</span>
                      <span className="review-info-val">Issued: {applicantInfo.passportIssueDate || '-'} | Expires: {applicantInfo.passportExpiryDate || '-'}</span>
                    </div>
                    <div className="review-info-item">
                      <span className="review-info-label">Issuing Country</span>
                      <span className="review-info-val">{applicantInfo.issuingCountry || '-'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Parent / Emergency Contact Details */}
          {(applicantInfo.parent1?.name || applicantInfo.parent1?.email || applicantInfo.parent1?.phone || applicantInfo.parent2?.name || applicantInfo.parent2?.email || applicantInfo.parent2?.phone) && (
            <div className="review-sub-divider">
              <h4 className="review-sub-heading">Father &amp; Mother Details</h4>
              <div className="review-info-grid">
                {(applicantInfo.parent1?.name || applicantInfo.parent1?.email || applicantInfo.parent1?.phone) && (
                  <div className="review-info-item">
                    <span className="review-info-label">{applicantInfo.parent1.relationship || 'Father / Guardian'}</span>
                    <span className="review-info-val">
                      {applicantInfo.parent1.name || '-'}{applicantInfo.parent1.phone ? ` · Phone: ${applicantInfo.parent1.phone}` : ''}{applicantInfo.parent1.email ? ` · Email: ${applicantInfo.parent1.email}` : ''}
                    </span>
                  </div>
                )}
                {(applicantInfo.parent2?.name || applicantInfo.parent2?.email || applicantInfo.parent2?.phone) && (
                  <div className="review-info-item">
                    <span className="review-info-label">{applicantInfo.parent2.relationship || 'Mother'}</span>
                    <span className="review-info-val">
                      {applicantInfo.parent2.name || '-'}{applicantInfo.parent2.phone ? ` · Phone: ${applicantInfo.parent2.phone}` : ''}{applicantInfo.parent2.email ? ` · Email: ${applicantInfo.parent2.email}` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. EDUCATIONAL QUALIFICATIONS HISTORY */}
        <div className="review-section-card">
          <h3 className="review-card-title">Educational History ({educationSummary.length})</h3>
          {educationSummary.length === 0 ? (
            <p className="review-empty-text">No educational records provided.</p>
          ) : (
            <div className="review-table-wrapper">
              <table className="review-table">
                <thead>
                  <tr>
                    <th>Qualification</th>
                    <th>Institution / School</th>
                    <th>Board / University</th>
                    <th>Year</th>
                    <th>Score / CGPA</th>
                    <th>Country</th>
                  </tr>
                </thead>
                <tbody>
                  {educationSummary.map((edu, idx) => (
                    <tr key={idx}>
                      <td className="cell-primary">{edu.qualification || '-'}</td>
                      <td>{edu.schoolName || '-'}</td>
                      <td>{edu.boardUniversity || '-'}</td>
                      <td>{edu.yearOfPassing || '-'}</td>
                      <td className="cell-score">{edu.score || '-'}</td>
                      <td>{edu.country || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 3. STANDARDIZED TEST SCORES */}
        <div className="review-section-card">
          <h3 className="review-card-title">Standardized Test Scores</h3>
          {testScores.hasNotTaken ? (
            <div className="review-notice-box">
              Declared: Standardized test scores not taken.
            </div>
          ) : testList.length === 0 ? (
            <p className="review-empty-text">No test scores recorded.</p>
          ) : (
            <div className="review-test-list">
              {testList.map((t, idx) => {
                const hasReport = Boolean(t.reportFileUrl || t.reportFileName);
                const rawStatus = String(t.verificationStatus || '').trim();
                const statusLabel = /^(verified|rejected|failed)$/i.test(rawStatus)
                  ? rawStatus
                  : hasReport ? 'Awaiting verification' : 'Self-reported';
                return (
                <div key={idx} className="review-test-card">
                  <div className="review-test-header">
                    <span className="review-test-name">{t.exam}</span>
                    <div className="review-test-header-badges">
                      <span className="review-score-badge">
                        Score: {t.score || 'N/A'}
                      </span>
                      {statusLabel && (
                        <span className="review-status-badge">
                          {statusLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="review-test-date">
                    Test Date: {t.testDate || 'N/A'}
                  </div>
                  {hasReport && (
                    <div className="review-test-report">
                      {t.reportFileUrl ? (
                        <a href={t.reportFileUrl} target="_blank" rel="noreferrer">
                          View score report{t.reportFileName ? ` (${t.reportFileName})` : ''}
                        </a>
                      ) : <span>Score report: {t.reportFileName}</span>}
                    </div>
                  )}

                  {/* Sub-scores & Breakdown Chips */}
                  {(t.readingScore || t.listeningScore || t.speakingScore || t.writingScore || t.verbalScore || t.quantitativeScore || t.analyticalWritingScore || t.chemicalPhysicalScore || t.carsScore || t.biologicalBiochemicalScore || t.psychologicalSocialScore || t.percentile || t.allIndiaRank || t.sjtBand) && (
                    <div className="review-subscores-section">
                      <div className="review-subscores-label">
                        Sub-Scores Breakdown:
                      </div>
                      <div className="review-chips-flex">
                        {t.readingScore && <span className="review-chip">Reading: {t.readingScore}</span>}
                        {t.listeningScore && <span className="review-chip">Listening: {t.listeningScore}</span>}
                        {t.speakingScore && <span className="review-chip">Speaking: {t.speakingScore}</span>}
                        {t.writingScore && <span className="review-chip">Writing: {t.writingScore}</span>}
                        {t.verbalScore && <span className="review-chip">Verbal: {t.verbalScore}</span>}
                        {t.quantitativeScore && <span className="review-chip">Quantitative: {t.quantitativeScore}</span>}
                        {t.analyticalWritingScore && <span className="review-chip">Analytical Writing: {t.analyticalWritingScore}</span>}
                        {t.chemicalPhysicalScore && <span className="review-chip">Chem/Phys: {t.chemicalPhysicalScore}</span>}
                        {t.carsScore && <span className="review-chip">CARS: {t.carsScore}</span>}
                        {t.biologicalBiochemicalScore && <span className="review-chip">Bio/Biochem: {t.biologicalBiochemicalScore}</span>}
                        {t.psychologicalSocialScore && <span className="review-chip">Psych/Social: {t.psychologicalSocialScore}</span>}
                        {t.percentile && <span className="review-chip">Percentile: {t.percentile}%</span>}
                        {t.allIndiaRank && <span className="review-chip">AIR: {t.allIndiaRank}</span>}
                        {t.sjtBand && <span className="review-chip">SJT Band: {t.sjtBand}</span>}
                      </div>
                    </div>
                  )}

                  <div className="review-qualifying-unis">

                 
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. SELECTED UNIVERSITIES & COURSES */}
        <div className="review-section-card">
          <h3 className="review-card-title">
            Selected Universities &amp; Programs ({selectedUnis.length} {selectedUnis.length === 1 ? 'University' : 'Universities'}
            {selectedUnis.length > 0 ? ` · ${selectedUnis.reduce((acc, u) => acc + (Array.isArray(u.selectedPrograms) && u.selectedPrograms.length > 0 ? u.selectedPrograms.length : (u.programName ? String(u.programName).split(',').filter(Boolean).length : 1)), 0)} Programs` : ''})
          </h3>
          {selectedUnis.length === 0 ? (
            <p className="review-empty-text">No universities selected yet.</p>
          ) : (
            <div className="review-uni-list">
              {selectedUnis.map((uni, idx) => (
                <div key={idx} className="review-uni-card">
                  <div className="review-uni-header">
                    <span className="review-uni-name">{uni.universityName}</span>
                    <span className="review-uni-country">{uni.country}</span>
                  </div>
                  <div className="review-uni-courses-label">
                    Selected Course(s) / Program(s):
                  </div>
                  <div className="review-chips-flex">
                    {uni.selectedPrograms && uni.selectedPrograms.length > 0 ? (
                      uni.selectedPrograms.map((prog, pIdx) => (
                        <span key={pIdx} className="review-chip primary-chip">{prog}</span>
                      ))
                    ) : (
                      <span className="review-chip primary-chip">{uni.programName}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. UPLOADED APPLICATION DOCUMENTS */}
        <div className="review-section-card">
          <h3 className="review-card-title">Uploaded Application Documents</h3>
          
          {/* Common Documents */}
          <h4 className="review-sub-heading no-margin">Common Documents</h4>
          <div className="review-docs-grid">
            {commonDocs.map(doc => (
              <div key={doc.key} className="review-doc-row">
                <span className="review-doc-name">{formatDocTitle(doc.title || doc.key)}</span>
                <div className="review-doc-actions">
                  <span className={`review-doc-badge ${doc.status === 'Uploaded' ? 'status-uploaded' : 'status-pending'}`}>
                    {doc.status}
                  </span>
                  {doc.fileUrl && (
                    <a href={resolveFileUrl(doc.fileUrl)} target="_blank" rel="noreferrer" className="btn-doc-view">
                      View
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Additional Documents */}
          {additionalDocs.length > 0 && (
            <div className="review-sub-divider">
              <h4 className="review-sub-heading no-margin">{studyType} Additional Documents</h4>
              <div className="review-docs-grid">
                {additionalDocs.map(doc => (
                  <div key={doc.id || doc.documentType} className="review-doc-row">
                    <div className="review-doc-title-group">
                      <span className="review-doc-name">{doc.documentName}</span>
                      {doc.required && <span className="review-req-tag">Required</span>}
                    </div>
                    <div className="review-doc-actions">
                      <span className={`review-doc-badge ${doc.status === 'Uploaded' ? 'status-uploaded' : 'status-pending'}`}>
                        {doc.status}
                      </span>
                      {doc.file?.fileUrl && (
                        <a href={resolveFileUrl(doc.file.fileUrl)} target="_blank" rel="noreferrer" className="btn-doc-view">
                          View
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 6. DECLARATION */}
        {!readOnly && <div className="review-declaration-card">
          <label className="review-declaration-label">
            <input 
              type="checkbox" 
              checked={agreedTerms} 
              onChange={(e) => setAgreedTerms(e.target.checked)}
            />
            <span>
              I hereby declare that all the information provided in this application, including my personal details, education background, test scores, selected universities/programs, and uploaded documents, is true, accurate, and complete to the best of my knowledge.
            </span>
          </label>
        </div>}

        {/* 7. FOOTER ACTIONS */}
        {!readOnly && <div className="review-footer-actions">
          <button type="button" className="btn-footer-back" onClick={onBack} disabled={submitting}>
            Back
          </button>
          
          <div className="review-footer-right">
            {isSubmitted && (
              <button 
                type="button" 
                className="btn-footer-resend"
                onClick={handleResendEmail}
                disabled={sendingEmail}
              >
                {sendingEmail ? 'Resending...' : 'Resend Email & PDF'}
              </button>
            )}
            <button 
              type="button" 
              className={`btn-footer-submit ${isSubmitted ? 'is-submitted' : ''}`}
              onClick={handleOpenSubmitConfirm}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : isSubmitted ? 'Application Submitted (Submit Again)' : 'Submit Application'}
            </button>
          </div>
        </div>}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="review-modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="review-modal-card" onClick={e => e.stopPropagation()}>
            <h3 className="review-modal-title">Confirm Final Application Submission</h3>
            <p className="review-modal-text">
              Are you sure you want to submit your application? Once submitted, your details, test scores, and uploaded documents will be sent to the university admissions review team.
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
                onClick={handleSubmitApplication}
              >
                Yes, Submit Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="review-modal-overlay">
          <div className="review-modal-card success-card" onClick={e => e.stopPropagation()}>
            <h3 className="review-modal-title">Application Submitted Successfully!</h3>
            <p className="review-modal-text">
              Congratulations! Your official university application has been submitted. A confirmation email and complete PDF application summary have been sent to your registered email.
            </p>
            <div className="review-modal-features">
              <div className="review-feature-row">
                Save a copy of your application PDF summary for your records.
              </div>
              <div className="review-feature-row">
                You can resend the confirmation email anytime if needed.
              </div>
            </div>
            <div className="review-modal-actions vertical">
              <button 
                type="button" 
                className="btn-modal-primary" 
                onClick={handleDownloadPDF}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? 'Downloading...' : 'Download Summary PDF'}
              </button>
              <button 
                type="button" 
                className="btn-modal-secondary" 
                onClick={handleResendEmail}
                disabled={sendingEmail}
              >
                {sendingEmail ? 'Resending...' : 'Resend Confirmation Email'}
              </button>
              <button 
                type="button" 
                className="btn-modal-done" 
                onClick={() => {
                  setShowSuccessModal(false);
                  if (onComplete) onComplete();
                }}
              >
                Done / Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversityReview;
