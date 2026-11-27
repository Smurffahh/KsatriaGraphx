"use client";

import React from "react";
import { calculateProfitMetrics } from "@/lib/calculator/pricing";

interface ProfitMarginBannerProps {
  productionPrice: number;
  sellingPrice: number;
  unitLabel?: string;
}

export function ProfitMarginBanner({
  productionPrice,
  sellingPrice,
  unitLabel = "satuan",
}: ProfitMarginBannerProps) {
  const metrics = calculateProfitMetrics(productionPrice, sellingPrice);
  const isLoss = metrics.profitPerUnit < 0;
  const isThinMargin = !isLoss && metrics.marginPercent > 0 && metrics.marginPercent < 15;

  const toneClass = isLoss
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : isThinMargin
    ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

  return (
    <div
      className={`rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm font-medium tabular-nums flex flex-wrap items-center justify-between gap-2 ${toneClass}`}
    >
      <span>
        {isLoss
          ? `Peringatan Rugi: -Rp ${Math.abs(metrics.profitPerUnit).toLocaleString("id-ID")} per ${unitLabel || "satuan"}`
          : `Keuntungan: Rp ${metrics.profitPerUnit.toLocaleString("id-ID")} / ${unitLabel || "satuan"}`}
      </span>
      <span className="font-mono font-semibold">
        {metrics.markupPercent !== null
          ? `${metrics.markupPercent >= 0 ? "+" : ""}${metrics.markupPercent}% markup`
          : "Modal Rp 0"}{" "}
        | {metrics.marginPercent}% margin
      </span>
    </div>
  );
}
