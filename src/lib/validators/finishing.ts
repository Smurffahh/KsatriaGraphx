import { z } from "zod";

export const finishingChargeTypeEnum = z.enum(["FLAT", "PER_QTY", "PER_AREA"], {
  error: "Tipe biaya finishing harus berupa FLAT, PER_QTY, atau PER_AREA",
});

const normalizedProductionPriceSchema = z
  .union([z.number(), z.string(), z.undefined()])
  .transform((v) => {
    if (v === "" || v === undefined) return 0;
    return typeof v === "number" ? v : Number(v);
  })
  .pipe(
    z
      .number({ error: "Harga produksi finishing harus berupa angka" })
      .int("Harga produksi harus bilangan bulat")
      .min(0, "Harga produksi minimal 0")
  );

export const createFinishingSchema = z
  .object({
    id: z.string().uuid().optional().nullable(),
    name: z.string().trim().min(1, "Nama finishing wajib diisi").max(100, "Maksimal 100 karakter"),
    chargeType: finishingChargeTypeEnum,
    productionPrice: normalizedProductionPriceSchema.default(0),
    defaultPrice: z.coerce.number().int("Harga harus bilangan bulat").min(0, "Harga minimal 0"),
    unitLabel: z.string().trim().min(1, "Label satuan wajib diisi").max(50),
    isActive: z.boolean().default(true),
  })
  .strict();

export const updateFinishingSchema = z
  .object({
    id: z.string().uuid().optional().nullable(),
    name: z.string().trim().min(1, "Nama finishing wajib diisi").max(100, "Maksimal 100 karakter").optional(),
    chargeType: finishingChargeTypeEnum.optional(),
    productionPrice: normalizedProductionPriceSchema.optional(),
    defaultPrice: z.coerce.number().int("Harga harus bilangan bulat").min(0, "Harga minimal 0").optional(),
    unitLabel: z.string().trim().min(1, "Label satuan wajib diisi").max(50).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type CreateFinishingInput = z.infer<typeof createFinishingSchema>;
export type UpdateFinishingInput = z.infer<typeof updateFinishingSchema>;
