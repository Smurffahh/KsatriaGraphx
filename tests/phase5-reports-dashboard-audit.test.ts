import { describe, it, expect } from "vitest";
import { sanitizeCsvCell, buildSafeCsv } from "../src/lib/security/csv-sanitize";
import {
  buildWhatsAppReceiptText,
  buildWhatsAppReceiptUrl,
  type ReceiptOrderData,
  type ReceiptStoreSettings,
} from "../src/lib/printer/share";
import { sanitizeMetadata } from "../src/lib/security/audit";

describe("Fase 5: Nota Digital, Dashboard, Laporan & Audit Log Suite", () => {
  describe("1. CSV Formula Injection Sanitization (US-014 & RFC 4180)", () => {
    it("harus menyematkan prefix tanda kutip tunggal pada karakter formula berbahaya (=, +, -, @, \\t, \\r)", () => {
      expect(sanitizeCsvCell("=SUM(A1:A10)")).toBe("\"'=SUM(A1:A10)\"");
      expect(sanitizeCsvCell("+1234567890")).toBe("\"'+1234567890\"");
      expect(sanitizeCsvCell("-5+cmd|'/C calc'!A0")).toBe("\"'-5+cmd|'/C calc'!A0\"");
      expect(sanitizeCsvCell("@malicious")).toBe("\"'@malicious\"");
      expect(sanitizeCsvCell("\tTabIndented")).toBe("\"'\tTabIndented\"");
      expect(sanitizeCsvCell("\rCarriageReturn")).toBe("\"'\rCarriageReturn\"");
    });

    it("harus meng-escape tanda kutip ganda (\") dengan benar sesuai RFC 4180", () => {
      expect(sanitizeCsvCell('Spanduk Ukuran 3x1 "Glosir"')).toBe(
        '"Spanduk Ukuran 3x1 ""Glosir"""'
      );
    });

    it("harus menangani nilai null dan undefined dengan aman", () => {
      expect(sanitizeCsvCell(null)).toBe('""');
      expect(sanitizeCsvCell(undefined)).toBe('""');
    });

    it("harus menghasilkan file CSV lengkap dengan UTF-8 BOM (\\uFEFF) untuk Windows Excel", () => {
      const headers = ["Nota", "Customer", "Total"];
      const rows = [
        ["INV-001", "Budi", 50000],
        ["INV-002", "=HYPERLINK(\"http://evil.com\")", 100000],
      ];

      const csv = buildSafeCsv(headers, rows);
      expect(csv.startsWith("\uFEFF")).toBe(true);
      expect(csv).toContain("\"'=HYPERLINK(\"\"http://evil.com\"\")\"");
      expect(csv).toContain('"INV-001","Budi","50000"');
    });
  });

  describe("2. WhatsApp Receipt Builder & Zero-XSS Share (US-011)", () => {
    const mockOrder: ReceiptOrderData = {
      invoiceNumber: "KGX-20261120-0001",
      createdAt: "2026-11-20T10:00:00Z",
      customerNameSnapshot: "Ahmad Dahlan",
      customerPhoneSnapshot: "081234567890",
      cashierName: "Kasir 1",
      subtotal: 150000,
      designFee: 25000,
      discountAmount: 10000,
      grandTotal: 165000,
      paidAmount: 100000,
      remainingAmount: 65000,
      paymentStatus: "PARTIAL",
      productionStatus: "QUEUED",
      items: [
        {
          productNameSnapshot: "Spanduk Flexi 280gr",
          pricingTypeSnapshot: "AREA",
          widthM: "3",
          heightM: "1",
          quantity: 2,
          unitPrice: 25000,
          finishingTotal: 10000,
          itemSubtotal: 160000,
          finishings: [
            {
              finishingNameSnapshot: "Mata Ayam Tiap Sudut",
              quantity: "4",
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
      address: "Jl. Merdeka No. 45",
    };

    it("harus membentuk teks ringkasan nota WA yang rapi dan memuat data esensial", () => {
      const text = buildWhatsAppReceiptText(mockOrder, mockStore);
      expect(text).toContain("*KSATRIA GRAPHX*");
      expect(text).toContain("KGX-20261120-0001");
      expect(text).toContain("Ahmad Dahlan");
      expect(text).toContain("Spanduk Flexi 280gr");
      expect(text).toContain("Mata Ayam Tiap Sudut");
      expect(text).toContain("Rp 165.000"); // Grand total
      expect(text).toContain("PANJAR"); // Status PARTIAL
      expect(text).toContain("Rp 65.000"); // Sisa piutang
    });

    it("harus membentuk URL wa.me dengan normalisasi nomor telepon Indonesia 628...", () => {
      const url = buildWhatsAppReceiptUrl(mockOrder.customerPhoneSnapshot, mockOrder, mockStore);
      expect(url).not.toBeNull();
      expect(url).toContain("https://wa.me/6281234567890?text=");
    });

    it("harus membentuk URL wa.me tanpa nomor jika nomor telepon pelanggan tidak valid", () => {
      const url = buildWhatsAppReceiptUrl("invalid-number", mockOrder, mockStore);
      expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    });
  });

  describe("3. Forensic Audit Log Sanitization", () => {
    it("harus menyensor field kredensial sensitif dalam metadata log", () => {
      const rawMetadata = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        password: "SuperSecretPassword123!",
        accessToken: "jwt-token-string",
        refreshToken: "refresh-token-string",
        clientSecret: "api-secret-key",
        normalField: "Order created successfully",
        nested: {
          secretKey: "nested-secret",
          count: 5,
        },
      };

      const sanitized = sanitizeMetadata(rawMetadata);
      expect(sanitized).not.toBeNull();
      expect(sanitized?.password).toBe("[REDACTED]");
      expect(sanitized?.accessToken).toBe("[REDACTED]");
      expect(sanitized?.refreshToken).toBe("[REDACTED]");
      expect(sanitized?.clientSecret).toBe("[REDACTED]");
      expect(sanitized?.normalField).toBe("Order created successfully");
      expect((sanitized?.nested as any)?.secretKey).toBe("[REDACTED]");
      expect((sanitized?.nested as any)?.count).toBe(5);
    });

    it("harus mengembalikan null jika metadata kosong", () => {
      expect(sanitizeMetadata(null)).toBeNull();
      expect(sanitizeMetadata(undefined)).toBeNull();
    });
  });
});
