import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/client-ip";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";
import { requireAuth } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const session = await requireAuth(request);
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    await revokeAllUserSessions(session.userId, "USER_INITIATED_LOGOUT_ALL");

    await recordAuditLog({
      userId: session.userId,
      action: "AUTH_LOGOUT_ALL",
      entityType: "USER",
      entityId: session.userId,
      platform: session.platform,
      ipAddress,
      userAgent,
      metadata: {
        message: "Pengguna secara manual memutuskan semua sesi yang aktif di semua perangkat.",
      },
    });

    const cookieStore = await cookies();
    cookieStore.delete("kgx_access_token");
    cookieStore.delete("kgx_refresh_token");

    return NextResponse.json(
      { success: true, message: "Semua sesi berhasil diputus. Silakan login kembali." },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Sesi tidak valid atau telah kedaluwarsa" },
        { status: 401, headers: corsHeaders }
      );
    }

    console.error("Logout-all route error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal pada server" },
      { status: 500, headers: corsHeaders }
    );
  }
}
