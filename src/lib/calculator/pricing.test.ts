import { describe, it, expect } from "vitest";
import {
  calculateAreaDimension,
  applyAreaRounding,
  findActivePriceTier,
  calculateFinishingSubtotal,
  calculateOrderItem,
  calculateOrder,
  isDiscountWithinCashierLimit,
  type PriceTier,
} from "./pricing";

describe("Pricing Engine - Pure Logic (US-007)", () => {
  describe("1. Area Dimension & Rounding Calculations", () => {
    it("skenario 1: harus mengonversi input cm ke meter secara akurat (300cm x 100cm = 3 m2)", () => {
      const res = calculateAreaDimension({ width: 300, height: 100, unit: "cm" });
      expect(res.widthM).toBe(3);
      expect(res.heightM).toBe(1);
      expect(res.rawAreaM2).toBe(3);
      expect(res.billedAreaM2).toBe(3);
      expect(res.isMinAreaApplied).toBe(false);
    });

    it("skenario 2: harus menghitung dimensi meter secara langsung (2m x 1.5m = 3 m2)", () => {
      const res = calculateAreaDimension({ width: 2, height: 1.5, unit: "m" });
      expect(res.widthM).toBe(2);
      expect(res.heightM).toBe(1.5);
      expect(res.rawAreaM2).toBe(3);
      expect(res.billedAreaM2).toBe(3);
    });

    it("skenario 3: harus menerapkan minArea ketika luas asli di bawah batas minimal (0.5m x 0.5m = 0.25 m2, minArea 1.00 m2)", () => {
      const res = calculateAreaDimension({
        width: 0.5,
        height: 0.5,
        unit: "m",
        minArea: "1.00",
        areaRounding: "EXACT",
      });
      expect(res.rawAreaM2).toBe(0.25);
      expect(res.billedAreaM2).toBe(1.0);
      expect(res.isMinAreaApplied).toBe(true);
    });

    it("skenario 4: pembulatan EXACT harus mempertahankan desimal tanpa dibulatkan ke atas", () => {
      const rounded = applyAreaRounding(1.234, "EXACT");
      expect(rounded).toBe(1.234);
    });

    it("skenario 5: pembulatan ROUND_UP_0_5 harus membulatkan ke kelipatan 0.5 terdekat ke atas", () => {
      expect(applyAreaRounding(1.0, "ROUND_UP_0_5")).toBe(1.0);
      expect(applyAreaRounding(1.1, "ROUND_UP_0_5")).toBe(1.5);
      expect(applyAreaRounding(1.5, "ROUND_UP_0_5")).toBe(1.5);
      expect(applyAreaRounding(1.51, "ROUND_UP_0_5")).toBe(2.0);
    });

    it("skenario 6: pembulatan ROUND_UP_1 harus membulatkan ke bilangan bulat terdekat ke atas", () => {
      expect(applyAreaRounding(1.0, "ROUND_UP_1")).toBe(1.0);
      expect(applyAreaRounding(1.05, "ROUND_UP_1")).toBe(2.0);
      expect(applyAreaRounding(2.9, "ROUND_UP_1")).toBe(3.0);
    });
  });

  describe("2. Tier Pricing & Wholesale Logic", () => {
    const tiers: PriceTier[] = [
      { minQty: 10, maxQty: 49, unitPrice: 45000 },
      { minQty: 50, maxQty: 99, unitPrice: 40000 },
      { minQty: 100, maxQty: null, unitPrice: 35000 },
    ];

    it("skenario 7: mencocokkan tier pada batas bawah (qty 10)", () => {
      const match = findActivePriceTier(tiers, 10, 50000);
      expect(match.unitPrice).toBe(45000);
      expect(match.matchedTier?.minQty).toBe(10);
    });

    it("skenario 8: mencocokkan tier di tengah rentang (qty 75)", () => {
      const match = findActivePriceTier(tiers, 75, 50000);
      expect(match.unitPrice).toBe(40000);
    });

    it("skenario 9: mencocokkan tier open-ended (maxQty null, qty 150)", () => {
      const match = findActivePriceTier(tiers, 150, 50000);
      expect(match.unitPrice).toBe(35000);
    });

    it("skenario 10: fallback ke basePrice saat kuantitas di bawah tier terkecil (qty 5)", () => {
      const match = findActivePriceTier(tiers, 5, 50000);
      expect(match.unitPrice).toBe(50000);
      expect(match.matchedTier).toBeNull();
    });

    it("skenario 11: kalkulasi produk CUSTOM menggunakan harga manual", () => {
      const res = calculateOrderItem({
        pricingType: "CUSTOM",
        unitPrice: 75000,
        quantity: 3,
      });
      expect(res.effectiveUnitPrice).toBe(75000);
      expect(res.itemSubtotal).toBe(225000);
    });
  });

  describe("3. Finishing Calculation & Item Totals", () => {
    it("skenario 12: finishing tipe FLAT dihitung tetap tanpa dipengaruhi qty/luas", () => {
      const res = calculateFinishingSubtotal(
        { chargeType: "FLAT", unitPrice: 15000, quantity: 1 },
        10,
        2.5
      );
      expect(res.subtotal).toBe(15000);
    });

    it("skenario 13: finishing tipe PER_QTY dikalikan dengan itemQuantity", () => {
      const res = calculateFinishingSubtotal(
        { chargeType: "PER_QTY", unitPrice: 2000, quantity: 1 },
        10,
        2.5
      );
      expect(res.subtotal).toBe(20000);
    });

    it("skenario 14: finishing tipe PER_AREA dikalikan luas billedAreaM2 dan itemQuantity", () => {
      const res = calculateFinishingSubtotal(
        { chargeType: "PER_AREA", unitPrice: 5000, quantity: 1 },
        2,
        3.0
      );
      // 3.0 m2 * 5000 * 2 item = 30000
      expect(res.subtotal).toBe(30000);
    });

    it("skenario 15: item AREA dengan multi-finishing dan override harga Owner", () => {
      const res = calculateOrderItem({
        pricingType: "AREA",
        width: 2,
        height: 1,
        unit: "m",
        quantity: 2,
        unitPrice: 25000,
        overrideUnitPrice: 20000,
        isPriceOverridden: true,
        finishings: [
          { chargeType: "FLAT", unitPrice: 5000, quantity: 1, name: "Lipat Samping" },
          { chargeType: "PER_QTY", unitPrice: 2000, quantity: 4, name: "Mata Ayam" },
        ],
      });

      // Area 2m2 * 20000 * 2 = 80000
      expect(res.baseSubtotal).toBe(80000);
      expect(res.effectiveUnitPrice).toBe(20000);
      expect(res.isPriceOverridden).toBe(true);
      // Finishing: 5000 + (2000 * 2 * 4 = 16000) = 21000
      expect(res.finishingTotal).toBe(21000);
      expect(res.itemSubtotal).toBe(101000);
    });
  });

  describe("4. Order Totals, Discounts & Cashier Ceiling", () => {
    it("skenario 16: kalkulasi order dengan diskon FIXED dan biaya desain", () => {
      const res = calculateOrder({
        items: [
          { pricingType: "UNIT", basePrice: 50000, quantity: 2 }, // 100000
        ],
        designFee: 25000,
        discountType: "FIXED",
        discountValue: 15000,
      });

      expect(res.subtotal).toBe(100000);
      expect(res.designFee).toBe(25000);
      expect(res.subtotalPlusDesign).toBe(125000);
      expect(res.discountAmount).toBe(15000);
      expect(res.grandTotal).toBe(110000);
    });

    it("skenario 17: kalkulasi order dengan diskon PERCENT", () => {
      const res = calculateOrder({
        items: [
          { pricingType: "UNIT", basePrice: 100000, quantity: 2 }, // 200000
        ],
        designFee: 0,
        discountType: "PERCENT",
        discountValue: 15,
      });

      expect(res.discountAmount).toBe(30000);
      expect(res.grandTotal).toBe(170000);
      expect(res.equivalentDiscountPercent).toBe(15);
    });

    it("skenario 18: helper isDiscountWithinCashierLimit memvalidasi batas plafon diskon kasir", () => {
      // Limit 10% dari 100.000 = 10.000
      expect(isDiscountWithinCashierLimit(100000, 10000, 10)).toBe(true);
      expect(isDiscountWithinCashierLimit(100000, 5000, 10)).toBe(true);
      expect(isDiscountWithinCashierLimit(100000, 10500, 10)).toBe(false);
      expect(isDiscountWithinCashierLimit(100000, 15000, 10)).toBe(false);
    });
  });

  describe("5. Payment Status & Cash Change Calculations", () => {
    it("skenario 19: pembayaran CASH lebih dari grandTotal menghasilkan kembalian dan status PAID", () => {
      const res = calculateOrder({
        items: [{ pricingType: "UNIT", basePrice: 85000, quantity: 2 }], // 170000
        paymentMethod: "CASH",
        cashReceived: 200000,
      });

      expect(res.grandTotal).toBe(170000);
      expect(res.paidAmount).toBe(170000);
      expect(res.changeAmount).toBe(30000);
      expect(res.remainingAmount).toBe(0);
      expect(res.paymentStatus).toBe("PAID");
    });

    it("skenario 20: pembayaran sebagian (DP) menghasilkan status PARTIAL dan remainingAmount positif", () => {
      const res = calculateOrder({
        items: [{ pricingType: "UNIT", basePrice: 100000, quantity: 2 }], // 200000
        paymentMethod: "TRANSFER",
        initialPaymentAmount: 100000,
      });

      expect(res.grandTotal).toBe(200000);
      expect(res.paidAmount).toBe(100000);
      expect(res.remainingAmount).toBe(100000);
      expect(res.changeAmount).toBe(0);
      expect(res.paymentStatus).toBe("PARTIAL");
    });

    it("skenario 21: tanpa pembayaran menghasilkan status UNPAID", () => {
      const res = calculateOrder({
        items: [{ pricingType: "UNIT", basePrice: 50000, quantity: 1 }],
        initialPaymentAmount: 0,
      });

      expect(res.paidAmount).toBe(0);
      expect(res.remainingAmount).toBe(50000);
      expect(res.paymentStatus).toBe("UNPAID");
    });
  });

  describe("6. Edge Cases & Security Inputs", () => {
    it("skenario 22: sanitasi nilai negatif, kuantitas 0, atau dimensi nol tidak menghasilkan nilai corrupt", () => {
      const areaRes = calculateAreaDimension({ width: -5, height: 0, unit: "m" });
      expect(areaRes.rawAreaM2).toBe(0);

      const itemRes = calculateOrderItem({
        pricingType: "AREA",
        width: -10,
        height: -10,
        quantity: -1,
        unitPrice: -50000,
      });
      expect(itemRes.quantity).toBe(0);
      expect(itemRes.itemSubtotal).toBe(0);

      const orderRes = calculateOrder({
        items: [],
        designFee: -1000,
        discountValue: -500,
      });
      expect(orderRes.grandTotal).toBe(0);
      expect(orderRes.paymentStatus).toBe("PAID");
    });

    it("skenario 23: diskon FIXED lebih besar dari total tagihan di-cap maksimal sebesar tagihan (grandTotal tidak pernah negatif)", () => {
      const orderRes = calculateOrder({
        items: [{ pricingType: "UNIT", basePrice: 50000, quantity: 1 }],
        discountType: "FIXED",
        discountValue: 9999999,
      });
      expect(orderRes.discountAmount).toBe(50000);
      expect(orderRes.grandTotal).toBe(0);
      expect(orderRes.remainingAmount).toBe(0);
    });

    it("skenario 24: diskon PERCENT di atas 100% di-cap maksimal 100%", () => {
      const orderRes = calculateOrder({
        items: [{ pricingType: "UNIT", basePrice: 100000, quantity: 1 }],
        discountType: "PERCENT",
        discountValue: 150,
      });
      expect(orderRes.discountAmount).toBe(100000);
      expect(orderRes.grandTotal).toBe(0);
    });
  });
});
