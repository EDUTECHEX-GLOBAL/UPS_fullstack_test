import React from 'react';
import './footer.css';
import Logo from './logo';

const Footer = ({ onViewChange }) => {
  const handleNav = (viewName) => {
    if (onViewChange) {
      onViewChange(viewName);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-main">
          <div className="footer-brand">
            <button onClick={() => handleNav('home')} className="footer-logo-btn" aria-label="StudyAbroad home">
              <Logo variant="light" />
            </button>
          </div>

          <nav className="footer-nav">
            <ul className="footer-nav-list">
              <li><button onClick={() => handleNav('home')} className="footer-nav-btn">Home</button></li>
              <li><a href="#about" onClick={() => handleNav('home')}>About</a></li>
              <li><a href="#destinations" onClick={() => handleNav('home')}>University</a></li>
              <li><a href="#partner" onClick={() => handleNav('home')}>Partner</a></li>
              <li><button onClick={() => handleNav('contact')} className="footer-nav-btn">Contact</button></li>
            </ul>
          </nav>
        </div>

        <div className="footer-bottom">
          <p className="copyright-text">
            © 2025 StudyAbroad (EDUTECHEX). All rights reserved.
          </p>
          <div className="footer-legal-links">
            <a
              href="#privacy"
              onClick={(e) => {
                e.preventDefault();
                handleNav('privacy');
              }}
            >
              Privacy Policy
            </a>
            <span className="legal-divider">|</span>
            <a
              href="#terms"
              onClick={(e) => {
                e.preventDefault();
                handleNav('terms');
              }}
            >
              Terms &amp; Conditions
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
