import React from 'react';
import './top-study.css';

import usaFlag from '../assets/USA.png';
import ukFlag from '../assets/UK.png';
import canadaFlag from '../assets/canada.png';
import ausFlag from '../assets/aus.png';
import germanyFlag from '../assets/germany.png';
import nzFlag from '../assets/new-zealand.png';

const topDestinations = [
  {
    id: 1,
    country: 'USA',
    flag: usaFlag,
    desc: 'World-class universities & diverse opportunities'
  },
  {
    id: 2,
    country: 'UK',
    flag: ukFlag,
    desc: 'Top-ranked institutions & rich culture'
  },
  {
    id: 3,
    country: 'Canada',
    flag: canadaFlag,
    desc: 'Safe, inclusive & excellent career options'
  },
  {
    id: 4,
    country: 'Australia',
    flag: ausFlag,
    desc: 'Quality education & globally recognized degrees'
  },
  {
    id: 5,
    country: 'Germany',
    flag: germanyFlag,
    desc: 'Affordable education & strong job market'
  },
  {
    id: 6,
    country: 'New Zealand',
    flag: nzFlag,
    desc: 'Beautiful landscapes & excellent lifestyle'
  }
];

const TopStudy = ({ onViewChange }) => {
  return (
    <section className="top-study-section" id="destinations">
      <div className="top-study-container">
        <div className="top-study-layout">
          {/* Left Column: Heading & CTA */}
          <div className="top-study-info">
            <span className="section-tag">TOP STUDY DESTINATIONS</span>
            <h2 className="section-title">Popular Countries for Higher Education</h2>
            <p className="section-subtitle">
              Explore the most preferred countries by students across the world. 
              Find the right destination that matches your goals, budget, and career plans.
            </p>
            <div className="top-study-cta">
              <a
                href="#bachelor"
                className="btn btn-primary"
                onClick={(e) => {
                  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  if (onViewChange) onViewChange('bachelor');
                }}
              >
                View All Destinations <span className="arrow-icon">→</span>
              </a>
            </div>
          </div>

          {/* Right Column: 6 Cards Grid */}
          <div className="top-study-grid">
            {topDestinations.map((item) => (
              <div key={item.id} className="country-info-card">
                <div className="card-flag-box">
                  <img src={item.flag} alt={`${item.country} flag`} className="country-flag-icon" />
                </div>
                <div className="card-details">
                  <h3 className="country-title">{item.country}</h3>
                  <p className="country-desc">{item.desc}</p>
                </div>
                <div className="card-chevron">
                  <span>›</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TopStudy;
