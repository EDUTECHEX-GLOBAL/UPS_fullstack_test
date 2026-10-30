import React, { useState } from 'react';
import './contact.css';
import contactHeroImage from '../assets/university.png';
import API_BASE_URL from '../config/api';

const ContactSelect = ({ id, name, value, placeholder, options, isOpen, onToggle, onSelect, onClose }) => (
  <div
    className={`contact-select ${isOpen ? 'open' : ''}`}
    onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) onClose();
    }}
    onKeyDown={(event) => {
      if (event.key === 'Escape') {
        onClose();
        event.currentTarget.querySelector('.contact-select-trigger')?.focus();
      }
    }}
  >
    <button
      id={id}
      type="button"
      className="contact-select-trigger"
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      aria-controls={`${id}-options`}
      aria-labelledby={`${id}-label`}
      onClick={onToggle}
    >
      <span className={value ? 'selected-text' : 'placeholder-text'}>{value || placeholder}</span>
      <span className="contact-select-arrow" aria-hidden="true" />
    </button>
    {isOpen && (
      <div id={`${id}-options`} className="contact-select-menu" role="listbox" aria-label={placeholder}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="option"
            aria-selected={value === option}
            className={`contact-select-option ${value === option ? 'active' : ''}`}
            onClick={(event) => {
              onSelect(name, option);
              event.currentTarget.closest('.contact-select')?.querySelector('.contact-select-trigger')?.focus();
            }}
          >
            {option}
          </button>
        ))}
      </div>
    )}
  </div>
);

const Contact = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    country: '',
    programLevel: '',
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [openSelect, setOpenSelect] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const validateForm = (values) => {
    const errors = {};
    const name = values.fullName.trim();
    const email = values.email.trim();
    const phone = values.phone.trim();
    const message = values.message.trim();

    if (name.length < 2 || name.length > 120 || !/^\p{L}[\p{L}\p{M}]*(?:[ .'-]\p{L}[\p{L}\p{M}]*)*$/u.test(name)) {
      errors.fullName = 'Enter a valid name using letters, spaces, apostrophes, periods, or hyphens.';
    }
    if (email.length > 254 || !/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i.test(email)) {
      errors.email = 'Enter a valid email address, including a valid domain.';
    }
    if (!/^\d{10}$/.test(phone)) {
      errors.phone = 'Enter a 10-digit phone number.';
    }
    if (values.country && !['USA', 'UK', 'Canada', 'Australia', 'Germany', 'New Zealand'].includes(values.country)) {
      errors.country = 'Select a country from the list.';
    }
    if (values.programLevel && !["Bachelor's Degree", "Master's Degree", 'Doctorate / PhD', 'Diploma / Certificate'].includes(values.programLevel)) {
      errors.programLevel = 'Select a program level from the list.';
    }
    const messageWords = message.match(/\p{L}{2,}/gu) || [];
    if (/\p{N}/u.test(message)) {
      errors.message = 'Please remove numbers from your message.';
    } else if (message.length < 10 || message.length > 5000 || messageWords.length < 2) {
      errors.message = 'Enter a message of at least 10 characters with a few words.';
    }
    return errors;
  };

  const updateField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSubmitted(false);
    if (submitError) setSubmitError('');
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validateField = (name) => {
    const error = validateForm(formData)[name];
    setFieldErrors((prev) => {
      if (!error && !prev[name]) return prev;
      return { ...prev, [name]: error };
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const safeValue = name === 'fullName'
      ? value.replace(/[^\p{L}\p{M} .'-]/gu, '')
      : name === 'phone'
        ? value.replace(/\D/g, '').slice(0, 10)
        : name === 'message'
          ? value.replace(/\p{N}/gu, '')
        : value;
    updateField(name, safeValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const validationErrors = validateForm(formData);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setSubmitError('Please correct the highlighted fields before sending your message.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to send your message. Please try again.');
      }
      setSubmitted(true);
      setFieldErrors({});
    } catch (error) {
      setSubmitError(error.message || 'Unable to send your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-page" id="contact">
      {/* Contact Hero Banner */}
      <section className="contact-hero">
        <div className="contact-hero-container">
          <div className="contact-hero-content">
            <div className="contact-badge">
              <span>Get in Touch</span>
            </div>
            <h1 className="contact-title">
              We’re Here to Help You Build Your <span className="highlight-text">Global Future</span>
            </h1>
            <p className="contact-subtitle">
              Have questions about studying abroad? Our team of experienced counsellors 
              is here to guide you every step of the way. Reach out to us and let’s start 
              your journey together.
            </p>
          </div>

          <div className="contact-hero-graphic">
            <img
              src={contactHeroImage}
              alt="Study abroad guidance"
              className="contact-hero-img"
            />
          </div>
        </div>
      </section>

      {/* Contact Content Section */}
      <section className="contact-main-section">
        <div className="contact-main-container">
          {/* Left Column: Contact Information */}
          <div className="contact-info-column">
            <h2 className="section-title">Contact Information</h2>
            <p className="info-subtext">
              Feel free to reach out to us through any of the following channels. 
              We are always happy to help!
            </p>

            <div className="info-cards-list">
              {/* Phone Card */}
              <div className="info-card">
                <div className="info-icon-box blue-bg">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                </div>
                <div className="info-card-text">
                  <span className="info-label">Phone</span>
                  <h3 className="info-value">+91 98765 43210</h3>
                  <span className="info-meta">Mon - Fri, 9:00 AM - 6:00 PM (IST)</span>
                </div>
              </div>

              {/* Email Card */}
              <div className="info-card">
                <div className="info-icon-box cyan-bg">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </div>
                <div className="info-card-text">
                  <span className="info-label">Email</span>
                  <h3 className="info-value">info@edutechex.com</h3>
                  <span className="info-meta">We reply within 24 hours</span>
                </div>
              </div>

              {/* Office Card */}
              <div className="info-card">
                <div className="info-icon-box amber-bg">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </div>
                <div className="info-card-text">
                  <span className="info-label">Our Office</span>
                  <h3 className="info-value">123 Education Street, Green Park</h3>
                  <span className="info-meta">New Delhi - 110016, India</span>
                </div>
              </div>

              {/* WhatsApp Card */}
              <div className="info-card">
                <div className="info-icon-box green-bg">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                  </svg>
                </div>
                <div className="info-card-text">
                  <span className="info-label">WhatsApp</span>
                  <h3 className="info-value">+91 98765 43210</h3>
                  <span className="info-meta">Chat with us for quick queries</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Send Us a Message Form */}
          <div className="contact-form-column">
            <div className="contact-form-card">
              <h2 className="form-card-title">Send Us a Message</h2>
              <p className="form-card-subtitle">
                Fill out the form below and our counsellor will get back to you as soon as possible.
              </p>

              {submitted && (
                <div className="form-success-alert" role="status" aria-live="polite">
                  ✓ Thank you! Your message has been sent successfully. Our counsellor will contact you shortly.
                </div>
              )}

              {submitError && <div className="form-error-alert" role="alert">{submitError}</div>}

              <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-grid">
                  {/* Full Name */}
                  <div className="form-group">
                    <label htmlFor="fullName">Full Name *</label>
                    <input 
                      type="text" 
                      id="fullName" 
                      name="fullName" 
                      placeholder="Enter your full name" 
                      value={formData.fullName}
                      onChange={handleChange}
                      maxLength={120}
                      autoComplete="name"
                      required 
                    />
                    {fieldErrors.fullName && <small className="contact-field-error">{fieldErrors.fullName}</small>}
                  </div>

                  {/* Email Address */}
                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input 
                      type="email" 
                      id="email" 
                      name="email" 
                      placeholder="Enter your email address" 
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={() => validateField('email')}
                      maxLength={254}
                      autoComplete="email"
                      required 
                    />
                    {fieldErrors.email && <small className="contact-field-error">{fieldErrors.email}</small>}
                  </div>

                  {/* Phone Number */}
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number *</label>
                    <input 
                      type="tel" 
                      id="phone" 
                      name="phone" 
                      placeholder="Enter your phone number" 
                      value={formData.phone}
                      onChange={handleChange}
                      maxLength={10}
                      autoComplete="tel"
                      inputMode="tel"
                      onBlur={() => validateField('phone')}
                      required 
                    />
                    {fieldErrors.phone && <small className="contact-field-error">{fieldErrors.phone}</small>}
                  </div>

                  {/* Country of Interest */}
                  <div className="form-group">
                    <label id="country-label" htmlFor="country">Country of Interest</label>
                    <ContactSelect
                      id="country"
                      name="country"
                      value={formData.country}
                      placeholder="Select country"
                      options={['USA', 'UK', 'Canada', 'Australia', 'Germany', 'New Zealand']}
                      isOpen={openSelect === 'country'}
                      onToggle={() => setOpenSelect((current) => current === 'country' ? null : 'country')}
                      onSelect={(name, value) => { updateField(name, value); setOpenSelect(null); }}
                      onClose={() => setOpenSelect(null)}
                    />
                    {fieldErrors.country && <small className="contact-field-error">{fieldErrors.country}</small>}
                  </div>

                  {/* Program Level */}
                  <div className="form-group full-width">
                    <label id="programLevel-label" htmlFor="programLevel">Program Level</label>
                    <ContactSelect
                      id="programLevel"
                      name="programLevel"
                      value={formData.programLevel}
                      placeholder="Select program level"
                      options={["Bachelor's Degree", "Master's Degree", 'Doctorate / PhD', 'Diploma / Certificate']}
                      isOpen={openSelect === 'programLevel'}
                      onToggle={() => setOpenSelect((current) => current === 'programLevel' ? null : 'programLevel')}
                      onSelect={(name, value) => { updateField(name, value); setOpenSelect(null); }}
                      onClose={() => setOpenSelect(null)}
                    />
                    {fieldErrors.programLevel && <small className="contact-field-error">{fieldErrors.programLevel}</small>}
                  </div>

                  {/* Your Message */}
                  <div className="form-group full-width">
                    <label htmlFor="message">Your Message *</label>
                    <textarea 
                      id="message" 
                      name="message" 
                      rows="4" 
                      placeholder="Tell us about your goals, questions or how we can help you..."
                      value={formData.message}
                      onChange={handleChange}
                      minLength={10}
                      maxLength={5000}
                      required
                    ></textarea>
                    {fieldErrors.message && <small className="contact-field-error">{fieldErrors.message}</small>}
                  </div>
                </div>

                <button type="submit" className="btn btn-submit" disabled={submitting}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;

