"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  MessageCircle,
  Clock,
  User,
  DollarSign,
  AlertCircle,
  Ban,
  Banknote,
  Edit2,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { OrderPaymentModal } from "@/components/orders/OrderPaymentModal";
import { OrderStatusModal } from "@/components/orders/OrderStatusModal";
import { ReceiptModal } from "@/components/receipt/ReceiptModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface OrderDetailItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  pricingTypeSnapshot: "UNIT" | "AREA";
  widthM: number | null;
  heightM: number | null;
  billedAreaM2: number | null;
  quantity: number;
  unitPrice: number;
  isPriceOverridden: boolean;
  itemSubtotal: number;
  itemNotes: string | null;
  finishings: {
    id: string;
    finishingId: string;
    finishingNameSnapshot: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
}

interface PaymentRecord {
  id: string;
  paymentMethod: "CASH" | "TRANSFER" | "QRIS";
  amount: number;
  cashReceived: number | null;
  changeAmount: number;
  referenceNote: string | null;
  receivedByUserName: string;
  paidAt: string;
}

interface OrderDetailData {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string | null;
  customer?: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
  } | null;
  cashierId: string;
  cashierName?: string;
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
  updatedAt: string;
  items: OrderDetailItem[];
  payments: PaymentRecord[];
}

interface CurrentUser {
  id: string;
  name: string;
  role: "OWNER" | "KASIR";
}

function OrderDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-44 rounded-xl" />
        <Skeleton className="h-8 w-32 rounded-xl" />
      </div>

      <div className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-border/60 pb-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20 rounded-lg" />
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border shadow-xs p-6 space-y-4">
        <Skeleton className="h-5 w-40 rounded-md" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function OrderDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const fetchOrderDetail = useCallback(async () => {
    if (!id) {
      setError("Parameter ID nota tidak ditemukan");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [orderRes, meRes] = await Promise.all([
        apiClient.get<OrderDetailData>(`/api/orders/${id}`),
        apiClient.get<{ user: CurrentUser }>("/api/auth/me"),
      ]);

      if (orderRes.success && orderRes.data) {
        setOrder(orderRes.data);
      } else {
        setError(orderRes.error || "Gagal memuat rincian nota");
      }

      if (meRes.success && meRes.data?.user) {
        setCurrentUser(meRes.data.user);
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || "Gagal memuat data pesanan");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  if (isLoading) {
    return <OrderDetailSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="p-8 text-center max-w-md mx-auto rounded-2xl bg-card border border-border space-y-4">
        <AlertCircle className="size-10 text-destructive mx-auto" />
        <h2 className="text-lg font-semibold text-foreground">Terjadi Kendala</h2>
        <p className="text-xs text-muted-foreground">
          {error || "Data nota tidak ditemukan"}
        </p>
        <Button
          variant="outline"
          onClick={() => router.push("/orders")}
          className="gap-2 min-h-[44px]"
        >
          <ArrowLeft className="size-4" />
          <span>Kembali ke Daftar Pesanan</span>
        </Button>
      </div>
    );
  }

  const isPaid = order.paymentStatus === "PAID";
  const isPartial = order.paymentStatus === "PARTIAL";
  const isCancelled = order.productionStatus === "CANCELLED";

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/orders")}
          className="gap-2 text-muted-foreground hover:text-foreground self-start min-h-[44px]"
        >
          <ArrowLeft className="size-4" />
          <span>Kembali ke Daftar Pesanan</span>
        </Button>

        {/* Quick Action Placeholders */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            size="sm"
            onClick={() => setReceiptModalOpen(true)}
            className="gap-1.5 min-h-[44px]"
          >
            <Printer className="size-4" />
            <span>Cetak Nota</span>
          </Button>

          {order.customerPhoneSnapshot && (
            <a
              href={`https://wa.me/${order.customerPhoneSnapshot}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl transition-colors shadow-xs min-h-[44px]"
            >
              <MessageCircle className="size-4" />
              <span>Kirim ke WhatsApp</span>
            </a>
          )}
        </div>
      </div>

      {/* Cancelled Alert Banner */}
      {isCancelled && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Ban className="size-4" />
            <span>Nota Ini Telah Dibatalkan / Void</span>
          </div>
          <p className="text-xs text-destructive/90">
            Alasan pembatalan: {order.cancelReason || "Tidak ada alasan tercatat"}
          </p>
        </div>
      )}

      {/* Main Order Header Card */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Nomor Nota
            </span>
            <h1 className="text-2xl font-extrabold text-primary tracking-wide">
              {order.invoiceNumber}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {new Date(order.createdAt).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span>•</span>
              <span>Kasir: {order.cashierName || "Kasir"}</span>
              <span>•</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted border border-border font-medium">
                Platform: {order.sourcePlatform}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                isPaid
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : isPartial
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              }`}
            >
              {order.paymentStatus}
            </span>

            <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-muted text-foreground border border-border">
              {order.productionStatus}
            </span>
          </div>
        </div>

        {/* Customer Information & Summary Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-2">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <User className="size-3.5 text-primary" />
              <span>Data Pelanggan</span>
            </span>
            <div className="font-semibold text-foreground text-sm">
              {order.customerNameSnapshot}
            </div>
            {order.customerPhoneSnapshot && (
              <div className="text-muted-foreground tabular-nums">
                WhatsApp: {order.customerPhoneSnapshot}
              </div>
            )}
            {order.customer?.address && (
              <div className="text-muted-foreground">{order.customer.address}</div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-2">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Clock className="size-3.5 text-primary" />
              <span>Target & Catatan Pengerjaan</span>
            </span>
            <div className="text-foreground">
              <span className="text-muted-foreground">Estimasi Selesai: </span>
              <span className="font-semibold">
                {order.estimatedReadyAt
                  ? new Date(order.estimatedReadyAt).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Tidak ditentukan"}
              </span>
            </div>
            {order.notes && (
              <div className="text-muted-foreground italic bg-card p-2 rounded-lg border border-border/50">
                &ldquo;{order.notes}&rdquo;
              </div>
            )}
          </div>
        </div>

        {/* Action Controls for Workflow & Settlement */}
        {!isCancelled && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-foreground block">
                Aksi Nota
              </span>
              <span className="text-[11px] text-muted-foreground">
                Perbarui tahapan pengerjaan atau terima pelunasan piutang
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {order.remainingAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors min-h-[44px]"
                >
                  <DollarSign className="size-4" />
                  <span>
                    Terima Pelunasan DP (Rp{" "}
                    {order.remainingAmount.toLocaleString("id-ID")})
                  </span>
                </button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStatusModalOpen(true)}
                className="gap-1.5 min-h-[44px]"
              >
                <Edit2 className="size-3.5" />
                <span>Ubah Status Produksi</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Items Breakdown Table */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/40">
          <h2 className="text-sm font-bold text-foreground">
            Daftar Item Percetakan
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                <th className="py-3 px-4 font-semibold">Produk & Spesifikasi</th>
                <th className="py-3 px-4 font-semibold text-center">Ukuran / Luas</th>
                <th className="py-3 px-4 font-semibold text-center">Qty</th>
                <th className="py-3 px-4 font-semibold text-right">Harga Satuan</th>
                <th className="py-3 px-4 font-semibold text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {order.items.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-foreground text-sm">
                      {item.productNameSnapshot}
                    </div>

                    {item.isPriceOverridden && (
                      <span className="inline-block px-1.5 py-0.5 mt-1 text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded font-medium">
                        Harga Override Owner
                      </span>
                    )}

                    {item.finishings.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        <span className="text-[10px] font-medium text-muted-foreground block">
                          Finishing:
                        </span>
                        {item.finishings.map((f) => (
                          <div
                            key={f.id}
                            className="text-[11px] text-muted-foreground"
                          >
                            • {f.finishingNameSnapshot} ({f.quantity} × Rp{" "}
                            {f.unitPrice.toLocaleString("id-ID")}) = Rp{" "}
                            {f.subtotal.toLocaleString("id-ID")}
                          </div>
                        ))}
                      </div>
                    )}

                    {item.itemNotes && (
                      <div className="text-[11px] text-muted-foreground italic mt-1">
                        Catatan: {item.itemNotes}
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center tabular-nums text-foreground">
                    {item.pricingTypeSnapshot === "AREA" ? (
                      <div>
                        <span>
                          {item.widthM}m × {item.heightM}m
                        </span>
                        <div className="text-[11px] text-muted-foreground">
                          Luas: {item.billedAreaM2} m²
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center font-semibold text-foreground tabular-nums">
                    {item.quantity}
                  </td>

                  <td className="py-3.5 px-4 text-right tabular-nums text-foreground">
                    Rp {item.unitPrice.toLocaleString("id-ID")}
                  </td>

                  <td className="py-3.5 px-4 text-right font-bold text-foreground tabular-nums">
                    Rp {item.itemSubtotal.toLocaleString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="p-4 bg-muted/40 border-t border-border flex flex-col items-end space-y-1.5 text-xs">
          <div className="flex items-center justify-between w-64 text-muted-foreground">
            <span>Subtotal Item:</span>
            <span className="tabular-nums">
              Rp {order.subtotal.toLocaleString("id-ID")}
            </span>
          </div>

          {order.designFee > 0 && (
            <div className="flex items-center justify-between w-64 text-muted-foreground">
              <span>Biaya Desain:</span>
              <span className="tabular-nums">
                Rp {order.designFee.toLocaleString("id-ID")}
              </span>
            </div>
          )}

          {order.discountAmount > 0 && (
            <div className="flex items-center justify-between w-64 text-destructive">
              <span>Potongan Diskon:</span>
              <span className="tabular-nums">
                - Rp {order.discountAmount.toLocaleString("id-ID")}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between w-64 text-sm font-extrabold text-foreground pt-1.5 border-t border-border">
            <span>Grand Total:</span>
            <span className="text-primary tabular-nums">
              Rp {order.grandTotal.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex items-center justify-between w-64 text-xs font-semibold text-emerald-600">
            <span>Total Dibayar:</span>
            <span className="tabular-nums">
              Rp {order.paidAmount.toLocaleString("id-ID")}
            </span>
          </div>

          {order.remainingAmount > 0 && (
            <div className="flex items-center justify-between w-64 text-xs font-bold text-amber-600">
              <span>Sisa Tagihan (Piutang):</span>
              <span className="tabular-nums">
                Rp {order.remainingAmount.toLocaleString("id-ID")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Payment History Section */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Banknote className="size-4 text-emerald-600" />
            <span>Riwayat Pembayaran Nota</span>
          </h2>
          <span className="text-xs text-muted-foreground">
            {order.payments.length} transaksi pembayaran
          </span>
        </div>

        {order.payments.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Belum ada pembayaran yang diterima untuk nota ini (UNPAID).
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {order.payments.map((p) => (
              <div
                key={p.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">
                      Rp {p.amount.toLocaleString("id-ID")}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-muted rounded border border-border">
                      {p.paymentMethod}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Diterima oleh {p.receivedByUserName} •{" "}
                    {new Date(p.paidAt).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  {p.referenceNote && (
                    <div className="text-[11px] text-muted-foreground italic">
                      Ref: {p.referenceNote}
                    </div>
                  )}
                </div>

                {p.paymentMethod === "CASH" && p.cashReceived && (
                  <div className="text-right text-[11px] text-muted-foreground">
                    <div>
                      Uang diterima: Rp {p.cashReceived.toLocaleString("id-ID")}
                    </div>
                    {p.changeAmount > 0 && (
                      <div className="text-emerald-600 font-semibold">
                        Kembalian: Rp {p.changeAmount.toLocaleString("id-ID")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <OrderPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        order={order}
        onSuccess={fetchOrderDetail}
      />

      <OrderStatusModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        order={order}
        userRole={currentUser?.role}
        onSuccess={fetchOrderDetail}
      />

      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        order={order}
      />
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<OrderDetailSkeleton />}>
      <OrderDetailContent />
    </Suspense>
  );
}
