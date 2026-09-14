type Env = Record<string, string | undefined>;

/**
 * The public address of the shop, used in payment return links and customer messages.
 * APP_URL wins; on Vercel the project's production domain is used; locally, the dev server.
 */
export function resolveAppUrl(env: Env = process.env): string {
  if (env.APP_URL) return env.APP_URL.replace(/\/$/, "");
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

/**
 * Database connections per process. Serverless runs many small instances that share Supabase's connection limit,
 * so Vercel gets a small pool; a long-running server gets more.
 */
export function resolvePoolMax(env: Env = process.env): number {
  const set = Number(env.DB_POOL_MAX);
  if (Number.isInteger(set) && set > 0) return set;
  return env.VERCEL ? 3 : 10;
}

/**
 * Supabase's transaction pooler (port 6543) freezes postgres.js as soon as one connection is asked for a second
 * query while the first is still running — measured against this project, with and without pipelining. A frozen
 * page is worse than an error, so that address is refused up front with the fix in the message.
 */
export function rejectTransactionPooler(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (parsed.hostname.endsWith(".pooler.supabase.com") && parsed.port === "6543") {
    throw new Error("DATABASE_URL points at Supabase's transaction pooler (port 6543), which hangs this app's queries. Use the session pooler: the same address with port 5432.");
  }
}

/** Seconds an unused connection stays open. Serverless instances sit idle for long stretches, so they let go quickly. */
export function resolveIdleTimeout(env: Env = process.env): number | undefined {
  return env.VERCEL ? 20 : undefined;
}
