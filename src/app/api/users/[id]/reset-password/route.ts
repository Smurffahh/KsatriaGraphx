import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { assertWebOwnerOnly, handleGuardError } from "@/lib/auth/guard";
import { resetPasswordSchema } from "@/lib/validators/user";
import { hashPassword } from "@/lib/auth/password";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/client-ip";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function POST(request: Request, { params }: RouteParams) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const session = await assertWebOwnerOnly(request);
    const { id } = await params;
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    const rawBody = await request.json().catch(() => ({}));
    const parseResult = resetPasswordSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Format password tidak valid",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const [targetUser] = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Pengguna tidak ditemukan" },
        { status: 404, headers: corsHeaders }
      );
    }

    const newPasswordHash = await hashPassword(parseResult.data.password);

    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetUser.id));

    await revokeAllUserSessions(targetUser.id, "PASSWORD_RESET_BY_OWNER");

    await recordAuditLog({
      userId: session.userId,
      action: "USER_PASSWORD_RESET",
      entityType: "USER",
      entityId: targetUser.id,
      platform: "WEB",
      ipAddress,
      userAgent,
      metadata: {
        targetUsername: targetUser.username,
        note: "Password direset oleh Owner; semua sesi aktif target diputus seketika.",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Password berhasil direset dan seluruh sesi pengguna target telah diputus",
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    const handled = handleGuardError(error);
    if (handled.isHandled) {
      return NextResponse.json(
        { success: false, error: handled.message, code: handled.code },
        { status: handled.status, headers: corsHeaders }
      );
    }

    console.error("POST /api/users/[id]/reset-password error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal pada server" },
      { status: 500, headers: corsHeaders }
    );
  }
}
