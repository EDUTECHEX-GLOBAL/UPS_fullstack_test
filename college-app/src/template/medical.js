import React from 'react';
import './medical.css';
import { medicalCountries } from './medicalData';
import CountryFlag from './countryFlags';

const Medical = ({ onViewChange }) => {
  const handleConsult = () => {
    if (onViewChange) onViewChange('contact');
  };

  return (
    <div className="medical-page">
      <section className="medical-hero">
        <div className="medical-hero-container">
          <span className="section-tag">STUDY MBBS ABROAD</span>
          <h1 className="medical-title">
            Medical Universities by <span className="highlight-text">Country</span>
          </h1>
          <p className="medical-subtitle">
            Explore NMC/WDOMS-aligned MBBS &amp; MD destinations for Indian students. Open a country
            for its full guide — universities, fees, FMGE bands, eligibility and documents.
          </p>

          <div className="medical-country-nav">
            {medicalCountries.map((c) => (
              <a key={c.id} href={`#medical-${c.id}`} className="medical-chip">
                <CountryFlag id={c.id} size={18} />
                {c.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="medical-note-section">
        <div className="medical-container">
          <div className="medical-callout">
            <strong>Before you advise a student:</strong> there is no current official NMC-approved
            list. Verify each university via the World Directory of Medical Schools (WDOMS), the
            FMGL 2021 regulations, and the destination country&apos;s own medical authority. Bands
            below are indicative and drawn from 2025–26 sources.
          </div>
        </div>
      </section>

      <section className="medical-list-section">
        <div className="medical-container">
          <div className="medical-grid">
            {medicalCountries.map((c) => (
              <a
                key={c.id}
                href={`#medical-${c.id}`}
                className={`medical-card medical-card--link ${c.flagged ? 'medical-card--flagged' : ''}`}
              >
                <div className="medical-card-head">
                  <CountryFlag id={c.id} size={34} className="medical-card-flag" />
                  <div>
                    <h2 className="medical-card-title">{c.name}</h2>
                    <p className="medical-card-tagline">{c.tagline}</p>
                  </div>
                </div>

                <dl className="medical-facts">
                  <div className="medical-fact">
                    <dt>FMGE band</dt>
                    <dd>{c.fmge}</dd>
                  </div>
                  <div className="medical-fact">
                    <dt>6-year fees</dt>
                    <dd>{c.fees}</dd>
                  </div>
                </dl>

                {c.flagged && (
                  <p className="medical-advisory medical-advisory--strong">⚠ Under NMC advisory — read the guide before recommending.</p>
                )}

                <span className="medical-card-cta">View full country guide →</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="medical-cta-section">
        <div className="medical-container">
          <div className="medical-cta-card">
            <h2>Not sure which country fits your goals and budget?</h2>
            <p>Talk to a counsellor for a shortlist matched to your NEET score, budget, and career plan.</p>
            <button className="btn btn-white-pill" onClick={handleConsult}>
              Book Free Consultation
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Medical;
