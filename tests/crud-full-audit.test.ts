import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createProductSchema,
  updateProductSchema,
  formatZodError,
  isValidVercelBlobUrl,
} from "@/lib/validators/product";
import { createCategorySchema, updateCategorySchema } from "@/lib/validators/category";
import { createFinishingSchema, updateFinishingSchema } from "@/lib/validators/finishing";
import { createCustomerSchema, updateCustomerSchema, normalizeIndonesianPhone } from "@/lib/validators/customer";
import { updateStoreSettingsSchema } from "@/lib/validators/settings";
import { createUserSchema, updateUserSchema } from "@/lib/validators/user";
import {
  MissingBlobTokenError,
  PrivateBlobStoreError,
} from "@/lib/storage/blob";
import { handleGuardError, requireOwner } from "@/lib/auth/guard";
import { NextRequest } from "next/server";
import { detectMagicBytes, MAX_IMAGE_SIZE_BYTES } from "@/lib/security/image-validator";

describe("Audit Penuh Kontrak CRUD, Normalisasi Input & Error Handling (v1.1.2)", () => {
  const dummyUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  describe("1. Validasi & Normalisasi Produk (Tambah & Edit)", () => {
    it("harus meloloskan Tambah Produk AREA tanpa foto (imageUrl: '' dan null)", () => {
      const payloadWithEmptyString = {
        categoryId: dummyUuid,
        name: "Banner Outdoor 280gr",
        sku: "",
        description: "",
        imageUrl: "",
        imageKey: "",
        pricingType: "AREA",
        unitLabel: "m²",
        basePrice: 20000,
        minArea: 1.0,
        areaRounding: "EXACT",
        isActive: true,
      };

      const res = createProductSchema.safeParse(payloadWithEmptyString);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.imageUrl).toBeNull();
        expect(res.data.sku).toBeNull();
        expect(res.data.description).toBeNull();
        expect(res.data.imageKey).toBeNull();
      }

      const payloadWithNull = {
        ...payloadWithEmptyString,
        imageUrl: null,
        imageKey: null,
      };
      const resNull = createProductSchema.safeParse(payloadWithNull);
      expect(resNull.success).toBe(true);
    });

    it("harus menerima properti 'id' pada payload Tambah & Edit tanpa error Unrecognized key", () => {
      const createWithIdUndef = {
        id: undefined,
        categoryId: dummyUuid,
        name: "Stiker Vinyl",
        pricingType: "UNIT",
        unitLabel: "lembar",
        basePrice: 15000,
      };
      const resCreate = createProductSchema.safeParse(createWithIdUndef);
      expect(resCreate.success).toBe(true);

      const updateWithId = {
        id: dummyUuid,
        categoryId: dummyUuid,
        name: "Stiker Vinyl Edit",
        basePrice: 17500,
      };
      const resUpdate = updateProductSchema.safeParse(updateWithId);
      expect(resUpdate.success).toBe(true);
      if (resUpdate.success) {
        expect(resUpdate.data.id).toBe(dummyUuid);
      }
    });

    it("harus melakukan coerce pada string number (basePrice & minArea)", () => {
      const payload = {
        categoryId: dummyUuid,
        name: "Brosur A5",
        pricingType: "UNIT",
        unitLabel: "rim",
        basePrice: "125000",
        minArea: "1.5",
      };
      const res = createProductSchema.safeParse(payload);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.basePrice).toBe(125000);
        expect(res.data.minArea).toBe(1.5);
      }
    });

    it("harus memvalidasi URL foto Vercel Blob publik dan endpoint proxy privat", () => {
      expect(
        isValidVercelBlobUrl("https://abc123store.public.blob.vercel-storage.com/products/img.webp")
      ).toBe(true);
      expect(
        isValidVercelBlobUrl("/api/uploads/product-image?key=products%2Fimg.webp")
      ).toBe(true);
      expect(isValidVercelBlobUrl("https://evil-site.com/hacked.webp")).toBe(false);
      expect(isValidVercelBlobUrl("http://insecure.public.blob.vercel-storage.com/img.webp")).toBe(false);
    });

    it("formatZodError harus menghasilkan pesan ringkas terbaca manusia", () => {
      const invalidPayload = {
        categoryId: "not-a-uuid",
        name: "",
        pricingType: "INVALID_TYPE",
        unitLabel: "",
        basePrice: -500,
      };
      const res = createProductSchema.safeParse(invalidPayload);
      expect(res.success).toBe(false);
      if (!res.success) {
        const errorMsg = formatZodError(res.error);
        expect(typeof errorMsg).toBe("string");
        expect(errorMsg.length).toBeGreaterThan(0);
        expect(errorMsg).not.toContain("object");
      }
    });
  });

  describe("2. Validasi & Normalisasi Kategori, Finishing, Pelanggan, Settings & User", () => {
    it("Kategori: slug otomatis dinormalkan, string kosong jadi undefined, id diizinkan", () => {
      const catPayload = {
        id: dummyUuid,
        name: "Digital Printing & Merchandise",
        slug: "  Digital Printing & Merchandise!  ",
        sortOrder: "1",
        isActive: true,
      };
      const res = createCategorySchema.safeParse(catPayload);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.slug).toBe("digital-printing-merchandise");
        expect(res.data.sortOrder).toBe(1);
      }

      const catEmptySlug = {
        name: "Outdoor Banner",
        slug: "",
      };
      const resEmpty = createCategorySchema.safeParse(catEmptySlug);
      expect(resEmpty.success).toBe(true);
      if (resEmpty.success) {
        expect(resEmpty.data.slug).toBeUndefined();
      }
    });

    it("Finishing: defaultPrice string ter-coerce, id diizinkan", () => {
      const finPayload = {
        id: dummyUuid,
        name: "Mata Ayam",
        chargeType: "FLAT",
        defaultPrice: "2500",
        unitLabel: "titik",
        isActive: true,
      };
      const res = createFinishingSchema.safeParse(finPayload);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.defaultPrice).toBe(2500);
      }
    });

    it("Pelanggan: phone valid dinormalkan, phone invalid ditolak, field kosong jadi null", () => {
      const validCustomer = {
        id: dummyUuid,
        name: "PT Sumber Berkah",
        phone: "0812-3456-7890",
        address: "   ",
        notes: "",
      };
      const res = createCustomerSchema.safeParse(validCustomer);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.phone).toBe("6281234567890");
        expect(res.data.address).toBeNull();
        expect(res.data.notes).toBeNull();
      }

      const invalidPhoneCustomer = {
        name: "Pelanggan Palsu",
        phone: "12345",
      };
      const resInvalid = createCustomerSchema.safeParse(invalidPhoneCustomer);
      expect(resInvalid.success).toBe(false);
    });

    it("Settings: field opsional kosong dinormalkan ke null", () => {
      const settingsPayload = {
        storeName: "Ksatria Graphx Percetakan",
        tagline: "",
        address: "",
        phone: "",
        paymentInfo: "",
        receiptFooter: "",
        invoicePrefix: "KGX",
        defaultPaperWidth: "MM_58",
        maxCashierDiscountPercent: "15",
      };
      const res = updateStoreSettingsSchema.safeParse(settingsPayload);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.tagline).toBeNull();
        expect(res.data.address).toBeNull();
        expect(res.data.maxCashierDiscountPercent).toBe(15);
      }
    });

    it("User: email kosong dinormalkan ke null, id diizinkan", () => {
      const userPayload = {
        id: dummyUuid,
        name: "Kasir Cabang Satu",
        username: "kasir_satu",
        email: "",
        password: "Password123",
        role: "KASIR",
      };
      const res = createUserSchema.safeParse(userPayload);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.email).toBeNull();
      }
    });
  });

  describe("3. Kontrak Keamanan 4-Layer Guard Web-Only & Simulasi Header APK", () => {
    it("harus menolak request APK ke rute /api/users dengan 403 Forbidden (Web-Only Guard)", async () => {
      const guardError = new Error("FORBIDDEN_BEARER_NOT_ALLOWED");
      const res = handleGuardError(guardError);
      expect(res.status).toBe(403);
      expect(res.code).toBe("FORBIDDEN_BEARER_NOT_ALLOWED");
      expect(res.message).toContain("hanya dapat diakses melalui antarmuka Web");

      const platformError = new Error("FORBIDDEN_PLATFORM_NOT_WEB");
      const resPlatform = handleGuardError(platformError);
      expect(resPlatform.status).toBe(403);
    });
  });

  describe("4. Pemetaan Error Upload Foto Vercel Blob & Validasi Gambar", () => {
    it("MissingBlobTokenError harus memiliki code BLOB_TOKEN_MISSING dan pesan informatif", () => {
      const err = new MissingBlobTokenError();
      expect(err.code).toBe("BLOB_TOKEN_MISSING");
      expect(err.message).toBe("BLOB_READ_WRITE_TOKEN belum terpasang di environment server");
    });

    it("PrivateBlobStoreError harus memiliki code BLOB_STORE_PRIVATE", () => {
      const err = new PrivateBlobStoreError();
      expect(err.code).toBe("BLOB_STORE_PRIVATE");
      expect(err.message).toContain("Vercel Blob Store masih bertipe Private");
    });

    it("harus memblokir file palsu SVG dan bukan gambar", () => {
      const fakeSvg = Buffer.from("<svg>alert(1)</svg>");
      expect(detectMagicBytes(fakeSvg)).toBeNull();
    });
  });
});
