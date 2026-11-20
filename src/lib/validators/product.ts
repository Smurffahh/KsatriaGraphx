import { z } from "zod";

/**
 * Memvalidasi apakah URL mengarah ke domain resmi Vercel Blob publik.
 */
export function isValidVercelBlobUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "https:") {
      return false;
    }
    return (
      parsed.hostname.endsWith(".public.blob.vercel-storage.com") ||
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

export const priceTierSchema = z
  .object({
    id: z.string().uuid().optional(),
    minQty: z.number().int("Min Qty harus bilangan bulat").min(1, "Min Qty minimal 1"),
    maxQty: z.number().int("Max Qty harus bilangan bulat").min(1, "Max Qty minimal 1").nullable().optional(),
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

const safeImageUrlSchema = z
  .string()
  .trim()
  .refine(
    (url) => !url || isValidVercelBlobUrl(url),
    "URL foto produk harus berasal dari CDN resmi Vercel Blob (*.public.blob.vercel-storage.com)"
  )
  .optional()
  .nullable();

export const createProductSchema = z
  .object({
    categoryId: z.string().uuid("ID Kategori harus berupa UUID yang valid"),
    name: z.string().trim().min(1, "Nama produk wajib diisi").max(150, "Maksimal 150 karakter"),
    sku: z.string().trim().max(50).optional().nullable(),
    description: z.string().trim().max(1000).optional().nullable(),
    imageUrl: safeImageUrlSchema,
    imageKey: z.string().trim().max(255).optional().nullable(),
    pricingType: pricingTypeEnum,
    unitLabel: z.string().trim().min(1, "Label satuan wajib diisi (misal: m², pcs, lembar)").max(30),
    basePrice: z.number().int("Harga dasar harus bilangan bulat").min(0, "Harga dasar minimal 0"),
    minArea: z.number().min(0.01, "Minimal luas harus lebih dari 0").default(1.0),
    areaRounding: areaRoundingEnum.default("EXACT"),
    isActive: z.boolean().default(true),
    tiers: z.array(priceTierSchema).optional(),
  })
  .strict();

export const updateProductSchema = z
  .object({
    categoryId: z.string().uuid("ID Kategori harus berupa UUID yang valid").optional(),
    name: z.string().trim().min(1, "Nama produk wajib diisi").max(150, "Maksimal 150 karakter").optional(),
    sku: z.string().trim().max(50).optional().nullable(),
    description: z.string().trim().max(1000).optional().nullable(),
    imageUrl: safeImageUrlSchema,
    imageKey: z.string().trim().max(255).optional().nullable(),
    pricingType: pricingTypeEnum.optional(),
    unitLabel: z.string().trim().min(1, "Label satuan wajib diisi").max(30).optional(),
    basePrice: z.number().int("Harga dasar harus bilangan bulat").min(0, "Harga dasar minimal 0").optional(),
    minArea: z.number().min(0.01, "Minimal luas harus lebih dari 0").optional(),
    areaRounding: areaRoundingEnum.optional(),
    isActive: z.boolean().optional(),
    tiers: z.array(priceTierSchema).optional(),
  })
  .strict();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
