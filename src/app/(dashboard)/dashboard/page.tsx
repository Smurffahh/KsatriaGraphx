"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { m } from "motion/react";
import {
  TrendingUp,
  Banknote,
  Receipt,
  Clock,
  ArrowRight,
  RotateCw,
  Plus,
  Layers,
  ArrowUpRight,
  AlertCircle,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { apiClient } from "@/lib/api/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoadingBanner } from "@/components/ui/page-loading-banner";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { formatRupiah } from "@/lib/utils";
import { staggerContainer, fadeUpItem, EASE_SMOOTH } from "@/lib/motion";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

interface CashierDashboardData {
  role: "KASIR";
  kpi: {
    todayOmzet: number;
    todayOrdersCount: number;
    todayMoneyReceived: number;
    activeQueueCount: number;
  };
  recentOrders: Array<{
    id: string;
    invoiceNumber: string;
    customerNameSnapshot: string;
    grandTotal: number;
    paidAmount: number;
    remainingAmount: number;
    paymentStatus: string;
    productionStatus: string;
    createdAt: string;
  }>;
}

interface OwnerDashboardData {
  role: "OWNER";
  range: "1d" | "7d" | "30d";
  kpi: {
    totalOmzet: number;
    totalProductionCost: number;
    totalGrossProfit: number;
    profitMarginPercent: number;
    totalOrders: number;
    totalCashIn: number;
    totalPiutang: number;
    unpaidVendorTotal?: number;
    unpaidVendorOrderCount?: number;
    vendorPaidInPeriod?: number;
    netAvailableCashEstimate?: number;
    activeQueueCount: number;
  };
  chartTrend: Array<{
    dateKey: string;
    omzet: number;
    modal?: number;
    laba?: number;
    transaksi: number;
  }>;
  topProducts: Array<{
    productId: string | null;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  recentOrders: Array<{
    id: string;
    invoiceNumber: string;
    customerNameSnapshot: string;
    cashierName: string | null;
    grandTotal: number;
    paidAmount: number;
    remainingAmount: number;
    paymentStatus: string;
    productionStatus: string;
    createdAt: string;
  }>;
}

type DashboardData = CashierDashboardData | OwnerDashboardData;

function formatCompactRupiah(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)} rb`;
  }
  return value.toString();
}

function formatDateLabel(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

function getPaymentBadge(status: string) {
  switch (status) {
    case "PAID":
      return <Badge variant="success">Lunas</Badge>;
    case "PARTIAL":
      return <Badge variant="warning">DP / Sebagian</Badge>;
    case "UNPAID":
      return <Badge variant="destructive">Belum Bayar</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getProductionBadge(status: string) {
  switch (status) {
    case "QUEUED":
      return <Badge variant="secondary">Antrean</Badge>;
    case "IN_PROGRESS":
      return <Badge variant="info">Proses Cetak</Badge>;
    case "READY":
      return <Badge variant="success">Siap Ambil</Badge>;
    case "COMPLETED":
      return <Badge variant="outline">Selesai</Badge>;
    case "CANCELLED":
      return <Badge variant="destructive">Dibatalkan</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <PageLoadingBanner message="Memuat ringkasan performa toko..." />

      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-44 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* 4 KPI Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>

      {/* Charts & Top Products Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>

      {/* Recent Orders Skeleton */}
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

export default function DashboardPage() {
  const [range, setRange] = useState<"1d" | "7d" | "30d">("7d");

  const {
    data: response,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["dashboard", range],
    queryFn: () =>
      apiClient.get<DashboardData>(`/api/dashboard?range=${range}`),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const dashboardData = response?.data;
  const isOwner = dashboardData?.role === "OWNER";
  const ownerData = isOwner ? (dashboardData as OwnerDashboardData) : null;
  const cashierData = !isOwner ? (dashboardData as CashierDashboardData) : null;

  const formattedToday = useMemo(() => {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "full",
      timeZone: "Asia/Jakarta",
    }).format(new Date());
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !dashboardData) {
    return (
      <div className="p-6 sm:p-12 text-center max-w-md mx-auto space-y-4">
        <div className="size-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="size-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Gagal Memuat Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Terjadi kendala saat mengambil ringkasan data toko dari server.
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RotateCw className="size-4" />
          <span>Muat Ulang Data</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Top Refetch Shimmer Bar jika background update */}
      <PageLoadingBanner isRefetching={isFetching && !isLoading} />

      {/* ========================================================= */}
      {/* HEADER DASHBOARD                                          */}
      {/* ========================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground">
              {isOwner ? "Dashboard & Ringkasan Toko" : "Dashboard Kasir"}
            </h1>
            {isFetching && (
              <span className="size-2 rounded-full bg-primary animate-ping" title="Memperbarui data..." />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            {formattedToday}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Filter Range Periode Bergeser Mulus (Owner) */}
          {isOwner && (
            <div className="inline-flex rounded-xl bg-muted p-1 border border-border/80 relative">
              {(["1d", "7d", "30d"] as const).map((r) => {
                const isActive = range === r;
                const label = r === "1d" ? "Hari Ini" : r === "7d" ? "7 Hari" : "30 Hari";
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={`relative z-10 min-h-10 sm:min-h-9 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                      isActive
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isActive && (
                      <m.span
                        layoutId="dashboard-period-indicator"
                        className="absolute inset-0 z-[-1] rounded-lg bg-card shadow-xs border border-border/40"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Tombol Refresh */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl"
            title="Muat ulang data"
            aria-label="Muat ulang data"
          >
            <RotateCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>

          {/* Primary CTA: + Buat Nota */}
          <Link href="/pos">
            <Button className="gap-2 rounded-xl font-semibold shadow-xs">
              <Plus className="size-4" />
              <span>Buat Nota</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ROW 1: 4 KARTU KPI TERSTRUKTUR DENGAN ANIMATED NUMBER      */}
      {/* ========================================================= */}
      <m.div
        variants={staggerContainer(0.045)}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5"
      >
        {/* KPI 1: Omzet */}
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

        {/* KPI 2: Uang Masuk Aktual */}
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

        {/* KPI 3: Total Piutang (Owner) / Shift Kasir */}
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
                    <Link href="/orders" className="hover:underline inline-flex items-center gap-1 min-h-9 -my-1.5">
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

        {/* KPI 4: Antrean Produksi Aktif */}
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
                  <AnimatedNumber
                    value={dashboardData.kpi.activeQueueCount}
                    format="integer"
                  />{" "}
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

      {/* ========================================================= */}
      {/* ROW 1.5: RINGKASAN MODAL VENDOR & LABA BERSIH (OWNER)    */}
      {/* ========================================================= */}
      {isOwner && ownerData && (
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
                    className="hover:underline inline-flex items-center gap-1 min-h-9 -my-1.5"
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
                <div className="text-xs text-muted-foreground mt-1.5 tabular-nums">
                  Kas masuk dikurangi wajib setor vendor (Sudah setor: {formatRupiah(ownerData.kpi.vendorPaidInPeriod ?? 0)})
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* ROW 2: GRAFIK TREN OMZET & TOP PRODUK (OWNER ONLY)        */}
      {/* ========================================================= */}
      {isOwner && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Kolom Kiri 2/3: Grafik Tren Omzet */}
        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-3 pb-3">
            <div>
              <CardTitle>Tren Penjualan</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {`Pergerakan omzet harian (${range === "1d" ? "Hari Ini" : range === "7d" ? "7 Hari Terakhir" : "30 Hari Terakhir"})`}
              </p>
            </div>
            {ownerData?.chartTrend && ownerData.chartTrend.length > 0 && (
              <Badge variant="outline" className="shrink-0 whitespace-nowrap">
                {ownerData.chartTrend.length} hari data
              </Badge>
            )}
          </CardHeader>
          <CardContent className="pt-2">
            {ownerData?.chartTrend && ownerData.chartTrend.length > 0 ? (
              <div className="h-[280px] sm:h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={ownerData.chartTrend}
                    margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="omzetGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--border)"
                      opacity={0.6}
                    />
                    <XAxis
                      dataKey="dateKey"
                      tickFormatter={formatDateLabel}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                      axisLine={{ stroke: "var(--border)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={formatCompactRupiah}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload as {
                            dateKey: string;
                            omzet: number;
                            modal?: number;
                            laba?: number;
                            transaksi: number;
                          };
                          return (
                            <div className="rounded-xl border border-border bg-popover text-popover-foreground p-3.5 shadow-md text-xs space-y-1">
                              <p className="font-semibold text-foreground">
                                {formatDateLabel(item.dateKey)}
                              </p>
                              <p className="font-bold text-primary tabular-nums text-base">
                                {formatRupiah(item.omzet)}
                              </p>
                              {typeof item.modal === "number" && typeof item.laba === "number" && (
                                <div className="space-y-0.5 pt-0.5 border-t border-border/60 tabular-nums">
                                  <p className="text-muted-foreground">
                                    Modal: {formatRupiah(item.modal)}
                                  </p>
                                  <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    Laba: {formatRupiah(item.laba)}
                                  </p>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {item.transaksi} transaksi tercatat
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="omzet"
                      stroke="var(--chart-1)"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#omzetGradient)"
                      isAnimationActive={true}
                      animationDuration={450}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] sm:h-[320px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <Layers className="size-9 text-muted-foreground/40 mb-2.5" />
                <p className="text-sm font-semibold text-foreground">Belum ada grafik penjualan</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                  Transaksi yang disimpan melalui kasir akan otomatis terekam ke dalam grafik tren.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kolom Kanan 1/3: Top Produk Terlaris */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-2 pb-3">
            <div>
              <CardTitle>Produk Terlaris</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Berdasarkan omzet periode
              </p>
            </div>
            <Link href="/products" className="inline-flex min-h-9 items-center text-sm text-primary hover:underline font-medium shrink-0">
              Katalog
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            {ownerData?.topProducts && ownerData.topProducts.length > 0 ? (
              <div className="space-y-4">
                {ownerData.topProducts.map((p, idx) => {
                  const maxRevenue = ownerData.topProducts[0]?.totalRevenue || 1;
                  const percent = Math.min(100, Math.round((p.totalRevenue / maxRevenue) * 100));

                  return (
                    <div key={idx} className="space-y-1.5 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-foreground truncate min-w-0">
                          {p.productName}
                        </span>
                        <span className="font-semibold text-foreground tabular-nums shrink-0">
                          {formatRupiah(p.totalRevenue)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <m.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: percent / 100 }}
                          transition={{ delay: 0.08 + idx * 0.04, duration: 0.45, ease: EASE_SMOOTH }}
                          className="h-full bg-primary rounded-full origin-left"
                          style={{ width: "100%" }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p.totalQuantity} pcs terjual
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-60 flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                <ShoppingBag className="size-9 text-muted-foreground/40 mb-2.5" />
                <p className="text-sm font-semibold text-foreground">Belum ada data produk</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Produk terlaris akan dihitung otomatis dari transaksi nota kasir.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {/* ========================================================= */}
      {/* ROW 3: TRANSAKSI TERBARU (RESPONSIVE TABLE / CARD LIST)   */}
      {/* ========================================================= */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle>Transaksi Terbaru</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              5 transaksi terakhir yang tercatat di sistem
            </p>
          </div>
          <Link href="/orders">
            <Button variant="ghost" className="gap-1.5 text-sm font-semibold group shrink-0">
              <span>Semua Pesanan</span>
              <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform duration-150" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          {dashboardData.recentOrders && dashboardData.recentOrders.length > 0 ? (
            <>
              {/* Desktop View (md+): Table shadcn/ui */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Nota</TableHead>
                      <TableHead>Pelanggan</TableHead>
                      <TableHead>Status Bayar</TableHead>
                      <TableHead>Status Produksi</TableHead>
                      <TableHead className="text-right">Grand Total</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.recentOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-muted/50 group">
                        <TableCell className="font-mono font-semibold text-foreground">
                          {order.invoiceNumber}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {order.customerNameSnapshot}
                        </TableCell>
                        <TableCell>{getPaymentBadge(order.paymentStatus)}</TableCell>
                        <TableCell>{getProductionBadge(order.productionStatus)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-foreground">
                          {formatRupiah(order.grandTotal)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/orders/detail?id=${order.id}`}>
                            <Button variant="outline" size="sm" className="gap-1.5">
                              <span>Detail</span>
                              <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View (< md): Stacked Card List */}
              <div className="md:hidden divide-y divide-border/60">
                {dashboardData.recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/detail?id=${order.id}`}
                    className="block py-3.5 first:pt-1 last:pb-1 hover:bg-muted/40 transition-colors rounded-xl px-2.5 -mx-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-sm text-foreground">
                        {order.invoiceNumber}
                      </span>
                      <span className="font-semibold text-sm text-foreground tabular-nums">
                        {formatRupiah(order.grandTotal)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mt-1.5">
                      <span className="truncate min-w-0">
                        {order.customerNameSnapshot}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {getPaymentBadge(order.paymentStatus)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="py-12 text-center space-y-3">
              <Receipt className="size-9 text-muted-foreground/40 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-foreground">Belum ada transaksi</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Mulai catat transaksi penjualan baru dengan membuka kalkulator kasir.
                </p>
              </div>
              <Link href="/pos">
                <Button className="gap-2">
                  <Plus className="size-4" />
                  <span>Kalkulator POS</span>
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
