"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Receipt } from "lucide-react";
import { VendorStatusBadge } from "@/components/vendors/VendorStatusBadge";
import { EmptyStatePanel } from "@/components/ui/state-panels";
import { formatRupiah, formatShortDateTimeId } from "@/lib/format";
import { getPaymentStatusMeta } from "@/lib/orders/status-labels";
import type { ReportOrder } from "./types";

interface ReportsOrdersListProps {
  orders: ReportOrder[];
}

export function ReportsOrdersList({ orders }: ReportsOrdersListProps) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            Daftar Nota Transaksi
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 tabular-nums">
            Menampilkan {orders.length} nota pesanan sesuai filter
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyStatePanel
          icon={Receipt}
          title="Tidak ada nota yang cocok"
          description="Coba ubah rentang tanggal atau reset filter status pembayaran dan vendor."
        />
      ) : (
        <>
          <div className="space-y-3 sm:hidden">
            {orders.map((ord) => {
              const paymentMeta = getPaymentStatusMeta(ord.paymentStatus);
              const remainingVendor = Math.max(
                0,
                (ord.totalProductionCost ?? 0) - (ord.vendorPaidAmount ?? 0)
              );

              return (
                <Link
                  key={ord.id}
                  href={`/orders/detail?id=${ord.id}`}
                  className="block p-4 rounded-xl bg-muted/40 border border-border hover:bg-muted transition-colors space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-sm text-primary tracking-wide">
                      {ord.invoiceNumber}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${paymentMeta.badgeClass}`}
                    >
                      {paymentMeta.label}
                    </span>
                  </div>

                  <div className="text-sm text-foreground flex items-center justify-between gap-2">
                    <span className="font-medium truncate min-w-0">
                      {ord.customerNameSnapshot}
                    </span>
                    <span className="font-bold tabular-nums shrink-0">
                      {formatRupiah(ord.grandTotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs tabular-nums text-muted-foreground">
                    <span>Modal: {formatRupiah(ord.totalProductionCost ?? 0)}</span>
                    <span
                      className={`font-semibold ${
                        (ord.grossProfit ?? 0) < 0
                          ? "text-destructive"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      Laba: {formatRupiah(ord.grossProfit ?? 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                    <VendorStatusBadge status={ord.vendorPaymentStatus} />
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      Sisa Setor: {formatRupiah(remainingVendor)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
                    <span>Kasir: {ord.cashierName || "-"}</span>
                    <span className="tabular-nums">
                      {formatShortDateTimeId(ord.createdAt)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground bg-muted/30">
                  <th className="py-3.5 px-4 font-semibold">Nota</th>
                  <th className="py-3.5 px-4 font-semibold">Tanggal</th>
                  <th className="py-3.5 px-4 font-semibold">Pelanggan</th>
                  <th className="py-3.5 px-4 font-semibold">Kasir</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Grand Total</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Modal Vendor</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Laba</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Dibayar</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Sisa Piutang</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Setoran Vendor</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((ord) => {
                  const paymentMeta = getPaymentStatusMeta(ord.paymentStatus);
                  const remainingVendor = Math.max(
                    0,
                    (ord.totalProductionCost ?? 0) - (ord.vendorPaidAmount ?? 0)
                  );

                  return (
                    <tr key={ord.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-primary font-mono whitespace-nowrap">
                        {ord.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap tabular-nums">
                        {formatShortDateTimeId(ord.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        {ord.customerNameSnapshot}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {ord.cashierName || "-"}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-foreground tabular-nums text-right whitespace-nowrap">
                        {formatRupiah(ord.grandTotal)}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground tabular-nums text-right whitespace-nowrap">
                        {formatRupiah(ord.totalProductionCost ?? 0)}
                      </td>
                      <td
                        className={`py-3.5 px-4 font-semibold tabular-nums text-right whitespace-nowrap ${
                          (ord.grossProfit ?? 0) < 0
                            ? "text-destructive"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {formatRupiah(ord.grossProfit ?? 0)}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums text-right whitespace-nowrap">
                        {formatRupiah(ord.paidAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-amber-600 dark:text-amber-400 font-semibold tabular-nums text-right whitespace-nowrap">
                        {ord.remainingAmount > 0 ? formatRupiah(ord.remainingAmount) : "-"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <VendorStatusBadge status={ord.vendorPaymentStatus} />
                          <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                            Sisa: {formatRupiah(remainingVendor)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${paymentMeta.badgeClass}`}
                        >
                          {paymentMeta.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/orders/detail?id=${ord.id}`}
                          className="text-primary hover:underline font-semibold inline-flex items-center gap-1 min-h-11 sm:min-h-9 px-2 whitespace-nowrap"
                        >
                          <span>Detail</span>
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
