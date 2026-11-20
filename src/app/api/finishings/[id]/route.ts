import { NextResponse } from "next/server";
import { db } from "@/db";
import { finishings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireOwner } from "@/lib/auth/guard";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { recordAuditLog } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/client-ip";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";
import { updateFinishingSchema } from "@/lib/validators/finishing";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    await requireAuth(request);
    const { id } = await params;

    const [finishing] = await db
      .select()
      .from(finishings)
      .where(eq(finishings.id, id))
      .limit(1);

    if (!finishing) {
      return NextResponse.json(
        { success: false, error: "Finishing tidak ditemukan", code: "NOT_FOUND" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true, data: finishing }, { status: 200, headers: corsHeaders });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Autentikasi diperlukan", code: "UNAUTHORIZED" },
        { status: 401, headers: corsHeaders }
      );
    }
    console.error("[Finishing Detail GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil detail finishing", code: "INTERNAL_SERVER_ERROR" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const session = await requireOwner(request);
    const { id } = await params;

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
    const parseResult = updateFinishingSchema.safeParse(rawBody);

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

    const [existing] = await db.select().from(finishings).where(eq(finishings.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Finishing tidak ditemukan", code: "NOT_FOUND" },
        { status: 404, headers: corsHeaders }
      );
    }

    const updateData: Partial<typeof finishings.$inferInsert> = {};
    if (parseResult.data.name !== undefined) updateData.name = parseResult.data.name;
    if (parseResult.data.chargeType !== undefined) updateData.chargeType = parseResult.data.chargeType;
    if (parseResult.data.defaultPrice !== undefined) updateData.defaultPrice = parseResult.data.defaultPrice;
    if (parseResult.data.unitLabel !== undefined) updateData.unitLabel = parseResult.data.unitLabel;
    if (parseResult.data.isActive !== undefined) updateData.isActive = parseResult.data.isActive;

    const [updated] = await db
      .update(finishings)
      .set(updateData)
      .where(eq(finishings.id, id))
      .returning();

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    await recordAuditLog({
      userId: session.userId,
      action: "FINISHING_UPDATE",
      entityType: "finishing",
      entityId: id,
      platform: session.platform,
      ipAddress,
      userAgent,
      metadata: { before: existing, after: updated },
    });

    return NextResponse.json(
      { success: true, message: "Finishing berhasil diperbarui", data: updated },
      { status: 200, headers: corsHeaders }
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
    console.error("[Finishing Detail PATCH Error]:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui finishing", code: "INTERNAL_SERVER_ERROR" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const session = await requireOwner(request);
    const { id } = await params;

    if (session.platform === "WEB") {
      const isOriginValid = validateCsrfOrigin(request);
      if (!isOriginValid) {
        return NextResponse.json(
          { success: false, error: "Origin CSRF tidak valid", code: "CSRF_ORIGIN_INVALID" },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    const [existing] = await db.select().from(finishings).where(eq(finishings.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Finishing tidak ditemukan", code: "NOT_FOUND" },
        { status: 404, headers: corsHeaders }
      );
    }

    await db.delete(finishings).where(eq(finishings.id, id));

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    await recordAuditLog({
      userId: session.userId,
      action: "FINISHING_DELETE",
      entityType: "finishing",
      entityId: id,
      platform: session.platform,
      ipAddress,
      userAgent,
      metadata: { deletedName: existing.name },
    });

    return NextResponse.json(
      { success: true, message: "Finishing berhasil dihapus" },
      { status: 200, headers: corsHeaders }
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
          { success: false, error: "Hanya Owner yang berhak menghapus finishing", code: "FORBIDDEN" },
          { status: 403, headers: corsHeaders }
        );
      }
    }
    console.error("[Finishing Detail DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus finishing", code: "INTERNAL_SERVER_ERROR" },
      { status: 500, headers: corsHeaders }
    );
  }
}
