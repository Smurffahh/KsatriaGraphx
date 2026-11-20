import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireAuth, requireOwner } from "@/lib/auth/guard";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { recordAuditLog } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/client-ip";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";
import { createCategorySchema } from "@/lib/validators/category";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    await requireAuth(request);

    const data = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        sortOrder: categories.sortOrder,
        isActive: categories.isActive,
        createdAt: categories.createdAt,
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.name));

    return NextResponse.json({ success: true, data }, { status: 200, headers: corsHeaders });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Autentikasi diperlukan", code: "UNAUTHORIZED" },
        { status: 401, headers: corsHeaders }
      );
    }
    console.error("[Categories GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil daftar kategori", code: "INTERNAL_SERVER_ERROR" },
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
    const parseResult = createCategorySchema.safeParse(rawBody);

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

    const { name, sortOrder, isActive } = parseResult.data;
    let slug = parseResult.data.slug;
    if (!slug) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }

    const [newCategory] = await db
      .insert(categories)
      .values({
        name,
        slug,
        sortOrder,
        isActive,
      })
      .returning();

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    await recordAuditLog({
      userId: session.userId,
      action: "CATEGORY_CREATE",
      entityType: "category",
      entityId: newCategory.id,
      platform: session.platform,
      ipAddress,
      userAgent,
      metadata: { name: newCategory.name, slug: newCategory.slug },
    });

    return NextResponse.json(
      { success: true, message: "Kategori berhasil dibuat", data: newCategory },
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
          { success: false, error: "Hanya Owner yang berhak mengelola kategori", code: "FORBIDDEN" },
          { status: 403, headers: corsHeaders }
        );
      }
      // Unique constraint violation
      if (error.message.includes("unique") || error.message.includes("duplicate")) {
        return NextResponse.json(
          { success: false, error: "Nama atau slug kategori sudah digunakan", code: "CATEGORY_EXISTS" },
          { status: 409, headers: corsHeaders }
        );
      }
    }
    console.error("[Categories POST Error]:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan kategori baru", code: "INTERNAL_SERVER_ERROR" },
      { status: 500, headers: corsHeaders }
    );
  }
}
