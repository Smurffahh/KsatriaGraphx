import { NextResponse } from "next/server";

function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : [];

  const defaults = [
    process.env.APP_WEB_ORIGIN,
    process.env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000",
    "https://localhost",
    "capacitor://localhost",
  ].filter(Boolean) as string[];

  return Array.from(new Set([...defaults, ...envOrigins]));
}

export function getCorsHeaders(requestOrigin?: string | null): HeadersInit {
  const allowedOrigins = getAllowedOrigins();

  const isExplicitlyAllowed =
    requestOrigin &&
    (allowedOrigins.includes(requestOrigin) ||
      requestOrigin.startsWith("http://localhost:") ||
      requestOrigin.startsWith("http://127.0.0.1:"));

  const matchedOrigin = isExplicitlyAllowed ? requestOrigin : allowedOrigins[0] || "http://localhost:3000";

  return {
    "Access-Control-Allow-Origin": matchedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Platform",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function handleCorsPreflight(request: Request) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}
