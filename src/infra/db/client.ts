import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { rejectTransactionPooler, resolveIdleTimeout, resolvePoolMax } from "../runtimeEnv";
import * as schema from "./schema";

declare global {
  var __meatstoreSql: ReturnType<typeof postgres> | undefined;
}

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  rejectTransactionPooler(url);
  // Production uses Supabase's session pooler. `prepare: false` keeps statements portable across poolers.
  // Small per process: builds prerender with several workers and serverless runs many instances, all sharing
  // Postgres's connection limit. Money flows use two connections at once with the demo gateway (see ADR 0003).
  return postgres(url, { max: resolvePoolMax(), idle_timeout: resolveIdleTimeout(), prepare: false });
}

// Reuse one pool across hot reloads in development.
const sqlClient = globalThis.__meatstoreSql ?? connect();
if (process.env.NODE_ENV !== "production") globalThis.__meatstoreSql = sqlClient;

export const db = drizzle(sqlClient, { schema, casing: "snake_case" });
export type Db = typeof db;
