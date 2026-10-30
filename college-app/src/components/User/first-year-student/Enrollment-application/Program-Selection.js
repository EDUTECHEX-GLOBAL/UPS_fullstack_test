import React, { useState, useEffect, useRef } from 'react';
import { FaEdit, FaCheckCircle } from 'react-icons/fa';
import axiosInstance from '../../../../api/axiosInstance';
import './Program-Selection.css';

// ── Constants ────────────────────────────────────────────────────────────
const PROGRAM_TYPES = [
  { id: 'bachelors', label: "Bachelor's", sub: 'Undergraduate programs' },
  { id: 'masters',   label: "Master's",   sub: 'Postgraduate programs'  },
  { id: 'medical',   label: 'Medical',    sub: 'MBBS & medical programs' },
];

const BACKEND_PROGRAM_TYPE = {
  bachelors: 'UG',
  masters:   'PG',
  medical:   'MEDICAL',
};

const MAX_COUNTRIES = 5;

// ── Component ─────────────────────────────────────────────────────────────
const ProgramSelection = ({ data = {}, onUpdate, onNext, onBack }) => {
  // Form state
  const [programType, setProgramType] = useState('');
  const [selectedCountries, setSelectedCountries] = useState([]); // array, max 5
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(true);

  // Country dropdown open state + search
  const [countryDropOpen, setCountryDropOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const countryDropRef = useRef(null);

  // Countries from API
  const [availableCountries, setAvailableCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countryError, setCountryError] = useState('');
  const [formError, setFormError] = useState('');

  // The "primary" country
  const primaryCountry = selectedCountries[selectedCountries.length - 1] || '';

  // Abort refs
  const countriesAbortRef = useRef(null);

  const hasInitializedRef = useRef(false);

  // ── Restore saved data ─────────────────────────────────────────────────
  useEffect(() => {
    if (data && Object.keys(data).length > 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      if (data.programType) {
        setProgramType(data.programType);
      }
      let loadedCountries = [];
      if (Array.isArray(data.selectedCountries) && data.selectedCountries.length) {
        loadedCountries = data.selectedCountries;
        setSelectedCountries(loadedCountries);
      } else if (data.countryName) {
        loadedCountries = [data.countryName];
        setSelectedCountries(loadedCountries);
      }

      // Default to read-only view ONLY if selection already saved in DB with status Completed
      if (data.programType && loadedCountries.length > 0 && data.status === 'Completed') {
        setIsEditing(false);
      } else {
        setIsEditing(true);
      }
    }
  }, [data]);

  // ── Close country dropdown on outside click ────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (countryDropRef.current && !countryDropRef.current.contains(e.target)) {
        setCountryDropOpen(false);
        setCountrySearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Fetch countries when programType changes ───────────────────────────
  useEffect(() => {
    if (!programType) {
      setAvailableCountries([]);
      setCountryError('');
      return;
    }
    const backendType = BACKEND_PROGRAM_TYPE[programType] || programType.toUpperCase();

    countriesAbortRef.current?.abort();
    const ctrl = new AbortController();
    countriesAbortRef.current = ctrl;

    setCountriesLoading(true);
    setCountryError('');
    setAvailableCountries([]);

    axiosInstance
      .get(`/api/enrollment/program-selection/countries?programType=${programType}`, {
        signal: ctrl.signal,
      })
      .then((res) => {
        if (res.data?.success && res.data.countries?.length) {
          setAvailableCountries(res.data.countries);
        } else {
          // Fallback to student-country-universities endpoint if needed
          return axiosInstance.get(`/api/student-country-universities/countries?programType=${backendType}`, {
            signal: ctrl.signal,
          }).then((fallbackRes) => {
            if (fallbackRes.data?.success) {
              const countries = fallbackRes.data.countries || [];
              setAvailableCountries(countries);
              if (!countries.length) setCountryError('No countries available for this program type yet.');
            } else {
              setCountryError('Failed to load countries. Please try again.');
            }
          });
        }
      })
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return;
        setCountryError('Failed to load countries. Please try again.');
      })
      .finally(() => setCountriesLoading(false));

    return () => ctrl.abort();
  }, [programType]);

  // ── Helpers ──
  const buildPayload = (overrides = {}) => ({
    programType,
    selectedCountries,
    countryName: primaryCountry,
    universityId: data?.universityId || '',
    universityName: data?.universityName || '',
    ...overrides,
  });

  const notify = (overrides = {}) => {
    if (onUpdate) onUpdate('programSelection', buildPayload(overrides));
  };

  // ── Country tag handlers ───────────────────────────────────────────────
  const addCountry = (country) => {
    if (selectedCountries.includes(country)) return;
    if (selectedCountries.length >= MAX_COUNTRIES) return;
    const next = [...selectedCountries, country];
    setSelectedCountries(next);
    setCountrySearch('');
    setFormError('');
    notify({ selectedCountries: next, countryName: next[next.length - 1] });
  };

  const removeCountry = (country) => {
    const next = selectedCountries.filter((c) => c !== country);
    setSelectedCountries(next);
    setFormError('');
    notify({ selectedCountries: next, countryName: next[next.length - 1] || '' });
  };

  const handleProgramType = (id) => {
    setProgramType(id);
    setSelectedCountries([]);
    setIsEditing(true);
    setFormError('');
    notify({ programType: id, selectedCountries: [], countryName: '' });
  };

  // ── Filtered country list for dropdown ────────────────────────────────
  const filteredCountries = availableCountries.filter(
    (c) =>
      !selectedCountries.includes(c) &&
      c.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // ── Validation ─────────────────────────────────────────────────────────
  const validate = () => {
    if (!programType || selectedCountries.length === 0) return false;
    return true;
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!programType) {
      setFormError('Please select a Program Type (Bachelor\'s, Master\'s, or Medical).');
      return;
    }
    if (selectedCountries.length === 0) {
      setFormError('Please select at least one country.');
      return;
    }
    setFormError('');
    setIsSaving(true);
    try {
      const payload = buildPayload();
      const response = await axiosInstance.post('/api/enrollment/program-selection', {
        programSelection: payload,
      });
      if (response.data?.success) {
        setIsEditing(false);
        if (onUpdate) onUpdate('programSelection', payload);
        if (onNext) onNext();
      }
    } catch (error) {
      console.error('Error saving program selection:', error);
      setFormError('Failed to save program selection. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="ps-section">
      <div className="ps-header-row">
        <div>
          <h2 className="ps-title">Countries Interested to Apply</h2>
          <p className="ps-subtitle">
            Choose the type of program you are enrolling into and select up to{' '}
            <strong>{MAX_COUNTRIES} countries</strong> you are interested in applying to.
          </p>
        </div>
        {!isEditing && (
          <button 
            type="button" 
            className="ps-edit-btn" 
            onClick={() => setIsEditing(true)}
          >
            <FaEdit className="ps-edit-icon" /> Edit Countries
          </button>
        )}
      </div>

      <p className="ps-required-note">* Required field</p>

      {formError && (
        <div className="ps-field-error-banner">
          {formError}
        </div>
      )}

      <form className="ps-form" onSubmit={handleSubmit}>

        {/* ── Program Type Cards ── */}
        <div className="ps-field-group">
          <label className="ps-label">
            Program Type <span className="ps-asterisk">*</span>
          </label>
          <div className="ps-type-cards">
            {PROGRAM_TYPES.map((pt) => {
              const isActive = programType === pt.id;

              return (
                <button
                  key={pt.id}
                  type="button"
                  className={`ps-type-card${isActive ? ' ps-type-card--active' : ''}`}
                  onClick={() => handleProgramType(pt.id)}
                  disabled={!isEditing && !isActive}
                  style={{ 
                    opacity: (!isEditing && !isActive) ? 0.5 : 1, 
                    cursor: !isEditing ? 'default' : 'pointer' 
                  }}
                >
                  <span className="ps-card-label">{pt.label}</span>
                  <span className="ps-card-sub">{pt.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Selected Countries Tags ── */}
        {programType && (
          <div className="ps-field-group">
            <label className="ps-label">
              Country <span className="ps-asterisk">*</span>{' '}
              <span className="ps-country-count">
                ({selectedCountries.length}/{MAX_COUNTRIES} selected)
              </span>
            </label>

            <div className="ps-selected-tags">
              {selectedCountries.map((c) => (
                <span key={c} className="ps-tag">
                  {c}
                  {isEditing && (
                    <button
                      type="button"
                      className="ps-tag-remove"
                      onClick={() => removeCountry(c)}
                      aria-label={`Remove ${c}`}
                    >
                      &times;
                    </button>
                  )}
                </span>
              ))}
            </div>

            {/* ── Multi-select Dropdown (Visible whenever fewer than 5 countries selected in edit mode) ── */}
            {isEditing && selectedCountries.length < MAX_COUNTRIES && (
              <div className="ps-dropdown-wrapper" ref={countryDropRef}>
                <div
                  className="ps-dropdown-trigger"
                  onClick={() => setCountryDropOpen((prev) => !prev)}
                >
                  <span className="ps-dropdown-placeholder">
                    {countriesLoading ? 'Loading countries...' : '+ Add a country...'}
                  </span>
                  <span className="ps-dropdown-arrow">▼</span>
                </div>

                {countryDropOpen && (
                  <div className="ps-dropdown-menu">
                    <input
                      type="text"
                      className="ps-dropdown-search"
                      placeholder="Search country..."
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      autoFocus
                    />
                    <ul className="ps-dropdown-list">
                      {filteredCountries.length === 0 ? (
                        <li className="ps-dropdown-empty">
                          {countriesLoading ? 'Loading...' : 'No matching countries'}
                        </li>
                      ) : (
                        filteredCountries.map((c) => (
                          <li
                            key={c}
                            className="ps-dropdown-item"
                            onClick={() => {
                              addCountry(c);
                              if (selectedCountries.length + 1 >= MAX_COUNTRIES) {
                                setCountryDropOpen(false);
                              }
                            }}
                          >
                            {c}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {countryError && !countriesLoading && selectedCountries.length === 0 && (
              <span className="ps-field-error">{countryError}</span>
            )}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="ps-actions">
          {onBack && (
            <button type="button" className="ps-btn-back" onClick={onBack}>
              Back
            </button>
          )}
          <button type="submit" className="ps-btn-submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save & Continue'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default ProgramSelection;
