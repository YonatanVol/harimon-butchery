/**
 * Prepares the isolated end-to-end database: creates it if missing, applies migrations, loads the demo seed.
 * Never touches the dev or test databases.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { e2eDatabaseUrl } from "../tests/e2e/support/env";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = e2eDatabaseUrl();
const name = new URL(url).pathname.slice(1);
if (!/_e2e$/.test(name)) throw new Error(`Refusing to prepare "${name}": the end-to-end database name must end in _e2e`);

const admin = postgres({ ...parse(url), database: "postgres", max: 1, onnotice: () => {} });
const exists = await admin`select 1 from pg_database where datname = ${name}`;
if (exists.length === 0) await admin.unsafe(`create database "${name}"`);
await admin.end();

const client = postgres(url, { max: 1, onnotice: () => {} });
await migrate(drizzle(client), { migrationsFolder: "drizzle" });
await client.end();

const seeded = spawnSync("npx", ["tsx", "scripts/seed.ts"], { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
if (seeded.status !== 0) process.exit(seeded.status ?? 1);

function parse(u: string) {
  const x = new URL(u);
  return { host: x.hostname, port: Number(x.port || 5432), username: decodeURIComponent(x.username), password: decodeURIComponent(x.password) || undefined };
}
