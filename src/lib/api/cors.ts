import { NextResponse } from "next/server";

export function parseAllowedOrigins(rawOrigins?: string | null): string[] {
  if (!rawOrigins) return [];

  return rawOrigins
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter((o) => o.length > 0 && o !== "*");
}

export function getAllowedOrigins(): string[] {
  const parsedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

  const fallbackWebOrigin = process.env.APP_WEB_ORIGIN
    ? process.env.APP_WEB_ORIGIN.trim().replace(/\/+$/, "")
    : null;

  const defaults = [
    fallbackWebOrigin,
    "https://ksatriagraphx.vercel.app",
    "http://localhost:3000",
    "https://localhost",
    "capacitor://localhost",
  ].filter((o): o is string => Boolean(o && o !== "*"));

  const list = parsedOrigins.length > 0 ? parsedOrigins : defaults;
  return Array.from(new Set(list));
}

export function isOriginAllowed(requestOrigin?: string | null): boolean {
  if (!requestOrigin) return false;
  const cleanOrigin = requestOrigin.trim().replace(/\/+$/, "");

  // Tolak keras wildcard atau string kosong
  if (cleanOrigin === "*" || !cleanOrigin) return false;

  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.includes(cleanOrigin)) {
    return true;
  }

  // Khusus dev environment: izinkan localhost port berapapun
  const isDev = process.env.NODE_ENV !== "production";
  if (
    isDev &&
    (cleanOrigin.startsWith("http://localhost:") ||
      cleanOrigin.startsWith("http://127.0.0.1:"))
  ) {
    return true;
  }

  return false;
}

export function getCorsHeaders(requestOrigin?: string | null): HeadersInit {
  const allowed = isOriginAllowed(requestOrigin);

  if (!allowed || !requestOrigin) {
    return {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Platform",
    };
  }

  const cleanOrigin = requestOrigin.trim().replace(/\/+$/, "");

  return {
    "Access-Control-Allow-Origin": cleanOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Platform",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

export function handleCorsPreflight(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = isOriginAllowed(origin);

  return new NextResponse(null, {
    status: allowed ? 204 : 403,
    headers: getCorsHeaders(origin),
  });
}
