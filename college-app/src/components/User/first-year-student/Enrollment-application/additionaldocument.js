import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../../../api/axiosInstance';
import './additionaldocument.css';

const resolveStudyTypeLabel = (pt) => {
  if (!pt) return 'Bachelor';
  const key = String(pt).trim().toLowerCase();
  if (key.includes('med') || key === 'mbbs') return 'Medical';
  if (key.includes('master') || key === 'pg' || key === 'masters') return 'Master';
  return 'Bachelor';
};

const AdditionalDocument = ({ programType, data = {}, onUpdate, onNext, onBack, readOnly = false }) => {
  const detectedStudyType = resolveStudyTypeLabel(
    programType || data?.programType || data?.programSelection?.programType
  );

  const [studyType, setStudyType] = useState(detectedStudyType);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingTypes, setUploadingTypes] = useState({}); // { [docType]: true }
  const [deletingTypes, setDeletingTypes] = useState({});   // { [docType]: true }
  const [alert, setAlert] = useState(null); // { type: 'success' | 'error', message: '' }
  const [pendingDelete, setPendingDelete] = useState(null);

  // Update studyType if prop changes
  useEffect(() => {
    setStudyType(resolveStudyTypeLabel(programType || data?.programType));
  }, [programType, data]);

  // Fetch additional documents config & uploaded status from API
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setAlert(null);
    try {
      const res = await axiosInstance.get('/api/additional-documents', {
        params: { studyType }
      });

      if (res.data?.success) {
        setDocuments(res.data.documents || []);
        if (res.data.studyType) {
          setStudyType(res.data.studyType);
        }
      } else {
        setAlert({ type: 'error', message: res.data?.message || 'Failed to load documents.' });
      }
    } catch (err) {
      console.error('Error fetching additional documents:', err);
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to fetch additional documents list.'
      });
    } finally {
      setLoading(false);
    }
  }, [studyType]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // File upload handler
  const handleFileUpload = async (docItem, file) => {
    if (!file) return;

    const isPhoto = ['photo', 'doc-photo'].includes(docItem.documentType.toLowerCase());
    const isResume = ['cv', 'doc-cv'].includes(docItem.documentType.toLowerCase());
    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = isPhoto ? ['jpg', 'jpeg', 'png'] : isResume ? ['pdf', 'doc', 'docx'] : ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
    const maxSize = isPhoto ? 2 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxSize) {
      setAlert({ type: 'error', message: isPhoto ? 'Photograph must be no larger than 2MB.' : 'File size exceeds maximum limit of 15MB.' });
      return;
    }
    if (!allowed.includes(ext) || (isPhoto && !(file.type || '').startsWith('image/'))) {
      setAlert({
        type: 'error',
        message: isPhoto ? 'Photograph must be a JPG, JPEG, or PNG image.' : 'Invalid file format. Allowed formats: PDF, JPG, PNG, DOC, DOCX.'
      });
      return;
    }

    const docType = docItem.documentType;
    setUploadingTypes(prev => ({ ...prev, [docType]: true }));
    setAlert(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', docItem.documentType);
      formData.append('documentName', docItem.documentName);
      formData.append('studyType', studyType);
      formData.append('required', docItem.required ? 'true' : 'false');
      formData.append('conditional', docItem.conditional ? 'true' : 'false');
      if (docItem.conditionText) {
        formData.append('conditionText', docItem.conditionText);
      }

      const res = await axiosInstance.post('/api/additional-documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success) {
        setAlert({ type: 'success', message: res.data.message || `${docItem.documentName} uploaded successfully.` });
        await fetchDocuments();
        if (onUpdate) {
          onUpdate('additionalDocuments', { status: 'Completed' });
        }
      } else {
        setAlert({ type: 'error', message: res.data?.message || 'Upload failed.' });
      }
    } catch (err) {
      console.error('Document upload error:', err);
      setAlert({
        type: 'error',
        message: err.response?.data?.message || `Failed to upload ${docItem.documentName}.`
      });
    } finally {
      setUploadingTypes(prev => ({ ...prev, [docType]: false }));
    }
  };

  // Delete file handler
  const handleDeleteDocument = async (docItem) => {
    if (!docItem.docId && !docItem.file) return;

    const docType = docItem.documentType;
    setDeletingTypes(prev => ({ ...prev, [docType]: true }));
    setAlert(null);

    try {
      const targetId = docItem.docId || docItem.documentType;
      const res = await axiosInstance.delete(`/api/additional-documents/${targetId}`);

      if (res.data?.success) {
        setAlert({ type: 'success', message: `${docItem.documentName} deleted successfully.` });
        await fetchDocuments();
      } else {
        setAlert({ type: 'error', message: res.data?.message || 'Failed to delete document.' });
      }
    } catch (err) {
      console.error('Delete document error:', err);
      setAlert({
        type: 'error',
        message: err.response?.data?.message || `Failed to delete ${docItem.documentName}.`
      });
    } finally {
      setDeletingTypes(prev => ({ ...prev, [docType]: false }));
    }
  };

  const handleSaveAndContinue = () => {
    // Check if any mandatory document is missing
    const missingRequired = documents.filter(d => d.required && d.status !== 'Uploaded');
    if (missingRequired.length > 0) {
      setAlert({
        type: 'error',
        message: `Please upload all required documents (${missingRequired.map(d => d.documentName).join(', ')}) before continuing.`
      });
      return;
    }

    if (onNext) {
      onNext();
    }
  };

  return (
    <div className="add-docs-container">
      {/* Header */}
      <div className="add-docs-header">
        <div className="add-docs-title-row">
          <h2>
            Additional Documents
          </h2>
          <span className={`study-type-badge ${studyType.toLowerCase()}`}>
            {studyType} Application
          </span>
        </div>
        <p className="add-docs-subtitle">
          Upload program-specific and degree documents required for your <strong>{studyType}</strong> application.
        </p>
      </div>

      {/* Alert Banners */}
      {alert && (
        <div className={`add-docs-alert ${alert.type}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{alert.message}</span>
          </div>
          <button className="add-docs-alert-close" onClick={() => setAlert(null)}>×</button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          <span className="add-docs-spinner" style={{ width: '24px', height: '24px', marginRight: '8px' }}></span>
          Loading required document checklist for {studyType}...
        </div>
      ) : (
        /* Document Cards Grid */
        <div className="add-docs-grid">
          {documents.map((item) => {
            const isUploaded = item.status === 'Uploaded' && item.file;
            const isUploading = uploadingTypes[item.documentType];
            const isDeleting = deletingTypes[item.documentType];
            const inputId = `file-input-${item.documentType}`;

            return (
              <div key={item.documentType} className={`add-doc-card ${isUploaded ? 'is-uploaded' : ''}`}>
                <div>
                  <div className="add-doc-card-header">
                    <div className="add-doc-card-title-row">
                      <h3 className="add-doc-name">{item.documentName}</h3>
                      <div className="add-doc-badges">
                        {item.required ? (
                          <span className="doc-badge required">Required</span>
                        ) : (
                          <span className="doc-badge optional">Optional</span>
                        )}
                        {item.conditional && (
                          <span className="doc-badge conditional">Conditional</span>
                        )}
                      </div>
                    </div>
                    {item.description && (
                      <p className="add-doc-desc">{item.description}</p>
                    )}
                    {item.conditional && item.conditionText && (
                      <div className="add-doc-condition-text">
                        {item.conditionText}
                      </div>
                    )}
                  </div>

                  {/* Uploaded File View */}
                  {isUploaded ? (
                    <div className="add-doc-uploaded-box">
                      <div className="add-doc-file-info">
                        <div className="file-details">
                          <span className="file-name" title={item.file.originalName || item.file.fileName}>
                            {item.file.originalName || item.file.fileName}
                          </span>
                          <span className="file-meta">
                            {item.file.size ? `${item.file.size} · ` : ''}Uploaded
                          </span>
                        </div>
                      </div>
                      <div className="add-doc-actions">
                        {item.file.fileUrl && (
                          <a 
                            href={item.file.fileUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="btn-doc-action view"
                            title="View document"
                          >
                            View
                          </a>
                        )}
                        {!readOnly && (
                          <>
                            <label htmlFor={inputId} className="btn-doc-action replace" title="Replace file">
                              Replace
                            </label>
                            {item.docId && <button
                                type="button"
                                className="btn-doc-action delete"
                                onClick={() => setPendingDelete(item)}
                                disabled={isDeleting}
                                title="Delete file"
                              >
                                {isDeleting ? <span className="add-docs-spinner"></span> : 'Delete'}
                              </button>}
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Empty Upload Box */
                    <div className={`add-doc-upload-box ${readOnly ? 'read-only' : ''}`}>
                      <label
                        htmlFor={readOnly ? undefined : inputId}
                        className={`upload-dropzone ${isUploading ? 'uploading' : ''}`}
                      >
                        {readOnly ? (
                          <span className="upload-prompt">Not uploaded</span>
                        ) : isUploading ? (
                          <>
                            <span className="add-docs-spinner" style={{ width: '20px', height: '20px' }}></span>
                            <span className="upload-prompt">Uploading {item.documentName}...</span>
                          </>
                        ) : (
                          <>
                            <span className="upload-prompt">Upload {item.documentName}</span>
                    <span className="upload-hint">
                      {['photo', 'doc-photo'].includes(item.documentType.toLowerCase())
                        ? 'JPG or PNG (Max 2MB)'
                        : ['cv', 'doc-cv'].includes(item.documentType.toLowerCase())
                          ? 'PDF, DOC, or DOCX (Max 15MB)'
                          : 'PDF, JPG, PNG, DOC, DOCX (Max 15MB)'}
                    </span>
                          </>
                        )}
                      </label>
                    </div>
                  )}

                  {/* Hidden File Input */}
                  <input
                    id={inputId}
                    type="file"
                    className="hidden-file-input"
                    accept={['photo', 'doc-photo'].includes(item.documentType.toLowerCase())
                      ? '.jpg,.jpeg,.png'
                      : ['cv', 'doc-cv'].includes(item.documentType.toLowerCase())
                        ? '.pdf,.doc,.docx'
                        : '.pdf,.jpg,.jpeg,.png,.doc,.docx'}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(item, e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                    disabled={readOnly || isUploading}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Navigation Buttons */}
      {!readOnly && <div className="add-docs-actions-footer">
        <button type="button" className="btn-back" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn-next" onClick={handleSaveAndContinue}>
          Save &amp; Continue
        </button>
      </div>}

      {pendingDelete && (
        <div className="add-doc-delete-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPendingDelete(null);
        }}>
          <section className="add-doc-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
            <div className="add-doc-delete-icon" aria-hidden="true">!</div>
            <h2 id="delete-dialog-title">Delete uploaded document?</h2>
            <p className="add-doc-delete-intro">This file will be removed from your application.</p>
            <dl className="add-doc-delete-details">
              <div><dt>Document</dt><dd>{pendingDelete.documentName}</dd></div>
              <div><dt>File name</dt><dd>{pendingDelete.file?.originalName || pendingDelete.file?.fileName || 'Uploaded file'}</dd></div>
              {pendingDelete.file?.size && <div><dt>File size</dt><dd>{pendingDelete.file.size}</dd></div>}
              <div><dt>Status</dt><dd>Uploaded</dd></div>
            </dl>
            <div className="add-doc-delete-actions">
              <button type="button" className="add-doc-delete-cancel" onClick={() => setPendingDelete(null)}>Cancel</button>
              <button type="button" className="add-doc-delete-confirm" onClick={() => {
                const doc = pendingDelete;
                setPendingDelete(null);
                handleDeleteDocument(doc);
              }}>Delete file</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdditionalDocument;

