"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Banknote,
  AlertCircle,
  Clock,
  ArrowRight,
  RotateCw,
  Receipt,
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
  range: "7d" | "30d";
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

function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function formatDateShort(dateStr: string): string {
  // input "YYYY-MM-DD"
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

export default function DashboardPage() {
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<DashboardData>({
    queryKey: ["dashboard", range],
    queryFn: async () => {
      const res = await apiClient<DashboardData>(`/api/dashboard?range=${range}`);
      if (!res.success || !res.data) {
        throw new Error(res.error || "Gagal memuat data dashboard");
      }
      return res.data;
    },
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Dashboard</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            {data?.role === "KASIR"
              ? "Ringkasan operasional dan kinerja transaksi Anda hari ini"
              : "Pemantauan performa omzet toko, arus kas, dan antrean percetakan"}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {data?.role === "OWNER" && (
            <div className="inline-flex rounded-xl p-1 bg-surface-muted border border-border">
              <button
                type="button"
                onClick={() => setRange("7d")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors min-h-[36px] ${
                  range === "7d"
                    ? "bg-primary text-white shadow-xs"
                    : "text-text-muted hover:text-text"
                }`}
              >
                7 Hari
              </button>
              <button
                type="button"
                onClick={() => setRange("30d")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors min-h-[36px] ${
                  range === "30d"
                    ? "bg-primary text-white shadow-xs"
                    : "text-text-muted hover:text-text"
                }`}
              >
                30 Hari
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-text-muted hover:text-text bg-surface border border-border rounded-xl hover:bg-surface-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50"
            aria-label="Segarkan data dashboard"
          >
            <RotateCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-surface border border-border animate-pulse space-y-3"
              >
                <div className="h-4 w-24 bg-border/60 rounded" />
                <div className="h-7 w-36 bg-border/80 rounded" />
                <div className="h-3 w-28 bg-border/40 rounded" />
              </div>
            ))}
          </div>
          <div className="h-72 rounded-2xl bg-surface border border-border animate-pulse" />
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="p-6 rounded-2xl bg-danger/10 border border-danger/20 text-center space-y-3">
          <AlertCircle className="size-8 text-danger mx-auto" />
          <h2 className="text-base font-bold text-danger">Gagal Memuat Data Dashboard</h2>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            Terjadi kendala saat mengambil ringkasan analitik. Periksa koneksi Anda dan coba lagi.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 bg-danger text-white text-xs font-semibold rounded-xl hover:bg-danger/90 transition-colors min-h-[44px]"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Loaded Content */}
      {!isLoading && !isError && data && (
        <>
          {/* ============================================================= */}
          {/* 1. KPI CARDS                                                  */}
          {/* ============================================================= */}
          {data.role === "OWNER" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Omzet Toko */}
              <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-2">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="text-xs font-medium">Total Omzet ({range})</span>
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <TrendingUp className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-text tabular-nums">
                  {formatCurrency(data.kpi.totalOmzet)}
                </div>
                <div className="text-[11px] text-text-muted">
                  {data.kpi.totalOrders.toLocaleString("id-ID")} transaksi tercatat
                </div>
              </div>

              {/* Uang Masuk Aktual */}
              <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-2">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="text-xs font-medium">Uang Masuk Aktual ({range})</span>
                  <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Banknote className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">
                  {formatCurrency(data.kpi.totalCashIn)}
                </div>
                <div className="text-[11px] text-text-muted">Total kas & transfer diterima</div>
              </div>

              {/* Total Piutang */}
              <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-2">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="text-xs font-medium">Sisa Piutang Berjalan</span>
                  <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <AlertCircle className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-amber-600 tabular-nums">
                  {formatCurrency(data.kpi.totalPiutang)}
                </div>
                <div className="text-[11px] text-text-muted">Nota belum lunas atau panjar</div>
              </div>

              {/* Antrean Aktif */}
              <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-2">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="text-xs font-medium">Antrean Produksi Aktif</span>
                  <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Clock className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-blue-600 tabular-nums">
                  {data.kpi.activeQueueCount}
                </div>
                <div className="text-[11px] text-text-muted">Pesanan antre, dikerjakan & siap</div>
              </div>
            </div>
          ) : (
            /* KPI KASIR */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-2">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="text-xs font-medium">Omzet Saya Hari Ini</span>
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <TrendingUp className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-text tabular-nums">
                  {formatCurrency(data.kpi.todayOmzet)}
                </div>
                <div className="text-[11px] text-text-muted">
                  {data.kpi.todayOrdersCount} nota dibuat oleh Anda
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-2">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="text-xs font-medium">Uang Diterima Saya</span>
                  <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Banknote className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">
                  {formatCurrency(data.kpi.todayMoneyReceived)}
                </div>
                <div className="text-[11px] text-text-muted">Total setoran kasir Anda hari ini</div>
              </div>

              <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-2">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="text-xs font-medium">Antrean Toko Berjalan</span>
                  <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Clock className="size-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-blue-600 tabular-nums">
                  {data.kpi.activeQueueCount}
                </div>
                <div className="text-[11px] text-text-muted">Pesanan sedang dalam proses</div>
              </div>

              <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-medium text-text-muted">Aksi Cepat</span>
                  <p className="text-xs text-text mt-1 font-semibold">Buat Transaksi Kasir Baru</p>
                </div>
                <Link
                  href="/pos"
                  className="mt-3 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition-colors min-h-[44px]"
                >
                  <span>Buka POS</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 2. OWNER CHART & TOP PRODUCTS                                 */}
          {/* ============================================================= */}
          {data.role === "OWNER" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Daily Trend Chart (2 columns on lg) */}
              <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-surface border border-border shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-text">
                      Tren Omzet Harian (WIB)
                    </h2>
                    <p className="text-xs text-text-muted mt-0.5">
                      Distribusi nilai transaksi {range === "7d" ? "7 hari" : "30 hari"} terakhir
                    </p>
                  </div>
                </div>

                <div className="w-full h-64 sm:h-72">
                  {isMounted && data.chartTrend && data.chartTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={data.chartTrend}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="omzetGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="dateKey"
                          tickFormatter={formatDateShort}
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          axisLine={{ stroke: "#cbd5e1" }}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(val) =>
                            val >= 1000000
                              ? `${(val / 1000000).toFixed(1)}jt`
                              : val >= 1000
                              ? `${(val / 1000).toFixed(0)}rb`
                              : `${val}`
                          }
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(value: any) => [
                            formatCurrency(Number(value) || 0),
                            "Omzet",
                          ]}
                          labelFormatter={(label) => `Tanggal: ${label}`}
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            border: "none",
                            borderRadius: "0.75rem",
                            color: "#fff",
                            fontSize: "12px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="omzet"
                          stroke="#1e3a8a"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#omzetGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-text-muted">
                      Belum ada pergerakan transaksi pada periode ini
                    </div>
                  )}
                </div>
              </div>

              {/* Top 5 Products */}
              <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border shadow-xs space-y-4">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-text">Top 5 Produk</h2>
                  <p className="text-xs text-text-muted mt-0.5">Produk paling banyak diminati</p>
                </div>

                <div className="space-y-3">
                  {data.topProducts.length === 0 ? (
                    <p className="text-xs text-text-muted py-6 text-center">
                      Belum ada data produk terjual
                    </p>
                  ) : (
                    data.topProducts.map((p, idx) => (
                      <div
                        key={p.productId || idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-surface-muted/60 border border-border/50 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="size-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] shrink-0">
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <p className="font-semibold text-text truncate">{p.productName}</p>
                            <span className="text-[10px] text-text-muted">
                              {p.totalQuantity} unit/m² terjual
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-text tabular-nums shrink-0 ml-2">
                          {formatCurrency(p.totalRevenue)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* 3. RECENT TRANSACTIONS                                        */}
          {/* ============================================================= */}
          <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-text">Transaksi Terbaru</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  5 pesanan terakhir yang tercatat dalam sistem
                </p>
              </div>

              <Link
                href="/orders"
                className="text-xs font-semibold text-primary hover:text-primary-hover inline-flex items-center gap-1 min-h-[44px] items-center"
              >
                <span>Semua Pesanan</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {data.recentOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted">
                  Belum ada pesanan tercatat
                </div>
              ) : (
                data.recentOrders.map((ord) => (
                  <Link
                    key={ord.id}
                    href={`/orders/detail?id=${ord.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-surface hover:bg-surface-muted border border-border transition-colors gap-2"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="size-9 rounded-lg bg-surface-muted border border-border text-primary flex items-center justify-center shrink-0">
                        <Receipt className="size-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-text">
                            {ord.invoiceNumber}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                              ord.paymentStatus === "PAID"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : ord.paymentStatus === "PARTIAL"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-danger/10 text-danger"
                            }`}
                          >
                            {ord.paymentStatus}
                          </span>
                        </div>
                        <div className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5">
                          <span>{ord.customerNameSnapshot}</span>
                          {"cashierName" in ord && ord.cashierName && (
                            <>
                              <span>•</span>
                              <span>Kasir: {ord.cashierName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 text-right">
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-text tabular-nums">
                          {formatCurrency(ord.grandTotal)}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {new Date(ord.createdAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <ArrowRight className="size-4 text-text-muted hidden sm:block" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
