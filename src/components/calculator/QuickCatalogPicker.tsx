"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  Search,
  X,
  Package,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/calculator/estimate-text";
import { resolveApiUrl } from "@/lib/api/client";
import { isNativeApp } from "@/lib/platform";
import type { PriceTier, AreaRounding } from "@/lib/calculator/pricing";

export interface CatalogPickerProduct {
  id: string;
  categoryId?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  sku?: string | null;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  imageKey?: string | null;
  pricingType: "AREA" | "UNIT" | "CUSTOM";
  unitLabel: string;
  basePrice: number;
  minArea?: number | string | null;
  areaRounding: AreaRounding;
  tiers?: PriceTier[];
  priceTiers?: PriceTier[];
  isActive?: boolean;
}

export interface CatalogPickerCategory {
  id: string;
  name: string;
  slug: string;
}

interface QuickCatalogPickerProps {
  products: CatalogPickerProduct[];
  categories: CatalogPickerCategory[];
  selectedProductId: string;
  onSelectProduct: (product: CatalogPickerProduct) => void;
  allowedPricingType?: "AREA" | "UNIT" | "CUSTOM";
  excludeProductId?: string;
  title?: string;
  placeholderText?: string;
  onClose?: () => void;
}

export function resolveProductImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  return resolveApiUrl(url, isNativeApp());
}

export function QuickCatalogPicker({
  products,
  categories,
  selectedProductId,
  onSelectProduct,
  allowedPricingType,
  excludeProductId,
  title,
  placeholderText = "Cari bahan atau produk (Banner, Stiker, Kaos...)",
  onClose,
}: QuickCatalogPickerProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Filter awal berdasarkan kriteria teknis komparasi (allowedPricingType & excludeProductId)
  const candidateProducts = useMemo(() => {
    return products.filter((p) => {
      if (allowedPricingType && p.pricingType !== allowedPricingType) {
        return false;
      }
      if (excludeProductId && p.id === excludeProductId) {
        return false;
      }
      return true;
    });
  }, [products, allowedPricingType, excludeProductId]);

  // Hitung jumlah produk per kategori dari kandidat yang tersedia
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of candidateProducts) {
      if (p.categoryId) {
        counts.set(p.categoryId, (counts.get(p.categoryId) || 0) + 1);
      }
    }
    return counts;
  }, [candidateProducts]);

  // Kategori yang memiliki setidaknya 1 produk kandidat
  const activeCategories = useMemo(() => {
    return categories.filter((c) => (categoryCounts.get(c.id) || 0) > 0);
  }, [categories, categoryCounts]);

  // Filter lanjutan berdasarkan pencarian teks dan tombol filter kategori
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidateProducts.filter((p) => {
      // Filter kategori
      if (selectedCategory !== "ALL" && p.categoryId !== selectedCategory) {
        return false;
      }
      // Filter pencarian
      if (q) {
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku ? p.sku.toLowerCase().includes(q) : false;
        const matchDesc = p.description ? p.description.toLowerCase().includes(q) : false;
        return matchName || matchSku || matchDesc;
      }
      return true;
    });
  }, [candidateProducts, selectedCategory, search]);

  const handleResetFilter = () => {
    setSearch("");
    setSelectedCategory("ALL");
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/60 p-3.5 shadow-xs">
      {/* Header bar opsional jika ada judul atau tombol tutup picker */}
      {(title || onClose) && (
        <div className="flex items-center justify-between pb-1">
          {title && (
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              {title}
            </span>
          )}
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Tutup Katalog
            </Button>
          )}
        </div>
      )}

      {/* Kolom Pencarian */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholderText}
          className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-10 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 font-medium transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full size-8 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            title="Hapus pencarian"
            aria-label="Hapus pencarian"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Filter Kategori (Horizontal Pills) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedCategory("ALL")}
          className={`shrink-0 rounded-full min-h-9 px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
            selectedCategory === "ALL"
              ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
              : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Semua ({candidateProducts.length})
        </button>
        {activeCategories.map((c) => {
          const count = categoryCounts.get(c.id) || 0;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`shrink-0 rounded-full min-h-9 px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                selectedCategory === c.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {c.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid Kartu Produk */}
      {candidateProducts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center space-y-2">
          <Package className="size-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm font-semibold text-foreground">
            {allowedPricingType
              ? "Belum ada produk lain bertipe sama untuk dibandingkan."
              : "Tidak ada produk aktif yang tersedia."}
          </p>
          <p className="text-xs text-muted-foreground">
            {allowedPricingType
              ? `Hanya produk bertipe ${allowedPricingType === "AREA" ? "Meteran (m²)" : "Satuan"} yang dapat dibandingkan.`
              : "Silakan tambahkan produk baru pada Katalog Produk."}
          </p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center space-y-2.5">
          <Search className="size-7 mx-auto text-muted-foreground/50" />
          <p className="text-sm font-semibold text-foreground">
            Produk tidak ditemukan
          </p>
          <p className="text-xs text-muted-foreground">
            Tidak ada produk yang cocok dengan kata kunci &quot;{search}&quot;.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetFilter}
            className="gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            <span>Reset Filter</span>
          </Button>
        </div>
      ) : (
        <div className="max-h-[280px] sm:max-h-[320px] overflow-y-auto pr-1 space-y-2 scrollbar-thin">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredProducts.map((p) => {
              const isSelected = p.id === selectedProductId;
              const resolvedImg = resolveProductImageUrl(p.imageUrl);
              const tiers = p.priceTiers || p.tiers || [];

              return (
                <div
                  key={p.id}
                  onClick={() => onSelectProduct(p)}
                  className={`group relative flex items-start gap-3 rounded-xl border p-3 text-left motion-safe:hover:-translate-y-0.5 transition-[transform,background-color,border-color,box-shadow] duration-150 cursor-pointer select-none ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary/40 shadow-xs"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/40 active:scale-[0.98]"
                  }`}
                >
                  {/* Thumbnail Foto / Ikon */}
                  <div className="relative size-12 shrink-0 rounded-lg bg-muted outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10 overflow-hidden flex items-center justify-center">
                    {resolvedImg ? (
                      <Image
                        src={resolvedImg}
                        alt={p.name}
                        fill
                        sizes="48px"
                        className="object-cover group-hover:scale-105 transition-transform duration-150"
                      />
                    ) : (
                      <Package className="size-5 text-muted-foreground/60" />
                    )}
                  </div>

                  {/* Informasi Produk */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start justify-between gap-1.5">
                      <h4
                        className={`text-sm font-semibold line-clamp-2 leading-snug ${
                          isSelected ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {p.name}
                      </h4>
                      {isSelected && (
                        <div className="size-5 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="size-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="secondary"
                        className="font-mono text-xs px-2 py-0.5 uppercase"
                      >
                        {p.pricingType === "AREA" ? "Meteran" : "Satuan"}
                      </Badge>
                      {p.categoryName && (
                        <span className="text-xs text-muted-foreground truncate max-w-[110px]">
                          {p.categoryName}
                        </span>
                      )}
                    </div>

                    <div className="pt-0.5 flex items-baseline justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-foreground tabular-nums">
                        {formatRupiah(p.basePrice)}
                        <span className="text-xs font-normal text-muted-foreground">
                          {p.pricingType === "AREA" ? "/m²" : `/${p.unitLabel || "pcs"}`}
                        </span>
                      </span>
                      {tiers.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <Sparkles className="size-3" />
                          <span>Grosir</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
