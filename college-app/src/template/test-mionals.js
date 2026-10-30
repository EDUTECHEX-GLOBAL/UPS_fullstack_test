import React from 'react';
import './test-mionals.css';

const testimonialsData = [
  {
    id: 1,
    quote: '"The counsellors were extremely helpful and guided me at every step. I got into my dream university in Canada!"',
    name: 'Priya Sharma',
    country: 'Canada',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 2,
    quote: '"Excellent service and support! The team made the entire process smooth and stress-free."',
    name: 'Rahul Verma',
    country: 'UK',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 3,
    quote: '"I highly recommend this platform to anyone who wants to study abroad. Great experience!"',
    name: 'Sneha Reddy',
    country: 'Australia',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
  }
];

const Testimonials = () => {
  return (
    <section className="testimonials-section" id="testimonials">
      <div className="testimonials-container">
        <div className="testimonials-layout">
          <div className="testimonials-header">
            <span className="section-tag">STUDENT TESTIMONIALS</span>
            <h2 className="section-title">What Our Students Say</h2>
            <p className="section-subtitle">
              Hear from students who turned their dreams into reality with our guidance and support.
            </p>
          </div>

          <div className="testimonials-grid">
            {testimonialsData.map((item) => (
            <div key={item.id} className="testimonial-card">
              <div className="quote-mark">“</div>
              <p className="testimonial-text">{item.quote}</p>
              
              <div className="student-profile">
                <img src={item.avatar} alt={item.name} className="student-avatar" />
                <div className="student-info">
                  <h4 className="student-name">{item.name}</h4>
                  <span className="student-country">{item.country}</span>
                </div>
              </div>
            </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;

