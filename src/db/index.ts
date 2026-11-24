import dotenv from "dotenv";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

export type Database = NeonDatabase<typeof schema>;

let cachedPool: Pool | null = null;
let cachedDb: Database | null = null;

export function getDb(): Database {
  if (cachedDb) {
    return cachedDb;
  }

  const connectionString = process.env.DATABASE_URL;

  if (
    !connectionString ||
    (!connectionString.startsWith("postgresql://") &&
      !connectionString.startsWith("postgres://"))
  ) {
    throw new Error(
      "DATABASE_URL is not set or does not start with postgresql:// or postgres://"
    );
  }

  if (
    process.env.NODE_ENV === "production" &&
    !connectionString.includes("sslmode=require")
  ) {
    throw new Error(
      "DATABASE_URL wajib menyertakan sslmode=require pada lingkungan produksi demi keamanan transmisi data"
    );
  }

  cachedPool = new Pool({ connectionString });
  cachedPool.on("error", () => {
    // Reset cache pool agar query berikutnya membuat koneksi baru saat koneksi lama idle/closed
    cachedPool = null;
    cachedDb = null;
  });
  cachedDb = drizzle({ client: cachedPool, schema });
  return cachedDb;
}

export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, instance);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
