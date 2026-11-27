"use client";

import React from "react";
import Link from "next/link";
import { m } from "motion/react";
import {
  TrendingUp,
  Banknote,
  Receipt,
  Clock,
  ArrowRight,
  Wallet,
  Calculator,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { formatRupiah } from "@/lib/format";
import { staggerContainer, fadeUpItem } from "@/lib/motion";
import type { CashierDashboardData, OwnerDashboardData } from "./types";

interface DashboardKpiSectionProps {
  isOwner: boolean;
  ownerData: OwnerDashboardData | null;
  cashierData: CashierDashboardData | null;
  activeQueueCount: number;
}

export function DashboardKpiSection({
  isOwner,
  ownerData,
  cashierData,
  activeQueueCount,
}: DashboardKpiSectionProps) {
  return (
    <div className="space-y-6">
      {!isOwner && (
        <section aria-label="Pintasan cepat kasir" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/pos"
            className="flex items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/8 px-4 py-3.5 min-h-14 hover:bg-primary/12 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Calculator className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Transaksi Baru</p>
                <p className="text-xs text-muted-foreground truncate">
                  Buka kasir &amp; hitung pesanan pelanggan
                </p>
              </div>
            </div>
            <ArrowRight className="size-4 text-primary shrink-0" />
          </Link>

          <Link
            href="/orders"
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 min-h-14 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                <ClipboardList className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Cek Pesanan</p>
                <p className="text-xs text-muted-foreground truncate">
                  Pantau antrean cetak &amp; pelunasan DP
                </p>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground shrink-0" />
          </Link>
        </section>
      )}

      <section aria-label="Performa penjualan" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isOwner ? "Performa Penjualan" : "Ringkasan Shift Hari Ini"}
          </h2>
        </div>

        <m.div
          variants={staggerContainer(0.045)}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5"
        >
          <m.div variants={fadeUpItem}>
            <Card className="motion-safe:hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xs transition-[transform,border-color,box-shadow] duration-150">
              <CardContent className="p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {isOwner ? "Omzet Periode" : "Omzet Hari Ini"}
                  </span>
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <TrendingUp className="size-5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums tracking-tight">
                    <AnimatedNumber
                      value={
                        isOwner
                          ? ownerData?.kpi.totalOmzet ?? 0
                          : cashierData?.kpi.todayOmzet ?? 0
                      }
                      format="currency"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5">
                    <AnimatedNumber
                      value={
                        isOwner
                          ? ownerData?.kpi.totalOrders ?? 0
                          : cashierData?.kpi.todayOrdersCount ?? 0
                      }
                      format="integer"
                      suffix={isOwner ? " nota transaksi" : " nota dicetak"}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </m.div>

          <m.div variants={fadeUpItem}>
            <Card className="motion-safe:hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-xs transition-[transform,border-color,box-shadow] duration-150">
              <CardContent className="p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {isOwner ? "Uang Masuk" : "Uang Fisik Kasir"}
                  </span>
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                    <Banknote className="size-5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums tracking-tight">
                    <AnimatedNumber
                      value={
                        isOwner
                          ? ownerData?.kpi.totalCashIn ?? 0
                          : cashierData?.kpi.todayMoneyReceived ?? 0
                      }
                      format="currency"
                    />
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1.5">
                    Pembayaran diterima
                  </div>
                </div>
              </CardContent>
            </Card>
          </m.div>

          <m.div variants={fadeUpItem}>
            <Card className="motion-safe:hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-xs transition-[transform,border-color,box-shadow] duration-150">
              <CardContent className="p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {isOwner ? "Sisa Tagihan DP" : "Transaksi Saya"}
                  </span>
                  <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                    <Receipt className="size-5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums tracking-tight">
                    {isOwner ? (
                      <AnimatedNumber
                        value={ownerData?.kpi.totalPiutang ?? 0}
                        format="currency"
                      />
                    ) : (
                      <AnimatedNumber
                        value={cashierData?.kpi.todayOrdersCount ?? 0}
                        format="integer"
                        suffix=" Transaksi"
                      />
                    )}
                  </div>
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1.5">
                    {isOwner ? (
                      <Link
                        href="/orders"
                        className="hover:underline inline-flex items-center gap-1 min-h-11 -my-2"
                      >
                        <span>Lihat di Pesanan</span>
                        <ArrowRight className="size-3.5" />
                      </Link>
                    ) : (
                      "Shift kerja aktif"
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </m.div>

          <m.div variants={fadeUpItem}>
            <Card className="motion-safe:hover:-translate-y-0.5 hover:border-blue-500/40 hover:shadow-xs transition-[transform,border-color,box-shadow] duration-150">
              <CardContent className="p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Antrean Produksi
                  </span>
                  <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                    <Clock className="size-5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums tracking-tight">
                    <AnimatedNumber value={activeQueueCount} format="integer" />{" "}
                    <span className="text-sm font-medium text-muted-foreground">pesanan</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5">
                    Proses &amp; siap ambil
                  </div>
                </div>
              </CardContent>
            </Card>
          </m.div>
        </m.div>
      </section>

      {isOwner && ownerData && (
        <section aria-label="Kesehatan kas dan kewajiban vendor" className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Kesehatan Kas &amp; Kewajiban Vendor
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
            <Card className="motion-safe:hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-xs transition-[transform,border-color,box-shadow] duration-150">
              <CardContent className="p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Total Modal Vendor (HPP)
                  </span>
                  <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Wallet className="size-5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums tracking-tight">
                    <AnimatedNumber
                      value={ownerData.kpi.totalProductionCost ?? 0}
                      format="currency"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5">
                    Biaya produksi periode terpilih
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="motion-safe:hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-xs transition-[transform,border-color,box-shadow] duration-150">
              <CardContent className="p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between gap-2 text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Estimasi Laba Bersih
                  </span>
                  <Badge
                    variant={
                      (ownerData.kpi.totalGrossProfit ?? 0) < 0 ? "destructive" : "success"
                    }
                    className="tabular-nums shrink-0"
                  >
                    Margin {ownerData.kpi.profitMarginPercent ?? 0}%
                  </Badge>
                </div>
                <div>
                  <div
                    className={`text-2xl sm:text-3xl font-bold tabular-nums tracking-tight ${
                      (ownerData.kpi.totalGrossProfit ?? 0) < 0
                        ? "text-destructive"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    <AnimatedNumber
                      value={ownerData.kpi.totalGrossProfit ?? 0}
                      format="currency"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5">
                    Laba bersih setelah modal vendor &amp; diskon
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="motion-safe:hover:-translate-y-0.5 hover:border-destructive/40 hover:shadow-xs transition-[transform,border-color,box-shadow] duration-150">
              <CardContent className="p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between gap-2 text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Wajib Setor ke Vendor
                  </span>
                  <Badge variant="warning" className="tabular-nums shrink-0">
                    {ownerData.kpi.unpaidVendorOrderCount ?? 0} nota pending
                  </Badge>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">
                    <AnimatedNumber
                      value={ownerData.kpi.unpaidVendorTotal ?? 0}
                      format="currency"
                    />
                  </div>
                  <div className="text-xs text-primary font-medium mt-1.5">
                    <Link
                      href="/orders?vendorPaymentStatus=UNPAID"
                      className="hover:underline inline-flex items-center gap-1 min-h-11 -my-2"
                    >
                      <span>Kelola Setoran Vendor</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="motion-safe:hover:-translate-y-0.5 hover:border-blue-500/40 hover:shadow-xs transition-[transform,border-color,box-shadow] duration-150">
              <CardContent className="p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between gap-2 text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Estimasi Kas Tersedia
                  </span>
                  <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                    <Banknote className="size-5" />
                  </div>
                </div>
                <div>
                  <div
                    className={`text-2xl sm:text-3xl font-bold tabular-nums tracking-tight ${
                      (ownerData.kpi.netAvailableCashEstimate ?? 0) < 0
                        ? "text-destructive"
                        : "text-foreground"
                    }`}
                  >
                    <AnimatedNumber
                      value={ownerData.kpi.netAvailableCashEstimate ?? 0}
                      format="currency"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5 tabular-nums leading-relaxed">
                    Uang masuk dikurangi sisa kewajiban vendor belum dibayar (Sudah setor:{" "}
                    {formatRupiah(ownerData.kpi.vendorPaidInPeriod ?? 0)})
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
