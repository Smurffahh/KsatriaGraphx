import { z } from "zod";

export const createUserSchema = z
  .object({
    id: z.string().uuid().optional().nullable(),
    name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
    username: z
      .string()
      .trim()
      .min(3, "Username minimal 3 karakter")
      .max(50, "Username maksimal 50 karakter")
      .regex(/^[a-zA-Z0-9_]+$/, "Username hanya boleh berisi huruf, angka, dan garis bawah (_)"),
    email: z
      .string()
      .trim()
      .email("Format email tidak valid")
      .optional()
      .nullable()
      .or(z.literal(""))
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .max(100, "Password maksimal 100 karakter")
      .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Password wajib mengandung kombinasi huruf dan angka"),
    role: z
      .enum(["KASIR", "OWNER"], {
        error: "Role harus berupa KASIR",
      })
      .default("KASIR")
      .refine((val) => val === "KASIR", {
        message:
          "Sistem hanya mengizinkan satu akun Owner. Akun baru hanya dapat dibuat dengan peran Kasir.",
      }),
  })
  .strict();

export const updateUserSchema = z
  .object({
    id: z.string().uuid().optional().nullable(),
    name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter").optional(),
    username: z
      .string()
      .trim()
      .min(3, "Username minimal 3 karakter")
      .max(50, "Username maksimal 50 karakter")
      .regex(/^[a-zA-Z0-9_]+$/, "Username hanya boleh berisi huruf, angka, dan garis bawah (_)")
      .optional(),
    email: z
      .string()
      .trim()
      .email("Format email tidak valid")
      .optional()
      .nullable()
      .or(z.literal(""))
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
    role: z
      .enum(["KASIR", "OWNER"], {
        error: "Role harus berupa KASIR",
      })
      .optional()
      .refine((val) => val === undefined || val === "KASIR", {
        message:
          "Sistem hanya mengizinkan satu akun Owner. Tidak dapat mempromosikan akun menjadi Owner.",
      }),
    isActive: z.boolean().optional(),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .max(100, "Password maksimal 100 karakter")
      .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Password wajib mengandung kombinasi huruf dan angka"),
  })
  .strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
