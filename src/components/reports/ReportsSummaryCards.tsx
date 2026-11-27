"use client";

import React from "react";
import {
  TrendingUp,
  Banknote,
  AlertCircle,
  CreditCard,
  QrCode,
  DollarSign,
  Wallet,
} from "lucide-react";
import { formatRupiah } from "@/lib/format";
import type { ReportSummary } from "./types";

interface ReportsSummaryCardsProps {
  summary: ReportSummary;
}

export function ReportsSummaryCards({ summary }: ReportsSummaryCardsProps) {
  return (
    <div className="space-y-6">
      <section aria-label="Ringkasan penjualan dan arus kas" className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Ringkasan Penjualan &amp; Arus Kas
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2.5 text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider leading-snug">
                Total Omzet Penjualan
              </span>
              <div className="size-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <TrendingUp className="size-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
              {formatRupiah(summary.totalOmzet)}
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {summary.ordersCount} nota transaksi tercatat
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2.5 text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider leading-snug">
                Uang Masuk Aktual
              </span>
              <div className="size-10 shrink-0 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Banknote className="size-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatRupiah(summary.cashFlow.totalCashReceived)}
            </div>
            <div className="text-xs text-muted-foreground">
              Total penerimaan kas &amp; transfer
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2.5 text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider leading-snug">
                Sisa Piutang Berjalan
              </span>
              <div className="size-10 shrink-0 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <AlertCircle className="size-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {formatRupiah(summary.totalRemaining)}
            </div>
            <div className="text-xs text-muted-foreground">
              Belum terlunasi atau uang muka
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Rincian Arus Kas Masuk
            </span>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="size-4 text-emerald-500 shrink-0" />
                  Tunai (Cash):
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {formatRupiah(summary.cashFlow.byMethod.CASH)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CreditCard className="size-4 text-blue-500 shrink-0" />
                  Transfer Bank:
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {formatRupiah(summary.cashFlow.byMethod.TRANSFER)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <QrCode className="size-4 text-primary shrink-0" />
                  QRIS:
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {formatRupiah(summary.cashFlow.byMethod.QRIS)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Ringkasan modal vendor dan laba" className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Modal Vendor, Laba &amp; Setoran
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2.5 text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider leading-snug">
                Total Modal Vendor (HPP Produksi)
              </span>
              <div className="size-10 shrink-0 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Wallet className="size-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
              {formatRupiah(summary.totalProductionCost ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground">
              Akumulasi modal vendor yang harus dibayar ke percetakan pada periode filter
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2.5 text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider leading-snug">
                Total Laba Kotor (Gross Profit)
              </span>
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
                  (summary.totalGrossProfit ?? 0) < 0
                    ? "bg-destructive/10 text-destructive"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                }`}
              >
                Margin {summary.profitMarginPercent ?? 0}%
              </span>
            </div>
            <div
              className={`text-2xl sm:text-3xl font-bold tabular-nums ${
                (summary.totalGrossProfit ?? 0) < 0
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {formatRupiah(summary.totalGrossProfit ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground">
              Pendapatan bersih setelah dikurangi modal vendor &amp; potongan diskon
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2.5 text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider leading-snug">
                Sudah Disetor ke Vendor
              </span>
              <div className="size-10 shrink-0 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Banknote className="size-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatRupiah(summary.totalVendorPaid ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground">
              Realisasi setoran modal ke percetakan pada periode filter
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2.5 text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider leading-snug">
                Sisa Kewajiban Vendor
              </span>
              <div className="size-10 shrink-0 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                <AlertCircle className="size-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {formatRupiah(summary.totalVendorPayable ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground">
              Total sisa modal wajib setor ke vendor dari nota terpilih
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
