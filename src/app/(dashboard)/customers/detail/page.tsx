"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  FileText,
  MessageCircle,
  Receipt,
  Clock,
  AlertCircle,
  Loader2,
  Calendar,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";

interface CustomerDetailData {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  stats: {
    totalOrders: number;
    totalSpent: number;
    totalPiutang: number;
  };
  recentOrders: Array<{
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    paidAmount: number;
    remainingAmount: number;
    paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
    productionStatus: "QUEUED" | "IN_PROGRESS" | "READY" | "COMPLETED" | "CANCELLED";
    createdAt: string;
  }>;
}

function CustomerDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const [customer, setCustomer] = useState<CustomerDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("ID pelanggan tidak disertakan pada tautan");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    apiClient
      .get<CustomerDetailData>(`/api/customers/${id}`)
      .then((res) => {
        if (res.success && res.data) {
          setCustomer(res.data);
        } else {
          setError(res.error || "Data pelanggan tidak ditemukan");
        }
      })
      .catch((err: unknown) => {
        const errorObj = err as { message?: string };
        setError(errorObj.message || "Gagal memuat detail pelanggan");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-text-muted">
        <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
        <span className="text-sm">Memuat detail pelanggan...</span>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8 text-center max-w-md mx-auto rounded-2xl bg-surface border border-border space-y-4">
        <AlertCircle className="size-10 text-danger mx-auto" />
        <h2 className="text-lg font-semibold text-text">Terjadi Kendala</h2>
        <p className="text-xs text-text-muted">{error || "Data pelanggan tidak ditemukan"}</p>
        <button
          type="button"
          onClick={() => router.push("/customers")}
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface-muted text-text text-xs font-medium rounded-xl hover:bg-border transition-colors min-h-[44px]"
        >
          <ArrowLeft className="size-4" />
          <span>Kembali ke Daftar Pelanggan</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push("/customers")}
          className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors min-h-[44px] min-w-[44px]"
        >
          <ArrowLeft className="size-4" />
          <span>Kembali</span>
        </button>

        {customer.phone && (
          <a
            href={`https://wa.me/${customer.phone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl transition-colors shadow-xs min-h-[44px]"
          >
            <MessageCircle className="size-4" />
            <span>Kirim Pesan WhatsApp</span>
          </a>
        )}
      </div>

      {/* Profile Overview Card */}
      <div className="p-6 rounded-2xl bg-surface border border-border shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
              <User className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text">{customer.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted mt-1">
                {customer.phone ? (
                  <span className="flex items-center gap-1 tabular-nums">
                    <Phone className="size-3.5 text-primary" />
                    {customer.phone}
                  </span>
                ) : (
                  <span className="italic">Tanpa kontak telepon</span>
                )}
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  Terdaftar: {new Date(customer.createdAt).toLocaleDateString("id-ID")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-surface-muted/40 border border-border/40 space-y-1">
            <div className="flex items-center gap-1.5 text-text-muted font-medium">
              <MapPin className="size-3.5 text-primary" />
              <span>Alamat Lengkap</span>
            </div>
            <p className="text-text leading-relaxed">{customer.address || "Tidak ada alamat tercatat"}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-muted/40 border border-border/40 space-y-1">
            <div className="flex items-center gap-1.5 text-text-muted font-medium">
              <FileText className="size-3.5 text-primary" />
              <span>Catatan Khusus Pelanggan</span>
            </div>
            <p className="text-text leading-relaxed">{customer.notes || "Tidak ada catatan khusus"}</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-surface-muted/50 border border-border/60">
            <span className="text-xs text-text-muted">Total Transaksi</span>
            <div className="text-lg font-bold text-text tabular-nums mt-0.5">
              {customer.stats.totalOrders} Nota
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-muted/50 border border-border/60">
            <span className="text-xs text-text-muted">Total Pembelanjaan</span>
            <div className="text-lg font-bold text-text tabular-nums mt-0.5">
              Rp {customer.stats.totalSpent.toLocaleString("id-ID")}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-muted/50 border border-border/60">
            <span className="text-xs text-text-muted">Sisa Piutang Aktif</span>
            <div
              className={`text-lg font-bold tabular-nums mt-0.5 ${
                customer.stats.totalPiutang > 0 ? "text-amber-500" : "text-emerald-500"
              }`}
            >
              Rp {customer.stats.totalPiutang.toLocaleString("id-ID")}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text flex items-center gap-2">
            <Receipt className="size-4 text-primary" />
            <span>Riwayat Transaksi Terakhir</span>
          </h2>
          <span className="text-xs text-text-muted">Maksimal 10 nota terbaru</span>
        </div>

        {customer.recentOrders.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-surface border border-border text-text-muted text-xs">
            Pelanggan ini belum memiliki riwayat transaksi nota.
          </div>
        ) : (
          <div className="space-y-3">
            {customer.recentOrders.map((order) => {
              const isPaid = order.paymentStatus === "PAID";
              const isPartial = order.paymentStatus === "PARTIAL";

              return (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/orders/detail?id=${order.id}`}
                        className="font-semibold text-sm text-text hover:text-primary transition-colors"
                      >
                        {order.invoiceNumber}
                      </Link>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${
                          isPaid
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : isPartial
                            ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                            : "bg-danger/10 text-danger border border-danger/20"
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-surface-muted text-text-muted border border-border">
                        {order.productionStatus}
                      </span>
                    </div>
                    <div className="text-xs text-text-muted flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      {new Date(order.createdAt).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/60">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-text tabular-nums">
                        Rp {order.grandTotal.toLocaleString("id-ID")}
                      </div>
                      {order.remainingAmount > 0 && (
                        <div className="text-[11px] text-amber-500 font-medium tabular-nums">
                          Sisa: Rp {order.remainingAmount.toLocaleString("id-ID")}
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/orders/detail?id=${order.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-surface-muted hover:bg-border text-text rounded-lg transition-colors min-h-[44px]"
                    >
                      <span>Lihat Nota</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomerDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-text-muted">
          <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
          <span className="text-sm">Memuat...</span>
        </div>
      }
    >
      <CustomerDetailContent />
    </Suspense>
  );
}
