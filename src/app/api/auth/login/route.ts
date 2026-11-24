import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";
import { recordAuditLog } from "@/lib/security/audit";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";
import type { ClientPlatform } from "@/types";

export const dynamic = "force-dynamic";

const loginSchema = z
  .object({
    usernameOrEmail: z.string().min(1, "Username atau email wajib diisi"),
    password: z.string().min(1, "Password wajib diisi"),
    deviceName: z.string().optional(),
  })
  .strict();

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const rawBody = await request.json();
    const parseResult = loginSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Format input tidak valid",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const { usernameOrEmail, password, deviceName } = parseResult.data;
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    const clientPlatformHeader =
      request.headers.get("x-client-platform") || request.headers.get("X-Client-Platform");
    const platform: ClientPlatform =
      clientPlatformHeader?.toLowerCase() === "apk" ? "APK" : "WEB";

    const rateLimitKey = `login:${ipAddress}:${usernameOrEmail.toLowerCase().trim()}`;
    const rateLimit = await checkRateLimit(rateLimitKey, 5, 900);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Terlalu banyak percobaan login gagal. Silakan coba lagi beberapa saat lagi.",
        },
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Retry-After": String(rateLimit.retryAfterSec || 900),
          },
        }
      );
    }

    const identifier = usernameOrEmail.trim();
    const [targetUser] = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        passwordHash: users.passwordHash,
        role: users.role,
        isActive: users.isActive,
        tokenVersion: users.tokenVersion,
        failedLoginAttempts: users.failedLoginAttempts,
        lockedUntil: users.lockedUntil,
      })
      .from(users)
      .where(or(eq(users.username, identifier), eq(users.email, identifier)))
      .limit(1);

    if (!targetUser) {
      // Anti-Timing Attack: Lakukan dummy verifyPassword agar waktu eksekusi konstan dengan kasus user ditemukan
      await verifyPassword(
        password,
        "$2a$12$e80y6fQ2W8O7cW9xZ8sFauN9q4tWbE.d0vS0b5eH2f5l3J8h1yqGK"
      );
      return NextResponse.json(
        { success: false, error: "Username atau password salah" },
        { status: 401, headers: corsHeaders }
      );
    }

    if (!targetUser.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Akun Anda dinonaktifkan. Silakan hubungi pemilik usaha.",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    const now = new Date();
    if (targetUser.lockedUntil && targetUser.lockedUntil > now) {
      const waitMin = Math.ceil((targetUser.lockedUntil.getTime() - now.getTime()) / 60000);
      return NextResponse.json(
        {
          success: false,
          error: `Akun terkunci sementara karena 5 kali percobaan login gagal. Silakan tunggu sekitar ${waitMin} menit lagi.`,
        },
        { status: 403, headers: corsHeaders }
      );
    }

    const isPasswordValid = await verifyPassword(password, targetUser.passwordHash);

    if (!isPasswordValid) {
      const updatedAttempts = targetUser.failedLoginAttempts + 1;
      const isNowLocked = updatedAttempts >= 5;
      const lockUntil = isNowLocked ? new Date(now.getTime() + 15 * 60 * 1000) : null;

      await db
        .update(users)
        .set({
          failedLoginAttempts: updatedAttempts,
          lockedUntil: lockUntil,
          updatedAt: now,
        })
        .where(eq(users.id, targetUser.id));

      await recordAuditLog({
        userId: targetUser.id,
        action: isNowLocked ? "AUTH_ACCOUNT_LOCKED" : "AUTH_LOGIN_FAILED",
        entityType: "USER",
        entityId: targetUser.id,
        platform,
        ipAddress,
        userAgent,
        metadata: {
          failedAttempts: updatedAttempts,
          isLocked: isNowLocked,
        },
      });

      return NextResponse.json(
        { success: false, error: "Username atau password salah" },
        { status: 401, headers: corsHeaders }
      );
    }

    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: now,
      })
      .where(eq(users.id, targetUser.id));

    const session = await createSession({
      userId: targetUser.id,
      role: targetUser.role,
      platform,
      tokenVersion: targetUser.tokenVersion,
      deviceName: deviceName || null,
      ipAddress,
      userAgent,
    });

    await recordAuditLog({
      userId: targetUser.id,
      action: "AUTH_LOGIN_SUCCESS",
      entityType: "USER_SESSION",
      entityId: session.sessionId,
      platform,
      ipAddress,
      userAgent,
    });

    const isProduction = process.env.NODE_ENV === "production";

    if (platform === "WEB") {
      const cookieStore = await cookies();

      cookieStore.set("kgx_access_token", session.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
      });

      cookieStore.set("kgx_refresh_token", session.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Login berhasil",
          data: {
            user: {
              id: targetUser.id,
              name: targetUser.name,
              username: targetUser.username,
              role: targetUser.role,
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
        message: "Login berhasil",
        data: {
          user: {
            id: targetUser.id,
            name: targetUser.name,
            username: targetUser.username,
            role: targetUser.role,
            platform: "APK",
          },
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt.toISOString(),
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal pada server" },
      { status: 500, headers: corsHeaders }
    );
  }
}
