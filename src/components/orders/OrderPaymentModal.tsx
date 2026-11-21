"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

interface OrderPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    paidAmount: number;
    remainingAmount: number;
  } | null;
  onSuccess: () => void;
}

export function OrderPaymentModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}: OrderPaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "QRIS">("CASH");
  const [amount, setAmount] = useState<number | "">("");
  const [cashReceived, setCashReceived] = useState<number | "">("");
  const [referenceNote, setReferenceNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (order) {
      setAmount(order.remainingAmount);
      setCashReceived(order.remainingAmount);
      setReferenceNote("");
      setErrorMessage("");
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const numAmount = typeof amount === "number" ? amount : 0;
  const numCashReceived = typeof cashReceived === "number" ? cashReceived : numAmount;
  const cashChange =
    paymentMethod === "CASH" && numCashReceived > numAmount ? numCashReceived - numAmount : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      setErrorMessage("Nominal pembayaran harus lebih dari 0");
      return;
    }

    if ((paymentMethod === "TRANSFER" || paymentMethod === "QRIS") && numAmount > order.remainingAmount) {
      setErrorMessage(
        `Nominal transfer/QRIS tidak boleh melebihi sisa tagihan (Rp ${order.remainingAmount.toLocaleString(
          "id-ID"
        )})`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await apiClient.post(`/api/orders/${order.id}/payments`, {
        amount: numAmount,
        paymentMethod,
        cashReceived: paymentMethod === "CASH" ? numCashReceived : null,
        referenceNote: referenceNote.trim() || null,
      });

      if (!res.success) {
        throw new Error(res.error || "Gagal memproses pembayaran");
      }

      toast.success(`Pembayaran untuk nota ${order.invoiceNumber} berhasil dicatat!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      const msg = errorObj.message || "Gagal memproses pembayaran";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-muted/30">
          <div>
            <h2 className="text-base font-bold text-text">Terima Pelunasan / Pembayaran</h2>
            <p className="text-xs text-text-muted mt-0.5">Nota: {order.invoiceNumber}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text rounded-xl hover:bg-surface-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Tutup"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Sisa Tagihan Info */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <span className="text-xs text-amber-700 font-medium">Sisa Tagihan Belum Lunas:</span>
            <span className="text-base font-bold text-amber-600 tabular-nums">
              Rp {order.remainingAmount.toLocaleString("id-ID")}
            </span>
          </div>

          {/* Payment Method Switcher */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-2">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("CASH")}
                className={`py-2 text-xs font-medium rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                  paymentMethod === "CASH"
                    ? "bg-primary text-white border-primary"
                    : "bg-surface border-border text-text-muted hover:text-text"
                }`}
              >
                <Banknote className="size-3.5" />
                <span>Tunai</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("TRANSFER")}
                className={`py-2 text-xs font-medium rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                  paymentMethod === "TRANSFER"
                    ? "bg-primary text-white border-primary"
                    : "bg-surface border-border text-text-muted hover:text-text"
                }`}
              >
                <CreditCard className="size-3.5" />
                <span>Transfer</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("QRIS")}
                className={`py-2 text-xs font-medium rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                  paymentMethod === "QRIS"
                    ? "bg-primary text-white border-primary"
                    : "bg-surface border-border text-text-muted hover:text-text"
                }`}
              >
                <QrCode className="size-3.5" />
                <span>QRIS</span>
              </button>
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Nominal yang Dibayarkan (Rp) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value === "" ? "" : parseInt(e.target.value, 10))
              }
              className="w-full px-3.5 py-2.5 text-base sm:text-sm bg-surface border border-border rounded-xl text-text font-bold tabular-nums focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

          {/* Cash Received if Cash */}
          {paymentMethod === "CASH" && (
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                Uang Diterima dari Pelanggan (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={cashReceived}
                onChange={(e) =>
                  setCashReceived(e.target.value === "" ? "" : parseInt(e.target.value, 10))
                }
                className="w-full px-3.5 py-2.5 text-base sm:text-sm bg-surface border border-border rounded-xl text-text tabular-nums focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
              {cashChange > 0 && (
                <div className="mt-1 text-xs text-emerald-600 font-semibold tabular-nums">
                  Kembalian Tunai: Rp {cashChange.toLocaleString("id-ID")}
                </div>
              )}
            </div>
          )}

          {/* Reference Note */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Catatan Referensi (Opsional)
            </label>
            <input
              type="text"
              placeholder="Nomor rekening pengirim, kode ref QRIS..."
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              className="w-full px-3.5 py-2.5 text-base sm:text-sm bg-surface border border-border rounded-xl text-text placeholder:text-text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text rounded-xl hover:bg-surface-muted transition-colors min-h-[44px]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors min-h-[44px] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>Simpan Pembayaran</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
