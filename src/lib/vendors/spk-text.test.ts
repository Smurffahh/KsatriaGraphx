import { describe, it, expect } from "vitest";
import { buildVendorSpkText, buildVendorWhatsAppUrl } from "./spk-text";
import { deriveVendorPaymentStatus } from "./settlement";
import {
  normalizeVendorWhatsapp,
  isSafeHttpsDesignUrl,
  createVendorSchema,
  updateVendorSchema,
  orderVendorAssignmentSchema,
  createVendorPaymentSchema,
  adjustVendorCostSchema,
} from "@/lib/validators/vendor";

describe("Vendor SPK Builder, Normalisasi WA, Settlement Status & Validasi (v1.6.0)", () => {
  describe("1. Normalisasi WhatsApp Vendor & Keamanan URL File Desain", () => {
    it("menormalisasi format nomor Indonesia (08, +62, 62, 8) menjadi 62... tanpa karakter non-digit", () => {
      expect(normalizeVendorWhatsapp("0812-3456-7890")).toBe("6281234567890");
      expect(normalizeVendorWhatsapp("+62 812 3456 7890")).toBe("6281234567890");
      expect(normalizeVendorWhatsapp("6281398765432")).toBe("6281398765432");
      expect(normalizeVendorWhatsapp("81234567890")).toBe("6281234567890");
    });

    it("menolak nomor WhatsApp yang terlalu pendek, non-angka, atau mengandung tanda + ganda", () => {
      expect(normalizeVendorWhatsapp("08123")).toBeNull();
      expect(normalizeVendorWhatsapp("abcde")).toBeNull();
      expect(normalizeVendorWhatsapp("62+8123456789")).toBeNull();
      expect(normalizeVendorWhatsapp(null)).toBeNull();
    });

    it("hanya mengizinkan URL file desain berprotokol HTTPS tanpa karakter kontrol", () => {
      expect(isSafeHttpsDesignUrl("https://drive.google.com/file/d/abc123/view")).toBe(true);
      expect(isSafeHttpsDesignUrl("http://drive.google.com/file/d/abc123/view")).toBe(false);
      expect(isSafeHttpsDesignUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeHttpsDesignUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
      expect(isSafeHttpsDesignUrl("https://cdn.example.com/file.pdf\nInjected")).toBe(false);
      expect(isSafeHttpsDesignUrl(`https://cdn.example.com/${"a".repeat(490)}`)).toBe(false);
    });
  });

  describe("2. Kontrak Zero-Leak WhatsApp SPK Builder", () => {
    it("membentuk teks SPK single-item & URL wa.me valid dengan link desain HTTPS", () => {
      const text = buildVendorSpkText({
        invoiceNumber: "KGX-20261127-0010",
        vendorName: "Percetakan Maju Jaya",
        targetDeadline: "Besok Pukul 14.00 WIB",
        designFileUrl: "https://drive.google.com/file/d/spk-design-001",
        additionalNote: "Gunakan bahan outdoor grade A",
        items: [
          {
            productName: "Banner Flexi 280gr",
            sku: "BNR-280",
            dimensionsLabel: "3 x 1 m",
            quantity: 2,
            unitLabel: "m²",
            finishings: ["Mata Ayam Tiap 50cm", "Lipat Pres Keliling"],
            itemNote: "Warna merah solid pekat",
          },
        ],
      });

      expect(text).toContain("*SPK PRODUKSI — KGX-20261127-0010*");
      expect(text).toContain("Kepada Yth: Percetakan Maju Jaya");
      expect(text).toContain("1. Banner Flexi 280gr [BNR-280]");
      expect(text).toContain("Jumlah: 2 m² — Ukuran/Dimensi: 3 x 1 m");
      expect(text).toContain("Finishing: Mata Ayam Tiap 50cm, Lipat Pres Keliling");
      expect(text).toContain("Catatan item: Warna merah solid pekat");
      expect(text).toContain("File Desain: https://drive.google.com/file/d/spk-design-001");
      expect(text).toContain("Target Selesai: Besok Pukul 14.00 WIB");
      expect(text).toContain("Catatan Produksi: Gunakan bahan outdoor grade A");

      const waUrl = buildVendorWhatsAppUrl("0812-3456-7890", text);
      expect(waUrl.startsWith("https://wa.me/6281234567890?text=")).toBe(true);
      expect(decodeURIComponent(waUrl.split("?text=")[1])).toBe(text);
    });

    it("mengabaikan link desain non-HTTPS dan membersihkan karakter kontrol dari input SPK", () => {
      const text = buildVendorSpkText({
        invoiceNumber: "KGX-20261127-0011\u0007",
        vendorName: "Konveksi Nusantara\u0000",
        designFileUrl: "javascript:alert('xss')",
        items: [
          {
            productName: "Kaos Combed 30s",
            quantity: 24,
            unitLabel: "pcs",
            finishings: [],
          },
          {
            productName: "Totebag Kanvas",
            quantity: 12,
            unitLabel: "pcs",
            finishings: ["Sablon Plastisol 2 Sisi"],
          },
        ],
      });

      expect(text).toContain("1. Kaos Combed 30s");
      expect(text).toContain("2. Totebag Kanvas");
      expect(text).not.toContain("javascript:");
      expect(text).not.toContain("File Desain:");
      expect(text).not.toMatch(/[\u0000-\u0008\u000B-\u001F\u007F]/);
    });

    it("menjamin tidak pernah membocorkan data pelanggan, harga jual, total nota, ataupun laba/margin", () => {
      const text = buildVendorSpkText({
        invoiceNumber: "KGX-20261127-0012",
        vendorName: "Vendor Digital Print",
        items: [
          {
            productName: "Stiker Vinyl A3+",
            quantity: 10,
            unitLabel: "lembar",
            finishings: ["Cut Die Cut"],
          },
        ],
      });

      for (const forbidden of [
        "Rp ",
        "Harga Jual",
        "Grand Total",
        "Total Nota",
        "Laba",
        "Margin",
        "Profit",
        "Pelanggan",
        "Customer",
        "08111222333",
      ]) {
        expect(text).not.toContain(forbidden);
      }
    });

    it("melempar error pada buildVendorWhatsAppUrl jika nomor WA vendor tidak valid", () => {
      expect(() => buildVendorWhatsAppUrl("123", "SPK test")).toThrow();
    });
  });

  describe("3. Penurunan Status Setoran Modal Vendor (deriveVendorPaymentStatus)", () => {
    it("menghasilkan NOT_APPLICABLE, UNPAID, PARTIAL, dan PAID sesuai kalkulasi akurat", () => {
      expect(deriveVendorPaymentStatus(0, 0)).toBe("NOT_APPLICABLE");
      expect(deriveVendorPaymentStatus(0, 15000)).toBe("PAID");
      expect(deriveVendorPaymentStatus(100000, 0)).toBe("UNPAID");
      expect(deriveVendorPaymentStatus(100000, 40000)).toBe("PARTIAL");
      expect(deriveVendorPaymentStatus(100000, 100000)).toBe("PAID");
      expect(deriveVendorPaymentStatus(100000, 120000)).toBe("PAID");
    });
  });

  describe("4. Validasi Skema Zod v4 (.strict() & Normalisasi)", () => {
    it("menormalisasi field opsional kosong pada createVendorSchema & menolak properti liar (.strict)", () => {
      const parsed = createVendorSchema.parse({
        name: "Vendor Sablon Jaya",
        contactName: "   ",
        whatsapp: "0812-0000-1111",
        address: "",
        specialty: "Konveksi & Sablon",
        leadTimeDays: "3",
        notes: "",
      });

      expect(parsed.whatsapp).toBe("6281200001111");
      expect(parsed.contactName).toBeNull();
      expect(parsed.address).toBeNull();
      expect(parsed.notes).toBeNull();
      expect(parsed.leadTimeDays).toBe(3);
      expect(parsed.isActive).toBe(true);

      const unknownField = createVendorSchema.safeParse({
        name: "Vendor A",
        whatsapp: "08123456789",
        hackedField: true,
      });
      expect(unknownField.success).toBe(false);
    });

    it("memvalidasi updateVendorSchema, orderVendorAssignmentSchema, createVendorPaymentSchema & adjustVendorCostSchema", () => {
      expect(updateVendorSchema.safeParse({ isActive: false }).success).toBe(true);
      expect(orderVendorAssignmentSchema.safeParse({ items: [], markSpkSent: false }).success).toBe(
        false
      );
      expect(
        orderVendorAssignmentSchema.safeParse({
          designFileUrl: "http://insecure.example.com/file.pdf",
        }).success
      ).toBe(false);
      expect(
        orderVendorAssignmentSchema.safeParse({
          designFileUrl: "https://drive.google.com/file/d/ok/view",
          markSpkSent: true,
        }).success
      ).toBe(true);

      expect(
        createVendorPaymentSchema.safeParse({
          amount: "50000",
          paymentMethod: "TRANSFER",
          vendorName: "Vendor Print",
        }).success
      ).toBe(true);
      expect(
        createVendorPaymentSchema.safeParse({
          amount: 50000,
          paymentMethod: "TRANSFER",
        }).success
      ).toBe(false);

      expect(
        adjustVendorCostSchema.safeParse({
          totalProductionCost: "75000",
          reason: "Revisi spesifikasi bahan outdoor",
        }).success
      ).toBe(true);
      expect(
        adjustVendorCostSchema.safeParse({
          totalProductionCost: 75000,
          reason: "ab",
        }).success
      ).toBe(false);
    });
  });
});
