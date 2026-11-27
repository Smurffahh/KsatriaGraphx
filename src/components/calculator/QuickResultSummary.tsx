"use client";

import React from "react";
import { ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/format";
import type { CalculateItemResult } from "@/lib/calculator/pricing";
import type { QuickCalcSlotProduct } from "./QuickProductSlotCard";

interface QuickResultSummaryProps {
  isComparisonMode: boolean;
  productA: QuickCalcSlotProduct | null;
  productB: QuickCalcSlotProduct | null;
  calcResultA: CalculateItemResult | null;
  calcResultB: CalculateItemResult | null;
  onHandoffToPos: (
    product: QuickCalcSlotProduct,
    result: CalculateItemResult
  ) => void;
}

/** Langkah 3 kalkulator cepat: rincian harga tunggal atau kartu perbandingan 2 bahan. */
export function QuickResultSummary({
  isComparisonMode,
  productA,
  productB,
  calcResultA,
  calcResultB,
  onHandoffToPos,
}: QuickResultSummaryProps) {
  if (!productA || !calcResultA) return null;

  return (
    <div className="space-y-3 pt-2 border-t border-border">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary tabular-nums">
            3
          </span>
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            {isComparisonMode && <Sparkles className="size-3.5 text-primary" />}
            <span>
              {isComparisonMode
                ? "Hasil Perbandingan Bahan"
                : "Perkiraan Harga"}
            </span>
          </span>
        </div>

        {isComparisonMode && productB && calcResultB && (
          <Badge variant="success" className="font-mono text-xs font-semibold">
            Selisih:{" "}
            {formatRupiah(Math.abs(calcResultA.itemSubtotal - calcResultB.itemSubtotal))}
          </Badge>
        )}
      </div>

      {isComparisonMode && productB && calcResultB ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div
            className={`rounded-xl border p-4 flex flex-col justify-between space-y-3.5 bg-card shadow-2xs ${
              calcResultA.itemSubtotal <= calcResultB.itemSubtotal
                ? "border-emerald-500/50 ring-1 ring-emerald-500/20"
                : "border-border"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-foreground line-clamp-1">
                  {productA.name}
                </span>
                {calcResultA.itemSubtotal < calcResultB.itemSubtotal && (
                  <Badge className="bg-emerald-600 text-white text-xs shrink-0">
                    Lebih Hemat
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono tabular-nums">
                Dasar: {formatRupiah(calcResultA.effectiveUnitPrice)}
                {productA.pricingType === "AREA" ? "/m²" : ""}
              </p>
              <div className="pt-2.5 border-t border-border/60">
                <span className="text-xs text-muted-foreground block">
                  Total Estimasi:
                </span>
                <p className="font-mono text-xl font-bold text-foreground tabular-nums mt-0.5">
                  {formatRupiah(calcResultA.itemSubtotal)}
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => onHandoffToPos(productA, calcResultA)}
              className="w-full gap-2 text-xs sm:text-sm"
            >
              <ShoppingCart className="size-4" />
              <span>Pilih Opsi A ke POS</span>
            </Button>
          </div>

          <div
            className={`rounded-xl border p-4 flex flex-col justify-between space-y-3.5 bg-card shadow-2xs ${
              calcResultB.itemSubtotal < calcResultA.itemSubtotal
                ? "border-emerald-500/50 ring-1 ring-emerald-500/20"
                : "border-border"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-foreground line-clamp-1">
                  {productB.name}
                </span>
                {calcResultB.itemSubtotal < calcResultA.itemSubtotal && (
                  <Badge className="bg-emerald-600 text-white text-xs shrink-0">
                    Lebih Hemat
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono tabular-nums">
                Dasar: {formatRupiah(calcResultB.effectiveUnitPrice)}
                {productB.pricingType === "AREA" ? "/m²" : ""}
              </p>
              <div className="pt-2.5 border-t border-border/60">
                <span className="text-xs text-muted-foreground block">
                  Total Estimasi:
                </span>
                <p className="font-mono text-xl font-bold text-primary tabular-nums mt-0.5">
                  {formatRupiah(calcResultB.itemSubtotal)}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant={
                calcResultB.itemSubtotal < calcResultA.itemSubtotal
                  ? "default"
                  : "outline"
              }
              onClick={() => onHandoffToPos(productB, calcResultB)}
              className="w-full gap-2 text-xs sm:text-sm"
            >
              <ShoppingCart className="size-4" />
              <span>Pilih Opsi B ke POS</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-semibold text-muted-foreground">
              Rincian Perhitungan
            </span>
            <span className="font-mono text-muted-foreground tabular-nums">
              {calcResultA.quantity} {productA.unitLabel || "pcs"}
            </span>
          </div>

          <div className="space-y-1.5 text-xs sm:text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Subtotal Bahan:</span>
              <span className="font-mono font-medium text-foreground tabular-nums">
                {formatRupiah(calcResultA.baseSubtotal)}
              </span>
            </div>
            {calcResultA.finishingTotal > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Finishing Tambahan:</span>
                <span className="font-mono font-medium text-foreground tabular-nums">
                  +{formatRupiah(calcResultA.finishingTotal)}
                </span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-primary/20 flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">
              Estimasi Total:
            </span>
            <span className="font-mono text-2xl font-bold text-primary tabular-nums">
              {formatRupiah(calcResultA.itemSubtotal)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
