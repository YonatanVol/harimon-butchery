import { existsSync } from "node:fs";

/** The end-to-end database: DATABASE_URL_E2E, or the dev URL with its database renamed to meatstore_e2e. */
export function e2eDatabaseUrl() {
  if (!process.env.DATABASE_URL && existsSync(".env.local")) process.loadEnvFile(".env.local");
  if (process.env.DATABASE_URL_E2E) return process.env.DATABASE_URL_E2E;
  const dev = process.env.DATABASE_URL;
  if (!dev) throw new Error("DATABASE_URL is not set");
  const u = new URL(dev);
  u.pathname = "/meatstore_e2e";
  return u.toString();
}

export const E2E_PORT = 3200;
