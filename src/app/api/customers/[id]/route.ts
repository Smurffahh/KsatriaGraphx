import { NextRequest } from "next/server";
import { eq, desc, count, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, orders } from "@/db/schema";
import { requireAuth, requireOwner } from "@/lib/auth/guard";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { recordAuditLog } from "@/lib/security/audit";
import { updateCustomerSchema } from "@/lib/validators/customer";
import { isValidUuid } from "@/lib/validators/uuid";
import { jsonResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { handleCorsPreflight } from "@/lib/api/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request);
    const { id } = await params;
    if (!isValidUuid(id)) {
      return errorResponse("Format ID pelanggan tidak valid", 400);
    }

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id));

    if (!customer) {
      return errorResponse("Pelanggan tidak ditemukan", 404);
    }

    const [stats] = await db
      .select({
        totalOrders: sql<number>`cast(count(${orders.id}) as integer)`,
        totalSpent: sql<number>`cast(coalesce(sum(${orders.grandTotal}), 0) as integer)`,
        totalPiutang: sql<number>`cast(coalesce(sum(${orders.remainingAmount}), 0) as integer)`,
      })
      .from(orders)
      .where(eq(orders.customerId, id));

    const recentOrders = await db
      .select({
        id: orders.id,
        invoiceNumber: orders.invoiceNumber,
        grandTotal: orders.grandTotal,
        paidAmount: orders.paidAmount,
        remainingAmount: orders.remainingAmount,
        paymentStatus: orders.paymentStatus,
        productionStatus: orders.productionStatus,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.customerId, id))
      .orderBy(desc(orders.createdAt))
      .limit(10);

    return jsonResponse({
      ...customer,
      stats: {
        totalOrders: stats?.totalOrders ?? 0,
        totalSpent: stats?.totalSpent ?? 0,
        totalPiutang: stats?.totalPiutang ?? 0,
      },
      recentOrders,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(request);
    if (session.platform === "WEB" && !validateCsrfOrigin(request)) {
      return errorResponse("Permintaan lintas domain (CSRF) tidak diizinkan", 403);
    }

    const { id } = await params;
    if (!isValidUuid(id)) {
      return errorResponse("Format ID pelanggan tidak valid", 400);
    }

    const [existing] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id));

    if (!existing) {
      return errorResponse("Pelanggan tidak ditemukan", 404);
    }

    const body = await request.json();
    const validated = updateCustomerSchema.parse(body);

    const [updated] = await db
      .update(customers)
      .set({
        name: validated.name,
        phone: validated.phone,
        address: validated.address,
        notes: validated.notes,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();

    await recordAuditLog({
      userId: session.userId,
      action: "CUSTOMER_UPDATE",
      entityType: "customers",
      entityId: id,
      platform: session.platform,
      metadata: {
        before: { name: existing.name, phone: existing.phone },
        after: { name: updated.name, phone: updated.phone },
      },
    });

    return jsonResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner(request);
    if (session.platform === "WEB" && !validateCsrfOrigin(request)) {
      return errorResponse("Permintaan lintas domain (CSRF) tidak diizinkan", 403);
    }

    const { id } = await params;
    if (!isValidUuid(id)) {
      return errorResponse("Format ID pelanggan tidak valid", 400);
    }

    const [existing] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id));

    if (!existing) {
      return errorResponse("Pelanggan tidak ditemukan", 404);
    }

    const [orderRef] = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.customerId, id));

    if (orderRef && orderRef.count > 0) {
      return errorResponse(
        "Pelanggan tidak dapat dihapus karena masih memiliki riwayat transaksi",
        409
      );
    }

    await db.delete(customers).where(eq(customers.id, id));

    await recordAuditLog({
      userId: session.userId,
      action: "CUSTOMER_DELETE",
      entityType: "customers",
      entityId: id,
      platform: session.platform,
      metadata: {
        name: existing.name,
        phone: existing.phone,
      },
    });

    return jsonResponse({ success: true, message: "Pelanggan berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}
