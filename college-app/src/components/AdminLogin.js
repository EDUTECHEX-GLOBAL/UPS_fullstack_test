import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminLogin.css";
import loginIllustration from "../assets/login-illustration.png";
import axios from "axios";
import API_BASE_URL from "../config/api";
const AdminLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (!formData.email.includes("@")) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminData");
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminRole");
    delete axios.defaults.headers.common["Authorization"];

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/login`,
        {
          email: formData.email.trim(),
          password: formData.password.trim(),
        },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );

      if (response.data.success) {
        const { token, admin } = response.data;
        localStorage.setItem("adminToken", token);
        localStorage.setItem("adminData", JSON.stringify(admin));
        localStorage.setItem("adminLoggedIn", "true");
        localStorage.setItem("adminEmail", admin.email);
        localStorage.setItem("adminName", admin.name);
        localStorage.setItem("adminRole", admin.role);
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        navigate("/admin-dashboard");
      } else {
        setError(response.data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      if (err.response) {
        const msg = err.response.data?.message;
        if (err.response.status === 401) {
          setError(msg || "Invalid email or password");
        } else if (err.response.status === 400) {
          setError(msg || "Please check your input and try again");
        } else {
          setError(msg || "Login failed. Please try again.");
        }
      } else if (err.request) {
        setError("Cannot connect to server. Please try again later.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword((p) => !p);
  const handleBackToStudentType = () => navigate("/");

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-container">

        {/* ── Top Banner (mobile only) / Right Panel (desktop) ── */}
        <div className="admin-login-right">
          <img
            src={loginIllustration}
            alt="Admin Login Illustration"
            className="admin-login-image"
          />
          <div className="admin-login-right-text">
            <h2>Admin Dashboard Access</h2>
            <p className="admin-login-now-text">Secure Login Required</p>
          </div>
          <div className="admin-security-info">
            <p>Security Features</p>
            <ul>
              <li>Encrypted password storage</li>
              <li>Account lockout protection</li>
              <li>Secure session management</li>
              <li>Role-based access control</li>
            </ul>
          </div>
        </div>

        {/* ── Form Panel ── */}
        <div className="admin-login-left">
          <h1 className="admin-login-title">Admin Login 👋</h1>
          <p className="admin-login-subtitle">Access your admin dashboard</p>

          {error && <div className="admin-error-message">{error}</div>}

          <form className="admin-login-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="admin@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              autoComplete="username"
              required
            />

            <label htmlFor="password">Password</label>
            <div className="admin-password-container">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                autoComplete="current-password"
                required
                minLength="6"
              />
              <button
                type="button"
                className="admin-toggle-password"
                onClick={togglePasswordVisibility}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button type="submit" className="admin-btn-login" disabled={loading}>
              {loading ? "Signing In…" : "Login"}
            </button>
          </form>

          <button
            type="button"
            className="admin-forgot-password-link"
            onClick={() => navigate("/admin-forgot-password")}
            disabled={loading}
          >
            Forgot password?
          </button>

          <button
            type="button"
            className="admin-back-link"
            onClick={handleBackToStudentType}
            disabled={loading}
          >
            ← Back to Dashboard
          </button>

          <div className="admin-login-footer">
            <p>© {new Date().getFullYear()} EdutechEX. All Rights Reserved.</p>
            <p className="admin-login-tip">
              Use admin credentials provided by your system administrator.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminLogin;
