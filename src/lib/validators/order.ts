import { z } from "zod";
import { normalizeIndonesianPhone } from "./customer";

export const orderItemFinishingInputSchema = z
  .object({
    finishingId: z.string().uuid("ID finishing harus berupa UUID valid"),
    quantity: z.number().positive("Kuantitas finishing minimal lebih dari 0").default(1),
  })
  .strict();

export const orderItemInputSchema = z
  .object({
    productId: z.string().uuid("ID produk harus berupa UUID valid"),
    quantity: z.number().int("Kuantitas harus bilangan bulat").positive("Kuantitas minimal 1"),
    width: z.number().positive("Lebar harus lebih dari 0").optional().nullable(),
    height: z.number().positive("Panjang harus lebih dari 0").optional().nullable(),
    unit: z.enum(["m", "cm"]).default("m").optional(),
    overrideUnitPrice: z
      .number()
      .int("Harga override harus bilangan bulat")
      .min(0, "Harga override tidak boleh negatif")
      .optional()
      .nullable(),
    itemNotes: z
      .string()
      .trim()
      .max(500, "Catatan item maksimal 500 karakter")
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
    finishings: z.array(orderItemFinishingInputSchema).optional().default([]),
  })
  .strict();

export const initialPaymentInputSchema = z
  .object({
    amount: z.number().int("Nominal bayar harus bilangan bulat").min(0, "Nominal bayar tidak boleh negatif"),
    paymentMethod: z.enum(["CASH", "TRANSFER", "QRIS"], {
      error: "Metode pembayaran harus berupa CASH, TRANSFER, atau QRIS",
    }),
    cashReceived: z
      .number()
      .int("Uang diterima harus bilangan bulat")
      .min(0, "Uang diterima tidak boleh negatif")
      .optional()
      .nullable(),
    referenceNote: z.string().trim().max(255, "Catatan referensi maksimal 255 karakter").optional().nullable(),
  })
  .strict();

export const createOrderSchema = z
  .object({
    customerId: z.string().uuid("ID pelanggan harus berupa UUID valid").optional().nullable(),
    customerNameSnapshot: z
      .string({ error: "Nama pelanggan wajib diisi" })
      .trim()
      .min(1, "Nama pelanggan wajib diisi")
      .max(100, "Nama pelanggan maksimal 100 karakter"),
    customerPhoneSnapshot: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 ? normalizeIndonesianPhone(val) ?? val.trim() : null)),
    items: z.array(orderItemInputSchema).min(1, "Minimal pilih 1 produk untuk membuat nota"),
    designFee: z
      .number()
      .int("Biaya desain harus bilangan bulat")
      .min(0, "Biaya desain tidak boleh negatif")
      .default(0),
    discountType: z.enum(["NONE", "FIXED", "PERCENT"]).default("NONE"),
    discountValue: z
      .number()
      .int("Nilai diskon harus bilangan bulat")
      .min(0, "Nilai diskon tidak boleh negatif")
      .default(0),
    estimatedReadyAt: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : null))
      .refine(
        (val) => !val || !isNaN(Date.parse(val)),
        "Format estimasi tanggal tidak valid"
      ),
    notes: z
      .string()
      .trim()
      .max(1000, "Catatan nota maksimal 1000 karakter")
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
    initialPayment: initialPaymentInputSchema.optional().nullable(),
  })
  .strict();

export const addPaymentSchema = z
  .object({
    amount: z
      .number({ error: "Nominal pembayaran wajib diisi" })
      .int("Nominal pembayaran harus bilangan bulat")
      .positive("Nominal pembayaran harus lebih dari 0"),
    paymentMethod: z.enum(["CASH", "TRANSFER", "QRIS"], {
      error: "Metode pembayaran harus berupa CASH, TRANSFER, atau QRIS",
    }),
    cashReceived: z
      .number()
      .int("Uang diterima harus bilangan bulat")
      .min(0, "Uang diterima tidak boleh negatif")
      .optional()
      .nullable(),
    referenceNote: z.string().trim().max(255, "Catatan referensi maksimal 255 karakter").optional().nullable(),
  })
  .strict();

export const updateOrderStatusSchema = z
  .object({
    productionStatus: z.enum(["QUEUED", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED"]).optional(),
    cancelReason: z.string().trim().min(5, "Alasan pembatalan minimal 5 karakter").max(500).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type AddPaymentInput = z.infer<typeof addPaymentSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
