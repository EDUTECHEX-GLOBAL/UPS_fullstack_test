import React, { useEffect } from 'react';
import './medicalCountry.css';
import CountryFlag from './countryFlags';
import {
  medicalCountryContent,
  EYEBROW,
  TOP_ADVISORY,
  FOOTER_NOTE,
  LICENSING_COPY,
  SHARED_ELIGIBILITY,
} from './medicalCountryData';

const MedicalCountry = ({ id, onViewChange }) => {
  const data = medicalCountryContent[id];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (data && typeof document !== 'undefined') {
      document.title = data.titleTag;
    }
  }, [id, data]);

  if (!data) {
    return (
      <div className="mc-page">
        <div className="mc-container mc-notfound">
          <h1>Country guide not found</h1>
          <button className="btn btn-primary" onClick={() => onViewChange && onViewChange('medical')}>
            Back to all destinations
          </button>
        </div>
      </div>
    );
  }

  const goMedical = () => {
    if (onViewChange) onViewChange('medical');
  };
  const goContact = () => {
    if (onViewChange) onViewChange('contact');
  };

  return (
    <div className="mc-page">
      <div className="mc-advisory-strip">{TOP_ADVISORY}</div>

      <div className="mc-container">
        <button type="button" className="mc-back" onClick={goMedical}>
          ← All medical destinations
        </button>
      </div>

      {/* Hero */}
      <section className="mc-hero">
        <div className="mc-container">
          <div className="mc-hero-head">
            <CountryFlag id={data.id} size={40} />
            <span className="mc-eyebrow">{EYEBROW}</span>
          </div>
          <h1 className="mc-h1">{data.h1}</h1>
          <p className="mc-lead">{data.lead}</p>

          <div className="mc-stats">
            {data.stats.map((s) => (
              <div key={s.label} className="mc-stat">
                <span className="mc-stat-value">{s.value}</span>
                <span className="mc-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mc-container mc-body">
        {/* Advisories */}
        {data.advisories.map((a) => (
          <div key={a.title} className={`mc-callout mc-callout--${a.tone}`}>
            <h2 className="mc-callout-title">{a.title}</h2>
            {a.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ))}

        {/* Why choose */}
        <section className="mc-section">
          <h2 className="mc-section-title">Why students choose {data.name}</h2>
          <div className="mc-why-grid">
            {data.whyChoose.map((w) => (
              <div key={w.title} className="mc-why-card">
                <h3>{w.title}</h3>
                <p>{w.text}</p>
              </div>
            ))}
          </div>
        </section>

       

        {/* Eligibility */}
        <section className="mc-section">
          <h2 className="mc-section-title">Eligibility &amp; admission requirements</h2>
          <div className="mc-two-col">
            <div className="mc-subcard">
              <h3>Eligibility (typical)</h3>
              <ul className="mc-list">
                {SHARED_ELIGIBILITY.map((e) => (
                  <li key={e}>{e}</li>
                ))}
                <li>English proficiency: {data.englishProficiency}</li>
              </ul>
            </div>
            <div className="mc-subcard">
              <h3>Typical intake</h3>
              <ul className="mc-list">
                {data.intake.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Costs */}
        <section className="mc-section">
          <h2 className="mc-section-title">Cost of studying &amp; living in {data.name}</h2>
          <div className="mc-table-scroll">
            <table className="mc-table mc-table--cost">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Approx. cost</th>
                </tr>
              </thead>
              <tbody>
                {data.costs.map((row) => (
                  <tr key={row[0]}>
                    <td data-label="Item"><strong>{row[0]}</strong></td>
                    <td data-label="Approx. cost">{row[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Documents */}
        <section className="mc-section">
          <h2 className="mc-section-title">Documents required</h2>
          <ul className="mc-doc-grid">
            {data.documents.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </section>

        {/* Licensing */}
        <section className="mc-section">
          <h2 className="mc-section-title">Licensing pathway on return to India</h2>
          <p className="mc-licensing">{LICENSING_COPY}</p>
        </section>

        {/* FAQs */}
        <section className="mc-section">
          <h2 className="mc-section-title">FAQs</h2>
          <div className="mc-faqs">
            {data.faqs.map((f) => (
              <details key={f.q} className="mc-faq">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="mc-cta-card">
          <h2>{data.cta.heading}</h2>
          <p>{data.cta.subtext}</p>
          <button className="btn btn-white-pill" onClick={goContact}>
            {data.cta.button}
          </button>
        </div>

        <p className="mc-footnote">{FOOTER_NOTE}</p>
      </div>
    </div>
  );
};

export default MedicalCountry;
