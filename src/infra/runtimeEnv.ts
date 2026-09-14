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
