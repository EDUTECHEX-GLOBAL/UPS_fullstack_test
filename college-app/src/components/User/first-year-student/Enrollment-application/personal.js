import React, { useState, useEffect } from 'react';
import { FaLock, FaArrowRight, FaUser, FaHome, FaPassport, FaUserFriends, FaPhone } from 'react-icons/fa';
import axiosInstance from '../../../../api/axiosInstance';
import FileUpload from './FileUpload';
import ApplicationConsistency from './ApplicationConsistency';
import './personal.css';

const PERSONAL_EMAIL_PATTERN = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i;
const PERSONAL_NAME_PATTERN = /^\p{L}[\p{L}\p{M}]*(?:[ .'-]\p{L}[\p{L}\p{M}]*)*$/u;
const sanitizePersonName = (value) => String(value || '').replace(/[^\p{L}\p{M} .'-]/gu, '');
const removeDigitsAfterEmailDomain = (value) => String(value || '').replace(/^(.+@[A-Z0-9.-]+\.[A-Z]{2,63})\d+$/i, "$1");
const ADDRESS_NAME_PATTERN = /^\p{L}[\p{L}\p{M}]*(?:[ .'-]\p{L}[\p{L}\p{M}]*)*$/u;
const sanitizeAddressName = (value) => String(value || '').replace(/[^\p{L}\p{M} .'-]/gu, '');
const numericPostalCodeLengths = {
  india: 6,
  usa: 9,
  unitedstates: 9,
  australia: 4,
  newzealand: 4,
  germany: 5,
};
const normalizeCountry = (country) => String(country || '').toLowerCase().replace(/[^a-z]/g, '');
const sanitizePostalCode = (value, country) => {
  const countryKey = normalizeCountry(country);
  const numericLength = numericPostalCodeLengths[countryKey];
  if (numericLength) return String(value || '').replace(/\D/g, '').slice(0, numericLength);
  return String(value || '').replace(/[^A-Za-z0-9 -]/g, '').toUpperCase().slice(0, 12);
};
const validatePostalCode = (country, postalCode) => {
  const normalizedCountry = normalizeCountry(country);
  const code = String(postalCode || '').trim();
  if (['india'].includes(normalizedCountry)) return /^\d{6}$/.test(code);
  if (['usa', 'unitedstates'].includes(normalizedCountry)) return /^\d{5}(?:-?\d{4})?$/.test(code);
  if (normalizedCountry === 'canada') return /^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/i.test(code);
  if (['australia', 'newzealand'].includes(normalizedCountry)) return /^\d{4}$/.test(code);
  if (normalizedCountry === 'germany') return /^\d{5}$/.test(code);
  if (['uk', 'unitedkingdom'].includes(normalizedCountry)) return /^(GIR 0AA|[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})$/i.test(code);
  return code.length >= 3 && code.length <= 12 && /\d/.test(code) && /^[A-Z0-9](?:[A-Z0-9 -]*[A-Z0-9])?$/i.test(code);
};

const PersonalDetails = ({ data = {}, onUpdate, onNext, isLocked = false }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',

    // Father Details
    fatherFirstName: '',
    fatherLastName: '',
    fatherPhone: '',
    fatherEmail: '',
    fatherName: '',

    // Mother Details
    motherFirstName: '',
    motherLastName: '',
    motherPhone: '',
    motherName: '',

    // Temporary Address
    tempAddress1: '',
    tempAddress2: '',
    tempCity: '',
    tempState: '',
    tempCountry: '',
    tempZip: '',

    // Permanent Address
    sameAsTemporaryAddress: false,
    permAddress1: '',
    permAddress2: '',
    permCity: '',
    permState: '',
    permCountry: '',
    permZip: '',

    // Passport Document
    passportDoc: null,
    ...data
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Pre-fill from server or localStorage
  useEffect(() => {
    const fetchPersonal = async () => {
      try {
        const res = await axiosInstance.get('/api/enrollment/personal');
        if (res.data?.success && res.data?.data) {
          const d = res.data.data;
          const rawFatherFirst = d.fatherFirstName || (d.fatherName ? d.fatherName.split(' ')[0] : '');
          const rawFatherLast = d.fatherLastName || (d.fatherName ? d.fatherName.split(' ').slice(1).join(' ') : '');
          const rawMotherFirst = d.motherFirstName || (d.motherName ? d.motherName.split(' ')[0] : '');
          const rawMotherLast = d.motherLastName || (d.motherName ? d.motherName.split(' ').slice(1).join(' ') : '');

          setFormData(prev => ({
            ...prev,
            ...d,
            firstName: d.firstName || prev.firstName,
            lastName: d.lastName || prev.lastName,
            email: d.email || prev.email,
            phone: (d.phone || d.mobile || prev.phone || '').replace(/\D/g, '').slice(0, 10),
            fatherFirstName: sanitizePersonName(rawFatherFirst || prev.fatherFirstName || ''),
            fatherLastName: sanitizePersonName(rawFatherLast || prev.fatherLastName || ''),
            fatherPhone: (d.fatherPhone || prev.fatherPhone || '').replace(/\D/g, '').slice(0, 10),
            fatherEmail: removeDigitsAfterEmailDomain(d.fatherEmail || prev.fatherEmail || ''),
            fatherName: d.fatherName || [rawFatherFirst, rawFatherLast].filter(Boolean).join(' ') || prev.fatherName || '',
            motherFirstName: sanitizePersonName(rawMotherFirst || prev.motherFirstName || ''),
            motherLastName: sanitizePersonName(rawMotherLast || prev.motherLastName || ''),
            motherPhone: (d.motherPhone || prev.motherPhone || '').replace(/\D/g, '').slice(0, 10),
            motherName: d.motherName || [rawMotherFirst, rawMotherLast].filter(Boolean).join(' ') || prev.motherName || '',
            tempAddress1: d.tempAddress1 || prev.tempAddress1 || '',
            tempAddress2: d.tempAddress2 || prev.tempAddress2 || '',
            tempCity: sanitizeAddressName(d.tempCity || prev.tempCity || ''),
            tempState: sanitizeAddressName(d.tempState || prev.tempState || ''),
            tempCountry: sanitizeAddressName(d.tempCountry || prev.tempCountry || ''),
            tempZip: sanitizePostalCode(d.tempZip || prev.tempZip || '', d.tempCountry || prev.tempCountry),
            sameAsTemporaryAddress: Boolean(d.sameAsTemporaryAddress ?? prev.sameAsTemporaryAddress),
            permAddress1: d.permAddress1 || prev.permAddress1 || '',
            permAddress2: d.permAddress2 || prev.permAddress2 || '',
            permCity: sanitizeAddressName(d.permCity || prev.permCity || ''),
            permState: sanitizeAddressName(d.permState || prev.permState || ''),
            permCountry: sanitizeAddressName(d.permCountry || prev.permCountry || ''),
            permZip: sanitizePostalCode(d.permZip || prev.permZip || '', d.permCountry || prev.permCountry),
            passportDoc: d.passportDoc || prev.passportDoc || null,
          }));
        }
      } catch (err) {
        console.error('Error fetching personal prefill:', err);
      }
    };

    fetchPersonal();
  }, []);

  const handlePhoneChange = (e) => {
    const { name, value } = e.target;
    const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, [name]: digitsOnly }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox' && name === 'sameAsTemporaryAddress') {
      setFormData(prev => {
        const isChecked = checked;
        return {
          ...prev,
          sameAsTemporaryAddress: isChecked,
          permAddress1: isChecked ? prev.tempAddress1 : prev.permAddress1,
          permAddress2: isChecked ? prev.tempAddress2 : prev.permAddress2,
          permCity: isChecked ? prev.tempCity : prev.permCity,
          permState: isChecked ? prev.tempState : prev.permState,
          permCountry: isChecked ? prev.tempCountry : prev.permCountry,
          permZip: isChecked ? prev.tempZip : prev.permZip,
        };
      });
    } else {
      const safeValue = ['fatherFirstName', 'fatherLastName', 'motherFirstName', 'motherLastName'].includes(name)
        ? sanitizePersonName(value)
        : name === 'fatherEmail' ? removeDigitsAfterEmailDomain(value)
          : ['tempCity', 'tempState', 'tempCountry', 'permCity', 'permState', 'permCountry'].includes(name)
            ? sanitizeAddressName(value)
            : name === 'tempZip' ? sanitizePostalCode(value, formData.tempCountry)
              : name === 'permZip' ? sanitizePostalCode(value, formData.permCountry) : value;
      setFormData(prev => {
        const next = { ...prev, [name]: safeValue };
        if (name === 'fatherFirstName' || name === 'fatherLastName') {
          next.fatherName = `${next.fatherFirstName || ''} ${next.fatherLastName || ''}`.trim();
        }
        if (name === 'motherFirstName' || name === 'motherLastName') {
          next.motherName = `${next.motherFirstName || ''} ${next.motherLastName || ''}`.trim();
        }
        // If "same as temporary" is active and user edits temporary address, keep permanent address mirrored
        if (prev.sameAsTemporaryAddress && name.startsWith('temp')) {
          const permKey = name.replace('temp', 'perm');
          next[permKey] = safeValue;
        }
        if (name === 'tempCountry') {
          next.tempZip = sanitizePostalCode(prev.tempZip, safeValue);
          if (prev.sameAsTemporaryAddress) next.permZip = next.tempZip;
        }
        if (name === 'permCountry') next.permZip = sanitizePostalCode(prev.permZip, safeValue);
        return next;
      });
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'fatherEmail') {
      setErrors((prev) => ({
        ...prev,
        fatherEmail: value.trim() && !PERSONAL_EMAIL_PATTERN.test(value.trim())
          ? 'Please enter a valid email address.'
          : ''
      }));
    }
  };

  const validate = () => {
    const errs = {};

    // Applicant Phone (10 digits only)
    if (!formData.phone?.trim()) {
      errs.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phone.trim())) {
      errs.phone = "Phone number must be exactly 10 digits";
    }

    // Father's Details
    if (!formData.fatherFirstName?.trim()) {
      errs.fatherFirstName = "Father's first name is required";
    } else if (!PERSONAL_NAME_PATTERN.test(formData.fatherFirstName.trim())) {
      errs.fatherFirstName = "Use letters only, with spaces or name punctuation.";
    }
    if (!formData.fatherLastName?.trim()) {
      errs.fatherLastName = "Father's last name is required";
    } else if (!PERSONAL_NAME_PATTERN.test(formData.fatherLastName.trim())) {
      errs.fatherLastName = "Use letters only, with spaces or name punctuation.";
    }
    if (!formData.fatherPhone?.trim()) {
      errs.fatherPhone = "Father's phone number is required";
    } else if (!/^\d{10}$/.test(formData.fatherPhone.trim())) {
      errs.fatherPhone = "Father's phone number must be exactly 10 digits";
    }
    if (!formData.fatherEmail?.trim()) {
      errs.fatherEmail = "Father's email is required";
    } else if (!PERSONAL_EMAIL_PATTERN.test(formData.fatherEmail.trim())) {
      errs.fatherEmail = "Please enter a valid email address";
    }

    // Mother's Details
    if (!formData.motherFirstName?.trim()) {
      errs.motherFirstName = "Mother's first name is required";
    } else if (!PERSONAL_NAME_PATTERN.test(formData.motherFirstName.trim())) {
      errs.motherFirstName = "Use letters only, with spaces or name punctuation.";
    }
    if (!formData.motherLastName?.trim()) {
      errs.motherLastName = "Mother's last name is required";
    } else if (!PERSONAL_NAME_PATTERN.test(formData.motherLastName.trim())) {
      errs.motherLastName = "Use letters only, with spaces or name punctuation.";
    }
    if (!formData.motherPhone?.trim()) {
      errs.motherPhone = "Mother's phone number is required";
    } else if (!/^\d{10}$/.test(formData.motherPhone.trim())) {
      errs.motherPhone = "Mother's phone number must be exactly 10 digits";
    }
    
    // Temporary Address
    if (!formData.tempAddress1?.trim()) errs.tempAddress1 = "Address Line 1 is required";
    if (!formData.tempCity?.trim()) errs.tempCity = "City is required";
    else if (!ADDRESS_NAME_PATTERN.test(formData.tempCity.trim())) errs.tempCity = "Enter a city using letters and common name punctuation only.";
    if (formData.tempState?.trim() && !ADDRESS_NAME_PATTERN.test(formData.tempState.trim())) errs.tempState = "Enter a state / province using letters and common name punctuation only.";
    if (!formData.tempCountry?.trim()) errs.tempCountry = "Country is required";
    else if (!ADDRESS_NAME_PATTERN.test(formData.tempCountry.trim())) errs.tempCountry = "Enter a country using letters and common name punctuation only.";
    if (!formData.tempZip?.trim()) errs.tempZip = "ZIP/Postal Code is required";
    else if (!validatePostalCode(formData.tempCountry, formData.tempZip)) errs.tempZip = "Enter a valid postal code for the selected country.";

    // Permanent Address
    if (!formData.sameAsTemporaryAddress) {
      if (!formData.permAddress1?.trim()) errs.permAddress1 = "Address Line 1 is required";
      if (!formData.permCity?.trim()) errs.permCity = "City is required";
      else if (!ADDRESS_NAME_PATTERN.test(formData.permCity.trim())) errs.permCity = "Enter a city using letters and common name punctuation only.";
      if (formData.permState?.trim() && !ADDRESS_NAME_PATTERN.test(formData.permState.trim())) errs.permState = "Enter a state / province using letters and common name punctuation only.";
      if (!formData.permCountry?.trim()) errs.permCountry = "Country is required";
      else if (!ADDRESS_NAME_PATTERN.test(formData.permCountry.trim())) errs.permCountry = "Enter a country using letters and common name punctuation only.";
      if (!formData.permZip?.trim()) errs.permZip = "ZIP/Postal Code is required";
      else if (!validatePostalCode(formData.permCountry, formData.permZip)) errs.permZip = "Enter a valid postal code for the selected country.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked || isSaving) return;
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setIsSaving(true);
      const res = await axiosInstance.post('/api/enrollment/personal', formData);
      if (res.data?.success) {
        if (onUpdate) onUpdate('personalDetails', formData);
        if (onNext) onNext();
      }
    } catch (err) {
      console.error('Error saving personal details:', err);
      alert(err.response?.data?.message || 'Failed to save personal details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="personal-section">
      <div className="personal-header">
        <h2 className="personal-title">Step 1: Basic Details</h2>
        <p className="personal-subtitle">
          Verify your personal information, contact address, and passport identification document.
        </p>
      </div>

      <ApplicationConsistency scope="personal" />

      <form onSubmit={handleSubmit} noValidate>
        {/* Personal Details Group */}
        <div className="personal-section-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <FaUser style={{ color: '#0891b2', fontSize: '1.1rem' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>Personal Details</h3>
          </div>

          <div className="personal-grid">
            {/* First Name (Read-only from account) */}
            <div className="personal-field">
              <label>
                First Name <span className="required">*</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '6px' }}>(from account)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  readOnly
                  disabled
                  className="personal-input"
                  style={{ background: '#f8fafc', color: '#475569', cursor: 'not-allowed', paddingRight: '32px' }}
                />
                <FaLock style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem' }} />
              </div>
            </div>

            {/* Last Name (Read-only from account) */}
            <div className="personal-field">
              <label>
                Last Name <span className="required">*</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '6px' }}>(from account)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  readOnly
                  disabled
                  className="personal-input"
                  style={{ background: '#f8fafc', color: '#475569', cursor: 'not-allowed', paddingRight: '32px' }}
                />
                <FaLock style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem' }} />
              </div>
            </div>

            {/* Email Address (Read-only from account) */}
            <div className="personal-field">
              <label>
                Email Address <span className="required">*</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '6px' }}>(verified)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  readOnly
                  disabled
                  className="personal-input"
                  style={{ background: '#f8fafc', color: '#475569', cursor: 'not-allowed', paddingRight: '32px' }}
                />
                <FaLock style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem' }} />
              </div>
            </div>

            {/* Phone Number (10 digits) */}
            <div className="personal-field">
              <label>
                Phone Number (10 Digits) <span className="required">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handlePhoneChange}
                disabled={isLocked}
                maxLength={10}
                placeholder="Enter 10-digit mobile number"
                className={`personal-input ${errors.phone ? 'error' : ''}`}
              />
              {errors.phone && <span className="personal-error-text">{errors.phone}</span>}
            </div>
          </div>
        </div>

        {/* Father's Details Card */}
        <div className="personal-section-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <FaUserFriends style={{ color: '#0891b2', fontSize: '1.1rem' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>Father's Details</h3>
          </div>

          <div className="personal-grid">
            {/* Father's First Name */}
            <div className="personal-field">
              <label>
                Father's First Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="fatherFirstName"
                value={formData.fatherFirstName}
                onChange={handleChange}
                maxLength={80}
                disabled={isLocked}
                placeholder="Enter father's first name"
                className={`personal-input ${errors.fatherFirstName ? 'error' : ''}`}
              />
              {errors.fatherFirstName && <span className="personal-error-text">{errors.fatherFirstName}</span>}
            </div>

            {/* Father's Last Name */}
            <div className="personal-field">
              <label>
                Father's Last Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="fatherLastName"
                value={formData.fatherLastName}
                onChange={handleChange}
                maxLength={80}
                disabled={isLocked}
                placeholder="Enter father's last name"
                className={`personal-input ${errors.fatherLastName ? 'error' : ''}`}
              />
              {errors.fatherLastName && <span className="personal-error-text">{errors.fatherLastName}</span>}
            </div>

            {/* Father's Phone Number (10 digits) */}
            <div className="personal-field">
              <label>
                Father's Phone Number (10 Digits) <span className="required">*</span>
              </label>
              <input
                type="tel"
                name="fatherPhone"
                value={formData.fatherPhone}
                onChange={handlePhoneChange}
                disabled={isLocked}
                maxLength={10}
                inputMode="numeric"
                placeholder="Enter 10-digit mobile number"
                className={`personal-input ${errors.fatherPhone ? 'error' : ''}`}
              />
              {errors.fatherPhone && <span className="personal-error-text">{errors.fatherPhone}</span>}
            </div>

            {/* Father's Email ID */}
            <div className="personal-field">
              <label>
                Father's Email ID <span className="required">*</span>
              </label>
              <input
                type="email"
                name="fatherEmail"
                value={formData.fatherEmail}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLocked}
                maxLength={254}
                autoComplete="email"
                placeholder="e.g. father@example.com"
                className={`personal-input ${errors.fatherEmail ? 'error' : ''}`}
              />
              {errors.fatherEmail && <span className="personal-error-text">{errors.fatherEmail}</span>}
            </div>
          </div>
        </div>

        {/* Mother's Details Card */}
        <div className="personal-section-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <FaUserFriends style={{ color: '#0891b2', fontSize: '1.1rem' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>Mother's Details</h3>
          </div>

          <div className="personal-grid">
            {/* Mother's First Name */}
            <div className="personal-field">
              <label>
                Mother's First Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="motherFirstName"
                value={formData.motherFirstName}
                onChange={handleChange}
                disabled={isLocked}
                placeholder="Enter mother's first name"
                className={`personal-input ${errors.motherFirstName ? 'error' : ''}`}
              />
              {errors.motherFirstName && <span className="personal-error-text">{errors.motherFirstName}</span>}
            </div>

            {/* Mother's Last Name */}
            <div className="personal-field">
              <label>
                Mother's Last Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="motherLastName"
                value={formData.motherLastName}
                onChange={handleChange}
                disabled={isLocked}
                placeholder="Enter mother's last name"
                className={`personal-input ${errors.motherLastName ? 'error' : ''}`}
              />
              {errors.motherLastName && <span className="personal-error-text">{errors.motherLastName}</span>}
            </div>

            {/* Mother's Phone Number (10 digits) */}
            <div className="personal-field">
              <label>
                Mother's Phone Number (10 Digits) <span className="required">*</span>
              </label>
              <input
                type="tel"
                name="motherPhone"
                value={formData.motherPhone}
                onChange={handlePhoneChange}
                disabled={isLocked}
                maxLength={10}
                placeholder="Enter 10-digit mobile number"
                className={`personal-input ${errors.motherPhone ? 'error' : ''}`}
              />
              {errors.motherPhone && <span className="personal-error-text">{errors.motherPhone}</span>}
            </div>
          </div>
        </div>

        {/* Temporary Address Group */}
        <div className="personal-section-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <FaHome style={{ color: '#0891b2', fontSize: '1.1rem' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>Temporary Address</h3>
          </div>

          <div className="personal-grid">
            <div className="personal-field personal-col-full">
              <label>
                Address Line 1 <span className="required">*</span>
              </label>
              <input
                type="text"
                name="tempAddress1"
                value={formData.tempAddress1}
                onChange={handleChange}
                disabled={isLocked}
                placeholder="Street address, house/flat number, P.O. box"
                className={`personal-input ${errors.tempAddress1 ? 'error' : ''}`}
              />
              {errors.tempAddress1 && <span className="personal-error-text">{errors.tempAddress1}</span>}
            </div>

            <div className="personal-field personal-col-full">
              <label>Address Line 2 (Optional)</label>
              <input
                type="text"
                name="tempAddress2"
                value={formData.tempAddress2}
                onChange={handleChange}
                disabled={isLocked}
                placeholder="Apartment, suite, unit, building, floor, etc."
                className="personal-input"
              />
            </div>

            <div className="personal-field">
              <label>
                City <span className="required">*</span>
              </label>
              <input
                type="text"
                name="tempCity"
                value={formData.tempCity}
                onChange={handleChange}
                disabled={isLocked}
                maxLength={80}
                placeholder="e.g. San Francisco or Mumbai"
                className={`personal-input ${errors.tempCity ? 'error' : ''}`}
              />
              {errors.tempCity && <span className="personal-error-text">{errors.tempCity}</span>}
            </div>

            <div className="personal-field">
              <label>State / Province</label>
              <input
                type="text"
                name="tempState"
                value={formData.tempState}
                onChange={handleChange}
                disabled={isLocked}
                maxLength={80}
                placeholder="e.g. California or Maharashtra"
                className={`personal-input ${errors.tempState ? 'error' : ''}`}
              />
              {errors.tempState && <span className="personal-error-text">{errors.tempState}</span>}
            </div>

            <div className="personal-field">
              <label>
                Country <span className="required">*</span>
              </label>
              <input
                type="text"
                name="tempCountry"
                value={formData.tempCountry}
                onChange={handleChange}
                disabled={isLocked}
                maxLength={80}
                placeholder="e.g. United States or India"
                className={`personal-input ${errors.tempCountry ? 'error' : ''}`}
              />
              {errors.tempCountry && <span className="personal-error-text">{errors.tempCountry}</span>}
            </div>

            <div className="personal-field">
              <label>
                ZIP / Postal Code <span className="required">*</span>
              </label>
              <input
                type="text"
                name="tempZip"
                value={formData.tempZip}
                onChange={handleChange}
                disabled={isLocked}
                maxLength={numericPostalCodeLengths[normalizeCountry(formData.tempCountry)] || 12}
                inputMode={numericPostalCodeLengths[normalizeCountry(formData.tempCountry)] ? 'numeric' : 'text'}
                placeholder="e.g. 94105 or 400001"
                className={`personal-input ${errors.tempZip ? 'error' : ''}`}
              />
              {errors.tempZip && <span className="personal-error-text">{errors.tempZip}</span>}
            </div>
          </div>
        </div>

        {/* Permanent Address Group */}
        <div className="personal-section-block">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaHome style={{ color: '#0891b2', fontSize: '1.1rem' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>Permanent Address</h3>
            </div>

            {/* Same as Temporary Checkbox */}
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '600', color: '#0891b2', background: '#ecfeff', padding: '6px 12px', borderRadius: '8px' }}>
              <input
                type="checkbox"
                name="sameAsTemporaryAddress"
                checked={formData.sameAsTemporaryAddress}
                onChange={handleChange}
                disabled={isLocked}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0891b2' }}
              />
              <span>Permanent address is same as temporary address</span>
            </label>
          </div>

          <div className="personal-grid">
            <div className="personal-field personal-col-full">
              <label>
                Address Line 1 <span className="required">*</span>
              </label>
              <input
                type="text"
                name="permAddress1"
                value={formData.permAddress1}
                onChange={handleChange}
                disabled={isLocked || formData.sameAsTemporaryAddress}
                placeholder="Street address, house/flat number, P.O. box"
                className={`personal-input ${errors.permAddress1 ? 'error' : ''}`}
                style={{ background: formData.sameAsTemporaryAddress ? '#f8fafc' : '#ffffff' }}
              />
              {errors.permAddress1 && <span className="personal-error-text">{errors.permAddress1}</span>}
            </div>

            <div className="personal-field personal-col-full">
              <label>Address Line 2 (Optional)</label>
              <input
                type="text"
                name="permAddress2"
                value={formData.permAddress2}
                onChange={handleChange}
                disabled={isLocked || formData.sameAsTemporaryAddress}
                placeholder="Apartment, suite, unit, building, floor, etc."
                className="personal-input"
                style={{ background: formData.sameAsTemporaryAddress ? '#f8fafc' : '#ffffff' }}
              />
            </div>

            <div className="personal-field">
              <label>
                City <span className="required">*</span>
              </label>
              <input
                type="text"
                name="permCity"
                value={formData.permCity}
                onChange={handleChange}
                disabled={isLocked || formData.sameAsTemporaryAddress}
                maxLength={80}
                placeholder="City"
                className={`personal-input ${errors.permCity ? 'error' : ''}`}
                style={{ background: formData.sameAsTemporaryAddress ? '#f8fafc' : '#ffffff' }}
              />
              {errors.permCity && <span className="personal-error-text">{errors.permCity}</span>}
            </div>

            <div className="personal-field">
              <label>State / Province</label>
              <input
                type="text"
                name="permState"
                value={formData.permState}
                onChange={handleChange}
                disabled={isLocked || formData.sameAsTemporaryAddress}
                maxLength={80}
                placeholder="State / Province"
                className={`personal-input ${errors.permState ? 'error' : ''}`}
                style={{ background: formData.sameAsTemporaryAddress ? '#f8fafc' : '#ffffff' }}
              />
              {errors.permState && <span className="personal-error-text">{errors.permState}</span>}
            </div>

            <div className="personal-field">
              <label>
                Country <span className="required">*</span>
              </label>
              <input
                type="text"
                name="permCountry"
                value={formData.permCountry}
                onChange={handleChange}
                disabled={isLocked || formData.sameAsTemporaryAddress}
                maxLength={80}
                placeholder="Country"
                className={`personal-input ${errors.permCountry ? 'error' : ''}`}
                style={{ background: formData.sameAsTemporaryAddress ? '#f8fafc' : '#ffffff' }}
              />
              {errors.permCountry && <span className="personal-error-text">{errors.permCountry}</span>}
            </div>

            <div className="personal-field">
              <label>
                ZIP / Postal Code <span className="required">*</span>
              </label>
              <input
                type="text"
                name="permZip"
                value={formData.permZip}
                onChange={handleChange}
                disabled={isLocked || formData.sameAsTemporaryAddress}
                maxLength={numericPostalCodeLengths[normalizeCountry(formData.permCountry)] || 12}
                inputMode={numericPostalCodeLengths[normalizeCountry(formData.permCountry)] ? 'numeric' : 'text'}
                placeholder="ZIP / Postal Code"
                className={`personal-input ${errors.permZip ? 'error' : ''}`}
                style={{ background: formData.sameAsTemporaryAddress ? '#f8fafc' : '#ffffff' }}
              />
              {errors.permZip && <span className="personal-error-text">{errors.permZip}</span>}
            </div>
          </div>
        </div>

        {/* Passport Upload Group */}
        <div className="personal-section-block personal-passport-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>Passport Identification Upload</h3>
          </div>

          <FileUpload
            docId="passport"
            label="Upload Passport Document"
            hint="Valid passport scan in PDF format (max 10MB)"
            accept="application/pdf"
            requirePdf={true}
            maxSizeMB={10}
            value={formData.passportDoc}
            disabled={isLocked}
            consistencyScope="personal"
            consistencyValues={{
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              phone: formData.phone,
              fatherFirstName: formData.fatherFirstName,
              fatherLastName: formData.fatherLastName,
              fatherName: formData.fatherName,
              motherFirstName: formData.motherFirstName,
              motherLastName: formData.motherLastName,
              motherName: formData.motherName,
              tempAddress1: formData.tempAddress1,
              tempAddress2: formData.tempAddress2,
              tempCity: formData.tempCity,
              tempState: formData.tempState,
              tempCountry: formData.tempCountry,
              tempZip: formData.tempZip,
              permAddress1: formData.permAddress1,
              permAddress2: formData.permAddress2,
              permCity: formData.permCity,
              permState: formData.permState,
              permCountry: formData.permCountry,
              permZip: formData.permZip,
            }}
            onChange={(fileObj) => {
              setFormData(p => ({ ...p, passportDoc: fileObj }));
            }}
          />
        </div>

        <div className="personal-actions">
          <button
            type="submit"
            disabled={isSaving || isLocked}
            className="personal-btn-next"
            aria-busy={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save & Continue'} <FaArrowRight aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default PersonalDetails;
