import { z } from "zod";

const serverEnvSchema = z
  .object({
    DATABASE_URL: z.string().url().optional(),
    JWT_ACCESS_SECRET: z.string().min(16).default("dev-fallback-access-secret-min-32-chars-long"),
    JWT_REFRESH_SECRET: z.string().min(16).default("dev-fallback-refresh-secret-min-32-chars-long"),
    APP_WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
    ALLOWED_ORIGINS: z.string().default("http://localhost:3000,https://localhost,capacitor://localhost"),
    DEFAULT_OWNER_NAME: z.string().default("Owner Ksatria Graphx"),
    DEFAULT_OWNER_USERNAME: z.string().default("owner"),
    DEFAULT_OWNER_EMAIL: z.string().email().default("owner@ksatriagraphx.com"),
    DEFAULT_OWNER_PASSWORD: z.string().min(8).default("owner123456"),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
    R2_PUBLIC_URL: z.string().url().optional(),
  })
  .strict();

export function getServerEnv() {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Environment validation failed: ${JSON.stringify(result.error.format())}`);
  }
  return result.data;
}
