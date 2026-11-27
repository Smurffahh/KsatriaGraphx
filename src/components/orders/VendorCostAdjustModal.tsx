"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Save, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

interface VendorCostAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    totalProductionCost: number;
    vendorPaidAmount: number;
  } | null;
  onSuccess: () => void;
}

export function VendorCostAdjustModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}: VendorCostAdjustModalProps) {
  const queryClient = useQueryClient();
  const [costValue, setCostValue] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!justOpened || !order) return;

    setCostValue(String(order.totalProductionCost));
    setReason("");
    setErrorMessage("");
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const parsedCost = Math.max(0, parseInt(costValue || "0", 10) || 0);
  const previewProfit = order.grandTotal - parsedCost;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;

    if (parsedCost < order.vendorPaidAmount) {
      setErrorMessage(
        `Modal baru tidak boleh lebih kecil dari total sudah disetor (Rp ${order.vendorPaidAmount.toLocaleString("id-ID")}).`
      );
      return;
    }
    if (reason.trim().length < 3) {
      setErrorMessage("Alasan penyesuaian wajib diisi minimal 3 karakter.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await apiClient.patch(`/api/orders/${order.id}/vendor-cost`, {
        totalProductionCost: parsedCost,
        reason: reason.trim(),
      });
      if (!res.success) {
        throw new Error(res.error || "Gagal menyesuaikan modal vendor");
      }

      toast.success("Modal aktual vendor berhasil diperbarui.");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyesuaikan modal vendor";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6 border-b border-border bg-surface-muted/30">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-text">
              Sesuaikan Modal Aktual Vendor
            </h2>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              Nota: {order.invoiceNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text rounded-xl hover:bg-surface-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Tutup modal modal aktual"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3.5 text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-2.5">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-surface-muted border border-border space-y-1.5 text-xs tabular-nums">
            <div className="flex justify-between">
              <span className="text-text-muted">Omzet Tagihan (Grand Total):</span>
              <span className="font-semibold text-text">
                Rp {order.grandTotal.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Minimal Modal (Sudah Disetor):</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                Rp {order.vendorPaidAmount.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-border/60">
              <span className="text-text-muted">Proyeksi Laba Kotor Baru:</span>
              <span
                className={`font-bold ${
                  previewProfit < 0
                    ? "text-destructive"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {previewProfit < 0
                  ? `-Rp ${Math.abs(previewProfit).toLocaleString("id-ID")}`
                  : `Rp ${previewProfit.toLocaleString("id-ID")}`}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
              Modal Produksi Aktual (Rp) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              min={order.vendorPaidAmount}
              value={costValue}
              onChange={(e) => setCostValue(e.target.value)}
              required
              className="h-11 w-full px-3.5 font-mono text-base sm:text-sm tabular-nums bg-surface-muted border border-border rounded-xl text-text focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
              Alasan Penyesuaian <span className="text-danger">*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Tagihan riil percetakan naik karena tambah lembur / bahan"
              required
              maxLength={200}
              className="w-full px-3.5 py-2.5 text-base sm:text-sm bg-surface-muted border border-border rounded-xl text-text focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-5 py-4 sm:px-6 border-t border-border bg-surface-muted/30">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-[44px] px-4 rounded-xl border border-border text-sm font-semibold text-text hover:bg-surface-muted cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex min-h-[44px] items-center gap-2 px-5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-transform cursor-pointer"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span>{isSubmitting ? "Menyimpan..." : "Simpan Modal"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
