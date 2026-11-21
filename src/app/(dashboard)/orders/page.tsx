"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
import { Skeleton } from "@/components/ui/skeleton";
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [productionStatusFilter, setProductionStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

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
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Page Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardList className="size-6 text-primary" />
            <span>Daftar Pesanan & Transaksi</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pantau status pembayaran nota, tahapan produksi, dan pelunasan DP
          </p>
        </div>

        <Link href="/pos">
          <Button className="gap-2 min-h-[44px]">
            <Plus className="size-4" />
            <span>Buat Transaksi Baru</span>
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari No. Nota, Pelanggan, No. HP..."
              className="w-full pl-9 pr-3 py-2 text-base sm:text-xs bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

          {/* Payment Status Filter */}
          <div>
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-muted/50 border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="ALL">Semua Pembayaran</option>
              <option value="PAID">Lunas (PAID)</option>
              <option value="PARTIAL">DP / Sebagian (PARTIAL)</option>
              <option value="UNPAID">Belum Bayar (UNPAID)</option>
            </select>
          </div>

          {/* Production Status Filter */}
          <div>
            <select
              value={productionStatusFilter}
              onChange={(e) => {
                setProductionStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-muted/50 border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="ALL">Semua Status Produksi</option>
              <option value="QUEUED">Antrean (QUEUED)</option>
              <option value="IN_PROGRESS">Proses Cetak (IN_PROGRESS)</option>
              <option value="READY">Siap Ambil (READY)</option>
              <option value="COMPLETED">Selesai (COMPLETED)</option>
              <option value="CANCELLED">Dibatalkan (CANCELLED)</option>
            </select>
          </div>

          {/* Date range inputs */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-2 text-xs bg-muted/50 border border-border rounded-xl text-foreground"
              title="Dari Tanggal"
            />
            <span className="text-muted-foreground text-xs">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-2 text-xs bg-muted/50 border border-border rounded-xl text-foreground"
              title="Sampai Tanggal"
            />
          </div>
        </div>

        {(search ||
          paymentStatusFilter !== "ALL" ||
          productionStatusFilter !== "ALL" ||
          dateFrom ||
          dateTo) && (
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
            <span className="text-muted-foreground">Filter aktif diterapkan</span>
            <button
              type="button"
              onClick={handleResetFilter}
              className="text-primary hover:underline font-medium"
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
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Tidak ada transaksi yang cocok dengan filter. Gunakan menu Kalkulator POS untuk membuat nota baru.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View (hidden on lg) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 lg:hidden">
            {orders.map((o) => (
              <div
                key={o.id}
                className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/orders/detail?id=${o.id}`}
                      className="font-bold text-sm text-foreground hover:text-primary transition-colors tracking-wide"
                    >
                      {o.invoiceNumber}
                    </Link>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(o.createdAt).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getPaymentBadge(
                        o.paymentStatus
                      )}`}
                    >
                      {o.paymentStatus}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${getProductionBadge(
                        o.productionStatus
                      )}`}
                    >
                      {o.productionStatus}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Pelanggan:</span>
                    <p className="font-semibold text-foreground">
                      {o.customerNameSnapshot}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground">Total:</span>
                    <p className="font-bold text-primary tabular-nums text-sm">
                      Rp {o.grandTotal.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>

                {o.remainingAmount > 0 && (
                  <div className="pt-1.5 border-t border-border/40 text-[11px] flex justify-between items-center text-amber-600 font-medium">
                    <span>Sisa Piutang:</span>
                    <span className="font-bold tabular-nums">
                      Rp {o.remainingAmount.toLocaleString("id-ID")}
                    </span>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <Link
                    href={`/orders/detail?id=${o.id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                  >
                    <span>Lihat Rincian</span>
                    <Eye className="size-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (hidden on < lg) */}
          <div className="hidden lg:block rounded-2xl bg-card border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                    <th className="py-3 px-4">No. Nota</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Pelanggan</th>
                    <th className="py-3 px-4">Pembayaran</th>
                    <th className="py-3 px-4">Produksi</th>
                    <th className="py-3 px-4 text-right">Total Nota</th>
                    <th className="py-3 px-4 text-right">Sisa Tagihan</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-foreground">
                        <Link
                          href={`/orders/detail?id=${o.id}`}
                          className="hover:text-primary transition-colors tracking-wide"
                        >
                          {o.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {o.customerNameSnapshot}
                        {o.customerPhoneSnapshot && (
                          <div className="text-[11px] text-muted-foreground tabular-nums">
                            {o.customerPhoneSnapshot}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getPaymentBadge(
                            o.paymentStatus
                          )}`}
                        >
                          {o.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${getProductionBadge(
                            o.productionStatus
                          )}`}
                        >
                          {o.productionStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-foreground tabular-nums">
                        Rp {o.grandTotal.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {o.remainingAmount > 0 ? (
                          <span className="font-bold text-amber-600">
                            Rp {o.remainingAmount.toLocaleString("id-ID")}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">
                            Lunas
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/orders/detail?id=${o.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Eye className="size-3.5" />
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
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
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
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="gap-1 min-h-[44px]"
                >
                  <ChevronLeft className="size-4" />
                  <span>Sebelumnya</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="gap-1 min-h-[44px]"
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
