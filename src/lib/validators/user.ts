import { z } from "zod";

export const createUserSchema = z
  .object({
    name: z.string().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
    username: z
      .string()
      .min(3, "Username minimal 3 karakter")
      .max(50, "Username maksimal 50 karakter")
      .regex(/^[a-zA-Z0-9_]+$/, "Username hanya boleh berisi huruf, angka, dan garis bawah (_)"),
    email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .max(100, "Password maksimal 100 karakter")
      .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Password wajib mengandung kombinasi huruf dan angka"),
    role: z.enum(["OWNER", "KASIR"], {
      error: "Role harus berupa OWNER atau KASIR",
    }),
  })
  .strict();

export const updateUserSchema = z
  .object({
    name: z.string().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter").optional(),
    username: z
      .string()
      .min(3, "Username minimal 3 karakter")
      .max(50, "Username maksimal 50 karakter")
      .regex(/^[a-zA-Z0-9_]+$/, "Username hanya boleh berisi huruf, angka, dan garis bawah (_)")
      .optional(),
    email: z.string().email("Format email tidak valid").optional().or(z.literal("")).nullable(),
    role: z
      .enum(["OWNER", "KASIR"], {
        error: "Role harus berupa OWNER atau KASIR",
      })
      .optional(),
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
