"use client";

import React, { useState } from "react";
import { Plus, Edit2, Trash2, X, AlertCircle, Save, Scissors } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

export interface FinishingItem {
  id: string;
  name: string;
  chargeType: "FLAT" | "PER_QTY" | "PER_AREA";
  defaultPrice: number;
  unitLabel: string;
  isActive: boolean;
  createdAt?: string;
}

interface FinishingTabProps {
  finishings: FinishingItem[];
  onRefresh: () => Promise<void>;
  isOwner: boolean;
}

export function FinishingTab({ finishings, onRefresh, isOwner }: FinishingTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFinishing, setSelectedFinishing] = useState<FinishingItem | null>(null);
  const [name, setName] = useState("");
  const [chargeType, setChargeType] = useState<"FLAT" | "PER_QTY" | "PER_AREA">("FLAT");
  const [defaultPrice, setDefaultPrice] = useState(0);
  const [unitLabel, setUnitLabel] = useState("pcs");
  const [isActive, setIsActive] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Hapus State
  const [deleteTarget, setDeleteTarget] = useState<FinishingItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleOpenAdd() {
    setSelectedFinishing(null);
    setName("");
    setChargeType("FLAT");
    setDefaultPrice(0);
    setUnitLabel("pcs");
    setIsActive(true);
    setErrorMessage(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(item: FinishingItem) {
    setSelectedFinishing(item);
    setName(item.name);
    setChargeType(item.chargeType);
    setDefaultPrice(item.defaultPrice);
    setUnitLabel(item.unitLabel);
    setIsActive(item.isActive);
    setErrorMessage(null);
    setIsModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Nama finishing wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (selectedFinishing) {
        const res = await apiClient(`/api/finishings/${selectedFinishing.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim(),
            chargeType,
            defaultPrice,
            unitLabel: unitLabel.trim(),
            isActive,
          }),
        });

        if (!res.success) {
          throw new Error(res.error || "Gagal memperbarui finishing");
        }
        toast.success("Opsi finishing berhasil diperbarui");
      } else {
        const res = await apiClient("/api/finishings", {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            chargeType,
            defaultPrice,
            unitLabel: unitLabel.trim(),
            isActive,
          }),
        });

        if (!res.success) {
          throw new Error(res.error || "Gagal menambahkan finishing");
        }
        toast.success("Opsi finishing baru berhasil ditambahkan");
      }

      await onRefresh();
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await apiClient(`/api/finishings/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.success) {
        throw new Error(res.error || "Gagal menghapus finishing");
      }

      toast.success(`Finishing "${deleteTarget.name}" berhasil dihapus`);
      await onRefresh();
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  }

  function getChargeTypeBadge(type: "FLAT" | "PER_QTY" | "PER_AREA") {
    switch (type) {
      case "FLAT":
        return <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">Biaya Tetap (Flat)</span>;
      case "PER_QTY":
        return <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Per Lembar / Qty</span>;
      case "PER_AREA":
        return <span className="inline-flex rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-[10px] font-semibold">Per Luas (m²)</span>;
    }
  }

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">
            Daftar Layanan Finishing & Pasca Cetak
          </h2>
          <p className="text-xs text-muted-foreground">
            Kelola opsi finishing tambahan seperti Mata Ayam, Selongsong, Laminasi Doff/Glossy, Jahit, dll.
          </p>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-95 transition-colors"
          >
            <Plus className="size-4" />
            Tambah Finishing
          </button>
        )}
      </div>

      {/* Daftar Finishing */}
      {finishings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-12 text-center">
          <Scissors className="size-10 text-muted-foreground mb-2" />
          <p className="text-sm font-semibold text-foreground">Belum Ada Opsi Finishing</p>
          <p className="text-xs text-muted-foreground mt-0.5">Tambahkan layanan finishing seperti mata ayam, laminasi, jahit tepi, dll.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-2xs">
          <div className="divide-y divide-border">
            {finishings.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Scissors className="size-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {item.name}
                      </span>
                      {getChargeTypeBadge(item.chargeType)}
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          item.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Harga Standar:{" "}
                      <span className="font-semibold font-mono text-foreground tabular-nums">
                        Rp {item.defaultPrice.toLocaleString("id-ID")}
                      </span>{" "}
                      / {item.unitLabel}
                    </p>
                  </div>
                </div>

                {isOwner && (
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors"
                    >
                      <Edit2 className="size-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTarget(item);
                        setDeleteError(null);
                      }}
                      className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                      Hapus
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Finishing */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="text-base font-bold text-foreground">
                {selectedFinishing ? "Edit Finishing" : "Tambah Finishing Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Nama Layanan Finishing <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Contoh: Mata Ayam 4 Sudut, Laminasi Doff"
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Tipe Perhitungan Biaya <span className="text-destructive">*</span>
                </label>
                <select
                  value={chargeType}
                  onChange={(e) => {
                    const ct = e.target.value as "FLAT" | "PER_QTY" | "PER_AREA";
                    setChargeType(ct);
                    if (ct === "PER_AREA") setUnitLabel("m²");
                    else if (ct === "FLAT") setUnitLabel("order");
                    else setUnitLabel("pcs");
                  }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base sm:text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="FLAT">Biaya Tetap (Flat per Item)</option>
                  <option value="PER_QTY">Per Lembar / Qty</option>
                  <option value="PER_AREA">Per Luas Meteran (m²)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Harga Default (Rp) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={defaultPrice || ""}
                    onChange={(e) => setDefaultPrice(parseInt(e.target.value, 10) || 0)}
                    required
                    placeholder="Contoh: 5000"
                    className="w-full font-mono text-sm tabular-nums rounded-lg border border-input bg-background px-3.5 py-2.5 text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Label Satuan <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={unitLabel}
                    onChange={(e) => setUnitLabel(e.target.value)}
                    required
                    placeholder="pcs, m², paket"
                    className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="finishingIsActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="size-4.5 rounded border-input text-primary focus:ring-ring"
                />
                <label htmlFor="finishingIsActive" className="text-sm font-medium text-foreground select-none">
                  Status Aktif & Siap Digunakan di POS
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="min-h-[44px] rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <Save className="size-4" />
                  {isSubmitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-xs" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
            <h3 className="text-base font-bold text-foreground">
              Hapus Finishing?
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Anda yakin ingin menghapus finishing <strong className="text-foreground">{deleteTarget.name}</strong>?
            </p>

            {deleteError && (
              <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="min-h-[40px] rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="min-h-[40px] rounded-lg bg-destructive px-3.5 py-1.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
