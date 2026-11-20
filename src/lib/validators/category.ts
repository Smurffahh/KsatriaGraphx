import { z } from "zod";

export const createCategorySchema = z
  .object({
    name: z.string().trim().min(1, "Nama kategori wajib diisi").max(100, "Maksimal 100 karakter"),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/, "Slug hanya boleh berisi huruf kecil, angka, dan strip (-)")
      .optional(),
    sortOrder: z.number().int().default(0),
    isActive: z.boolean().default(true),
  })
  .strict();

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1, "Nama kategori wajib diisi").max(100, "Maksimal 100 karakter").optional(),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/, "Slug hanya boleh berisi huruf kecil, angka, dan strip (-)")
      .optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
