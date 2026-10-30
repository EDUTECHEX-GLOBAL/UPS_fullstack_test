import React from 'react';
import './logo.css';
import edutechLogo from '../assets/Edutech-logo.svg';

const Logo = ({ variant = 'dark' }) => {
  return (
    <span className={`brand-logo brand-logo--${variant}`}>
      <img src={edutechLogo} alt="EDUTECHEX Study Abroad" className="brand-logo__img" />
    </span>
  );
};

export default Logo;
