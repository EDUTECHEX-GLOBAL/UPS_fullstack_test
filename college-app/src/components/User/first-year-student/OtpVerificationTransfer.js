import React, { useState, useEffect } from "react";
import axios from "axios";
import "./OtpVerificationTransfer.css";

const API_URL = process.env.REACT_APP_API_BASE_URL;

const OtpVerificationTransfer = ({ 
  email, 
  onVerified, 
  onClose,
  mode = "password-reset", // "password-reset" or "email-verification"
  title = "Verify OTP",
  onSuccessMessage = "Verification successful!"
}) => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [resendLoading, setResendLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Initialize resend timer
  useEffect(() => {
    if (email) {
      setCanResend(false);
      setResendTimer(mode === "password-reset" ? 60 : 30);
    }
  }, [email, mode]);

  // ⏱️ Resend Timer Effect
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (resendTimer === 0 && !canResend) {
      setCanResend(true);
    }
  }, [resendTimer, canResend]);

  // ✅ ALL 4 ENDPOINTS HANDLED HERE:
  const getEndpoints = () => {
    if (mode === "password-reset") {
      return {
        verifyEndpoint: `${API_URL}/api/transfer/forgot-password/verify-otp`,
        resendEndpoint: `${API_URL}/api/transfer/forgot-password/request-otp`,
        requestBody: { username: email }
      };
    } else {
      // email-verification mode
      return {
        verifyEndpoint: `${API_URL}/api/transfer/verify-otp`,
        resendEndpoint: `${API_URL}/api/transfer/send-otp`,
        requestBody: { username: email }
      };
    }
  };
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!otp) {
      return setMessage({ 
        type: "error", 
        text: "❌ Please enter the OTP sent to your email." 
      });
    }

    if (otp.length < 6) {
      return setMessage({ 
        type: "error", 
        text: "❌ OTP must be 6 digits." 
      });
    }

    try {
      setLoading(true);
      const endpoints = getEndpoints();
      
      console.log(`🔐 ${mode === "password-reset" ? "Password Reset" : "Email Verification"} OTP Verification for:`, email);
      console.log("🔢 OTP:", otp);
      console.log("🔗 Endpoint:", endpoints.verifyEndpoint);
      console.log("📦 Request Body:", { ...endpoints.requestBody, otp });

      // ✅ USING CORRECT ENDPOINT BASED ON MODE
      const response = await axios.post(
        endpoints.verifyEndpoint, 
        {
          ...endpoints.requestBody,
          otp
        }, 
        {
          timeout: 10000,
          headers: {
            "Content-Type": "application/json",
          }
        }
      );

      console.log(`✅ ${mode === "password-reset" ? "Password Reset" : "Email"} OTP Verification successful:`, response.data);

      setLoading(false);
      setMessage({ 
        type: "success", 
        text: "✅ " + (response.data.message || onSuccessMessage)
      });

      setTimeout(() => {
        onVerified(response.data);
      }, 1500);
    } catch (error) {
      setLoading(false);
      console.error(`❌ ${mode === "password-reset" ? "Password reset" : "Email verification"} OTP verification failed:`, error);
      console.error("Error status:", error.response?.status);
      console.error("Error data:", error.response?.data);
      console.error("Error message:", error.message);

      let errorMessage = "Failed to verify OTP. Please try again.";

      if (error.response) {
        errorMessage = error.response.data?.message || `Error: ${error.response.status}`;
        
        if (error.response.status === 400) {
          errorMessage = mode === "password-reset" 
            ? "Invalid or expired OTP. Please request a new one." 
            : "Invalid OTP or email. Please try again.";
        } else if (error.response.status === 404) {
          errorMessage = mode === "password-reset" 
            ? "User not found. Please check your email/username." 
            : "Email not found in our system.";
        }
      } else if (error.request) {
        errorMessage = "No response from server. Please check your connection.";
      } else {
        errorMessage = error.message;
      }

      setMessage({
        type: "error",
        text: "❌ " + errorMessage,
      });
    }
  };

  const handleResendOTP = async () => {
    setMessage({ type: "", text: "" });

    try {
      setResendLoading(true);
      const endpoints = getEndpoints();

      console.log(`🔄 Resending ${mode === "password-reset" ? "Password Reset" : "Email Verification"} OTP for:`, email);
      console.log("🔗 Endpoint:", endpoints.resendEndpoint);
      console.log("📦 Request Body:", endpoints.requestBody);

      // ✅ USING CORRECT ENDPOINT BASED ON MODE
      const response = await axios.post(
        endpoints.resendEndpoint,
        endpoints.requestBody,
        {
          timeout: 10000,
          headers: {
            "Content-Type": "application/json",
          }
        }
      );

      console.log(`✅ ${mode === "password-reset" ? "Password Reset" : "Email Verification"} OTP Resent:`, response.data);

      setResendLoading(false);
      setOtp("");
      setCanResend(false);
      setResendTimer(mode === "password-reset" ? 60 : 30);

      setMessage({
        type: "success",
        text: `✅ New OTP sent to ${mode === "password-reset" ? "your email" : email}!`,
      });
    } catch (error) {
      setResendLoading(false);
      console.error(`❌ Error resending ${mode} OTP:`, error);

      let errorMessage = "Failed to resend OTP. Please try again.";

      if (error.response) {
        errorMessage = error.response.data?.message || `Error: ${error.response.status}`;
        
        if (error.response.status === 429) {
          errorMessage = "Too many requests. Please wait before trying again.";
        }
      } else if (error.request) {
        errorMessage = "No response from server. Please check your connection.";
      } else {
        errorMessage = error.message;
      }

      setMessage({
        type: "error",
        text: "❌ " + errorMessage,
      });
    }
  };

  const getModeSpecificText = () => {
    if (mode === "password-reset") {
      return {
        title: "Verify Password Reset",
        message: `We've sent a 6-digit OTP to your email for password reset:`,
        placeholder: "Enter 6-digit OTP",
        buttonText: "Verify OTP",
        hint: "Enter the 6-digit code for password reset"
      };
    } else {
      return {
        title: "Verify Your Email",
        message: `We've sent a 6-digit OTP to verify your email:`,
        placeholder: "Enter 6-digit OTP",
        buttonText: "Verify OTP",
        hint: "Enter the 6-digit code to verify your email"
      };
    }
  };

  const modeText = getModeSpecificText();

  return (
    <div className="modal-overlay">
      <div className="otp-modal">
        <button 
          className="modal-close-btn" 
          onClick={onClose}
          title="Close"
          disabled={loading}
        >
          ✕
        </button>

        <div className="otp-header">
          <h3 className="modal-title">{title || modeText.title}</h3>
        </div>

        <p className="modal-message">
          {modeText.message} <b>{email}</b>
        </p>

        {message.text && (
          <div 
            className={`alert ${message.type === "error" ? "alert-error" : "alert-success"}`}
            role="alert"
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="otp-input-group">
            <input
              type="text"
              className="otp-input"
              placeholder={modeText.placeholder}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength="6"
              disabled={loading}
              autoComplete="off"
              autoFocus
            />
            <small className="hint-text">
              {modeText.hint}
            </small>
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="modal-btn secondary" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="modal-btn primary" 
              disabled={loading || !otp || otp.length < 6}
            >
              {loading ? "Verifying..." : modeText.buttonText}
            </button>
          </div>
        </form>

        <div className="resend-section">
          <p className="resend-text">Didn't receive the OTP?</p>
          <button
            type="button"
            className="resend-btn"
            onClick={handleResendOTP}
            disabled={!canResend || resendLoading}
          >
            {resendLoading ? (
              "Sending..."
            ) : canResend ? (
              "Resend OTP"
            ) : (
              `Resend in ${resendTimer}s`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OtpVerificationTransfer;