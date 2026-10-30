import React, { useState } from 'react';
import axiosInstance from '../../../../api/axiosInstance';
import './ApplicationConsistency.css';

const STATUS_LABELS = {
  consistent: 'No differences found in the fields that could be compared',
  review_required: 'Some details need your review',
  insufficient_data: 'Not enough extracted document data to compare yet',
};

const ApplicationConsistency = ({ scope = 'all' }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runCheck = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.post('/api/enrollment/application-consistency/check', { scope });
      if (!response.data?.success || !response.data?.data) {
        throw new Error(response.data?.message || 'Unable to check application consistency.');
      }
      setReport(response.data.data);
    } catch (checkError) {
      setError(checkError.response?.data?.message || checkError.message || 'Unable to check application consistency.');
    } finally {
      setLoading(false);
    }
  };

  const status = report?.status || '';

  return (
    <section className="application-consistency" aria-labelledby="application-consistency-title">
      <div className="application-consistency__header">
        <div>
          <span className="application-consistency__eyebrow">Before you submit</span>
          <h3 id="application-consistency-title">Application consistency check</h3>
          <p>Compare saved details with extracted information from uploaded documents. Files without extracted text cannot be checked automatically.</p>
        </div>
        <button type="button" onClick={runCheck} disabled={loading}>
          {loading ? 'Checking…' : report ? 'Check again' : 'Check application'}
        </button>
      </div>

      {error && <p className="application-consistency__error" role="alert">{error}</p>}

      {report && (
        <div className={`application-consistency__result is-${status}`} aria-live="polite">
          <strong>{STATUS_LABELS[status] || 'Consistency check complete'}</strong>
          <div className="application-consistency__counts">
            <span>{report.comparedFieldCount || 0} fields compared</span>
            <span>{report.uploadedDocumentCount || 0} documents found</span>
            <span>{report.extractedDocumentCount || 0} documents with extracted data</span>
          </div>
          {report.findings?.length > 0 && (
            <ul className="application-consistency__findings">
              {report.findings.map((finding, index) => (
                <li key={`${finding.code}-${index}`} className={`is-${finding.severity}`}>
                  <span className="application-consistency__finding-title">{finding.field} · {finding.section}</span>
                  <span>{finding.message}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="application-consistency__note">{report.coverageNote}</p>
          {report.checkedAt && (
            <small className="application-consistency__timestamp">
              Checked {new Date(report.checkedAt).toLocaleString()}
            </small>
          )}
        </div>
      )}
    </section>
  );
};

export default ApplicationConsistency;
