import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireOwner } from "@/lib/auth/guard";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { recordAuditLog } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/client-ip";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";
import { updateCategorySchema } from "@/lib/validators/category";
import { isValidUuid } from "@/lib/validators/uuid";

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
    if (!isValidUuid(id)) {
      return NextResponse.json(
        { success: false, error: "Format ID kategori tidak valid", code: "INVALID_UUID" },
        { status: 400, headers: corsHeaders }
      );
    }

    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Kategori tidak ditemukan", code: "NOT_FOUND" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true, data: category }, { status: 200, headers: corsHeaders });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Autentikasi diperlukan", code: "UNAUTHORIZED" },
        { status: 401, headers: corsHeaders }
      );
    }
    console.error("[Category Detail GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil detail kategori", code: "INTERNAL_SERVER_ERROR" },
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
    if (!isValidUuid(id)) {
      return NextResponse.json(
        { success: false, error: "Format ID kategori tidak valid", code: "INVALID_UUID" },
        { status: 400, headers: corsHeaders }
      );
    }

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
    const parseResult = updateCategorySchema.safeParse(rawBody);

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

    const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Kategori tidak ditemukan", code: "NOT_FOUND" },
        { status: 404, headers: corsHeaders }
      );
    }

    const updateData: Partial<typeof categories.$inferInsert> = {};
    if (parseResult.data.name !== undefined) updateData.name = parseResult.data.name;
    if (parseResult.data.slug !== undefined) updateData.slug = parseResult.data.slug;
    if (parseResult.data.sortOrder !== undefined) updateData.sortOrder = parseResult.data.sortOrder;
    if (parseResult.data.isActive !== undefined) updateData.isActive = parseResult.data.isActive;

    const [updated] = await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, id))
      .returning();

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    await recordAuditLog({
      userId: session.userId,
      action: "CATEGORY_UPDATE",
      entityType: "category",
      entityId: id,
      platform: session.platform,
      ipAddress,
      userAgent,
      metadata: { before: existing, after: updated },
    });

    return NextResponse.json(
      { success: true, message: "Kategori berhasil diperbarui", data: updated },
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
          { success: false, error: "Hanya Owner yang berhak mengelola kategori", code: "FORBIDDEN" },
          { status: 403, headers: corsHeaders }
        );
      }
      if (error.message.includes("unique") || error.message.includes("duplicate")) {
        return NextResponse.json(
          { success: false, error: "Nama atau slug kategori sudah digunakan", code: "CATEGORY_EXISTS" },
          { status: 409, headers: corsHeaders }
        );
      }
    }
    console.error("[Category Detail PATCH Error]:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui kategori", code: "INTERNAL_SERVER_ERROR" },
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
    if (!isValidUuid(id)) {
      return NextResponse.json(
        { success: false, error: "Format ID kategori tidak valid", code: "INVALID_UUID" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (session.platform === "WEB") {
      const isOriginValid = validateCsrfOrigin(request);
      if (!isOriginValid) {
        return NextResponse.json(
          { success: false, error: "Origin CSRF tidak valid", code: "CSRF_ORIGIN_INVALID" },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Kategori tidak ditemukan", code: "NOT_FOUND" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Cek apakah ada produk aktif yang memakai kategori ini
    const [usedByProduct] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.categoryId, id))
      .limit(1);

    if (usedByProduct) {
      return NextResponse.json(
        {
          success: false,
          error: "Kategori tidak dapat dihapus karena masih digunakan oleh produk aktif",
          code: "CATEGORY_IN_USE",
        },
        { status: 409, headers: corsHeaders }
      );
    }

    await db.delete(categories).where(eq(categories.id, id));

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    await recordAuditLog({
      userId: session.userId,
      action: "CATEGORY_DELETE",
      entityType: "category",
      entityId: id,
      platform: session.platform,
      ipAddress,
      userAgent,
      metadata: { deletedName: existing.name },
    });

    return NextResponse.json(
      { success: true, message: "Kategori berhasil dihapus" },
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
          { success: false, error: "Hanya Owner yang berhak menghapus kategori", code: "FORBIDDEN" },
          { status: 403, headers: corsHeaders }
        );
      }
    }
    console.error("[Category Detail DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus kategori", code: "INTERNAL_SERVER_ERROR" },
      { status: 500, headers: corsHeaders }
    );
  }
}
