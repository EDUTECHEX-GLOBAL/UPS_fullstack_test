import React, { useEffect, useMemo, useState } from 'react';
import axiosInstance from '../../../../api/axiosInstance';
import './universitysection.css';

const resolveApiProgramType = (pt) => {
  if (!pt) return '';
  const key = String(pt).trim().toLowerCase();
  if (key.includes('med')) return 'MEDICAL';
  if (key.includes('master') || key === 'pg') return 'PG';
  if (key.includes('bachelor') || key === 'ug') return 'UG';
  return String(pt).toUpperCase();
};

const getProgramOptions = (pt) => {
  const key = String(pt || '').toLowerCase();
  if (key.includes('med') || key.includes('mbbs')) {
    return [
      'Doctor of Medicine (MD / MBBS)',
      'Bachelor of Medicine and Bachelor of Surgery (MBBS)',
      'General Medicine (MD)',
      'Dentistry (BDS)',
      'Pharmacy (PharmD)',
      'Nursing (B.Sc Nursing)'
    ];
  }
  if (key.includes('master') || key.includes('pg')) {
    return [
      'Master of Science (M.Sc)',
      'Master of Technology (M.Tech / MS)',
      'Master of Business Administration (MBA)',
      'Master of Data Science / Computer Science',
      'Master of Public Health (MPH)'
    ];
  }
  return [
    'Bachelor of Science (B.Sc)',
    'Bachelor of Technology (B.Tech / BS)',
    'Bachelor of Business Administration (BBA)',
    'Bachelor of Computer Applications (BCA)',
    'Bachelor of Arts (BA)'
  ];
};

const UniversitySection = ({ 
  programType, 
  countries = [], 
  selectedCountry, 
  selectedUniversities = [], 
  eligibleUniversities = [],
  selectionStatus = '',
  readOnly = false,
  onCountryChange, 
  onUniversityChange,
  onBack,
  onNext
}) => {
  const [universitySearch, setUniversitySearch] = useState('');
  const [apiUniversities, setApiUniversities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resolvedProgramType = resolveApiProgramType(programType);
  const availableProgramOptions = useMemo(() => getProgramOptions(programType), [programType]);

  // Only show countries where the student selected universities in Test Scores (if present)
  const displayCountries = useMemo(() => {
    if (Array.isArray(eligibleUniversities) && eligibleUniversities.length > 0) {
      const selectedUnisCountries = Array.from(
        new Set(eligibleUniversities.map(u => u.country).filter(Boolean))
      );
      if (selectedUnisCountries.length > 0) {
        return selectedUnisCountries;
      }
    }
    return countries || [];
  }, [eligibleUniversities, countries]);

  // Auto-select first country from displayCountries if current selection is invalid or empty
  useEffect(() => {
    if (!readOnly && onCountryChange && displayCountries.length > 0 && (!selectedCountry || !displayCountries.includes(selectedCountry))) {
      onCountryChange(displayCountries[0]);
    }
  }, [displayCountries, onCountryChange, readOnly, selectedCountry]);

  // Fetch country universities from API
  useEffect(() => {
    if (readOnly) {
      setApiUniversities([]);
      setLoading(false);
      return undefined;
    }
    if (!selectedCountry || !resolvedProgramType) { 
      setApiUniversities([]); 
      return undefined; 
    }
    const controller = new AbortController();
    setLoading(true); 
    setError(''); 
    setUniversitySearch('');

    axiosInstance.get('/api/student-country-universities/universities', {
      params: { programType: resolvedProgramType, country: selectedCountry }, 
      signal: controller.signal,
    }).then(({ data }) => {
      if (data?.success) {
        setApiUniversities(data.universities || []);
      } else {
        setApiUniversities([]);
      }
    }).catch(err => {
      if (err?.code !== 'ERR_CANCELED') {
        console.error("Error loading country universities:", err);
        setError('Unable to load universities. Please try again.');
      }
    }).finally(() => setLoading(false));

    return () => controller.abort();
  }, [resolvedProgramType, selectedCountry]);

  // Display ONLY selected qualifying universities from Test Scores if present for the selected country
  const combinedUniversities = useMemo(() => {
    const list = [];
    const addedNames = new Set();

    // Show only score-matched universities for bachelor's applicants.
    const selectedForCountry = Array.isArray(eligibleUniversities)
      ? eligibleUniversities.filter(u => {
          const uName = u.universityName || u.name || u.university || '';
          const uCountry = u.country || '';
          return uName && (!selectedCountry || !uCountry || uCountry.toLowerCase() === selectedCountry.toLowerCase());
        })
      : [];

    if (selectedForCountry.length > 0) {
      // User explicitly selected universities in Test Scores — ONLY show these!
      selectedForCountry.forEach(u => {
        const uName = u.universityName || u.name || u.university || '';
        const uCountry = u.country || selectedCountry;
        if (!addedNames.has(uName.toLowerCase())) {
          addedNames.add(uName.toLowerCase());
          list.push({
            id: u.universityId || u.id || uName,
            name: uName,
            country: uCountry,
            programs: Array.isArray(u.selectedPrograms) && u.selectedPrograms.length
              ? u.selectedPrograms
              : (u.programName ? String(u.programName).split(',').map((program) => program.trim()).filter(Boolean) : []),
            isQualifying: true
          });
        }
      });
    } else if (resolvedProgramType !== 'UG') {
      // Other study types continue to use their country university catalogue.
      if (Array.isArray(apiUniversities)) {
        apiUniversities.forEach(u => {
          const uName = u.name || u.universityName || u.INSTNM || u.UNIVERSITY || '';
          if (uName && !addedNames.has(uName.toLowerCase())) {
            addedNames.add(uName.toLowerCase());
            list.push({
              id: u.id || u._id || u.universityId || uName,
              name: uName,
              country: selectedCountry,
              isQualifying: false
            });
          }
        });
      }
    }

    return list;
  }, [apiUniversities, eligibleUniversities, resolvedProgramType, selectedCountry]);

  const filteredUniversities = useMemo(() => {
    return combinedUniversities.filter(u => 
      u.name.toLowerCase().includes(universitySearch.toLowerCase())
    );
  }, [combinedUniversities, universitySearch]);

  const selectedCount = selectedUniversities.length;

  if (readOnly) {
    const assignmentApproved = String(selectionStatus).toLowerCase() === 'completed';
    return (
      <section className="university-section">
        <div className="university-section-heading">
          <h2>Partner-assigned Universities</h2>
          <p>Your partner selects and approves the universities assigned to your application.</p>
        </div>
        {!assignmentApproved || selectedUniversities.length === 0 ? (
          <div className="university-empty">
            Your partner is reviewing your application and preparing your university assignment. The universities will appear here after approval.
          </div>
        ) : (
          <div className="university-list">
            {selectedUniversities.map((university, index) => {
              const programs = Array.isArray(university.selectedPrograms) && university.selectedPrograms.length
                ? university.selectedPrograms
                : String(university.programName || '').split(',').map((program) => program.trim()).filter(Boolean);
              return (
                <article className="university-result is-selected" key={`${university.universityId || university.universityName}-${index}`}>
                  <div className="university-card-header">
                    <div className="university-info">
                      <strong className="university-name">{university.universityName}</strong>
                      <div className="university-meta"><span className="university-country-text">{university.country}</span></div>
                    </div>
                    <span className="qualifying-badge">Assigned by partner</span>
                  </div>
                  {programs.length > 0 && <div className="program-options-flex">{programs.map((program) => <span className="program-chip checked" key={program}>{program}</span>)}</div>}
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="university-section">
      <div className="university-section-heading">
        <h2>University &amp; Program Selection</h2>
        <p>Select up to 5 preferred universities and programs from your approved study destinations.</p>
      </div>

      {/* ── Country Selector Tabs ── */}
      {displayCountries.length > 0 && (
        <div className="country-tabs">
          {displayCountries.map((c) => {
            const isSelectedTab = c === selectedCountry;
            return (
              <button
                key={c}
                type="button"
                className={`country-tab ${isSelectedTab ? 'active' : ''}`}
                onClick={() => onCountryChange(c)}
                disabled={readOnly}
              >
                {c}
              </button>
            );
          })}
        </div>
      )}

      <div className="university-panel full-width">
        <div className="university-panel-header">
          <h3>
            Universities in <strong className="selected-country-highlight">{selectedCountry || 'selected country'}</strong>
          </h3>
          <span className="country-badge-pill">
            Selected: {selectedCount} / 5
          </span>
        </div>
        
        <div className="university-search-wrapper">
          <input 
            className="university-search-input"
            value={universitySearch} 
            onChange={e => setUniversitySearch(e.target.value)} 
            placeholder={`Search universities in ${selectedCountry || 'selected country'}...`} 
            disabled={!selectedCountry || loading} 
          />
        </div>

        <div className="university-list">
          {loading && <p className="university-empty">Loading universities...</p>}
          {!loading && error && <p className="university-empty is-error">{error}</p>}
          {!loading && !filteredUniversities.length && !error && (
            <p className="university-empty">
              {resolvedProgramType === 'UG'
                ? `No universities in ${selectedCountry || 'the selected countries'} match the submitted test scores.`
                : `No universities found for ${selectedCountry}.`}
            </p>
          )}
          {!loading && filteredUniversities.map((university) => {
            const uId = university.id;
            const uName = university.name;
            const currentSelectedObj = selectedUniversities.find(u => 
              (u.universityId && String(u.universityId) === String(uId)) || 
              (u.universityName && u.universityName.toLowerCase() === uName.toLowerCase())
            );
            const isSelected = !!currentSelectedObj;
            const universityProgramOptions = university.programs?.length ? university.programs : availableProgramOptions;

            return (
              <div 
                key={uId} 
                className={`university-result ${isSelected ? 'is-selected' : ''}`}
              >
                <div className="university-card-header">
                  <div className="university-info">
                    <strong className="university-name">{uName}</strong>
                    <div className="university-meta">
                      <span className="university-country-text">{selectedCountry || university.country}</span>
                      {university.isQualifying && (
                        <span className="qualifying-badge">
                          Qualifying Test Match
                        </span>
                      )}
                    </div>
                  </div>

                  <button 
                    type="button" 
                    className={`btn-select-university ${isSelected ? 'selected' : ''}`}
                    disabled={readOnly}
                    onClick={() => {
                      let newSelection;
                      if (isSelected) {
                        newSelection = selectedUniversities.filter(u => 
                          !(String(u.universityId) === String(uId) || u.universityName.toLowerCase() === uName.toLowerCase())
                        );
                      } else {
                        if (selectedUniversities.length >= 5) {
                          alert("You can select up to 5 universities / programs across your approved study destinations.");
                          return;
                        }
                        const defaultProg = universityProgramOptions[0] || 'Degree Program';
                        newSelection = [...selectedUniversities, { 
                          universityId: uId, 
                          universityName: uName, 
                          country: selectedCountry || university.country,
                          programName: defaultProg,
                          selectedPrograms: [defaultProg],
                          degree: defaultProg
                        }];
                      }
                      onUniversityChange(newSelection);
                    }}
                  >
                    {isSelected ? 'Selected' : '+ Select'}
                  </button>
                </div>

                {/* ── Multi-Program Selection for Selected University ── */}
                {isSelected && (
                  <div 
                    className="university-program-select-row"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="program-select-header">
                      <label className="program-select-label">
                        Select Programs / Courses for {uName}:
                      </label>
                      <button
                        type="button"
                        className="btn-select-all-programs"
                        disabled={readOnly}
                        onClick={() => {
                          const currentPrograms = Array.isArray(currentSelectedObj?.selectedPrograms) && currentSelectedObj.selectedPrograms.length > 0
                            ? currentSelectedObj.selectedPrograms
                            : (currentSelectedObj?.programName ? currentSelectedObj.programName.split(', ') : [universityProgramOptions[0]]);
                          
                          const isAllSelected = currentPrograms.length === universityProgramOptions.length;
                          const newPrograms = isAllSelected ? [universityProgramOptions[0]] : [...universityProgramOptions];
                          
                          const updated = selectedUniversities.map(u => {
                            if (String(u.universityId) === String(uId) || u.universityName.toLowerCase() === uName.toLowerCase()) {
                              return { 
                                ...u, 
                                selectedPrograms: newPrograms,
                                programName: newPrograms.join(', '), 
                                degree: newPrograms.join(', ') 
                              };
                            }
                            return u;
                          });
                          onUniversityChange(updated);
                        }}
                      >
                        {((Array.isArray(currentSelectedObj?.selectedPrograms) ? currentSelectedObj.selectedPrograms.length : (currentSelectedObj?.programName ? currentSelectedObj.programName.split(', ').length : 1)) === universityProgramOptions.length) ? 'Deselect All' : 'Select All Programs'}
                      </button>
                    </div>

                    <div className="program-options-flex">
                      {universityProgramOptions.map((pOpt) => {
                        const currentPrograms = Array.isArray(currentSelectedObj?.selectedPrograms) && currentSelectedObj.selectedPrograms.length > 0
                          ? currentSelectedObj.selectedPrograms
                          : (currentSelectedObj?.programName ? currentSelectedObj.programName.split(', ') : [universityProgramOptions[0]]);
                        
                        const isChecked = currentPrograms.includes(pOpt);

                        return (
                          <label
                            key={pOpt}
                            className={`program-chip ${isChecked ? 'checked' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              className="program-checkbox"
                              disabled={readOnly}
                              onChange={(e) => {
                                let newPrograms;
                                if (e.target.checked) {
                                  newPrograms = Array.from(new Set([...currentPrograms, pOpt]));
                                } else {
                                  newPrograms = currentPrograms.filter(p => p !== pOpt);
                                  if (newPrograms.length === 0) {
                                    newPrograms = [pOpt];
                                  }
                                }
                                const updated = selectedUniversities.map(u => {
                                  if (String(u.universityId) === String(uId) || u.universityName.toLowerCase() === uName.toLowerCase()) {
                                    return { 
                                      ...u, 
                                      selectedPrograms: newPrograms,
                                      programName: newPrograms.join(', '), 
                                      degree: newPrograms.join(', ') 
                                    };
                                  }
                                  return u;
                                });
                                onUniversityChange(updated);
                              }}
                            />
                            {pOpt}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Optional Bottom Navigation */}
      {(onBack || onNext) && (
        <div className="university-bottom-nav">
          {onBack && (
            <button type="button" className="btn-nav-back" onClick={onBack}>
              Back
            </button>
          )}
          {onNext && (
            <button type="button" className="btn-nav-next" onClick={onNext}>
              Save &amp; Continue &rarr;
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default UniversitySection;
