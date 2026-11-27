"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X, Banknote, CreditCard, QrCode, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

export interface VendorOptionItem {
  id: string;
  name: string;
}

interface VendorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    invoiceNumber: string;
    totalProductionCost: number;
    vendorPaidAmount: number;
  } | null;
  vendorOptions: VendorOptionItem[];
  onSuccess: () => void;
}

export function VendorPaymentModal({
  isOpen,
  onClose,
  order,
  vendorOptions,
  onSuccess,
}: VendorPaymentModalProps) {
  const queryClient = useQueryClient();
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [manualVendorName, setManualVendorName] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "QRIS">("TRANSFER");
  const [referenceNote, setReferenceNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const wasOpenRef = useRef(false);
  const remaining = order
    ? Math.max(0, order.totalProductionCost - order.vendorPaidAmount)
    : 0;

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!justOpened || !order) return;

    setAmount(remaining > 0 ? String(remaining) : "");
    setPaymentMethod("TRANSFER");
    setReferenceNote("");
    setErrorMessage("");
    if (vendorOptions.length > 0) {
      setSelectedVendorId(vendorOptions[0].id);
      setManualVendorName("");
    } else {
      setSelectedVendorId("__MANUAL__");
      setManualVendorName("");
    }
  }, [isOpen, order, remaining, vendorOptions]);

  if (!isOpen || !order) return null;

  const isManual = selectedVendorId === "__MANUAL__";
  const parsedAmount = parseInt(amount, 10) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;

    if (parsedAmount <= 0) {
      setErrorMessage("Nominal setoran vendor minimal Rp 1.");
      return;
    }
    if (parsedAmount > remaining) {
      setErrorMessage(
        `Nominal setoran melebihi sisa kewajiban modal (Rp ${remaining.toLocaleString("id-ID")}).`
      );
      return;
    }
    if (isManual && !manualVendorName.trim()) {
      setErrorMessage("Isi nama vendor penerima setoran.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = isManual
        ? {
            vendorId: null,
            vendorName: manualVendorName.trim(),
            amount: parsedAmount,
            paymentMethod,
            referenceNote: referenceNote.trim() || null,
          }
        : {
            vendorId: selectedVendorId,
            amount: parsedAmount,
            paymentMethod,
            referenceNote: referenceNote.trim() || null,
          };

      const res = await apiClient.post(
        `/api/orders/${order.id}/vendor-payments`,
        payload
      );
      if (!res.success) {
        throw new Error(res.error || "Gagal mencatat setoran vendor");
      }

      toast.success("Setoran modal vendor berhasil dicatat.");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mencatat setoran vendor";
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
              Catat Setoran Modal Vendor
            </h2>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              Nota: {order.invoiceNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text rounded-xl hover:bg-surface-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Tutup modal setoran"
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

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 font-medium">
              Sisa Kewajiban Modal Vendor:
            </span>
            <span className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums shrink-0">
              Rp {remaining.toLocaleString("id-ID")}
            </span>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
              Vendor Penerima Setoran <span className="text-danger">*</span>
            </label>
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="h-11 w-full px-3.5 text-base sm:text-sm bg-surface-muted border border-border rounded-xl text-text focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            >
              {vendorOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
              <option value="__MANUAL__">Vendor Lainnya / Ketik Manual</option>
            </select>
          </div>

          {isManual && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
                Nama Vendor Penerima <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={manualVendorName}
                onChange={(e) => setManualVendorName(e.target.value)}
                placeholder="Contoh: Percetakan Mitra Abadi"
                required
                className="h-11 w-full px-3.5 text-base sm:text-sm bg-surface-muted border border-border rounded-xl text-text focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="block text-xs sm:text-sm font-medium text-text-muted">
                Nominal Setoran (Rp) <span className="text-danger">*</span>
              </label>
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(remaining))}
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  Lunasi Semua
                </button>
              )}
            </div>
            <input
              type="number"
              min="1"
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Contoh: 20000"
              required
              className="h-11 w-full px-3.5 font-mono text-base sm:text-sm tabular-nums bg-surface-muted border border-border rounded-xl text-text focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-text-muted mb-2">
              Metode Transfer / Bayar
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { key: "TRANSFER", label: "Transfer", icon: CreditCard },
                  { key: "CASH", label: "Tunai", icon: Banknote },
                  { key: "QRIS", label: "QRIS", icon: QrCode },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPaymentMethod(key)}
                  className={`min-h-11 py-2 text-xs sm:text-sm font-medium rounded-xl border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    paymentMethod === key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-surface border-border text-text-muted hover:text-text"
                  }`}
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-text-muted mb-1.5">
              Catatan / No. Referensi Transfer
            </label>
            <input
              type="text"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              placeholder="Contoh: BCA trf DP cetak banner"
              maxLength={200}
              className="h-11 w-full px-3.5 text-base sm:text-sm bg-surface-muted border border-border rounded-xl text-text focus:outline-hidden focus:ring-2 focus:ring-primary/40"
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
            disabled={isSubmitting || remaining <= 0}
            className="inline-flex min-h-[44px] items-center gap-2 px-5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-transform cursor-pointer"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            <span>{isSubmitting ? "Menyimpan..." : "Simpan Setoran"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
