import React, { useEffect } from 'react';
import './studyCountry.css';
import CountryFlag from './countryFlags';
import { partnerCountryMap, INSTITUTION_COLUMNS, STUDY_FOOTER_NOTE } from './studyData';

const StudyCountry = ({ level, id, onViewChange }) => {
  const data = partnerCountryMap[id];
  const isMaster = level === 'master';
  const levelLabel = isMaster ? "Master's" : "Bachelor's";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (data && typeof document !== 'undefined') {
      document.title = `${levelLabel} Degrees in ${data.name} — Partner Universities`;
    }
  }, [id, data, levelLabel]);

  if (!data) {
    return (
      <div className="sc-page">
        <div className="sc-container sc-notfound">
          <h1>Destination not found</h1>
          <button className="btn btn-primary" onClick={() => onViewChange && onViewChange(level)}>
            Back to all destinations
          </button>
        </div>
      </div>
    );
  }

  const note = isMaster ? data.masterNote : data.bachelorNote;

  return (
    <div className="sc-page">
      <div className="sc-container">
        <button type="button" className="sc-back" onClick={() => onViewChange && onViewChange(level)}>
          ← All {levelLabel.toLowerCase()} destinations
        </button>
      </div>

      <section className="sc-hero">
        <div className="sc-container">
          <div className="sc-hero-head">
            <CountryFlag id={data.id} size={40} />
            <span className="sc-eyebrow">Study {levelLabel} Abroad</span>
          </div>
          <h1 className="sc-h1">
            {levelLabel} Degrees in <span className="highlight-text">{data.name}</span>
          </h1>
          <p className="sc-lead">{note}</p>

          <div className="sc-stats">
            <div className="sc-stat">
              <span className="sc-stat-value">{data.totalInstitutions}</span>
              <span className="sc-stat-label">Partner institutions</span>
            </div>
            <div className="sc-stat">
              <span className="sc-stat-value">{data.networks}</span>
              <span className="sc-stat-label">Networks</span>
            </div>
            <div className="sc-stat">
              <span className="sc-stat-value">{data.degreeLevels}</span>
              <span className="sc-stat-label">Degree levels available</span>
            </div>
          </div>
        </div>
      </section>

      <div className="sc-container sc-body">
        <section className="sc-section">
          <h2 className="sc-section-title">Why {data.name} for your {levelLabel.toLowerCase()}</h2>
          <p className="sc-why">{data.tagline}</p>
          <div className="sc-fields">
            {data.fields.map((f) => (
              <span key={f} className="sc-field">{f}</span>
            ))}
          </div>
        </section>

        <section className="sc-section">
          <h2 className="sc-section-title">Partner institutions in {data.name}</h2>
          {data.truncated && (
            <p className="sc-selection-note">
              Showing {data.institutions.length} of {data.totalInstitutions} institutions in the combined
              GUS / Shorelight / Study Group network for {data.name}. Ask a counsellor for the full list.
            </p>
          )}
          <div className="sc-table-scroll">
            <table className="sc-table">
              <thead>
                <tr>
                  {INSTITUTION_COLUMNS.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.institutions.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, i) => (
                      <td key={i} data-label={INSTITUTION_COLUMNS[i]}>
                        {i === 0 ? <strong>{cell}</strong> : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="sc-cta-card">
          <h2>Ready to plan your {levelLabel.toLowerCase()} in {data.name}?</h2>
          <p>Get a shortlist matched to your grades, budget, and target intake.</p>
          <button className="btn btn-white-pill" onClick={() => onViewChange && onViewChange('contact')}>
            Book Free Consultation
          </button>
        </div>

        <p className="sc-footnote">{STUDY_FOOTER_NOTE}</p>
      </div>
    </div>
  );
};

export default StudyCountry;
