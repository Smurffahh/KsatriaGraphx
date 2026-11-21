import { describe, it, expect } from "vitest";
import {
  formatSingleEstimateText,
  formatComparisonEstimateText,
  formatRupiah,
} from "./estimate-text";

describe("estimate-text formatting", () => {
  it("formats Indonesian Rupiah properly", () => {
    expect(formatRupiah(0)).toBe("Rp 0");
    expect(formatRupiah(25000)).toBe("Rp 25.000");
    expect(formatRupiah(1250500)).toBe("Rp 1.250.500");
  });

  it("formats single estimate text for AREA pricing product", () => {
    const text = formatSingleEstimateText({
      storeName: "Ksatria Graphx Percetakan",
      productName: "Banner Flexi 280gr",
      pricingType: "AREA",
      quantity: 2,
      width: 2,
      height: 1.5,
      dimensionUnit: "m",
      billedAreaM2: 3,
      effectiveUnitPrice: 20000,
      baseSubtotal: 120000,
      finishings: [
        {
          finishingId: "fin-1",
          name: "Mata Ayam 4 Sudut",
          chargeType: "PER_QTY",
          unitPrice: 5000,
          quantity: 2,
          subtotal: 10000,
        },
      ],
      finishingTotal: 10000,
      grandTotal: 130000,
    });

    expect(text).toContain("*Estimasi Harga — Ksatria Graphx Percetakan*");
    expect(text).toContain("*Produk:* Banner Flexi 280gr");
    expect(text).toContain("*Ukuran:* 2 × 1.5 m (2 pcs)");
    expect(text).toContain("*Luas:* 3 m²");
    expect(text).toContain("• Mata Ayam 4 Sudut: Rp 10.000");
    expect(text).toContain("*Estimasi Total: Rp 130.000*");
  });

  it("formats single estimate text for UNIT pricing product without finishing", () => {
    const text = formatSingleEstimateText({
      storeName: "Ksatria Graphx",
      productName: "Mug Keramik Custom",
      pricingType: "UNIT",
      quantity: 5,
      unitLabel: "pcs",
      effectiveUnitPrice: 25000,
      baseSubtotal: 125000,
      finishings: [],
      finishingTotal: 0,
      grandTotal: 125000,
    });

    expect(text).toContain("*Estimasi Harga — Ksatria Graphx*");
    expect(text).toContain("*Produk:* Mug Keramik Custom");
    expect(text).toContain("*Jumlah:* 5 pcs");
    expect(text).not.toContain("*Ukuran:*");
    expect(text).toContain("*Estimasi Total: Rp 125.000*");
  });

  it("formats comparison estimate text with savings highlighting", () => {
    const text = formatComparisonEstimateText({
      storeName: "Ksatria Graphx",
      pricingType: "AREA",
      quantity: 1,
      width: 3,
      height: 1,
      dimensionUnit: "m",
      productA: {
        name: "Flexi 280gr Standard",
        unitPrice: 20000,
        baseSubtotal: 60000,
        finishingTotal: 0,
        grandTotal: 60000,
      },
      productB: {
        name: "Korcin 440gr Tebal High-Res",
        unitPrice: 35000,
        baseSubtotal: 105000,
        finishingTotal: 0,
        grandTotal: 105000,
      },
    });

    expect(text).toContain("*Perbandingan Harga Bahan — Ksatria Graphx*");
    expect(text).toContain("*1. Flexi 280gr Standard*");
    expect(text).toContain("*Total: Rp 60.000*");
    expect(text).toContain("*2. Korcin 440gr Tebal High-Res*");
    expect(text).toContain("*Total: Rp 105.000*");
    expect(text).toContain("*Selisih Harga: Rp 45.000*");
    expect(text).toContain("Flexi 280gr Standard lebih hemat Rp 45.000 dibanding Korcin 440gr Tebal High-Res");
  });
});
