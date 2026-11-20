import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder";

const client = neon(connectionString);

export const db = drizzle({ client, schema });

export type Database = typeof db;
