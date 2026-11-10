import React from 'react';
import './your-furture.css';
import consultantImage from '../assets/consultant.png';

const YourFuture = ({ onViewChange }) => {
  const handleConsultation = (e) => {
    if (onViewChange) {
      e.preventDefault();
      onViewChange('contact');
    }
  };

  return (
    <section className="your-future-section" id="consultation">
      <div className="your-future-container">
        <div className="banner-card">
          <div className="banner-content">
            <span className="banner-tag">YOUR FUTURE MATTERS</span>
            <h2 className="banner-title">
              Ready to Begin Your Study Abroad Journey?
            </h2>
            <p className="banner-subtitle">
              Book free consultation today with our Counsellor
            </p>
            <div className="banner-action">
              <a
                href="#contact"
                onClick={handleConsultation}
                className="btn btn-white-pill"
              >
                Book Free Consultation
              </a>
            </div>
          </div>

          <div className="banner-illustration">
            <img
              src={consultantImage}
              alt="Counsellor guiding a student through their study abroad plan"
              className="counsellor-img"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default YourFuture;
