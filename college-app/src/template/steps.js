import React from 'react';
import './steps.css';

const stepsData = [
  {
    number: 1,
    title: 'Choose Your Goal',
    desc: 'Select your preferred country, course and career path.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    )
  },
  {
    number: 2,
    title: 'Get Expert Guidance',
    desc: 'Our counsellors help you with university and application process.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    )
  },
  {
    number: 3,
    title: 'Prepare & Apply',
    desc: 'Submit your documents and complete your application.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <polyline points="9 15 11 17 15 13"></polyline>
      </svg>
    )
  },
  {
    number: 4,
    title: 'Fly to Your Dream',
    desc: 'Start your study abroad journey with confidence.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2L11 13"></path>
        <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
      </svg>
    )
  }
];

const Steps = () => {
  return (
    <section className="steps-section">
      <div className="steps-container">
        <div className="steps-header">
          <span className="section-tag">YOUR STEP-BY-STEP STUDY ABROAD JOURNEY</span>
          <h2 className="section-title">Simple Steps to Your Global Education</h2>
        </div>

        <div className="steps-grid">
          {stepsData.map((step, idx) => (
            <div key={step.number} className="step-card">
              <div className="step-number-badge">
                <span>{step.number}</span>
              </div>
              <div className="step-icon-wrapper">
                {step.icon}
              </div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-desc">{step.desc}</p>
              {idx < stepsData.length - 1 && (
                <div className="step-connector">
                  <span>›</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Steps;

