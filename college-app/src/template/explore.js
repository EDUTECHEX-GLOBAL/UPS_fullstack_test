import React from 'react';
import './explore.css';

import usaImage from '../assets/USA-university.png';
import usaFlag from '../assets/USA.png';

import ukImage from '../assets/UK-university.png';
import ukFlag from '../assets/UK.png';

import canadaImage from '../assets/canada-university.png';
import canadaFlag from '../assets/canada.png';

import ausImage from '../assets/aus-university.png';
import ausFlag from '../assets/aus.png';

const destinations = [
  {
    id: 'usa',
    country: 'USA',
    flag: usaFlag,
    image: usaImage
  },
  {
    id: 'uk',
    country: 'UK',
    flag: ukFlag,
    image: ukImage
  },
  {
    id: 'canada',
    country: 'Canada',
    flag: canadaFlag,
    image: canadaImage
  },
  {
    id: 'australia',
    country: 'Australia',
    flag: ausFlag,
    image: ausImage
  }
];

const Explore = () => {
  return (
    <section className="explore-section" id="explore">
      <div className="explore-container">
        <div className="explore-layout">
          <div className="explore-info">
            <span className="section-tag">EXPLORE STUDY DESTINATIONS</span>
            <h2 className="section-title">Discover Your Global Opportunities</h2>
            <p className="section-subtitle">
              Study in top countries, experience new cultures, and gain a world-class education.
              Explore the best destinations for your academic journey.
            </p>
            <a href="#bachelor" className="btn btn-primary explore-info-cta">
              Explore All Countries <span className="arrow-icon">→</span>
            </a>
          </div>

          <div className="explore-grid">
            {destinations.map((item) => (
              <div key={item.id} className="explore-card">
                <div className="card-image-wrapper">
                  <img src={item.image} alt={item.country} className="card-image" />
                </div>
                <div className="card-footer-badge">
                  <img src={item.flag} alt={`${item.country} Flag`} className="flag-img" />
                  <span className="country-name">{item.country}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Explore;
