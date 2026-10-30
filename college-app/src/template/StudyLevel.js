import React from 'react';
import { partnerCountries } from './studyData';
import CountryFlag from './countryFlags';

/*
 * Shared overview renderer for the Bachelor's and Master's destination pages.
 * `level` is 'bachelor' or 'master'; `prefix` is the CSS class prefix
 * (bachelor.css / master.css own the actual styles). Each country card links
 * to its dedicated country page (#bachelor-uk, #master-usa, ...).
 */
const StudyLevel = ({ level, prefix, hashKey, eyebrow, title, accent, intro, onViewChange }) => {
  const isMaster = level === 'master';

  return (
    <div className={`${prefix}-page`}>
      <section className={`${prefix}-hero`}>
        <div className={`${prefix}-hero-container`}>
          <span className="section-tag">{eyebrow}</span>
          <h1 className={`${prefix}-title`}>
            {title} <span className="highlight-text">{accent}</span>
          </h1>
          <p className={`${prefix}-subtitle`}>{intro}</p>

          <div className={`${prefix}-chips`}>
            {partnerCountries.map((c) => (
              <a key={c.id} href={`#${hashKey}-${c.id}`} className={`${prefix}-chip`}>
                <CountryFlag id={c.id} size={18} />
                {c.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className={`${prefix}-list`}>
        <div className={`${prefix}-container`}>
          <div className={`${prefix}-grid`}>
            {partnerCountries.map((c) => (
              <a key={c.id} href={`#${hashKey}-${c.id}`} className={`${prefix}-card`}>
                <div className={`${prefix}-card-head`}>
                  <CountryFlag id={c.id} size={34} className={`${prefix}-card-flag`} />
                  <div>
                    <h2 className={`${prefix}-card-title`}>{c.name}</h2>
                    <p className={`${prefix}-card-tagline`}>{c.tagline}</p>
                  </div>
                </div>

                <p className={`${prefix}-note`}>{isMaster ? c.masterNote : c.bachelorNote}</p>

                <div className={`${prefix}-meta`}>
                  <span>{c.totalInstitutions} partner institution{c.totalInstitutions === 1 ? '' : 's'}</span>
                  <span>{c.networks}</span>
                </div>

                <span className={`${prefix}-card-cta`}>View {c.name} guide →</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className={`${prefix}-cta`}>
        <div className={`${prefix}-container`}>
          <div className={`${prefix}-cta-card`}>
            <h2>
              {isMaster
                ? 'Not sure which country fits your Master’s plan?'
                : 'Not sure where to start your Bachelor’s?'}
            </h2>
            <p>Get a shortlist matched to your grades, budget, and target intake.</p>
            <button className="btn btn-white-pill" onClick={() => onViewChange && onViewChange('contact')}>
              Book Free Consultation
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StudyLevel;
