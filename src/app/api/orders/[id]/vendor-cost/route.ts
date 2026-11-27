import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireOwner } from "@/lib/auth/guard";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { recordAuditLog } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/client-ip";
import { handleCorsPreflight } from "@/lib/api/cors";
import { errorResponse, handleApiError, jsonResponse } from "@/lib/api/response";
import { isValidUuid } from "@/lib/validators/uuid";
import { adjustVendorCostSchema } from "@/lib/validators/vendor";
import { deriveVendorPaymentStatus } from "@/lib/vendors/settlement";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function PATCH(
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
      return errorResponse("Format ID pesanan tidak valid", 400);
    }

    const body = await request.json();
    const validated = adjustVendorCostSchema.parse(body);

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
            message: "Tidak dapat mengubah modal vendor untuk pesanan yang sudah dibatalkan",
            status: 409,
          },
        };
      }

      if (validated.totalProductionCost < order.vendorPaidAmount) {
        return {
          error: {
            message: `Modal vendor baru (Rp ${validated.totalProductionCost.toLocaleString(
              "id-ID"
            )}) tidak boleh lebih kecil dari modal yang sudah disetor (Rp ${order.vendorPaidAmount.toLocaleString(
              "id-ID"
            )})`,
            status: 409,
          },
        };
      }

      const newGrossProfit = order.grandTotal - validated.totalProductionCost;
      const newStatus = deriveVendorPaymentStatus(
        validated.totalProductionCost,
        order.vendorPaidAmount
      );

      const [updatedOrder] = await tx
        .update(orders)
        .set({
          totalProductionCost: validated.totalProductionCost,
          grossProfit: newGrossProfit,
          vendorPaymentStatus: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id))
        .returning();

      return {
        updatedOrder,
        beforeCost: order.totalProductionCost,
        beforeProfit: order.grossProfit,
        beforeStatus: order.vendorPaymentStatus,
      };
    });

    if ("error" in result && result.error) {
      return errorResponse(result.error.message, result.error.status);
    }

    await recordAuditLog({
      userId: session.userId,
      action: "ORDER_VENDOR_COST_ADJUST",
      entityType: "orders",
      entityId: id,
      platform: session.platform,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
      metadata: {
        invoiceNumber: result.updatedOrder.invoiceNumber,
        reason: validated.reason,
        beforeCost: result.beforeCost,
        afterCost: result.updatedOrder.totalProductionCost,
        beforeProfit: result.beforeProfit,
        afterProfit: result.updatedOrder.grossProfit,
        beforeStatus: result.beforeStatus,
        afterStatus: result.updatedOrder.vendorPaymentStatus,
      },
    });

    return jsonResponse(
      result.updatedOrder,
      200,
      "Modal vendor aktual berhasil diperbarui"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
