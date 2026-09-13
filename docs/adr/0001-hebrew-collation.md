# ADR 0001 — Hebrew sorting uses ICU `he-IL` collation

**Status:** accepted · 2026-09-13

## In plain words

Computers sort Hebrew by character code by default, and in Unicode the final letters (ך ם ן ף ץ)
come *before* their regular forms. So a plain sort puts a word starting with ך ahead of כתף — wrong
to any Hebrew reader. We sort with the proper Hebrew rules everywhere: in the database and in the browser.

## Evidence (run on this machine, PostgreSQL 17.11 Homebrew)

```sql
SELECT collname, collprovider FROM pg_collation WHERE collname ILIKE 'he%';
-- he_IL.UTF-8 | c
-- he_IL       | c
-- he-x-icu    | i
-- he-IL-x-icu | i
```

Same seven words, two collations:

| Collation | Result |
|---|---|
| `"he-IL-x-icu"` | אנטריקוט · כתף · ךתף · ףילה · פרגיות · צלעות · שייטל |
| `"C"` (byte order) | אנטריקוט · **ךתף · כתף** · ףילה · פרגיות · צלעות · שייטל |

`Intl.Collator('he-IL')` in Node 24 produces the ICU order (`אנטריקוט | כתף | ךתף | צלעות`), so
database and UI sorting agree.

## Decision

- Every Hebrew text column that is ever sorted is declared `COLLATE "he-IL-x-icu"`.
- Client-side sorting uses `Intl.Collator('he-IL')`.
- An integration test compares `ORDER BY name_he` against `Intl.Collator('he-IL')` on the seeded catalog.

## Still to verify

The deployed database (Supabase, Postgres 17) must expose the same collation — checked in Phase 9
before the schema is applied there. Fallback: `CREATE COLLATION he_il (provider = icu, locale = 'he-IL')`.
