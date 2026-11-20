import { NextRequest } from "next/server";
import { eq, and, ne, gte, lte, inArray, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orders, payments, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/guard";
import { jsonResponse, handleApiError } from "@/lib/api/response";
import { buildSafeCsv } from "@/lib/security/csv-sanitize";
import { recordAuditLog } from "@/lib/security/audit";
import { handleCorsPreflight } from "@/lib/api/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request);
}

const reportsQuerySchema = z
  .object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    cashierId: z.string().uuid().optional(),
    paymentStatus: z.enum(["ALL", "PAID", "PARTIAL", "UNPAID"]).default("ALL"),
    paymentMethod: z.enum(["ALL", "CASH", "TRANSFER", "QRIS"]).default("ALL"),
    format: z.enum(["json", "csv"]).default("json"),
  })
  .strict();

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const parsedQuery = reportsQuerySchema.parse({
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      cashierId: searchParams.get("cashierId") || undefined,
      paymentStatus: searchParams.get("paymentStatus") || "ALL",
      paymentMethod: searchParams.get("paymentMethod") || "ALL",
      format: searchParams.get("format") || "json",
    });

    const isOwner = session.role === "OWNER";
    // ANTI-IDOR: Kasir dipaksa hanya melihat datanya sendiri
    const effectiveCashierId = isOwner ? parsedQuery.cashierId : session.userId;

    // Filter tanggal WIB (Asia/Jakarta)
    let startFilterDate: Date | undefined;
    let endFilterDate: Date | undefined;

    if (parsedQuery.startDate) {
      startFilterDate = new Date(`${parsedQuery.startDate}T00:00:00+07:00`);
    }
    if (parsedQuery.endDate) {
      endFilterDate = new Date(`${parsedQuery.endDate}T23:59:59.999+07:00`);
    }

    // Bangun kondisi query orders
    const conditions = [ne(orders.productionStatus, "CANCELLED")];

    if (effectiveCashierId) {
      conditions.push(eq(orders.cashierId, effectiveCashierId));
    }
    if (parsedQuery.paymentStatus !== "ALL") {
      conditions.push(eq(orders.paymentStatus, parsedQuery.paymentStatus));
    }
    if (startFilterDate) {
      conditions.push(gte(orders.createdAt, startFilterDate));
    }
    if (endFilterDate) {
      conditions.push(lte(orders.createdAt, endFilterDate));
    }

    // Ambil daftar orders
    const ordersList = await db
      .select({
        id: orders.id,
        invoiceNumber: orders.invoiceNumber,
        customerNameSnapshot: orders.customerNameSnapshot,
        customerPhoneSnapshot: orders.customerPhoneSnapshot,
        cashierId: orders.cashierId,
        cashierName: users.name,
        sourcePlatform: orders.sourcePlatform,
        subtotal: orders.subtotal,
        designFee: orders.designFee,
        discountAmount: orders.discountAmount,
        grandTotal: orders.grandTotal,
        paidAmount: orders.paidAmount,
        remainingAmount: orders.remainingAmount,
        paymentStatus: orders.paymentStatus,
        productionStatus: orders.productionStatus,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .leftJoin(users, eq(orders.cashierId, users.id))
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt));

    // Agregasi metrik penjualan
    let totalOmzet = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    const orderIds = ordersList.map((o) => o.id);

    for (const o of ordersList) {
      totalOmzet += o.grandTotal;
      totalPaid += o.paidAmount;
      if (o.paymentStatus === "UNPAID" || o.paymentStatus === "PARTIAL") {
        totalRemaining += o.remainingAmount;
      }
    }

    // Agregasi arus kas aktual berdasarkan paymentMethod
    const cashFlow = {
      totalCashReceived: 0,
      byMethod: {
        CASH: 0,
        TRANSFER: 0,
        QRIS: 0,
      },
    };

    if (orderIds.length > 0) {
      const paymentConditions = [inArray(payments.orderId, orderIds)];
      if (startFilterDate) {
        paymentConditions.push(gte(payments.paidAt, startFilterDate));
      }
      if (endFilterDate) {
        paymentConditions.push(lte(payments.paidAt, endFilterDate));
      }

      const paymentsList = await db
        .select({
          amount: payments.amount,
          paymentMethod: payments.paymentMethod,
        })
        .from(payments)
        .where(and(...paymentConditions));

      for (const p of paymentsList) {
        cashFlow.totalCashReceived += p.amount;
        if (p.paymentMethod === "CASH") cashFlow.byMethod.CASH += p.amount;
        else if (p.paymentMethod === "TRANSFER") cashFlow.byMethod.TRANSFER += p.amount;
        else if (p.paymentMethod === "QRIS") cashFlow.byMethod.QRIS += p.amount;
      }
    }

    // Jika format CSV diminta
    if (parsedQuery.format === "csv") {
      // Catat log audit aksi ekspor laporan
      await recordAuditLog({
        userId: session.userId,
        action: "EXPORT_CSV",
        entityType: "REPORT",
        entityId: "SALES_REPORT",
        platform: session.platform,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1",
        userAgent: request.headers.get("user-agent") || undefined,
        metadata: {
          startDate: parsedQuery.startDate,
          endDate: parsedQuery.endDate,
          cashierId: effectiveCashierId,
          paymentStatus: parsedQuery.paymentStatus,
          ordersCount: ordersList.length,
          totalOmzet,
        },
      });

      const headers = [
        "Nomor Nota",
        "Tanggal (WIB)",
        "Pelanggan",
        "Telepon",
        "Kasir",
        "Platform",
        "Subtotal",
        "Biaya Desain",
        "Diskon",
        "Grand Total",
        "Nominal Dibayar",
        "Sisa Piutang",
        "Status Pembayaran",
        "Status Produksi",
      ];

      const rows = ordersList.map((o) => [
        o.invoiceNumber,
        new Date(o.createdAt).toLocaleDateString("id-ID", {
          timeZone: "Asia/Jakarta",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        o.customerNameSnapshot,
        o.customerPhoneSnapshot || "-",
        o.cashierName || "-",
        o.sourcePlatform,
        o.subtotal,
        o.designFee,
        o.discountAmount,
        o.grandTotal,
        o.paidAmount,
        o.remainingAmount,
        o.paymentStatus,
        o.productionStatus,
      ]);

      const csvContent = buildSafeCsv(headers, rows);
      const todayStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
      }).format(new Date());

      return new Response(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="laporan-penjualan-${todayStr}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // Default: JSON response
    return jsonResponse({
      summary: {
        totalOmzet,
        totalPaid,
        totalRemaining,
        ordersCount: ordersList.length,
        cashFlow,
      },
      orders: ordersList,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
