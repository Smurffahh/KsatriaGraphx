"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, AlertCircle, Save } from "lucide-react";
import { ProductImageUploader } from "./ProductImageUploader";
import { validatePriceTiers, type PriceTierInput } from "@/lib/validators/product";
import { ProfitMarginBanner } from "./ProfitMarginBanner";

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

export interface VendorOption {
  id: string;
  name: string;
  isActive: boolean;
}

export interface ProductFormData {
  id?: string;
  categoryId: string;
  defaultVendorId?: string | null;
  name: string;
  sku: string;
  description: string;
  imageUrl: string | null;
  imageKey: string | null;
  pricingType: "AREA" | "UNIT" | "CUSTOM";
  unitLabel: string;
  productionPrice: number;
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
  vendors?: VendorOption[];
  isOwner?: boolean;
  isSubmitting?: boolean;
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories,
  vendors = [],
  isOwner = false,
  isSubmitting = false,
}: ProductFormModalProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    categoryId: "",
    defaultVendorId: null,
    name: "",
    sku: "",
    description: "",
    imageUrl: null,
    imageKey: null,
    pricingType: "UNIT",
    unitLabel: "pcs",
    productionPrice: 0,
    basePrice: 0,
    minArea: 1.0,
    areaRounding: "EXACT",
    isActive: true,
    tiers: [],
  });

  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        defaultVendorId: initialData.defaultVendorId ?? null,
      });
    } else {
      setFormData({
        categoryId: "",
        defaultVendorId: null,
        name: "",
        sku: "",
        description: "",
        imageUrl: null,
        imageKey: null,
        pricingType: "UNIT",
        unitLabel: "pcs",
        productionPrice: 0,
        basePrice: 0,
        minArea: 1.0,
        areaRounding: "EXACT",
        isActive: true,
        tiers: [],
      });
    }
    setFormError(null);
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!isOpen || initialData || categories.length === 0) return;
    setFormData((prev) =>
      prev.categoryId ? prev : { ...prev, categoryId: categories[0].id }
    );
  }, [categories, isOpen, initialData]);

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
          productionPrice: prev.productionPrice > 0 ? prev.productionPrice : null,
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
      const cleanPayload: ProductFormData = {
        ...(formData.id ? { id: formData.id } : {}),
        categoryId: formData.categoryId,
        ...(isOwner ? { defaultVendorId: formData.defaultVendorId || null } : {}),
        name: formData.name.trim(),
        sku: formData.sku?.trim() || "",
        description: formData.description?.trim() || "",
        imageUrl: formData.imageUrl?.trim() || null,
        imageKey: formData.imageKey?.trim() || null,
        pricingType: formData.pricingType,
        unitLabel: formData.unitLabel.trim() || (formData.pricingType === "AREA" ? "m²" : "pcs"),
        productionPrice: Number(formData.productionPrice) || 0,
        basePrice: Number(formData.basePrice) || 0,
        minArea: formData.pricingType === "AREA" ? Number(formData.minArea) || 1.0 : 1.0,
        areaRounding: formData.pricingType === "AREA" ? formData.areaRounding : "EXACT",
        isActive: Boolean(formData.isActive),
        tiers:
          formData.pricingType === "UNIT"
            ? formData.tiers.map((t) => ({
                ...t,
                productionPrice: t.productionPrice ?? null,
              }))
            : [],
      };

      await onSubmit(cleanPayload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan data produk.";
      setFormError(msg);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {initialData?.id ? "Edit Produk Percetakan" : "Tambah Produk Baru"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Kelola detail spesifikasi harga dan foto produk
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-11 sm:size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-colors cursor-pointer"
            aria-label="Tutup Dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {formError && (
            <div className="flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive">
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
              <label className="text-xs sm:text-sm font-semibold text-foreground">
                Nama Produk <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Contoh: Banner Flexi 280gr, Kaos Katun 30s"
                className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>

            {/* Kategori */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-semibold text-foreground">
                Kategori <span className="text-destructive">*</span>
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                required
                className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base sm:text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="" disabled>Pilih Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* SKU / Kode Produk */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-semibold text-foreground">
                SKU / Kode (Opsional)
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Contoh: BNR-280, TSH-30S"
                className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>

            {/* Tipe Harga */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-semibold text-foreground">
                Tipe Perhitungan Harga <span className="text-destructive">*</span>
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
                className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base sm:text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="AREA">Meteran (P x L x Harga Satuan)</option>
                <option value="UNIT">Satuan / Grosir Bertingkat (Qty)</option>
                <option value="CUSTOM">Custom (Fleksibel Saat Kasir)</option>
              </select>
            </div>

            {/* Label Satuan */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-semibold text-foreground">
                Label Satuan <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.unitLabel}
                onChange={(e) => setFormData({ ...formData, unitLabel: e.target.value })}
                required
                placeholder="Contoh: m², pcs, lusin, lembar"
                className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>

            {isOwner && (
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-foreground">
                  Vendor Mitra Default (Opsional)
                </label>
                <select
                  value={formData.defaultVendorId || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultVendorId: e.target.value ? e.target.value : null,
                    })
                  }
                  className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base sm:text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="">Tidak ada vendor default</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Otomatis terpilih saat item ini dipesan di kasir (khusus Owner).
                </p>
              </div>
            )}

            <div className="sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl border border-border bg-muted/25 p-4">
              <div className="sm:col-span-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Modal Produksi &amp; Harga Jual Pelanggan
                </h3>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-foreground">
                  Harga Produksi / Vendor (Modal Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.productionPrice || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      productionPrice: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  placeholder="Contoh: 20000"
                  className="h-11 w-full font-mono text-base sm:text-sm tabular-nums rounded-xl border border-input bg-background px-3.5 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
                <p className="text-xs text-muted-foreground">
                  Modal yang dibayar ke percetakan vendor (rahasia Owner).
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-foreground">
                  Harga Jual (Ke Pelanggan Rp) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.basePrice || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      basePrice: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  required
                  placeholder="Contoh: 25000"
                  className="h-11 w-full font-mono text-base sm:text-sm tabular-nums rounded-xl border border-input bg-background px-3.5 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
                <p className="text-xs text-muted-foreground">
                  Harga jual resmi yang muncul di kalkulator POS &amp; nota pelanggan.
                </p>
              </div>

              {/* Kalkulator Margin Live */}
              <div className="sm:col-span-2">
                <ProfitMarginBanner
                  productionPrice={formData.productionPrice || 0}
                  sellingPrice={formData.basePrice || 0}
                  unitLabel={formData.unitLabel || "satuan"}
                />
              </div>
            </div>

            {/* Status Aktif */}
            <div className="sm:col-span-2 flex items-center gap-3 pt-1">
              <input
                type="checkbox"
                id="isActiveCheck"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="size-4.5 rounded border-input text-primary focus:ring-ring"
              />
              <label htmlFor="isActiveCheck" className="text-sm font-medium text-foreground select-none">
                Produk Aktif &amp; Tampil di Katalog Kasir
              </label>
            </div>
          </div>

          {/* Opsi Tambahan untuk Tipe AREA */}
          {formData.pricingType === "AREA" && (
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Pengaturan Perhitungan Luas (Meteran)
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-foreground">
                    Minimal Luas Tertagih (m²)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.minArea}
                    onChange={(e) => setFormData({ ...formData, minArea: parseFloat(e.target.value) || 1.0 })}
                    className="h-11 w-full font-mono text-base sm:text-sm tabular-nums rounded-xl border border-input bg-background px-3.5 text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                  <p className="text-xs text-muted-foreground">Jika cetakan di bawah luas ini, tetap ditagih minimal angka ini.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-foreground">
                    Metode Pembulatan Luas
                  </label>
                  <select
                    value={formData.areaRounding}
                    onChange={(e) => setFormData({ ...formData, areaRounding: e.target.value as "EXACT" | "ROUND_UP_0_5" | "ROUND_UP_1" })}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base sm:text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
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
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Harga Grosir Bertingkat (Tier Pricing)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Otomatis menggantikan harga dasar ketika jumlah pesanan masuk ke rentang tier.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTier}
                  className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-95 transition-colors cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  Tambah Tier
                </button>
              </div>

              {formData.tiers.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-card py-4 text-center text-xs sm:text-sm text-muted-foreground">
                  Belum ada tingkat harga grosir. Produk akan selalu menggunakan harga dasar.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {formData.tiers.map((tier, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-card p-3 shadow-2xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Min:</span>
                        <input
                          type="number"
                          min="1"
                          value={tier.minQty}
                          onChange={(e) => handleTierChange(idx, "minQty", parseInt(e.target.value, 10) || 1)}
                          className="h-10 w-20 font-mono text-base sm:text-sm tabular-nums rounded-lg border border-input bg-background px-2.5 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/20"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Max:</span>
                        <input
                          type="number"
                          min="1"
                          value={tier.maxQty || ""}
                          placeholder="Tak hingga"
                          onChange={(e) => {
                            const v = e.target.value ? parseInt(e.target.value, 10) : null;
                            handleTierChange(idx, "maxQty", v);
                          }}
                          className="h-10 w-24 font-mono text-base sm:text-sm tabular-nums rounded-lg border border-input bg-background px-2.5 placeholder:text-xs text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/20"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 min-w-[130px]">
                        <span className="text-xs font-medium text-muted-foreground">Modal:</span>
                        <input
                          type="number"
                          min="0"
                          value={tier.productionPrice ?? ""}
                          placeholder="Ikut dasar"
                          onChange={(e) => {
                            const raw = e.target.value;
                            handleTierChange(
                              idx,
                              "productionPrice",
                              raw === "" ? null : Math.max(0, parseInt(raw, 10) || 0)
                            );
                          }}
                          className="h-10 w-28 font-mono text-base sm:text-sm tabular-nums rounded-lg border border-input bg-background px-2.5 placeholder:text-xs text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/20"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                        <span className="text-xs font-medium text-muted-foreground">Jual Rp:</span>
                        <input
                          type="number"
                          min="0"
                          value={tier.unitPrice}
                          onChange={(e) => handleTierChange(idx, "unitPrice", parseInt(e.target.value, 10) || 0)}
                          className="h-10 w-full font-mono text-base sm:text-sm tabular-nums rounded-lg border border-input bg-background px-2.5 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/20"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTier(idx)}
                        className="flex size-11 sm:size-9 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        aria-label="Hapus Baris Tier"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Deskripsi */}
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-semibold text-foreground">
              Deskripsi / Catatan Bahan (Opsional)
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Contoh: Bahan tebal, tahan cuaca luar ruangan, hasil cetak tajam 720 dpi"
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex h-16 shrink-0 items-center justify-end gap-3 border-t border-border px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-[44px] rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted active:scale-95 disabled:pointer-events-none disabled:opacity-50 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-95 disabled:pointer-events-none disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Save className="size-4" />
            {isSubmitting ? "Menyimpan..." : "Simpan Produk"}
          </button>
        </div>
      </div>
    </div>
  );
}
