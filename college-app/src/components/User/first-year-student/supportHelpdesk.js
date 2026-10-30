const pathToTitle = (path = "") => {
  const last = String(path || "")
    .split("?")[0]
    .split("/")
    .filter(Boolean)
    .pop();

  return last
    ? last.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
    : "Application";
};

export const openSupportHelpdesk = (sourceTitle) => {
  const sourcePath = `${window.location.pathname}${window.location.search || ""}`;
  const resolvedTitle = sourceTitle || document.title || pathToTitle(sourcePath);

  sessionStorage.setItem("helpdeskSourcePath", sourcePath);
  sessionStorage.setItem("helpdeskSourceTitle", resolvedTitle);

  const params = new URLSearchParams({
    sourcePath,
    sourceTitle: resolvedTitle,
  });

  window.open(`/helpdesk?${params.toString()}`, "_blank", "noopener,noreferrer");
};

