import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../../api/axiosInstance';
import './document.css';

const DocumentUpload = ({ data = {}, onUpdate, onNext, onBack }) => {
  const normalizeDocumentData = (dataObj) => {
    if (dataObj.documents) return dataObj.documents;
    const hasKeys = Object.keys(dataObj).some(k => k.startsWith('doc-'));
    return hasKeys ? dataObj : {};
  };

  const normalizedDocuments = normalizeDocumentData(data);
  
  // Debugging logs
  console.log('DocumentUpload data prop:', data);
  console.log('Normalized documents:', normalizedDocuments);

  const grade12Status = data.grade12Status || 'pending';
  const expectedMonth = data.expectedMonth || '';
  const expectedYear = data.expectedYear || '';

  const [documentRequirements] = useState([
    { id: 'doc-passport', name: 'Passport', description: 'Copy of valid international passport.', type: 'Required', required: true },
    { id: 'doc-photo', name: 'Passport Size Photo', description: 'Recent passport-size photograph.', type: 'Required', required: true },
    { id: 'doc-cv', name: 'CV / Resume', description: 'Your most recent curriculum vitae or resume.', type: 'Required', required: true },
    { id: 'doc-9th', name: '9th Grade Certificate', description: 'Academic transcript for 9th grade.', type: 'Required', required: true },
    { id: 'doc-10th', name: '10th Grade Certificate', description: 'Academic certificate required for undergraduate applications.', type: 'Required', required: true },
    { id: 'doc-11th', name: '11th Grade Certificate', description: 'Academic transcript for 11th grade.', type: 'Required', required: true },
    { id: 'doc-12th', name: '12th Grade Certificate', description: 'Final high school transcript.', type: 'Required', required: true }
  ]);

  const [documentState, setDocumentState] = useState(() => {
    const defaultState = {};
    const reqIds = [
      'doc-passport',
      'doc-photo',
      'doc-cv',
      'doc-9th',
      'doc-10th',
      'doc-11th',
      'doc-12th'
    ];
    reqIds.forEach(id => {
      defaultState[id] = normalizedDocuments[id] || { status: 'Pending', file: null, size: null };
    });
    return defaultState;
  });

  const loadDocuments = async () => {
    try {
      const studentTempId = localStorage.getItem("studentTempId") || "";
      const response = await axiosInstance.get('/api/enrollment/documents' + (studentTempId ? `?studentTempId=${studentTempId}` : ""));
      if (response.data?.success) {
        const payload = response.data.data;
        
        console.log(
          '[DOCUMENT GET] payload:',
          JSON.stringify(payload, null, 2)
        );

        console.log(
          '[DOCUMENT GET] documents:',
          JSON.stringify(payload.documents, null, 2)
        );

        const defaultDocumentState = {};
        const reqIds = [
          'doc-passport',
          'doc-photo',
          'doc-cv',
          'doc-9th',
          'doc-10th',
          'doc-11th',
          'doc-12th'
        ];
        reqIds.forEach(id => {
          defaultDocumentState[id] = { status: 'Pending', file: null, size: null };
        });

        const newState = {
          ...defaultDocumentState,
          ...(payload.documents || {})
        };

        console.log(
          '[DOCUMENT STATUS]',
          Object.fromEntries(
            Object.entries(newState).map(([id, doc]) => [
              id,
              {
                status: doc?.status,
                file: doc?.file,
                fileUrl: doc?.fileUrl,
                s3Key: doc?.s3Key
              }
            ])
          )
        );

        setDocumentState(newState);
        if (onUpdate) {
          onUpdate('documents', payload);
        }
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileUpload = async (id, e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docId', id);
      
      const studentTempId = localStorage.getItem("studentTempId") || "";
      if (studentTempId) {
        formData.append('studentTempId', studentTempId);
      }

      try {
        const response = await axiosInstance.post('/api/enrollment/documents/upload', formData);
        
        if (response.data.success) {
          // Re-fetch everything to ensure parent has full state and we get fresh URLs
          const refreshRes = await axiosInstance.get('/api/enrollment/documents' + (studentTempId ? `?studentTempId=${studentTempId}` : ""));
          if (refreshRes.data?.success) {
            const payload = refreshRes.data.data;
            
            const defaultDocumentState = {};
            const reqIds = ['doc-passport', 'doc-photo', 'doc-cv', 'doc-9th', 'doc-10th', 'doc-11th', 'doc-12th'];
            reqIds.forEach(id => {
              defaultDocumentState[id] = { status: 'Pending', file: null, size: null };
            });

            setDocumentState({
              ...defaultDocumentState,
              ...(payload.documents || {})
            });
            
            if (onUpdate) {
              onUpdate('documents', payload);
            }
          }
        }
      } catch (error) {
        console.error("Error uploading document:", error);
        alert("Failed to upload document. Please try again.");
      }
    }
  };

  const handleRemoveFile = async (id) => {
    if (!window.confirm('Are you sure you want to remove this file?')) return;
    try {
      const response = await axiosInstance.delete(`/api/enrollment/documents/${id}`);
      
      if (response.data.success) {
        // Fetch fresh state from the server after deletion
        const refreshRes = await axiosInstance.get('/api/enrollment/documents');
        if (refreshRes.data?.success) {
          const payload = refreshRes.data.data;

          const defaultDocumentState = {};
          const reqIds = ['doc-passport', 'doc-photo', 'doc-cv', 'doc-9th', 'doc-10th', 'doc-11th', 'doc-12th'];
          reqIds.forEach(id => {
            defaultDocumentState[id] = { status: 'Pending', file: null, size: null };
          });

          setDocumentState({
            ...defaultDocumentState,
            ...(payload.documents || {})
          });

          if (onUpdate) {
            onUpdate('documents', payload);
          }
        }
      }
    } catch (error) {
      console.error("Error removing document:", error);
      alert("Failed to remove document.");
    }
  };

  const validate = () => {
    let isValid = true;
    documentRequirements.forEach(req => {
      // Skip grade 12 if pending
      if (req.id === 'doc-12th' && grade12Status === 'pending') {
        return;
      }
      if (req.required && (!documentState[req.id] || documentState[req.id].status !== 'Uploaded')) {
        isValid = false;
      }
    });
    return isValid;
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleNext = async (e) => {
    e.preventDefault();
    if (validate()) {
      setIsSaving(true);
      try {
        // We still save the metadata to the FirstYearDocuments model for completion tracking
        const response = await axiosInstance.post('/api/enrollment/documents', { documents: documentState });
        if (response.data && response.data.success) {
          if (onUpdate) {
             // Pass the entire data object to keep expectedMonth etc intact in the dashboard
             onUpdate('documents', { ...data, documents: documentState, status: 'Completed' });
          }
          if (onNext) onNext();
        }
      } catch (error) {
        console.error("Error saving documents:", error);
        alert("Failed to save documents. Please check your connection and try again.");
      } finally {
        setIsSaving(false);
      }
    } else {
      alert("Please upload all required documents before proceeding.");
    }
  };

  return (
    <div className="document-section">
      <h2 className="document-title">Document Upload</h2>
      <p className="document-subtitle">Please upload clear, legible copies of the requested documents below.</p>

      <form onSubmit={handleNext} className="document-form">
        <div className="document-list">
          {documentRequirements.map((doc, index) => {
            const currentDocState = documentState[doc.id] || { status: 'Pending' };

            // Skip rendering doc-12th if grade12Status is pending, per business rules
            if (doc.id === 'doc-12th' && grade12Status === 'pending') {
              return (
                <div key={index} className="doc-card doc-card-pending">
                  <div className="doc-card-main">
                    <div className="doc-icon-container doc-icon-pending">
                      <svg viewBox="64 64 896 896" focusable="false" data-icon="file-text" width="1em" height="1em" fill="currentColor" aria-hidden="true">
                        <path d="M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0042 42h216v494zM504 618H320c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h184c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8zM704 762H320c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h384c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8zM704 474H320c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h384c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8z"></path>
                      </svg>
                    </div>
                    <div className="doc-info">
                      <div className="doc-header-row">
                        <span className="doc-title">{doc.name}</span>
                        <span className="doc-badge doc-badge-pending">Pending</span>
                      </div>
                      <div className="doc-description">
                        {doc.description} {expectedMonth && expectedYear && `(Expected: ${expectedMonth} ${expectedYear})`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const isUploaded = currentDocState?.status === 'Uploaded';

            return (
              <div key={doc.id} className={`doc-card ${isUploaded ? 'doc-card-uploaded' : ''}`}>
                <div className="doc-card-main">
                  <div className="doc-icon-container">
                    <svg viewBox="64 64 896 896" focusable="false" data-icon="file-text" width="1em" height="1em" fill="currentColor" aria-hidden="true">
                      <path d="M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0042 42h216v494zM504 618H320c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h184c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8zM704 762H320c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h384c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8zM704 474H320c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h384c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8z"></path>
                    </svg>
                  </div>
                  <div className="doc-info">
                    <div className="doc-header-row">
                      <span className="doc-title">{doc.name}</span>
                      {doc.type === 'Required' && <span className="doc-badge doc-badge-required">Required</span>}
                      {doc.type === 'Optional' && <span className="doc-badge doc-badge-optional">Optional</span>}
                    </div>
                    <div className="doc-description">
                      {doc.description}
                    </div>
                  </div>
                </div>

                <div className="doc-actions-container">
                  {!isUploaded ? (
                    <div className="upload-btn-wrapper">
                      <button type="button" className="btn-doc-upload">
                        Upload Document
                      </button>
                      <input 
                        type="file" 
                        onChange={(e) => handleFileUpload(doc.id, e)}
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="file-input-overlay"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="doc-attached-tag">
                        <span>✓</span> Attached
                      </div>
                      
                      {currentDocState.fileUrl && (
                        <button 
                          type="button" 
                          onClick={() => window.open(currentDocState.fileUrl, '_blank')}
                          className="btn-doc-action btn-doc-view"
                        >
                          View
                        </button>
                      )}
                      
                      <button 
                        type="button" 
                        onClick={() => handleRemoveFile(doc.id)}
                        className="btn-doc-action btn-doc-remove"
                      >
                        Remove
                      </button>

                      <div className="upload-btn-wrapper">
                        <button type="button" className="btn-doc-action btn-doc-replace">
                          Replace
                        </button>
                        <input 
                          type="file" 
                          onChange={(e) => handleFileUpload(doc.id, e)}
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="file-input-overlay"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="document-actions">
          {onBack && (
             <button type="button" className="btn-back" onClick={onBack}>Back</button>
          )}
          <button type="button" className="btn-next" onClick={handleNext} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DocumentUpload;
