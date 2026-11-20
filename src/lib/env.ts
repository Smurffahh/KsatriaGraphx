import "server-only";
import { z } from "zod";

const serverEnvSchema = z
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
