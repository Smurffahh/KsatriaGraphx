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
  Calendar,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyStatePanel, ErrorStatePanel } from "@/components/ui/state-panels";
import { Button } from "@/components/ui/button";
import { formatRupiah, formatShortDateTimeId } from "@/lib/format";
import {
  getPaymentStatusMeta,
  getProductionStatusMeta,
} from "@/lib/orders/status-labels";

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
    productionStatus:
      | "QUEUED"
      | "IN_PROGRESS"
      | "READY"
      | "COMPLETED"
      | "CANCELLED";
    createdAt: string;
  }>;
}

function CustomerDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-28 rounded-xl" />

      <div className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-6">
        <div className="flex items-center gap-4 border-b border-border/60 pb-5">
          <Skeleton className="size-12 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-48 rounded-md" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
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
    return <CustomerDetailSkeleton />;
  }

  if (error || !customer) {
    return (
      <div className="py-6 space-y-4">
        <ErrorStatePanel
          title="Gagal Memuat Profil Pelanggan"
          description={error || "Data pelanggan tidak ditemukan."}
          onRetry={() => router.push("/customers")}
          retryLabel="Kembali ke Daftar Pelanggan"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/customers")}
          className="gap-2 text-muted-foreground hover:text-foreground min-h-[44px]"
        >
          <ArrowLeft className="size-4" />
          <span>Kembali</span>
        </Button>

        {customer.phone && (
          <a
            href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}`}
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
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
              <User className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground">
                {customer.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground mt-1">
                {customer.phone ? (
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <Phone className="size-4 text-primary" />
                    {customer.phone}
                  </span>
                ) : (
                  <span className="italic">Tanpa kontak telepon</span>
                )}
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-4" />
                  Terdaftar:{" "}
                  {new Date(customer.createdAt).toLocaleDateString("id-ID")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground font-medium">
              <MapPin className="size-4 text-primary" />
              <span>Alamat Lengkap</span>
            </div>
            <p className="text-foreground leading-relaxed">
              {customer.address || "Tidak ada alamat tercatat"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground font-medium">
              <FileText className="size-4 text-primary" />
              <span>Catatan Khusus Pelanggan</span>
            </div>
            <p className="text-foreground leading-relaxed">
              {customer.notes || "Tidak ada catatan khusus"}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 sm:p-5 rounded-xl bg-muted/40 border border-border/60">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Transaksi</span>
            <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums mt-1">
              {customer.stats.totalOrders} Nota
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-muted/40 border border-border/60">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Pembelanjaan
            </span>
            <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums mt-1">
              {formatRupiah(customer.stats.totalSpent)}
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-muted/40 border border-border/60">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Sisa Piutang Aktif
            </span>
            <div
              className={`text-xl sm:text-2xl font-bold tabular-nums mt-1 ${
                customer.stats.totalPiutang > 0
                  ? "text-amber-500"
                  : "text-emerald-500"
              }`}
            >
              {formatRupiah(customer.stats.totalPiutang)}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <Receipt className="size-4.5 text-primary" />
            <span>Riwayat Transaksi Terakhir</span>
          </h2>
          <span className="text-xs sm:text-sm text-muted-foreground">
            Maksimal 10 nota terbaru
          </span>
        </div>

        {customer.recentOrders.length === 0 ? (
          <EmptyStatePanel
            icon={Receipt}
            title="Belum ada riwayat transaksi"
            description="Pelanggan ini belum memiliki riwayat transaksi nota."
          />
        ) : (
          <div className="space-y-3">
            {customer.recentOrders.map((order) => {
              const paymentMeta = getPaymentStatusMeta(order.paymentStatus);
              const prodMeta = getProductionStatusMeta(order.productionStatus);

              return (
                <div
                  key={order.id}
                  className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/orders/detail?id=${order.id}`}
                        className="font-mono font-semibold text-sm sm:text-base text-foreground hover:text-primary transition-colors"
                      >
                        {order.invoiceNumber}
                      </Link>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${paymentMeta.badgeClass}`}
                      >
                        {paymentMeta.label}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${prodMeta.badgeClass}`}
                      >
                        {prodMeta.label}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 tabular-nums">
                      <Clock className="size-3.5" />
                      {formatShortDateTimeId(order.createdAt)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/60">
                    <div className="text-left sm:text-right">
                      <div className="text-sm sm:text-base font-semibold text-foreground tabular-nums">
                        {formatRupiah(order.grandTotal)}
                      </div>
                      {order.remainingAmount > 0 && (
                        <div className="text-xs text-amber-500 font-medium tabular-nums">
                          Sisa: {formatRupiah(order.remainingAmount)}
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/orders/detail?id=${order.id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium bg-muted hover:bg-border text-foreground rounded-xl transition-colors min-h-[44px]"
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
    <Suspense fallback={<CustomerDetailSkeleton />}>
      <CustomerDetailContent />
    </Suspense>
  );
}
