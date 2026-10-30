export const API_URL =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

export const normalizeFileKey = (value = "") => {
  if (!value) return "";

  let key = value.toString().trim();
  try {
    key = decodeURIComponent(key);
  } catch {
    // Keep the original value if a manually edited key has malformed encoding.
  }
  key = key.replace(/\\/g, "/");

  if (key.startsWith("http://") || key.startsWith("https://")) {
    try {
      key = new URL(key).pathname;
    } catch {
      return "";
    }
  }

  try {
    key = decodeURIComponent(key);
  } catch {
    // Keep the parsed path as-is if decoding fails.
  }
  key = key.replace(/\\/g, "/");

  const uploadsIndex = key.lastIndexOf("/uploads/");
  if (uploadsIndex !== -1) {
    key = key.slice(uploadsIndex + "/uploads/".length);
  }

  key = key.replace(/^\/+/, "");
  key = key.replace(/^api\/files\//, "");
  key = key.replace(/^uploads\//, "");
  key = key.replace(/\/{2,}/g, "/");

  return key;
};

export const encodeFileKey = (key = "") =>
  normalizeFileKey(key).split("/").map(encodeURIComponent).join("/");

export const resolveFileUrl = (value) => {
  if (!value) return null;

  const key = normalizeFileKey(value);
  if (!key) return null;

  const apiFileUrl = `${API_URL}/api/files/${encodeFileKey(key)}`;
  if (process.env.NODE_ENV === "development") {
    console.log("[fileUrl] resolveFileUrl", {
      input: value,
      fileKey: key,
      apiFileUrl,
    });
  }

  return apiFileUrl;
};
