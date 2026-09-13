# Constraints — the quality bar as a contract

These are gates, not goals. Lowering one requires an explicit, dated entry in the changelog at the
bottom with the reason. Silencing a check (`@ts-ignore`, `eslint-disable`, `.skip`, deleted
assertions) to get to green is a violation, not a fix.

## Correctness

| Gate | Threshold |
|---|---|
| TypeScript | `strict`, zero errors, no `@ts-ignore` / `@ts-expect-error` without a linked reason |
| Lint | zero errors |
| Unit tests | all pass; `src/domain/**` line coverage ≥ 95% |
| Money invariant | property test ≥ 10,000 runs: for any weight within tolerance, capture ≤ hold |
| State machine | every (state × event) pair is a transition or an explicit rejection with he + en reason |
| Integration | slot capacity race (20 concurrent / capacity 3 → exactly 3) passes |
| E2E | all journeys pass in `he-desktop`, `he-mobile`, `he-tablet-pack`, `en-desktop` |
| RTL gate | every screen: `dir=rtl`, no horizontal overflow, correct arrow direction |

## Interface

| Gate | Threshold |
|---|---|
| Disabled controls | 100% carry a visible reason (enforced in the `Button` primitive's tests) |
| Touch targets | ≥ 44 px storefront, ≥ 64 px staff tablet screens, ≥ 88 px weighing keypad |
| Progress | any action that can exceed 500 ms shows progress; long operations cancel with Esc |
| Accessibility | checkout and weighing flows fully keyboard-operable with labelled controls |

## Performance (measured on seeded data, warm, local production build)

| Gate | Threshold |
|---|---|
| Category and product page server response | < 500 ms |
| Largest Contentful Paint, home on mobile profile | < 2.5 s |

## Security

| Gate | Threshold |
|---|---|
| Card data | zero PAN/CVV fields in our DOM, logs, or database |
| Payment callbacks | never trusted directly; state changes only after server-side re-fetch |
| Secrets | only in `.env*.local` (git-ignored); none committed |
| Staff mutations | 100% written to `audit_event` |

## Changelog

- 2026-09-13 — initial bar set with the approved plan. TypeScript stays on 5.x (scaffold default),
  which retires the TypeScript 7 lint-compatibility risk.
