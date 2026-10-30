import React, { useEffect, useRef, useState } from 'react';
export const MIN_VERIFICATION_MESSAGE_LENGTH = 20;
export const MAX_VERIFICATION_MESSAGE_LENGTH = 500;
export const VERIFICATION_MESSAGE_ERROR = 'Please enter a professional message with at least 20 characters.';

const VerificationMessageModal = ({ title, templates, message, onChange, onSubmit, onClose, loading }) => {
  const [template, setTemplate] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const templateMenuRef = useRef(null);
  const valid = message.trim().length >= 20 && message.length <= 500;
  useEffect(() => {
    const closeMenu = event => { if (templateMenuRef.current && !templateMenuRef.current.contains(event.target)) setTemplateMenuOpen(false); };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);
  const selectTemplate = value => { setTemplate(value); onChange(value); setTemplateMenuOpen(false); };
  return <div className='avd-overlay avd-message-overlay' onMouseDown={e => e.target === e.currentTarget && !loading && onClose()}>
    <div className='avd-message-modal' role='dialog' aria-modal='true'>
      <header className='avd-message-header'><div><h2>{title}</h2><p>Choose a professional template or write a clear message.</p></div><button type='button' onClick={onClose} disabled={loading} aria-label='Close'>&times;</button></header>
      <main className='avd-message-body'>
        <div className='avd-message-field'>
          <span className='avd-field-label'>Quick Templates</span>
          <div className={`avd-template-select ${templateMenuOpen ? 'open' : ''}`} ref={templateMenuRef}>
            <button type='button' className='avd-template-trigger' onClick={() => setTemplateMenuOpen(open => !open)} disabled={loading} aria-expanded={templateMenuOpen} aria-haspopup='listbox'>
              <span>{template || 'Select a predefined message'}</span><i aria-hidden='true' />
            </button>
            {templateMenuOpen && <div className='avd-template-menu' role='listbox'>
              {templates.map((item, i) => <button type='button' role='option' aria-selected={template === item} className={template === item ? 'selected' : ''} key={item} onClick={() => selectTemplate(item)}><b>{i + 1}</b><span>{item}</span></button>)}
            </div>}
          </div>
        </div>
        <div className='avd-message-field'>
          <div className='avd-field-heading'><span className='avd-field-label'>Message</span>{template && message !== template && <button type='button' className='avd-reset-template' onClick={() => onChange(template)}>Reset to Template</button>}</div>
          <textarea value={message} onChange={e => onChange(e.target.value)} maxLength={500} rows={7} autoFocus disabled={loading} aria-label='Message' />
        </div>
        <div className='avd-message-meta'><span className={message && !valid ? 'visible' : ''}>{VERIFICATION_MESSAGE_ERROR}</span><span>{message.length} / 500</span></div>
      </main>
      <footer className='avd-message-footer'><button type='button' className='avd-message-cancel' onClick={onClose} disabled={loading}>Cancel</button><button type='button' className='avd-send-message' disabled={!valid || loading} onClick={() => setConfirming(true)}>Send Request</button></footer>
      {confirming && <div className='avd-confirm-layer'><div className='avd-confirm-dialog' role='alertdialog' aria-modal='true' aria-labelledby='avd-confirm-title'><h3 id='avd-confirm-title'>Confirm message</h3><p>Are you sure you want to send this message to the student?</p><div className='avd-confirm-actions'><button type='button' className='avd-message-cancel' onClick={() => setConfirming(false)} disabled={loading}>Go Back</button><button type='button' className='avd-send-message' onClick={onSubmit} disabled={loading}>{loading ? 'Sending...' : 'Yes, Send'}</button></div></div></div>}
    </div>
  </div>;
};
export default VerificationMessageModal;
