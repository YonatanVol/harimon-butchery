# קצביית הרימון — Israel's best online kosher butcher

*Working title. The brand name lives in one config constant (`src/config/brand.ts`); changing it is one edit.*

## Context

You want to build the best fresh kosher meat and chicken store in Israel, as software.
`/Users/yonatanvolsky/meatStore` is empty — this is a greenfield build.

From your answers:

- **One custom web app**: customer storefront *and* staff back-office, one codebase.
- **Demo / portfolio project** — no real business behind it, but it must read as a finished
  product a stranger would pay for.
- **Both pricing models**: by weight (₪/kg, real weight measured at packing, charge corrected)
  and fixed-price packages.
- **Must-haves at launch**: Hebrew-first RTL plus English, real Israeli card payments,
  delivery slots and zones, WhatsApp/SMS order updates.

**The one conflict in those answers, resolved.** A demo cannot hold live card credentials (and I
must never type them for you). So I build a **real PayPlus integration against its sandbox** behind
a `PaymentProvider` interface, plus a **mock provider** that drives every success and failure path
with no credentials. Same pattern for WhatsApp/SMS, which in Israel requires a verified business:
real provider implemented, mock active, and every message that *would* have been sent is visible
in a message timeline. The UI always says which mode it is in — nothing is faked silently.

---

## What you need to do

1. **Free some disk space before Phase 0.** Your Mac has ~20 GB free (96% full). Postgres,
   `node_modules` and browser test traces will use a few GB; below ~10 GB things get flaky.
2. **Nothing else until Phase 7.** Then, optionally, create a free PayPlus sandbox account and put
   its keys in `.env.local` yourself. If you skip it, the mock provider carries the demo fully and
   the report says so.
3. **Two approvals I will ask for in chat when we get there**: downloading the product photo set
   (Phase 2), and publishing the live demo to Vercel + Supabase (Phase 9). Supabase confirmed a new
   project costs **$0/month** on your org.

---

## What "best in the world" means here

Four things Israeli meat sites get wrong. Fixing them *is* the product.

**1. Weight is handled honestly.** Customer orders "2.5 ק״ג אנטריקוט" and sees, before paying:
*"נשקול בפועל ונחייב לפי המשקל האמיתי. נקפיא ₪465 (עד +10%) ונחייב את הסכום הסופי."*
After packing they see estimate → actual per line and the corrected charge. The money flow
matches the promise exactly (next section).

**2. Trust is on the product card, not in a footer.** Kashrut authority, חלק/regular, שחיטה,
מנוקר, salted status, Passover status, certificate validity (and if it lapsed, it says so),
origin, aging days, and handling notes such as "כבד טעון צלייה".

**3. It is ordered the way Israelis buy meat.** By occasion (שבת, מנגל, חג, בישול ארוך) as well as
by cut; thickness, grind and slicing as real options; a delivery sentence on the home page that
knows the halachic week ("ערב שבת — סגירה מוקדמת ב-13:00"); no Shabbat or chag delivery, computed
from real candle-lighting times.

**4. The butcher's side is designed, not bolted on.** The weighing and packing screen — a tablet,
in a cold room, wet gloved hands — is the signature screen of this build.

---

## How the money works

**In plain words:** the card is never charged the estimate. It is *held* for a little more than the
estimate (estimate + tolerance, rounded up to the shekel). After the butcher weighs the meat, we
charge the real amount, which is always at or below the hold, and the rest is released.

**Verified:** PayPlus supports exactly this — a hosted payment page with `charge_method: 2`
(J5 approval/hold), then `Transactions/ChargeByTransactionUID`, whose docs state the charge must be
"not more than the original J5 transaction". Sandbox base: `restapidev.payplus.co.il/api/v1.0/`.
Card data never touches our system — hosted page only; we store a transaction UID and a token.

**When the butcher cuts more than the hold allows**, there are three honest outcomes and nothing else:
1. **Trim to the ceiling** — *default*. No surprise second charge.
2. **Ask the customer** — WhatsApp/tracking page offers אשר תוספת ₪X · התאם ל-2.75 ק״ג · בטל פריט.
   Approval creates a second, clearly disclosed charge on the saved token.
3. **Give it free** — manager PIN, recorded in the audit log with the shekel value.

The app never captures more than it held and never silently widens the tolerance. The database
enforces it: `CHECK (captured_agorot <= authorization_ceiling_agorot)`.

### Order state machine

```
DRAFT → PLACED → AUTH_PENDING → AUTHORIZED → PICKING → WEIGHED → REPRICED
      → CAPTURE_PENDING → CAPTURED → PACKED → OUT_FOR_DELIVERY → DELIVERED → CLOSED

Failure branches (each has a guard, an effect, and a Hebrew message to the customer):
AUTH_PENDING  → AUTH_DECLINED (cart kept intact, plain reason) | AUTH_EXPIRED
PICKING       → line SHORT / SUBSTITUTED | AWAITING_CUSTOMER_APPROVAL (over tolerance)
CAPTURE_PENDING → CAPTURE_FAILED → retry (≤3, idempotent) | re-auth on token
                                 | manager force-dispatch (typed reason, flagged everywhere) | cancel
AUTHORIZED    → AUTH_EXPIRED before capture → dispatch blocked, re-auth required
OUT_FOR_DELIVERY → DELIVERY_FAILED_NOT_HOME → RESCHEDULED (blocked past cold-chain limit)
                                            | RETURNED_TO_SHOP → REFUND_PENDING → (PARTIALLY_)REFUNDED
Before PICKING → CANCELLED_BY_CUSTOMER | any pre-capture → CANCELLED_BY_SHOP (void hold)
```

Implemented as a **pure reducer** (`src/domain/order/machine.ts`) plus a DB executor. Every
(state × event) pair is either a defined transition or an explicit rejection with a Hebrew and English
reason — tested exhaustively, so no silent no-op can exist.

---

## Stack

All versions checked against npm today; machine checked directly.

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16.3** App Router, React 19, TypeScript | Static catalog pages + server actions; one deploy |
| Styling | **Tailwind 4.3**, logical properties only | RTL is the default layout; English mirrors for free |
| i18n | **next-intl 4.14**, `/he` default, `/en` | Locale routing, ICU messages |
| Database | **PostgreSQL 17** — Homebrew locally, **Supabase** deployed | Same major version both places; no Docker on this Mac |
| ORM | **Drizzle 0.45** | Plain SQL migrations with ICU collations, `CHECK`s, `FOR UPDATE`. Prisma's CLI `latest` is currently an RC out of step with its client |
| Auth | **better-auth 1.7** + phone-OTP plugin | Israelis log in by phone; OTP goes through the Notifier, so it works in demo mode |
| Calendar | **@hebcal/core 6.9** (ESM-only) | `isAssurBemlacha()`, candle lighting, Hebrew holiday names |
| Phones | libphonenumber-js | `05x` ↔ `+972` normalisation |
| Tests | Vitest, fast-check, **Playwright 1.63** (Chromium already cached) | |
| Deploy | Vercel (your hobby team) + Supabase | Free tiers |

**Machine (verified):** Node 24.14, npm 11.9, git, Homebrew; no Docker, no Postgres, no pnpm;
ports 3000/5432 free; Apple M1 Pro.

**Structural rule:** `src/domain/**` is pure — no DB, no Next, no fetch. Money, weight, tolerance,
state machine and slot logic are tested in milliseconds. Enforced by an ESLint import zone and a test.

---

## Data model

**In plain words:** money is stored as whole agorot, weight as whole grams, rates as basis points —
never decimals, so rounding bugs cannot exist. The database itself refuses impossible states.

Conventions: `_agorot` integer · `_g` integer · `_bp` integer (VAT 18% = `1800`, snapshotted per order)
· `timestamptz` rendered in `Asia/Jerusalem` · sortable Hebrew columns use ICU `he-IL` collation
(codepoint order puts final letters ך ם ן ף ץ in the wrong place).

| Area | Tables | Key points |
|---|---|---|
| People | `customer`, `address`, `staff_user`, better-auth tables | Israeli address: city, street, house, entrance, floor, apartment, intercom, notes; no postcode dependence. Roles: OWNER / MANAGER / BUTCHER / PACKER / DRIVER / VIEWER, matrix in `domain/auth/permissions.ts` |
| Catalog | `category`, `product`, `product_variant`, `product_kashrut`, `kashrut_authority`, `asset` | `pricing_mode` WEIGHT (₪/kg, min/max/step g, tolerance bp, avg piece g) or PACKAGE (price, contents). `CHECK`s enforce each mode's required fields. `handling_flags[]` incl. `REQUIRES_BROILING_TZLIYA`. Hebrew `tsvector` search |
| Stock | `stock_item`, `stock_movement` | Append-only movements (received, reserved, picked, trim loss, spoilage…); `stock_item` is a projection rebuilt in a test |
| Delivery | `delivery_zone`, `delivery_slot_template`, `delivery_slot`, `slot_hold`, `calendar_blackout` | Capacity in orders *and* kg with `CHECK (reserved <= capacity)`. 15-min holds expire by timestamp at read time (no per-minute cron — Vercel hobby only allows daily crons). Hebcal blackouts regenerate; manual blackouts are never overwritten |
| Orders | `cart`, `cart_line`, `order`, `order_line`, `order_status_event` | Price, name, address snapshots frozen at placement. Lines carry `estimated_weight_g`, `actual_weight_g`, `tolerance_min_g/max_g`, `estimate_agorot`, `final_agorot`. `order.version` for tablet concurrency. Status events drive the customer timeline |
| Payments | `payment_intent`, `payment_capture`, `payment_refund`, `payment_webhook_event`, `invoice` | No card data ever. Idempotency keys unique. Callbacks are hints — state changes only after re-fetching the transaction from PayPlus server-side. Gapless yearly invoice numbering |
| Messages | `notification_template`, `notification`, `notification_suppression` | Rendered Hebrew body always stored, mock included — this is the message timeline |
| Cross-cutting | `audit_event`, `setting`, `idempotency_key` | Every staff mutation audited; price changes, overrides, refunds are the rows that matter |

---

## Repo layout (essentials)

```
src/
  app/[locale]/(shop)/        home, c/[category], p/[slug], cart, checkout, orders/[number], account, kashrut
  app/[locale]/(staff)/staff/ board, orders/[id], pack/[id] ★, catalog, stock, slots, zones,
                              notifications, print/{pick,label,delivery-note}/[id], audit
  app/api/                    webhooks/payplus, cron/generate-slots (daily), auth
  app/dev/kitchen-sink/       every primitive in RTL + LTR side by side, live money test vectors
  domain/                     money, weight, order, catalog, delivery, kashrut, payments, notifications, auth  (pure)
  infra/                      db (schema.ts, queries, audit), payments (payplus, mock), notify (whatsapp-cloud, inforu, mock), hebcal
  ui/                         primitives (Button with required disabled `reason`, Money, Weight, Stepper, Skeleton…), patterns
  i18n/messages/{he,en}.json
  config/brand.ts
drizzle/                      hand-reviewed SQL migrations
scripts/                      db-setup.sh, seed.ts, generate-slots.ts, verify-rtl.ts
tests/                        unit, integration (real Postgres), contract (mock + sandbox, same suite), e2e
docs/adr/                     drizzle, payplus J5, agorot/grams, hebcal blackouts
CLAUDE.md  CONSTRAINTS.md  README.md (states plainly: demo shop, fictional kashrut data)
```

---

## The interface standard

**In plain words:** this says how each screen feels, not just what it stores. A screen is not
finished until every line here is true of it on the running app.

### Rules for every screen

- **Hebrew is the layout, not a translation.** `dir="rtl"`, logical CSS only (a lint rule bans
  `left`/`right`), numbers and ₪ bidi-isolated inside Hebrew text.
- **Every disabled control explains itself in visible text** — tablets have no hover. The `Button`
  component requires a `reason` when disabled; a missing reason fails a test.
- **Copy branches when behaviour branches.** Checkout says "המשך לתשלום — הקפאה של ₪465" for weight
  orders and "המשך לתשלום — ₪149" for packages only.
- **Never a silent no-op.** Every rejection is one sentence naming what and why.
- **Over ~0.5 s shows progress** — layout-shaped skeletons, never a spinner on a blank page. Long
  operations cancel with Esc.
- **Never charge a click the software could take.** OTP auto-submits on paste/autofill; city
  pre-filled from last order; weighing screen focuses the first unweighed line.
- **A small persistent "חנות הדגמה" ribbon**, and demo-mode banners on payment and messages.
- **Speed:** catalog statically rendered and revalidated; optimistic cart; category and product
  pages under 500 ms warm, measured on seeded data.

### Customer screens

| Screen | Discovered from | Shows | Empty / failure |
|---|---|---|---|
| Home | Root `/he` | Live delivery sentence (today / Friday early close / closed for chag), occasion tiles, categories, best-sellers, kashrut strip | Past Friday cutoff: "ההזמנות לשבת נסגרו — המשלוח הבא ביום ראשון" |
| Category | Nav, occasion tiles | Photo, Hebrew name, one-line cut description, `₪169 / ק״ג` or `₪149 למארז`, kashrut mini-badges, availability chip, typical piece weight. Facets: authority, glatt, animal, price, פסח, מנוקר | Empty filter: "לא נמצאו פריטים" + clear filter + two nearest matches |
| Product | Card | Hero photo, cut atlas, weight slider + stepper (250 g step) with live estimate and the hold sentence, cut variants with price deltas, "הערות לקצב", full kashrut panel, handling notes, cooking guidance | Out of stock: "אזל מהמלאי — חוזר ביום ג׳" + "עדכנו אותי" |
| Cart | Persistent cart button | Per line: requested weight stepper, ₪/kg, estimate, "אפשר תחליף" toggle. Footer: estimate, delivery fee or "חסרים ₪42 למשלוח חינם", hold amount on its own line | Empty: three top categories. Slot hold countdown, extend offer at 2 min |
| Checkout | Cart | 3 visible steps: address (Israeli field order) → slot week grid → PayPlus hosted page with our skeleton and a hold-vs-charge summary | Out of zone: says so + waiting list + phone. Blackout cells show the reason ("שבת", "פסח א׳"); full = "תפוס"; past cutoff says so. Slot taken mid-choice greys out in place |
| Tracking | Every message link, no login | Vertical timeline; at REPRICED an estimate → actual table and "חויבת ב-₪387 במקום ₪465 שהוקפא" | Over-tolerance card on top with deadline and three buttons. Capture failure: one clear line + update payment |

### Staff screens

| Screen | Standard |
|---|---|
| **Today's board** `/staff` | Landing page. Columns להכנה / בהכנה / מוכן / במשלוח with counts. A red strip appears **only** when something is wrong — failed captures, expiring holds, unpacked orders under an hour to slot, expiring certificates — each row with the one action that fixes it |
| **Order detail** | Lines (estimate / actual / delta), money ledger with provider references, event + message timeline. State buttons always visible, disabled with reasons. Overrides require a typed reason |
| **★ Weighing & packing** `/staff/pack/[id]` | Landscape tablet, three zones: line list on the leading (right) side, active line huge in the centre (photo, 40 px name, 56 px requested weight, cut instruction and customer note in an unmissable callout), 88 px numeric keypad on the left. **Grams only, no decimal key** — removes the 2.5-vs-25 error class. Quick chips −100 / exact / +100. "קרא מהמשקל" says "לא מחובר משקל — הזן ידנית" when no scale. Tolerance bar min → requested → max, colour *plus* text ("מעל הטווח ב-650 ג׳"). Live repricing with "מתוך ₪465 שהוקפא". Over tolerance: confirm relabels itself and shows the three resolutions. "אזל" opens substitutions with price differences. Liver cannot complete until "כבד — עבר צלייה" is ticked. 64 px minimum targets, no hover/drag/long-press/swipe. Autosave per entry with offline queue and "נשמר" indicator; screen wake lock; 10-second persistent undo bar; crash restores exact position. Finish: one review screen and "סיים ושלח לחיוב ₪387"; capture failure shows a red panel with retry / saved card / hold |
| Catalog | Inline publish toggle; rows missing kashrut data or photo are flagged and can't publish; price edits show old → new and % and require confirm |
| Stock | On hand / reserved / available / threshold / last movement by whom; below-threshold rows sorted first |
| Slots & zones | Week grid per zone with `4/8` orders and `62/120 ק״ג`; blackouts labelled with reason; "generate next 4 weeks" shows a preview diff before writing |
| Message timeline | Every message with rendered Hebrew body, channel, provider, status chain. Banner: "מצב הדגמה — ההודעות נרשמות ולא נשלחות בפועל" |
| Print | Pick sheet (RTL, barcode, tolerance range, blank box for actual weight), packing label, delivery note (final weights, VAT, kashrut statement). Each with a screen preview |

### Design language

Charcoal and bone-white ground, one deep-burgundy accent, large editorial photography, generous
whitespace. **Heebo** for UI, **Assistant** for long text, via `next/font`. Restraint is the point —
a premium butcher, not a supermarket flyer.

---

## Build sequence

**Ground rules for every phase:** `git init` with a recorded baseline, work on `feat/phase-N`
branches (never straight on `main`), and a phase is done only when **exercised on the running app
in the browser** — not merely compiling with green tests. Each phase ends with what you can see.

| # | Phase | Done when you can see |
|---|---|---|
| 0 | **Environment, verified first.** `brew install postgresql@17`, dev + test DBs, **check `he-IL-x-icu` collation exists before any schema** (fallback: `CREATE COLLATION … provider=icu`). Next app, `.claude/launch.json`, `CLAUDE.md`, `CONSTRAINTS.md` | `/he` renders RTL Hebrew with correct font and `₪129.90 / ק״ג`; collation query result recorded in an ADR |
| 1 | **Money, weight, RTL design system.** Branded `Agorot`/`Grams` types, reprice + tolerance + VAT, UI primitives | `/dev/kitchen-sink`: every component mirrored RTL/LTR with one toggle, live money test-vector table, tolerance bar at 0/5/10/15% |
| 2 | **Schema, seed, catalog.** Full migration; deterministic seed (below); photo set *(I ask before downloading)* | Browse home → בקר → אנטריקוט with kashrut strip, variants, weight picker; `/en` equivalent; search "אנטרי" works; Hebrew sort correct |
| 3 | **Cart, zones, Hebcal slots** | Tel Aviv address shows this week; Friday morning only with candle-lighting reason; Saturday and chag labelled; hold countdown in cart |
| 4 | **Order placement, mock payments, state machine, staff board.** Mock outcomes by test card: approve, decline variants, timeout, capture fail, refund fail | Place a Hebrew order → mock hosted page → tracking shows "הוקפא ₪465"; order appears on `/staff`; decline card keeps the cart intact with a Hebrew reason |
| 5 | **★ Weighing & packing screen** | At tablet size: weigh three lines, one over tolerance resolved by trim, one out of stock substituted, liver צלייה confirmed, capture → "₪387 of ₪465" on staff and customer screens |
| 6 | **Notifications, timeline, OTP login, delivery run** | Full lifecycle beside eight Hebrew messages in the timeline, incl. working over-tolerance approve/trim links; OTP login via timeline; driver marks delivered / not-home → reschedule |
| 7 | **Real PayPlus sandbox** behind the same interface; contract suite runs against mock and sandbox | With sandbox keys: real J5 hold, lower capture, visible in PayPlus dashboard. Without keys: contract tests skip loudly and the report says so |
| 8 | **English, accessibility, print** | Whole order flow in English LTR; keyboard + screen-reader pass on checkout and weighing; RTL print previews |
| 9 | **Hardening and live demo** | Full suite green → independent review of the diff against `CONSTRAINTS.md` → fixes → re-run → timings measured → *(with your approval)* deploy Vercel + Supabase → E2E re-run against the live URL |

### Seed data (deterministic)

- **~60 products, 9 categories** with real Israeli cuts and indicative prices: אנטריקוט 169, פילה
  289, שייטל 119, אסאדו 89, כתף 79, צלעות 85, אוסובוקו 69, דנוור 149, בריסקט 95, פרגיות 45,
  כרעיים 27, חזה עוף 49, עוף שלם 24, טחון בקר 62, קבב 65, מרגז 72, כבד עוף 35, לב 39, שווארמה הודו
  55, צלעות טלה 159 … Packages: מארז עוף למשפחה ₪149, מארז מנגל ל-8 ₪399, מארז שבת ₪249, מארז לפסח ₪329.
- **Kashrut: three *fictional* authorities**, one certificate expiring in 21 days so the warning is
  visible. Real authority names and badges are not used — on a fictional shop they would imply an
  endorsement that doesn't exist.
- **8 zones** (תל אביב, רמת גן/גבעתיים, הרצליה/רעננה, ראשל״צ/חולון, ירושלים, חיפה והקריות, באר שבע,
  מודיעין) + one inactive; **25 customers** with realistic addresses; **12 weeks of slots** including a
  Pesach and a Rosh Hashana week; **45 orders across every state**, including every failure state.
- `npm run seed:empty` for a shop with no orders, so every empty state is looked at, not imagined.

---

## Verification

- **Unit (Vitest):** money vector tables (`12900 agorot/kg × 2500 g → 32250`), one documented
  rounding policy, VAT `net + vat === gross` for every value 1…200,000 agorot; **property test,
  10,000 runs: for every weight within tolerance, capture ≤ hold**; exhaustive state-machine
  matrix; permissions matrix; **a full Hebrew year of slots for Jerusalem** — zero slots on any
  Shabbat or chag, Friday cutoff before candle lighting in both December and June, chol hamoed open.
- **Integration (real Postgres):** every transition writes the right events, stock movements,
  messages and audit rows; **20 concurrent checkouts on a 3-capacity slot → exactly 3 succeed**;
  capture idempotency; webhook replay ×5 changes state once; Hebrew `ORDER BY` matches `Intl.Collator('he-IL')`.
- **Contract:** one PaymentProvider suite and one Notifier suite run against both mock and real
  providers, so the mock can't drift into fantasy.
- **E2E (Playwright):** `he-desktop`, `he-mobile`, `he-tablet-pack` (1180×820 touch), `en-desktop`.
  Journeys: happy path, decline, over-tolerance approve and trim, substitution, capture failure +
  override, not-home reschedule, refund, Shabbat slot, out-of-zone, guest OTP checkout.
  **Dedicated RTL gate** on every screen: direction, no horizontal overflow, arrows point the right
  way, visual snapshots of mixed Hebrew/Latin/number strings.
- **By hand, in the in-app browser, every phase** — reported separately from what tests cover.

---

## Decisions I made for you (each is one setting to change)

- Default over-tolerance policy: **trim to ceiling** (no surprise second charge). Default tolerance **10%**.
- Displayed prices **include VAT** (Israeli retail convention).
- **PayPlus** as the card provider (the only one checked whose docs confirm capture-below-hold).
  **WhatsApp Cloud API** as the real messaging provider, **InforU** (Israeli SMS gateway) as fallback;
  Twilio rejected — Israeli sender IDs need the same pre-registration wall as WhatsApp.
- One app, staff area as a route group — not a separate back-office project.
- Local Postgres 17 via Homebrew (matches Supabase), not Docker.

---

## Risks and unknowns

| # | Item | Status |
|---|---|---|
| 1 | PayPlus J5 hold → capture ≤ hold; sandbox URL; hosted page; tokens; refunds | **Verified** in PayPlus docs |
| 2 | `@hebcal/core` 6.9.2 API: `isAssurBemlacha`, candle lighting, Hebrew holiday names; ESM-only | **Verified** from the package |
| 3 | Israeli VAT 18% | **Verified** (snapshotted per order anyway) |
| 4 | Supabase new project costs $0 on your org | **Verified** |
| 5 | `he-IL-x-icu` collation available in Homebrew Postgres 17 **and** Supabase | **Hypothesis** — checked first thing in Phase 0 and again on Supabase in Phase 9 |
| 6 | How long a PayPlus hold lasts and when the remainder is released | **Hypothesis** — not in docs. Until known: UI says "בתוך מספר ימי עסקים", holds treated as valid 5 days, dispatch blocked after |
| 7 | Whether PayPlus callbacks carry a signature | **Hypothesis** — safe either way: callbacks only trigger a server-side re-fetch |
| 8 | TypeScript 7 (Go rewrite) compatibility with lint plugins | **Hypothesis** — fallback pin to 5.9, recorded in `CONSTRAINTS.md` |
| 9 | "קצביית הרימון" isn't a real Israeli business | **Hypothesis** — I check before using it; if it is, I pick another invented name |
| 10 | Live WhatsApp is impossible without a registered business | **Known limit** — mock + timeline, stated plainly on screen and in README |
| 11 | Cold chain on reschedule (default 6 h hard block) and halachic handling rules | **Known limit** — reasonable defaults, deserve a domain-expert read before any real use |
| 12 | Disk space ~20 GB free | **Known risk** — see "What you need to do" |

**Critical files to write and review first:** `src/infra/db/schema.ts`, `src/domain/money/agorot.ts`,
`src/domain/weight/reprice.ts`, `src/domain/order/machine.ts`, `src/domain/payments/provider.ts`,
`src/app/[locale]/(staff)/staff/pack/[id]/page.tsx`.
