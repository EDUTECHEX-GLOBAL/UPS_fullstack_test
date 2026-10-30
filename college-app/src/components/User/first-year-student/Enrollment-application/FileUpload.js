import React, { useState, useRef } from 'react';
import { FaCloudUploadAlt, FaFilePdf, FaFileAlt, FaCheckCircle, FaTrashAlt, FaRedo } from 'react-icons/fa';
import axiosInstance from '../../../../api/axiosInstance';
import './FileUpload.css';

/**
 * Validate PDF magic numbers (header starts with '%PDF-')
 */
const validatePdfMagicBytes = (file) => {
  return new Promise((resolve) => {
    if (!file) return resolve(false);
    // Only check if it claims to be or is expected to be PDF
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return resolve(true); // skip check for non-PDF files
    }

    const reader = new FileReader();
    reader.onloadend = (e) => {
      try {
        const arr = new Uint8Array(e.target.result).subarray(0, 5);
        let header = '';
        for (let i = 0; i < arr.length; i++) {
          header += String.fromCharCode(arr[i]);
        }
        resolve(header.startsWith('%PDF-'));
      } catch (err) {
        resolve(false);
      }
    };
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file.slice(0, 5));
  });
};

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 KB';
  const k = 1024;
  const dm = 2;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const FileUpload = ({
  docId = 'document',
  uploadUrl = '/api/enrollment/documents/upload', // NEW: override to post elsewhere
  label = 'Upload Document',
  hint = 'PDF format, max 10MB',
  accept = 'application/pdf',
  maxSizeMB = 10,
  requirePdf = true,
  value = null, // Can be an object { fileName, fileUrl, size } or string url
  onChange,
  disabled = false,
  consistencyScope = null,
  consistencyValues = {}
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [consistencyReport, setConsistencyReport] = useState(null);
  const [consistencyError, setConsistencyError] = useState('');
  const [checkingConsistency, setCheckingConsistency] = useState(false);
  const fileInputRef = useRef(null);

  // Normalize existing value
  const currentFile = value
    ? (typeof value === 'object' ? value : { fileName: String(value).split('/').pop(), fileUrl: value })
    : null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || uploading) return;
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = async (file) => {
    if (!file) return;
    setError('');

    // 1. File size validation
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File size exceeds ${maxSizeMB}MB limit. (Selected: ${formatFileSize(file.size)})`);
      return;
    }

    // 2. Format / extension check
    if (requirePdf) {
      const isPdfExt = file.name.toLowerCase().endsWith('.pdf');
      const isPdfMime = file.type === 'application/pdf';
      if (!isPdfExt && !isPdfMime) {
        setError('Only PDF documents are accepted for this field.');
        return;
      }

      // 3. Deep Magic Byte inspection (do not trust extension alone)
      const isValidMagic = await validatePdfMagicBytes(file);
      if (!isValidMagic) {
        setError('Invalid PDF file content. Please upload a genuine, uncorrupted PDF.');
        return;
      }
    }

    // 4. Perform upload
    try {
      setUploading(true);
      setProgress(15);

      const formData = new FormData();
      formData.append('docId', docId); // text fields before the file
      formData.append('file', file);

      const res = await axiosInstance.post(uploadUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 95) / progressEvent.total);
            setProgress(Math.max(15, percentCompleted));
          }
        }
      });

      setProgress(100);

      if (res.data?.success) {
        const uploadedData = res.data.file || res.data.data?.document || {
          fileName: file.name,
          originalName: file.name,
          size: file.size,
          fileUrl: res.data.data?.document?.fileUrl || '',
          s3Key: res.data.data?.document?.s3Key || '',
          mimeType: file.type,
          uploadedAt: new Date()
        };

        if (onChange) {
          onChange(uploadedData);
        }

        const inferredScope = consistencyScope || (docId.startsWith('score_report_') ? 'test'
          : ['passport', 'doc-passport'].includes(docId) ? 'personal'
            : ['education_certificate', 'college_transcript', 'ug_transcript', 'ug_degree', 'medical_academic_doc'].includes(docId) ? 'education' : null);
        if (inferredScope) {
          setCheckingConsistency(true);
          setConsistencyError('');
          setConsistencyReport(null);
          try {
            const checkResponse = await axiosInstance.post('/api/enrollment/application-consistency/check', {
              scope: inferredScope,
              documentId: docId,
              uploadedFile: {
                s3Key: uploadedData.s3Key || uploadedData.fileKey,
                fileName: uploadedData.fileName || uploadedData.originalName,
                mimeType: uploadedData.mimeType || file.type,
              },
              applicationValues: consistencyValues,
            });
            setConsistencyReport(checkResponse.data?.data || null);
          } catch (checkError) {
            setConsistencyError(checkError.response?.data?.message || 'The document uploaded, but its details could not be checked.');
          } finally {
            setCheckingConsistency(false);
          }
        }
      } else {
        setError(res.data?.message || 'Upload failed. Please try again.');
      }
    } catch (err) {
      console.error('File upload error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Network error while uploading. Please try again.';
      setError(errMsg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled || uploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    if (disabled) return;
    setError('');
    if (onChange) onChange(null);
  };

  const handleReplaceClick = () => {
    if (disabled || uploading) return;
    if (fileInputRef.current) fileInputRef.current.click();
  };

  return (
    <div className="file-upload-component">
      {(checkingConsistency || consistencyReport || consistencyError) && (
        <div className="consistency-modal-backdrop" role="presentation" onClick={() => { if (!checkingConsistency) { setConsistencyReport(null); setConsistencyError(''); } }}>
          <section className="consistency-modal" role="dialog" aria-modal="true" aria-labelledby="upload-consistency-title" onClick={(event) => event.stopPropagation()}>
            <button className="consistency-modal-close" type="button" disabled={checkingConsistency} onClick={() => { setConsistencyReport(null); setConsistencyError(''); }} aria-label="Close">×</button>
            <h3 id="upload-consistency-title">Document consistency check</h3>
            {checkingConsistency ? <p>Document uploaded. Reading it and comparing its details with your application…</p> : consistencyError ? <p role="alert">{consistencyError}</p> : (
              <>
                <strong>{consistencyReport?.status === 'review_required' ? 'Please review these differences' : consistencyReport?.status === 'consistent' ? 'No differences found in the fields we could read' : 'Document uploaded, but there was not enough readable information to compare'}</strong>
                <p>{consistencyReport?.comparedFieldCount || 0} fields compared</p>
                {consistencyReport?.findings?.length > 0 && <ul>{consistencyReport.findings.map((finding, index) => <li key={`${finding.code}-${index}`}><b>{finding.field}:</b> {finding.message}</li>)}</ul>}
                <p>{consistencyReport?.coverageNote}</p>
              </>
            )}
            {!checkingConsistency && <button type="button" onClick={() => { setConsistencyReport(null); setConsistencyError(''); }}>Close</button>}
          </section>
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        accept={accept}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled || uploading}
      />

      {/* Uploading Progress State */}
      {uploading && (
        <div className="file-upload-progress-card">
          <div className="file-upload-progress-info">
            <span>Uploading document...</span>
            <span>{progress}%</span>
          </div>
          <div className="file-upload-progress-bar-bg">
            <div className="file-upload-progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Uploaded / Success State */}
      {!uploading && currentFile && (currentFile.fileName || currentFile.fileUrl) && (
        <div className="file-upload-success-card">
          <div className="file-upload-file-meta">
            {requirePdf ? <FaFilePdf className="file-upload-file-icon" /> : <FaFileAlt className="file-upload-file-icon" />}
            <div className="file-upload-file-details">
              <span className="file-upload-file-name" title={currentFile.originalName || currentFile.fileName}>
                {currentFile.originalName || currentFile.fileName}
              </span>
              <span className="file-upload-file-size">
                {currentFile.size ? formatFileSize(currentFile.size) : 'Ready'} • <FaCheckCircle style={{ color: '#16a34a' }} /> Verified
              </span>
            </div>
          </div>
          {!disabled && (
            <div className="file-upload-actions">
              <button
                type="button"
                className="file-upload-btn-replace"
                onClick={handleReplaceClick}
                title="Replace with another file"
              >
                <FaRedo /> Replace
              </button>
              <button
                type="button"
                className="file-upload-btn-remove"
                onClick={handleRemove}
                title="Remove file"
              >
                <FaTrashAlt /> Remove
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty Dropzone State */}
      {!uploading && (!currentFile || (!currentFile.fileName && !currentFile.fileUrl)) && (
        <div
          className={`file-upload-dropzone ${dragActive ? 'drag-active' : ''} ${error ? 'has-error' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleReplaceClick}
        >
          <FaCloudUploadAlt className="file-upload-icon" />
          <div className="file-upload-label">
            <span className="file-upload-title">{label}</span>
            <span className="file-upload-browse">Browse Files</span>
          </div>
          <div className="file-upload-hint">{hint}</div>
        </div>
      )}

      {error && <span className="file-upload-error-msg">{error}</span>}
    </div>
  );
};

export default FileUpload;
