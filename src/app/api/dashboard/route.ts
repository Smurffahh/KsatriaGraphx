import { NextRequest } from "next/server";
import { eq, and, ne, gte, sql, desc, count, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orders, orderItems, payments, users, vendorPayments } from "@/db/schema";
import { requireAuth } from "@/lib/auth/guard";
import { jsonResponse, handleApiError } from "@/lib/api/response";
import { handleCorsPreflight } from "@/lib/api/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

const dashboardQuerySchema = z
  .object({
    range: z.enum(["1d", "7d", "30d"]).default("7d"),
  })
  .strict();

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const parsedQuery = dashboardQuerySchema.parse({
      range: searchParams.get("range") || "7d",
    });

    const isOwner = session.role === "OWNER";
    const now = new Date();

    // Hitung tanggal awal hari ini (WIB: UTC+7)
    const todayWibStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now); // "YYYY-MM-DD"

    const todayStartUtc = new Date(`${todayWibStr}T00:00:00+07:00`);

    // Hitung tanggal awal periode range (1 hari, 7 hari atau 30 hari)
    const rangeStartDate =
      parsedQuery.range === "1d"
        ? todayStartUtc
        : new Date(
            now.getTime() -
              (parsedQuery.range === "30d" ? 30 : 7) * 24 * 60 * 60 * 1000
          );

    // Filter antrean produksi aktif (QUEUED, IN_PROGRESS, READY)
    const [queueResult] = await db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          ne(orders.productionStatus, "CANCELLED"),
          inArray(orders.productionStatus, ["QUEUED", "IN_PROGRESS", "READY"])
        )
      );
    const activeQueueCount = queueResult?.count ?? 0;

    if (!isOwner) {
      // ----------------------------------------------------------------------
      // ROLE KASIR: Hanya data operasional kasir bersangkutan (Anti-IDOR)
      // ----------------------------------------------------------------------
      const cashierCondition = eq(orders.cashierId, session.userId);

      // Omzet hari ini milik kasir
      const [todayOmzetResult] = await db
        .select({
          totalOmzet: sql<number>`cast(coalesce(sum(${orders.grandTotal}), 0) as integer)`,
          ordersCount: sql<number>`cast(count(${orders.id}) as integer)`,
        })
        .from(orders)
        .where(
          and(
            cashierCondition,
            ne(orders.productionStatus, "CANCELLED"),
            gte(orders.createdAt, todayStartUtc)
          )
        );

      // Uang masuk fisik kasir hari ini (dari tabel payments)
      const [cashierPayments] = await db
        .select({
          totalMoney: sql<number>`cast(coalesce(sum(${payments.amount}), 0) as integer)`,
        })
        .from(payments)
        .where(
          and(
            eq(payments.receivedByUserId, session.userId),
            gte(payments.paidAt, todayStartUtc)
          )
        );

      // 5 transaksi terbaru milik kasir
      const recentOrders = await db
        .select({
          id: orders.id,
          invoiceNumber: orders.invoiceNumber,
          customerNameSnapshot: orders.customerNameSnapshot,
          grandTotal: orders.grandTotal,
          paidAmount: orders.paidAmount,
          remainingAmount: orders.remainingAmount,
          paymentStatus: orders.paymentStatus,
          productionStatus: orders.productionStatus,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(cashierCondition)
        .orderBy(desc(orders.createdAt))
        .limit(5);

      return jsonResponse({
        role: "KASIR",
        kpi: {
          todayOmzet: todayOmzetResult?.totalOmzet ?? 0,
          todayOrdersCount: todayOmzetResult?.ordersCount ?? 0,
          todayMoneyReceived: cashierPayments?.totalMoney ?? 0,
          activeQueueCount,
        },
        recentOrders,
      });
    }

    // ------------------------------------------------------------------------
    // ROLE OWNER: Ringkasan penuh seluruh toko, tren omzet harian & top produk
    // ------------------------------------------------------------------------

    // 1. KPI Toko
    const [omzetRange] = await db
      .select({
        totalOmzet: sql<number>`cast(coalesce(sum(${orders.grandTotal}), 0) as integer)`,
        totalProductionCost: sql<number>`cast(coalesce(sum(${orders.totalProductionCost}), 0) as integer)`,
        totalGrossProfit: sql<number>`cast(coalesce(sum(${orders.grossProfit}), 0) as integer)`,
        totalOrders: sql<number>`cast(count(${orders.id}) as integer)`,
      })
      .from(orders)
      .where(
        and(
          ne(orders.productionStatus, "CANCELLED"),
          gte(orders.createdAt, rangeStartDate)
        )
      );

    const totalOmzetValue = omzetRange?.totalOmzet ?? 0;
    const totalProductionCostValue = omzetRange?.totalProductionCost ?? 0;
    const totalGrossProfitValue = omzetRange?.totalGrossProfit ?? 0;
    const profitMarginPercent =
      totalOmzetValue > 0
        ? Math.round((totalGrossProfitValue / totalOmzetValue) * 1000) / 10
        : 0;

    const [actualPayments] = await db
      .select({
        totalCashIn: sql<number>`cast(coalesce(sum(${payments.amount}), 0) as integer)`,
      })
      .from(payments)
      .innerJoin(orders, eq(payments.orderId, orders.id))
      .where(
        and(
          ne(orders.productionStatus, "CANCELLED"),
          gte(payments.paidAt, rangeStartDate)
        )
      );

    const [piutangResult] = await db
      .select({
        totalPiutang: sql<number>`cast(coalesce(sum(${orders.remainingAmount}), 0) as integer)`,
      })
      .from(orders)
      .where(
        and(
          ne(orders.productionStatus, "CANCELLED"),
          inArray(orders.paymentStatus, ["UNPAID", "PARTIAL"])
        )
      );

    const [unpaidVendorSummary] = await db
      .select({
        unpaidVendorTotal: sql<number>`cast(coalesce(sum(greatest(0, ${orders.totalProductionCost} - ${orders.vendorPaidAmount})), 0) as integer)`,
        unpaidVendorOrderCount: sql<number>`cast(count(*) as integer)`,
      })
      .from(orders)
      .where(
        and(
          ne(orders.productionStatus, "CANCELLED"),
          inArray(orders.vendorPaymentStatus, ["UNPAID", "PARTIAL"]),
          sql`${orders.totalProductionCost} > ${orders.vendorPaidAmount}`
        )
      );

    const [vendorPaidPeriodResult] = await db
      .select({
        vendorPaidInPeriod: sql<number>`cast(coalesce(sum(${vendorPayments.amount}), 0) as integer)`,
      })
      .from(vendorPayments)
      .innerJoin(orders, eq(vendorPayments.orderId, orders.id))
      .where(
        and(
          ne(orders.productionStatus, "CANCELLED"),
          gte(vendorPayments.paidAt, rangeStartDate)
        )
      );

    const unpaidVendorTotal = unpaidVendorSummary?.unpaidVendorTotal ?? 0;
    const unpaidVendorOrderCount = unpaidVendorSummary?.unpaidVendorOrderCount ?? 0;
    const vendorPaidInPeriod = vendorPaidPeriodResult?.vendorPaidInPeriod ?? 0;
    const netAvailableCashEstimate = (actualPayments?.totalCashIn ?? 0) - unpaidVendorTotal;

    // 2. Tren Omzet & Laba Harian (WIB Asia/Jakarta)
    const dailyTrendRaw = await db
      .select({
        dateKey: sql<string>`to_char(${orders.createdAt} AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD')`,
        omzet: sql<number>`cast(coalesce(sum(${orders.grandTotal}), 0) as integer)`,
        modal: sql<number>`cast(coalesce(sum(${orders.totalProductionCost}), 0) as integer)`,
        laba: sql<number>`cast(coalesce(sum(${orders.grossProfit}), 0) as integer)`,
        transaksi: sql<number>`cast(count(${orders.id}) as integer)`,
      })
      .from(orders)
      .where(
        and(
          ne(orders.productionStatus, "CANCELLED"),
          gte(orders.createdAt, rangeStartDate)
        )
      )
      .groupBy(sql`to_char(${orders.createdAt} AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${orders.createdAt} AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD')`);

    // 3. Top 5 Produk Terlaris
    const topProducts = await db
      .select({
        productId: orderItems.productId,
        productName: orderItems.productNameSnapshot,
        totalQuantity: sql<number>`cast(sum(${orderItems.quantity}) as integer)`,
        totalRevenue: sql<number>`cast(sum(${orderItems.itemSubtotal}) as integer)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          ne(orders.productionStatus, "CANCELLED"),
          gte(orders.createdAt, rangeStartDate)
        )
      )
      .groupBy(orderItems.productId, orderItems.productNameSnapshot)
      .orderBy(desc(sql`sum(${orderItems.itemSubtotal})`))
      .limit(5);

    // 4. 5 Transaksi Terbaru Seluruh Toko
    const recentOrders = await db
      .select({
        id: orders.id,
        invoiceNumber: orders.invoiceNumber,
        customerNameSnapshot: orders.customerNameSnapshot,
        cashierName: users.name,
        grandTotal: orders.grandTotal,
        paidAmount: orders.paidAmount,
        remainingAmount: orders.remainingAmount,
        paymentStatus: orders.paymentStatus,
        productionStatus: orders.productionStatus,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .leftJoin(users, eq(orders.cashierId, users.id))
      .orderBy(desc(orders.createdAt))
      .limit(5);

    return jsonResponse({
      role: "OWNER",
      range: parsedQuery.range,
      kpi: {
        totalOmzet: totalOmzetValue,
        totalProductionCost: totalProductionCostValue,
        totalGrossProfit: totalGrossProfitValue,
        profitMarginPercent,
        totalOrders: omzetRange?.totalOrders ?? 0,
        totalCashIn: actualPayments?.totalCashIn ?? 0,
        totalPiutang: piutangResult?.totalPiutang ?? 0,
        unpaidVendorTotal,
        unpaidVendorOrderCount,
        vendorPaidInPeriod,
        netAvailableCashEstimate,
        activeQueueCount,
      },
      chartTrend: dailyTrendRaw,
      topProducts,
      recentOrders,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
