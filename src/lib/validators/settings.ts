import { z } from "zod";

export const paperWidthSchema = z.enum(["MM_58", "MM_80"], {
  error: "Lebar kertas harus MM_58 atau MM_80",
});

export const updateStoreSettingsSchema = z
  .object({
    id: z.number().int().optional().nullable(),
    storeName: z.string().trim().min(1, "Nama toko wajib diisi").max(100),
    tagline: z
      .string()
      .trim()
      .max(200)
      .optional()
      .nullable()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
    address: z
      .string()
      .trim()
      .max(500)
      .optional()
      .nullable()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
    phone: z
      .string()
      .trim()
      .max(50)
      .optional()
      .nullable()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
    paymentInfo: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .nullable()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
    receiptFooter: z
      .string()
      .trim()
      .max(500)
      .optional()
      .nullable()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
    invoicePrefix: z
      .string()
      .trim()
      .min(2, "Prefix nota minimal 2 karakter")
      .max(6, "Prefix nota maksimal 6 karakter")
      .regex(/^[A-Z0-9]{2,6}$/, "Prefix nota harus 2-6 karakter alfanumerik kapital (contoh: KGX, INV)"),
    defaultPaperWidth: paperWidthSchema,
    maxCashierDiscountPercent: z.coerce
      .number()
      .int("Persentase diskon harus bilangan bulat")
      .min(0, "Diskon kasir minimal 0%")
      .max(100, "Diskon kasir maksimal 100%"),
  })
  .strict();

export type UpdateStoreSettingsInput = z.infer<typeof updateStoreSettingsSchema>;
