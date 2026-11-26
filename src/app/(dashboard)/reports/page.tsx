"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  Filter,
  TrendingUp,
  Banknote,
  AlertCircle,
  Receipt,
  ArrowRight,
  RotateCw,
  CreditCard,
  QrCode,
  DollarSign,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoadingBanner } from "@/components/ui/page-loading-banner";
import { Button } from "@/components/ui/button";

interface ReportSummary {
  totalOmzet: number;
  totalPaid: number;
  totalRemaining: number;
  ordersCount: number;
  cashFlow: {
    totalCashReceived: number;
    byMethod: {
      CASH: number;
      TRANSFER: number;
      QRIS: number;
    };
  };
}

interface ReportOrder {
  id: string;
  invoiceNumber: string;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string | null;
  cashierId: string;
  cashierName: string | null;
  sourcePlatform: "WEB" | "APK";
  subtotal: number;
  designFee: number;
  discountAmount: number;
  grandTotal: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
  productionStatus: string;
  createdAt: string;
}

interface ReportResponse {
  summary: ReportSummary;
  orders: ReportOrder[];
}

interface UserListItem {
  id: string;
  name: string;
  role: "OWNER" | "KASIR";
}

function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <PageLoadingBanner message="Memuat laporan omzet..." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-3"
          >
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-36 rounded-md" />
            <Skeleton className="h-3 w-24 rounded-md" />
          </div>
        ))}
      </div>

      <div className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
        <Skeleton className="h-6 w-48 rounded-md" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    role: "OWNER" | "KASIR";
  } | null>(null);
  const [cashierList, setCashierList] = useState<UserListItem[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<
    "today" | "7d" | "month" | "custom"
  >("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCashier, setSelectedCashier] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<
    "ALL" | "PAID" | "PARTIAL" | "UNPAID"
  >("ALL");
  const [isExporting, setIsExporting] = useState(false);

  // Set default filter to today
  useEffect(() => {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
    }).format(new Date());
    setStartDate(today);
    setEndDate(today);
  }, []);

  // Fetch current user & cashier list if owner, redirect if kasir
  useEffect(() => {
    apiClient<{ user: { role: "OWNER" | "KASIR" } }>("/api/auth/me")
      .then((res) => {
        if (res.success && res.data?.user) {
          if (res.data.user.role === "KASIR") {
            toast.error("Akses ditolak: Laporan Omzet hanya dapat diakses oleh Pemilik Usaha (Owner).");
            router.replace("/dashboard");
            return;
          }
          setCurrentUser(res.data.user);
          if (res.data.user.role === "OWNER") {
            apiClient<{ users: UserListItem[] }>("/api/users")
              .then((uRes) => {
                if (uRes.success && uRes.data?.users) {
                  setCashierList(uRes.data.users);
                }
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, [router]);

  // Preset Date Handlers
  const handlePresetChange = (preset: "today" | "7d" | "month" | "custom") => {
    setSelectedPreset(preset);
    const now = new Date();
    const formatDate = (d: Date) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);

    if (preset === "today") {
      const today = formatDate(now);
      setStartDate(today);
      setEndDate(today);
    } else if (preset === "7d") {
      const past7 = new Date();
      past7.setDate(now.getDate() - 6);
      setStartDate(formatDate(past7));
      setEndDate(formatDate(now));
    } else if (preset === "month") {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      setStartDate(`${year}-${month}-01`);
      setEndDate(formatDate(now));
    }
  };

  // Fetch reports data via TanStack Query
  const { data, isLoading, isError, refetch, isFetching } =
    useQuery<ReportResponse>({
      queryKey: [
        "reports",
        startDate,
        endDate,
        selectedCashier,
        paymentStatus,
      ],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
        if (selectedCashier) params.set("cashierId", selectedCashier);
        if (paymentStatus !== "ALL")
          params.set("paymentStatus", paymentStatus);

        const res = await apiClient.get<ReportResponse>(
          `/api/reports?${params.toString()}`
        );
        if (!res.success || !res.data) {
          throw new Error(res.error || "Gagal mengambil data laporan omzet");
        }
        return res.data;
      },
      enabled: Boolean(startDate && endDate) && currentUser?.role === "OWNER",
      staleTime: 60 * 1000,
    });

  // Export to CSV Function
  const handleExportCsv = async () => {
    if (!data || data.orders.length === 0) {
      toast.error("Tidak ada data transaksi yang dapat diexport");
      return;
    }

    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (selectedCashier) params.set("cashierId", selectedCashier);
      if (paymentStatus !== "ALL") params.set("paymentStatus", paymentStatus);

      const endpoint = `/api/reports/export?${params.toString()}`;
      const res = await fetch(endpoint, {
        headers: { Accept: "text/csv" },
      });

      if (!res.ok) {
        throw new Error("Gagal mengunduh file CSV dari server");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Omzet_KsatriaGraphx_${startDate}_sd_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Laporan penjualan berhasil diekspor ke CSV!");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Terjadi kesalahan saat ekspor CSV";
      toast.error(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const isOwner = currentUser?.role === "OWNER";

  return (
    <div className="space-y-6">
      <PageLoadingBanner isRefetching={isFetching && !isLoading} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground">
            Laporan Penjualan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analisis omzet percetakan, arus kas harian, dan unduh data transaksi
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <Button
            type="button"
            onClick={handleExportCsv}
            disabled={
              isExporting || isLoading || (data?.orders.length ?? 0) === 0
            }
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
          >
            <Download className="size-4" />
            <span>
              {isExporting ? "Menyiapkan CSV..." : "Export CSV (Excel Safe)"}
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="min-h-[44px] min-w-[44px]"
            aria-label="Segarkan laporan"
          >
            <RotateCw
              className={`size-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Filter className="size-4" />
          <span>Filter Laporan</span>
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {(["today", "7d", "month", "custom"] as const).map((p) => {
            const labels = {
              today: "Hari Ini",
              "7d": "7 Hari Terakhir",
              month: "Bulan Ini",
              custom: "Kustom",
            };
            return (
              <button
                key={p}
                type="button"
                onClick={() => handlePresetChange(p)}
                className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl border transition-colors min-h-10 cursor-pointer ${
                  selectedPreset === p
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                    : "bg-muted/60 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {/* Tanggal Mulai */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setSelectedPreset("custom");
                setStartDate(e.target.value);
              }}
              className="h-11 w-full px-3.5 text-base sm:text-sm bg-muted/50 border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Tanggal Sampai */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setSelectedPreset("custom");
                setEndDate(e.target.value);
              }}
              className="h-11 w-full px-3.5 text-base sm:text-sm bg-muted/50 border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Filter Status Bayar */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
              Status Pembayaran
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as any)}
              className="h-11 w-full px-3.5 text-base sm:text-sm bg-muted/50 border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">Semua Status</option>
              <option value="PAID">LUNAS (Paid)</option>
              <option value="PARTIAL">PANJAR (Partial)</option>
              <option value="UNPAID">BELUM BAYAR (Unpaid)</option>
            </select>
          </div>

          {/* Filter Kasir (Eksklusif Owner) */}
          {isOwner && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                Filter Kasir
              </label>
              <select
                value={selectedCashier}
                onChange={(e) => setSelectedCashier(e.target.value)}
                className="h-11 w-full px-3.5 text-base sm:text-sm bg-muted/50 border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <option value="">Semua Kasir Toko</option>
                {cashierList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.role})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && <ReportsSkeleton />}

      {/* Error Banner */}
      {isError && (
        <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-center space-y-2.5">
          <AlertCircle className="size-7 text-destructive mx-auto" />
          <p className="text-sm text-destructive font-semibold">
            Gagal memuat data laporan
          </p>
          <Button
            variant="destructive"
            onClick={() => refetch()}
            className="min-h-10"
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Report Loaded Content */}
      {!isLoading && !isError && data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Total Omzet */}
            <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-2.5">
              <div className="flex items-center justify-between gap-2.5 text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider leading-snug">Total Omzet Penjualan</span>
                <div className="size-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <TrendingUp className="size-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
                {formatCurrency(data.summary.totalOmzet)}
              </div>
              <div className="text-xs text-muted-foreground">
                {data.summary.ordersCount} nota transaksi tercatat
              </div>
            </div>

            {/* Uang Masuk Aktual */}
            <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-2.5">
              <div className="flex items-center justify-between gap-2.5 text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider leading-snug">Uang Masuk Aktual</span>
                <div className="size-10 shrink-0 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Banknote className="size-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-emerald-600 tabular-nums">
                {formatCurrency(data.summary.cashFlow.totalCashReceived)}
              </div>
              <div className="text-xs text-muted-foreground">
                Total penerimaan kas &amp; transfer
              </div>
            </div>

            {/* Sisa Piutang */}
            <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-2.5">
              <div className="flex items-center justify-between gap-2.5 text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider leading-snug">Sisa Piutang Berjalan</span>
                <div className="size-10 shrink-0 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="size-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-amber-600 tabular-nums">
                {formatCurrency(data.summary.totalRemaining)}
              </div>
              <div className="text-xs text-muted-foreground">
                Belum terlunasi atau uang muka
              </div>
            </div>

            {/* Arus Kas Per Metode */}
            <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Rincian Arus Kas Masuk
              </span>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="size-4 text-emerald-500" />
                    Tunai (Cash):
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatCurrency(data.summary.cashFlow.byMethod.CASH)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <CreditCard className="size-4 text-blue-500" />
                    Transfer Bank:
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatCurrency(data.summary.cashFlow.byMethod.TRANSFER)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <QrCode className="size-4 text-purple-500" />
                    QRIS:
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatCurrency(data.summary.cashFlow.byMethod.QRIS)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Orders Table & Mobile Cards */}
          <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-foreground">
                  Daftar Nota Transaksi
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Menampilkan {data.orders.length} nota pesanan sesuai filter
                </p>
              </div>
            </div>

            {data.orders.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
                <Receipt className="size-9 mx-auto text-muted-foreground/60" />
                <p>
                  Tidak ada transaksi ditemukan pada periode atau filter yang
                  dipilih.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Cards (<640px) */}
                <div className="space-y-3 sm:hidden">
                  {data.orders.map((ord) => (
                    <Link
                      key={ord.id}
                      href={`/orders/detail?id=${ord.id}`}
                      className="block p-4 rounded-xl bg-muted/40 border border-border hover:bg-muted transition-colors space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-primary tracking-wide">
                          {ord.invoiceNumber}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 text-xs font-semibold rounded-md ${
                            ord.paymentStatus === "PAID"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : ord.paymentStatus === "PARTIAL"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {ord.paymentStatus}
                        </span>
                      </div>

                      <div className="text-sm text-foreground flex items-center justify-between gap-2">
                        <span className="font-medium truncate">
                          {ord.customerNameSnapshot}
                        </span>
                        <span className="font-bold tabular-nums shrink-0">
                          {formatCurrency(ord.grandTotal)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
                        <span>Kasir: {ord.cashierName || "-"}</span>
                        <span>
                          {new Date(ord.createdAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Desktop Table (>=640px) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground bg-muted/30">
                        <th className="py-3.5 px-4 font-semibold">Nota</th>
                        <th className="py-3.5 px-4 font-semibold">Tanggal</th>
                        <th className="py-3.5 px-4 font-semibold">Pelanggan</th>
                        <th className="py-3.5 px-4 font-semibold">Kasir</th>
                        <th className="py-3.5 px-4 font-semibold text-right">
                          Grand Total
                        </th>
                        <th className="py-3.5 px-4 font-semibold text-right">
                          Dibayar
                        </th>
                        <th className="py-3.5 px-4 font-semibold text-right">
                          Piutang
                        </th>
                        <th className="py-3.5 px-4 font-semibold text-center">
                          Status
                        </th>
                        <th className="py-3.5 px-4 font-semibold text-right">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {data.orders.map((ord) => (
                        <tr
                          key={ord.id}
                          className="hover:bg-muted/20 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-semibold text-primary font-mono">
                            {ord.invoiceNumber}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                            {new Date(ord.createdAt).toLocaleDateString(
                              "id-ID",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-foreground">
                            {ord.customerNameSnapshot}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {ord.cashierName || "-"}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-foreground tabular-nums text-right">
                            {formatCurrency(ord.grandTotal)}
                          </td>
                          <td className="py-3.5 px-4 text-emerald-600 font-semibold tabular-nums text-right">
                            {formatCurrency(ord.paidAmount)}
                          </td>
                          <td className="py-3.5 px-4 text-amber-600 font-semibold tabular-nums text-right">
                            {ord.remainingAmount > 0
                              ? formatCurrency(ord.remainingAmount)
                              : "-"}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 text-xs font-semibold rounded-md ${
                                ord.paymentStatus === "PAID"
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : ord.paymentStatus === "PARTIAL"
                                  ? "bg-amber-500/10 text-amber-600"
                                  : "bg-destructive/10 text-destructive"
                              }`}
                            >
                              {ord.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Link
                              href={`/orders/detail?id=${ord.id}`}
                              className="text-primary hover:underline font-semibold inline-flex items-center gap-1 min-h-9 px-2"
                            >
                              <span>Detail</span>
                              <ArrowRight className="size-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
