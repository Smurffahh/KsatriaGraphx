"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Loader2,
  AlertCircle,
  Clock,
  PlayCircle,
  PackageCheck,
  CheckCircle,
  Ban,
  AlertTriangle,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";

interface OrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    invoiceNumber: string;
    productionStatus: string;
  } | null;
  userRole?: "OWNER" | "KASIR";
  onSuccess: () => void;
}

export function OrderStatusModal({
  isOpen,
  onClose,
  order,
  userRole = "KASIR",
  onSuccess,
}: OrderStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("QUEUED");
  const [cancelReason, setCancelReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (order) {
      setSelectedStatus(order.productionStatus);
      setCancelReason("");
      setNotes("");
      setErrorMessage("");
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedStatus === "CANCELLED") {
      if (userRole !== "OWNER") {
        setErrorMessage("Hanya Owner yang berhak membatalkan nota");
        return;
      }
      if (!cancelReason.trim() || cancelReason.trim().length < 5) {
        setErrorMessage("Alasan pembatalan nota wajib diisi minimal 5 karakter");
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await apiClient.patch(`/api/orders/${order.id}`, {
        productionStatus: selectedStatus,
        cancelReason: selectedStatus === "CANCELLED" ? cancelReason.trim() : null,
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        throw new Error(res.error || "Gagal memperbarui status nota");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setErrorMessage(errorObj.message || "Gagal memperbarui status nota");
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
            <h2 className="text-base font-bold text-text">Perbarui Status Produksi</h2>
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

          {/* Workflow Status Options */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-muted">
              Pilih Tahapan Pengerjaan
            </label>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setSelectedStatus("QUEUED")}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                  selectedStatus === "QUEUED"
                    ? "bg-primary/10 border-primary text-primary font-semibold"
                    : "bg-surface border-border text-text-muted hover:text-text"
                }`}
              >
                <Clock className="size-4 shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold text-text block">Antrean Desain / Cetak (QUEUED)</span>
                  <span className="text-[11px] text-text-muted">File sudah masuk, menunggu giliran mesin</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus("IN_PROGRESS")}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                  selectedStatus === "IN_PROGRESS"
                    ? "bg-amber-500/10 border-amber-500 text-amber-600 font-semibold"
                    : "bg-surface border-border text-text-muted hover:text-text"
                }`}
              >
                <PlayCircle className="size-4 shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold text-text block">Sedang Dicetak / Finishing (IN_PROGRESS)</span>
                  <span className="text-[11px] text-text-muted">Proses produksi sedang berjalan</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus("READY")}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                  selectedStatus === "READY"
                    ? "bg-blue-500/10 border-blue-500 text-blue-600 font-semibold"
                    : "bg-surface border-border text-text-muted hover:text-text"
                }`}
              >
                <PackageCheck className="size-4 shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold text-text block">Selesai & Siap Diambil (READY)</span>
                  <span className="text-[11px] text-text-muted">Barang sudah jadi di etalase/rak kasir</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus("COMPLETED")}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                  selectedStatus === "COMPLETED"
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 font-semibold"
                    : "bg-surface border-border text-text-muted hover:text-text"
                }`}
              >
                <CheckCircle className="size-4 shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold text-text block">Sudah Diserahkan ke Pelanggan (COMPLETED)</span>
                  <span className="text-[11px] text-text-muted">Pesanan selesai diambil oleh pelanggan</span>
                </div>
              </button>
            </div>
          </div>

          {/* Owner Void Option */}
          {userRole === "OWNER" && (
            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedStatus("CANCELLED")}
                className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                  selectedStatus === "CANCELLED"
                    ? "bg-danger/10 border-danger text-danger font-semibold"
                    : "bg-surface border-border text-danger/80 hover:bg-danger/5"
                }`}
              >
                <Ban className="size-4 shrink-0 text-danger" />
                <div className="text-xs">
                  <span className="font-semibold text-danger block">Batalkan / Void Nota (CANCELLED)</span>
                  <span className="text-[11px] text-text-muted">
                    Batalkan transaksi ini (khusus Owner, wajib alasan)
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* Cancel Reason Input */}
          {selectedStatus === "CANCELLED" && (
            <div className="p-3.5 rounded-xl bg-danger/5 border border-danger/20 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-danger">
                <AlertTriangle className="size-4" />
                <span>Alasan Pembatalan / Void Nota</span>
              </div>
              <textarea
                rows={2}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Sebutkan alasan pembatalan (minimal 5 karakter)..."
                className="w-full px-3 py-2 text-xs bg-surface border border-danger/30 rounded-xl text-text placeholder:text-text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-danger/30"
              />
              <p className="text-[11px] text-text-muted">
                Tindakan pembatalan akan dicatat secara permanen di audit log forensik.
              </p>
            </div>
          )}

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
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-xs transition-colors min-h-[44px] disabled:opacity-50 ${
                selectedStatus === "CANCELLED"
                  ? "bg-danger hover:bg-danger/90"
                  : "bg-primary hover:bg-primary-hover"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Perubahan Status</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
