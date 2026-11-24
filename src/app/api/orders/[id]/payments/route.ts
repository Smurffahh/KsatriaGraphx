import { NextRequest } from "next/server";
import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { requireAuth } from "@/lib/auth/guard";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { recordAuditLog } from "@/lib/security/audit";
import { addPaymentSchema } from "@/lib/validators/order";
import { isValidUuid } from "@/lib/validators/uuid";
import { jsonResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { handleCorsPreflight } from "@/lib/api/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function POST(
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
    const body = await request.json();
    const validated = addPaymentSchema.parse(body);

    const result = await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .for("update");

      if (!order) {
        return { error: { message: "Pesanan tidak ditemukan", status: 404 } };
      }

      if (order.productionStatus === "CANCELLED") {
        return {
          error: {
            message: "Tidak dapat menerima pembayaran untuk pesanan yang sudah dibatalkan",
            status: 409,
          },
        };
      }

      if (order.paymentStatus === "PAID" || order.remainingAmount <= 0) {
        return {
          error: {
            message: "Pesanan ini sudah lunas, tidak ada tagihan tersisa",
            status: 409,
          },
        };
      }

      let appliedAmount = validated.amount;
      let changeAmount = 0;

      if (validated.paymentMethod === "TRANSFER" || validated.paymentMethod === "QRIS") {
        if (validated.amount > order.remainingAmount) {
          return {
            error: {
              message: `Nominal transfer/QRIS (Rp ${validated.amount.toLocaleString(
                "id-ID"
              )}) melebihi sisa tagihan (Rp ${order.remainingAmount.toLocaleString("id-ID")})`,
              status: 400,
            },
          };
        }
      } else {
        if (validated.amount > order.remainingAmount) {
          appliedAmount = order.remainingAmount;
          changeAmount = validated.amount - order.remainingAmount;
        } else if (validated.cashReceived && validated.cashReceived > validated.amount) {
          changeAmount = validated.cashReceived - validated.amount;
        }
      }

      const newRemaining = Math.max(0, order.remainingAmount - appliedAmount);
      const newStatus = newRemaining === 0 ? "PAID" : "PARTIAL";

      const [updatedOrder] = await tx
        .update(orders)
        .set({
          paidAmount: sql`${orders.paidAmount} + ${appliedAmount}`,
          remainingAmount: sql`${orders.remainingAmount} - ${appliedAmount}`,
          paymentStatus: newStatus,
          updatedAt: new Date(),
        })
        .where(and(eq(orders.id, id), gte(orders.remainingAmount, appliedAmount)))
        .returning();

      if (!updatedOrder) {
        return {
          error: {
            message: "Gagal memproses pembayaran karena sisa tagihan telah berubah secara konkuren",
            status: 409,
          },
        };
      }

      const [paymentRow] = await tx
        .insert(payments)
        .values({
          orderId: id,
          receivedByUserId: session.userId,
          amount: appliedAmount,
          cashReceived: validated.cashReceived ?? (validated.paymentMethod === "CASH" ? validated.amount : null),
          changeAmount,
          paymentMethod: validated.paymentMethod,
          referenceNote: validated.referenceNote || null,
        })
        .returning();

      return { updatedOrder, paymentRow, changeAmount };
    });

    if ("error" in result && result.error) {
      return errorResponse(result.error.message, result.error.status);
    }

    await recordAuditLog({
      userId: session.userId,
      action: "ORDER_PAYMENT_ADD",
      entityType: "orders",
      entityId: id,
      platform: session.platform,
      metadata: {
        invoiceNumber: result.updatedOrder.invoiceNumber,
        amount: result.paymentRow.amount,
        paymentMethod: result.paymentRow.paymentMethod,
        remainingAmount: result.updatedOrder.remainingAmount,
        paymentStatus: result.updatedOrder.paymentStatus,
      },
    });

    return jsonResponse(
      {
        order: result.updatedOrder,
        payment: result.paymentRow,
        changeAmount: result.changeAmount,
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
