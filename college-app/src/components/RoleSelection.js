import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./RoleSelection.css";
import universityImage from "../../src/assets/university (3).png";
import EdutechLogo from "./../../src/assets/Edutech-logo.svg";
const RoleSelection = () => {
  const navigate = useNavigate();
  useEffect(() => {
    document.body.classList.add("role-selection-page");
    return () => {
      document.body.classList.remove("role-selection-page");
    };
  }, []);

  const handleContinueAsStudent = () => {
    navigate("/home");
  };

  const handleContinueAsAdmin = () => {
    navigate("/admin-login");
  };

  const handleContinueAsProcessAdmin = () => {
    navigate("/process-admin-login");
  };

  const handleBrowseAsGuest = () => {
    navigate("/home");
  };

  const handleTryFree = () => {
    navigate("/create-account");
  };

  return (
    <div className="role-selection-wrapper">
      {/* Full Screen Background Image */}
      <div className="background-section">
        <img
          src={universityImage}
          alt="University Campus"
          className="background-image"
        />

        <div className="background-overlay">
          {/* Main Content Container */}
          <div className="main-content">
            {/* Main Content Area */}
            <div className="content-card">
              {/* Brand Title and Tagline */}
              <div className="brand-section">
                <div className="brand-logo-container">
                  <img
                    src={EdutechLogo}
                    alt="EdutechEX Logo"
                    className="edutechex-logo"
                  />
                </div>

                <p className="brand-tagline">Unlock Your Potential</p>

                <button className="try-free-btn" onClick={handleTryFree}>
                  Try for Free
                </button>
              </div>

              {/* Choose Path Section */}
              <div className="path-section">
                <h3 className="path-title">
                  Choose how you'd like to continue:
                </h3>

                <div className="path-options">
                  {/* Student Option */}
                  <div
                    className="path-option"
                    onClick={handleContinueAsStudent}
                  >
                    <div className="path-icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                      </svg>
                    </div>
                    <div className="path-copy">
                      <span className="path-text">Continue as Student</span>
                      
                    </div>
                    <span className="path-arrow" aria-hidden="true">&rarr;</span>
                  </div>

                  {/* Admin Option */}
                  <div
                    className="path-option"
                    onClick={handleContinueAsAdmin}
                  >
                    <div className="path-icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="path-copy">
                      <span className="path-text">Continue as Admin</span>
                     
                    </div>
                    <span className="path-arrow" aria-hidden="true">&rarr;</span>
                  </div>

                  {/* Process-Admin Option */}
                  <div
                    className="path-option"
                    onClick={handleContinueAsProcessAdmin}
                  >
                    <div className="path-icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M5.25 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM2.25 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM18.75 7.5a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0Z" />
                        <path d="M21.75 12.75a3 3 0 0 0-3 3v2.25a3 3 0 0 0 3 3h.75a3 3 0 0 0 3-3v-2.25a3 3 0 0 0-3-3h-.75Z" />
                      </svg>
                    </div>
                    <div className="path-copy">
                      <span className="path-text">Continue as Process-Admin</span>
                      
                    </div>
                    <span className="path-arrow" aria-hidden="true">&rarr;</span>
                  </div>
                </div>

                {/* Guest Option */}
                <div className="guest-section">
                  <p className="guest-text">
                    Just exploring?{" "}
                    <span
                      className="guest-link"
                      onClick={handleBrowseAsGuest}
                    >
                      Browse as guest
                    </span>
                  </p>
                </div>
              </div>

              {/* Footer */}
              <footer className="content-footer">
                <p>&copy; 2024 EdutechEX. All rights reserved.</p>
                <div className="footer-links">
                  <span className="footer-link">Privacy Policy</span>
                  <span className="footer-link">Terms of Service</span>
                  <span className="footer-link">Contact Us</span>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;