import { z } from "zod";
import { optionalUuidSchema } from "./vendor";

/**
 * Memvalidasi apakah URL mengarah ke domain resmi Vercel Blob (public/private) atau endpoint proxy lokal.
 */
export function isValidVercelBlobUrl(urlString: string): boolean {
  if (!urlString) return false;
  if (urlString.startsWith("/api/uploads/product-image")) {
    return true;
  }
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "https:") {
      return false;
    }
    return (
      parsed.hostname.endsWith(".public.blob.vercel-storage.com") ||
      parsed.hostname.endsWith(".private.blob.vercel-storage.com") ||
      parsed.hostname === "blob.vercel-storage.com"
    );
  } catch {
    return false;
  }
}

export const pricingTypeEnum = z.enum(["AREA", "UNIT", "CUSTOM"], {
  error: "Tipe harga harus berupa AREA, UNIT, atau CUSTOM",
});

export const areaRoundingEnum = z.enum(["EXACT", "ROUND_UP_0_5", "ROUND_UP_1"], {
  error: "Pembulatan luas harus berupa EXACT, ROUND_UP_0_5, atau ROUND_UP_1",
});

const optionalNonNegativeIntSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === "" || v === null || v === undefined) return null;
    return typeof v === "number" ? v : Number(v);
  })
  .pipe(
    z
      .number({ error: "Harga produksi tier harus berupa angka" })
      .int("Harga produksi tier harus bilangan bulat")
      .min(0, "Harga produksi tier minimal 0")
      .nullable()
  )
  .optional();

const normalizedNonNegativeIntSchema = z
  .union([z.number(), z.string(), z.undefined()])
  .transform((v) => {
    if (v === "" || v === undefined) return 0;
    return typeof v === "number" ? v : Number(v);
  })
  .pipe(
    z
      .number({ error: "Harga produksi harus berupa angka" })
      .int("Harga produksi harus bilangan bulat")
      .min(0, "Harga produksi minimal 0")
  );

export const priceTierSchema = z
  .object({
    id: z.string().uuid().optional(),
    minQty: z.number().int("Min Qty harus bilangan bulat").min(1, "Min Qty minimal 1"),
    maxQty: z.number().int("Max Qty harus bilangan bulat").min(1, "Max Qty minimal 1").nullable().optional(),
    productionPrice: optionalNonNegativeIntSchema,
    unitPrice: z.number().int("Harga satuan tier harus bilangan bulat").min(0, "Harga satuan tier minimal 0"),
  })
  .strict();

export type PriceTierInput = z.infer<typeof priceTierSchema>;

/**
 * Validasi anti-overlap rentang harga grosir (price tiers).
 * Memastikan tidak ada rentang yang saling tumpang tindih dan minQty <= maxQty.
 */
export function validatePriceTiers(tiers: PriceTierInput[]): { isValid: boolean; error?: string } {
  if (!tiers || tiers.length === 0) {
    return { isValid: true };
  }

  // 1. Validasi setiap baris individual
  for (const tier of tiers) {
    if (tier.maxQty !== null && tier.maxQty !== undefined) {
      if (tier.minQty > tier.maxQty) {
        return {
          isValid: false,
          error: `Rentang tidak valid: Min Qty (${tier.minQty}) tidak boleh lebih besar dari Max Qty (${tier.maxQty})`,
        };
      }
    }
  }

  // 2. Urutkan berdasarkan minQty
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);

  // 3. Periksa overlap rentang
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];

    // Cek duplikasi minQty
    if (i > 0 && current.minQty === sorted[i - 1].minQty) {
      return {
        isValid: false,
        error: `Terdapat duplikasi Min Qty (${current.minQty}) pada tingkat harga grosir`,
      };
    }

    if (i > 0) {
      const prev = sorted[i - 1];
      // Jika baris sebelumnya tidak memiliki batas atas (maxQty null), tidak boleh ada baris setelahnya
      if (prev.maxQty === null || prev.maxQty === undefined) {
        return {
          isValid: false,
          error: `Tingkat harga dengan Min Qty ${prev.minQty} tanpa batas atas (maxQty) harus berada di posisi tier terakhir`,
        };
      }

      // Cek apakah minQty saat ini tumpang tindih dengan maxQty sebelumnya
      if (current.minQty <= prev.maxQty) {
        return {
          isValid: false,
          error: `Rentang tumpang tindih (overlap): Tier ${current.minQty} masuk dalam rentang tier sebelumnya (${prev.minQty} - ${prev.maxQty})`,
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Format ringkas dan ramah manusia dari ZodError untuk diteruskan ke toast / alert UI.
 */
export function formatZodError(error: z.ZodError): string {
  const flat = error.flatten();
  if (flat.formErrors && flat.formErrors.length > 0) {
    return flat.formErrors[0];
  }
  const fieldErrors = flat.fieldErrors as Record<string, string[] | undefined>;
  const fieldKeys = Object.keys(fieldErrors);
  if (fieldKeys.length > 0) {
    const firstField = fieldKeys[0];
    const messages = fieldErrors[firstField];
    if (messages && messages.length > 0 && messages[0]) {
      return messages[0];
    }
  }
  return "Format data tidak valid";
}

export const safeImageUrlSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : null))
  .refine(
    (url) => !url || isValidVercelBlobUrl(url),
    "URL foto produk harus berasal dari CDN resmi Vercel Blob (*.public.blob.vercel-storage.com atau proxy lokal)"
  );

export const createProductSchema = z
  .object({
    id: z.string().uuid("ID produk harus berupa UUID valid").optional().nullable(),
    categoryId: z.string().uuid("ID Kategori harus berupa UUID yang valid"),
    defaultVendorId: optionalUuidSchema.optional(),
    name: z.string().trim().min(1, "Nama produk wajib diisi").max(150, "Maksimal 150 karakter"),
    sku: z
      .string()
      .trim()
      .max(50, "SKU maksimal 50 karakter")
      .optional()
      .nullable()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
    description: z
      .string()
      .trim()
      .max(1000, "Deskripsi maksimal 1000 karakter")
      .optional()
      .nullable()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
    imageUrl: safeImageUrlSchema,
    imageKey: z
      .string()
      .trim()
      .max(255)
      .optional()
      .nullable()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
    pricingType: pricingTypeEnum,
    unitLabel: z.string().trim().min(1, "Label satuan wajib diisi (misal: m², pcs, lembar)").max(30),
    productionPrice: normalizedNonNegativeIntSchema.default(0),
    basePrice: z.coerce.number().int("Harga dasar harus bilangan bulat").min(0, "Harga dasar minimal 0"),
    minArea: z.coerce.number().min(0.01, "Minimal luas harus lebih dari 0").default(1.0),
    areaRounding: areaRoundingEnum.default("EXACT"),
    isActive: z.boolean().default(true),
    tiers: z.array(priceTierSchema).optional().default([]),
  })
  .strict();

export const updateProductSchema = z
  .object({
    id: z.string().uuid("ID produk harus berupa UUID valid").optional().nullable(),
    categoryId: z.string().uuid("ID Kategori harus berupa UUID yang valid").optional(),
    defaultVendorId: optionalUuidSchema.optional(),
    name: z.string().trim().min(1, "Nama produk wajib diisi").max(150, "Maksimal 150 karakter").optional(),
    sku: z
      .string()
      .trim()
      .max(50, "SKU maksimal 50 karakter")
      .optional()
      .nullable()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
    description: z
      .string()
      .trim()
      .max(1000, "Deskripsi maksimal 1000 karakter")
      .optional()
      .nullable()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
    imageUrl: safeImageUrlSchema,
    imageKey: z
      .string()
      .trim()
      .max(255)
      .optional()
      .nullable()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
    pricingType: pricingTypeEnum.optional(),
    unitLabel: z.string().trim().min(1, "Label satuan wajib diisi").max(30).optional(),
    productionPrice: normalizedNonNegativeIntSchema.optional(),
    basePrice: z.coerce.number().int("Harga dasar harus bilangan bulat").min(0, "Harga dasar minimal 0").optional(),
    minArea: z.coerce.number().min(0.01, "Minimal luas harus lebih dari 0").optional(),
    areaRounding: areaRoundingEnum.optional(),
    isActive: z.boolean().optional(),
    tiers: z.array(priceTierSchema).optional(),
  })
  .strict();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
