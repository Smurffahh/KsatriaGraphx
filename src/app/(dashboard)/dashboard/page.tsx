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
    totalOrders: number;
    totalCashIn: number;
    totalPiutang: number;
    activeQueueCount: number;
  };
  chartTrend: Array<{
    dateKey: string;
    omzet: number;
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
          <h2 className="text-base font-bold text-foreground">Gagal Memuat Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Terjadi kendala saat mengambil ringkasan data toko dari server.
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
          <RotateCw className="size-3.5" />
          <span>Muat Ulang Data</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Refetch Shimmer Bar jika background update */}
      <PageLoadingBanner isRefetching={isFetching && !isLoading} />

      {/* ========================================================= */}
      {/* HEADER DASHBOARD                                          */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {isOwner ? "Dashboard & Ringkasan Toko" : "Dashboard Kasir"}
            </h1>
            {isFetching && (
              <span className="size-2 rounded-full bg-primary animate-ping" title="Memperbarui data..." />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">
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
                    className={`relative z-10 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      isActive
                        ? "text-foreground font-bold"
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
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="size-9 p-0 rounded-xl"
            title="Muat ulang data"
            aria-label="Muat ulang data"
          >
            <RotateCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>

          {/* Primary CTA: + Buat Nota */}
          <Link href="/pos">
            <Button size="sm" className="gap-1.5 rounded-xl font-semibold shadow-xs">
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
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        {/* KPI 1: Omzet */}
        <m.div variants={fadeUpItem}>
          <Card className="motion-safe:hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xs transition-[transform,border-color,box-shadow] duration-150">
            <CardContent className="p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  {isOwner ? "Omzet Periode" : "Omzet Hari Ini"}
                </span>
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="size-4" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums tracking-tight">
                  <AnimatedNumber
                    value={
                      isOwner
                        ? ownerData?.kpi.totalOmzet ?? 0
                        : cashierData?.kpi.todayOmzet ?? 0
                    }
                    format="currency"
                  />
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
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
            <CardContent className="p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  {isOwner ? "Uang Masuk" : "Uang Fisik Kasir"}
                </span>
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Banknote className="size-4" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums tracking-tight">
                  <AnimatedNumber
                    value={
                      isOwner
                        ? ownerData?.kpi.totalCashIn ?? 0
                        : cashierData?.kpi.todayMoneyReceived ?? 0
                    }
                    format="currency"
                  />
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                  Pembayaran diterima
                </div>
              </div>
            </CardContent>
          </Card>
        </m.div>

        {/* KPI 3: Total Piutang (Owner) / Shift Kasir */}
        <m.div variants={fadeUpItem}>
          <Card className="motion-safe:hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-xs transition-[transform,border-color,box-shadow] duration-150">
            <CardContent className="p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  {isOwner ? "Sisa Tagihan DP" : "Transaksi Saya"}
                </span>
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <Receipt className="size-4" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums tracking-tight">
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
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                  {isOwner ? (
                    <Link href="/orders" className="hover:underline inline-flex items-center gap-0.5">
                      <span>Lihat di Pesanan</span>
                      <ArrowRight className="size-3" />
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
            <CardContent className="p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Antrean Produksi
                </span>
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                  <Clock className="size-4" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums tracking-tight">
                  <AnimatedNumber
                    value={dashboardData.kpi.activeQueueCount}
                    format="integer"
                  />{" "}
                  <span className="text-sm font-medium text-muted-foreground">pesanan</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Proses & siap ambil
                </div>
              </div>
            </CardContent>
          </Card>
        </m.div>
      </m.div>

      {/* ========================================================= */}
      {/* ROW 2: GRAFIK TREN OMZET (2/3) & TOP PRODUK (1/3)          */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Kolom Kiri 2/3: Grafik Tren Omzet */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold">Tren Penjualan</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isOwner
                  ? `Pergerakan omzet harian (${range === "1d" ? "Hari Ini" : range === "7d" ? "7 Hari Terakhir" : "30 Hari Terakhir"})`
                  : "Grafik omzet kasir"}
              </p>
            </div>
            {isOwner && ownerData?.chartTrend && ownerData.chartTrend.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {ownerData.chartTrend.length} hari data
              </Badge>
            )}
          </CardHeader>
          <CardContent className="pt-2">
            {isOwner && ownerData?.chartTrend && ownerData.chartTrend.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={ownerData.chartTrend}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
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
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      axisLine={{ stroke: "var(--border)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={formatCompactRupiah}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload as {
                            dateKey: string;
                            omzet: number;
                            transaksi: number;
                          };
                          return (
                            <div className="rounded-lg border border-border bg-popover text-popover-foreground p-3 shadow-md text-xs space-y-1">
                              <p className="font-semibold text-foreground">
                                {formatDateLabel(item.dateKey)}
                              </p>
                              <p className="font-bold text-primary tabular-nums text-sm">
                                {formatRupiah(item.omzet)}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
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
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <Layers className="size-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs font-semibold text-foreground">Belum ada grafik penjualan</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                  Transaksi yang disimpan melalui kasir akan otomatis terekam ke dalam grafik tren.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kolom Kanan 1/3: Top Produk Terlaris / Status Ringkas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold">
                {isOwner ? "Produk Terlaris" : "Status Produksi"}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isOwner ? "Berdasarkan omzet periode" : "Pesanan berjalan di toko"}
              </p>
            </div>
            {isOwner && (
              <Link href="/products" className="text-xs text-primary hover:underline font-semibold">
                Katalog
              </Link>
            )}
          </CardHeader>
          <CardContent className="pt-2">
            {isOwner && ownerData?.topProducts && ownerData.topProducts.length > 0 ? (
              <div className="space-y-3.5">
                {ownerData.topProducts.map((p, idx) => {
                  const maxRevenue = ownerData.topProducts[0]?.totalRevenue || 1;
                  const percent = Math.min(100, Math.round((p.totalRevenue / maxRevenue) * 100));

                  return (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground truncate max-w-[150px]">
                          {p.productName}
                        </span>
                        <span className="font-bold text-foreground tabular-nums">
                          {formatRupiah(p.totalRevenue)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <m.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: percent / 100 }}
                          transition={{ delay: 0.08 + idx * 0.04, duration: 0.45, ease: EASE_SMOOTH }}
                          className="h-full bg-primary rounded-full origin-left"
                          style={{ width: "100%" }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {p.totalQuantity} pcs terjual
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                <ShoppingBag className="size-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs font-semibold text-foreground">Belum ada data produk</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Produk terlaris akan dihitung otomatis dari transaksi nota kasir.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========================================================= */}
      {/* ROW 3: TRANSAKSI TERBARU (RESPONSIVE TABLE / CARD LIST)   */}
      {/* ========================================================= */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold">Transaksi Terbaru</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              5 transaksi terakhir yang tercatat di sistem
            </p>
          </div>
          <Link href="/orders">
            <Button variant="ghost" size="sm" className="gap-1 text-xs font-semibold group">
              <span>Semua Pesanan</span>
              <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform duration-150" />
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
                        <TableCell className="font-mono font-bold text-foreground">
                          {order.invoiceNumber}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {order.customerNameSnapshot}
                        </TableCell>
                        <TableCell>{getPaymentBadge(order.paymentStatus)}</TableCell>
                        <TableCell>{getProductionBadge(order.productionStatus)}</TableCell>
                        <TableCell className="text-right font-bold tabular-nums text-foreground">
                          {formatRupiah(order.grandTotal)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/orders/detail?id=${order.id}`}>
                            <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1">
                              <span>Detail</span>
                              <ArrowUpRight className="size-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" />
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
                    className="block py-3 first:pt-0 last:pb-0 hover:bg-muted/40 transition-colors rounded-xl px-2 -mx-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-xs text-foreground">
                        {order.invoiceNumber}
                      </span>
                      <span className="font-bold text-xs text-foreground tabular-nums">
                        {formatRupiah(order.grandTotal)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                      <span className="truncate max-w-[180px]">
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
              <Receipt className="size-8 text-muted-foreground/40 mx-auto" />
              <div>
                <p className="text-xs font-semibold text-foreground">Belum ada transaksi</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Mulai catat transaksi penjualan baru dengan membuka kalkulator kasir.
                </p>
              </div>
              <Link href="/pos">
                <Button size="sm" className="gap-1.5">
                  <Plus className="size-3.5" />
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
