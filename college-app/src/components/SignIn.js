import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaRocket, FaUser, FaUserShield } from "react-icons/fa";
import axiosInstance, { clearAllUserData } from "../api/axiosInstance";
import LoginImage from "../assets/LoginImage.png";
import EdutechLogo from "../assets/Edutech-logo.svg";
import "./SignIn.css";

const ALLOWED_ADMIN_EMAIL = "edutechexcollege@gmail.com";
const EMAIL_PATTERN = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i;
const removeDigitsAfterEmailDomain = (value) => value.replace(/^(.+@[A-Z0-9.-]+\.[A-Z]{2,63})\d+$/i, "$1");

const SignIn = () => {
  const navigate = useNavigate();
  const [showStudentOptions, setShowStudentOptions] = useState(false);
  const [studentType, setStudentType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signinEmailError, setSigninEmailError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showTransferPassword, setShowTransferPassword] = useState(false);
  const [showAssistPassword, setShowAssistPassword] = useState(false);
  const [showAssistModal, setShowAssistModal] = useState(false);
  const [assistLoading, setAssistLoading] = useState(false);
  const [assistError, setAssistError] = useState("");
  const [assistForm, setAssistForm] = useState({
    adminEmail: "",
    adminPassword: "",
    userEmail: "",
  });

  // ✅ Only clear stale auth data if no active session exists
  useEffect(() => {
    const hasToken = localStorage.getItem("token");
    if (!hasToken) {
      clearAllUserData();
    }
  }, []);

  const handleResetState = () => {
    setShowStudentOptions(false);
    setStudentType(null);
    setError("");
    setShowPassword(false);
    setShowTransferPassword(false);
    setShowAssistPassword(false);
    navigate("/home");
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleTransferPasswordVisibility = () =>
    setShowTransferPassword(!showTransferPassword);
  const toggleAssistPasswordVisibility = () =>
    setShowAssistPassword(!showAssistPassword);

  const openAssistModal = () => {
    setAssistError("");
    setShowAssistModal(true);
  };

  const closeAssistModal = () => {
    if (assistLoading) return;
    setShowAssistModal(false);
    setAssistError("");
    setShowAssistPassword(false);
    setAssistForm({ adminEmail: "", adminPassword: "", userEmail: "" });
  };

  const handleAssistFormChange = (e) => {
    const { name, value } = e.target;
    setAssistForm((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Write both plain keys (axios/route guards) and scoped keys (UserProfile)
  const storeAuthData = (token, user, type, identifier) => {
    clearAllUserData();
    const sessionKey = user?._id || user?.id || identifier;
    sessionStorage.setItem("sessionKey", sessionKey);

    // Plain keys
    localStorage.setItem("token", token);
    localStorage.setItem("userData", JSON.stringify(user));
    localStorage.setItem("studentType", type);
    localStorage.setItem("userEmail", identifier);

    // Scoped keys
    localStorage.setItem(`token_${sessionKey}`, token);
    localStorage.setItem(`userData_${sessionKey}`, JSON.stringify(user));
    localStorage.setItem(`studentType_${sessionKey}`, type);
    localStorage.setItem(`userEmail_${sessionKey}`, identifier);
  };

  // ✅ Write both plain and scoped keys
  const markProfileCompleted = (profileData) => {
    localStorage.setItem("profileCompleted", "true");
    localStorage.setItem("userProfile", JSON.stringify(profileData));
    const sessionKey = sessionStorage.getItem("sessionKey");
    if (sessionKey) {
      localStorage.setItem(`profileCompleted_${sessionKey}`, "true");
      localStorage.setItem(`userProfile_${sessionKey}`, JSON.stringify(profileData));
    }
  };

  // ✅ Core fix: after login, always fetch profile to get real profileCompleted status
  const checkProfileAndNavigate = async (studentTypeVal) => {
    if (studentTypeVal === 'firstyear') {
      try {
        const accountRes = await axiosInstance.get('/api/students/me');
        const account = accountRes.data?.account || {};
        const currentUser = (() => {
          try { return JSON.parse(localStorage.getItem('userData') || '{}'); }
          catch { return {}; }
        })();
        const mergedAccount = { ...currentUser, ...account };
        localStorage.setItem('userData', JSON.stringify(mergedAccount));

        if (account.applicationStatus === 'Approved') {
          let hasUniversitySelection = false;
          try {
            const universityRes = await axiosInstance.get('/api/enrollment/university-selection');
            hasUniversitySelection =
              (universityRes.data?.data?.selectedUniversities || []).length > 0 &&
              universityRes.data?.data?.status === 'Completed';
          } catch (universityErr) {
            console.warn('Could not verify university selection before dashboard navigation:', universityErr.response?.status);
          }
          if (!hasUniversitySelection) {
            navigate('/firstyear/enrollment/university', { replace: true });
            return;
          }
          try {
            const profileRes = await axiosInstance.get('/api/user/profile');
            if (profileRes.data?.success && profileRes.data?.data) markProfileCompleted(profileRes.data.data);
          } catch (profileErr) {
            console.warn('Approved student has no completed profile record yet:', profileErr.response?.status);
          }
          navigate('/firstyear/enrollment/dashboard', { replace: true });
        } else if (account.applicationStatus === 'University Selection Pending') {
          navigate('/firstyear/enrollment/university', { replace: true });
        } else {
          const hasSubmitted = ['Submitted for Approval', 'Under Review'].includes(account.applicationStatus);
          navigate(hasSubmitted ? '/firstyear/enrollment/review' : '/firstyear/enrollment/personal', { replace: true });
        }
      } catch (err) {
        console.error('Could not check student application approval status:', err);
        navigate('/firstyear/enrollment/personal', { replace: true });
      }
      return;
    }

    try {
      const profileRes = await axiosInstance.get("/api/user/profile");
      console.log("📋 Profile check response:", profileRes.data);

      if (profileRes.data.success && profileRes.data.data) {
        const profileData = profileRes.data.data;
        console.log("📋 profileCompleted:", profileData.profileCompleted);
        console.log("📋 universities count:", profileData.selectedUniversities?.length);

        if (
          profileData.profileCompleted === true &&
          profileData.selectedUniversities?.length > 0
        ) {
          markProfileCompleted(profileData);
          console.log("✅ Profile complete — navigating to dashboard");
          setTimeout(() => {
            navigate(
              studentTypeVal === "transfer"
                ? "/transfer/dashboard"
                : "/firstyear/dashboard"
            );
          }, 100);
          return;
        }
      }
    } catch (profileErr) {
      // 404 means no profile yet — go to profile setup
      console.log("📋 Profile not found or error:", profileErr.response?.status);
    }

    // Profile incomplete or not found — go to profile setup
    console.log("⚠️ Profile incomplete — navigating to /profile");
    localStorage.removeItem("profileCompleted");
    localStorage.removeItem("userProfile");
    if (studentTypeVal === "firstyear") {
      setTimeout(() => navigate("/firstyear/enrollment"), 100);
    } else {
      setTimeout(() => navigate("/profile"), 100);
    }
  };

  const handleAdminAssistLogin = async (e) => {
    e.preventDefault();
    setAssistError("");

    const adminEmail = assistForm.adminEmail.trim().toLowerCase();
    const adminPassword = assistForm.adminPassword;
    const userEmail = assistForm.userEmail.trim();

    if (!adminEmail || !adminPassword || !userEmail) {
      setAssistError("Admin email, admin password, and student email are required.");
      return;
    }

    if (adminEmail !== ALLOWED_ADMIN_EMAIL) {
      setAssistError("This email is not authorized for admin access.");
      return;
    }

    setAssistLoading(true);
    try {
      const response = await axiosInstance.post("/api/admin/users/impersonate-from-signin", {
        adminEmail,
        adminPassword,
        userEmail,
      });

      if (response.data.success && response.data.token && response.data.user) {
        storeAuthData(response.data.token, response.data.user, "firstyear", userEmail);
        setShowAssistModal(false);
        await checkProfileAndNavigate("firstyear");
      } else {
        setAssistError(response.data.message || "Admin Assist login failed.");
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setAssistError(err.response?.data?.message || "Invalid admin credentials.");
      } else if (err.response?.status === 404) {
        setAssistError(err.response?.data?.message || "Student email does not exist.");
      } else if (err.response?.status === 403) {
        setAssistError(err.response?.data?.message || "Admin account is not active or authorized.");
      } else {
        setAssistError(
          err.response?.data?.message ||
            "Unable to start Admin Assist login. Please try again."
        );
      }
    } finally {
      setAssistLoading(false);
    }
  };

  // ── First-Year Student Sign-In ──────────────────────────────────────────
  const handleFirstYearSignIn = async (e) => {
    e.preventDefault();
    setError("");

    const email = e.target.email.value.trim().toLowerCase();
    const password = e.target.password.value.trim();

    if (!email || !password) {
      setError("Email and password are required");
      setLoading(false);
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      const message = "Enter a valid email address. Numbers may be used before @, but not after the domain extension.";
      setSigninEmailError(message);
      setError(message);
      return;
    }
    setSigninEmailError("");
    setLoading(true);

    try {
      const response = await axiosInstance.post("/api/students/login", {
        email,
        password,
      });

      if (response.data.success && response.data.token) {
        const { token } = response.data;
        const user = response.data.user || response.data.account || {};

        // 1. Store auth data first
        storeAuthData(token, user, "firstyear", email);

        // 2. Now check profile from backend (not from login response)
        await checkProfileAndNavigate("firstyear");
      } else {
        setError(response.data.message || "Sign in failed. Please try again.");
      }
    } catch (err) {
      if (err.response?.status === 401)
        setError("Invalid email or password. Please try again.");
      else if (err.response?.status === 400)
        setError(
          err.response?.data?.message ||
            "Invalid request. Please check your details."
        );
      else if (err instanceof TypeError)
        setError("Network error. Please ensure your backend is running.");
      else
        setError(
          err.response?.data?.message ||
            "An unexpected error occurred. Please try again."
        );
    } finally {
      setLoading(false);
    }
  };

  // ── Transfer Student Sign-In ────────────────────────────────────────────
  const handleTransferSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const username = e.target.username.value.trim();
    const password = e.target.password.value.trim();

    if (!username || !password) {
      setError("Username and password are required");
      setLoading(false);
      return;
    }

    try {
      const response = await axiosInstance.post("/api/transfer/login", {
        username,
        password,
      });

      if (response.data.success && response.data.token) {
        const { token, user } = response.data;

        // 1. Store auth data first
        storeAuthData(token, user, "transfer", username);

        // 2. Now check profile from backend (not from login response)
        await checkProfileAndNavigate("transfer");
      } else {
        setError(response.data.message || "Sign in failed. Please try again.");
      }
    } catch (err) {
      if (err.response?.status === 401)
        setError("Invalid username or password. Please try again.");
      else if (err.response?.status === 400)
        setError(
          err.response?.data?.message ||
            "Invalid request. Please check your credentials."
        );
      else if (err.response?.status === 404)
        setError("User not found. Please check your username.");
      else if (
        err.code === "NETWORK_ERROR" ||
        err.message?.includes("Network Error")
      )
        setError("Network error. Please check your connection and try again.");
      else
        setError(
          err.response?.data?.message ||
            "An unexpected error occurred. Please try again."
        );
    } finally {
      setLoading(false);
    }
  };

  const handleBackKeyPress = (e) => {
    if (e.key === "Enter" || e.key === " ") handleResetState();
  };
  const handleCreateAccountKeyPress = (e) => {
    if (e.key === "Enter" || e.key === " ") navigate("/create-account");
  };

  // ── Shared Right Panel ──────────────────────────────────────────────────
  const RightPanel = () => (
    <div className="signin-right">
      <div className="signin-right-content">
        <img
          src={LoginImage}
          alt="Login illustration"
          className="signin-right-img"
        />
        <h3 className="signin-right-title">
          Empower Education Through Innovation
        </h3>
        <p className="signin-right-desc">
          Streamline academic processes, manage workflows efficiently, and
          create an exceptional learning environment for future leaders.
        </p>
        <div className="signin-right-badges">
          <span className="signin-badge">First-Year</span>
          <span className="signin-badge">Transfer</span>
          <span className="signin-badge">Applications</span>
        </div>
      </div>
    </div>
  );

  // ── Shared Brand Header ─────────────────────────────────────────────────
  const BrandHeader = ({ subtitle }) => (
    <div className="signin-brand-header">
      <img src={EdutechLogo} alt="EdutechEX" className="signin-logo" />
      <p className="signin-brand-sub">STUDENT PORTAL</p>
      <h2 className="signin-welcome">Welcome back</h2>
      <p className="signin-sub">{subtitle}</p>
    </div>
  );

  // ── Eye toggle SVG ──────────────────────────────────────────────────────
  const EyeIcon = ({ open }) =>
    open ? (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    ) : (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );

  return (
    <div className="signin-overlay">
      <div className="signin-modal">
        {/* Close button */}
        <button
          className="signin-close-btn"
          onClick={() => {
            navigate("/home");
            handleResetState();
          }}
          title="Close Sign In Modal"
          aria-label="Close"
        >
          &times;
        </button>

        {/* ── Step 1: Choose student type ── */}
        {showAssistModal && (
          <div className="signin-assist-overlay" role="dialog" aria-modal="true" aria-labelledby="assist-login-title">
            <form className="signin-assist-modal" onSubmit={handleAdminAssistLogin}>
              <div className="signin-assist-header">
                <div className="signin-assist-heading-icon">
                  <FaUserShield />
                </div>
                <div>
                  <h3 id="assist-login-title">Admin Assist Login</h3>
                  <p>Start a temporary student assistance session.</p>
                </div>
                <button
                  type="button"
                  className="signin-assist-close"
                  onClick={closeAssistModal}
                  disabled={assistLoading}
                  aria-label="Close Admin Assist Login"
                >
                  &times;
                </button>
              </div>

              {assistError && (
                <div className="signin-error-message" role="alert" aria-live="polite">
                  <strong>Error: </strong>
                  {assistError}
                </div>
              )}

              <div className="signin-field">
                <label htmlFor="assist-admin-email">Admin email</label>
                <div className="signin-assist-input-wrap">
                  <FaEnvelope className="signin-assist-input-icon" />
                  <input
                    id="assist-admin-email"
                    type="email"
                    name="adminEmail"
                    value={assistForm.adminEmail}
                    onChange={handleAssistFormChange}
                    placeholder=""
                    autoComplete="email"
                    disabled={assistLoading}
                    required
                  />
                </div>
              </div>

              <div className="signin-field">
                <label htmlFor="assist-admin-password">Admin password</label>
                <div className="signin-assist-input-wrap">
                  <FaLock className="signin-assist-input-icon" />
                  <input
                    id="assist-admin-password"
                    type={showAssistPassword ? "text" : "password"}
                    name="adminPassword"
                    value={assistForm.adminPassword}
                    onChange={handleAssistFormChange}
                    placeholder="Enter admin password"
                    autoComplete="current-password"
                    disabled={assistLoading}
                    required
                  />
                  <button
                    type="button"
                    className="signin-assist-eye-btn"
                    onClick={toggleAssistPasswordVisibility}
                    disabled={assistLoading}
                    aria-label={showAssistPassword ? "Hide admin password" : "Show admin password"}
                    title={showAssistPassword ? "Hide password" : "Show password"}
                  >
                    <EyeIcon open={showAssistPassword} />
                  </button>
                </div>
              </div>

              <div className="signin-field">
                <label htmlFor="assist-user-email">Student/user email to assist</label>
                <div className="signin-assist-input-wrap">
                  <FaUser className="signin-assist-input-icon" />
                  <input
                    id="assist-user-email"
                    type="email"
                    name="userEmail"
                    value={assistForm.userEmail}
                    onChange={handleAssistFormChange}
                    placeholder="student@example.com"
                    autoComplete="off"
                    disabled={assistLoading}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="signin-submit-btn signin-assist-submit" disabled={assistLoading}>
                <FaRocket />
                {assistLoading ? "Starting assist session..." : "Start Admin Assist"}
              </button>
            </form>
          </div>
        )}

        {!showStudentOptions ? (
          <div className="signin-split">
            <div className="signin-left">
              <BrandHeader subtitle="Sign in to your student account" />

              <div className="signin-type-group">
                <p className="signin-type-label">Select your student type</p>

                <button
                  className="signin-type-btn"
                  onClick={() => {
                    setShowStudentOptions(true);
                    setStudentType("first-year");
                    setError("");
                  }}
                  type="button"
                >
                  <div className="signin-type-text">
                    <span className="signin-type-title">First-year student</span>
                    <span className="signin-type-desc">
                      New to college this year
                    </span>
                  </div>
                  <span className="signin-type-arrow">&#8594;</span>
                </button>

                <button
                  className="signin-type-btn"
                  onClick={() => {
                    setShowStudentOptions(true);
                    setStudentType("transfer");
                    setError("");
                  }}
                  type="button"
                >
                  <div className="signin-type-text">
                    <span className="signin-type-title">Transfer student</span>
                    <span className="signin-type-desc">
                      Transferring from another college
                    </span>
                  </div>
                  <span className="signin-type-arrow">&#8594;</span>
                </button>

                
              </div>

              <p className="signin-create-account-text">
                New here?{" "}
                <span
                  className="signin-link"
                  onClick={() => navigate("/create-account")}
                  onKeyPress={handleCreateAccountKeyPress}
                  role="button"
                  tabIndex={0}
                >
                  Create an account
                </span>
              </p>

              <div className="signin-extra-login"></div>
            </div>
            <RightPanel />
          </div>
        ) : studentType === "first-year" ? (
          /* ── First-Year Sign In Form ── */
          <div className="signin-split">
            <div className="signin-left">
              <BrandHeader subtitle="Sign in to your First-Year account" />

              {error && (
                <div
                  className="signin-error-message"
                  role="alert"
                  aria-live="polite"
                >
                  <strong>Error: </strong>
                  {error}
                </div>
              )}

              <form
                onSubmit={handleFirstYearSignIn}
                noValidate
                className="signin-form"
              >
                <div className="signin-field">
                  <label htmlFor="signin-email">Email Address</label>
                  <input
                    id="signin-email"
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    required
                    disabled={loading}
                    autoComplete="email"
                    aria-invalid={Boolean(signinEmailError)}
                    onBlur={(event) => {
                      const value = event.target.value.trim();
                      setSigninEmailError(value && !EMAIL_PATTERN.test(value)
                        ? "Enter a valid email address. Numbers may be used before @, but not after the domain extension."
                        : "");
                    }}
                    onChange={(event) => {
                      const sanitized = removeDigitsAfterEmailDomain(event.target.value);
                      if (sanitized !== event.target.value) event.target.value = sanitized;
                      setSigninEmailError("");
                    }}
                  />
                  {signinEmailError && <small className="signin-field-error" role="alert">{signinEmailError}</small>}
                </div>

                <div className="signin-field">
                  <label htmlFor="signin-password">Password</label>
                  <div className="signin-password-wrapper">
                    <input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Enter your password"
                      required
                      disabled={loading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="signin-eye-btn"
                      onClick={togglePasswordVisibility}
                      disabled={loading}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </div>

                <p className="signin-forgot">
                  <span
                    className="signin-link"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate("/firstyear/forgot-password")}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        navigate("/firstyear/forgot-password");
                    }}
                  >
                    Forgot password?
                  </span>
                </p>

                <button
                  type="submit"
                  className="signin-submit-btn"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Login to Dashboard"}
                </button>

                <button
                  type="button"
                  className="signin-assist-link"
                  onClick={openAssistModal}
                  disabled={loading}
                >
                  <FaUserShield />
                  <span>Admin Assist Login</span>
                </button>

                <p
                  className="signin-create-account-text"
                  style={{ marginTop: "14px" }}
                >
                  New here?{" "}
                  <span
                    className="signin-link"
                    onClick={() => navigate("/create-account")}
                    onKeyPress={handleCreateAccountKeyPress}
                    role="button"
                    tabIndex={0}
                  >
                    Create an account
                  </span>
                </p>
              </form>

              <p
                className="signin-back-link"
                onClick={handleResetState}
                onKeyPress={handleBackKeyPress}
                role="button"
                tabIndex={0}
              >
                &#8592; Back to student type
              </p>
            </div>
            <RightPanel />
          </div>
        ) : (
          /* ── Transfer Student Sign In Form ── */
          <div className="signin-split">
            <div className="signin-left">
              <BrandHeader subtitle="Sign in to your Transfer account" />

              {error && (
                <div
                  className="signin-error-message"
                  role="alert"
                  aria-live="polite"
                >
                  <strong>Error: </strong>
                  {error}
                </div>
              )}

              <form
                onSubmit={handleTransferSignIn}
                noValidate
                className="signin-form"
              >
                <div className="signin-field">
                  <label htmlFor="transfer-username">Username</label>
                  <input
                    id="transfer-username"
                    type="text"
                    name="username"
                    placeholder="Enter your username"
                    required
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>

                <div className="signin-field">
                  <label htmlFor="transfer-password">Password</label>
                  <div className="signin-password-wrapper">
                    <input
                      id="transfer-password"
                      type={showTransferPassword ? "text" : "password"}
                      name="password"
                      placeholder="Enter your password"
                      required
                      disabled={loading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="signin-eye-btn"
                      onClick={toggleTransferPasswordVisibility}
                      disabled={loading}
                      aria-label={
                        showTransferPassword ? "Hide password" : "Show password"
                      }
                    >
                      <EyeIcon open={showTransferPassword} />
                    </button>
                  </div>
                </div>

                <p className="signin-forgot">
                  <span
                    className="signin-link"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate("/transfer/forgot-password")}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        navigate("/transfer/forgot-password");
                    }}
                  >
                    Forgot password?
                  </span>
                </p>

                <button
                  type="submit"
                  className="signin-submit-btn"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Login to Dashboard"}
                </button>

                <p
                  className="signin-create-account-text"
                  style={{ marginTop: "14px" }}
                >
                  New here?{" "}
                  <span
                    className="signin-link"
                    onClick={() => navigate("/create-account")}
                    onKeyPress={handleCreateAccountKeyPress}
                    role="button"
                    tabIndex={0}
                  >
                    Create an account
                  </span>
                </p>
              </form>

              <p
                className="signin-back-link"
                onClick={handleResetState}
                onKeyPress={handleBackKeyPress}
                role="button"
                tabIndex={0}
              >
                &#8592; Back to student type
              </p>
            </div>
            <RightPanel />
          </div>
        )}
      </div>
    </div>
  );
};

export default SignIn;
