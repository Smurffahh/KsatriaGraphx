export function getAppWebOrigin(): string {
  const raw = process.env.APP_WEB_ORIGIN || "http://localhost:3000";
  return raw.trim().replace(/\/+$/, "");
}

export function validateCsrfOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const expectedOrigin = getAppWebOrigin();

  let candidateOrigin: string | null = null;
  if (origin) {
    candidateOrigin = origin.trim().replace(/\/+$/, "");
  } else if (referer) {
    try {
      candidateOrigin = new URL(referer).origin.replace(/\/+$/, "");
    } catch {
      return false;
    }
  }

  if (!candidateOrigin) {
    return false;
  }

  // Tolak keras origin APK Capacitor pada CSRF & Web Guard
  if (
    candidateOrigin === "capacitor://localhost" ||
    candidateOrigin === "https://localhost"
  ) {
    return false;
  }

  // Strict match terhadap APP_WEB_ORIGIN (BUKAN terhadap ALLOWED_ORIGINS)
  if (candidateOrigin === expectedOrigin) {
    return true;
  }

  // Khusus dev environment: izinkan localhost jika APP_WEB_ORIGIN di dev
  const isDev = process.env.NODE_ENV !== "production";
  if (
    isDev &&
    (candidateOrigin.startsWith("http://localhost:") ||
      candidateOrigin.startsWith("http://127.0.0.1:"))
  ) {
    return true;
  }

  return false;
}
