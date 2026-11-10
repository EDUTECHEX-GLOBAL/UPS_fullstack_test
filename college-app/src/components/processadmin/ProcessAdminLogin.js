import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ProcessAdminLogin.css";
import EdutechLogo from "../../assets/Edutech-logo.svg";
import LoginImage from "../../assets/login.png";
import API_BASE_URL from "../../config/api";

const isValidEmailAddress = (value) => /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,}$/i.test(value);
const isValidName = (value) => /^[A-Za-zÀ-ÖØ-öø-ÿ .'-]{2,50}$/.test(String(value || "").trim());
// ══════════════════════════════════════════════════════
//  SVG ICONS  (outside component — never remount)
// ══════════════════════════════════════════════════════
const IconEmail = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const IconLock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const IconUser = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconEyeOff = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const IconEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const IconBack = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
);

const IconAlert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

// ══════════════════════════════════════════════════════
//  REUSABLE INPUT FIELD  (outside component — KEY FIX)
//  Defining this inside the parent caused remounting on
//  every keystroke, clearing the input value.
// ══════════════════════════════════════════════════════
const InputField = ({ label, icon, type, value, onChange, placeholder, disabled, autoComplete, children, fieldKey, focused, onFocus, onBlur, error: fieldError }) => (
  <div className="process-field-group">
    <label className="process-label">{label}</label>
    <div className={`process-input-wrap ${focused ? "process-focused" : ""} ${fieldError ? "process-invalid" : ""}`}>
      <span className="process-input-icon">{icon}</span>
      <input
        className={`process-input ${type === "password" ? "process-input-pass" : ""}`}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        required
        disabled={disabled}
        autoComplete={autoComplete}
        aria-invalid={fieldError ? "true" : undefined}
        maxLength={type === "email" ? 254 : undefined}
      />
      {children}
    </div>
    {fieldError && <span className="process-field-error" role="alert">{fieldError}</span>}
  </div>
);

// ── Eye toggle button (outside component) ──
const EyeButton = ({ show, toggle, disabled }) => (
  <button type="button" className="process-show-btn" onClick={toggle} disabled={disabled} tabIndex={-1}>
    {show ? <IconEyeOff /> : <IconEye />}
  </button>
);

// ══════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════
const ProcessAdminLogin = () => {
  const navigate = useNavigate();

  // ── Step: 'login' | 'register' | 'verify_otp' | 'pending_approval'
  const [step, setStep] = useState("login");

  // ── Shared ──
  const [email, setEmail]       = useState("");
  const [emailValidationError, setEmailValidationError] = useState("");
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ── Register ──
  const [firstName,          setFirstName]          = useState("");
  const [lastName,           setLastName]           = useState("");
  const [firstNameError,     setFirstNameError]     = useState("");
  const [lastNameError,      setLastNameError]      = useState("");
  const [regPassword,        setRegPassword]        = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPass,        setShowRegPass]        = useState(false);
  const [showConfirmPass,    setShowConfirmPass]    = useState(false);

  // ── Login ──
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password
  const [resetPassword,        setResetPassword]        = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetPass,        setShowResetPass]        = useState(false);
  const [showResetConfirmPass, setShowResetConfirmPass] = useState(false);

  // ── OTP ──
  const [otp,            setOtp]            = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);

  // ── Focus states (keyed by field name) ──
  const [focused, setFocused] = useState({});

  const setFieldFocused   = (key) => setFocused((f) => ({ ...f, [key]: true }));
  const setFieldUnfocused = (key) => setFocused((f) => ({ ...f, [key]: false }));

  // ── Resend cooldown countdown ──
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const clearError = () => setError("");
  const clearMessages = () => {
    setError("");
    setSuccess("");
    setEmailValidationError("");
    setFirstNameError("");
    setLastNameError("");
  };

  // ── OTP handlers ──
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  // ══════════════════════════════════════════
  //  REGISTER
  // ══════════════════════════════════════════
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst) {
      setFirstNameError("Please enter your first name.");
      return;
    }
    if (!isValidName(trimmedFirst)) {
      setFirstNameError("First name can only contain letters (min. 2 characters).");
      return;
    }
    setFirstNameError("");

    if (!trimmedLast) {
      setLastNameError("Please enter your last name.");
      return;
    }
    if (!isValidName(trimmedLast)) {
      setLastNameError("Last name can only contain letters (min. 2 characters).");
      return;
    }
    setLastNameError("");

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setEmailValidationError("Please enter your email address.");
      return;
    }
    if (!isValidEmailAddress(normalizedEmail)) {
      setEmailValidationError("Enter a valid email address, such as name@gmail.com.");
      return;
    }
    setEmailValidationError("");

    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (regPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
      `${API_BASE_URL}/api/process-admin/register`,
        { firstName: firstName.trim(), lastName: lastName.trim(), email: normalizedEmail, password: regPassword }
      );
      if (response.data.success) {
        setStep("verify_otp");
        setResendCooldown(60);
      } else {
        const msg = response.data.message || "Registration failed.";
        if (msg.toLowerCase().includes("first name")) {
          setFirstNameError(msg);
        } else if (msg.toLowerCase().includes("last name")) {
          setLastNameError(msg);
        } else if (msg.toLowerCase().includes("valid email") || msg.toLowerCase().includes("email is required")) {
          setEmailValidationError(msg);
        } else {
          setError(msg);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed. Please try again.";
      if (msg.toLowerCase().includes("first name")) {
        setFirstNameError(msg);
      } else if (msg.toLowerCase().includes("last name")) {
        setLastNameError(msg);
      } else if (msg.toLowerCase().includes("valid email") || msg.toLowerCase().includes("email is required")) {
        setEmailValidationError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ══════════════════════════════════════════
  //  VERIFY OTP
  // ══════════════════════════════════════════
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");

    const otpValue = otp.join("");
    if (otpValue.length < 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
     `${API_BASE_URL}/api/process-admin/verify-otp`,
        { email, otp: otpValue }
      );
      if (response.data.success) {
        setStep("pending_approval");
      } else {
        setError(response.data.message || "OTP verification failed.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ══════════════════════════════════════════
  //  RESEND OTP
  // ══════════════════════════════════════════
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/process-admin/resend-otp`, { email });
      setResendCooldown(60);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  // ══════════════════════════════════════════
  //  LOGIN
  // ══════════════════════════════════════════
  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    clearMessages();
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setEmailValidationError("Please enter your email address.");
      return;
    }
    if (!isValidEmailAddress(normalizedEmail)) {
      setEmailValidationError("Enter a valid email address, such as name@gmail.com.");
      return;
    }
    setEmailValidationError("");

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/process-admin/forgot-password/send-otp`,
        { email: normalizedEmail }
      );
      if (response.data.success) {
        setOtp(["", "", "", "", "", ""]);
        setResendCooldown(60);
        setStep("forgot_otp");
      } else {
        setError(response.data.message || "Failed to send OTP.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotVerifyOtp = async (e) => {
    e.preventDefault();
    clearMessages();

    const otpValue = otp.join("");
    if (otpValue.length < 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/process-admin/forgot-password/verify-otp`,
        { email, otp: otpValue }
      );
      if (response.data.success) {
        setStep("reset_password");
      } else {
        setError(response.data.message || "OTP verification failed.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotResendOtp = async () => {
    if (resendCooldown > 0) return;
    clearMessages();
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/process-admin/forgot-password/send-otp`, { email });
      setResendCooldown(60);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessages();

    if (resetPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/process-admin/forgot-password/reset`,
        { email, otp: otp.join(""), newPassword: resetPassword }
      );
      if (response.data.success) {
        setPassword("");
        setResetPassword("");
        setResetConfirmPassword("");
        setOtp(["", "", "", "", "", ""]);
        setSuccess(response.data.message || "Password reset successful. Please log in.");
        setStep("login");
      } else {
        setError(response.data.message || "Password reset failed.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Password reset failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setEmailValidationError("Please enter your email address.");
      return;
    }
    if (!isValidEmailAddress(normalizedEmail)) {
      setEmailValidationError("Enter a valid email address, such as name@gmail.com.");
      return;
    }
    setEmailValidationError("");

    setIsLoading(true);
    try {
      const response = await axios.post(
  `${API_BASE_URL}/api/process-admin/login`,
  { email: normalizedEmail, password }
);
      if (response.data.success && response.data.token) {
        localStorage.setItem("processAdminToken", response.data.token);
        localStorage.setItem("processAdminData", JSON.stringify(response.data.processAdmin));
        localStorage.setItem("processAdminEmail", normalizedEmail);
        axios.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;
        navigate("/process-admin-dashboard");
      } else {
        setError(response.data.message || "Login failed.");
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.step === "verify_otp") {
        setStep("verify_otp");
        setResendCooldown(0);
      } else if (data?.step === "pending_approval") {
        setStep("pending_approval");
      } else if (err.response?.status === 401) {
        setError("Invalid email or password.");
      } else if (err.response?.status === 423) {
        setError(data?.message || "Account locked. Please try again later.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ══════════════════════════════════════════
  //  RENDER FORMS
  // ══════════════════════════════════════════

  // ── REGISTER ──
  const renderRegister = () => (
    <>
      <div className="process-step-header">
        <h2 className="process-step-title">Create Account</h2>
        <p className="process-step-sub">Register as a Process Admin</p>
      </div>

      <form onSubmit={handleRegister} noValidate>
        <div className="process-name-row">
          <InputField
            label="First Name" icon={<IconUser />} type="text"
            value={firstName} onChange={(e) => {
              const val = e.target.value;
              setFirstName(val);
              if (firstNameError && isValidName(val)) setFirstNameError("");
              if (error) setError("");
            }}
            placeholder="John" disabled={isLoading} autoComplete="given-name"
            error={firstNameError}
            focused={!!focused.firstName}
            onFocus={() => setFieldFocused("firstName")}
            onBlur={() => {
              setFieldUnfocused("firstName");
              const trimmed = firstName.trim();
              if (trimmed && !isValidName(trimmed)) {
                setFirstNameError("First name can only contain letters (min. 2 characters).");
              } else if (!trimmed) {
                setFirstNameError("");
              }
            }}
          />
          <InputField
            label="Last Name" icon={<IconUser />} type="text"
            value={lastName} onChange={(e) => {
              const val = e.target.value;
              setLastName(val);
              if (lastNameError && isValidName(val)) setLastNameError("");
              if (error) setError("");
            }}
            placeholder="Doe" disabled={isLoading} autoComplete="family-name"
            error={lastNameError}
            focused={!!focused.lastName}
            onFocus={() => setFieldFocused("lastName")}
            onBlur={() => {
              setFieldUnfocused("lastName");
              const trimmed = lastName.trim();
              if (trimmed && !isValidName(trimmed)) {
                setLastNameError("Last name can only contain letters (min. 2 characters).");
              } else if (!trimmed) {
                setLastNameError("");
              }
            }}
          />
        </div>

        <InputField
          label="Email Address" icon={<IconEmail />} type="email"
          value={email} onChange={(e) => {
            const nextEmail = e.target.value;
            const trimmedEmail = nextEmail.trim();
            setEmail(nextEmail);
            setEmailValidationError(trimmedEmail.includes('@') && /\.[^@\s]{2,}$/.test(trimmedEmail) && !isValidEmailAddress(trimmedEmail)
              ? "Enter a valid email address, such as name@gmail.com."
              : "");
            if (error) setError("");
          }}
          placeholder="you@edutechex.com" disabled={isLoading} autoComplete="email"
          error={emailValidationError}
          focused={!!focused.regEmail}
          onFocus={() => setFieldFocused("regEmail")}
          onBlur={() => {
            setFieldUnfocused("regEmail");
            const enteredEmail = email.trim();
            if (enteredEmail && !isValidEmailAddress(enteredEmail)) {
              setEmailValidationError("Enter a valid email address, such as name@gmail.com.");
            }
          }}
        />

        <InputField
          label="Password" icon={<IconLock />}
          type={showRegPass ? "text" : "password"}
          value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
          placeholder="Min. 8 characters" disabled={isLoading} autoComplete="new-password"
          focused={!!focused.regPass}
          onFocus={() => setFieldFocused("regPass")}
          onBlur={() => setFieldUnfocused("regPass")}
        >
          <EyeButton show={showRegPass} toggle={() => setShowRegPass((v) => !v)} disabled={isLoading} />
        </InputField>

        <InputField
          label="Confirm Password" icon={<IconLock />}
          type={showConfirmPass ? "text" : "password"}
          value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)}
          placeholder="Re-enter password" disabled={isLoading} autoComplete="new-password"
          focused={!!focused.confirmPass}
          onFocus={() => setFieldFocused("confirmPass")}
          onBlur={() => setFieldUnfocused("confirmPass")}
        >
          <EyeButton show={showConfirmPass} toggle={() => setShowConfirmPass((v) => !v)} disabled={isLoading} />
        </InputField>

        {error && error !== emailValidationError && error !== firstNameError && error !== lastNameError && (
          <div className="process-error">
            <IconAlert /><span>{error}</span>
            <button type="button" className="process-error-close" onClick={clearError}>✕</button>
          </div>
        )}

        <button type="submit" className={`process-submit-btn ${isLoading ? "process-loading" : ""}`} disabled={isLoading}>
          {isLoading ? <><span className="process-spinner" />Creating account…</> : "Register & Get OTP"}
        </button>
      </form>

      <div className="process-switch-row">
        Already have an account?{" "}
        <button type="button" className="process-link-btn" onClick={() => { setStep("login"); setError(""); }}>
          Sign in
        </button>
      </div>
    </>
  );

  // ── VERIFY OTP ──
  const renderVerifyOtp = () => (
    <>
      <div className="process-step-header">
        <div className="process-otp-icon-wrap">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.07 6.07l1.27-.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </div>
        <h2 className="process-step-title">Verify Your Email</h2>
        <p className="process-step-sub">
          We sent a 6-digit code to<br />
          <strong className="process-email-highlight">{email}</strong>
        </p>
      </div>

      <form onSubmit={handleVerifyOtp} noValidate>
        <div className="process-otp-row" onPaste={handleOtpPaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (otpRefs.current[i] = el)}
              className={`process-otp-box ${digit ? "process-otp-filled" : ""}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              disabled={isLoading}
              autoFocus={i === 0}
            />
          ))}
        </div>

        {error && (
          <div className="process-error">
            <IconAlert /><span>{error}</span>
            <button type="button" className="process-error-close" onClick={clearError}>✕</button>
          </div>
        )}

        <button type="submit" className={`process-submit-btn ${isLoading ? "process-loading" : ""}`} disabled={isLoading}>
          {isLoading ? <><span className="process-spinner" />Verifying…</> : "Verify OTP"}
        </button>
      </form>

      <div className="process-resend-row">
        {resendCooldown > 0 ? (
          <span className="process-resend-timer">Resend OTP in {resendCooldown}s</span>
        ) : (
          <button type="button" className="process-link-btn" onClick={handleResendOtp} disabled={isLoading}>
            Resend OTP
          </button>
        )}
      </div>

      <button type="button" className="process-back-btn"
        onClick={() => { setStep("register"); setError(""); setOtp(["","","","","",""]); }}
        disabled={isLoading}
      >
        <IconBack /> Back to Register
      </button>
    </>
  );

  // ── PENDING APPROVAL ──
  const renderPendingApproval = () => (
    <div className="process-pending-wrap">
      <div className="process-pending-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      <h2 className="process-pending-title">Pending Approval</h2>
      <p className="process-pending-desc">
        Your email has been verified! Your account is now awaiting admin approval. You'll receive an email once your account is activated.
      </p>
      <div className="process-pending-info">
        <span className="process-pending-badge">⏳ Under Review</span>
      </div>
      <p className="process-pending-email">
        Registered as: <strong>{email}</strong>
      </p>
      <button
        type="button"
        className="process-submit-btn"
        style={{ marginTop: "8px" }}
        onClick={() => { setStep("login"); setEmail(""); setError(""); }}
      >
        Go to Login
      </button>
    </div>
  );

  // ── LOGIN ──
  const renderForgotEmail = () => (
    <>
      <div className="process-step-header">
        <h2 className="process-step-title">Reset Password</h2>
        <p className="process-step-sub">Enter your Process Admin email to receive a reset OTP</p>
      </div>

      <form onSubmit={handleForgotSendOtp} noValidate>
        <InputField
          label="Email Address" icon={<IconEmail />} type="email"
          value={email} onChange={(e) => {
            const nextEmail = e.target.value;
            const trimmedEmail = nextEmail.trim();
            setEmail(nextEmail);
            setEmailValidationError(trimmedEmail.includes('@') && /\.[^@\s]{2,}$/.test(trimmedEmail) && !isValidEmailAddress(trimmedEmail)
              ? "Enter a valid email address, such as name@gmail.com."
              : "");
            if (error) setError("");
          }}
          placeholder="process-admin@edutechex.com" disabled={isLoading} autoComplete="email"
          error={emailValidationError}
          focused={!!focused.forgotEmail}
          onFocus={() => setFieldFocused("forgotEmail")}
          onBlur={() => {
            setFieldUnfocused("forgotEmail");
            const enteredEmail = email.trim();
            if (enteredEmail && !isValidEmailAddress(enteredEmail)) {
              setEmailValidationError("Enter a valid email address, such as name@gmail.com.");
            }
          }}
        />

        {error && error !== emailValidationError && error !== firstNameError && error !== lastNameError && (
          <div className="process-error">
            <IconAlert /><span>{error}</span>
            <button type="button" className="process-error-close" onClick={clearError}>x</button>
          </div>
        )}

        <button type="submit" className={`process-submit-btn ${isLoading ? "process-loading" : ""}`} disabled={isLoading}>
          {isLoading ? <><span className="process-spinner" />Sending OTP...</> : "Send OTP"}
        </button>
      </form>

      <button type="button" className="process-back-btn" onClick={() => { clearMessages(); setStep("login"); }} disabled={isLoading}>
        <IconBack /> Back to Login
      </button>
    </>
  );

  const renderForgotOtp = () => (
    <>
      <div className="process-step-header">
        <div className="process-otp-icon-wrap">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.07 6.07l1.27-.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </div>
        <h2 className="process-step-title">Enter Reset OTP</h2>
        <p className="process-step-sub">
          We sent a 6-digit code to<br />
          <strong className="process-email-highlight">{email}</strong>
        </p>
      </div>

      <form onSubmit={handleForgotVerifyOtp} noValidate>
        <div className="process-otp-row" onPaste={handleOtpPaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (otpRefs.current[i] = el)}
              className={`process-otp-box ${digit ? "process-otp-filled" : ""}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              disabled={isLoading}
              autoFocus={i === 0}
            />
          ))}
        </div>

        {error && (
          <div className="process-error">
            <IconAlert /><span>{error}</span>
            <button type="button" className="process-error-close" onClick={clearError}>x</button>
          </div>
        )}

        <button type="submit" className={`process-submit-btn ${isLoading ? "process-loading" : ""}`} disabled={isLoading}>
          {isLoading ? <><span className="process-spinner" />Verifying...</> : "Verify OTP"}
        </button>
      </form>

      <div className="process-resend-row">
        {resendCooldown > 0 ? (
          <span className="process-resend-timer">Resend OTP in {resendCooldown}s</span>
        ) : (
          <button type="button" className="process-link-btn" onClick={handleForgotResendOtp} disabled={isLoading}>
            Resend OTP
          </button>
        )}
      </div>

      <button type="button" className="process-back-btn"
        onClick={() => { clearMessages(); setStep("forgot_email"); setOtp(["", "", "", "", "", ""]); }}
        disabled={isLoading}
      >
        <IconBack /> Back
      </button>
    </>
  );

  const renderResetPassword = () => (
    <>
      <div className="process-step-header">
        <h2 className="process-step-title">Create New Password</h2>
        <p className="process-step-sub">Use at least 8 characters for your new password</p>
      </div>

      <form onSubmit={handleResetPassword} noValidate>
        <InputField
          label="New Password" icon={<IconLock />}
          type={showResetPass ? "text" : "password"}
          value={resetPassword} onChange={(e) => setResetPassword(e.target.value)}
          placeholder="Min. 8 characters" disabled={isLoading} autoComplete="new-password"
          focused={!!focused.resetPass}
          onFocus={() => setFieldFocused("resetPass")}
          onBlur={() => setFieldUnfocused("resetPass")}
        >
          <EyeButton show={showResetPass} toggle={() => setShowResetPass((v) => !v)} disabled={isLoading} />
        </InputField>

        <InputField
          label="Confirm Password" icon={<IconLock />}
          type={showResetConfirmPass ? "text" : "password"}
          value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)}
          placeholder="Re-enter password" disabled={isLoading} autoComplete="new-password"
          focused={!!focused.resetConfirmPass}
          onFocus={() => setFieldFocused("resetConfirmPass")}
          onBlur={() => setFieldUnfocused("resetConfirmPass")}
        >
          <EyeButton show={showResetConfirmPass} toggle={() => setShowResetConfirmPass((v) => !v)} disabled={isLoading} />
        </InputField>

        {error && (
          <div className="process-error">
            <IconAlert /><span>{error}</span>
            <button type="button" className="process-error-close" onClick={clearError}>x</button>
          </div>
        )}

        <button type="submit" className={`process-submit-btn ${isLoading ? "process-loading" : ""}`} disabled={isLoading}>
          {isLoading ? <><span className="process-spinner" />Resetting...</> : "Reset Password"}
        </button>
      </form>

      <button type="button" className="process-back-btn" onClick={() => { clearMessages(); setStep("forgot_otp"); }} disabled={isLoading}>
        <IconBack /> Back to OTP
      </button>
    </>
  );

  const renderLogin = () => (
    <>
      <div className="process-step-header">
        <h2 className="process-step-title">Welcome back</h2>
        <p className="process-step-sub">Sign in to your Process Admin account</p>
      </div>

      <form onSubmit={handleLogin} noValidate>
        <InputField
          label="Email Address" icon={<IconEmail />} type="email"
          value={email} onChange={(e) => {
            const nextEmail = e.target.value;
            const trimmedEmail = nextEmail.trim();
            setEmail(nextEmail);
            setEmailValidationError(trimmedEmail.includes('@') && /\.[^@\s]{2,}$/.test(trimmedEmail) && !isValidEmailAddress(trimmedEmail)
              ? "Enter a valid email address, such as name@gmail.com."
              : "");
            if (error) setError("");
          }}
          placeholder="process-admin@edutechex.com" disabled={isLoading} autoComplete="email"
          error={emailValidationError}
          focused={!!focused.loginEmail}
          onFocus={() => setFieldFocused("loginEmail")}
          onBlur={() => {
            setFieldUnfocused("loginEmail");
            const enteredEmail = email.trim();
            if (enteredEmail && !isValidEmailAddress(enteredEmail)) {
              setEmailValidationError("Enter a valid email address, such as name@gmail.com.");
            }
          }}
        />

        <InputField
          label="Password" icon={<IconLock />}
          type={showPassword ? "text" : "password"}
          value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••" disabled={isLoading} autoComplete="current-password"
          focused={!!focused.loginPass}
          onFocus={() => setFieldFocused("loginPass")}
          onBlur={() => setFieldUnfocused("loginPass")}
        >
          <EyeButton show={showPassword} toggle={() => setShowPassword((v) => !v)} disabled={isLoading} />
        </InputField>

        {error && error !== emailValidationError && error !== firstNameError && error !== lastNameError && (
          <div className="process-error">
            <IconAlert /><span>{error}</span>
            <button type="button" className="process-error-close" onClick={clearError}>✕</button>
          </div>
        )}

        {success && (
          <div className="process-success">
            <span>{success}</span>
            <button type="button" className="process-success-close" onClick={() => setSuccess("")}>x</button>
          </div>
        )}

        <button type="submit" className={`process-submit-btn ${isLoading ? "process-loading" : ""}`} disabled={isLoading}>
          {isLoading ? <><span className="process-spinner" />Signing in…</> : "Login to Dashboard"}
        </button>
      </form>

      <div className="process-resend-row">
        <button
          type="button"
          className="process-link-btn"
          onClick={() => { clearMessages(); setOtp(["", "", "", "", "", ""]); setStep("forgot_email"); }}
          disabled={isLoading}
        >
          Forgot Password?
        </button>
      </div>

      <div className="process-switch-row">
        New here?{" "}
        <button type="button" className="process-link-btn" onClick={() => { setStep("register"); setError(""); }}>
          Create an account
        </button>
      </div>

      <button onClick={() => navigate("/")} className="process-back-btn" disabled={isLoading} type="button">
        <IconBack /> Back to Dashboard
      </button>
    </>
  );

  // ── Right panel content by step ──
  const rightContent = {
    register:         { title: "Join EdutechEX",                       desc: "Create your Process Admin account to start managing academic workflows and streamline educational processes." },
    verify_otp:       { title: "One Step Away",                        desc: "Enter the OTP we sent to your email to verify your identity and complete registration." },
    pending_approval: { title: "You're in the queue!",                 desc: "Your registration is complete. An admin will review and activate your account shortly." },
    forgot_email:     { title: "Reset Access Securely",                desc: "We'll send a short-lived OTP to your registered Process Admin email before allowing a password reset." },
    forgot_otp:       { title: "Check Your Inbox",                     desc: "Enter the password reset OTP sent to your email. It expires in 10 minutes." },
    reset_password:   { title: "Choose a Strong Password",             desc: "Create a new password for your Process Admin account. Your approval status will remain unchanged." },
    login:            { title: "Empower Education Through Innovation", desc: "Streamline academic processes, manage workflows efficiently, and create an exceptional learning environment for future leaders." },
  };

  const { title: rightTitle, desc: rightDesc } = rightContent[step] || rightContent.login;

  return (
    <div className="process-wrapper">
      <div className="process-container">
        <div className="process-card">

          {/* ── LEFT — Form ── */}
          <div className="process-form-side">
            <div className="process-logo-block">
              <img src={EdutechLogo} alt="EdutechEX" className="process-logo" />
              <span className="process-role-tag">PROCESS ADMIN</span>
            </div>

            {step === "register"         && renderRegister()}
            {step === "verify_otp"       && renderVerifyOtp()}
            {step === "pending_approval" && renderPendingApproval()}
            {step === "forgot_email"     && renderForgotEmail()}
            {step === "forgot_otp"       && renderForgotOtp()}
            {step === "reset_password"   && renderResetPassword()}
            {step === "login"            && renderLogin()}
          </div>

          {/* ── RIGHT — Illustration ── */}
          <div className="process-info-side">
            <div className="process-illustration-wrap">
              <img src={LoginImage} alt="Login Illustration" className="process-illustration-img" />
            </div>
            <h2 className="process-info-title">{rightTitle}</h2>
            <p className="process-info-desc">{rightDesc}</p>
          </div>
        </div>

        <div className="process-copyright">© 2026 EdutechEX. All rights reserved.</div>
      </div>
    </div>
  );
};

export default ProcessAdminLogin;
