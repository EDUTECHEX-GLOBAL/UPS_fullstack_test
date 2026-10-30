export const DEFAULT_API_BASE_URL = "https://college-backend-render-u2g5.onrender.com";
export const LOCAL_API_BASE_URL = "http://localhost:5000";

const isLocalBrowser = () => {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
};

export const resolveApiBaseUrl = (value = process.env.REACT_APP_API_BASE_URL) => {
  const normalized = String(value || "").trim();

  if (!normalized || normalized === "undefined" || normalized === "null") {
    return isLocalBrowser() ? LOCAL_API_BASE_URL : DEFAULT_API_BASE_URL;
  }

  return normalized.replace(/\/+$/, "");
};

const API_BASE_URL = resolveApiBaseUrl();

export default API_BASE_URL;
