import { z } from "zod";

const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/;

/**
 * Menormalisasi nomor WhatsApp Indonesia menjadi digit baku internasional `62...` (10–16 digit total).
 */
export function normalizeVendorWhatsapp(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  let digits = raw.replace(/[^0-9+]/g, "").trim();
  if (!digits) return null;

  if (digits.startsWith("+62")) {
    digits = digits.slice(1);
  } else if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith("8")) {
    digits = `62${digits}`;
  }

  if (digits.includes("+")) {
    return null;
  }

  return /^62[0-9]{8,14}$/.test(digits) ? digits : null;
}

/**
 * Mengizinkan URL file desain eksternal hanya dengan protokol HTTPS tanpa karakter kontrol.
 */
export function isSafeHttpsDesignUrl(raw: string): boolean {
  if (!raw || raw.length > 500 || CONTROL_CHARS_RE.test(raw)) {
    return false;
  }
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function emptyToNullString(maxLen: number, label: string) {
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (typeof val !== "string") return null;
      const trimmed = val.trim();
      return trimmed.length > 0 ? trimmed : null;
    })
    .refine((val) => !val || val.length <= maxLen, `${label} maksimal ${maxLen} karakter`);
}

export const optionalUuidSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (typeof val !== "string") return null;
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  })
  .pipe(z.string().uuid("ID vendor harus berupa UUID valid").nullable());

export const safeDesignFileUrlSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (typeof val !== "string") return null;
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  })
  .refine(
    (val) => !val || isSafeHttpsDesignUrl(val),
    "Link file desain wajib menggunakan protokol HTTPS yang valid (maksimal 500 karakter)"
  );

export const createVendorSchema = z
  .object({
    id: z.string().uuid("ID vendor harus berupa UUID valid").optional().nullable(),
    name: z
      .string({ error: "Nama vendor wajib diisi" })
      .trim()
      .min(2, "Nama vendor minimal 2 karakter")
      .max(120, "Nama vendor maksimal 120 karakter"),
    contactName: emptyToNullString(100, "Nama PIC").optional(),
    whatsapp: z
      .string({ error: "Nomor WhatsApp vendor wajib diisi" })
      .trim()
      .min(8, "Nomor WhatsApp vendor terlalu pendek")
      .transform((val) => normalizeVendorWhatsapp(val))
      .refine(
        (val): val is string => val !== null,
        "Format nomor WhatsApp vendor tidak valid (gunakan contoh: 08123456789 atau +628123456789)"
      ),
    address: emptyToNullString(300, "Alamat").optional(),
    specialty: emptyToNullString(150, "Spesialisasi").optional(),
    leadTimeDays: z
      .union([z.number(), z.string(), z.undefined(), z.null()])
      .transform((val) => {
        if (val === "" || val === undefined || val === null) return 1;
        return typeof val === "number" ? val : Number(val);
      })
      .pipe(
        z
          .number({ error: "Estimasi pengerjaan harus berupa angka" })
          .int("Estimasi pengerjaan harus bilangan bulat")
          .min(0, "Estimasi pengerjaan minimal 0 hari")
          .max(365, "Estimasi pengerjaan maksimal 365 hari")
      )
      .default(1),
    notes: emptyToNullString(500, "Catatan").optional(),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

export const updateVendorSchema = createVendorSchema.partial().strict();

export const orderVendorAssignmentSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            orderItemId: z.string().uuid("ID item pesanan tidak valid"),
            vendorId: optionalUuidSchema,
          })
          .strict()
      )
      .optional()
      .default([]),
    designFileUrl: safeDesignFileUrlSchema.optional(),
    markSpkSent: z.boolean().optional().default(false),
  })
  .strict()
  .refine(
    (data) => data.items.length > 0 || data.designFileUrl !== undefined || data.markSpkSent,
    "Minimal sertakan penugasan item vendor, link file desain, atau tanda kirim SPK"
  );

export const vendorPaymentMethodEnum = z.enum(["CASH", "TRANSFER", "QRIS"], {
  error: "Metode pembayaran harus CASH, TRANSFER, atau QRIS",
});

export const createVendorPaymentSchema = z
  .object({
    vendorId: optionalUuidSchema.optional(),
    vendorName: emptyToNullString(120, "Nama vendor").optional(),
    amount: z
      .union([z.number(), z.string()])
      .transform((val) => (typeof val === "number" ? val : Number(val)))
      .pipe(
        z
          .number({ error: "Nominal setoran harus berupa angka" })
          .int("Nominal setoran harus bilangan bulat")
          .min(1, "Nominal setoran minimal Rp 1")
      ),
    paymentMethod: vendorPaymentMethodEnum,
    referenceNote: emptyToNullString(200, "Catatan referensi").optional(),
    paidAt: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((val) => {
        if (typeof val !== "string") return null;
        const trimmed = val.trim();
        return trimmed.length > 0 ? trimmed : null;
      })
      .refine((val) => !val || !Number.isNaN(Date.parse(val)), "Format tanggal setor tidak valid")
      .optional(),
  })
  .strict()
  .refine(
    (data) => Boolean(data.vendorId || data.vendorName),
    {
      message: "Pilih vendor atau isi nama vendor penerima setoran",
      path: ["vendorName"],
    }
  );

export const adjustVendorCostSchema = z
  .object({
    totalProductionCost: z
      .union([z.number(), z.string()])
      .transform((val) => (typeof val === "number" ? val : Number(val)))
      .pipe(
        z
          .number({ error: "Modal vendor harus berupa angka" })
          .int("Modal vendor harus bilangan bulat")
          .min(0, "Modal vendor minimal Rp 0")
      ),
    reason: z
      .string({ error: "Alasan penyesuaian wajib diisi" })
      .trim()
      .min(3, "Alasan penyesuaian minimal 3 karakter")
      .max(200, "Alasan penyesuaian maksimal 200 karakter"),
  })
  .strict();

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type OrderVendorAssignmentInput = z.infer<typeof orderVendorAssignmentSchema>;
export type CreateVendorPaymentInput = z.infer<typeof createVendorPaymentSchema>;
export type AdjustVendorCostInput = z.infer<typeof adjustVendorCostSchema>;
