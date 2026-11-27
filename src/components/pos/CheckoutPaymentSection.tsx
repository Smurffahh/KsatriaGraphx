"use client";

import React from "react";
import { Banknote, CreditCard, QrCode } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import type { PaymentMethod } from "@/lib/calculator/pricing";

export type PaymentPreset = "FULL" | "DP_50" | "ZERO" | "CUSTOM";

interface CheckoutPaymentSectionProps {
  paymentPreset: PaymentPreset;
  paymentMethod: PaymentMethod;
  paymentAmount: number | "";
  cashReceived: number | "";
  cashChange: number;
  onSelectPreset: (preset: PaymentPreset) => void;
  onSelectMethod: (method: PaymentMethod) => void;
  onPaymentAmountChange: (val: number | "") => void;
  onCashReceivedChange: (val: number | "") => void;
}

const PRESET_OPTIONS: Array<{
  key: PaymentPreset;
  label: string;
  activeClass: string;
}> = [
  {
    key: "FULL",
    label: "Lunas",
    activeClass: "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold",
  },
  {
    key: "DP_50",
    label: "DP 50%",
    activeClass: "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 font-semibold",
  },
  {
    key: "ZERO",
    label: "Belum Bayar",
    activeClass: "bg-danger/10 border-danger text-danger font-semibold",
  },
  {
    key: "CUSTOM",
    label: "Nominal Lain",
    activeClass: "bg-primary/10 border-primary text-primary font-semibold",
  },
];

const METHOD_OPTIONS: Array<{
  key: PaymentMethod;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "CASH", label: "Tunai", icon: Banknote },
  { key: "TRANSFER", label: "Transfer", icon: CreditCard },
  { key: "QRIS", label: "QRIS", icon: QrCode },
];

/** Bagian pemilihan skema pembayaran awal (Lunas / DP / Belum Bayar) pada checkout POS. */
export function CheckoutPaymentSection({
  paymentPreset,
  paymentMethod,
  paymentAmount,
  cashReceived,
  cashChange,
  onSelectPreset,
  onSelectMethod,
  onPaymentAmountChange,
  onCashReceivedChange,
}: CheckoutPaymentSectionProps) {
  return (
    <div className="p-4 rounded-xl bg-surface-muted/30 border border-border space-y-3.5">
      <span className="text-xs sm:text-sm font-semibold text-text block">
        Pembayaran Pertama
      </span>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {PRESET_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onSelectPreset(opt.key)}
            className={`min-h-11 sm:min-h-10 py-2 px-3 text-xs sm:text-sm font-medium rounded-xl border transition-colors cursor-pointer ${
              paymentPreset === opt.key
                ? opt.activeClass
                : "bg-surface border-border text-text-muted hover:text-text"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {paymentPreset !== "ZERO" && (
        <>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {METHOD_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => onSelectMethod(key)}
                className={`min-h-11 sm:min-h-10 py-2 px-2 text-xs sm:text-sm font-medium rounded-xl border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  paymentMethod === key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-surface border-border text-text-muted hover:text-text"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
                Nominal Dibayar (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={paymentAmount}
                onChange={(e) => {
                  onSelectPreset("CUSTOM");
                  onPaymentAmountChange(
                    e.target.value === "" ? "" : parseInt(e.target.value, 10)
                  );
                }}
                className="h-11 w-full px-3.5 text-base sm:text-sm bg-surface border border-border rounded-xl text-text font-semibold tabular-nums focus:outline-hidden focus:ring-2 focus:ring-ring/30"
              />
            </div>

            {paymentMethod === "CASH" && (
              <div>
                <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
                  Uang Diterima (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  value={cashReceived}
                  onChange={(e) =>
                    onCashReceivedChange(
                      e.target.value === "" ? "" : parseInt(e.target.value, 10)
                    )
                  }
                  className="h-11 w-full px-3.5 text-base sm:text-sm bg-surface border border-border rounded-xl text-text tabular-nums focus:outline-hidden focus:ring-2 focus:ring-ring/30"
                />
                {cashChange > 0 && (
                  <div className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                    Kembalian Tunai: {formatRupiah(cashChange)}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
