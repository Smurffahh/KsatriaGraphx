"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, AlertCircle, Save } from "lucide-react";
import { ProductImageUploader } from "./ProductImageUploader";
import { validatePriceTiers, type PriceTierInput } from "@/lib/validators/product";

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

export interface ProductFormData {
  id?: string;
  categoryId: string;
  name: string;
  sku: string;
  description: string;
  imageUrl: string | null;
  imageKey: string | null;
  pricingType: "AREA" | "UNIT" | "CUSTOM";
  unitLabel: string;
  basePrice: number;
  minArea: number;
  areaRounding: "EXACT" | "ROUND_UP_0_5" | "ROUND_UP_1";
  isActive: boolean;
  tiers: PriceTierInput[];
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => Promise<void>;
  initialData?: ProductFormData | null;
  categories: CategoryOption[];
  isSubmitting?: boolean;
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories,
  isSubmitting = false,
}: ProductFormModalProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    categoryId: "",
    name: "",
    sku: "",
    description: "",
    imageUrl: null,
    imageKey: null,
    pricingType: "UNIT",
    unitLabel: "pcs",
    basePrice: 0,
    minArea: 1.0,
    areaRounding: "EXACT",
    isActive: true,
    tiers: [],
  });

  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        categoryId: categories[0]?.id || "",
        name: "",
        sku: "",
        description: "",
        imageUrl: null,
        imageKey: null,
        pricingType: "UNIT",
        unitLabel: "pcs",
        basePrice: 0,
        minArea: 1.0,
        areaRounding: "EXACT",
        isActive: true,
        tiers: [],
      });
    }
    setFormError(null);
  }, [initialData, categories, isOpen]);

  if (!isOpen) return null;

  function handleAddTier() {
    const lastTier = formData.tiers[formData.tiers.length - 1];
    let nextMin = 1;
    if (lastTier) {
      nextMin = (lastTier.maxQty || lastTier.minQty) + 1;
    }

    setFormData((prev) => ({
      ...prev,
      tiers: [
        ...prev.tiers,
        {
          minQty: nextMin,
          maxQty: null,
          unitPrice: prev.basePrice > 0 ? prev.basePrice : 0,
        },
      ],
    }));
  }

  function handleRemoveTier(index: number) {
    setFormData((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== index),
    }));
  }

  function handleTierChange(index: number, field: keyof PriceTierInput, val: unknown) {
    setFormData((prev) => {
      const updated = [...prev.tiers];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, tiers: updated };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError("Nama produk wajib diisi.");
      return;
    }

    if (!formData.categoryId) {
      setFormError("Pilih kategori untuk produk ini.");
      return;
    }

    if (formData.pricingType === "UNIT" && formData.tiers.length > 0) {
      const check = validatePriceTiers(formData.tiers);
      if (!check.isValid) {
        setFormError(check.error || "Rentang tingkat harga grosir tidak valid.");
        return;
      }
    }

    try {
      await onSubmit(formData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan data produk.";
      setFormError(msg);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-6 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
              {initialData?.id ? "Edit Produk Percetakan" : "Tambah Produk Baru"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kelola detail spesifikasi harga dan foto produk
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:scale-95 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Tutup Dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              <AlertCircle className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Foto Produk Uploader */}
          <ProductImageUploader
            currentImageUrl={formData.imageUrl}
            onUploadSuccess={({ imageUrl, imageKey }) => {
              setFormData((prev) => ({ ...prev, imageUrl, imageKey }));
            }}
            onRemoveImage={() => {
              setFormData((prev) => ({ ...prev, imageUrl: null, imageKey: null }));
            }}
            disabled={isSubmitting}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Nama Produk */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nama Produk <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Contoh: Banner Flexi 280gr, Kaos Katun 30s"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Kategori */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Kategori <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="" disabled>Pilih Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* SKU / Kode Produk */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                SKU / Kode (Opsional)
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Contoh: BNR-280, TSH-30S"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Tipe Harga */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tipe Perhitungan Harga <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.pricingType}
                onChange={(e) => {
                  const type = e.target.value as "AREA" | "UNIT" | "CUSTOM";
                  setFormData((prev) => ({
                    ...prev,
                    pricingType: type,
                    unitLabel: type === "AREA" ? "m²" : "pcs",
                  }));
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="AREA">Meteran (P x L x Harga Satuan)</option>
                <option value="UNIT">Satuan / Grosir Bertingkat (Qty)</option>
                <option value="CUSTOM">Custom (Fleksibel Saat Kasir)</option>
              </select>
            </div>

            {/* Label Satuan */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Label Satuan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.unitLabel}
                onChange={(e) => setFormData({ ...formData, unitLabel: e.target.value })}
                required
                placeholder="Contoh: m², pcs, lusin, lembar"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Harga Dasar (Rp) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Harga Dasar (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.basePrice || ""}
                onChange={(e) => setFormData({ ...formData, basePrice: parseInt(e.target.value, 10) || 0 })}
                required
                placeholder="Contoh: 25000"
                className="w-full font-mono text-base tabular-nums rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Status Aktif */}
            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="isActiveCheck"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="size-4.5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-600/20"
              />
              <label htmlFor="isActiveCheck" className="text-sm font-medium text-slate-700 select-none dark:text-slate-300">
                Produk Aktif & Tampil di Katalog Kasir
              </label>
            </div>
          </div>

          {/* Opsi Tambahan untuk Tipe AREA */}
          {formData.pricingType === "AREA" && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-4 dark:border-blue-900/40 dark:bg-blue-950/20">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                Pengaturan Perhitungan Luas (Meteran)
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Minimal Luas Tertagih (m²)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.minArea}
                    onChange={(e) => setFormData({ ...formData, minArea: parseFloat(e.target.value) || 1.0 })}
                    className="w-full font-mono text-sm tabular-nums rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <p className="text-[11px] text-slate-500">Jika cetakan di bawah luas ini, tetap ditagih minimal angka ini.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Metode Pembulatan Luas
                  </label>
                  <select
                    value={formData.areaRounding}
                    onChange={(e) => setFormData({ ...formData, areaRounding: e.target.value as "EXACT" | "ROUND_UP_0_5" | "ROUND_UP_1" })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="EXACT">Sesuai Luas Asli (Tanpa Pembulatan)</option>
                    <option value="ROUND_UP_0_5">Bulat ke Atas 0.5 m²</option>
                    <option value="ROUND_UP_1">Bulat ke Atas 1.0 m²</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Opsi Tambahan untuk Tipe UNIT: Wholesale Price Tiers */}
          {formData.pricingType === "UNIT" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Harga Grosir Bertingkat (Tier Pricing)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Otomatis menggantikan harga dasar ketika jumlah pesanan masuk ke rentang tier.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTier}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-95"
                >
                  <Plus className="size-3.5" />
                  Tambah Tier
                </button>
              </div>

              {formData.tiers.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-white py-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/40">
                  Belum ada tingkat harga grosir. Produk akan selalu menggunakan harga dasar.
                </p>
              ) : (
                <div className="space-y-2">
                  {formData.tiers.map((tier, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-500">Min:</span>
                        <input
                          type="number"
                          min="1"
                          value={tier.minQty}
                          onChange={(e) => handleTierChange(idx, "minQty", parseInt(e.target.value, 10) || 1)}
                          className="w-18 font-mono text-xs tabular-nums rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-900"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-500">Max:</span>
                        <input
                          type="number"
                          min="1"
                          value={tier.maxQty || ""}
                          placeholder="Tak hingga"
                          onChange={(e) => {
                            const v = e.target.value ? parseInt(e.target.value, 10) : null;
                            handleTierChange(idx, "maxQty", v);
                          }}
                          className="w-22 font-mono text-xs tabular-nums rounded border border-slate-300 px-2 py-1 placeholder:text-[11px] dark:border-slate-600 dark:bg-slate-900"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                        <span className="text-xs font-medium text-slate-500">Rp:</span>
                        <input
                          type="number"
                          min="0"
                          value={tier.unitPrice}
                          onChange={(e) => handleTierChange(idx, "unitPrice", parseInt(e.target.value, 10) || 0)}
                          className="w-full font-mono text-xs tabular-nums rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-900"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTier(idx)}
                        className="flex size-7 items-center justify-center rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        aria-label="Hapus Baris Tier"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Deskripsi */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Deskripsi / Catatan Bahan (Opsional)
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Contoh: Bahan tebal, tahan cuaca luar ruangan, hasil cetak tajam 720 dpi"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex h-16 shrink-0 items-center justify-end gap-3 border-t border-slate-200 px-6 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-[44px] rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          >
            <Save className="size-4" />
            {isSubmitting ? "Menyimpan..." : "Simpan Produk"}
          </button>
        </div>
      </div>
    </div>
  );
}
