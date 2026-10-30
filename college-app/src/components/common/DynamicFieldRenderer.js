import React from 'react';
import './DynamicFieldRenderer.css'; // Optional: reuse existing CSS styles

const DynamicFieldRenderer = ({ config, value, onChange, error }) => {
  const { id, name, label, type, placeholder, options, required } = config;

  const handleChange = (e) => {
    // Handling multiple field types
    if (type === 'file') {
      onChange(name, e.target.files[0]);
    } else {
      onChange(name, e.target.value);
    }
  };

  const renderInput = () => {
    switch (type) {
      case 'radio':
        return (
          <div className="dynamic-radio-group">
            {options?.map(option => (
              <label key={option.value} className="dynamic-radio-label">
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={handleChange}
                />
                {option.label}
              </label>
            ))}
          </div>
        );
      case 'select':
        return (
          <select 
            className="dynamic-input" 
            name={name} 
            value={value || ''} 
            onChange={handleChange}
          >
            <option value="">Select an option</option>
            {options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            className="dynamic-input dynamic-textarea"
            name={name}
            value={value || ''}
            onChange={handleChange}
            placeholder={placeholder}
            rows={4}
          />
        );
      case 'file':
        return (
          <input
            className="dynamic-file-input"
            type="file"
            name={name}
            onChange={handleChange}
          />
        );
      case 'text':
      case 'number':
      case 'email':
      default:
        return (
          <input
            className="dynamic-input"
            type={type}
            name={name}
            value={value || ''}
            onChange={handleChange}
            placeholder={placeholder}
          />
        );
    }
  };

  return (
    <div className={`dynamic-field-group ${error ? 'has-error' : ''}`}>
      <label className="dynamic-field-label">
        {label} {required && <span className="required-asterisk">*</span>}
      </label>
      {renderInput()}
      {error && <span className="dynamic-field-error-text">{error}</span>}
    </div>
  );
};

export default DynamicFieldRenderer;
