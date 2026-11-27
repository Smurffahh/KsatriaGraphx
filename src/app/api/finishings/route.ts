import { NextResponse } from "next/server";
import { db } from "@/db";
import { finishings } from "@/db/schema";
import { requireAuth, requireOwner } from "@/lib/auth/guard";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { recordAuditLog } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/client-ip";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";
import { createFinishingSchema } from "@/lib/validators/finishing";
import { redactFinishingForRole } from "@/lib/security/cost-redaction";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const session = await requireAuth(request);

    const rows = await db
      .select()
      .from(finishings)
      .orderBy(asc(finishings.name));

    const data = rows.map((row) => redactFinishingForRole(row, session.role));

    return NextResponse.json({ success: true, data }, { status: 200, headers: corsHeaders });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Autentikasi diperlukan", code: "UNAUTHORIZED" },
        { status: 401, headers: corsHeaders }
      );
    }
    console.error("[Finishings GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil daftar finishing", code: "INTERNAL_SERVER_ERROR" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const session = await requireOwner(request);

    if (session.platform === "WEB") {
      const isOriginValid = validateCsrfOrigin(request);
      if (!isOriginValid) {
        return NextResponse.json(
          { success: false, error: "Origin CSRF tidak valid", code: "CSRF_ORIGIN_INVALID" },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    const rawBody = await request.json();
    const parseResult = createFinishingSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validasi data gagal",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const { name, chargeType, productionPrice, defaultPrice, unitLabel, isActive } = parseResult.data;

    const [newFinishing] = await db
      .insert(finishings)
      .values({
        name,
        chargeType,
        productionPrice,
        defaultPrice,
        unitLabel,
        isActive,
      })
      .returning();

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    await recordAuditLog({
      userId: session.userId,
      action: "FINISHING_CREATE",
      entityType: "finishing",
      entityId: newFinishing.id,
      platform: session.platform,
      ipAddress,
      userAgent,
      metadata: { name: newFinishing.name, defaultPrice: newFinishing.defaultPrice },
    });

    return NextResponse.json(
      { success: true, message: "Finishing berhasil ditambahkan", data: newFinishing },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { success: false, error: "Autentikasi diperlukan", code: "UNAUTHORIZED" },
          { status: 401, headers: corsHeaders }
        );
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { success: false, error: "Hanya Owner yang berhak mengelola finishing", code: "FORBIDDEN" },
          { status: 403, headers: corsHeaders }
        );
      }
    }
    console.error("[Finishings POST Error]:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan finishing baru", code: "INTERNAL_SERVER_ERROR" },
      { status: 500, headers: corsHeaders }
    );
  }
}
