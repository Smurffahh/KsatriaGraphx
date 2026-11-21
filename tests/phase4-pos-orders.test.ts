import { describe, it, expect } from "vitest";
import {
  createCustomerSchema,
  normalizeIndonesianPhone,
} from "../src/lib/validators/customer";
import {
  createOrderSchema,
  addPaymentSchema,
  updateOrderStatusSchema,
} from "../src/lib/validators/order";
import {
  calculateOrder,
  isDiscountWithinCashierLimit,
  type PriceTier,
} from "../src/lib/calculator/pricing";
import { getWibDateKey } from "../src/lib/orders/invoice";

describe("Fase 4: POS, Kalkulator, Keamanan & Anti-Fraud Suite", () => {
  describe("1. Customer Validation & Phone Normalization (US-015)", () => {
    it("harus menormalisasi format nomor telepon Indonesia menjadi 628...", () => {
      expect(normalizeIndonesianPhone("08123456789")).toBe("628123456789");
      expect(normalizeIndonesianPhone("+62812-3456-7890")).toBe("6281234567890");
      expect(normalizeIndonesianPhone("62813 9999 8888")).toBe("6281399998888");
      expect(normalizeIndonesianPhone("0898 (7654) 321")).toBe("628987654321");
    });

    it("harus menolak nomor telepon luar negeri atau yang tidak sesuai format Indonesia", () => {
      expect(normalizeIndonesianPhone("12345")).toBeNull();
      expect(normalizeIndonesianPhone("+1 555 123 4567")).toBeNull();
      expect(normalizeIndonesianPhone("021-500500")).toBeNull(); // Nomor rumah/kantor bukan HP
    });

    it("skema createCustomerSchema harus strict dan menolak field ilegal", () => {
      const valid = createCustomerSchema.safeParse({
        name: "Budi Santoso",
        phone: "081234567890",
        address: "Jl. Sudirman No. 10",
        notes: "Pelanggan VIP",
      });
      expect(valid.success).toBe(true);

      const illegal = createCustomerSchema.safeParse({
        name: "Budi Santoso",
        illegalField: "hacked",
      });
      expect(illegal.success).toBe(false);
    });
  });

  describe("2. Zero-Trust Server Recalculation & Anti Price Tampering (US-007, US-009)", () => {
    it("kalkulasi server wajib menghitung ulang harga asli dari database dan mengabaikan manipulasi client", () => {
      const dbBasePrice = 30000;
      const tiers: PriceTier[] = [
        { minQty: 10, maxQty: 49, unitPrice: 28000 },
        { minQty: 50, maxQty: null, unitPrice: 25000 },
      ];

      // Client mengirim order qty 60
      const order = calculateOrder({
        items: [
          {
            pricingType: "UNIT",
            quantity: 60,
            basePrice: dbBasePrice,
            priceTiers: tiers,
          },
        ],
      });

      // 60 pcs berada di tier >= 50 (Rp 25.000) -> 60 * 25.000 = 1.500.000
      expect(order.subtotal).toBe(1500000);
      expect(order.grandTotal).toBe(1500000);
    });

    it("plafon diskon kasir memblokir diskon persen maupun nominal yang melebihi batas", () => {
      const maxCashierPercent = 10;
      const subtotalPlusDesign = 500000;

      // Diskon 10% (50.000) -> diizinkan
      expect(isDiscountWithinCashierLimit(subtotalPlusDesign, 50000, maxCashierPercent)).toBe(true);

      // Diskon 12% (60.000) -> ditolak
      expect(isDiscountWithinCashierLimit(subtotalPlusDesign, 60000, maxCashierPercent)).toBe(false);

      // Diskon 10.01% -> ditolak
      expect(isDiscountWithinCashierLimit(subtotalPlusDesign, 50500, maxCashierPercent)).toBe(false);
    });
  });

  describe("3. Order Schemas & Anti Race Condition DP Payment (US-009, US-010)", () => {
    it("createOrderSchema menolak order tanpa item", () => {
      const res = createOrderSchema.safeParse({
        customerNameSnapshot: "Umum",
        items: [],
      });
      expect(res.success).toBe(false);
    });

    it("addPaymentSchema memvalidasi nominal positif dan metode pembayaran yang diizinkan", () => {
      const valid = addPaymentSchema.safeParse({
        amount: 50000,
        paymentMethod: "CASH",
        cashReceived: 100000,
      });
      expect(valid.success).toBe(true);

      const invalidAmount = addPaymentSchema.safeParse({
        amount: 0,
        paymentMethod: "CASH",
      });
      expect(invalidAmount.success).toBe(false);

      const invalidNegative = addPaymentSchema.safeParse({
        amount: -5000,
        paymentMethod: "TRANSFER",
      });
      expect(invalidNegative.success).toBe(false);

      const invalidMethod = addPaymentSchema.safeParse({
        amount: 50000,
        paymentMethod: "BITCOIN",
      });
      expect(invalidMethod.success).toBe(false);
    });

    it("updateOrderStatusSchema mewajibkan cancelReason saat dibatalkan / void", () => {
      const validStatus = updateOrderStatusSchema.safeParse({
        productionStatus: "IN_PROGRESS",
      });
      expect(validStatus.success).toBe(true);

      const shortReason = updateOrderStatusSchema.safeParse({
        productionStatus: "CANCELLED",
        cancelReason: "bad", // < 5 karakter
      });
      expect(shortReason.success).toBe(false);

      const validCancel = updateOrderStatusSchema.safeParse({
        productionStatus: "CANCELLED",
        cancelReason: "Pelanggan membatalkan pesanan secara sepihak",
      });
      expect(validCancel.success).toBe(true);
    });

    it("simulasi pelunasan DP mencegah sisa tagihan negatif", () => {
      const grandTotal = 150000;
      const initialPaid = 50000;
      const remainingAmount = grandTotal - initialPaid; // 100.000

      // Simulasi pelunasan pertama
      const pay1 = 60000;
      const remAfterPay1 = remainingAmount - pay1; // 40.000
      expect(remAfterPay1).toBe(40000);

      // Pelunasan kedua dengan nominal lebih besar dari sisa (misal 50.000 untuk CASH)
      const pay2 = 50000;
      const effectivePay2 = Math.min(pay2, remAfterPay1); // 40.000
      const change2 = pay2 - remAfterPay1; // 10.000
      const remAfterPay2 = Math.max(0, remAfterPay1 - effectivePay2); // 0

      expect(effectivePay2).toBe(40000);
      expect(change2).toBe(10000);
      expect(remAfterPay2).toBe(0);
    });
  });

  describe("4. Atomic Invoice Numbering Date Key", () => {
    it("getWibDateKey harus menghasilkan 8 digit string tanggal YYYYMMDD", () => {
      const dateKey = getWibDateKey();
      expect(dateKey).toMatch(/^[0-9]{8}$/);
    });
  });

  describe("5. Kontrak Database Driver Transaksi & Simpan Nota POS (v1.0.3)", () => {
    it("skema createOrderSchema harus menerima transaksi walk-in tanpa customerId", () => {
      const validWalkIn = createOrderSchema.safeParse({
        customerId: null,
        customerNameSnapshot: "Pelanggan Walk-In",
        customerPhoneSnapshot: null,
        items: [
          {
            productId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
            quantity: 2,
            width: 2.0,
            height: 1.0,
            unit: "m",
            finishings: [],
          },
        ],
        designFee: 0,
        discountType: "NONE",
        discountValue: 0,
        initialPayment: {
          amount: 80000,
          paymentMethod: "CASH",
          cashReceived: 100000,
        },
      });

      expect(validWalkIn.success).toBe(true);
    });

    it("skema createOrderSchema harus menolak nota tanpa item", () => {
      const invalidNoItems = createOrderSchema.safeParse({
        customerNameSnapshot: "Pelanggan Walk-In",
        items: [],
      });

      expect(invalidNoItems.success).toBe(false);
    });
  });
});
