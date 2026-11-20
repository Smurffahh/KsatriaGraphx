"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  User,
  MessageCircle,
  AlertCircle,
  Ban,
  DollarSign,
  Banknote,
  Loader2,
  Edit2,
  Printer,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { OrderPaymentModal } from "@/components/orders/OrderPaymentModal";
import { OrderStatusModal } from "@/components/orders/OrderStatusModal";
import { ReceiptModal } from "@/components/receipt/ReceiptModal";

interface OrderDetailResponse {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string | null;
  cashierId: string;
  cashierName: string;
  sourcePlatform: "WEB" | "APK";
  subtotal: number;
  designFee: number;
  discountType: "NONE" | "FIXED" | "PERCENT";
  discountValue: number;
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
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
  } | null;
  items: Array<{
    id: string;
    productId: string | null;
    productNameSnapshot: string;
    pricingTypeSnapshot: "AREA" | "UNIT" | "CUSTOM";
    widthM: string | null;
    heightM: string | null;
    billedAreaM2: string | null;
    quantity: number;
    unitPrice: number;
    isPriceOverridden: boolean;
    finishingTotal: number;
    itemSubtotal: number;
    itemNotes: string | null;
    finishings: Array<{
      id: string;
      finishingNameSnapshot: string;
      chargeTypeSnapshot: string;
      quantity: string;
      unitPrice: number;
      subtotal: number;
    }>;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    cashReceived: number | null;
    changeAmount: number;
    paymentMethod: "CASH" | "TRANSFER" | "QRIS";
    referenceNote: string | null;
    paidAt: string;
    receivedByUserName: string;
  }>;
}

interface CurrentUser {
  id: string;
  name: string;
  role: "OWNER" | "KASIR";
}

function OrderDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const fetchOrderDetail = useCallback(async () => {
    if (!id) {
      setError("ID nota pesanan tidak disertakan");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [orderRes, userRes] = await Promise.all([
        apiClient.get<OrderDetailResponse>(`/api/orders/${id}`),
        apiClient.get<{ user: CurrentUser }>("/api/auth/me"),
      ]);
      if (orderRes.success && orderRes.data) {
        setOrder(orderRes.data);
      } else {
        setError(orderRes.error || "Gagal memuat rincian nota");
      }
      if (userRes.success && userRes.data?.user) {
        setCurrentUser(userRes.data.user);
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || "Gagal memuat rincian nota");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-text-muted">
        <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
        <span className="text-sm">Memuat rincian nota...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8 text-center max-w-md mx-auto rounded-2xl bg-surface border border-border space-y-4">
        <AlertCircle className="size-10 text-danger mx-auto" />
        <h2 className="text-lg font-semibold text-text">Terjadi Kendala</h2>
        <p className="text-xs text-text-muted">{error || "Data nota tidak ditemukan"}</p>
        <button
          type="button"
          onClick={() => router.push("/orders")}
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface-muted text-text text-xs font-medium rounded-xl hover:bg-border transition-colors min-h-[44px]"
        >
          <ArrowLeft className="size-4" />
          <span>Kembali ke Daftar Pesanan</span>
        </button>
      </div>
    );
  }

  const isPaid = order.paymentStatus === "PAID";
  const isPartial = order.paymentStatus === "PARTIAL";
  const isCancelled = order.productionStatus === "CANCELLED";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push("/orders")}
          className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors self-start min-h-[44px]"
        >
          <ArrowLeft className="size-4" />
          <span>Kembali ke Daftar Pesanan</span>
        </button>

        {/* Quick Action Placeholders */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setReceiptModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition-colors shadow-xs min-h-[44px]"
          >
            <Printer className="size-4" />
            <span>Cetak Nota</span>
          </button>

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
        <div className="p-4 rounded-2xl bg-danger/10 border border-danger/30 text-danger space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Ban className="size-4" />
            <span>Nota Ini Telah Dibatalkan / Void</span>
          </div>
          <p className="text-xs text-danger/90">
            Alasan pembatalan: {order.cancelReason || "Tidak ada alasan tercatat"}
          </p>
        </div>
      )}

      {/* Main Order Header Card */}
      <div className="p-6 rounded-2xl bg-surface border border-border shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-text-muted uppercase">
              Nomor Nota
            </span>
            <h1 className="text-2xl font-extrabold text-primary tracking-wide">
              {order.invoiceNumber}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted mt-1">
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
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-surface-muted border border-border font-medium">
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
                  : "bg-danger/10 text-danger border-danger/20"
              }`}
            >
              {order.paymentStatus}
            </span>

            <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-surface-muted text-text border border-border">
              {order.productionStatus}
            </span>
          </div>
        </div>

        {/* Customer Information & Summary Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-surface-muted/30 border border-border/50 space-y-2">
            <span className="text-text-muted font-medium flex items-center gap-1.5">
              <User className="size-3.5 text-primary" />
              <span>Data Pelanggan</span>
            </span>
            <div className="font-semibold text-text text-sm">{order.customerNameSnapshot}</div>
            {order.customerPhoneSnapshot && (
              <div className="text-text-muted tabular-nums">
                WhatsApp: {order.customerPhoneSnapshot}
              </div>
            )}
            {order.customer?.address && (
              <div className="text-text-muted">{order.customer.address}</div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-surface-muted/30 border border-border/50 space-y-2">
            <span className="text-text-muted font-medium flex items-center gap-1.5">
              <Clock className="size-3.5 text-primary" />
              <span>Target & Catatan Pengerjaan</span>
            </span>
            <div className="text-text">
              <span className="text-text-muted">Estimasi Selesai: </span>
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
              <div className="text-text-muted italic bg-surface p-2 rounded-lg border border-border/50">
                &ldquo;{order.notes}&rdquo;
              </div>
            )}
          </div>
        </div>

        {/* Action Controls for Workflow & Settlement */}
        {!isCancelled && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-text block">Aksi Nota</span>
              <span className="text-[11px] text-text-muted">
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
                  <span>Terima Pelunasan DP (Rp {order.remainingAmount.toLocaleString("id-ID")})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setStatusModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface hover:bg-surface-muted text-text text-xs font-semibold border border-border rounded-xl shadow-xs transition-colors min-h-[44px]"
              >
                <Edit2 className="size-3.5" />
                <span>Ubah Status Produksi</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Items Breakdown Table */}
      <div className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border bg-surface-muted/30">
          <h2 className="text-sm font-bold text-text">Daftar Item Percetakan</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-muted/40 text-text-muted">
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
                    <div className="font-semibold text-text text-sm">
                      {item.productNameSnapshot}
                    </div>

                    {item.isPriceOverridden && (
                      <span className="inline-block px-1.5 py-0.5 mt-1 text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded font-medium">
                        Harga Override Owner
                      </span>
                    )}

                    {item.finishings.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        <span className="text-[10px] font-medium text-text-muted block">Finishing:</span>
                        {item.finishings.map((f) => (
                          <div key={f.id} className="text-[11px] text-text-muted">
                            • {f.finishingNameSnapshot} ({f.quantity} × Rp{" "}
                            {f.unitPrice.toLocaleString("id-ID")}) = Rp{" "}
                            {f.subtotal.toLocaleString("id-ID")}
                          </div>
                        ))}
                      </div>
                    )}

                    {item.itemNotes && (
                      <div className="text-[11px] text-text-muted italic mt-1">
                        Catatan: {item.itemNotes}
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center tabular-nums text-text">
                    {item.pricingTypeSnapshot === "AREA" ? (
                      <div>
                        <span>
                          {item.widthM}m × {item.heightM}m
                        </span>
                        <div className="text-[11px] text-text-muted">
                          Luas: {item.billedAreaM2} m²
                        </div>
                      </div>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center font-semibold text-text tabular-nums">
                    {item.quantity}
                  </td>

                  <td className="py-3.5 px-4 text-right tabular-nums text-text">
                    Rp {item.unitPrice.toLocaleString("id-ID")}
                  </td>

                  <td className="py-3.5 px-4 text-right font-bold text-text tabular-nums">
                    Rp {item.itemSubtotal.toLocaleString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="p-4 bg-surface-muted/30 border-t border-border flex flex-col items-end space-y-1.5 text-xs">
          <div className="flex items-center justify-between w-64 text-text-muted">
            <span>Subtotal Item:</span>
            <span className="tabular-nums">Rp {order.subtotal.toLocaleString("id-ID")}</span>
          </div>

          {order.designFee > 0 && (
            <div className="flex items-center justify-between w-64 text-text-muted">
              <span>Biaya Desain:</span>
              <span className="tabular-nums">Rp {order.designFee.toLocaleString("id-ID")}</span>
            </div>
          )}

          {order.discountAmount > 0 && (
            <div className="flex items-center justify-between w-64 text-danger">
              <span>Potongan Diskon:</span>
              <span className="tabular-nums">- Rp {order.discountAmount.toLocaleString("id-ID")}</span>
            </div>
          )}

          <div className="flex items-center justify-between w-64 text-sm font-extrabold text-text pt-1.5 border-t border-border">
            <span>Grand Total:</span>
            <span className="text-primary tabular-nums">
              Rp {order.grandTotal.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex items-center justify-between w-64 text-xs font-semibold text-emerald-600">
            <span>Total Dibayar:</span>
            <span className="tabular-nums">Rp {order.paidAmount.toLocaleString("id-ID")}</span>
          </div>

          {order.remainingAmount > 0 && (
            <div className="flex items-center justify-between w-64 text-xs font-bold text-amber-600">
              <span>Sisa Tagihan (Piutang):</span>
              <span className="tabular-nums">Rp {order.remainingAmount.toLocaleString("id-ID")}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payment History Section */}
      <div className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border bg-surface-muted/30 flex items-center justify-between">
          <h2 className="text-sm font-bold text-text flex items-center gap-2">
            <Banknote className="size-4 text-emerald-600" />
            <span>Riwayat Pembayaran Nota</span>
          </h2>
          <span className="text-xs text-text-muted">{order.payments.length} transaksi pembayaran</span>
        </div>

        {order.payments.length === 0 ? (
          <div className="p-6 text-center text-xs text-text-muted">
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
                    <span className="font-bold text-text">
                      Rp {p.amount.toLocaleString("id-ID")}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-surface-muted rounded border border-border">
                      {p.paymentMethod}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-muted">
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
                    <div className="text-[11px] text-text-muted italic">Ref: {p.referenceNote}</div>
                  )}
                </div>

                {p.paymentMethod === "CASH" && p.cashReceived && (
                  <div className="text-right text-[11px] text-text-muted">
                    <div>Uang diterima: Rp {p.cashReceived.toLocaleString("id-ID")}</div>
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
    <Suspense
      fallback={
        <div className="p-12 text-center text-text-muted">
          <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
          <span className="text-sm">Memuat...</span>
        </div>
      }
    >
      <OrderDetailContent />
    </Suspense>
  );
}
