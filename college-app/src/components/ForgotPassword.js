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

const ForgotPassword = function() {
  const [step, setStep] = useState("email");
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  const OtpModal = OtpVerification;

  if (step === "otp") {
    return React.createElement(OtpModal, {
      email: identifier,
      onVerified: handleOtpVerified,
      onClose: function() { navigate(-1); },
    });
  }

  const isEmailStep = step === "email";
  const buttonDisabled = isEmailStep
    ? loading || !identifier.trim()
    : loading || !newPassword || !confirmPassword;

  return (
    <div style={styles.page}>
      <main style={styles.card}>
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

        <h1 style={styles.title}>
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
            <input
              type="password"
              value={newPassword}
              onChange={function(e) { setNewPassword(e.target.value); }}
              placeholder="Enter new password"
              required
              disabled={loading}
              autoComplete="new-password"
              style={styles.input}
            />

            <label style={styles.label}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={function(e) { setConfirmPassword(e.target.value); }}
              placeholder="Confirm your new password"
              required
              disabled={loading}
              autoComplete="new-password"
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
              {loading ? "Resetting Password..." : "Reset Password"}
            </button>
          </form>
        )}

        <button type="button" onClick={goToSignIn} style={styles.link}>
          {"<- Back to Sign In"}
        </button>
      </main>
    </div>
  );
};

export default ForgotPassword;
