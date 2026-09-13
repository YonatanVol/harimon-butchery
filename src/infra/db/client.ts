import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __meatstoreSql: ReturnType<typeof postgres> | undefined;
}

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  // `prepare: false` keeps us compatible with Supabase's transaction pooler in production.
  return postgres(url, { max: 10, prepare: false });
}

// Reuse one pool across hot reloads in development.
const sqlClient = globalThis.__meatstoreSql ?? connect();
if (process.env.NODE_ENV !== "production") globalThis.__meatstoreSql = sqlClient;

export const db = drizzle(sqlClient, { schema, casing: "snake_case" });
export type Db = typeof db;
