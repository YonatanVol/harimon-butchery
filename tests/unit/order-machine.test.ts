import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  type ActorRole,
  eventsFrom,
  ORDER_EVENTS,
  ORDER_STATUSES,
  type OrderEvent,
  type OrderStatus,
  REJECTION_KEYS,
  TERMINAL,
  transition,
} from "@/domain/order/machine";
import { orderStatus } from "@/infra/db/schema/enums";

const ACTORS: ActorRole[] = ["CUSTOMER", "SYSTEM", "PSP", "OWNER", "MANAGER", "BUTCHER", "PACKER", "DRIVER", "VIEWER"];
const messages = (locale: string) => JSON.parse(readFileSync(`src/i18n/messages/${locale}.json`, "utf8"));

/** Walk a path of [event, actor, ctx?] steps and return the final state. */
function walk(start: OrderStatus, steps: Array<[OrderEvent, ActorRole, object?]>): OrderStatus {
  let state = start;
  for (const [event, actor, ctx] of steps) {
    const r = transition(state, event, { actor, ...ctx });
    if (!r.ok) throw new Error(`${state} --${event}(${actor})--> rejected: ${r.reason}`);
    state = r.to;
  }
  return state;
}

describe("order state machine", () => {
  it("uses exactly the statuses the database enum allows", () => {
    expect([...ORDER_STATUSES].sort()).toEqual([...orderStatus.enumValues].sort());
  });

  it("every (state × event × actor) is either a transition or a rejection with a known reason", () => {
    let transitions = 0;
    for (const s of ORDER_STATUSES) {
      for (const e of ORDER_EVENTS) {
        for (const actor of ACTORS) {
          const r = transition(s, e, { actor, reason: "a reason long enough", finalTotalAgorot: 1, authorizationCeilingAgorot: 2, hasSavedCard: true });
          if (r.ok) {
            transitions++;
            expect(ORDER_STATUSES).toContain(r.to);
          } else {
            expect(REJECTION_KEYS).toContain(r.reason);
          }
        }
      }
    }
    expect(transitions).toBeGreaterThan(40);
  });

  it("every rejection reason has a Hebrew and an English sentence", () => {
    for (const locale of ["he", "en"]) {
      const m = messages(locale).orders.rejections;
      for (const key of REJECTION_KEYS) expect(m[key], `${locale}:${key}`).toMatch(/\S{3,}/);
    }
  });

  it("terminal states accept no events", () => {
    for (const s of TERMINAL) expect(eventsFrom(s)).toEqual([]);
  });

  it("every non-terminal state has a way forward", () => {
    for (const s of ORDER_STATUSES) if (!TERMINAL.includes(s)) expect(eventsFrom(s).length, s).toBeGreaterThan(0);
  });

  it("the happy path, end to end", () => {
    const end = walk("PLACED", [
      ["AUTH_REQUESTED", "CUSTOMER"],
      ["AUTH_APPROVED", "PSP"],
      ["PICKING_STARTED", "BUTCHER"],
      ["LINES_COMPLETED", "BUTCHER"],
      ["REPRICED", "SYSTEM"],
      ["CAPTURE_REQUESTED", "BUTCHER", { finalTotalAgorot: 38700, authorizationCeilingAgorot: 46500 }],
      ["CAPTURE_SUCCEEDED", "PSP"],
      ["PACKED", "PACKER"],
      ["DISPATCHED", "DRIVER"],
      ["DELIVERED", "DRIVER"],
      ["CLOSED", "SYSTEM"],
    ]);
    expect(end).toBe("CLOSED");
  });

  it("authorization produces the right effects", () => {
    expect(transition("AUTH_PENDING", "AUTH_APPROVED", { actor: "PSP" })).toEqual({
      ok: true,
      from: "AUTH_PENDING",
      to: "AUTHORIZED",
      effects: ["CONVERT_CART", "NOTIFY:order.authorized"],
    });
    expect(transition("AUTH_PENDING", "AUTH_DECLINED", { actor: "PSP" })).toMatchObject({
      ok: true,
      to: "AUTH_DECLINED",
      effects: ["RELEASE_SLOT_AND_STOCK", "RESTORE_CART"],
    });
  });

  it("a customer cannot approve their own payment, and a driver cannot start picking", () => {
    expect(transition("AUTH_PENDING", "AUTH_APPROVED", { actor: "CUSTOMER" })).toMatchObject({ ok: false, reason: "NOT_PERMITTED" });
    expect(transition("AUTHORIZED", "PICKING_STARTED", { actor: "DRIVER" })).toMatchObject({ ok: false, reason: "NOT_PERMITTED" });
    expect(transition("AUTHORIZED", "PICKING_STARTED", { actor: "VIEWER" })).toMatchObject({ ok: false, reason: "NOT_PERMITTED" });
  });

  it("never captures more than the hold", () => {
    expect(transition("REPRICED", "CAPTURE_REQUESTED", { actor: "SYSTEM", finalTotalAgorot: 46501, authorizationCeilingAgorot: 46500 })).toMatchObject({
      ok: false,
      reason: "FINAL_EXCEEDS_HOLD",
    });
    expect(transition("REPRICED", "CAPTURE_REQUESTED", { actor: "SYSTEM", finalTotalAgorot: null, authorizationCeilingAgorot: 46500 })).toMatchObject({
      ok: false,
      reason: "FINAL_EXCEEDS_HOLD",
    });
    expect(transition("REPRICED", "CAPTURE_REQUESTED", { actor: "SYSTEM", finalTotalAgorot: 46500, authorizationCeilingAgorot: 46500 }).ok).toBe(true);
  });

  it("capture failure: retry at most 3 times, saved card needs a token, force dispatch needs a manager and a reason", () => {
    expect(transition("CAPTURE_FAILED", "CAPTURE_RETRIED", { actor: "SYSTEM", captureAttempts: 2 }).ok).toBe(true);
    expect(transition("CAPTURE_FAILED", "CAPTURE_RETRIED", { actor: "SYSTEM", captureAttempts: 3 })).toMatchObject({ reason: "TOO_MANY_CAPTURE_ATTEMPTS" });
    expect(transition("CAPTURE_FAILED", "SAVED_CARD_CHARGED", { actor: "MANAGER", hasSavedCard: false })).toMatchObject({ reason: "NO_SAVED_CARD" });
    expect(transition("CAPTURE_FAILED", "FORCE_DISPATCHED", { actor: "BUTCHER", reason: "customer is a regular" })).toMatchObject({ reason: "NOT_PERMITTED" });
    expect(transition("CAPTURE_FAILED", "FORCE_DISPATCHED", { actor: "MANAGER", reason: "short" })).toMatchObject({ reason: "REASON_REQUIRED" });
    expect(transition("CAPTURE_FAILED", "FORCE_DISPATCHED", { actor: "MANAGER", reason: "Regular customer, paying cash at the door" })).toMatchObject({
      ok: true,
      to: "PACKED",
      effects: ["MARK_UNPAID_DISPATCH", "AUDIT"],
    });
  });

  it("over tolerance: ask the customer, then approve (extra charge) or decline/timeout (trim)", () => {
    expect(walk("PICKING", [["OVER_TOLERANCE_ASKED", "BUTCHER"], ["CUSTOMER_APPROVED_EXTRA", "CUSTOMER"]])).toBe("PICKING");
    expect(transition("AWAITING_CUSTOMER_APPROVAL", "APPROVAL_DEADLINE_PASSED", { actor: "SYSTEM" })).toMatchObject({
      to: "PICKING",
      effects: ["TRIM_OVER_TOLERANCE_LINE", "NOTIFY:order.trimmed"],
    });
  });

  it("not home: reschedule only within the cold-chain limit, otherwise return to shop and refund", () => {
    expect(transition("DELIVERY_FAILED_NOT_HOME", "RESCHEDULED", { actor: "CUSTOMER", hoursSinceCapture: 5, coldChainMaxHours: 6 }).ok).toBe(true);
    expect(transition("DELIVERY_FAILED_NOT_HOME", "RESCHEDULED", { actor: "CUSTOMER", hoursSinceCapture: 7, coldChainMaxHours: 6 })).toMatchObject({
      reason: "COLD_CHAIN_EXCEEDED",
    });
    expect(
      walk("DELIVERY_FAILED_NOT_HOME", [
        ["RETURNED_TO_SHOP", "DRIVER"],
        ["REFUND_REQUESTED", "MANAGER", { reason: "Customer unreachable, meat returned" }],
        ["REFUND_SUCCEEDED_FULL", "PSP"],
      ]),
    ).toBe("REFUNDED");
  });

  it("cancellation: customers before picking, only managers with a reason after", () => {
    expect(transition("AUTHORIZED", "CANCELLED_BY_CUSTOMER", { actor: "CUSTOMER" }).ok).toBe(true);
    expect(transition("PICKING", "CANCELLED_BY_CUSTOMER", { actor: "CUSTOMER" })).toMatchObject({ reason: "INVALID_TRANSITION" });
    expect(transition("PICKING", "CANCELLED_BY_SHOP", { actor: "MANAGER", reason: "" })).toMatchObject({ reason: "REASON_REQUIRED" });
  });
});
