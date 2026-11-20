import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { rotateSession } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";
import type { ClientPlatform } from "@/types";

export const dynamic = "force-dynamic";

const refreshSchema = z
  .object({
    refreshToken: z.string().optional(),
  })
  .strict();

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    const rateLimit = await checkRateLimit(`auth:refresh:${ipAddress}`, 20, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Terlalu banyak permintaan pembaruan sesi. Silakan coba lagi sebentar lagi.",
        },
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Retry-After": String(rateLimit.retryAfterSec || 60),
          },
        }
      );
    }

    const cookieStore = await cookies();
    const cookieRefreshToken = cookieStore.get("kgx_refresh_token")?.value;

    let incomingRefreshToken = cookieRefreshToken;
    let platform: ClientPlatform = "WEB";

    if (!incomingRefreshToken) {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const rawBody = await request.json().catch(() => ({}));
        const parsed = refreshSchema.safeParse(rawBody);
        if (parsed.success && parsed.data.refreshToken) {
          incomingRefreshToken = parsed.data.refreshToken;
          platform = "APK";
        }
      }
    }

    if (!incomingRefreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan login kembali.",
        },
        { status: 401, headers: corsHeaders }
      );
    }

    const result = await rotateSession({
      refreshToken: incomingRefreshToken,
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      if (result.reason === "REUSE_DETECTED") {
        cookieStore.delete("kgx_access_token");
        cookieStore.delete("kgx_refresh_token");

        return NextResponse.json(
          {
            success: false,
            error:
              "Terdeteksi aktivitas sesi tidak wajar. Seluruh sesi akun Anda telah diputus demi keamanan. Silakan login ulang.",
          },
          { status: 403, headers: corsHeaders }
        );
      }

      cookieStore.delete("kgx_access_token");
      cookieStore.delete("kgx_refresh_token");

      return NextResponse.json(
        {
          success: false,
          error: "Sesi tidak valid atau telah kedaluwarsa. Silakan login kembali.",
        },
        { status: 401, headers: corsHeaders }
      );
    }

    const isProduction = process.env.NODE_ENV === "production";

    if (result.user.platform === "WEB" || platform === "WEB") {
      cookieStore.set("kgx_access_token", result.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
      });

      cookieStore.set("kgx_refresh_token", result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Sesi berhasil diperbarui",
          data: {
            user: {
              id: result.user.id,
              role: result.user.role,
              platform: "WEB",
            },
          },
        },
        { status: 200, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Sesi berhasil diperbarui",
        data: {
          user: {
            id: result.user.id,
            role: result.user.role,
            platform: "APK",
          },
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresAt: result.expiresAt.toISOString(),
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Refresh route error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal pada server" },
      { status: 500, headers: corsHeaders }
    );
  }
}
