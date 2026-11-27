import { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, users, vendorPayments, vendors } from "@/db/schema";
import { requireOwner } from "@/lib/auth/guard";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { recordAuditLog } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/client-ip";
import { handleCorsPreflight } from "@/lib/api/cors";
import { errorResponse, handleApiError, jsonResponse } from "@/lib/api/response";
import { isValidUuid } from "@/lib/validators/uuid";
import { createVendorPaymentSchema } from "@/lib/validators/vendor";
import { deriveVendorPaymentStatus } from "@/lib/vendors/settlement";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOwner(request);
    const { id } = await params;
    if (!isValidUuid(id)) {
      return errorResponse("Format ID pesanan tidak valid", 400);
    }

    const [order] = await db
      .select({
        id: orders.id,
        invoiceNumber: orders.invoiceNumber,
        totalProductionCost: orders.totalProductionCost,
        vendorPaidAmount: orders.vendorPaidAmount,
        vendorPaymentStatus: orders.vendorPaymentStatus,
      })
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      return errorResponse("Pesanan tidak ditemukan", 404);
    }

    const rows = await db
      .select({
        id: vendorPayments.id,
        orderId: vendorPayments.orderId,
        vendorId: vendorPayments.vendorId,
        vendorNameSnapshot: vendorPayments.vendorNameSnapshot,
        amount: vendorPayments.amount,
        paymentMethod: vendorPayments.paymentMethod,
        referenceNote: vendorPayments.referenceNote,
        paidAt: vendorPayments.paidAt,
        recordedByUserId: vendorPayments.recordedByUserId,
        recordedByUserName: users.name,
        createdAt: vendorPayments.createdAt,
      })
      .from(vendorPayments)
      .leftJoin(users, eq(vendorPayments.recordedByUserId, users.id))
      .where(eq(vendorPayments.orderId, id))
      .orderBy(desc(vendorPayments.paidAt));

    const remainingVendorPayable = Math.max(
      0,
      order.totalProductionCost - order.vendorPaidAmount
    );

    return jsonResponse({
      summary: {
        ...order,
        remainingVendorPayable,
      },
      vendorPayments: rows,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
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
    const validated = createVendorPaymentSchema.parse(body);

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
            message: "Tidak dapat mencatat setoran vendor untuk pesanan yang sudah dibatalkan",
            status: 409,
          },
        };
      }

      if (order.totalProductionCost <= 0) {
        return {
          error: {
            message:
              "Pesanan ini belum memiliki modal vendor (> Rp 0). Sesuaikan modal aktual terlebih dahulu jika dikerjakan vendor.",
            status: 409,
          },
        };
      }

      const remaining = Math.max(0, order.totalProductionCost - order.vendorPaidAmount);
      if (order.vendorPaidAmount + validated.amount > order.totalProductionCost) {
        return {
          error: {
            message: `Nominal setoran (Rp ${validated.amount.toLocaleString(
              "id-ID"
            )}) melebihi sisa kewajiban modal ke vendor (Rp ${remaining.toLocaleString("id-ID")})`,
            status: 409,
          },
        };
      }

      let resolvedVendorName = validated.vendorName || "";
      let resolvedVendorId: string | null = null;

      if (validated.vendorId) {
        const [vendor] = await tx
          .select({ id: vendors.id, name: vendors.name })
          .from(vendors)
          .where(eq(vendors.id, validated.vendorId))
          .limit(1);
        if (!vendor) {
          return { error: { message: "Vendor yang dipilih tidak ditemukan", status: 404 } };
        }
        resolvedVendorId = vendor.id;
        resolvedVendorName = vendor.name;
      }

      if (!resolvedVendorName) {
        return {
          error: { message: "Nama vendor penerima setoran wajib diisi", status: 400 },
        };
      }

      const newVendorPaidAmount = order.vendorPaidAmount + validated.amount;
      const newVendorPaymentStatus = deriveVendorPaymentStatus(
        order.totalProductionCost,
        newVendorPaidAmount
      );

      const [paymentRow] = await tx
        .insert(vendorPayments)
        .values({
          orderId: id,
          vendorId: resolvedVendorId,
          vendorNameSnapshot: resolvedVendorName,
          amount: validated.amount,
          paymentMethod: validated.paymentMethod,
          referenceNote: validated.referenceNote ?? null,
          paidAt: validated.paidAt ? new Date(validated.paidAt) : new Date(),
          recordedByUserId: session.userId,
        })
        .returning();

      const [updatedOrder] = await tx
        .update(orders)
        .set({
          vendorPaidAmount: newVendorPaidAmount,
          vendorPaymentStatus: newVendorPaymentStatus,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id))
        .returning();

      return { updatedOrder, paymentRow };
    });

    if ("error" in result && result.error) {
      return errorResponse(result.error.message, result.error.status);
    }

    await recordAuditLog({
      userId: session.userId,
      action: "ORDER_VENDOR_PAYMENT_ADD",
      entityType: "orders",
      entityId: id,
      platform: session.platform,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
      metadata: {
        invoiceNumber: result.updatedOrder.invoiceNumber,
        vendorId: result.paymentRow.vendorId,
        vendorName: result.paymentRow.vendorNameSnapshot,
        amount: result.paymentRow.amount,
        paymentMethod: result.paymentRow.paymentMethod,
        vendorPaidAmount: result.updatedOrder.vendorPaidAmount,
        vendorPaymentStatus: result.updatedOrder.vendorPaymentStatus,
      },
    });

    return jsonResponse(
      {
        order: result.updatedOrder,
        payment: result.paymentRow,
      },
      201,
      "Setoran modal vendor berhasil dicatat"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
