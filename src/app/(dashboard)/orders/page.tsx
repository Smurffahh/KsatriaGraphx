"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ClipboardList,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { VendorStatusBadge } from "@/components/vendors/VendorStatusBadge";
import type { VendorPaymentStatus } from "@/lib/vendors/settlement";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoadingBanner } from "@/components/ui/page-loading-banner";
import { Button } from "@/components/ui/button";
import { EmptyStatePanel, ErrorStatePanel } from "@/components/ui/state-panels";
import { formatRupiah, formatShortDateTimeId } from "@/lib/format";
import {
  getPaymentStatusMeta,
  getProductionStatusMeta,
} from "@/lib/orders/status-labels";

interface OrderListItem {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string | null;
  cashierId: string;
  sourcePlatform: "WEB" | "APK";
  subtotal: number;
  designFee: number;
  discountType: "NONE" | "FIXED" | "PERCENT";
  discountAmount: number;
  grandTotal: number;
  vendorPaidAmount?: number;
  vendorPaymentStatus?: VendorPaymentStatus;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
  productionStatus:
    | "QUEUED"
    | "IN_PROGRESS"
    | "READY"
    | "COMPLETED"
    | "CANCELLED";
  estimatedReadyAt: string | null;
  notes: string | null;
  cancelReason: string | null;
  createdAt: string;
}

interface OrdersApiResponse {
  data: OrderListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function OrdersSkeleton() {
  return (
    <div className="space-y-4">
      <PageLoadingBanner message="Memuat daftar pesanan..." />
      {/* Mobile Card Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 lg:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
            <div className="pt-2 border-t border-border/50 flex items-center justify-between">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden lg:block rounded-2xl bg-card border border-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border">
          <Skeleton className="h-5 w-40 rounded-md" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-none">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-7 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrdersContent() {
  const searchParams = useSearchParams();
  const initialVendorFilter = searchParams.get("vendorPaymentStatus")?.toUpperCase();
  const validInitialVendorFilter =
    initialVendorFilter &&
    ["NOT_APPLICABLE", "UNPAID", "PARTIAL", "PAID"].includes(initialVendorFilter)
      ? initialVendorFilter
      : "ALL";

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [userRole, setUserRole] = useState<"OWNER" | "KASIR" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [productionStatusFilter, setProductionStatusFilter] = useState("ALL");
  const [vendorPaymentStatusFilter, setVendorPaymentStatusFilter] = useState(
    validInitialVendorFilter
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    apiClient
      .get<{ user: { role: "OWNER" | "KASIR" } }>("/api/auth/me")
      .then((res) => {
        if (res.success && res.data?.user) {
          setUserRole(res.data.user.role);
        }
      })
      .catch(() => {});
  }, []);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (search.trim()) params.set("search", search.trim());
      if (paymentStatusFilter !== "ALL")
        params.set("paymentStatus", paymentStatusFilter);
      if (productionStatusFilter !== "ALL")
        params.set("productionStatus", productionStatusFilter);
      if (userRole === "OWNER" && vendorPaymentStatusFilter !== "ALL")
        params.set("vendorPaymentStatus", vendorPaymentStatusFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await apiClient.get<OrdersApiResponse>(
        `/api/orders?${params.toString()}`
      );
      if (res.success && res.data) {
        setOrders(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
        setTotalRecords(res.data.pagination.total);
      } else {
        setError(res.error || "Gagal memuat daftar pesanan");
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || "Gagal memuat daftar pesanan");
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    search,
    paymentStatusFilter,
    productionStatusFilter,
    userRole,
    vendorPaymentStatusFilter,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  const handleResetFilter = () => {
    setSearch("");
    setPaymentStatusFilter("ALL");
    setProductionStatusFilter("ALL");
    setVendorPaymentStatusFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground flex items-center gap-2.5">
            <ClipboardList className="size-6 sm:size-7 text-primary shrink-0" />
            <span>Daftar Pesanan &amp; Transaksi</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pantau antrean pengerjaan, status pembayaran pelanggan, dan setoran modal vendor
          </p>
        </div>

        <Link href="/pos">
          <Button size="lg" className="gap-2 w-full sm:w-auto">
            <Plus className="size-4" />
            <span>Buat Transaksi Baru</span>
          </Button>
        </Link>
      </div>

      {error && (
        <ErrorStatePanel
          description={error}
          onRetry={fetchOrders}
        />
      )}

      {/* Filter Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 xl:flex xl:items-center gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2 lg:col-span-2 xl:flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari No. Nota atau Pelanggan..."
              className="h-11 w-full pl-10 pr-3.5 text-base sm:text-sm bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

          {/* Payment Status Filter */}
          <div className="lg:col-span-2 xl:w-48 shrink-0">
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-11 w-full px-3.5 text-base sm:text-sm bg-muted/50 border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="ALL">Semua Pembayaran</option>
              <option value="PAID">Lunas (PAID)</option>
              <option value="PARTIAL">DP / Sebagian (PARTIAL)</option>
              <option value="UNPAID">Belum Bayar (UNPAID)</option>
            </select>
          </div>

          {/* Production Status Filter */}
          <div className="lg:col-span-2 xl:w-52 shrink-0">
            <select
              value={productionStatusFilter}
              onChange={(e) => {
                setProductionStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-11 w-full px-3.5 text-base sm:text-sm bg-muted/50 border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="ALL">Semua Status Produksi</option>
              <option value="QUEUED">Antrean (QUEUED)</option>
              <option value="IN_PROGRESS">Proses Cetak (IN_PROGRESS)</option>
              <option value="READY">Siap Ambil (READY)</option>
              <option value="COMPLETED">Selesai (COMPLETED)</option>
              <option value="CANCELLED">Dibatalkan (CANCELLED)</option>
            </select>
          </div>

          {userRole === "OWNER" && (
            <div className="lg:col-span-2 xl:w-52 shrink-0">
              <select
                aria-label="Filter Setoran Vendor"
                value={vendorPaymentStatusFilter}
                onChange={(e) => {
                  setVendorPaymentStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-11 w-full px-3.5 text-base sm:text-sm bg-muted/50 border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
              >
                <option value="ALL">Semua Setoran Vendor</option>
                <option value="UNPAID">Belum Setor Vendor</option>
                <option value="PARTIAL">DP Vendor (Sebagian)</option>
                <option value="PAID">Lunas Vendor</option>
                <option value="NOT_APPLICABLE">Tanpa Vendor</option>
              </select>
            </div>
          )}

          {/* Date range inputs */}
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:col-span-2 lg:col-span-6 xl:flex xl:items-center gap-2.5 xl:w-[350px] shrink-0">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              aria-label="Dari Tanggal"
              title="Dari Tanggal"
              className="h-11 w-full min-w-0 xl:flex-1 px-3 text-base sm:text-sm bg-muted/50 border border-border rounded-xl text-foreground"
            />
            <span className="hidden xl:inline text-muted-foreground text-sm shrink-0">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              aria-label="Sampai Tanggal"
              title="Sampai Tanggal"
              className="h-11 w-full min-w-0 xl:flex-1 px-3 text-base sm:text-sm bg-muted/50 border border-border rounded-xl text-foreground"
            />
          </div>
        </div>

        {(search ||
          paymentStatusFilter !== "ALL" ||
          productionStatusFilter !== "ALL" ||
          (userRole === "OWNER" && vendorPaymentStatusFilter !== "ALL") ||
          dateFrom ||
          dateTo) && (
          <div className="flex items-center justify-between pt-2.5 border-t border-border/50 text-xs sm:text-sm">
            <span className="text-muted-foreground">Filter aktif diterapkan</span>
            <button
              type="button"
              onClick={handleResetFilter}
              className="text-primary hover:underline font-medium min-h-9 inline-flex items-center cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      {isLoading ? (
        <OrdersSkeleton />
      ) : orders.length === 0 ? (
        <EmptyStatePanel
          icon={ClipboardList}
          title="Belum ada pesanan yang cocok"
          description="Tidak ada transaksi yang sesuai filter saat ini. Buat transaksi baru dari Kasir POS atau reset filter pencarian."
          action={
            <div className="flex flex-wrap justify-center gap-2.5">
              <Button variant="outline" onClick={handleResetFilter}>
                Reset Filter
              </Button>
              <Link href="/pos">
                <Button>Buka Kasir POS</Button>
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
            {orders.map((o) => {
              const payMeta = getPaymentStatusMeta(o.paymentStatus);
              const prodMeta = getProductionStatusMeta(o.productionStatus);
              return (
                <div
                  key={o.id}
                  className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0">
                      <Link
                        href={`/orders/detail?id=${o.id}`}
                        className="inline-flex min-h-11 items-center -my-2 font-semibold text-sm sm:text-base text-foreground hover:text-primary transition-colors tracking-wide"
                      >
                        {o.invoiceNumber}
                      </Link>
                      <p className="text-sm font-medium text-foreground truncate mt-0.5">
                        {o.customerNameSnapshot}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                        {formatShortDateTimeId(o.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={`px-2.5 py-0.5 text-xs font-medium rounded-md border whitespace-nowrap ${prodMeta.badgeClass}`}
                      >
                        {prodMeta.label}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border whitespace-nowrap ${payMeta.badgeClass}`}
                      >
                        {payMeta.label}
                      </span>
                      {userRole === "OWNER" && o.vendorPaymentStatus && (
                        <VendorStatusBadge status={o.vendorPaymentStatus} />
                      )}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-border/50 flex items-center justify-between gap-2">
                    <div className="text-xs">
                      {o.remainingAmount > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold tabular-nums">
                          Sisa Tagihan: {formatRupiah(o.remainingAmount)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Tagihan Pelanggan Lunas
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-muted-foreground block">Total Nota</span>
                      <p className="font-bold text-primary tabular-nums text-base">
                        {formatRupiah(o.grandTotal)}
                      </p>
                    </div>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <Link
                      href={`/orders/detail?id=${o.id}`}
                      className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-muted/60 hover:bg-muted text-xs sm:text-sm text-primary font-semibold transition-colors"
                    >
                      <span>Buka Detail Nota</span>
                      <Eye className="size-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (hidden on < lg) */}
          <div className="hidden lg:block rounded-2xl bg-card border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                    <th className="py-3.5 px-4">No. Nota</th>
                    <th className="py-3.5 px-4">Tanggal</th>
                    <th className="py-3.5 px-4">Pelanggan</th>
                    <th className="py-3.5 px-4">Pembayaran</th>
                    <th className="py-3.5 px-4">Produksi</th>
                    {userRole === "OWNER" && (
                      <th className="py-3.5 px-4">Setoran Vendor</th>
                    )}
                    <th className="py-3.5 px-4 text-right">Total Nota</th>
                    <th className="py-3.5 px-4 text-right">Sisa Tagihan</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {orders.map((o) => {
                    const payMeta = getPaymentStatusMeta(o.paymentStatus);
                    const prodMeta = getProductionStatusMeta(o.productionStatus);
                    return (
                    <tr
                      key={o.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        <Link
                          href={`/orders/detail?id=${o.id}`}
                          className="hover:text-primary transition-colors tracking-wide"
                        >
                          {o.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap tabular-nums">
                        {formatShortDateTimeId(o.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        {o.customerNameSnapshot}
                        {o.customerPhoneSnapshot && (
                          <div className="text-xs text-muted-foreground tabular-nums mt-0.5">
                            {o.customerPhoneSnapshot}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border whitespace-nowrap ${payMeta.badgeClass}`}
                        >
                          {payMeta.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-md border whitespace-nowrap ${prodMeta.badgeClass}`}
                        >
                          {prodMeta.label}
                        </span>
                      </td>
                      {userRole === "OWNER" && (
                        <td className="py-3.5 px-4">
                          <VendorStatusBadge status={o.vendorPaymentStatus} />
                        </td>
                      )}
                      <td className="py-3.5 px-4 text-right font-semibold text-foreground tabular-nums">
                        {formatRupiah(o.grandTotal)}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums">
                        {o.remainingAmount > 0 ? (
                          <span className="font-semibold text-amber-600">
                            {formatRupiah(o.remainingAmount)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">
                            Lunas
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/orders/detail?id=${o.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors min-h-10"
                        >
                          <Eye className="size-4" />
                          <span>Rincian</span>
                        </Link>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <span className="text-xs sm:text-sm text-muted-foreground">
                Halaman{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {page}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {totalPages}
                </span>{" "}
                (Total {totalRecords} nota)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="gap-1.5 min-h-[44px]"
                >
                  <ChevronLeft className="size-4" />
                  <span>Sebelumnya</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="gap-1.5 min-h-[44px]"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersSkeleton />}>
      <OrdersContent />
    </Suspense>
  );
}
