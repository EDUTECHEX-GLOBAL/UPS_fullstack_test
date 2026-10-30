import React, { useState } from 'react';
import './summerlogin.css';

const Summerlogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        console.log('Login form submitted:', formData);
        setIsLoading(false);
        // Here you would typically make an API call
        alert('Login successful!');
      }, 1500);
    } else {
      setErrors(newErrors);
    }
  };

  const handleForgotPassword = () => {
    alert('Password reset link will be sent to your email');
  };

  return (
    <div className="summer-login-container">
      <div className="summer-login-wrapper">
        <div className="summer-login-left">
          <div className="summer-login-brand">
            <h1>Welcome Back!</h1>
            <p>Sign in to continue your journey</p>
          </div>
          <div className="summer-login-illustration">
            <div className="floating-elements">
              <div className="element"></div>
              <div className="element"></div>
              <div className="element"></div>
            </div>
          </div>
        </div>

        <div className="summer-login-right">
          <div className="summer-login-form-container">
            <h2>Login</h2>
            
            <form onSubmit={handleSubmit} className="summer-login-form">
              <div className="summer-input-group">
                <label htmlFor="email">
                  <i className="fas fa-envelope"></i> Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <div className="summer-input-group">
                <label htmlFor="password">
                  <i className="fas fa-lock"></i> Password
                </label>
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className={errors.password ? 'error' : ''}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
                  </button>
                </div>
                {errors.password && <span className="error-text">{errors.password}</span>}
              </div>

              <div className="summer-login-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                  />
                  <span>Remember me</span>
                </label>
                <button 
                  type="button" 
                  className="forgot-password"
                  onClick={handleForgotPassword}
                >
                  Forgot Password?
                </button>
              </div>

              <button 
                type="submit" 
                className="summer-login-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </button>

              <div className="summer-login-divider">
                <span>Or login with</span>
              </div>

              <div className="summer-social-login">
                <button type="button" className="social-login-btn google">
                  <i className="fab fa-google"></i>
                  <span>Google</span>
                </button>
                <button type="button" className="social-login-btn facebook">
                  <i className="fab fa-facebook-f"></i>
                  <span>Facebook</span>
                </button>
                <button type="button" className="social-login-btn github">
                  <i className="fab fa-github"></i>
                  <span>GitHub</span>
                </button>
              </div>

              <p className="signup-prompt">
                Don't have an account? <a href="/signup">Sign up</a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summerlogin;