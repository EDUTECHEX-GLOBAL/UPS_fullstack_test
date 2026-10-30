import React from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Home.css";

import bgImage from "../assets/homebgimg.png";
import logo from "../assets/Edutech-logo.svg";

const Home = () => {
  const navigate = useNavigate();

  const handleCreateAccount = () => {
    navigate("/create-account");
  };

  const handleStartApplication = () => {
    navigate("/create-account");
  };

  const handleSignIn = () => {
    navigate("/sign-in");
  };

  return (
    <div className="home-page">
      {/* ===== HEADER ===== */}
      <header className="header">
        <div className="logo">
          {/* ✅ FIX IS HERE */}
          <Link to="/">
            <img
              src={logo}
              alt="EduTechEX Logo"
              className="logo-img"
            />
          </Link>
        </div>

        <div className="header-buttons">
          <button className="header-btn" onClick={handleSignIn}>
            Sign In
          </button>
          <button className="header-btn" onClick={handleCreateAccount}>
            Create Account
          </button>
        </div>
      </header>

      {/* ===== HERO / HOME SECTION ===== */}
      <section
        className="home-wrapper"
        style={{ backgroundImage: `url(${bgImage})` }}
        aria-label="College application introduction"
      >
        <main className="home-content">
          <h1 className="headline">Your future starts here</h1>

          <p className="description">
            Apply to college for the first time or transfer to complete your
            degree. Navigate your entire college application journey with{" "}
            <span className="highlight">College App</span>.
          </p>

          <button className="cta-button" onClick={handleStartApplication}>
            Start your application
          </button>
        </main>
      </section>
    </div>
  );
};

export default Home;
