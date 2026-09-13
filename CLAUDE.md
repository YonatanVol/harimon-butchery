@AGENTS.md

# Harimon Butchery — project conventions

A Hebrew-first kosher butcher shop: customer storefront + staff back-office in one Next.js app.
**Demo/portfolio project** — fictional brand, fictional kashrut authorities, mock payment and
messaging providers active by default. The full plan lives in `docs/PLAN.md`.

## Non-negotiables

- **Money is integer agorot.** Columns end `_agorot`. Never `float`, `numeric`, `parseFloat`,
  `toFixed`. All arithmetic goes through `src/domain/money`.
- **Weight is integer grams.** Columns end `_g`. Rates are basis points (`_bp`; VAT 18% = 1800).
- **`src/domain/**` is pure.** No imports from `src/infra`, `next/*`, React, or any I/O.
- **RTL is the default layout.** Logical properties only (`ps-`/`pe-`/`ms-`/`me-`/`start`/`end`,
  `inset-inline-*`) — never `left`/`right`. Hebrew strings are primary; English mirrors them.
- **Hebrew sorting uses ICU `he-IL`** (`COLLATE "he-IL-x-icu"` in SQL, `Intl.Collator('he-IL')` in JS).
- **Card data never enters our system.** Hosted payment page only; store transaction UIDs and tokens.
- **Every disabled control states its reason in visible text.** Never a silent no-op.

## Next.js 16 notes (differs from older training data)

- Middleware is `src/proxy.ts`. `params`/`searchParams`/`cookies()`/`headers()` are async only.
- `LayoutProps<'/route'>` / `PageProps<'/route'>` are generated globals — run `npx next typegen`.
- Read `node_modules/next/dist/docs/` before using an unfamiliar API.

## Commands

- `npm run dev` — dev server on :3000 (Hebrew at `/he`, English at `/en`)
- `npm run db:setup` — create local `meatstore_dev` / `meatstore_test` (Homebrew Postgres 17)
- `npm test` — unit tests (Vitest) · `npm run typecheck` · `npm run lint`

Postgres binaries are keg-only: `export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"`.

## Workflow

Work on `feat/phase-N` branches, never directly on `main`. A phase is done only when exercised on
the running app in a browser, not just when tests pass.
