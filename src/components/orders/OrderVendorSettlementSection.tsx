"use client";

import React from "react";
import { Banknote, ChevronDown, Edit3 } from "lucide-react";
import { VendorStatusBadge } from "@/components/vendors/VendorStatusBadge";
import { formatRupiah, formatShortDateTimeId } from "@/lib/format";
import type { VendorPaymentStatus } from "@/lib/vendors/settlement";
import type { VendorPaymentRecord } from "./OrderVendorPanel";

interface OrderVendorSettlementSectionProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  vendorPaymentStatus?: VendorPaymentStatus;
  totalCost: number;
  paidAmount: number;
  remainingPayable: number;
  progressPercent: number;
  isCancelled: boolean;
  vendorPayments: VendorPaymentRecord[];
  onOpenCostModal: () => void;
  onOpenPaymentModal: () => void;
}

/** Bagian pelunasan modal produksi dari Owner ke percetakan vendor mitra. */
export function OrderVendorSettlementSection({
  isOpen,
  onToggleOpen,
  vendorPaymentStatus,
  totalCost,
  paidAmount,
  remainingPayable,
  progressPercent,
  isCancelled,
  vendorPayments,
  onOpenCostModal,
  onOpenPaymentModal,
}: OrderVendorSettlementSectionProps) {
  return (
    <div id="section-vendor-settlement" className="bg-card border border-border rounded-2xl shadow-2xs overflow-hidden">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        className="w-full p-4 sm:p-5 border-b border-border bg-muted/40 flex flex-wrap items-center justify-between gap-2.5 text-left cursor-pointer hover:bg-muted/60 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Banknote className="size-4.5 text-amber-600 shrink-0" />
            <span>Setoran Modal ke Vendor</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Catat DP maupun pelunasan biaya cetak agar tidak tercampur uang kas bersih toko.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <VendorStatusBadge status={vendorPaymentStatus} />
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform duration-150 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="p-4 sm:p-5 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
              <span>Progres Pelunasan Modal</span>
              <span className="font-semibold text-foreground">{progressPercent}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-[width] duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 tabular-nums">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
              <span className="text-xs text-muted-foreground block">
                Total Modal Vendor
              </span>
              <span className="text-lg font-bold text-foreground mt-0.5 block">
                {formatRupiah(totalCost)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
              <span className="text-xs text-muted-foreground block">
                Sudah Disetor
              </span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                {formatRupiah(paidAmount)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
              <span className="text-xs text-muted-foreground block">
                Sisa Wajib Setor
              </span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
                {formatRupiah(remainingPayable)}
              </span>
            </div>
          </div>

          {!isCancelled && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onOpenCostModal}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted active:scale-[0.96] transition-[transform,background-color] cursor-pointer"
              >
                <Edit3 className="size-4" />
                <span>Sesuaikan Modal Aktual</span>
              </button>
              <button
                type="button"
                disabled={remainingPayable <= 0}
                onClick={onOpenPaymentModal}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-2xs hover:bg-primary-hover active:not-disabled:scale-[0.96] disabled:opacity-50 transition-[transform,background-color] cursor-pointer"
              >
                <Banknote className="size-4" />
                <span>Catat Setoran Vendor</span>
              </button>
            </div>
          )}

          {vendorPayments.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs sm:text-sm text-muted-foreground">
              Belum ada setoran modal ke vendor untuk pesanan ini.
            </div>
          ) : (
            <div className="divide-y divide-border/60 rounded-xl border border-border overflow-hidden">
              {vendorPayments.map((vp) => (
                <div
                  key={vp.id}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm bg-card"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground tabular-nums">
                        {formatRupiah(vp.amount)}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-semibold bg-muted rounded border border-border">
                        {vp.paymentMethod}
                      </span>
                      <span className="text-xs font-medium text-primary">
                        {vp.vendorNameSnapshot}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      Dicatat oleh {vp.recordedByUserName || "Owner"} &bull;{" "}
                      {formatShortDateTimeId(vp.paidAt)}
                    </p>
                  </div>
                  {vp.referenceNote && (
                    <span className="text-xs text-muted-foreground italic">
                      {vp.referenceNote}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
