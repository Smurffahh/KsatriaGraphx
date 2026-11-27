"use client";

import React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Receipt,
  RotateCcw,
} from "lucide-react";

interface PosSuccessModalProps {
  isOpen: boolean;
  onNewTransaction: () => void;
  orderData: {
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    paidAmount: number;
    remainingAmount: number;
    changeAmount: number;
    paymentStatus: string;
  } | null;
}

export function PosSuccessModal({
  isOpen,
  onNewTransaction,
  orderData,
}: PosSuccessModalProps) {
  if (!isOpen || !orderData) return null;

  const isPaid = orderData.paymentStatus === "PAID";
  const isPartial = orderData.paymentStatus === "PARTIAL";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-7 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-8 stroke-[2.5]" />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-text">Transaksi Berhasil Disimpan!</h2>
          <p className="text-sm text-text-muted mt-1 leading-relaxed">
            Nota sudah tercatat. Anda bisa mencetak struk atau langsung membuat transaksi baru.
          </p>
        </div>

        {/* Invoice Summary Box */}
        <div className="p-4 rounded-xl bg-surface-muted/50 border border-border space-y-3 text-left text-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-text-muted">Nomor Nota:</span>
            <span className="font-bold text-sm text-primary tracking-wide">
              {orderData.invoiceNumber}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-text-muted">Status Pembayaran:</span>
            <span
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-md ${
                isPaid
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  : isPartial
                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                  : "bg-danger/10 text-danger border border-danger/20"
              }`}
            >
              {orderData.paymentStatus}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-text-muted">Grand Total:</span>
            <span className="font-semibold text-text text-sm tabular-nums">
              Rp {orderData.grandTotal.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-text-muted">Nominal Dibayar:</span>
            <span className="font-semibold text-emerald-600 text-sm tabular-nums">
              Rp {orderData.paidAmount.toLocaleString("id-ID")}
            </span>
          </div>

          {orderData.remainingAmount > 0 && (
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-xs sm:text-sm font-medium">Sisa Piutang:</span>
              <span className="font-bold text-sm tabular-nums">
                Rp {orderData.remainingAmount.toLocaleString("id-ID")}
              </span>
            </div>
          )}

          {orderData.changeAmount > 0 && (
            <div className="flex items-center justify-between text-emerald-600 pt-2 border-t border-border/60">
              <span className="text-xs sm:text-sm font-medium">Kembalian Tunai:</span>
              <span className="font-bold text-sm tabular-nums">
                Rp {orderData.changeAmount.toLocaleString("id-ID")}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <Link
            href={`/orders/detail?id=${orderData.id}`}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold bg-primary hover:bg-primary-hover text-white rounded-xl shadow-xs transition-colors min-h-[44px]"
          >
            <Receipt className="size-4" />
            <span>Lihat Detail Nota & Rincian</span>
          </Link>

          <button
            type="button"
            onClick={onNewTransaction}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-text bg-surface-muted hover:bg-border rounded-xl transition-colors min-h-[44px]"
          >
            <RotateCcw className="size-4" />
            <span>Mulai Transaksi Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
}
