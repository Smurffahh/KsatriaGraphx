import dotenv from "dotenv";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

export type Database = NeonHttpDatabase<typeof schema>;

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

  const client = neon(connectionString);
  cachedDb = drizzle({ client, schema });
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
