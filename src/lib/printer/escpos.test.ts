import { describe, it, expect } from "vitest";
import {
  sanitizeAscii,
  wrapText,
  formatTwoColumns,
  EscPosBuilder,
  generateEscPosReceipt,
} from "./escpos";
import type { ReceiptOrderData, ReceiptStoreSettings } from "./share";

describe("Mesin ESC/POS Deterministik 58mm & 80mm (US-012)", () => {
  describe("1. Sanitasi Karakter Non-ASCII & Emoji", () => {
    it("harus mengonversi simbol kali dan pangkat luas (× -> x, m² -> m2)", () => {
      const input = "Spanduk 3×1 m² Bahan Korea";
      const result = sanitizeAscii(input);
      expect(result).toBe("Spanduk 3x1 m2 Bahan Korea");
    });

    it("harus membersihkan emoji dan simbol non-printable yang merusak printer thermal", () => {
      const input = "Nota Pembayaran 🛒🔥 Toko Berkah #1 🇮🇩";
      const result = sanitizeAscii(input);
      expect(result).toBe("Nota Pembayaran  Toko Berkah #1");
    });

    it("harus menormalkan tanda kutip miring dan tanda hubung panjang", () => {
      const input = "“Ksatria Graphx” — Percetakan ‘Cepat’";
      const result = sanitizeAscii(input);
      expect(result).toBe('"Ksatria Graphx" - Percetakan \'Cepat\'');
    });

    it("harus menangani string kosong, null, atau undefined dengan aman", () => {
      expect(sanitizeAscii("")).toBe("");
      expect(sanitizeAscii(null)).toBe("");
      expect(sanitizeAscii(undefined)).toBe("");
    });
  });

  describe("2. Text Wrapping & Column Formatting", () => {
    it("harus membungkus teks panjang tanpa melampaui batas 32 karakter (58mm)", () => {
      const longText = "Spanduk Promosi Warung Makan Soto Ayam Kampung Super Lezat";
      const lines = wrapText(longText, 32);
      expect(lines.length).toBeGreaterThan(1);
      lines.forEach((line) => {
        expect(line.length).toBeLessThanOrEqual(32);
      });
    });

    it("harus memotong kata tunggal yang lebih panjang dari lebar kolom", () => {
      const singleLongWord = "https://ksatriagraphx.com/orders/verify/abcdef12345678901234567890";
      const lines = wrapText(singleLongWord, 32);
      expect(lines.length).toBeGreaterThan(1);
      lines.forEach((line) => {
        expect(line.length).toBeLessThanOrEqual(32);
      });
    });

    it("formatTwoColumns harus menghasilkan panjang tepat 32 karakter pada mode 58mm", () => {
      const line = formatTwoColumns("Subtotal", "Rp 150.000", 32);
      expect(line.length).toBe(32);
      expect(line.startsWith("Subtotal")).toBe(true);
      expect(line.endsWith("Rp 150.000")).toBe(true);
    });

    it("formatTwoColumns harus menghasilkan panjang tepat 48 karakter pada mode 80mm", () => {
      const line = formatTwoColumns("Total Omzet Toko", "Rp 2.500.000", 48);
      expect(line.length).toBe(48);
      expect(line.startsWith("Total Omzet Toko")).toBe(true);
      expect(line.endsWith("Rp 2.500.000")).toBe(true);
    });

    it("formatTwoColumns harus membungkus label kiri jika label + nominal melampaui lebar kolom", () => {
      const label = "Spanduk Flexi Frontlite 340gsm Super Tebal Anti Air";
      const price = "Rp 120.000";
      const result = formatTwoColumns(label, price, 32);
      const lines = result.split("\n");
      expect(lines.length).toBeGreaterThan(1);
      // Baris terakhir harus memuat nilai nominal
      expect(lines[lines.length - 1].endsWith(price)).toBe(true);
      lines.forEach((l) => {
        expect(l.length).toBeLessThanOrEqual(32);
      });
    });
  });

  describe("3. EscPosBuilder & ESC/POS Protocol Commands", () => {
    it("harus menginisialisasi buffer dengan command ESC @ (0x1B 0x40)", () => {
      const builder = new EscPosBuilder("58mm");
      const bytes = builder.build();
      expect(bytes[0]).toBe(0x1b);
      expect(bytes[1]).toBe(0x40);
      expect(builder.getColumnWidth()).toBe(32);
    });

    it("harus mengatur lebar kolom 48 karakter untuk mode 80mm", () => {
      const builder = new EscPosBuilder("80mm");
      expect(builder.getColumnWidth()).toBe(48);
    });

    it("harus menyematkan command align center, bold, dan double height", () => {
      const builder = new EscPosBuilder("58mm");
      builder.alignCenter();
      builder.bold(true);
      builder.doubleHeight(true);
      builder.line("JUDUL");
      const bytes = builder.build();

      // Cek apakah buffer memuat command align center (0x1B 0x61 0x01)
      const hasAlignCenter = bytes.some((b, i) => b === 0x1b && bytes[i + 1] === 0x61 && bytes[i + 2] === 0x01);
      expect(hasAlignCenter).toBe(true);

      // Cek apakah buffer memuat command bold on (0x1B 0x45 0x01)
      const hasBoldOn = bytes.some((b, i) => b === 0x1b && bytes[i + 1] === 0x45 && bytes[i + 2] === 0x01);
      expect(hasBoldOn).toBe(true);

      // Cek apakah buffer memuat command double height (0x1D 0x21 0x01)
      const hasDoubleHeight = bytes.some((b, i) => b === 0x1d && bytes[i + 1] === 0x21 && bytes[i + 2] === 0x01);
      expect(hasDoubleHeight).toBe(true);
    });

    it("harus menyematkan command pemotong kertas otomatis (partial cut)", () => {
      const builder = new EscPosBuilder("58mm");
      builder.cut();
      const bytes = builder.build();
      // Partial cut (0x1D 0x56 0x42 0x00)
      const hasCut = bytes.some(
        (b, i) => b === 0x1d && bytes[i + 1] === 0x56 && bytes[i + 2] === 0x42 && bytes[i + 3] === 0x00
      );
      expect(hasCut).toBe(true);
    });
  });

  describe("4. Generator Struk Nota Lengkap (generateEscPosReceipt)", () => {
    const mockOrder: ReceiptOrderData = {
      invoiceNumber: "KGX-20261120-0001",
      createdAt: "2026-11-20T10:00:00Z",
      customerNameSnapshot: "Danang Satria",
      customerPhoneSnapshot: "08123456789",
      cashierName: "Budi",
      subtotal: 150000,
      designFee: 20000,
      discountAmount: 10000,
      grandTotal: 160000,
      paidAmount: 100000,
      remainingAmount: 60000,
      paymentStatus: "PARTIAL",
      items: [
        {
          productNameSnapshot: "Banner Spanduk Flexi",
          pricingTypeSnapshot: "AREA",
          widthM: "3",
          heightM: "1",
          quantity: 2,
          unitPrice: 25000,
          itemSubtotal: 150000,
          finishings: [
            {
              finishingNameSnapshot: "Mata Ayam 4 Sudut",
              subtotal: 10000,
            },
          ],
        },
      ],
    };

    const mockStore: ReceiptStoreSettings = {
      storeName: "Ksatria Graphx",
      tagline: "Percetakan & Digital Printing",
      phone: "0812-3456-7890",
      address: "Jl. Diponegoro No. 10",
      paymentInfo: "BCA: 1234567890 a.n Ksatria",
      receiptFooter: "Cetak Cepat, Hasil Memikat!",
    };

    it("harus menghasilkan Uint8Array yang valid untuk ukuran kertas 58mm", () => {
      const bytes = generateEscPosReceipt(mockOrder, mockStore, "58mm");
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(100);

      // Konversi ke string untuk memeriksa keberadaan data inti
      const str = new TextDecoder("ascii").decode(bytes);
      expect(str).toContain("Ksatria Graphx");
      expect(str).toContain("KGX-20261120-0001");
      expect(str).toContain("Danang Satria");
      expect(str).toContain("Banner Spanduk Flexi");
      expect(str).toContain("3m x");
      expect(str).toContain("Mata Ayam 4 Sudut");
      expect(str).toContain("PANJAR (DP)");
      expect(str).toContain("Rp 160.000");
    });

    it("harus menghasilkan Uint8Array yang valid untuk ukuran kertas 80mm", () => {
      const bytes = generateEscPosReceipt(mockOrder, mockStore, "80mm");
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(100);

      const str = new TextDecoder("ascii").decode(bytes);
      expect(str).toContain("Ksatria Graphx");
      expect(str).toContain("3m x 1m");
      expect(str).toContain("Cetak Cepat, Hasil Memikat!");
    });

    it("Zero-Leak Struk ESC/POS: tidak boleh mencetak modal vendor, harga produksi, atau laba", () => {
      const orderWithExtraSensitiveFields = {
        ...mockOrder,
        totalProductionCost: 111777,
        grossProfit: 48223,
        items: mockOrder.items.map((item) => ({
          ...item,
          productionUnitPriceSnapshot: 19377,
          productionSubtotal: 111777,
          profitAmount: 38223,
        })),
      } as unknown as ReceiptOrderData;

      const bytes = generateEscPosReceipt(orderWithExtraSensitiveFields, mockStore, "80mm");
      const str = new TextDecoder("ascii").decode(bytes);

      expect(str).not.toContain("111.777");
      expect(str).not.toContain("48.223");
      expect(str).not.toContain("19.377");
      expect(str).not.toContain("38.223");
      expect(str.toLowerCase()).not.toContain("modal");
      expect(str.toLowerCase()).not.toContain("vendor");
      expect(str.toLowerCase()).not.toContain("laba");
      expect(str.toLowerCase()).not.toContain("profit");
      expect(str.toLowerCase()).not.toContain("productioncost");
    });
  });
});
