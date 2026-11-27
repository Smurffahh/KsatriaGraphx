import "server-only";
import { z } from "zod";

const DEV_ACCESS_FALLBACK = "dev-fallback-access-secret-min-32-chars-long";
const DEV_REFRESH_FALLBACK = "dev-fallback-refresh-secret-min-32-chars-long";

function buildServerEnvSchema(isProduction: boolean) {
  const secretSchema = (name: string, devDefault: string) =>
    isProduction
      ? z
          .string({
            error: `${name} wajib didefinisikan pada lingkungan produksi`,
          })
          .min(32, `${name} minimal 32 karakter`)
          .refine(
            (val) => val !== DEV_ACCESS_FALLBACK && val !== DEV_REFRESH_FALLBACK,
            `${name} tidak boleh memakai nilai dev fallback di produksi`
          )
      : z
          .string()
          .min(32, `${name} minimal 32 karakter`)
          .default(devDefault);

  return z
    .object({
      DATABASE_URL: z
        .string()
        .refine(
          (url) =>
            !url ||
            (url.includes("sslmode=require") &&
              (url.startsWith("postgresql://") || url.startsWith("postgres://"))),
          "DATABASE_URL wajib menyertakan parameter sslmode=require demi keamanan transmisi data"
        )
        .optional()
        .or(z.literal("")),
      DATABASE_URL_UNPOOLED: z
        .string()
        .refine(
          (url) =>
            !url ||
            (url.includes("sslmode=require") &&
              (url.startsWith("postgresql://") || url.startsWith("postgres://"))),
          "DATABASE_URL_UNPOOLED wajib menyertakan parameter sslmode=require demi keamanan transmisi data"
        )
        .optional()
        .or(z.literal("")),
      BLOB_READ_WRITE_TOKEN: z.string().optional().or(z.literal("")),
      JWT_ACCESS_SECRET: secretSchema("JWT_ACCESS_SECRET", DEV_ACCESS_FALLBACK),
      JWT_REFRESH_SECRET: secretSchema("JWT_REFRESH_SECRET", DEV_REFRESH_FALLBACK),
      APP_WEB_ORIGIN: z
        .string()
        .url("APP_WEB_ORIGIN wajib berupa URL valid (contoh: https://ksatriagraphx.vercel.app)")
        .transform((val) => val.replace(/\/+$/, ""))
        .default("http://localhost:3000"),
      ALLOWED_ORIGINS: z
        .string()
        .default("http://localhost:3000,https://localhost,capacitor://localhost"),
      NEXT_PUBLIC_APP_URL: z.string().optional().default("http://localhost:3000"),
      NEXT_PUBLIC_API_BASE_URL: z.string().optional().default("http://localhost:3000"),
      DEFAULT_OWNER_NAME: z.string().default("Owner Ksatria Graphx"),
      DEFAULT_OWNER_USERNAME: z.string().default("owner"),
      DEFAULT_OWNER_EMAIL: z.string().email().default("owner@ksatriagraphx.com"),
      DEFAULT_OWNER_PASSWORD: z.string().min(8).optional().or(z.literal("")),
    })
    .passthrough()
    .refine(
      (data) => {
        if (data.JWT_ACCESS_SECRET && data.JWT_REFRESH_SECRET) {
          return data.JWT_ACCESS_SECRET !== data.JWT_REFRESH_SECRET;
        }
        return true;
      },
      {
        message: "JWT_ACCESS_SECRET dan JWT_REFRESH_SECRET wajib berbeda demi isolasi domain token",
        path: ["JWT_REFRESH_SECRET"],
      }
    );
}

export function getServerEnv() {
  const isProduction = process.env.NODE_ENV === "production";
  const result = buildServerEnvSchema(isProduction).safeParse(process.env);
  if (!result.success) {
    throw new Error(`Environment validation failed: ${JSON.stringify(result.error.format())}`);
  }
  return result.data;
}
