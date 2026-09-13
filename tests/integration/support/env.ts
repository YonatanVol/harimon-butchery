import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (!process.env.DATABASE_URL_TEST) throw new Error("DATABASE_URL_TEST is not set — integration tests never run against the dev database");
// Anything that reads DATABASE_URL during a test must hit the test database.
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
