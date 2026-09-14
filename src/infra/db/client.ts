import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { resolveIdleTimeout, resolvePoolMax } from "../runtimeEnv";
import * as schema from "./schema";

declare global {
  var __meatstorePool: Pool | undefined;
}

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  // node-postgres, because production goes through Supabase's transaction pooler (port 6543): postgres.js froze
  // there whenever one connection had a second query waiting (see docs/adr/0004-database-driver.md).
  // Small per process: builds prerender with several workers and serverless runs many instances, all sharing
  // the pooler's client limit. Money flows use two connections at once with the demo gateway (see ADR 0003).
  const pool = new Pool({ connectionString: url, max: resolvePoolMax(), idleTimeoutMillis: resolveIdleTimeout() * 1000 });
  // An idle connection the pooler drops must not crash the process; the next query opens a fresh one.
  pool.on("error", (e) => console.error("database pool: idle connection error", e.message));
  return pool;
}

// Reuse one pool across hot reloads in development.
const pool = globalThis.__meatstorePool ?? connect();
if (process.env.NODE_ENV !== "production") globalThis.__meatstorePool = pool;

export const db = drizzle(pool, { schema, casing: "snake_case" });
export type Db = typeof db;
