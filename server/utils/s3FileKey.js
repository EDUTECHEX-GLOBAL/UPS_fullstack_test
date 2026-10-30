const safeDecodeURIComponent = (value = "") => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const resolveS3FileKey = (fileKey = "") => {
  if (!fileKey) return "";

  let resolvedKey = safeDecodeURIComponent(fileKey.toString().trim());
  resolvedKey = resolvedKey.replace(/\\/g, "/");

  if (/^https?:\/\//i.test(resolvedKey)) {
    try {
      resolvedKey = new URL(resolvedKey).pathname;
    } catch {
      return "";
    }
  }

  resolvedKey = safeDecodeURIComponent(resolvedKey);
  const uploadsIndex = resolvedKey.lastIndexOf("/uploads/");
  if (uploadsIndex !== -1) {
    resolvedKey = resolvedKey.slice(uploadsIndex + "/uploads/".length);
  }

  resolvedKey = resolvedKey.replace(/^\/+/, "");
  resolvedKey = resolvedKey.replace(/^api\/files\//, "");
  resolvedKey = resolvedKey.replace(/^uploads\//, "");
  resolvedKey = resolvedKey.replace(/\/{2,}/g, "/");

  return resolvedKey;
};

export const encodeFileKey = (key = "") =>
  resolveS3FileKey(key).split("/").map(encodeURIComponent).join("/");

export const buildFileUrl = (fileKey = "") => {
  const resolvedKey = resolveS3FileKey(fileKey);
  const fileUrl = resolvedKey ? `/api/files/${encodeFileKey(resolvedKey)}` : "";

  if (process.env.NODE_ENV === "development") {
    console.log("[s3FileKey] buildFileUrl", {
      input: fileKey,
      fileKey: resolvedKey,
      fileUrl,
    });
  }

  return fileUrl;
};

export const isS3NoSuchKeyError = (err) =>
  err?.name === "NoSuchKey" ||
  err?.Code === "NoSuchKey" ||
  err?.code === "NoSuchKey" ||
  err?.$metadata?.httpStatusCode === 404;
