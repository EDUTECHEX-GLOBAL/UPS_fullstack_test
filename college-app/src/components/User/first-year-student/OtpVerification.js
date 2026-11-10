import React, { useState } from "react";
import axiosInstance from '../api/axiosInstance';
import "./OtpVerification.css";



const OtpVerification = ({ email, onVerified, onClose, onResend, isFirstYear = true }) => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!otp) {
      return setMessage({ type: "error", text: "Please enter the OTP sent to your email." });
    }

    try {
      setLoading(true);
      const response = await axiosInstance.post(
        isFirstYear ? "/api/students/verify-otp" : "/api/transfer/forgot-password/verify-otp",
        { [isFirstYear ? "email" : "username"]: email, otp }
      );

      setLoading(false);
      setMessage({ type: "success", text: response.data.message });
      onVerified();
    } catch (error) {
      setLoading(false);
      console.error("❌ OTP verification failed:", error);
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Failed to verify OTP. Please check and try again.",
      });
    }
  };

  const handleResend = async () => {
    if (!onResend || resending) return;
    setResending(true);
    setMessage({ type: "", text: "" });
    try {
      const successMessage = await onResend();
      setOtp("");
      setMessage({ type: "success", text: successMessage });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || error.message || "Failed to resend OTP. Please try again.",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="otp-modal">
        <h3 className="modal-title">Verify Your Email</h3>
        <p className="modal-message">
          We’ve sent a 6-digit OTP to your email: <b>{email}</b>
        </p>

        {message.text && (
          <div className={`alert ${message.type === "error" ? "alert-error" : "alert-success"}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="otp-input"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <div className="modal-actions">
            <button type="button" className="modal-btn secondary" onClick={onClose} disabled={loading || resending}>
              Cancel
            </button>
            <button type="submit" className="modal-btn primary" disabled={loading || resending}>
              {loading ? "Verifying..." : "Verify"}
            </button>
          </div>
          <button
            type="button"
            className="otp-resend-button"
            onClick={handleResend}
            disabled={resending || loading}
          >
            {resending ? "Sending new OTP..." : "Resend OTP"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OtpVerification;
