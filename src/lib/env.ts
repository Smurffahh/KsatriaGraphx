import { z } from "zod";

const serverEnvSchema = z
  .object({
    DATABASE_URL: z
      .string()
      .url("DATABASE_URL harus berupa URL koneksi PostgreSQL yang valid")
      .refine(
        (url) => url.includes("sslmode=require"),
        "DATABASE_URL wajib menyertakan parameter sslmode=require demi keamanan transmisi data"
      )
      .optional(),
    DATABASE_URL_UNPOOLED: z
      .string()
      .url("DATABASE_URL_UNPOOLED harus berupa URL koneksi PostgreSQL yang valid")
      .refine(
        (url) => url.includes("sslmode=require"),
        "DATABASE_URL_UNPOOLED wajib menyertakan parameter sslmode=require demi keamanan transmisi data"
      )
      .optional(),
    BLOB_READ_WRITE_TOKEN: z.string().min(1, "BLOB_READ_WRITE_TOKEN wajib diisi untuk media storage").optional(),
    JWT_ACCESS_SECRET: z.string().min(16).default("dev-fallback-access-secret-min-32-chars-long"),
    JWT_REFRESH_SECRET: z.string().min(16).default("dev-fallback-refresh-secret-min-32-chars-long"),
    APP_WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
    ALLOWED_ORIGINS: z.string().default("http://localhost:3000,https://localhost,capacitor://localhost"),
    DEFAULT_OWNER_NAME: z.string().default("Owner Ksatria Graphx"),
    DEFAULT_OWNER_USERNAME: z.string().default("owner"),
    DEFAULT_OWNER_EMAIL: z.string().email().default("owner@ksatriagraphx.com"),
    DEFAULT_OWNER_PASSWORD: z.string().min(8).default("owner123456"),
  })
  .passthrough();

export function getServerEnv() {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Environment validation failed: ${JSON.stringify(result.error.format())}`);
  }
  return result.data;
}
