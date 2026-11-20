import { NextResponse, type NextRequest } from "next/server";
import { getCorsHeaders, handleCorsPreflight, isOriginAllowed } from "@/lib/api/cors";

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");

  // Tangani seluruh HTTP OPTIONS preflight request untuk /api/**
  if (request.method === "OPTIONS") {
    return handleCorsPreflight(request);
  }

  const response = NextResponse.next();

  // Sematkan header CORS pada response /api/** jika origin valid
  if (origin && isOriginAllowed(origin)) {
    const corsHeaders = getCorsHeaders(origin);
    for (const [key, value] of Object.entries(corsHeaders)) {
      if (typeof value === "string") {
        response.headers.set(key, value);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
