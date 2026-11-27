"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Download, Filter, RotateCw } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import type { VendorPaymentStatus } from "@/lib/vendors/settlement";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoadingBanner } from "@/components/ui/page-loading-banner";
import { ErrorStatePanel } from "@/components/ui/state-panels";
import { Button } from "@/components/ui/button";
import { ReportsSummaryCards } from "@/components/reports/ReportsSummaryCards";
import { ReportsOrdersList } from "@/components/reports/ReportsOrdersList";
import type {
  PaymentFilterStatus,
  ReportPreset,
  ReportResponse,
  UserListItem,
} from "@/components/reports/types";

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
  const [selectedPreset, setSelectedPreset] = useState<ReportPreset>("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCashier, setSelectedCashier] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentFilterStatus>("ALL");
  const [vendorPaymentStatus, setVendorPaymentStatus] = useState<
    "ALL" | VendorPaymentStatus
  >("ALL");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
    }).format(new Date());
    setStartDate(today);
    setEndDate(today);
  }, []);

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

  const handlePresetChange = (preset: ReportPreset) => {
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

  const { data, isLoading, isError, refetch, isFetching } =
    useQuery<ReportResponse>({
      queryKey: [
        "reports",
        startDate,
        endDate,
        selectedCashier,
        paymentStatus,
        vendorPaymentStatus,
      ],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
        if (selectedCashier) params.set("cashierId", selectedCashier);
        if (paymentStatus !== "ALL") params.set("paymentStatus", paymentStatus);
        if (vendorPaymentStatus !== "ALL") {
          params.set("vendorPaymentStatus", vendorPaymentStatus);
        }

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
      if (vendorPaymentStatus !== "ALL") {
        params.set("vendorPaymentStatus", vendorPaymentStatus);
      }
      params.set("format", "csv");

      const endpoint = `/api/reports?${params.toString()}`;
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground">
            Laporan Penjualan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analisis omzet percetakan, kewajiban vendor, arus kas harian, dan unduh CSV
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <Button
            type="button"
            onClick={handleExportCsv}
            disabled={
              isExporting || isLoading || (data?.orders.length ?? 0) === 0
            }
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white min-h-11"
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
            className="min-h-11 min-w-11"
            aria-label="Segarkan laporan"
          >
            <RotateCw
              className={`size-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Filter className="size-4" />
          <span>Filter Laporan</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["today", "7d", "month", "custom"] as const).map((p) => {
            const labels: Record<ReportPreset, string> = {
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
                className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl border transition-colors min-h-11 sm:min-h-10 cursor-pointer ${
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1">
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

          <div>
            <label className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
              Status Pembayaran
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentFilterStatus)}
              className="h-11 w-full px-3.5 text-base sm:text-sm bg-muted/50 border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">Semua Status</option>
              <option value="PAID">Lunas</option>
              <option value="PARTIAL">Panjar (DP)</option>
              <option value="UNPAID">Belum Bayar</option>
            </select>
          </div>

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

          {isOwner && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                Setoran Vendor
              </label>
              <select
                aria-label="Status Setoran Vendor"
                value={vendorPaymentStatus}
                onChange={(e) =>
                  setVendorPaymentStatus(e.target.value as "ALL" | VendorPaymentStatus)
                }
                className="h-11 w-full px-3.5 text-base sm:text-sm bg-muted/50 border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">Semua Setoran</option>
                <option value="UNPAID">Belum Setor</option>
                <option value="PARTIAL">DP Vendor</option>
                <option value="PAID">Lunas Vendor</option>
                <option value="NOT_APPLICABLE">Tanpa Vendor</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {isLoading && <ReportsSkeleton />}

      {isError && (
        <ErrorStatePanel
          title="Gagal memuat data laporan"
          description="Periksa koneksi Anda lalu coba segarkan laporan."
          onRetry={() => refetch()}
          retryLabel="Coba Lagi"
        />
      )}

      {!isLoading && !isError && data && (
        <>
          <ReportsSummaryCards summary={data.summary} />
          <ReportsOrdersList orders={data.orders} />
        </>
      )}
    </div>
  );
}
