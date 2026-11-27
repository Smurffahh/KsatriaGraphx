import { NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, vendors } from "@/db/schema";
import { requireOwner } from "@/lib/auth/guard";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { recordAuditLog } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/client-ip";
import { handleCorsPreflight } from "@/lib/api/cors";
import { errorResponse, handleApiError, jsonResponse } from "@/lib/api/response";
import { isValidUuid } from "@/lib/validators/uuid";
import { orderVendorAssignmentSchema } from "@/lib/validators/vendor";

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
    const validated = orderVendorAssignmentSchema.parse(body);

    const requestedVendorIds = Array.from(
      new Set(
        validated.items
          .map((item) => item.vendorId)
          .filter((v): v is string => typeof v === "string" && v.length > 0)
      )
    );

    const vendorMap = new Map<string, typeof vendors.$inferSelect>();
    if (requestedVendorIds.length > 0) {
      const dbVendors = await db
        .select()
        .from(vendors)
        .where(inArray(vendors.id, requestedVendorIds));
      for (const v of dbVendors) {
        vendorMap.set(v.id, v);
      }
      for (const vid of requestedVendorIds) {
        if (!vendorMap.has(vid)) {
          return errorResponse("Salah satu vendor yang dipilih tidak ditemukan", 404);
        }
      }
    }

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
            message: "Tidak dapat mengatur vendor atau SPK untuk pesanan yang sudah dibatalkan",
            status: 409,
          },
        };
      }

      if (validated.items.length > 0) {
        const orderItemIds = validated.items.map((item) => item.orderItemId);
        const existingItems = await tx
          .select({ id: orderItems.id })
          .from(orderItems)
          .where(and(eq(orderItems.orderId, id), inArray(orderItems.id, orderItemIds)));

        const ownedItemSet = new Set(existingItems.map((i) => i.id));
        for (const item of validated.items) {
          if (!ownedItemSet.has(item.orderItemId)) {
            return {
              error: {
                message: "Item pesanan tidak ditemukan pada nota ini",
                status: 400,
              },
            };
          }
        }

        for (const item of validated.items) {
          const vendor = item.vendorId ? vendorMap.get(item.vendorId) : null;
          await tx
            .update(orderItems)
            .set({
              vendorId: vendor ? vendor.id : null,
              vendorNameSnapshot: vendor ? vendor.name : null,
            })
            .where(and(eq(orderItems.id, item.orderItemId), eq(orderItems.orderId, id)));
        }
      }

      const orderUpdate: Partial<typeof orders.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (validated.designFileUrl !== undefined) {
        orderUpdate.designFileUrl = validated.designFileUrl;
      }
      if (validated.markSpkSent) {
        orderUpdate.spkSentAt = new Date();
      }

      const [updatedOrder] = await tx
        .update(orders)
        .set(orderUpdate)
        .where(eq(orders.id, id))
        .returning();

      const updatedItems = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, id));

      return { updatedOrder, updatedItems };
    });

    if ("error" in result && result.error) {
      return errorResponse(result.error.message, result.error.status);
    }

    await recordAuditLog({
      userId: session.userId,
      action: validated.markSpkSent ? "ORDER_SPK_SENT" : "ORDER_VENDOR_ASSIGNMENT",
      entityType: "orders",
      entityId: id,
      platform: session.platform,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
      metadata: {
        invoiceNumber: result.updatedOrder.invoiceNumber,
        updatedItemsCount: validated.items.length,
        hasDesignFileUrl: Boolean(result.updatedOrder.designFileUrl),
        markSpkSent: validated.markSpkSent,
        spkSentAt: result.updatedOrder.spkSentAt,
      },
    });

    return jsonResponse(
      {
        order: result.updatedOrder,
        items: result.updatedItems,
      },
      200,
      validated.markSpkSent
        ? "Status pengiriman SPK vendor dicatat"
        : "Penugasan vendor dan link desain berhasil disimpan"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
