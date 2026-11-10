import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import OtpVerification from "./User/first-year-student/OtpVerification";
import EdutechLogo from "../assets/Edutech-logo.svg";
import "./SignIn.css";

const brand = {
  navy: "#263b8f",
  teal: "#0891b2",
  tealDark: "#0e7490",
  ink: "#0f172a",
  muted: "#64748b",
  border: "#dbe7f3",
  panel: "#ffffff",
  page: "#d7e2f5",
};

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background:
      "radial-gradient(circle at 50% 34%, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0) 34%), #c8d5eb",
    boxSizing: "border-box",
    fontFamily: "'Poppins', 'Inter', sans-serif",
  },
  card: {
    position: "relative",
    width: "100%",
    maxWidth: "520px",
    background: brand.panel,
    border: "1px solid rgba(219, 231, 243, 0.95)",
    borderRadius: "18px",
    boxShadow: "0 24px 60px rgba(38, 59, 143, 0.18)",
    padding: "34px",
    boxSizing: "border-box",
  },
  close: {
    position: "absolute",
    top: "18px",
    right: "18px",
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    border: "1px solid #dbe7f3",
    background: "#f8fafc",
    color: "#64748b",
    fontSize: "22px",
    lineHeight: "1",
    cursor: "pointer",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "24px",
  },
  logo: {
    width: "194px",
    maxWidth: "58%",
    height: "auto",
    display: "block",
  },
  title: {
    margin: "0 48px 8px 0",
    color: brand.ink,
    fontSize: "30px",
    lineHeight: "1.15",
    fontWeight: "800",
    letterSpacing: "0",
  },
  subtitle: {
    margin: "0 0 26px",
    color: brand.muted,
    fontSize: "14px",
    lineHeight: "1.6",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    color: "#334155",
    fontWeight: "700",
    fontSize: "14px",
  },
  input: {
    width: "100%",
    padding: "15px 16px",
    borderRadius: "12px",
    border: "1.5px solid #d8e3f0",
    outline: "none",
    color: brand.ink,
    fontSize: "15px",
    boxSizing: "border-box",
    background: "#ffffff",
    marginBottom: "18px",
  },
  primaryButton: {
    width: "100%",
    padding: "15px 24px",
    border: "none",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #0891b2 0%, #0e7490 100%)",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(8, 145, 178, 0.22)",
  },
  disabledButton: {
    opacity: 0.65,
    cursor: "not-allowed",
    boxShadow: "none",
  },
  link: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    marginTop: "22px",
    border: "none",
    background: "transparent",
    color: brand.teal,
    fontWeight: "700",
    fontSize: "14px",
    cursor: "pointer",
    padding: 0,
  },
  error: {
    background: "#fff1f2",
    color: "#be123c",
    border: "1px solid #fecdd3",
    borderRadius: "12px",
    padding: "12px 14px",
    marginBottom: "16px",
    fontSize: "14px",
    fontWeight: "600",
  },
  success: {
    background: "rgba(8, 145, 178, 0.08)",
    color: brand.tealDark,
    border: "1px solid rgba(8, 145, 178, 0.2)",
    borderRadius: "12px",
    padding: "12px 14px",
    marginBottom: "16px",
    fontSize: "14px",
    fontWeight: "600",
  },
};

const PasswordVisibilityButton = function({ visible, onClick, label }) {
  return (
    <button
      type="button"
      className="forgot-password-visibility-toggle"
      onClick={onClick}
      aria-label={visible ? `Hide ${label}` : `Show ${label}`}
      aria-pressed={visible}
    >
      <svg
        aria-hidden="true"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {visible ? (
          <>
            <path d="M3 3L21 21" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
            <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.2 9.5 6-.4.8-1.2 1.9-2.4 3" />
            <path d="M6.2 6.2C4.2 7.5 2.9 9.4 2.5 11c.5 1.1 3.6 7 9.5 7 1 0 1.9-.2 2.7-.5" />
          </>
        ) : (
          <>
            <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
            <circle cx="12" cy="12" r="3" />
          </>
        )}
      </svg>
    </button>
  );
};

const ForgotPassword = function() {
  const [step, setStep] = useState("email");
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const isFirstYear = location.pathname.includes("firstyear");
  const identifierLabel = isFirstYear ? "Email" : "Username";
  const apiPrefix = isFirstYear ? "students" : "transfer";
  const studentTypeLabel = isFirstYear ? "First-Year" : "Transfer";

  const goToSignIn = function() {
    navigate("/sign-in");
  };

  const handleSendOtp = async function(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await axiosInstance.post(
        "/api/" + apiPrefix + "/forgot-password/request-otp",
        { [isFirstYear ? "email" : "username"]: identifier.trim() }
      );

      if (!response.data?.success) {
        setError(response.data?.message || "Account not found. Please create an account first.");
        return;
      }

      setMessage(response.data.message);
      setStep("otp");
    } catch (err) {
      setError(err.response ? err.response.data.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async function(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      await axiosInstance.post(
        "/api/" + apiPrefix + "/forgot-password/reset",
        {
          [isFirstYear ? "email" : "username"]: identifier,
          password: newPassword,
          confirmPassword: confirmPassword,
        }
      );

      localStorage.removeItem("token");
      localStorage.removeItem("userData");
      localStorage.removeItem("studentType");

      navigate("/sign-in", {
        replace: true,
        state: {
          message: "Password reset successful. Please sign in with your new password.",
          type: isFirstYear ? "firstyear" : "transfer",
          identifier: identifier,
        },
      });
    } catch (err) {
      setError(err.response ? err.response.data.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerified = function() {
    setStep("password");
  };

  const handleResendOtp = async function() {
    const response = await axiosInstance.post(
      "/api/" + apiPrefix + "/forgot-password/request-otp",
      { [isFirstYear ? "email" : "username"]: identifier.trim() }
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Could not resend the OTP.");
    }
    return response.data.message || "A new OTP has been sent to your email.";
  };

  const OtpModal = OtpVerification;

  if (step === "otp") {
    return React.createElement(OtpModal, {
      email: identifier,
      isFirstYear,
      onResend: handleResendOtp,
      onVerified: handleOtpVerified,
      onClose: function() { navigate(-1); },
    });
  }

  const isEmailStep = step === "email";
  const buttonDisabled = isEmailStep
    ? loading || !identifier.trim()
    : loading || !newPassword || !confirmPassword;

  return (
    <div className="forgot-password-page" style={styles.page}>
      <main className="forgot-password-card" style={styles.card}>
        <button
          type="button"
          aria-label="Close"
          onClick={goToSignIn}
          style={styles.close}
        >
          x
        </button>

        <div style={styles.brandRow}>
          <img src={EdutechLogo} alt="EDUTECHEX" style={styles.logo} />
        </div>

        <h1 className="forgot-password-title" style={styles.title}>
          {isEmailStep ? `Reset ${studentTypeLabel} Password` : "Create New Password"}
        </h1>
        <p style={styles.subtitle}>
          {isEmailStep
            ? `Enter your ${identifierLabel.toLowerCase()} and we will send a verification OTP.`
            : "Choose a new password with at least 8 characters."}
        </p>

        {message && <div style={styles.success}>{message}</div>}
        {error && <div style={styles.error}>{error}</div>}

        {isEmailStep ? (
          <form onSubmit={handleSendOtp}>
            <label style={styles.label}>{identifierLabel}</label>
            <input
              type={isFirstYear ? "email" : "text"}
              value={identifier}
              onChange={function(e) { setIdentifier(e.target.value); }}
              placeholder={`Enter your ${identifierLabel.toLowerCase()}`}
              required
              disabled={loading}
              autoComplete="off"
              style={styles.input}
            />
            <button
              type="submit"
              disabled={buttonDisabled}
              style={{
                ...styles.primaryButton,
                ...(buttonDisabled ? styles.disabledButton : {}),
              }}
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <label style={styles.label}>New Password</label>
            <div className="forgot-password-input-wrap">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={function(e) { setNewPassword(e.target.value); }}
                placeholder="Enter new password"
                required
                disabled={loading}
                autoComplete="new-password"
                style={styles.input}
              />
              <PasswordVisibilityButton
                visible={showNewPassword}
                onClick={() => setShowNewPassword((visible) => !visible)}
                label="new password"
              />
            </div>

            <label style={styles.label}>Confirm Password</label>
            <div className="forgot-password-input-wrap">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={function(e) { setConfirmPassword(e.target.value); }}
                placeholder="Confirm your new password"
                required
                disabled={loading}
                autoComplete="new-password"
                style={styles.input}
              />
              <PasswordVisibilityButton
                visible={showConfirmPassword}
                onClick={() => setShowConfirmPassword((visible) => !visible)}
                label="confirmed password"
              />
            </div>

            <button
              type="submit"
              disabled={buttonDisabled}
              style={{
                ...styles.primaryButton,
                ...(buttonDisabled ? styles.disabledButton : {}),
              }}
            >
              {loading ? "Resetting Password..." : "Reset Password"}
            </button>
          </form>
        )}

        <button type="button" onClick={goToSignIn} style={styles.link}>
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: "block", flex: "0 0 auto" }}
          >
            <path
              d="M19 12H5M5 12L11 18M5 12L11 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Back to Sign In</span>
        </button>
      </main>
    </div>
  );
};

export default ForgotPassword;
