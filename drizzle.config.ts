import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL && existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infra/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,
  verbose: true,
});
