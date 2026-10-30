import React, { useState } from 'react';
import PersonalDetails from './personal';
import EducationDetails from './education';
import TestScores from './test-score';
import DocumentUpload from './document';
import ProgramSelection from './Program-Selection';

const EnrollmentFlow = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [applicationData, setApplicationData] = useState({
    personalDetails: {},
    educationDetails: [],
    testScores: {},
    documents: {},
    programSelection: {}
  });

  const handleUpdate = (section, data) => {
    setApplicationData(prev => ({
      ...prev,
      [section]: data
    }));
  };

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, 6));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    console.log("Submitting application data:", applicationData);
    alert("Application submitted successfully!");
    // Later we will post this data to the backend API
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto 2rem auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: '#0f172a' }}>Enrollment Application</h2>
        <div style={{ backgroundColor: '#e2e8f0', padding: '0.4rem 1rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
          Step {currentStep} of 6
        </div>
      </div>
      
      {currentStep === 1 && (
        <PersonalDetails data={applicationData.personalDetails} onUpdate={handleUpdate} onNext={handleNext} />
      )}
      
      {currentStep === 2 && (
        <EducationDetails data={applicationData.educationDetails} onUpdate={handleUpdate} onNext={handleNext} onBack={handleBack} />
      )}
      
      {currentStep === 3 && (
        <TestScores data={applicationData.testScores} onUpdate={handleUpdate} onNext={handleNext} onBack={handleBack} />
      )}
      
      {currentStep === 4 && (
        <DocumentUpload data={applicationData.documents} onUpdate={handleUpdate} onNext={handleNext} onBack={handleBack} />
      )}
      
      {currentStep === 5 && (
        <ProgramSelection data={applicationData.programSelection} onUpdate={handleUpdate} onNext={handleNext} onBack={handleBack} />
      )}
      
      {currentStep === 6 && (
        <div style={{ backgroundColor: 'white', padding: '4rem 2rem', borderRadius: '12px', maxWidth: '900px', margin: '0 auto', textAlign: 'center', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)' }}>
          <h2 style={{ color: '#0f172a', marginBottom: '1rem' }}>Review & Submit</h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>You have completed all sections. Please review your information before submitting your application.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button 
              onClick={handleBack}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >
              Go Back
            </button>
            <button 
              onClick={handleSubmit}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >
              Submit Application
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnrollmentFlow;
