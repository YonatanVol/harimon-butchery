import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { holdSlotForCart } from "@/infra/cart/holds";
import { slotHold } from "@/infra/db/schema";
import { connectTestDb, makeCart, makeSlot, makeZone, truncateAll } from "./support/db";

const { db, close } = connectTestDb();

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("slot holds (real Postgres)", () => {
  it("20 customers racing for a 3-order window: exactly 3 get it, 17 are told it's full", async () => {
    const zone = await makeZone(db);
    const slot = await makeSlot(db, zone.id, { capacityOrders: 3 });
    const carts = await Promise.all(Array.from({ length: 20 }, () => makeCart(db, zone.id)));

    const results = await Promise.all(
      carts.map((c) => holdSlotForCart(db, { cartId: c.id, zoneId: zone.id, slotId: slot.id })),
    );

    expect(results.filter((r) => r.ok)).toHaveLength(3);
    const failures = results.filter((r) => !r.ok);
    expect(failures).toHaveLength(17);
    expect(failures.every((r) => !r.ok && r.problem.key === "SLOT_FULL")).toBe(true);

    const live = await db.select().from(slotHold).where(and(eq(slotHold.slotId, slot.id), isNull(slotHold.releasedAt)));
    expect(live).toHaveLength(3);
  });

  it("reserved orders count against capacity, and expired holds free their place", async () => {
    const zone = await makeZone(db);
    const slot = await makeSlot(db, zone.id, { capacityOrders: 2, reservedOrders: 1 });
    const [a, b] = await Promise.all([makeCart(db, zone.id), makeCart(db, zone.id)]);

    expect((await holdSlotForCart(db, { cartId: a.id, zoneId: zone.id, slotId: slot.id })).ok).toBe(true);
    const blocked = await holdSlotForCart(db, { cartId: b.id, zoneId: zone.id, slotId: slot.id });
    expect(blocked).toEqual({ ok: false, problem: { key: "SLOT_FULL" } });

    // 16 minutes later, a's hold has lapsed.
    const later = new Date(Date.now() + 16 * 60_000);
    expect((await holdSlotForCart(db, { cartId: b.id, zoneId: zone.id, slotId: slot.id, now: later })).ok).toBe(true);
  });

  it("holding a new window releases the cart's previous hold", async () => {
    const zone = await makeZone(db);
    const first = await makeSlot(db, zone.id);
    const second = await makeSlot(db, zone.id, { startsAt: new Date(Date.now() + 3 * 86_400_000), endsAt: new Date(Date.now() + 3 * 86_400_000 + 3_600_000), cutoffAt: new Date(Date.now() + 2 * 86_400_000) });
    const c = await makeCart(db, zone.id);

    await holdSlotForCart(db, { cartId: c.id, zoneId: zone.id, slotId: first.id });
    await holdSlotForCart(db, { cartId: c.id, zoneId: zone.id, slotId: second.id });

    const live = await db.select().from(slotHold).where(and(eq(slotHold.cartId, c.id), isNull(slotHold.releasedAt)));
    expect(live.map((h) => h.slotId)).toEqual([second.id]);
  });

  it("explains closed, past-cutoff, too-soon and wrong-zone windows", async () => {
    const zone = await makeZone(db, { leadTimeMinutes: 24 * 60 });
    const other = await makeZone(db);
    const c = await makeCart(db, zone.id);

    const closed = await makeSlot(db, zone.id, { status: "BLACKOUT", blackoutReasonHe: "שבת — אין משלוחים", blackoutReasonEn: "Shabbat — no deliveries" });
    expect(await holdSlotForCart(db, { cartId: c.id, zoneId: zone.id, slotId: closed.id })).toEqual({
      ok: false,
      problem: { key: "SLOT_CLOSED", reasonHe: "שבת — אין משלוחים", reasonEn: "Shabbat — no deliveries" },
    });

    const soon = new Date(Date.now() + 5 * 3_600_000);
    const tooSoon = await makeSlot(db, zone.id, { startsAt: soon, endsAt: new Date(soon.getTime() + 3_600_000), cutoffAt: new Date(Date.now() + 3_600_000) });
    expect(await holdSlotForCart(db, { cartId: c.id, zoneId: zone.id, slotId: tooSoon.id })).toEqual({
      ok: false,
      problem: { key: "SLOT_TOO_SOON", leadMinutes: 1440 },
    });

    const past = await makeSlot(db, zone.id, { cutoffAt: new Date(Date.now() - 60_000) });
    expect(await holdSlotForCart(db, { cartId: c.id, zoneId: zone.id, slotId: past.id })).toEqual({ ok: false, problem: { key: "SLOT_PAST_CUTOFF" } });

    const elsewhere = await makeSlot(db, other.id);
    expect(await holdSlotForCart(db, { cartId: c.id, zoneId: zone.id, slotId: elsewhere.id })).toEqual({ ok: false, problem: { key: "SLOT_WRONG_ZONE" } });
  });
});
