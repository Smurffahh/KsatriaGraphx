import { NextRequest } from "next/server";
import { eq, inArray, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  orders,
  orderItems,
  orderItemFinishings,
  payments,
  users,
  customers,
} from "@/db/schema";
import { requireAuth } from "@/lib/auth/guard";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { recordAuditLog } from "@/lib/security/audit";
import { updateOrderStatusSchema } from "@/lib/validators/order";
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
      return errorResponse("Format ID pesanan tidak valid", 400);
    }

    const [order] = await db
      .select({
        id: orders.id,
        invoiceNumber: orders.invoiceNumber,
        customerId: orders.customerId,
        customerNameSnapshot: orders.customerNameSnapshot,
        customerPhoneSnapshot: orders.customerPhoneSnapshot,
        cashierId: orders.cashierId,
        cashierName: users.name,
        sourcePlatform: orders.sourcePlatform,
        subtotal: orders.subtotal,
        designFee: orders.designFee,
        discountType: orders.discountType,
        discountValue: orders.discountValue,
        discountAmount: orders.discountAmount,
        grandTotal: orders.grandTotal,
        paidAmount: orders.paidAmount,
        remainingAmount: orders.remainingAmount,
        paymentStatus: orders.paymentStatus,
        productionStatus: orders.productionStatus,
        estimatedReadyAt: orders.estimatedReadyAt,
        notes: orders.notes,
        cancelReason: orders.cancelReason,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .leftJoin(users, eq(orders.cashierId, users.id))
      .where(eq(orders.id, id));

    if (!order) {
      return errorResponse("Pesanan tidak ditemukan", 404);
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));

    const itemIds = items.map((i) => i.id);

    const finishingsList =
      itemIds.length > 0
        ? await db
            .select()
            .from(orderItemFinishings)
            .where(inArray(orderItemFinishings.orderItemId, itemIds))
        : [];

    const itemsWithFinishings = items.map((item) => ({
      ...item,
      finishings: finishingsList.filter((f) => f.orderItemId === item.id),
    }));

    const paymentRows = await db
      .select({
        id: payments.id,
        orderId: payments.orderId,
        receivedByUserId: payments.receivedByUserId,
        receivedByUserName: users.name,
        amount: payments.amount,
        cashReceived: payments.cashReceived,
        changeAmount: payments.changeAmount,
        paymentMethod: payments.paymentMethod,
        referenceNote: payments.referenceNote,
        paidAt: payments.paidAt,
      })
      .from(payments)
      .leftJoin(users, eq(payments.receivedByUserId, users.id))
      .where(eq(payments.orderId, id))
      .orderBy(desc(payments.paidAt));

    let customerDetails = null;
    if (order.customerId) {
      const [cust] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, order.customerId));
      customerDetails = cust || null;
    }

    return jsonResponse({
      ...order,
      customer: customerDetails,
      items: itemsWithFinishings,
      payments: paymentRows,
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
      return errorResponse("Format ID pesanan tidak valid", 400);
    }

    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id));

    if (!existingOrder) {
      return errorResponse("Pesanan tidak ditemukan", 404);
    }

    if (existingOrder.productionStatus === "CANCELLED") {
      return errorResponse(
        "Pesanan yang sudah dibatalkan tidak dapat diubah statusnya",
        400
      );
    }

    const body = await request.json();
    const validated = updateOrderStatusSchema.parse(body);

    if (validated.productionStatus === "CANCELLED") {
      if (session.role !== "OWNER") {
        return errorResponse(
          "Hanya Owner yang memiliki hak untuk membatalkan atau me-void nota",
          403
        );
      }
      if (!validated.cancelReason || validated.cancelReason.trim().length < 5) {
        return errorResponse(
          "Alasan pembatalan nota wajib diisi minimal 5 karakter",
          400
        );
      }
    }

    if (session.role === "KASIR" && validated.productionStatus) {
      const cashierAllowed = ["QUEUED", "IN_PROGRESS", "READY", "COMPLETED"];
      if (!cashierAllowed.includes(validated.productionStatus)) {
        return errorResponse(
          "Kasir hanya diizinkan memperbarui status ke Antrean, Proses, Siap Ambil, atau Selesai",
          403
        );
      }
    }

    const [updated] = await db
      .update(orders)
      .set({
        productionStatus: validated.productionStatus ?? existingOrder.productionStatus,
        cancelReason:
          validated.productionStatus === "CANCELLED"
            ? validated.cancelReason
            : existingOrder.cancelReason,
        notes: validated.notes !== undefined ? validated.notes : existingOrder.notes,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    await recordAuditLog({
      userId: session.userId,
      action:
        validated.productionStatus === "CANCELLED"
          ? "ORDER_CANCEL"
          : "ORDER_STATUS_UPDATE",
      entityType: "orders",
      entityId: id,
      platform: session.platform,
      metadata: {
        invoiceNumber: existingOrder.invoiceNumber,
        oldStatus: existingOrder.productionStatus,
        newStatus: updated.productionStatus,
        cancelReason: updated.cancelReason,
      },
    });

    return jsonResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
