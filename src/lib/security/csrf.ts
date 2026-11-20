export function validateCsrfOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const expectedOrigin = process.env.APP_WEB_ORIGIN || "http://localhost:3000";

  const candidateOrigin = origin || (referer ? new URL(referer).origin : null);

  if (!candidateOrigin) {
    return false;
  }

  if (candidateOrigin === expectedOrigin) {
    return true;
  }

  const allowedList = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : [];

  if (allowedList.includes(candidateOrigin)) {
    return true;
  }

  const isDev = process.env.NODE_ENV !== "production";
  if (isDev && (candidateOrigin.startsWith("http://localhost:") || candidateOrigin.startsWith("http://127.0.0.1:"))) {
    return true;
  }

  return false;
}
