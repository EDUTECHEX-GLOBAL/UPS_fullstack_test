import React, { useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import './UniversityVerification.css';

const UniversityVerification = ({ application, onSuccess }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!application) return null;

  const isSent = application.universitySubmissionStatus === 'sent';
  const isMedical = application.applicationType === 'medical';

  if (!isMedical) {
    return null;
  }

  const handleSend = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/api/admin/university-verification/send-to-university`,
        { applicationId: application.applicationId },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setModalOpen(false);
      if (onSuccess) onSuccess();
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send application to university.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="uv-section">
      <h3>University Submission</h3>
      
      <div className="uv-status-row">
        <div className="uv-status-info">
          <span className="uv-status-label">Submission Status</span>
          <span className={`uv-status-badge ${isSent ? 'sent' : 'not_sent'}`}>
            {isSent ? 'Sent to University' : 'Not Sent'}
          </span>
        </div>
        
        <button 
          type="button" 
          className="uv-send-btn"
          onClick={() => setModalOpen(true)}
        >
          {isSent ? 'Resend to University' : 'Send to University'}
        </button>
      </div>

      {isSent && (
        <div className="uv-success-message">
          <div>✓ Application and documents sent successfully to the university.</div>
          <div><strong>University Email:</strong> {application.universitySubmittedEmail}</div>
          <div><strong>Sent At:</strong> {formatDate(application.universitySubmittedAt)}</div>
        </div>
      )}

      {modalOpen && (
        <div className="uv-modal-overlay" onClick={() => !loading && setModalOpen(false)}>
          <div className="uv-modal" onClick={e => e.stopPropagation()}>
            <div className="uv-modal-header">
              <h2>Send Application to University</h2>
            </div>
            
            <div className="uv-modal-body">
              {error && <div className="uv-error-alert">{error}</div>}
              
              <p>Are you sure you want to {isSent ? 'resend' : 'send'} this application and all verified documents to the university?</p>
              
              <div className="uv-modal-grid">
                <div className="uv-modal-grid-item">
                  <span>Student Name</span>
                  <strong>{application.studentName}</strong>
                </div>
                <div className="uv-modal-grid-item">
                  <span>Application ID</span>
                  <strong>{application.applicationId}</strong>
                </div>
                <div className="uv-modal-grid-item">
                  <span>University</span>
                  <strong>{application.university}</strong>
                </div>
                <div className="uv-modal-grid-item">
                  <span>Program</span>
                  <strong>{application.programme}</strong>
                </div>
              </div>
              
              <p style={{ fontSize: '0.9rem' }}>
                Note: This will generate a complete application PDF and attach it to the email.
              </p>
            </div>
            
            <div className="uv-modal-footer">
              <button 
                type="button" 
                className="uv-btn-cancel" 
                onClick={() => setModalOpen(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="uv-btn-confirm" 
                onClick={handleSend}
                disabled={loading}
              >
                {loading ? 'Sending...' : (isSent ? 'Resend Documents' : 'Send Documents')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversityVerification;
