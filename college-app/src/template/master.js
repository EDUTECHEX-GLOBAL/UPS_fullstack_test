import React from 'react';
import './master.css';
import StudyLevel from './StudyLevel';

const Master = ({ onViewChange }) => (
  <StudyLevel
    level="master"
    prefix="master"
    hashKey="master"
    eyebrow="STUDY MASTER'S ABROAD"
    title="Master's Degrees by"
    accent="Country"
    intro="Postgraduate and Master's programmes at partner universities worldwide — most completed in 1–2 years, many with generous post-study work visas. Compare fields, universities, and stay-back options."
    onViewChange={onViewChange}
  />
);

export default Master;
