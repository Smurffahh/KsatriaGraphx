"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  Loader2,
  Plus,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";

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
  productionStatus: "QUEUED" | "IN_PROGRESS" | "READY" | "COMPLETED" | "CANCELLED";
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
      if (paymentStatusFilter !== "ALL") params.set("paymentStatus", paymentStatusFilter);
      if (productionStatusFilter !== "ALL") params.set("productionStatus", productionStatusFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await apiClient.get<OrdersApiResponse>(`/api/orders?${params.toString()}`);
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
  }, [page, search, paymentStatusFilter, productionStatusFilter, dateFrom, dateTo]);

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
        return "bg-danger/10 text-danger border-danger/20";
    }
  };

  const getProductionBadge = (
    status: "QUEUED" | "IN_PROGRESS" | "READY" | "COMPLETED" | "CANCELLED"
  ) => {
    switch (status) {
      case "QUEUED":
        return "bg-surface-muted text-text-muted border-border";
      case "IN_PROGRESS":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "READY":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "CANCELLED":
        return "bg-danger/10 text-danger border-danger/20 line-through";
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Page Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text flex items-center gap-2">
            <ClipboardList className="size-6 text-primary" />
            <span>Daftar Pesanan & Transaksi</span>
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Pantau status pembayaran nota, tahapan produksi, dan pelunasan DP
          </p>
        </div>

        <Link
          href="/pos"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl shadow-xs transition-colors min-h-[44px]"
        >
          <Plus className="size-4" />
          <span>Buat Transaksi Baru</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="No. nota / nama / WA..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-surface-muted border border-border rounded-xl text-text placeholder:text-text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
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
              className="w-full px-3 py-2 text-xs bg-surface-muted border border-border rounded-xl text-text focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
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
              className="w-full px-3 py-2 text-xs bg-surface-muted border border-border rounded-xl text-text focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
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
              className="w-full px-2 py-2 text-xs bg-surface-muted border border-border rounded-xl text-text"
              title="Dari Tanggal"
            />
            <span className="text-text-muted text-xs">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-2 text-xs bg-surface-muted border border-border rounded-xl text-text"
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
            <span className="text-text-muted">Filter aktif diterapkan</span>
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
        <div className="p-12 text-center text-text-muted">
          <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
          <span className="text-sm">Memuat daftar nota...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface border border-border">
          <ClipboardList className="size-10 mx-auto text-text-muted/40 mb-3" />
          <h3 className="text-base font-semibold text-text">Tidak Ada Pesanan Ditemukan</h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
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
                className="p-4 rounded-2xl bg-surface border border-border shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/orders/detail?id=${o.id}`}
                      className="font-bold text-sm text-text hover:text-primary transition-colors tracking-wide"
                    >
                      {o.invoiceNumber}
                    </Link>
                    <div className="text-xs text-text-muted mt-0.5">
                      {o.customerNameSnapshot} {o.customerPhoneSnapshot ? `(${o.customerPhoneSnapshot})` : ""}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getPaymentBadge(
                      o.paymentStatus
                    )}`}
                  >
                    {o.paymentStatus}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${getProductionBadge(
                      o.productionStatus
                    )}`}
                  >
                    {o.productionStatus}
                  </span>
                  <span className="text-[11px] text-text-muted flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(o.createdAt).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                  <div>
                    <div className="text-text-muted text-[10px]">Grand Total:</div>
                    <div className="font-bold text-text tabular-nums">
                      Rp {o.grandTotal.toLocaleString("id-ID")}
                    </div>
                  </div>

                  {o.remainingAmount > 0 && (
                    <div className="text-right">
                      <div className="text-amber-600 text-[10px]">Sisa Piutang:</div>
                      <div className="font-bold text-amber-600 tabular-nums">
                        Rp {o.remainingAmount.toLocaleString("id-ID")}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-1 flex items-center justify-end">
                  <Link
                    href={`/orders/detail?id=${o.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-surface-muted hover:bg-border text-text rounded-xl transition-colors min-h-[44px]"
                  >
                    <Eye className="size-3.5" />
                    <span>Lihat Detail Nota</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (hidden on mobile) */}
          <div className="hidden lg:block bg-surface border border-border rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/40 text-text-muted">
                    <th className="py-3 px-4 font-semibold">No. Nota</th>
                    <th className="py-3 px-4 font-semibold">Tanggal</th>
                    <th className="py-3 px-4 font-semibold">Pelanggan</th>
                    <th className="py-3 px-4 font-semibold">Status Bayar</th>
                    <th className="py-3 px-4 font-semibold">Status Produksi</th>
                    <th className="py-3 px-4 font-semibold text-right">Grand Total</th>
                    <th className="py-3 px-4 font-semibold text-right">Sisa Tagihan</th>
                    <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-surface-muted/20 transition-colors">
                      <td className="py-3 px-4 font-bold text-text">
                        <Link
                          href={`/orders/detail?id=${o.id}`}
                          className="hover:text-primary transition-colors tracking-wide"
                        >
                          {o.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-text-muted">
                        {new Date(o.createdAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4 font-medium text-text">
                        {o.customerNameSnapshot}
                        {o.customerPhoneSnapshot && (
                          <div className="text-[11px] text-text-muted tabular-nums">
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
                      <td className="py-3 px-4 text-right font-semibold text-text tabular-nums">
                        Rp {o.grandTotal.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {o.remainingAmount > 0 ? (
                          <span className="font-bold text-amber-600">
                            Rp {o.remainingAmount.toLocaleString("id-ID")}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">Lunas</span>
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
              <span className="text-xs text-text-muted">
                Halaman <span className="font-semibold text-text tabular-nums">{page}</span> dari{" "}
                <span className="font-semibold text-text tabular-nums">{totalPages}</span> (Total{" "}
                {totalRecords} nota)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-text bg-surface border border-border rounded-xl hover:bg-surface-muted disabled:opacity-40 transition-colors min-h-[44px]"
                >
                  <ChevronLeft className="size-4" />
                  <span>Sebelumnya</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-text bg-surface border border-border rounded-xl hover:bg-surface-muted disabled:opacity-40 transition-colors min-h-[44px]"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
