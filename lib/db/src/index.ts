import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const dbUrl = process.env.SUPABASE_POOLER_DATABASE_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("SUPABASE_POOLER_DATABASE_URL or DATABASE_URL must be set");
}

// Supabase transaction pooler (port 6543) does not support prepared statements.
export const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
