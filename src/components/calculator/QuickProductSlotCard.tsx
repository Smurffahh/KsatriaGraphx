"use client";

import React from "react";
import Image from "next/image";
import { ChevronDown, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resolveProductImageUrl } from "@/components/calculator/QuickCatalogPicker";
import { formatRupiah } from "@/lib/format";
import type { PricingType, PriceTier, AreaRounding } from "@/lib/calculator/pricing";

export interface QuickCalcSlotProduct {
  id: string;
  name: string;
  sku?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  imageKey?: string | null;
  pricingType: PricingType;
  unitLabel: string;
  basePrice: number;
  minArea?: string | number | null;
  areaRounding: AreaRounding;
  tiers?: PriceTier[];
  priceTiers?: PriceTier[];
  isActive: boolean;
}

interface QuickProductSlotCardProps {
  product: QuickCalcSlotProduct;
  highlighted?: boolean;
  onChangeProduct: () => void;
}

/** Kartu ringkas bahan terpilih (digunakan untuk Opsi A dan Opsi B) dengan tombol Ganti. */
export function QuickProductSlotCard({
  product,
  highlighted = false,
  onChangeProduct,
}: QuickProductSlotCardProps) {
  const imageSrc = resolveProductImageUrl(product.imageUrl);

  return (
    <div
      className={`group relative flex items-center justify-between gap-3 rounded-xl border p-3.5 shadow-2xs transition-colors ${
        highlighted
          ? "border-primary/35 bg-background hover:border-primary"
          : "border-border bg-card hover:border-primary/50"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10 bg-muted/60">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={product.name}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/60">
              <Package className="size-6" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p
              className="text-sm font-semibold text-foreground truncate"
              title={product.name}
            >
              {product.name}
            </p>
            {product.categoryName && (
              <span className="text-xs font-medium text-muted-foreground">
                • {product.categoryName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="font-mono text-sm font-bold text-primary tabular-nums">
              {formatRupiah(product.basePrice)}
              <span className="text-xs font-normal text-muted-foreground">
                {product.pricingType === "AREA"
                  ? "/m²"
                  : `/${product.unitLabel || "pcs"}`}
              </span>
            </span>
            {(product.tiers?.length || 0) > 0 && (
              <Badge
                variant="outline"
                className="text-xs px-2 py-0 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              >
                Grosir
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onChangeProduct}
        className="shrink-0 gap-1.5 border-primary/30 hover:bg-primary/5 hover:text-primary"
      >
        <span>Ganti</span>
        <ChevronDown className="size-3.5 opacity-70" />
      </Button>
    </div>
  );
}
