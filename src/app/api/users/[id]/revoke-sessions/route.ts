import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { assertWebOwnerOnly, handleGuardError } from "@/lib/auth/guard";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { isValidUuid } from "@/lib/validators/uuid";
import { recordAuditLog } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/client-ip";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";

export const dynamic = "force-dynamic";

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
    if (!isValidUuid(id)) {
      return NextResponse.json(
        { success: false, error: "Format ID pengguna tidak valid" },
        { status: 400, headers: corsHeaders }
      );
    }
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

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

    await revokeAllUserSessions(targetUser.id, "REVOKED_BY_OWNER");

    await recordAuditLog({
      userId: session.userId,
      action: "USER_SESSIONS_REVOKED",
      entityType: "USER",
      entityId: targetUser.id,
      platform: "WEB",
      ipAddress,
      userAgent,
      metadata: {
        targetUsername: targetUser.username,
        note: "Seluruh sesi aktif diputus oleh Owner.",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Seluruh sesi aktif pengguna target telah diputus seketika",
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

    console.error("POST /api/users/[id]/revoke-sessions error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal pada server" },
      { status: 500, headers: corsHeaders }
    );
  }
}
