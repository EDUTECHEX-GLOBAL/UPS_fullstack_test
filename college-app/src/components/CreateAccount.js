import React, { useState, useEffect } from "react";
import "./CreateAccount.css";
import { Link, useLocation, useNavigate } from "react-router-dom";

const CreateAccount = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [applyingFor, setApplyingFor] = useState("Bachelor's");

  useEffect(() => {
    if (location.state?.extractedData || location.state?.uploadedDocuments) {
      navigate("/create-account/first-year", { replace: true, state: location.state });
    }
  }, [location.state, navigate]);

  const handleFirstYearClick = () => {
    navigate(`/create-account/first-year?type=first-year&degree=${encodeURIComponent(applyingFor)}`);
  };

  const handleTransferStudentClick = () => {
    navigate(`/create-account/first-year?type=transfer&degree=${encodeURIComponent(applyingFor)}`);
  };

  const handleClose = () => {
    navigate("/");
  };

  return (
    <div className="create-account-wrapper">
      <div className="account-card">
        <button className="close-btn" onClick={handleClose} title="Close">
          x
        </button>

        <h2 className="title">Let's get started!</h2>
        <p className="subtitle">
          Welcome to <strong>EduTechEX </strong>! Please tell us how you will
          use the system so we can prepare your account.
        </p>

        <p className="login-text">
          Already have an account?{" "}
          <Link to="/sign-in" className="login-link">
            Go to the Sign In page.
          </Link>
        </p>

        {/* Applying For Dropdown */}
        <div style={{ marginBottom: "20px", textAlign: "left" }}>
          <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", color: "#2d3748", marginBottom: "8px" }}>
            Applying For *
          </label>
          <div style={{ position: "relative" }}>
            <select
              value={applyingFor}
              onChange={(e) => setApplyingFor(e.target.value)}
              style={{
                width: "100%",
                height: "46px",
                padding: "0 40px 0 14px",
                borderRadius: "10px",
                border: "2px solid #E2E8F0",
                fontSize: "1rem",
                fontWeight: "600",
                color: "#2C5AA0",
                backgroundColor: "#fff",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                cursor: "pointer"
              }}
            >
              <option value="Bachelor's">Bachelor's</option>
              <option value="Master's">Master's</option>
              <option value="Medical">Medical</option>
            </select>
            <div style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#2C5AA0" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        </div>

        <div className="account-options">
          <button className="option-btn" onClick={handleFirstYearClick}>
            First Year Student
          </button>
          <button className="option-btn" onClick={handleTransferStudentClick}>
            Transfer Student
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateAccount;

