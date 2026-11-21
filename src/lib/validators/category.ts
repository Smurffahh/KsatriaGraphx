import { z } from "zod";

const safeSlugSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => {
    if (!v || typeof v !== "string" || v.trim().length === 0) return undefined;
    return v
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/(^-|-$)/g, "");
  })
  .refine((v) => !v || /^[a-z0-9-]+$/.test(v), {
    message: "Slug hanya boleh berisi huruf kecil, angka, dan strip (-)",
  });

export const createCategorySchema = z
  .object({
    id: z.string().uuid().optional().nullable(),
    name: z.string().trim().min(1, "Nama kategori wajib diisi").max(100, "Maksimal 100 karakter"),
    slug: safeSlugSchema,
    sortOrder: z.coerce.number().int().default(0),
    isActive: z.boolean().default(true),
  })
  .strict();

export const updateCategorySchema = z
  .object({
    id: z.string().uuid().optional().nullable(),
    name: z.string().trim().min(1, "Nama kategori wajib diisi").max(100, "Maksimal 100 karakter").optional(),
    slug: safeSlugSchema,
    sortOrder: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
