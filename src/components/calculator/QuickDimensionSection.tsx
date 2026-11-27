"use client";

import React from "react";
import { Check, Minus, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah } from "@/lib/format";
import type {
  AreaDimensionUnit,
  CalculateItemResult,
} from "@/lib/calculator/pricing";
import type { QuickCalcSlotProduct } from "./QuickProductSlotCard";

export interface QuickCalcFinishingOption {
  id: string;
  name: string;
  chargeType: "FLAT" | "PER_QTY" | "PER_AREA";
  defaultPrice: number;
  unitLabel: string;
  isActive: boolean;
}

interface QuickDimensionSectionProps {
  product: QuickCalcSlotProduct | null;
  width: number | "";
  height: number | "";
  dimensionUnit: AreaDimensionUnit;
  quantity: number;
  billedResult: CalculateItemResult | null;
  finishings: QuickCalcFinishingOption[];
  selectedFinishingIds: string[];
  isLoadingFinishings: boolean;
  onWidthChange: (val: number | "") => void;
  onHeightChange: (val: number | "") => void;
  onUnitChange: (unit: AreaDimensionUnit) => void;
  onQuantityChange: (qty: number) => void;
  onApplyPreset: (w: number, h: number) => void;
  onToggleFinishing: (finishingId: string) => void;
}

const AREA_PRESETS = [
  { label: "1 × 1 m", w: 1, h: 1 },
  { label: "2 × 1 m", w: 2, h: 1 },
  { label: "3 × 1 m", w: 3, h: 1 },
  { label: "4 × 1 m", w: 4, h: 1 },
];

/** Langkah 2 kalkulator cepat: dimensi cetak / jumlah unit serta finishing tambahan. */
export function QuickDimensionSection({
  product,
  width,
  height,
  dimensionUnit,
  quantity,
  billedResult,
  finishings,
  selectedFinishingIds,
  isLoadingFinishings,
  onWidthChange,
  onHeightChange,
  onUnitChange,
  onQuantityChange,
  onApplyPreset,
  onToggleFinishing,
}: QuickDimensionSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary tabular-nums">
          2
        </span>
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Isi Ukuran, Jumlah &amp; Finishing
        </span>
      </div>

      {product && product.pricingType === "AREA" ? (
        <div className="space-y-3.5 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">
              Ukuran Cetak
            </span>
            <div className="inline-flex rounded-xl border border-border p-1 bg-muted/60 shrink-0">
              <button
                type="button"
                onClick={() => onUnitChange("m")}
                className={`min-h-10 sm:min-h-9 whitespace-nowrap rounded-lg px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  dimensionUnit === "m"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Meter (m)
              </button>
              <button
                type="button"
                onClick={() => onUnitChange("cm")}
                className={`min-h-10 sm:min-h-9 whitespace-nowrap rounded-lg px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  dimensionUnit === "cm"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Centimeter (cm)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground block">
                Panjang ({dimensionUnit})
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={width}
                onChange={(e) =>
                  onWidthChange(
                    e.target.value === "" ? "" : parseFloat(e.target.value)
                  )
                }
                className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base sm:text-sm font-mono font-medium text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                placeholder="Contoh: 3"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground block">
                Lebar ({dimensionUnit})
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={height}
                onChange={(e) =>
                  onHeightChange(
                    e.target.value === "" ? "" : parseFloat(e.target.value)
                  )
                }
                className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base sm:text-sm font-mono font-medium text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                placeholder="Contoh: 1"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Pilih Ukuran Umum
            </span>
            <div className="flex flex-wrap gap-2">
              {AREA_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onApplyPreset(preset.w, preset.h)}
                  className="min-h-11 sm:min-h-9 rounded-lg border border-border bg-muted/60 px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted hover:border-primary/40 active:scale-[0.96] transition-[transform,background-color,border-color] cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">
              Jumlah Cetak (Pcs)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                className="flex size-11 sm:size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted active:scale-[0.96] transition-[transform,background-color] cursor-pointer"
                aria-label="Kurangi jumlah"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-10 text-center font-mono text-base font-bold text-foreground tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => onQuantityChange(quantity + 1)}
                className="flex size-11 sm:size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted active:scale-[0.96] transition-[transform,background-color] cursor-pointer"
                aria-label="Tambah jumlah"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          {billedResult?.billedAreaM2 !== undefined && (
            <div className="rounded-xl bg-muted/50 p-3 text-xs sm:text-sm text-muted-foreground flex items-center justify-between gap-2">
              <span>Luas Dihitung:</span>
              <span className="font-mono font-bold text-foreground tabular-nums">
                {billedResult.billedAreaM2} m²
                {billedResult.isMinAreaApplied && (
                  <span className="ml-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                    (Min. {product.minArea} m²)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-sm font-semibold text-foreground block">
                Jumlah Pesanan ({product?.unitLabel || "pcs"})
              </span>
              {product?.tiers && product.tiers.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Harga grosir otomatis aktif untuk jumlah lebih banyak
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                className="flex size-11 sm:size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted active:scale-[0.96] transition-[transform,background-color] cursor-pointer"
                aria-label="Kurangi jumlah"
              >
                <Minus className="size-4" />
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  onQuantityChange(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className="h-11 sm:h-10 w-16 rounded-xl border border-input bg-background text-center font-mono text-base sm:text-sm font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-ring tabular-nums"
              />
              <button
                type="button"
                onClick={() => onQuantityChange(quantity + 1)}
                className="flex size-11 sm:size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted active:scale-[0.96] transition-[transform,background-color] cursor-pointer"
                aria-label="Tambah jumlah"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoadingFinishings ? (
        <Skeleton className="h-14 w-full rounded-xl" />
      ) : finishings.length > 0 ? (
        <div className="space-y-2.5">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Finishing Tambahan (Opsional)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {finishings.map((f) => {
              const isSelected = selectedFinishingIds.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onToggleFinishing(f.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-colors min-h-[44px] cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex size-4.5 shrink-0 items-center justify-center rounded-sm border ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/40"
                      }`}
                    >
                      {isSelected && <Check className="size-3" />}
                    </div>
                    <span className="text-xs sm:text-sm font-medium truncate">
                      {f.name}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-semibold tabular-nums ml-2 shrink-0">
                    +{formatRupiah(f.defaultPrice)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
