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
        return <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">Biaya Tetap (Flat)</span>;
      case "PER_QTY":
        return <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">Per Lembar / Qty</span>;
      case "PER_AREA":
        return <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">Per Luas (m²)</span>;
    }
  }

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Daftar Layanan Finishing & Pasca Cetak
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kelola opsi finishing tambahan seperti Mata Ayam, Selongsong, Laminasi Doff/Glossy, Jahit, dll.
          </p>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-95"
          >
            <Plus className="size-4" />
            Tambah Finishing
          </button>
        )}
      </div>

      {/* Daftar Finishing */}
      {finishings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Scissors className="size-10 text-slate-400 dark:text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Belum Ada Opsi Finishing</p>
          <p className="text-xs text-slate-500 mt-0.5">Tambahkan layanan finishing seperti mata ayam, laminasi, jahit tepi, dll.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {finishings.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                    <Scissors className="size-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {item.name}
                      </span>
                      {getChargeTypeBadge(item.chargeType)}
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          item.isActive
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {item.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Harga Standar:{" "}
                      <span className="font-semibold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
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
                      className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
                      className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 active:scale-95 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {selectedFinishing ? "Edit Finishing" : "Tambah Finishing Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nama Layanan Finishing <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Contoh: Mata Ayam 4 Sudut, Laminasi Doff"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tipe Perhitungan Biaya <span className="text-rose-500">*</span>
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base sm:text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="FLAT">Biaya Tetap (Flat per Item)</option>
                  <option value="PER_QTY">Per Lembar / Qty</option>
                  <option value="PER_AREA">Per Luas Meteran (m²)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Harga Default (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={defaultPrice || ""}
                    onChange={(e) => setDefaultPrice(parseInt(e.target.value, 10) || 0)}
                    required
                    placeholder="Contoh: 5000"
                    className="w-full font-mono text-sm tabular-nums rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Label Satuan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={unitLabel}
                    onChange={(e) => setUnitLabel(e.target.value)}
                    required
                    placeholder="pcs, m², paket"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="finishingIsActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="size-4.5 rounded text-blue-600"
                />
                <label htmlFor="finishingIsActive" className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none">
                  Status Aktif & Siap Digunakan di POS
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="min-h-[44px] rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Hapus Finishing?
            </h3>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Anda yakin ingin menghapus finishing <strong>{deleteTarget.name}</strong>?
            </p>

            {deleteError && (
              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                <AlertCircle className="size-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="min-h-[40px] rounded-xl border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="min-h-[40px] rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
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
