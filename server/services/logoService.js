// services/logoService.js

// Extract clean domain name from WEBADDR
export function extractDomain(url) {
  if (!url) return "";
  if (!url.startsWith("http")) url = "http://" + url;

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Return a REAL logo via Google's favicon service
export function getGoogleFavicon(webaddr) {
  const domain = extractDomain(webaddr);

  if (!domain) {
    return getFallbackLogo();
  }

  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

// Fallback image
export function getFallbackLogo() {
  return "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg";
}
