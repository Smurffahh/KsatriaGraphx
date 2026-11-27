import { NextRequest } from "next/server";
import { and, asc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products, vendorPayments, vendors } from "@/db/schema";
import { requireOwner } from "@/lib/auth/guard";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { recordAuditLog } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/client-ip";
import { handleCorsPreflight } from "@/lib/api/cors";
import { errorResponse, handleApiError, jsonResponse } from "@/lib/api/response";
import { createVendorSchema } from "@/lib/validators/vendor";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    await requireOwner(request);
    const { searchParams } = new URL(request.url);

    const search = (searchParams.get("q") ?? searchParams.get("search") ?? "").trim();
    const isActiveParam = (searchParams.get("isActive") ?? "all").trim().toLowerCase();
    const rawLimit = parseInt(searchParams.get("limit") || "100", 10) || 100;
    const limit = Math.min(200, Math.max(1, rawLimit));

    const conditions = [];
    if (isActiveParam === "true") {
      conditions.push(eq(vendors.isActive, true));
    } else if (isActiveParam === "false") {
      conditions.push(eq(vendors.isActive, false));
    }

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(vendors.name, pattern),
          ilike(vendors.contactName, pattern),
          ilike(vendors.specialty, pattern),
          ilike(vendors.whatsapp, pattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const vendorRows = await db
      .select()
      .from(vendors)
      .where(whereClause)
      .orderBy(asc(vendors.name))
      .limit(limit);

    const [productCounts, assignedCosts, settledTotals] = await Promise.all([
      db
        .select({
          vendorId: products.defaultVendorId,
          count: sql<number>`cast(count(${products.id}) as integer)`,
        })
        .from(products)
        .groupBy(products.defaultVendorId),
      db
        .select({
          vendorId: orderItems.vendorId,
          totalCost: sql<number>`cast(coalesce(sum(${orderItems.productionSubtotal}), 0) as integer)`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(ne(orders.productionStatus, "CANCELLED"))
        .groupBy(orderItems.vendorId),
      db
        .select({
          vendorId: vendorPayments.vendorId,
          totalPaid: sql<number>`cast(coalesce(sum(${vendorPayments.amount}), 0) as integer)`,
        })
        .from(vendorPayments)
        .innerJoin(orders, eq(vendorPayments.orderId, orders.id))
        .where(ne(orders.productionStatus, "CANCELLED"))
        .groupBy(vendorPayments.vendorId),
    ]);

    const productCountMap = new Map<string, number>();
    for (const row of productCounts) {
      if (row.vendorId) productCountMap.set(row.vendorId, row.count);
    }

    const assignedCostMap = new Map<string, number>();
    for (const row of assignedCosts) {
      if (row.vendorId) assignedCostMap.set(row.vendorId, row.totalCost);
    }

    const settledMap = new Map<string, number>();
    for (const row of settledTotals) {
      if (row.vendorId) settledMap.set(row.vendorId, row.totalPaid);
    }

    const data = vendorRows.map((v) => {
      const assignedProductionCost = assignedCostMap.get(v.id) ?? 0;
      const settledAmount = settledMap.get(v.id) ?? 0;
      return {
        ...v,
        productCount: productCountMap.get(v.id) ?? 0,
        assignedProductionCost,
        settledAmount,
        remainingPayable: Math.max(0, assignedProductionCost - settledAmount),
      };
    });

    return jsonResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwner(request);
    if (session.platform === "WEB" && !validateCsrfOrigin(request)) {
      return errorResponse("Permintaan lintas domain (CSRF) tidak diizinkan", 403);
    }

    const body = await request.json();
    const validated = createVendorSchema.parse(body);

    const [created] = await db
      .insert(vendors)
      .values({
        name: validated.name,
        contactName: validated.contactName ?? null,
        whatsapp: validated.whatsapp,
        address: validated.address ?? null,
        specialty: validated.specialty ?? null,
        leadTimeDays: validated.leadTimeDays ?? 1,
        notes: validated.notes ?? null,
        isActive: validated.isActive ?? true,
      })
      .returning();

    await recordAuditLog({
      userId: session.userId,
      action: "VENDOR_CREATE",
      entityType: "vendors",
      entityId: created.id,
      platform: session.platform,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
      metadata: {
        name: created.name,
        specialty: created.specialty,
        leadTimeDays: created.leadTimeDays,
      },
    });

    return jsonResponse(
      {
        ...created,
        productCount: 0,
        assignedProductionCost: 0,
        settledAmount: 0,
        remainingPayable: 0,
      },
      201,
      "Vendor mitra berhasil ditambahkan"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
