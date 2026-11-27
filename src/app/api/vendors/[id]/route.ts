import { NextRequest } from "next/server";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, products, vendorPayments, vendors } from "@/db/schema";
import { requireOwner } from "@/lib/auth/guard";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { recordAuditLog } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/client-ip";
import { handleCorsPreflight } from "@/lib/api/cors";
import { errorResponse, handleApiError, jsonResponse } from "@/lib/api/response";
import { isValidUuid } from "@/lib/validators/uuid";
import { updateVendorSchema } from "@/lib/validators/vendor";

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
      return errorResponse("Format ID vendor tidak valid", 400);
    }

    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
    if (!vendor) {
      return errorResponse("Vendor tidak ditemukan", 404);
    }

    return jsonResponse(vendor);
  } catch (error) {
    return handleApiError(error);
  }
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
      return errorResponse("Format ID vendor tidak valid", 400);
    }

    const [existing] = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
    if (!existing) {
      return errorResponse("Vendor tidak ditemukan", 404);
    }

    const body = await request.json();
    const validated = updateVendorSchema.parse(body);

    const updateValues: Partial<typeof vendors.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (validated.name !== undefined) updateValues.name = validated.name;
    if (validated.contactName !== undefined) updateValues.contactName = validated.contactName;
    if (validated.whatsapp !== undefined) updateValues.whatsapp = validated.whatsapp;
    if (validated.address !== undefined) updateValues.address = validated.address;
    if (validated.specialty !== undefined) updateValues.specialty = validated.specialty;
    if (validated.leadTimeDays !== undefined) updateValues.leadTimeDays = validated.leadTimeDays;
    if (validated.notes !== undefined) updateValues.notes = validated.notes;
    if (validated.isActive !== undefined) updateValues.isActive = validated.isActive;

    const [updated] = await db
      .update(vendors)
      .set(updateValues)
      .where(eq(vendors.id, id))
      .returning();

    await recordAuditLog({
      userId: session.userId,
      action: "VENDOR_UPDATE",
      entityType: "vendors",
      entityId: id,
      platform: session.platform,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
      metadata: {
        beforeName: existing.name,
        afterName: updated.name,
        isActive: updated.isActive,
      },
    });

    return jsonResponse(updated, 200, "Data vendor berhasil diperbarui");
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
      return errorResponse("Format ID vendor tidak valid", 400);
    }

    const [existing] = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
    if (!existing) {
      return errorResponse("Vendor tidak ditemukan", 404);
    }

    const [[prodRef], [itemRef], [payRef]] = await Promise.all([
      db.select({ n: count() }).from(products).where(eq(products.defaultVendorId, id)),
      db.select({ n: count() }).from(orderItems).where(eq(orderItems.vendorId, id)),
      db.select({ n: count() }).from(vendorPayments).where(eq(vendorPayments.vendorId, id)),
    ]);

    const hasReferences = (prodRef?.n ?? 0) + (itemRef?.n ?? 0) + (payRef?.n ?? 0) > 0;

    if (hasReferences) {
      const [deactivated] = await db
        .update(vendors)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(vendors.id, id))
        .returning();

      await recordAuditLog({
        userId: session.userId,
        action: "VENDOR_DEACTIVATE",
        entityType: "vendors",
        entityId: id,
        platform: session.platform,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent"),
        metadata: { name: existing.name, softDeleted: true },
      });

      return jsonResponse(
        {
          deleted: false,
          softDeleted: true,
          vendor: deactivated,
        },
        200,
        "Vendor dinonaktifkan karena sudah terhubung ke produk atau histori pesanan"
      );
    }

    await db.delete(vendors).where(eq(vendors.id, id));

    await recordAuditLog({
      userId: session.userId,
      action: "VENDOR_DELETE",
      entityType: "vendors",
      entityId: id,
      platform: session.platform,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
      metadata: { name: existing.name, deleted: true },
    });

    return jsonResponse(
      { deleted: true, softDeleted: false, id },
      200,
      "Vendor berhasil dihapus permanen"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
