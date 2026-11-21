import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, categories, productPriceTiers } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAuth, requireOwner } from "@/lib/auth/guard";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { recordAuditLog } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/client-ip";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";
import {
  updateProductSchema,
  validatePriceTiers,
  formatZodError,
} from "@/lib/validators/product";
import { deleteProductImage } from "@/lib/storage/blob";

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

    const [product] = await db
      .select({
        id: products.id,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        sku: products.sku,
        name: products.name,
        description: products.description,
        imageUrl: products.imageUrl,
        imageKey: products.imageKey,
        pricingType: products.pricingType,
        unitLabel: products.unitLabel,
        basePrice: products.basePrice,
        minArea: products.minArea,
        areaRounding: products.areaRounding,
        isActive: products.isActive,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, id))
      .limit(1);

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Produk tidak ditemukan", code: "NOT_FOUND" },
        { status: 404, headers: corsHeaders }
      );
    }

    const tiers = await db
      .select()
      .from(productPriceTiers)
      .where(eq(productPriceTiers.productId, id))
      .orderBy(asc(productPriceTiers.minQty));

    const data = {
      ...product,
      minArea: product.minArea ? Number(product.minArea) : 1.0,
      priceTiers: tiers,
    };

    return NextResponse.json({ success: true, data }, { status: 200, headers: corsHeaders });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Autentikasi diperlukan", code: "UNAUTHORIZED" },
        { status: 401, headers: corsHeaders }
      );
    }
    console.error("[Product Detail GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil detail produk", code: "INTERNAL_SERVER_ERROR" },
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
    const parseResult = updateProductSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errorMsg = formatZodError(parseResult.error);
      return NextResponse.json(
        {
          success: false,
          error: `Validasi gagal: ${errorMsg}`,
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const payload = parseResult.data;

    // Ambil data produk lama
    const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Produk tidak ditemukan", code: "NOT_FOUND" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Validasi anti-overlap tiers jika disediakan
    if (payload.tiers) {
      const currentPricingType = payload.pricingType || existing.pricingType;
      if (currentPricingType === "UNIT" && payload.tiers.length > 0) {
        const tierValidation = validatePriceTiers(payload.tiers);
        if (!tierValidation.isValid) {
          return NextResponse.json(
            {
              success: false,
              error: tierValidation.error || "Rentang harga bertingkat tidak valid",
              code: "TIER_OVERLAP",
            },
            { status: 400, headers: corsHeaders }
          );
        }
      }
    }

    // Jika categoryId diubah, pastikan kategori baru ada
    if (payload.categoryId && payload.categoryId !== existing.categoryId) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, payload.categoryId))
        .limit(1);

      if (!cat) {
        return NextResponse.json(
          { success: false, error: "Kategori baru tidak ditemukan", code: "CATEGORY_NOT_FOUND" },
          { status: 404, headers: corsHeaders }
        );
      }
    }

    const updateData: Partial<typeof products.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (payload.categoryId !== undefined) updateData.categoryId = payload.categoryId;
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.sku !== undefined) updateData.sku = payload.sku || null;
    if (payload.description !== undefined) updateData.description = payload.description || null;
    if (payload.imageUrl !== undefined) updateData.imageUrl = payload.imageUrl || null;
    if (payload.imageKey !== undefined) updateData.imageKey = payload.imageKey || null;
    if (payload.pricingType !== undefined) updateData.pricingType = payload.pricingType;
    if (payload.unitLabel !== undefined) updateData.unitLabel = payload.unitLabel;
    if (payload.basePrice !== undefined) updateData.basePrice = payload.basePrice;
    if (payload.minArea !== undefined) updateData.minArea = String(payload.minArea);
    if (payload.areaRounding !== undefined) updateData.areaRounding = payload.areaRounding;
    if (payload.isActive !== undefined) updateData.isActive = payload.isActive;

    // Transaksi atomik update produk + price tiers
    const updated = await db.transaction(async (tx) => {
      const [prod] = await tx
        .update(products)
        .set(updateData)
        .where(eq(products.id, id))
        .returning();

      let currentTiers: (typeof productPriceTiers.$inferSelect)[] = [];

      if (payload.tiers !== undefined) {
        // Hapus tiers lama
        await tx.delete(productPriceTiers).where(eq(productPriceTiers.productId, id));

        const targetPricingType = payload.pricingType || existing.pricingType;
        if (targetPricingType === "UNIT" && payload.tiers.length > 0) {
          currentTiers = await tx
            .insert(productPriceTiers)
            .values(
              payload.tiers.map((t) => ({
                productId: id,
                minQty: t.minQty,
                maxQty: t.maxQty !== undefined ? t.maxQty : null,
                unitPrice: t.unitPrice,
              }))
            )
            .returning();
        }
      } else {
        currentTiers = await tx
          .select()
          .from(productPriceTiers)
          .where(eq(productPriceTiers.productId, id))
          .orderBy(asc(productPriceTiers.minQty));
      }

      return {
        ...prod,
        minArea: Number(prod.minArea),
        priceTiers: currentTiers,
      };
    });

    // Auto-cleanup Vercel Blob: jika gambar lama diganti atau dikosongkan
    if (
      existing.imageUrl &&
      payload.imageUrl !== undefined &&
      payload.imageUrl !== existing.imageUrl
    ) {
      await deleteProductImage(existing.imageUrl);
    }

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    await recordAuditLog({
      userId: session.userId,
      action: "PRODUCT_UPDATE",
      entityType: "product",
      entityId: id,
      platform: session.platform,
      ipAddress,
      userAgent,
      metadata: { before: existing, after: updated },
    });

    return NextResponse.json(
      { success: true, message: "Produk berhasil diperbarui", data: updated },
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
          { success: false, error: "Hanya Owner yang berhak mengelola produk", code: "FORBIDDEN" },
          { status: 403, headers: corsHeaders }
        );
      }
      if (error.message.includes("sku") && error.message.includes("unique")) {
        return NextResponse.json(
          { success: false, error: "SKU produk sudah digunakan", code: "SKU_EXISTS" },
          { status: 409, headers: corsHeaders }
        );
      }
    }
    console.error("[Product Detail PATCH Error]:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui produk", code: "INTERNAL_SERVER_ERROR" },
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

    const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Produk tidak ditemukan", code: "NOT_FOUND" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Auto-cleanup file foto di Vercel Blob jika ada
    if (existing.imageUrl) {
      await deleteProductImage(existing.imageUrl);
    }

    await db.delete(products).where(eq(products.id, id));

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    await recordAuditLog({
      userId: session.userId,
      action: "PRODUCT_DELETE",
      entityType: "product",
      entityId: id,
      platform: session.platform,
      ipAddress,
      userAgent,
      metadata: { deletedName: existing.name, deletedSku: existing.sku },
    });

    return NextResponse.json(
      { success: true, message: "Produk berhasil dihapus" },
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
          { success: false, error: "Hanya Owner yang berhak menghapus produk", code: "FORBIDDEN" },
          { status: 403, headers: corsHeaders }
        );
      }
    }
    console.error("[Product Detail DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus produk", code: "INTERNAL_SERVER_ERROR" },
      { status: 500, headers: corsHeaders }
    );
  }
}
