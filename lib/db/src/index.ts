import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Supabase transaction pooler (port 6543) does not support prepared statements.
// Setting max to a low number avoids exhausting pooler connections.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

// prepared: false is required for Supabase Supavisor transaction-mode pooler
export const db = drizzle(pool, { schema });

export * from "./schema";
