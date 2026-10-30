import React, { useState } from "react";
import axiosInstance from '../api/axiosInstance';
import "./OtpVerification.css";



const OtpVerification = ({ email, onVerified, onClose }) => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!otp) {
      return setMessage({ type: "error", text: "Please enter the OTP sent to your email." });
    }

    try {
      setLoading(true);
    const response = await axiosInstance.post('/api/students/verify-otp', {
  email,
  otp,
});

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
            <button type="button" className="modal-btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-btn primary" disabled={loading}>
              {loading ? "Verifying..." : "Verify"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OtpVerification;
