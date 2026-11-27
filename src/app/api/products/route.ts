import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, categories, productPriceTiers, vendors } from "@/db/schema";
import { eq, and, ilike, or, asc, sql } from "drizzle-orm";
import { requireAuth, requireOwner } from "@/lib/auth/guard";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { recordAuditLog } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/client-ip";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";
import {
  createProductSchema,
  validatePriceTiers,
  formatZodError,
} from "@/lib/validators/product";
import { redactProductForRole } from "@/lib/security/cost-redaction";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const session = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() || "";
    const categoryId = searchParams.get("categoryId")?.trim() || "";
    const pricingType = searchParams.get("pricingType")?.trim() || "";
    const includeInactive = searchParams.get("includeInactive") === "true";

    const conditions = [];

    // Filter status aktif (Kasir selalu hanya melihat produk aktif)
    if (!includeInactive || session.role !== "OWNER") {
      conditions.push(eq(products.isActive, true));
    }

    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    if (pricingType && ["AREA", "UNIT", "CUSTOM"].includes(pricingType)) {
      conditions.push(eq(products.pricingType, pricingType as "AREA" | "UNIT" | "CUSTOM"));
    }

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(products.name, searchPattern),
          ilike(products.sku, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Ambil produk beserta nama kategori & vendor default
    const productRows = await db
      .select({
        id: products.id,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        defaultVendorId: products.defaultVendorId,
        defaultVendorName: vendors.name,
        defaultVendorWhatsapp: vendors.whatsapp,
        defaultVendorIsActive: vendors.isActive,
        sku: products.sku,
        name: products.name,
        description: products.description,
        imageUrl: products.imageUrl,
        imageKey: products.imageKey,
        pricingType: products.pricingType,
        unitLabel: products.unitLabel,
        productionPrice: products.productionPrice,
        basePrice: products.basePrice,
        minArea: products.minArea,
        areaRounding: products.areaRounding,
        isActive: products.isActive,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(vendors, eq(products.defaultVendorId, vendors.id))
      .where(whereClause)
      .orderBy(asc(products.name));

    // Ambil price tiers untuk produk yang ditemukan
    const productIds = productRows.map((p) => p.id);
    let allTiers: (typeof productPriceTiers.$inferSelect)[] = [];

    if (productIds.length > 0) {
      allTiers = await db
        .select()
        .from(productPriceTiers)
        .where(
          sql`${productPriceTiers.productId} IN (${sql.join(
            productIds.map((id) => sql`${id}::uuid`),
            sql`, `
          )})`
        )
        .orderBy(asc(productPriceTiers.minQty));
    }

    // Pasangkan tiers ke masing-masing produk
    const tiersByProductId = new Map<string, typeof allTiers>();
    for (const tier of allTiers) {
      const list = tiersByProductId.get(tier.productId) || [];
      list.push(tier);
      tiersByProductId.set(tier.productId, list);
    }

    const data = productRows.map((p) => {
      const {
        defaultVendorName,
        defaultVendorWhatsapp,
        defaultVendorIsActive,
        ...rest
      } = p;
      const defaultVendor =
        p.defaultVendorId && defaultVendorName
          ? {
              id: p.defaultVendorId,
              name: defaultVendorName,
              whatsapp: defaultVendorWhatsapp || "",
              isActive: defaultVendorIsActive ?? true,
            }
          : null;

      return redactProductForRole(
        {
          ...rest,
          defaultVendor,
          minArea: p.minArea ? Number(p.minArea) : 1.0,
          priceTiers: tiersByProductId.get(p.id) || [],
        },
        session.role
      );
    });

    return NextResponse.json({ success: true, data }, { status: 200, headers: corsHeaders });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Autentikasi diperlukan", code: "UNAUTHORIZED" },
        { status: 401, headers: corsHeaders }
      );
    }
    console.error("[Products GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil katalog produk", code: "INTERNAL_SERVER_ERROR" },
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
    const parseResult = createProductSchema.safeParse(rawBody);

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

    // Validasi anti-overlap tiers jika tipe harga UNIT
    if (payload.pricingType === "UNIT" && payload.tiers && payload.tiers.length > 0) {
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

    // Pastikan kategori ada
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, payload.categoryId))
      .limit(1);

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Kategori yang dipilih tidak ditemukan", code: "CATEGORY_NOT_FOUND" },
        { status: 404, headers: corsHeaders }
      );
    }

    let linkedVendor: { id: string; name: string; whatsapp: string; isActive: boolean } | null = null;
    if (payload.defaultVendorId) {
      const [vendor] = await db
        .select({
          id: vendors.id,
          name: vendors.name,
          whatsapp: vendors.whatsapp,
          isActive: vendors.isActive,
        })
        .from(vendors)
        .where(eq(vendors.id, payload.defaultVendorId))
        .limit(1);

      if (!vendor) {
        return NextResponse.json(
          { success: false, error: "Vendor default yang dipilih tidak ditemukan", code: "VENDOR_NOT_FOUND" },
          { status: 404, headers: corsHeaders }
        );
      }
      linkedVendor = vendor;
    }

    // Transaksi atomik insert produk + price tiers
    const created = await db.transaction(async (tx) => {
      const [newProduct] = await tx
        .insert(products)
        .values({
          categoryId: payload.categoryId,
          defaultVendorId: payload.defaultVendorId ?? null,
          sku: payload.sku || null,
          name: payload.name,
          description: payload.description || null,
          imageUrl: payload.imageUrl || null,
          imageKey: payload.imageKey || null,
          pricingType: payload.pricingType,
          unitLabel: payload.unitLabel,
          productionPrice: payload.productionPrice,
          basePrice: payload.basePrice,
          minArea: payload.minArea ? String(payload.minArea) : "1.00",
          areaRounding: payload.areaRounding,
          isActive: payload.isActive,
        })
        .returning();

      let insertedTiers: (typeof productPriceTiers.$inferSelect)[] = [];

      if (payload.pricingType === "UNIT" && payload.tiers && payload.tiers.length > 0) {
        insertedTiers = await tx
          .insert(productPriceTiers)
          .values(
            payload.tiers.map((t) => ({
              productId: newProduct.id,
              minQty: t.minQty,
              maxQty: t.maxQty !== undefined ? t.maxQty : null,
              productionPrice: t.productionPrice ?? null,
              unitPrice: t.unitPrice,
            }))
          )
          .returning();
      }

      return {
        ...newProduct,
        defaultVendor: linkedVendor,
        minArea: Number(newProduct.minArea),
        priceTiers: insertedTiers,
      };
    });

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    await recordAuditLog({
      userId: session.userId,
      action: "PRODUCT_CREATE",
      entityType: "product",
      entityId: created.id,
      platform: session.platform,
      ipAddress,
      userAgent,
      metadata: { name: created.name, sku: created.sku, pricingType: created.pricingType },
    });

    return NextResponse.json(
      { success: true, message: "Produk berhasil ditambahkan", data: created },
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
    console.error("[Products POST Error]:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan produk baru", code: "INTERNAL_SERVER_ERROR" },
      { status: 500, headers: corsHeaders }
    );
  }
}
