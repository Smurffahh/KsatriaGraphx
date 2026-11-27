import type { CalculatedFinishingItem } from "./pricing";
import { formatRupiah } from "@/lib/format";

export { formatRupiah };

export interface SingleEstimateParams {
  storeName?: string;
  productName: string;
  pricingType: "AREA" | "UNIT" | "CUSTOM";
  quantity: number;
  unitLabel?: string;
  width?: number;
  height?: number;
  dimensionUnit?: "m" | "cm";
  billedAreaM2?: number;
  rawAreaM2?: number;
  isMinAreaApplied?: boolean;
  minArea?: number | string | null;
  effectiveUnitPrice: number;
  baseSubtotal: number;
  finishings?: CalculatedFinishingItem[];
  finishingTotal?: number;
  grandTotal: number;
  matchedTier?: { minQty: number; unitPrice: number } | null;
}

export interface ComparisonEstimateParams {
  storeName?: string;
  pricingType: "AREA" | "UNIT" | "CUSTOM";
  quantity: number;
  unitLabel?: string;
  width?: number;
  height?: number;
  dimensionUnit?: "m" | "cm";
  finishingsSummary?: string[];
  productA: {
    name: string;
    unitPrice: number;
    baseSubtotal: number;
    finishingTotal: number;
    grandTotal: number;
    billedAreaM2?: number;
    isMinAreaApplied?: boolean;
    minArea?: number | string | null;
  };
  productB: {
    name: string;
    unitPrice: number;
    baseSubtotal: number;
    finishingTotal: number;
    grandTotal: number;
    billedAreaM2?: number;
    isMinAreaApplied?: boolean;
    minArea?: number | string | null;
  };
}

/**
 * Format teks estimasi harga 1 bahan yang siap dikirim langsung ke WhatsApp pelanggan.
 */
export function formatSingleEstimateText(params: SingleEstimateParams): string {
  const storeHeader = `*Estimasi Harga — ${params.storeName || "Ksatria Graphx"}*`;
  const lines: string[] = [storeHeader, ""];

  lines.push(`*Produk:* ${params.productName}`);

  if (params.pricingType === "AREA") {
    const w = params.width ?? 0;
    const h = params.height ?? 0;
    const unit = params.dimensionUnit ?? "m";
    lines.push(`*Ukuran:* ${w} × ${h} ${unit} (${params.quantity} pcs)`);

    if (params.billedAreaM2 !== undefined) {
      if (params.isMinAreaApplied) {
        lines.push(`*Luas Tertagih:* ${params.billedAreaM2} m² (Batas minimum ${params.minArea ?? 1} m²)`);
      } else {
        lines.push(`*Luas:* ${params.billedAreaM2} m²`);
      }
    }
    lines.push(`*Tarif Bahan:* ${formatRupiah(params.effectiveUnitPrice)}/m²`);
  } else {
    const label = params.unitLabel || "pcs";
    lines.push(`*Jumlah:* ${params.quantity} ${label}`);
    if (params.matchedTier) {
      lines.push(`*Tarif:* ${formatRupiah(params.effectiveUnitPrice)}/${label} (Grosir min. ${params.matchedTier.minQty})`);
    } else {
      lines.push(`*Tarif:* ${formatRupiah(params.effectiveUnitPrice)}/${label}`);
    }
  }

  if (params.finishings && params.finishings.length > 0) {
    lines.push("");
    lines.push("*Finishing Tambahan:*");
    for (const f of params.finishings) {
      lines.push(`• ${f.name}: ${formatRupiah(f.subtotal)}`);
    }
  }

  lines.push("");
  lines.push(`*Estimasi Total: ${formatRupiah(params.grandTotal)}*`);
  lines.push("");
  lines.push("_Harga estimasi dapat menyesuaikan setelah file desain final dicek._");

  return lines.join("\n");
}

/**
 * Format teks perbandingan harga 2 opsi bahan dengan spesifikasi ukuran/jumlah yang sama.
 */
export function formatComparisonEstimateText(params: ComparisonEstimateParams): string {
  const storeHeader = `*Perbandingan Harga Bahan — ${params.storeName || "Ksatria Graphx"}*`;
  const lines: string[] = [storeHeader, ""];

  if (params.pricingType === "AREA") {
    const w = params.width ?? 0;
    const h = params.height ?? 0;
    const unit = params.dimensionUnit ?? "m";
    lines.push(`*Spesifikasi:* ${w} × ${h} ${unit} (${params.quantity} pcs)`);
  } else {
    lines.push(`*Spesifikasi:* ${params.quantity} ${params.unitLabel || "pcs"}`);
  }

  if (params.finishingsSummary && params.finishingsSummary.length > 0) {
    lines.push(`*Finishing:* ${params.finishingsSummary.join(", ")}`);
  }
  lines.push("");

  // Opsi A
  lines.push(`*1. ${params.productA.name}*`);
  lines.push(`   Tarif: ${formatRupiah(params.productA.unitPrice)}${params.pricingType === "AREA" ? "/m²" : ""}`);
  lines.push(`   *Total: ${formatRupiah(params.productA.grandTotal)}*`);
  lines.push("");

  // Opsi B
  lines.push(`*2. ${params.productB.name}*`);
  lines.push(`   Tarif: ${formatRupiah(params.productB.unitPrice)}${params.pricingType === "AREA" ? "/m²" : ""}`);
  lines.push(`   *Total: ${formatRupiah(params.productB.grandTotal)}*`);
  lines.push("");

  // Analisis Selisih
  const diff = Math.abs(params.productA.grandTotal - params.productB.grandTotal);
  if (diff === 0) {
    lines.push("*Analisis:* Kedua opsi bahan memiliki estimasi total yang sama.");
  } else if (params.productA.grandTotal < params.productB.grandTotal) {
    lines.push(`*Selisih Harga: ${formatRupiah(diff)}*`);
    lines.push(`(${params.productA.name} lebih hemat ${formatRupiah(diff)} dibanding ${params.productB.name})`);
  } else {
    lines.push(`*Selisih Harga: ${formatRupiah(diff)}*`);
    lines.push(`(${params.productB.name} lebih hemat ${formatRupiah(diff)} dibanding ${params.productA.name})`);
  }

  lines.push("");
  lines.push("_Harga estimasi dapat menyesuaikan setelah file desain final dicek._");

  return lines.join("\n");
}
