# ADR 0004 — node-postgres through Supabase's transaction pooler

**Status:** accepted · 2026-09-14 (replaces postgres.js)

## In plain words

On Vercel, the app talks to Supabase through its connection pooler. Supabase has two: a **session pooler**
(port 5432) that allows only 15 clients on this plan, and a **transaction pooler** (port 6543) that allows
many. Serverless functions start many small copies of the app, so only the transaction pooler has room.
The first driver, postgres.js, freezes on the transaction pooler; node-postgres doesn't. So the app uses
node-postgres and connects on port 6543.

## Evidence (measured against the live project, eu-central-1, 2026-09-14)

| Driver and pooler | Result |
|---|---|
| postgres.js, transaction pooler, one query at a time | works |
| postgres.js, transaction pooler, 12 queries on one connection | **hangs** (server waits in `ClientRead`) — also with `max_pipeline: 1` and with `fetch_types: false` |
| postgres.js, session pooler, 60 concurrent queries | works (825 ms) |
| Live site on the session pooler, pool 3 per instance | **`EMAXCONNSESSION` max clients reached (pool_size 15)** on checkout and staff pages within minutes of the browser suite |
| node-postgres, transaction pooler, 12 queries on one connection / 60 on three | works (1.3 s / 1.8 s), `BEGIN … COMMIT` works |

The first Vercel build hung on the kashrut page for this reason, and the second deploy failed the live browser suite
for the second.

## Decisions

- `src/infra/db/client.ts` uses `drizzle-orm/node-postgres` with a `pg` `Pool`. Infra code types the database as
  `NodePgDatabase<typeof schema>`; the integration tests and seed script use the same driver, so the tests run
  on what production runs.
- Production `DATABASE_URL` is the transaction pooler (port 6543). No named prepared statements are used
  (the pooler can't keep them across transactions).
- Pool size per process: `DB_POOL_MAX`, else 3 on Vercel and 10 elsewhere. Idle connections close after 5 s on
  Vercel (30 s locally). An idle-connection error is logged and does not crash the process.
- postgres.js stays only in the end-to-end test helper and migrator script, which talk to local Postgres.
