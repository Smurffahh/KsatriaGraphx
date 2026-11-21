import { z } from "zod";

/**
 * Menormalisasi nomor telepon Indonesia ke format baku 628...
 * Menghapus spasi, strip, tanda kurung, dan awalan 0 / +62.
 */
export function normalizeIndonesianPhone(phone: unknown): string | null {
  if (typeof phone !== "string") return null;

  let cleaned = phone.replace(/[^0-9+]/g, "").trim();
  if (!cleaned) return null;

  if (cleaned.startsWith("+62")) {
    cleaned = cleaned.slice(1);
  } else if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("8")) {
    cleaned = "62" + cleaned;
  }

  const phoneRegex = /^628[0-9]{7,13}$/;
  if (!phoneRegex.test(cleaned)) {
    return null;
  }

  return cleaned;
}

export const createCustomerSchema = z
  .object({
    id: z.string().uuid().optional().nullable(),
    name: z
      .string({ error: "Nama pelanggan wajib diisi" })
      .trim()
      .min(2, "Nama pelanggan minimal 2 karakter")
      .max(100, "Nama pelanggan maksimal 100 karakter"),
    phone: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : null))
      .refine(
        (val) => {
          if (!val) return true;
          return normalizeIndonesianPhone(val) !== null;
        },
        {
          message:
            "Format nomor WhatsApp tidak valid. Gunakan format Indonesia yang benar (contoh: 08123456789)",
        }
      )
      .transform((val) => (val ? normalizeIndonesianPhone(val) : null)),
    address: z
      .string()
      .trim()
      .max(300, "Alamat maksimal 300 karakter")
      .optional()
      .nullable()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
    notes: z
      .string()
      .trim()
      .max(500, "Catatan maksimal 500 karakter")
      .optional()
      .nullable()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  })
  .strict();

export const updateCustomerSchema = createCustomerSchema.partial().strict();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
