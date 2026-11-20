import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { userSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashRefreshToken } from "@/lib/auth/jwt";
import { recordAuditLog } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/client-ip";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";
import { getSession } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

const logoutSchema = z
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
    const session = await getSession(request);

    const cookieStore = await cookies();
    const cookieRefreshToken = cookieStore.get("kgx_refresh_token")?.value;

    let targetRefreshToken = cookieRefreshToken;

    if (!targetRefreshToken) {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const rawBody = await request.json().catch(() => ({}));
        const parsed = logoutSchema.safeParse(rawBody);
        if (parsed.success && parsed.data.refreshToken) {
          targetRefreshToken = parsed.data.refreshToken;
        }
      }
    }

    if (targetRefreshToken) {
      const tokenHash = hashRefreshToken(targetRefreshToken);
      const [foundSession] = await db
        .select({ id: userSessions.id, userId: userSessions.userId, platform: userSessions.platform })
        .from(userSessions)
        .where(eq(userSessions.refreshTokenHash, tokenHash))
        .limit(1);

      if (foundSession) {
        await db
          .update(userSessions)
          .set({ revokedAt: new Date() })
          .where(eq(userSessions.id, foundSession.id));

        await recordAuditLog({
          userId: foundSession.userId,
          action: "AUTH_LOGOUT",
          entityType: "USER_SESSION",
          entityId: foundSession.id,
          platform: foundSession.platform,
          ipAddress,
          userAgent,
        });
      }
    } else if (session) {
      await recordAuditLog({
        userId: session.userId,
        action: "AUTH_LOGOUT",
        entityType: "USER",
        entityId: session.userId,
        platform: session.platform,
        ipAddress,
        userAgent,
      });
    }

    cookieStore.delete("kgx_access_token");
    cookieStore.delete("kgx_refresh_token");

    return NextResponse.json(
      { success: true, message: "Logout berhasil" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Logout route error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal pada server" },
      { status: 500, headers: corsHeaders }
    );
  }
}
