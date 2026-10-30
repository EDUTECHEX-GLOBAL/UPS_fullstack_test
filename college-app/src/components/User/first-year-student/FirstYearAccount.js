import React, { useEffect, useRef, useState } from "react";
import axiosInstance, { clearAllUserData } from "../../../api/axiosInstance";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./FirstYearAccount.css";

/* ── Eye Icons for Mask / Unmask ── */
const IcoEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IcoEyeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

/* ── Checkmark Icon ── */
const IcoCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const FieldIcon = ({ type }) => (
  <span className="fy-field-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {type === "mail" ? <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></> :
        type === "lock" ? <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></> :
          <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>}
    </svg>
  </span>
);

/* ── EduTechEX SVG Logo ── */
const EduTechLogo = () => (
  <svg
    viewBox="0 0 506 106"
    xmlns="http://www.w3.org/2000/svg"
    className="fy-svg-logo"
    aria-label="EduTechEX"
  >
    <defs>
      <linearGradient id="logoGrad1" gradientUnits="userSpaceOnUse" x1="516.3248" y1="53.11" x2="67.3956" y2="53.11" gradientTransform="matrix(1 0 0 -1 0 106.11)">
        <stop offset="0" stopColor="#3C4C9B" />
        <stop offset="0.4042" stopColor="#323E91" />
        <stop offset="1" stopColor="#293682" />
      </linearGradient>
      <linearGradient id="logoGradX" gradientUnits="userSpaceOnUse" x1="399.2313" y1="79.1373" x2="482.5292" y2="50.4227" gradientTransform="matrix(1 0 0 -1 0 106.11)">
        <stop offset="0.006" stopColor="#64C5E0" />
        <stop offset="1" stopColor="#12A480" />
      </linearGradient>
      <clipPath id="xClip">
        <polygon points="460.82,22.08 446.1,22.08 467.17,49.13 398.72,49.13 398.72,57.32 467.13,57.32 446.73,83.52 461.45,83.52 485.17,53.35" />
      </clipPath>
    </defs>
    <path fill="url(#logoGrad1)" d="M82.86,33.68c-0.48-0.33-0.96-0.65-1.47-0.94c-0.27-0.15-0.55-0.29-0.83-0.44c0.28,0.14,0.56,0.28,0.83,0.44C81.9,33.04,82.39,33.35,82.86,33.68z M87.09,37.59c0.82,1.01,1.57,2.1,2.21,3.28c1.9,3.47,2.87,7.47,2.87,11.87c0,4.4-0.96,8.39-2.87,11.87c-0.8,1.45-1.74,2.78-2.8,3.98c1.07-1.2,2.01-2.52,2.81-3.98c1.9-3.47,2.87-7.47,2.87-11.87c0-4.39-0.96-8.39-2.87-11.86C88.66,39.7,87.91,38.6,87.09,37.59z M39.36,30.19c1.18,0,2.17-0.38,2.96-1.13c0.79-0.75,1.21-1.75,1.21-2.88c0-1.12-0.41-2.12-1.19-2.9c-0.79-0.79-1.79-1.19-2.98-1.19H3.97c-1.13,0-2.11,0.39-2.92,1.17c-0.82,0.78-1.25,1.82-1.25,3v53.05c0,1.14,0.41,2.13,1.23,2.94c0.82,0.82,1.8,1.23,2.95,1.23h35.4c1.19,0,2.19-0.4,2.98-1.19c0.78-0.78,1.19-1.78,1.19-2.9c0-1.14-0.42-2.13-1.21-2.88c-0.79-0.75-1.78-1.13-2.96-1.13H8.15V56.76h22.4c1.09,0,2.05-0.37,2.84-1.09c0.83-0.77,1.33-1.87,1.33-3c0-1.12-0.41-2.12-1.19-2.9c-0.79-0.79-1.79-1.18-2.98-1.18H8.13V30.19H39.36z M85.62,26.01c-4.64-2.61-9.98-3.93-15.84-3.93H56.19c-1.18,0-2.19,0.4-2.98,1.18c-0.79,0.79-1.19,1.79-1.19,2.98V79.3c0,1.19,0.4,2.19,1.19,2.98c0.79,0.79,1.79,1.19,2.98,1.19h13.59c5.87,0,11.2-1.33,15.84-3.93c4.66-2.61,8.33-6.31,10.92-10.96c2.58-4.64,3.89-9.97,3.89-15.84c0-5.87-1.31-11.19-3.89-15.81C93.95,32.3,90.28,28.63,85.62,26.01z M89.31,64.6c-0.8,1.45-1.74,2.78-2.81,3.98c-1.47,1.65-3.17,3.06-5.12,4.2c-3.37,1.97-7.27,2.96-11.61,2.96h-9.42V29.81h9.42c3.99,0,7.61,0.85,10.79,2.49c0.28,0.14,0.56,0.28,0.83,0.44c0.51,0.29,0.99,0.61,1.47,0.94c1.6,1.1,3.01,2.41,4.23,3.91c0.82,1.01,1.57,2.1,2.22,3.28c1.9,3.47,2.87,7.47,2.87,11.86C92.17,57.13,91.21,61.13,89.31,64.6z M155.13,22.08c-1.19,0-2.19,0.4-2.98,1.19c-0.79,0.79-1.19,1.79-1.19,2.98v36.53c0,2.66-0.68,5.07-2.03,7.14c-1.36,2.09-3.26,3.75-5.66,4.93c-2.44,1.2-5.28,1.8-8.44,1.8c-3.22,0-6.11-0.61-8.6-1.8c-2.45-1.18-4.37-2.83-5.73-4.92c-1.34-2.07-2.03-4.48-2.03-7.14V26.25c0-1.18-0.4-2.19-1.19-2.98c-0.79-0.79-1.79-1.19-2.98-1.19c-1.19,0-2.19,0.4-2.98,1.19s-1.19,1.79-1.19,2.98v36.53c0,4.2,1.07,8.01,3.17,11.33c2.1,3.33,5.07,5.95,8.84,7.8c3.72,1.83,7.99,2.77,12.69,2.77c4.65,0,8.87-0.93,12.55-2.77c3.71-1.85,6.65-4.48,8.75-7.8c2.1-3.33,3.17-7.14,3.17-11.33V26.25c0-1.18-0.4-2.19-1.19-2.98C157.33,22.48,156.32,22.08,155.13,22.08z M214.04,23.19c-0.73-0.72-1.71-1.11-2.83-1.11h-41.73c-1.12,0-2.1,0.39-2.83,1.11c-0.74,0.74-1.12,1.69-1.12,2.83c0,1.07,0.39,2.02,1.11,2.75c0.74,0.74,1.69,1.12,2.83,1.12h16.66v49.42c0,1.14,0.41,2.13,1.23,2.94c0.8,0.8,1.82,1.23,2.95,1.23c1.27,0,2.37-0.5,3.17-1.44c0.67-0.8,1-1.84,1-2.88V29.89h16.74c1.14,0,2.09-0.37,2.83-1.11c0.73-0.73,1.12-1.68,1.12-2.75C215.15,24.9,214.77,23.92,214.04,23.19z M260.94,30.19c1.18,0,2.17-0.38,2.96-1.13c0.79-0.75,1.21-1.75,1.21-2.88c0-1.12-0.41-2.12-1.19-2.9c-0.79-0.79-1.79-1.19-2.98-1.19h-35.4c-1.13,0-2.11,0.39-2.92,1.17c-0.82,0.78-1.25,1.82-1.25,3v53.05c0,1.14,0.41,2.13,1.23,2.94c0.82,0.82,1.8,1.23,2.95,1.23h35.4c1.19,0,2.19-0.4,2.98-1.19c0.78-0.78,1.19-1.78,1.19-2.9c0-1.14-0.42-2.13-1.21-2.88c-0.79-0.75-1.78-1.13-2.96-1.13h-31.23V56.76h22.4c1.09,0,2.05-0.37,2.84-1.09c0.83-0.77,1.33-1.87,1.33-3c0-1.12-0.41-2.12-1.19-2.9c-0.79-0.79-1.79-1.18-2.98-1.18h-22.4V30.19H260.94z M290.19,32.53c3.41-2.1,7.15-3.18,11.13-3.18c2.91,0,5.5,0.38,7.68,1.14c2.15,0.75,4.17,1.96,5.99,3.6c0.73,0.66,1.64,0.99,2.71,0.99c0.61,0,1.2-0.15,1.74-0.47c0.45-0.26,0.8-0.6,1.02-1.02c0.37-0.24,0.67-0.56,0.92-0.95c0.32-0.52,0.48-1.1,0.48-1.74c0-1.15-0.46-2.09-1.27-2.68c-2.87-2.4-5.88-4.17-8.98-5.27c-3.09-1.1-6.55-1.66-10.3-1.66c-5.58,0-10.77,1.43-15.42,4.25c-4.64,2.82-8.36,6.67-11.07,11.46c-2.71,4.79-4.08,10.07-4.08,15.69c0,5.68,1.39,10.98,4.12,15.77c2.73,4.79,6.47,8.65,11.11,11.46c4.65,2.82,9.82,4.25,15.35,4.25c7.88,0,14.38-2.29,19.31-6.81l0.07-0.07c0.77-0.83,1.15-1.82,1.15-2.94c0-1.18-0.42-2.2-1.21-2.96c-0.79-0.75-1.73-1.13-2.8-1.13c-0.82,0-1.61,0.28-2.42,0.87c-4.18,3.33-8.93,5.02-14.11,5.02c-4.03,0-7.8-1.06-11.21-3.14c-3.42-2.09-6.17-4.96-8.17-8.53c-2-3.57-3.01-7.53-3.01-11.78c0-4.14,1.02-8.06,3.05-11.62C283.99,37.54,286.76,34.65,290.19,32.53z M378.8,22.08c-0.86-0.02-1.73,0.21-2.44,0.69c-1.2,0.81-1.84,2.04-1.84,3.48v22.32h-34.38V26.25c0-1.18-0.4-2.19-1.19-2.98c-0.79-0.79-1.79-1.19-2.98-1.19c-1.13,0-2.11,0.39-2.92,1.17c-0.82,0.78-1.25,1.82-1.25,3V79.3c0,1.14,0.41,2.13,1.23,2.94c0.82,0.82,1.8,1.23,2.95,1.23c1.27,0,2.37-0.5,3.17-1.44c0.67-0.8,1-1.84,1-2.88V56.3h34.38v23c0,1.12,0.42,2.14,1.23,2.94c0.82,0.82,1.8,1.23,2.95,1.23c1.27,0,2.37-0.5,3.17-1.44c0.67-0.8,1-1.84,1-2.88v-52.9c0-1.18-0.4-2.19-1.19-2.98C380.89,22.5,379.94,22.1,378.8,22.08z M446.1,30.26l-47.37,0.01v-8.18h18.89h22.54L446.1,30.26z M446.1,75.34l-47.37-0.01v8.18h18.89h22.54L446.1,75.34z M505.57,83.52h-10.57L481.9,66.68l5.28-6.78L505.57,83.52z M495.63,22.08l-13.68,17.56l5.28,6.78l18.96-24.35L495.63,22.08z" />
    <polygon clipPath="url(#xClip)" fill="url(#logoGradX)" points="460.82,22.08 446.1,22.08 467.17,49.13 398.72,49.13 398.72,57.32 467.13,57.32 446.73,83.52 461.45,83.52 485.17,53.35" />
  </svg>
);

const APPLICANT_TYPES = [
  { id: "First-Year Student", label: "First-Year Student", description: "Apply for your first university degree", icon: "student" },
  { id: "Transfer Student", label: "Transfer Student", description: "Transfer to a new university", icon: "transfer" },
];

const APPLYING_FOR_OPTIONS = ["Bachelor's", "Master's", "Medical"];
const EMAIL_PATTERN = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i;
const removeDigitsAfterEmailDomain = (value) => value.replace(/^(.+@[A-Z0-9.-]+\.[A-Z]{2,63})\d+$/i, "$1");

const NAME_REGEX = /^[A-Za-z\s]+$/;
const sanitizeName = (val) => String(val || "").replace(/[^A-Za-z\s]/g, "");

/* ── Password field (shared by Password + Confirm Password) ── */
const PasswordField = ({ id, name, value, onChange, onBlur, placeholder, show, onToggle, hasError }) => (
  <div className="fy-input-shell">
    <FieldIcon type="lock" />
    <input
      id={id}
      name={name}
      type={show ? "text" : "password"}
      className={`fy-input fy-pw-input ${hasError ? "fy-input-error" : ""}`}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      autoComplete="new-password"
      required
    />
    <button
      type="button"
      className="fy-pw-toggle"
      onClick={onToggle}
      title={show ? "Hide password" : "Show password"}
      tabIndex={-1}
      aria-label={show ? "Hide password" : "Show password"}
    >
      {show ? <IcoEyeOff /> : <IcoEye />}
    </button>
  </div>
);

const FirstYearAccount = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Resolve initial student type & applying for from query params
  const queryParams = new URLSearchParams(location.search);
  const initialTypeParam = queryParams.get("type");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    applicantType: initialTypeParam === "transfer" ? "Transfer Student" : "First-Year Student",
    applyingFor: initialTypeParam === "masters" ? "Master's" : (initialTypeParam === "medical" ? "Medical" : ""),
    email: "",
    otp: "",
    password: "",
    confirmPassword: "",
  });

  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [touched, setTouched] = useState({});
  const [emailValidationError, setEmailValidationError] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const emailInputRef = useRef(null);
  const otpInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  // Close custom dropdown on outside click / Escape
  useEffect(() => {
    if (!dropdownOpen) return undefined;
    const onPointerDown = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [dropdownOpen]);

  // Password validation rules
  const pw = formData.password || "";
  const pwRules = {
    length: pw.length >= 8,
    upperAndLower: /[A-Z]/.test(pw) && /[a-z]/.test(pw),
    number: /\d/.test(pw),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw),
    noSpaces: pw.length > 0 && !/\s/.test(pw),
  };
  const isPasswordValid = Object.values(pwRules).every(Boolean);
  const isConfirmMatching = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "firstName" || name === "lastName") {
      setFormData((prev) => ({ ...prev, [name]: sanitizeName(value) }));
    } else if (name === "email") {
      const sanitizedEmail = removeDigitsAfterEmailDomain(value);
      setFormData((prev) => ({ ...prev, [name]: sanitizedEmail }));
      setEmailValidationError("");
      // Reset email verified state if email is changed
      if (isEmailVerified) {
        setIsEmailVerified(false);
        setOtpSent(false);
      }
    } else if (name === "otp") {
      setFormData((prev) => ({ ...prev, otp: value.replace(/\D/g, "") }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (message.text) setMessage({ type: "", text: "" });
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "email") {
      const email = formData.email.trim();
      setEmailValidationError(email && !EMAIL_PATTERN.test(email)
        ? "Enter a valid email address. Numbers may be used before @, but not after the domain extension."
        : "");
    }
  };

  const handleSelectApplyingFor = (value) => {
    setFormData((f) => ({ ...f, applyingFor: value }));
    setDropdownOpen(false);
    setTouched((prev) => ({ ...prev, applyingFor: true }));
    if (message.text) setMessage({ type: "", text: "" });
  };

  // 1. Send OTP
  const handleSendOtp = async () => {
    const emailTrim = formData.email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(emailTrim)) {
      const validationMessage = "Please enter a valid email address. Numbers may be used before @, but not after the domain extension.";
      setEmailValidationError(validationMessage);
      setMessage({ type: "error", text: validationMessage });
      if (emailInputRef.current) emailInputRef.current.focus();
      return;
    }
    setEmailValidationError("");

    try {
      setSendingOtp(true);
      setMessage({ type: "", text: "" });

      const res = await axiosInstance.post("/api/students/send-email-otp", {
        email: emailTrim,
        firstName: formData.firstName.trim() || undefined,
      });

      setOtpSent(true);
      setOtpCountdown(60);
      setMessage({
        type: "success",
        text: res.data?.message || `Verification code sent to ${emailTrim}. Please check your inbox.`,
      });

      if (otpInputRef.current) {
        otpInputRef.current.focus();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to send verification code. Please try again.";
      setMessage({ type: "error", text: errMsg });
    } finally {
      setSendingOtp(false);
    }
  };

  // 2. Verify OTP
  const handleVerifyOtp = async () => {
    const emailTrim = formData.email.trim().toLowerCase();
    const otpCode = formData.otp.trim();

    if (!otpCode || otpCode.length < 4) {
      setMessage({ type: "error", text: "Please enter the verification code sent to your email." });
      if (otpInputRef.current) otpInputRef.current.focus();
      return;
    }

    try {
      setVerifyingOtp(true);
      setMessage({ type: "", text: "" });

      const res = await axiosInstance.post("/api/students/verify-email-otp", {
        email: emailTrim,
        otp: otpCode,
      });

      if (res.data?.success) {
        setIsEmailVerified(true);
        setMessage({
          type: "success",
          text: "✓ Email verified successfully! Now complete your password to create account.",
        });
      } else {
        setMessage({
          type: "error",
          text: res.data?.message || "Invalid verification code. Please check and try again.",
        });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || "Invalid or expired verification code. Please try again.";
      setMessage({ type: "error", text: errMsg });
    } finally {
      setVerifyingOtp(false);
    }
  };

  // 3. Create Account Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    const fName = formData.firstName.trim();
    const lName = formData.lastName.trim();
    const emailTrim = formData.email.trim().toLowerCase();
    const otpCode = formData.otp.trim();

    if (!fName || !lName || !emailTrim || !formData.applyingFor || !formData.password || !formData.confirmPassword) {
      setMessage({ type: "error", text: "Please fill in all required fields." });
      return;
    }

    if (!EMAIL_PATTERN.test(emailTrim)) {
      const validationMessage = "Please enter a valid email address. Numbers may be used before @, but not after the domain extension.";
      setEmailValidationError(validationMessage);
      setMessage({ type: "error", text: validationMessage });
      if (emailInputRef.current) emailInputRef.current.focus();
      return;
    }

    if (!NAME_REGEX.test(fName) || !NAME_REGEX.test(lName)) {
      setMessage({ type: "error", text: "Name fields can contain only letters and spaces." });
      return;
    }

    if (!isEmailVerified) {
      setMessage({
        type: "error",
        text: "Please verify your email with the OTP code before creating your account.",
      });
      if (!otpSent) {
        handleSendOtp();
      } else if (otpInputRef.current) {
        otpInputRef.current.focus();
      }
      return;
    }

    if (!isPasswordValid) {
      setMessage({ type: "error", text: "Please meet all password requirements before continuing." });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    try {
      setLoading(true);

      const payload = {
        firstName: fName,
        lastName: lName,
        applicantType: formData.applicantType,
        applyingFor: formData.applyingFor,
        studentType: formData.applicantType === "Transfer Student" ? "transfer" : (formData.applyingFor === "Master's" ? "start-2027" : "first-year-2025-2026"),
        email: emailTrim,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        otp: otpCode,
        verificationCode: otpCode,
        hasPassport: "no",
        agreeToTerms: true,
      };

      const res = await axiosInstance.post("/api/students/register", payload);

      if (res.data?.success) {
        clearAllUserData();

        setMessage({
          type: "success",
          text: res.data?.token
            ? "Account created successfully! Redirecting to login..."
            : "Email verified. Your account is awaiting admin approval. Redirecting to login...",
        });

        // Redirect to Login
        setTimeout(() => {
          navigate("/sign-in", {
            replace: true,
            state: {
              email: emailTrim,
              message: res.data?.token
                ? "Account created successfully! Please sign in to begin your registration form."
                : "Your email is verified. Please wait for admin approval before signing in.",
            },
          });
        }, 1200);
      } else {
        setMessage({
          type: "error",
          text: res.data?.message || "Registration failed. Please try again.",
        });
      }
    } catch (err) {
      console.error("Registration error:", err);
      const errMsg = err.response?.data?.message || "Registration failed. Please try again.";
      setMessage({ type: "error", text: errMsg });
    } finally {
      setLoading(false);
    }
  };

  const sendBtnLabel = sendingOtp
    ? "Sending..."
    : otpCountdown > 0
      ? `Resend (${otpCountdown}s)`
      : otpSent
        ? "Resend OTP"
        : "Send OTP";

  return (
    <div className="fy-wrapper">
      {/* ── Brand Header ── */}
      <header className="fy-brand-header">
        <Link to="/" className="fy-logo" title="EduTechEX Home">
          <EduTechLogo />
        </Link>
        <Link to="/sign-in" className="fy-back-btn">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>
          Sign In
        </Link>
      </header>

      {/* ── Main Card ── */}
      <main className="fy-card">
        {/* Title & Sign In prompt */}
        <div className="fy-card-header">
          <span className="fy-heading-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48"><path d="m5 18 19-9 19 9-19 9L5 18Z" /><path d="M13 22v10c6 5 16 5 22 0V22M43 19v12" /><circle cx="43" cy="34" r="2" /></svg>
          </span>
          <div className="fy-heading-copy">
            <h1 className="fy-title">Create Your Student Account</h1>
            <p className="fy-subtitle">Begin your university admission journey with EduTechEX.</p>
            <p className="fy-signin-prompt">Already have an account? <Link to="/sign-in" className="fy-signin-link">Sign In</Link></p>
          </div>
        </div>

        {/* ── Feedback Message Banner ── */}
        {message.text && (
          <div className={`fy-alert fy-alert-${message.type}`} role="alert">
            <span>{message.text}</span>
            <button
              type="button"
              className="fy-alert-close"
              aria-label="Dismiss message"
              onClick={() => setMessage({ type: "", text: "" })}
            >
              ×
            </button>
          </div>
        )}

        {/* 1. Applicant Type */}
        <div className="fy-type-selector-wrapper" role="radiogroup" aria-labelledby="fy-type-label">
          <span className="fy-type-label" id="fy-type-label">
            Applicant Type <span className="fy-req">*</span>
          </span>
          <div className="fy-type-pills">
            {APPLICANT_TYPES.map((type) => {
              const isSelected = formData.applicantType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`fy-type-pill ${isSelected ? "active" : ""}`}
                  onClick={() => setFormData((f) => ({ ...f, applicantType: type.id }))}
                >
                  <span className="fy-type-icon" aria-hidden="true">
                    {type.icon === "student" ? (
                      <svg viewBox="0 0 32 32"><path d="m3 10 13-6 13 6-13 6-13-6Z" /><path d="M8 13v7c4 4 12 4 16 0v-7M29 11v9" /><circle cx="29" cy="23" r="1.5" /><path d="M8 28c1-4 4-6 8-6s7 2 8 6M16 22v6" /></svg>
                    ) : (
                      <svg viewBox="0 0 32 32"><path d="M5 10h21l-5-5M27 10l-5 5M27 22H6l5 5M5 22l5-5" /></svg>
                    )}
                  </span>
                  <span className="fy-type-copy">
                    <span className="fy-type-text">{type.label}</span>
                    <small>{type.description}</small>
                  </span>
                  <span className="fy-radio" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Applying For (custom dropdown — avoids the oversized native popup on mobile) */}
        <div className="fy-field fy-applying-field">
          <span className="fy-label" id="fy-applying-label">
            Applying For <span className="fy-req">*</span>
          </span>
          <div className="fy-dd" ref={dropdownRef}>
            <button
              type="button"
              id="applyingFor"
              className={`fy-dd-trigger ${dropdownOpen ? "open" : ""} ${formData.applyingFor ? "has-value" : ""}`}
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
              aria-labelledby="fy-applying-label applyingFor"
              onClick={() => setDropdownOpen((o) => !o)}
            >
              <span className="fy-dd-value">{formData.applyingFor || "Select Application Type"}</span>
              <svg className="fy-dd-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {dropdownOpen && (
              <ul className="fy-dd-menu" role="listbox" aria-labelledby="fy-applying-label">
                {APPLYING_FOR_OPTIONS.map((opt) => {
                  const selected = formData.applyingFor === opt;
                  return (
                    <li
                      key={opt}
                      role="option"
                      aria-selected={selected}
                      tabIndex={0}
                      className={`fy-dd-option ${selected ? "selected" : ""}`}
                      onClick={() => handleSelectApplyingFor(opt)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectApplyingFor(opt);
                        }
                      }}
                    >
                      <span>{opt}</span>
                      {selected && <IcoCheck />}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {touched.applyingFor && !formData.applyingFor && (
            <span className="fy-field-err">Please select an application type</span>
          )}
        </div>

        {/* ── Form Inputs ── */}
        <form onSubmit={handleSubmit} noValidate className="fy-form">
          {/* Name Row: First Name & Last Name */}
          <div className="fy-row">
            <div className="fy-field">
              <label className="fy-label" htmlFor="firstName">
                First Name <span className="fy-req">*</span>
              </label>
              <div className="fy-input-shell">
                <FieldIcon type="user" />
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  className={`fy-input ${touched.firstName && !formData.firstName ? "fy-input-error" : ""}`}
                  placeholder="e.g. John"
                  value={formData.firstName}
                  onChange={handleChange}
                  onBlur={() => handleBlur("firstName")}
                  autoComplete="given-name"
                  required
                />
              </div>
              {touched.firstName && !formData.firstName && (
                <span className="fy-field-err">First name is required</span>
              )}
            </div>

            <div className="fy-field">
              <label className="fy-label" htmlFor="lastName">
                Last Name <span className="fy-req">*</span>
              </label>
              <div className="fy-input-shell">
                <FieldIcon type="user" />
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  className={`fy-input ${touched.lastName && !formData.lastName ? "fy-input-error" : ""}`}
                  placeholder="e.g. Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                  onBlur={() => handleBlur("lastName")}
                  autoComplete="family-name"
                  required
                />
              </div>
              {touched.lastName && !formData.lastName && (
                <span className="fy-field-err">Last name is required</span>
              )}
            </div>
          </div>

          {/* Email Address with Send OTP */}
          <div className="fy-field">
            <div className="fy-label-row">
              <label className="fy-label" htmlFor="email">
                Email Address <span className="fy-req">*</span>
              </label>
              {isEmailVerified && (
                <span className="fy-verified-badge">
                  <IcoCheck /> Email Verified
                </span>
              )}
            </div>

            <div className="fy-email-input-group">
              <div className="fy-input-shell fy-email-shell">
                <FieldIcon type="mail" />
                <input
                  ref={emailInputRef}
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  className={`fy-input ${touched.email && !formData.email ? "fy-input-error" : ""} ${isEmailVerified ? "fy-input-verified" : ""}`}
                  placeholder="e.g. john.doe@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={() => handleBlur("email")}
                  aria-invalid={Boolean(emailValidationError)}
                  autoComplete="email"
                  disabled={isEmailVerified}
                  required
                />
              </div>

              {!isEmailVerified && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || otpCountdown > 0 || !formData.email}
                  className="fy-send-code-btn"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13" /></svg>
                  <span>{sendBtnLabel}</span>
                </button>
              )}
            </div>

            {touched.email && !formData.email && (
              <span className="fy-field-err">Valid email address is required</span>
            )}
            {emailValidationError && (
              <span className="fy-field-err" role="alert">{emailValidationError}</span>
            )}
          </div>

          {/* OTP Verification Input */}
          {otpSent && !isEmailVerified && (
            <div className="fy-otp-box">
              <label className="fy-otp-label" htmlFor="otp">
                Enter Email Verification Code (OTP) <span className="fy-req">*</span>
              </label>
              <div className="fy-otp-row">
                <input
                  ref={otpInputRef}
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="fy-input fy-otp-input"
                  placeholder="6-digit code"
                  value={formData.otp}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="fy-verify-btn"
                  onClick={handleVerifyOtp}
                  disabled={verifyingOtp || !formData.otp}
                >
                  {verifyingOtp ? "Verifying..." : "Verify OTP"}
                </button>
              </div>
              <div className="fy-otp-meta">
                <span className="fy-otp-hint">
                  Code sent to <strong>{formData.email}</strong>
                </span>
                {otpCountdown === 0 && (
                  <button type="button" className="fy-resend-link" onClick={handleSendOtp}>
                    Resend Code
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Password */}
          <div className="fy-field">
            <label className="fy-label" htmlFor="password">
              Password <span className="fy-req">*</span>
            </label>
            <PasswordField
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={() => handleBlur("password")}
              placeholder="Create a secure password"
              show={showPassword}
              onToggle={() => setShowPassword((s) => !s)}
              hasError={touched.password && !isPasswordValid}
            />

            {/* Password strength checklist */}
            {formData.password.length > 0 && (
              <div className="fy-pw-rules">
                <div className={`fy-rule ${pwRules.length ? "met" : ""}`}>
                  <span className="fy-rule-dot">{pwRules.length ? <IcoCheck /> : "•"}</span>
                  <span>8+ characters</span>
                </div>
                <div className={`fy-rule ${pwRules.upperAndLower ? "met" : ""}`}>
                  <span className="fy-rule-dot">{pwRules.upperAndLower ? <IcoCheck /> : "•"}</span>
                  <span>Upper &amp; lowercase</span>
                </div>
                <div className={`fy-rule ${pwRules.number ? "met" : ""}`}>
                  <span className="fy-rule-dot">{pwRules.number ? <IcoCheck /> : "•"}</span>
                  <span>One number</span>
                </div>
                <div className={`fy-rule ${pwRules.special ? "met" : ""}`}>
                  <span className="fy-rule-dot">{pwRules.special ? <IcoCheck /> : "•"}</span>
                  <span>One special character</span>
                </div>
                <div className={`fy-rule ${pwRules.noSpaces ? "met" : ""}`}>
                  <span className="fy-rule-dot">{pwRules.noSpaces ? <IcoCheck /> : "•"}</span>
                  <span>No spaces</span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="fy-field">
            <label className="fy-label" htmlFor="confirmPassword">
              Confirm Password <span className="fy-req">*</span>
            </label>
            <PasswordField
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={() => handleBlur("confirmPassword")}
              placeholder="Re-type your password"
              show={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((s) => !s)}
              hasError={touched.confirmPassword && !isConfirmMatching}
            />

            {formData.confirmPassword.length > 0 && (
              <span className={`fy-match-indicator ${isConfirmMatching ? "match" : "mismatch"}`}>
                {isConfirmMatching ? "✓ Passwords match" : "✗ Passwords do not match"}
              </span>
            )}
          </div>

          {/* Create Account Submit Button */}
          <button
            type="submit"
            className="fy-btn-submit"
            disabled={loading || !isEmailVerified || !isPasswordValid || !isConfirmMatching}
          >
            {!loading && <svg className="fy-submit-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>}
            {loading ? (
              <span className="fy-spinner-wrapper">
                <span className="fy-spinner" />
                <span>Creating Account...</span>
              </span>
            ) : !isEmailVerified ? (
              <span>Verify Email to Create Account</span>
            ) : (
              <span>Create Account</span>
            )}
            {!loading && <svg className="fy-submit-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7" /></svg>}
          </button>
        </form>

        <footer className="fy-card-footer">
          <p className="fy-terms-text">
            By clicking "Create Account", you agree to the{" "}
            <Link to="/terms">Terms of Use</Link> and{" "}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default FirstYearAccount;
