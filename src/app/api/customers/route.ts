import { NextRequest } from "next/server";
import { eq, ilike, or, desc, sql, count } from "drizzle-orm";
import { db } from "@/db";
import { customers, orders } from "@/db/schema";
import { requireAuth } from "@/lib/auth/guard";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { recordAuditLog } from "@/lib/security/audit";
import { createCustomerSchema } from "@/lib/validators/customer";
import { jsonResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { handleCorsPreflight } from "@/lib/api/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const rawLimit = parseInt(searchParams.get("limit") || "20", 10) || 20;
    const limit = Math.min(50, Math.max(1, rawLimit));
    const offset = (page - 1) * limit;

    const searchCondition = search
      ? or(
          ilike(customers.name, `%${search}%`),
          ilike(customers.phone, `%${search}%`)
        )
      : undefined;

    const [totalRecord] = await db
      .select({ count: count() })
      .from(customers)
      .where(searchCondition);

    const total = totalRecord?.count ?? 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const data = await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        address: customers.address,
        notes: customers.notes,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
        totalOrders: sql<number>`cast(count(${orders.id}) as integer)`,
        totalPiutang: sql<number>`cast(coalesce(sum(${orders.remainingAmount}), 0) as integer)`,
      })
      .from(customers)
      .leftJoin(orders, eq(customers.id, orders.customerId))
      .where(searchCondition)
      .groupBy(customers.id)
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset(offset);

    return jsonResponse({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    if (session.platform === "WEB" && !validateCsrfOrigin(request)) {
      return errorResponse("Permintaan lintas domain (CSRF) tidak diizinkan", 403);
    }

    const body = await request.json();
    const validated = createCustomerSchema.parse(body);

    const [newCustomer] = await db
      .insert(customers)
      .values({
        name: validated.name,
        phone: validated.phone || null,
        address: validated.address || null,
        notes: validated.notes || null,
      })
      .returning();

    await recordAuditLog({
      userId: session.userId,
      action: "CUSTOMER_CREATE",
      entityType: "customers",
      entityId: newCustomer.id,
      platform: session.platform,
      metadata: {
        name: newCustomer.name,
        phone: newCustomer.phone,
      },
    });

    return jsonResponse(newCustomer, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
