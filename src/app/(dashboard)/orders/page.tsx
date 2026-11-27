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
  AlertCircle,
  Plus,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { VendorStatusBadge } from "@/components/vendors/VendorStatusBadge";
import type { VendorPaymentStatus } from "@/lib/vendors/settlement";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoadingBanner } from "@/components/ui/page-loading-banner";
import { Button } from "@/components/ui/button";

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

  const getPaymentBadge = (status: "UNPAID" | "PARTIAL" | "PAID") => {
    switch (status) {
      case "PAID":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "PARTIAL":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "UNPAID":
        return "bg-destructive/10 text-destructive border-destructive/20";
    }
  };

  const getProductionBadge = (
    status: "QUEUED" | "IN_PROGRESS" | "READY" | "COMPLETED" | "CANCELLED"
  ) => {
    switch (status) {
      case "QUEUED":
        return "bg-muted text-muted-foreground border-border";
      case "IN_PROGRESS":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "READY":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "CANCELLED":
        return "bg-destructive/10 text-destructive border-destructive/20 line-through";
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground flex items-center gap-2.5">
            <ClipboardList className="size-6 sm:size-7 text-primary shrink-0" />
            <span>Daftar Pesanan &amp; Transaksi</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pantau status pembayaran nota, tahapan produksi, dan pelunasan DP
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
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2.5">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
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
        <div className="p-12 text-center rounded-2xl bg-card border border-border">
          <ClipboardList className="size-10 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold text-foreground">
            Tidak Ada Pesanan Ditemukan
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Tidak ada transaksi yang cocok dengan filter. Gunakan menu Kalkulator POS untuk membuat nota baru.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View (hidden on lg) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
            {orders.map((o) => (
              <div
                key={o.id}
                className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <Link
                      href={`/orders/detail?id=${o.id}`}
                      className="inline-flex min-h-9 items-center -my-1.5 font-semibold text-sm sm:text-base text-foreground hover:text-primary transition-colors tracking-wide"
                    >
                      {o.invoiceNumber}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(o.createdAt).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <span
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${getPaymentBadge(
                        o.paymentStatus
                      )}`}
                    >
                      {o.paymentStatus}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 text-xs font-medium rounded-md border ${getProductionBadge(
                        o.productionStatus
                      )}`}
                    >
                      {o.productionStatus}
                    </span>
                    {userRole === "OWNER" && o.vendorPaymentStatus && (
                      <VendorStatusBadge status={o.vendorPaymentStatus} />
                    )}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-border/50 text-xs sm:text-sm flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs text-muted-foreground block">Pelanggan:</span>
                    <p className="font-semibold text-foreground truncate">
                      {o.customerNameSnapshot}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-muted-foreground block">Total:</span>
                    <p className="font-bold text-primary tabular-nums text-base">
                      Rp {o.grandTotal.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>

                {o.remainingAmount > 0 && (
                  <div className="pt-2 border-t border-border/40 text-xs flex justify-between items-center text-amber-600 font-medium">
                    <span>Sisa Piutang:</span>
                    <span className="font-bold tabular-nums">
                      Rp {o.remainingAmount.toLocaleString("id-ID")}
                    </span>
                  </div>
                )}

                <div className="pt-1 flex justify-end">
                  <Link
                    href={`/orders/detail?id=${o.id}`}
                    className="inline-flex items-center gap-1.5 min-h-10 px-2 text-xs sm:text-sm text-primary font-semibold hover:underline"
                  >
                    <span>Lihat Rincian</span>
                    <Eye className="size-4" />
                  </Link>
                </div>
              </div>
            ))}
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
                  {orders.map((o) => (
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
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(o.createdAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
                          className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${getPaymentBadge(
                            o.paymentStatus
                          )}`}
                        >
                          {o.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-md border ${getProductionBadge(
                            o.productionStatus
                          )}`}
                        >
                          {o.productionStatus}
                        </span>
                      </td>
                      {userRole === "OWNER" && (
                        <td className="py-3.5 px-4">
                          <VendorStatusBadge status={o.vendorPaymentStatus} />
                        </td>
                      )}
                      <td className="py-3.5 px-4 text-right font-semibold text-foreground tabular-nums">
                        Rp {o.grandTotal.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums">
                        {o.remainingAmount > 0 ? (
                          <span className="font-semibold text-amber-600">
                            Rp {o.remainingAmount.toLocaleString("id-ID")}
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
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Eye className="size-4" />
                          <span>Rincian</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
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
