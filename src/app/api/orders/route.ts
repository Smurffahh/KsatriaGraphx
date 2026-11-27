import { NextRequest } from "next/server";
import { eq, inArray, ilike, or, and, gte, lte, desc, count } from "drizzle-orm";
import { db } from "@/db";
import {
  orders,
  orderItems,
  orderItemFinishings,
  payments,
  products,
  productPriceTiers,
  finishings,
  storeSettings,
  customers,
  vendors,
} from "@/db/schema";
import { requireAuth } from "@/lib/auth/guard";
import { validateCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";
import { recordAuditLog } from "@/lib/security/audit";
import { createOrderSchema } from "@/lib/validators/order";
import { generateAtomicInvoiceNumber } from "@/lib/orders/invoice";
import {
  calculateOrder,
  isDiscountWithinCashierLimit,
  type CalculateItemInput,
  type PriceTier,
  type FinishingItemCalculation,
} from "@/lib/calculator/pricing";
import { jsonResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { handleCorsPreflight } from "@/lib/api/cors";
import { redactOrderForRole } from "@/lib/security/cost-redaction";
import { deriveVendorPaymentStatus } from "@/lib/vendors/settlement";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const paymentStatus = searchParams.get("paymentStatus")?.trim();
    const productionStatus = searchParams.get("productionStatus")?.trim();
    const vendorPaymentStatus = searchParams.get("vendorPaymentStatus")?.trim();
    const dateFrom = searchParams.get("dateFrom")?.trim();
    const dateTo = searchParams.get("dateTo")?.trim();
    const customerId = searchParams.get("customerId")?.trim();

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const rawLimit = parseInt(searchParams.get("limit") || "20", 10) || 20;
    const limit = Math.min(50, Math.max(1, rawLimit));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(orders.invoiceNumber, `%${search}%`),
          ilike(orders.customerNameSnapshot, `%${search}%`),
          ilike(orders.customerPhoneSnapshot, `%${search}%`)
        )
      );
    }

    if (
      paymentStatus &&
      ["UNPAID", "PARTIAL", "PAID"].includes(paymentStatus.toUpperCase())
    ) {
      conditions.push(
        eq(
          orders.paymentStatus,
          paymentStatus.toUpperCase() as "UNPAID" | "PARTIAL" | "PAID"
        )
      );
    }

    if (
      productionStatus &&
      ["QUEUED", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED"].includes(
        productionStatus.toUpperCase()
      )
    ) {
      conditions.push(
        eq(
          orders.productionStatus,
          productionStatus.toUpperCase() as
            | "QUEUED"
            | "IN_PROGRESS"
            | "READY"
            | "COMPLETED"
            | "CANCELLED"
        )
      );
    }

    if (
      session.role === "OWNER" &&
      vendorPaymentStatus &&
      ["NOT_APPLICABLE", "UNPAID", "PARTIAL", "PAID"].includes(
        vendorPaymentStatus.toUpperCase()
      )
    ) {
      conditions.push(
        eq(
          orders.vendorPaymentStatus,
          vendorPaymentStatus.toUpperCase() as
            | "NOT_APPLICABLE"
            | "UNPAID"
            | "PARTIAL"
            | "PAID"
        )
      );
    }

    if (customerId) {
      conditions.push(eq(orders.customerId, customerId));
    }

    if (dateFrom && !isNaN(Date.parse(dateFrom))) {
      conditions.push(gte(orders.createdAt, new Date(dateFrom)));
    }

    if (dateTo && !isNaN(Date.parse(dateTo))) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(lte(orders.createdAt, endOfDay));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRecord] = await db
      .select({ count: count() })
      .from(orders)
      .where(whereClause);

    const total = totalRecord?.count ?? 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const orderRows = await db
      .select({
        id: orders.id,
        invoiceNumber: orders.invoiceNumber,
        customerId: orders.customerId,
        customerNameSnapshot: orders.customerNameSnapshot,
        customerPhoneSnapshot: orders.customerPhoneSnapshot,
        cashierId: orders.cashierId,
        sourcePlatform: orders.sourcePlatform,
        subtotal: orders.subtotal,
        designFee: orders.designFee,
        discountType: orders.discountType,
        discountValue: orders.discountValue,
        discountAmount: orders.discountAmount,
        grandTotal: orders.grandTotal,
        totalProductionCost: orders.totalProductionCost,
        grossProfit: orders.grossProfit,
        vendorPaidAmount: orders.vendorPaidAmount,
        vendorPaymentStatus: orders.vendorPaymentStatus,
        spkSentAt: orders.spkSentAt,
        designFileUrl: orders.designFileUrl,
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
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    const redactedOrders = orderRows.map((o) => redactOrderForRole(o, session.role));

    return jsonResponse({
      data: redactedOrders,
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

    const ip = getClientIp(request);
    const rateLimitKey = `rate:orders:${session.userId}:${ip}`;
    const rateLimit = await checkRateLimit(rateLimitKey, 60, 60);
    if (!rateLimit.allowed) {
      return errorResponse(
        "Terlalu banyak permintaan pembuatan nota. Silakan tunggu sebentar.",
        429,
        { retryAfter: rateLimit.retryAfterSec }
      );
    }

    const body = await request.json();
    const validated = createOrderSchema.parse(body);

    const productIds = Array.from(new Set(validated.items.map((i) => i.productId)));
    const finishingIds = Array.from(
      new Set(
        validated.items.flatMap((i) => (i.finishings || []).map((f) => f.finishingId))
      )
    );

    const [dbProducts, dbTiers, dbFinishings, [settings]] = await Promise.all([
      db.select().from(products).where(inArray(products.id, productIds)),
      db.select().from(productPriceTiers).where(inArray(productPriceTiers.productId, productIds)),
      finishingIds.length > 0
        ? db.select().from(finishings).where(inArray(finishings.id, finishingIds))
        : Promise.resolve([]),
      db.select().from(storeSettings).where(eq(storeSettings.id, 1)),
    ]);

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));
    const finishingMap = new Map(dbFinishings.map((f) => [f.id, f]));
    const defaultVendorIds = Array.from(
      new Set(
        dbProducts
          .map((p) => p.defaultVendorId)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      )
    );
    const dbVendors =
      defaultVendorIds.length > 0
        ? await db.select().from(vendors).where(inArray(vendors.id, defaultVendorIds))
        : [];
    const vendorMap = new Map(dbVendors.map((v) => [v.id, v]));

    for (const item of validated.items) {
      const prod = productMap.get(item.productId);
      if (!prod || !prod.isActive) {
        return errorResponse(
          `Produk dengan ID ${item.productId} tidak ditemukan atau sudah tidak aktif`,
          400
        );
      }

      if (item.finishings && item.finishings.length > 0) {
        for (const f of item.finishings) {
          const fin = finishingMap.get(f.finishingId);
          if (!fin || !fin.isActive) {
            return errorResponse(
              `Finishing dengan ID ${f.finishingId} tidak ditemukan atau sudah tidak aktif`,
              400
            );
          }
        }
      }

      if (item.overrideUnitPrice !== undefined && item.overrideUnitPrice !== null) {
        if (session.role !== "OWNER") {
          return errorResponse(
            "Kasir tidak memiliki wewenang untuk melakukan override harga manual",
            403
          );
        }
      }
    }

    if (validated.customerId) {
      const [cust] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, validated.customerId));
      if (!cust) {
        return errorResponse("Data pelanggan tidak ditemukan", 400);
      }
    }

    const calculationItems: CalculateItemInput[] = validated.items.map((item) => {
      const prod = productMap.get(item.productId)!;
      const prodTiers: PriceTier[] = dbTiers
        .filter((t) => t.productId === prod.id)
        .map((t) => ({
          minQty: t.minQty,
          maxQty: t.maxQty,
          productionPrice: t.productionPrice,
          unitPrice: t.unitPrice,
        }));

      const itemFinishings: FinishingItemCalculation[] = (item.finishings || []).map((f) => {
        const fin = finishingMap.get(f.finishingId)!;
        return {
          finishingId: fin.id,
          name: fin.name,
          chargeType: fin.chargeType,
          unitPrice: fin.defaultPrice,
          productionUnitPrice: fin.productionPrice,
          quantity: f.quantity,
        };
      });

      return {
        pricingType: prod.pricingType,
        quantity: item.quantity,
        basePrice: prod.basePrice,
        productionPrice: prod.productionPrice,
        priceTiers: prodTiers,
        overrideUnitPrice: item.overrideUnitPrice ?? undefined,
        isPriceOverridden: item.overrideUnitPrice !== undefined && item.overrideUnitPrice !== null,
        width: item.width ?? undefined,
        height: item.height ?? undefined,
        unit: item.unit ?? "m",
        minArea: prod.minArea,
        areaRounding: prod.areaRounding,
        finishings: itemFinishings,
      };
    });

    const calculatedOrder = calculateOrder({
      items: calculationItems,
      designFee: validated.designFee,
      discountType: validated.discountType,
      discountValue: validated.discountValue,
      initialPaymentAmount: validated.initialPayment?.amount ?? 0,
      cashReceived: validated.initialPayment?.cashReceived ?? undefined,
      paymentMethod: validated.initialPayment?.paymentMethod ?? "CASH",
    });

    const maxCashierDiscount = settings?.maxCashierDiscountPercent ?? 10;
    if (session.role === "KASIR" && calculatedOrder.discountAmount > 0) {
      const isAllowed = isDiscountWithinCashierLimit(
        calculatedOrder.subtotalPlusDesign,
        calculatedOrder.discountAmount,
        maxCashierDiscount
      );
      if (!isAllowed) {
        return errorResponse(
          `Nominal diskon melebihi plafon kasir (${maxCashierDiscount}%). Silakan minta persetujuan Owner.`,
          403
        );
      }
    }

    const prefix = settings?.invoicePrefix || "KGX";

    const createdOrder = await db.transaction(async (tx) => {
      const { invoiceNumber } = await generateAtomicInvoiceNumber(tx, prefix);

      const [newOrder] = await tx
        .insert(orders)
        .values({
          invoiceNumber,
          customerId: validated.customerId || null,
          customerNameSnapshot: validated.customerNameSnapshot,
          customerPhoneSnapshot: validated.customerPhoneSnapshot || null,
          cashierId: session.userId,
          sourcePlatform: session.platform,
          subtotal: calculatedOrder.subtotal,
          designFee: calculatedOrder.designFee,
          discountType: calculatedOrder.discountType,
          discountValue: calculatedOrder.discountValue,
          discountAmount: calculatedOrder.discountAmount,
          grandTotal: calculatedOrder.grandTotal,
          totalProductionCost: calculatedOrder.totalProductionCost,
          grossProfit: calculatedOrder.grossProfit,
          vendorPaidAmount: 0,
          vendorPaymentStatus: deriveVendorPaymentStatus(calculatedOrder.totalProductionCost, 0),
          paidAmount: calculatedOrder.paidAmount,
          remainingAmount: calculatedOrder.remainingAmount,
          paymentStatus: calculatedOrder.paymentStatus,
          productionStatus: "QUEUED",
          estimatedReadyAt: validated.estimatedReadyAt ? new Date(validated.estimatedReadyAt) : null,
          notes: validated.notes || null,
        })
        .returning();

      for (let i = 0; i < validated.items.length; i++) {
        const itemInput = validated.items[i];
        const calcItem = calculatedOrder.items[i];
        const prod = productMap.get(itemInput.productId)!;
        const defaultVendor = prod.defaultVendorId ? vendorMap.get(prod.defaultVendorId) : null;

        const [createdItem] = await tx
          .insert(orderItems)
          .values({
            orderId: newOrder.id,
            productId: prod.id,
            productNameSnapshot: prod.name,
            vendorId: defaultVendor ? defaultVendor.id : null,
            vendorNameSnapshot: defaultVendor ? defaultVendor.name : null,
            pricingTypeSnapshot: prod.pricingType,
            widthM: calcItem.widthM !== undefined ? calcItem.widthM.toFixed(3) : null,
            heightM: calcItem.heightM !== undefined ? calcItem.heightM.toFixed(3) : null,
            billedAreaM2: calcItem.billedAreaM2 !== undefined ? calcItem.billedAreaM2.toFixed(3) : null,
            quantity: calcItem.quantity,
            unitPrice: calcItem.effectiveUnitPrice,
            isPriceOverridden: calcItem.isPriceOverridden,
            finishingTotal: calcItem.finishingTotal,
            itemSubtotal: calcItem.itemSubtotal,
            productionUnitPriceSnapshot: calcItem.productionUnitPrice,
            productionSubtotal: calcItem.productionSubtotal,
            profitAmount: calcItem.profitAmount,
            itemNotes: itemInput.itemNotes || null,
          })
          .returning();

        if (calcItem.finishings && calcItem.finishings.length > 0) {
          for (const fin of calcItem.finishings) {
            await tx.insert(orderItemFinishings).values({
              orderItemId: createdItem.id,
              finishingId: fin.finishingId || null,
              finishingNameSnapshot: fin.name,
              chargeTypeSnapshot: fin.chargeType,
              quantity: fin.quantity.toFixed(2),
              unitPrice: fin.unitPrice,
              subtotal: fin.subtotal,
            });
          }
        }
      }

      if (validated.initialPayment && calculatedOrder.paidAmount > 0) {
        await tx.insert(payments).values({
          orderId: newOrder.id,
          receivedByUserId: session.userId,
          amount: calculatedOrder.paidAmount,
          cashReceived: validated.initialPayment.cashReceived ?? null,
          changeAmount: calculatedOrder.changeAmount,
          paymentMethod: validated.initialPayment.paymentMethod,
          referenceNote: validated.initialPayment.referenceNote || null,
        });
      }

      return newOrder;
    });

    const hasOverride = calculatedOrder.items.some((i) => i.isPriceOverridden);
    await recordAuditLog({
      userId: session.userId,
      action: "ORDER_CREATE",
      entityType: "orders",
      entityId: createdOrder.id,
      platform: session.platform,
      metadata: {
        invoiceNumber: createdOrder.invoiceNumber,
        grandTotal: createdOrder.grandTotal,
        paidAmount: createdOrder.paidAmount,
        paymentStatus: createdOrder.paymentStatus,
        hasPriceOverride: hasOverride,
      },
    });

    return jsonResponse(
      redactOrderForRole(
        {
          ...createdOrder,
          changeAmount: calculatedOrder.changeAmount,
        },
        session.role
      ),
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
