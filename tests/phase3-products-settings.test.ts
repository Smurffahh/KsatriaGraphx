import { describe, it, expect } from "vitest";
import {
  detectMagicBytes,
  validateAndProcessImage,
  ImageValidationError,
  MAX_IMAGE_SIZE_BYTES,
} from "../src/lib/security/image-validator";
import { isValidVercelBlobUrl } from "../src/lib/storage/blob";
import {
  validatePriceTiers,
  createProductSchema,
  updateProductSchema,
} from "../src/lib/validators/product";
import { createCategorySchema } from "../src/lib/validators/category";
import { createFinishingSchema } from "../src/lib/validators/finishing";
import { updateStoreSettingsSchema } from "../src/lib/validators/settings";
import sharp from "sharp";

describe("Fase 3 — US-004B: Media Storage & Image Sanitization Tests", () => {
  it("harus mendeteksi Magic Bytes JPEG, PNG, dan WebP dengan akurat", () => {
    // 1. JPEG Magic Bytes: FF D8 FF
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    expect(detectMagicBytes(jpegBuffer)).toBe("image/jpeg");

    // 2. PNG Magic Bytes: 89 50 4E 47 0D 0A 1A 0A
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    expect(detectMagicBytes(pngBuffer)).toBe("image/png");

    // 3. WebP Magic Bytes: RIFF (0..3) + WEBP (8..11)
    const webpBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(detectMagicBytes(webpBuffer)).toBe("image/webp");
  });

  it("harus menolak file palsu (SVG, HTML, teks/script) yang diberi ekstensi .jpg", () => {
    // File teks bertuliskan script / HTML
    const fakeHtml = Buffer.from("<!DOCTYPE html><html><body><h1>Hacked</h1></body></html>");
    expect(detectMagicBytes(fakeHtml)).toBeNull();

    // File SVG berbahaya (Stored XSS payload)
    const fakeSvg = Buffer.from("<svg onload='alert(1)' xmlns='http://www.w3.org/2000/svg'></svg>");
    expect(detectMagicBytes(fakeSvg)).toBeNull();

    // Buffer kosong atau terlalu pendek
    const tinyBuffer = Buffer.from([0x01, 0x02]);
    expect(detectMagicBytes(tinyBuffer)).toBeNull();
  });

  it("harus menolak file gambar berukuran lebih dari 2 MB dengan status HTTP 413", async () => {
    const oversizedBuffer = Buffer.alloc(MAX_IMAGE_SIZE_BYTES + 1024);

    await expect(validateAndProcessImage(oversizedBuffer)).rejects.toThrowError(
      ImageValidationError
    );

    try {
      await validateAndProcessImage(oversizedBuffer);
    } catch (err) {
      const imgErr = err as ImageValidationError;
      expect(imgErr.statusCode).toBe(413);
      expect(imgErr.code).toBe("PAYLOAD_TOO_LARGE");
    }
  });

  it("harus memproses gambar valid menjadi WebP dan menghapus metadata EXIF", async () => {
    // Buat gambar PNG 100x100 asli menggunakan Sharp
    const samplePng = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const result = await validateAndProcessImage(samplePng);
    expect(result.contentType).toBe("image/webp");
    expect(result.originalType).toBe("image/png");

    // Periksa bahwa output buffer adalah WebP yang valid
    const metadata = await sharp(result.processedBuffer).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(100);
    expect(metadata.height).toBe(100);
    // Sharp default tanpa keepMetadata() menghapus seluruh tag EXIF
    expect(metadata.exif).toBeUndefined();
  });

  it("harus memvalidasi URL Vercel Blob dan menolak URL berbahaya / SSRF", () => {
    // Valid URLs (public, private, proxy path)
    expect(isValidVercelBlobUrl("https://abc123xyz.public.blob.vercel-storage.com/products/test.webp")).toBe(true);
    expect(isValidVercelBlobUrl("https://my-store.public.blob.vercel-storage.com/products/banner.webp")).toBe(true);
    expect(isValidVercelBlobUrl("https://cljdu6wbfxonq2bw.private.blob.vercel-storage.com/products/test.webp")).toBe(true);
    expect(isValidVercelBlobUrl("/api/uploads/product-image?key=products%2Fsample.webp")).toBe(true);

    // Invalid URLs (SSRF, protocol non-https, domain palsu, XSS)
    expect(isValidVercelBlobUrl("http://abc123xyz.public.blob.vercel-storage.com/products/test.webp")).toBe(false);
    expect(isValidVercelBlobUrl("https://evil-storage.com/products/test.webp")).toBe(false);
    expect(isValidVercelBlobUrl("https://attacker.com/steal.png")).toBe(false);
    expect(isValidVercelBlobUrl("javascript:alert(document.cookie)")).toBe(false);
    expect(isValidVercelBlobUrl("not-a-url")).toBe(false);
  });
});

describe("Fase 3 — US-005: Wholesale Price Tiers Anti-Overlap & Validations", () => {
  it("harus meloloskan rentang tier grosir yang valid dan berurutan", () => {
    const validTiers = [
      { minQty: 1, maxQty: 11, unitPrice: 50000 },
      { minQty: 12, maxQty: 49, unitPrice: 45000 },
      { minQty: 50, maxQty: null, unitPrice: 40000 },
    ];
    const check = validatePriceTiers(validTiers);
    expect(check.isValid).toBe(true);
  });

  it("harus menolak tier di mana minQty > maxQty", () => {
    const invalidTiers = [
      { minQty: 20, maxQty: 10, unitPrice: 35000 },
    ];
    const check = validatePriceTiers(invalidTiers);
    expect(check.isValid).toBe(false);
    expect(check.error).toContain("tidak boleh lebih besar dari Max Qty");
  });

  it("harus menolak rentang tier yang saling tumpang tindih (overlap)", () => {
    const overlappingTiers = [
      { minQty: 1, maxQty: 20, unitPrice: 50000 },
      { minQty: 15, maxQty: 50, unitPrice: 45000 }, // Overlap dengan 1..20
    ];
    const check = validatePriceTiers(overlappingTiers);
    expect(check.isValid).toBe(false);
    expect(check.error).toContain("Rentang tumpang tindih");
  });

  it("harus menolak duplikasi minQty", () => {
    const duplicateMinTiers = [
      { minQty: 1, maxQty: 10, unitPrice: 50000 },
      { minQty: 1, maxQty: 20, unitPrice: 45000 },
    ];
    const check = validatePriceTiers(duplicateMinTiers);
    expect(check.isValid).toBe(false);
    expect(check.error).toContain("Terdapat duplikasi Min Qty");
  });

  it("harus menolak tier baru jika tier sebelumnya sudah open-ended (maxQty null)", () => {
    const brokenTiers = [
      { minQty: 1, maxQty: null, unitPrice: 50000 },
      { minQty: 10, maxQty: 20, unitPrice: 40000 }, // Ilegal karena tier 1 sudah tak terbatas
    ];
    const check = validatePriceTiers(brokenTiers);
    expect(check.isValid).toBe(false);
    expect(check.error).toContain("tanpa batas atas (maxQty) harus berada di posisi tier terakhir");
  });
});

describe("Fase 3 — Zod Strict Schemas & Input Boundary Tests", () => {
  it("harus menolak payload produk yang menyuntikkan properti asing via Zod strict", () => {
    const maliciousPayload = {
      categoryId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      name: "Banner Uji Coba",
      pricingType: "AREA",
      unitLabel: "m²",
      basePrice: 25000,
      adminOverridePrivilege: true, // Field asing ilegal
      isHacked: "yes",
    };

    const res = createProductSchema.safeParse(maliciousPayload);
    expect(res.success).toBe(false);
  });

  it("harus menolak imageUrl produk yang bukan dari CDN Vercel Blob", () => {
    const invalidUrlPayload = {
      categoryId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      name: "Banner Uji Coba",
      imageUrl: "https://evil-site.com/malware.png",
      pricingType: "AREA",
      unitLabel: "m²",
      basePrice: 25000,
    };

    const res = createProductSchema.safeParse(invalidUrlPayload);
    expect(res.success).toBe(false);
  });

  it("harus menerima imageUrl produk yang berasal dari CDN resmi Vercel Blob", () => {
    const validUrlPayload = {
      categoryId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      name: "Banner Uji Coba",
      imageUrl: "https://store-123.public.blob.vercel-storage.com/products/sample.webp",
      pricingType: "AREA",
      unitLabel: "m²",
      basePrice: 25000,
    };

    const res = createProductSchema.safeParse(validUrlPayload);
    expect(res.success).toBe(true);
  });

  it("harus memvalidasi batas diskon kasir pada pengaturan toko antara 0% s.d. 100%", () => {
    // Valid 15%
    const validSettings = updateStoreSettingsSchema.safeParse({
      storeName: "Ksatria Graphx",
      invoicePrefix: "KGX",
      defaultPaperWidth: "MM_58",
      maxCashierDiscountPercent: 15,
    });
    expect(validSettings.success).toBe(true);

    // Invalid -5%
    const negativeDiscount = updateStoreSettingsSchema.safeParse({
      storeName: "Ksatria Graphx",
      invoicePrefix: "KGX",
      defaultPaperWidth: "MM_58",
      maxCashierDiscountPercent: -5,
    });
    expect(negativeDiscount.success).toBe(false);

    // Invalid 150%
    const overDiscount = updateStoreSettingsSchema.safeParse({
      storeName: "Ksatria Graphx",
      invoicePrefix: "KGX",
      defaultPaperWidth: "MM_58",
      maxCashierDiscountPercent: 150,
    });
    expect(overDiscount.success).toBe(false);
  });

  it("harus menolak prefix nota yang tidak sesuai aturan 2-6 alfanumerik kapital", () => {
    // Valid
    expect(
      updateStoreSettingsSchema.safeParse({
        storeName: "Ksatria Graphx",
        invoicePrefix: "KGX",
        defaultPaperWidth: "MM_58",
        maxCashierDiscountPercent: 10,
      }).success
    ).toBe(true);

    // Invalid: terlalu pendek (1 karakter)
    expect(
      updateStoreSettingsSchema.safeParse({
        storeName: "Ksatria Graphx",
        invoicePrefix: "K",
        defaultPaperWidth: "MM_58",
        maxCashierDiscountPercent: 10,
      }).success
    ).toBe(false);

    // Invalid: huruf kecil atau karakter aneh
    expect(
      updateStoreSettingsSchema.safeParse({
        storeName: "Ksatria Graphx",
        invoicePrefix: "kgx#",
        defaultPaperWidth: "MM_58",
        maxCashierDiscountPercent: 10,
      }).success
    ).toBe(false);
  });

  it("harus memvalidasi schema kategori dan finishing dengan Zod strict", () => {
    const validCategory = createCategorySchema.safeParse({
      name: "Stiker Vinyl",
      slug: "stiker-vinyl",
      sortOrder: 1,
      isActive: true,
    });
    expect(validCategory.success).toBe(true);

    // Field ilegal
    const illegalCategory = createCategorySchema.safeParse({
      name: "Stiker",
      unknownField: 123,
    });
    expect(illegalCategory.success).toBe(false);

    const validFinishing = createFinishingSchema.safeParse({
      name: "Laminasi Panas Glossy",
      chargeType: "PER_AREA",
      defaultPrice: 15000,
      unitLabel: "m²",
      isActive: true,
    });
    expect(validFinishing.success).toBe(true);

    // Invalid chargeType
    const invalidFinishing = createFinishingSchema.safeParse({
      name: "Laminasi",
      chargeType: "INVALID_CHARGE_TYPE",
      defaultPrice: 15000,
      unitLabel: "m²",
    });
    expect(invalidFinishing.success).toBe(false);
  });
});
