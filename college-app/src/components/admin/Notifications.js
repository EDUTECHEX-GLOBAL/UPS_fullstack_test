// src/components/admin/Notifications.js
import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./Notifications.css";
import API_BASE_URL from "../../config/api";
const Notifications = ({ fullView = false, onUnreadCountChange }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(fullView);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  
  const adminToken = localStorage.getItem("adminToken");

  const fetchUnreadCount = useCallback(async () => {
    if (!adminToken) {
      setError("Authentication required");
      return;
    }

    try {
      const res = await axios.get(`${API_BASE_URL}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const unread = res.data?.count ?? res.data?.unreadCount ?? 0;
      setUnreadCount(unread);
      onUnreadCountChange?.(unread);
    } catch (err) {
      console.error("Failed to fetch unread notifications count:", err);
      setError(err.response?.data?.message || "Failed to load notification count");
    }
  }, [adminToken, onUnreadCountChange]);

  const fetchNotifications = useCallback(async () => {
    if (!adminToken) {
      setError("Authentication required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const list = res.data?.data || [];
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(list);

      const unread = list.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
      onUnreadCountChange?.(unread);
    } catch (err) {
      console.error("Failed to fetch admin notifications:", err);
      setError(err.response?.data?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [adminToken, onUnreadCountChange]);

  useEffect(() => {
    const fetchForMode = fullView ? fetchNotifications : fetchUnreadCount;
    fetchForMode();

    const interval = setInterval(() => {
      if (!document.hidden) fetchForMode();
    }, 30000);

    const handleVisibilityChange = () => {
      if (!document.hidden) fetchForMode();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fullView, fetchNotifications, fetchUnreadCount]);

  useEffect(() => {
    if (!fullView && open && notifications.length === 0) {
      fetchNotifications();
    }
  }, [fullView, open, notifications.length, fetchNotifications]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const markAsRead = async (id) => {
    const originalNotifications = [...notifications];
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(prev - 1, 0));
    onUnreadCountChange?.((prev) => Math.max(prev - 1, 0));

    try {
      await axios.post(
        `${API_BASE_URL}/api/notifications/mark-read`,
        { notificationId: id },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
    } catch {
      setNotifications(originalNotifications);
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    const originalNotifications = [...notifications];
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    const previousUnread = unreadCount;
    setUnreadCount(0);
    onUnreadCountChange?.(0);

    try {
      await axios.post(
        `${API_BASE_URL}/api/notifications/mark-all-read`,
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
    } catch {
      setNotifications(originalNotifications);
      setUnreadCount(previousUnread);
      onUnreadCountChange?.(previousUnread);
    }
  };

  const deleteNotification = async (id) => {
    const originalNotifications = [...notifications];
    const notificationToDelete = notifications.find((n) => n._id === id);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    if (!notificationToDelete?.isRead) {
      setUnreadCount((prev) => Math.max(prev - 1, 0));
      onUnreadCountChange?.((prev) => Math.max(prev - 1, 0));
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    } catch {
      setNotifications(originalNotifications);
      if (!notificationToDelete?.isRead) {
        setUnreadCount((prev) => prev + 1);
        onUnreadCountChange?.((prev) => prev + 1);
      }
    }
  };

  const getNotificationIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "warning":
      case "alert":
        return <span className="notification-icon warning">⚠️</span>;
      case "success":
        return <span className="notification-icon success">✅</span>;
      case "info":
      default:
        return <span className="notification-icon info">ℹ️</span>;
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now - notificationDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return notificationDate.toLocaleDateString();
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case "unread": return notifications.filter((n) => !n.isRead);
      case "read":   return notifications.filter((n) => n.isRead);
      default:       return notifications;
    }
  };

  const filteredNotifications = getFilteredNotifications();

  // ── Full Panel View ──────────────────────────────────────────────────────
  if (fullView) {
    return (
      <div className="notifications-full-view">
        <div className="notifications-full-header">
          <div className="notifications-full-title">
            <span className="title-bell">🔔</span>
            <h2>Notifications</h2>
            {unreadCount > 0 && (
              <span className="unread-counter">{unreadCount} unread</span>
            )}
          </div>

          <div className="header-actions">
            <div className="filter-tabs">
              {["all", "unread", "read"].map((f) => (
                <button
                  key={f}
                  className={`filter-btn ${filter === f ? "active" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === "unread" && unreadCount > 0 && (
                    <span className="filter-count">{unreadCount}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="header-btn-group">
              <button
                className="icon-btn"
                onClick={fetchNotifications}
                disabled={loading}
                title="Refresh"
              >
                <span className={loading ? "spinning" : ""}>↻</span>
              </button>
              <button
                className="mark-all-read-btn"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                <span className="mark-all-icon">✓</span>
                <span className="mark-all-label">Mark all read</span>
              </button>
            </div>
          </div>
        </div>

        <div className="notifications-list">
          {loading && (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading notifications…</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <p>{error}</p>
              <button onClick={fetchNotifications} className="retry-btn">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && filteredNotifications.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🔔</div>
              <p>No notifications found</p>
              {filter !== "all" && (
                <button
                  className="clear-filter-btn"
                  onClick={() => setFilter("all")}
                >
                  Clear filter
                </button>
              )}
            </div>
          )}

          {!loading &&
            !error &&
            filteredNotifications.map((n) => (
              <div
                key={n._id}
                className={`notification-card ${n.isRead ? "read" : "unread"}`}
              >
                <div className="notification-main">
                  {getNotificationIcon(n.type)}
                  <div className="notification-content">
                    <p className="notification-message">{n.message}</p>
                    <div className="notification-meta">
                      <span className="notification-time">
                        {formatTime(n.createdAt)}
                      </span>
                      {n.type && (
                        <span className={`notification-type ${n.type.toLowerCase()}`}>
                          {n.type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="notification-actions">
                  {!n.isRead && (
                    <button
                      className="action-btn read-btn"
                      onClick={() => markAsRead(n._id)}
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    className="action-btn delete-btn"
                    onClick={() => deleteNotification(n._id)}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }

  // ── Navbar / Dropdown View ───────────────────────────────────────────────
  return (
    <div className="notifications-navbar">
      <button
        className="bell-container"
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      >
        <div className="bell-icon">
          🔔
          {unreadCount > 0 && (
            <span className="badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
          )}
        </div>
      </button>

      {open && (
        <>
          <div className="dropdown-backdrop" onClick={() => setOpen(false)} />
          <div className="notifications-dropdown">
            <div className="dropdown-header">
              <h3>Notifications</h3>
              <div className="dropdown-actions">
                <button
                  className="icon-btn small"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  title="Mark all as read"
                >
                  ✓
                </button>
                <button
                  className="icon-btn small"
                  onClick={() => setOpen(false)}
                  title="Close"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="dropdown-content">
              {loading && (
                <div className="dropdown-loading">
                  <span className="spinner-small spinning">↻</span>
                  <span>Loading…</span>
                </div>
              )}

              {error && (
                <div className="dropdown-error">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {!loading && !error && notifications.length === 0 && (
                <div className="dropdown-empty">
                  <div className="empty-icon-small">🔔</div>
                  <p>No notifications yet</p>
                </div>
              )}

              {!loading &&
                !error &&
                notifications.slice(0, 5).map((n) => (
                  <div
                    key={n._id}
                    className={`notification-item ${n.isRead ? "read" : "unread"}`}
                    onClick={() => !n.isRead && markAsRead(n._id)}
                  >
                    <div className="item-icon">{getNotificationIcon(n.type)}</div>
                    <div className="item-content">
                      <p className="item-message">{n.message}</p>
                      <div className="item-meta">
                        <span className="item-time">{formatTime(n.createdAt)}</span>
                        {!n.isRead && <span className="unread-dot" />}
                      </div>
                    </div>
                    <button
                      className="item-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n._id);
                      }}
                      aria-label="Delete notification"
                    >
                      ×
                    </button>
                  </div>
                ))}
            </div>

            {notifications.length > 5 && (
              <div className="dropdown-footer">
                <Link to="/admin-dashboard/notifications" className="view-all-link" onClick={() => setOpen(false)}>
                  View all notifications →
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Notifications;
