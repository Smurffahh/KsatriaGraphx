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
  Calendar,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-6 max-w-5xl mx-auto">
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
      <div className="p-8 text-center max-w-md mx-auto rounded-2xl bg-card border border-border space-y-4">
        <AlertCircle className="size-10 text-destructive mx-auto" />
        <h2 className="text-lg font-semibold text-foreground">Terjadi Kendala</h2>
        <p className="text-xs text-muted-foreground">
          {error || "Data pelanggan tidak ditemukan"}
        </p>
        <Button
          variant="outline"
          onClick={() => router.push("/customers")}
          className="gap-2 min-h-[44px]"
        >
          <ArrowLeft className="size-4" />
          <span>Kembali ke Daftar Pelanggan</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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
              <h1 className="text-xl font-bold text-foreground">
                {customer.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
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
                  Terdaftar:{" "}
                  {new Date(customer.createdAt).toLocaleDateString("id-ID")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <MapPin className="size-3.5 text-primary" />
              <span>Alamat Lengkap</span>
            </div>
            <p className="text-foreground leading-relaxed">
              {customer.address || "Tidak ada alamat tercatat"}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <FileText className="size-3.5 text-primary" />
              <span>Catatan Khusus Pelanggan</span>
            </div>
            <p className="text-foreground leading-relaxed">
              {customer.notes || "Tidak ada catatan khusus"}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
            <span className="text-xs text-muted-foreground">Total Transaksi</span>
            <div className="text-lg font-bold text-foreground tabular-nums mt-0.5">
              {customer.stats.totalOrders} Nota
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
            <span className="text-xs text-muted-foreground">
              Total Pembelanjaan
            </span>
            <div className="text-lg font-bold text-foreground tabular-nums mt-0.5">
              Rp {customer.stats.totalSpent.toLocaleString("id-ID")}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
            <span className="text-xs text-muted-foreground">
              Sisa Piutang Aktif
            </span>
            <div
              className={`text-lg font-bold tabular-nums mt-0.5 ${
                customer.stats.totalPiutang > 0
                  ? "text-amber-500"
                  : "text-emerald-500"
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
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Receipt className="size-4 text-primary" />
            <span>Riwayat Transaksi Terakhir</span>
          </h2>
          <span className="text-xs text-muted-foreground">
            Maksimal 10 nota terbaru
          </span>
        </div>

        {customer.recentOrders.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-card border border-border text-muted-foreground text-xs">
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
                  className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/orders/detail?id=${order.id}`}
                        className="font-semibold text-sm text-foreground hover:text-primary transition-colors"
                      >
                        {order.invoiceNumber}
                      </Link>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${
                          isPaid
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : isPartial
                            ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            : "bg-destructive/10 text-destructive border border-destructive/20"
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-muted text-muted-foreground border border-border">
                        {order.productionStatus}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
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
                      <div className="text-xs font-semibold text-foreground tabular-nums">
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
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-muted hover:bg-border text-foreground rounded-lg transition-colors min-h-[44px]"
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
