import React from 'react';
import './bachelor.css';
import StudyLevel from './StudyLevel';

const Bachelor = ({ onViewChange }) => (
  <StudyLevel
    level="bachelor"
    prefix="bachelor"
    hashKey="bachelor"
    eyebrow="STUDY BACHELOR'S ABROAD"
    title="Bachelor's Degrees by"
    accent="Country"
    intro="Undergraduate degrees, foundation years, and pathway routes at partner universities across the UK, USA, Canada, Europe and beyond. Compare fields, entry routes, and post-study work rights."
    onViewChange={onViewChange}
  />
);

export default Bachelor;
