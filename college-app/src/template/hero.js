import React from 'react';
import './hero.css';
import heroImage from '../assets/university.png';

const Hero = ({ onViewChange }) => {
  const handleTalkToCounsellor = (e) => {
    if (onViewChange) {
      e.preventDefault();
      onViewChange('contact');
    }
  };

  return (
    <section className="hero-section" id="home">
      <div className="hero-container">
        <div className="hero-content">
          <div className="hero-badge">
            <span>Study Abroad | Build a Better Future</span>
          </div>
          
          <h1 className="hero-title">
            Your Dreams. Our Guidance.<br />
            Study Abroad <span className="highlight-text">with Confidence.</span>
          </h1>

          <p className="hero-description">
            Get expert guidance, personalized support, and end-to-end assistance 
            to help you choose the right university and build a successful future overseas.
          </p>

          <div className="hero-actions">
            <a href="#explore" className="btn btn-primary">
              Explore Universities <span className="arrow-icon">→</span>
            </a>
            <a
              href="#contact"
              onClick={handleTalkToCounsellor}
              className="btn btn-outline"
            >
              Talk to Our Counsellor
            </a>
          </div>
        </div>

        <div className="hero-image-wrapper">
          <img src={heroImage} alt="Study Abroad Guidance" className="hero-img" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
