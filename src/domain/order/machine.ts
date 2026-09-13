/**
 * The order state machine.
 *
 * In plain words: every change to an order is an *event* ("payment approved", "butcher started
 * picking"). This table says, for each state, which events are allowed, where they lead, and what
 * must happen as a result. Anything not in the table is refused with a reason — there is no event
 * that silently does nothing.
 */

export const ORDER_STATUSES = [
  "PLACED",
  "AUTH_PENDING",
  "AUTHORIZED",
  "AUTH_DECLINED",
  "AUTH_EXPIRED",
  "PICKING",
  "AWAITING_CUSTOMER_APPROVAL",
  "WEIGHED",
  "REPRICED",
  "CAPTURE_PENDING",
  "CAPTURED",
  "CAPTURE_FAILED",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DELIVERY_FAILED_NOT_HOME",
  "RESCHEDULED",
  "RETURNED_TO_SHOP",
  "REFUND_PENDING",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "CANCELLED_BY_CUSTOMER",
  "CANCELLED_BY_SHOP",
  "CLOSED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_EVENTS = [
  "AUTH_REQUESTED",
  "AUTH_APPROVED",
  "AUTH_DECLINED",
  "AUTH_TIMED_OUT",
  "HOLD_EXPIRED",
  "REAUTH_REQUESTED",
  "PICKING_STARTED",
  "OVER_TOLERANCE_ASKED",
  "CUSTOMER_APPROVED_EXTRA",
  "CUSTOMER_DECLINED_EXTRA",
  "APPROVAL_DEADLINE_PASSED",
  "LINES_COMPLETED",
  "REPRICED",
  "CAPTURE_REQUESTED",
  "CAPTURE_SUCCEEDED",
  "CAPTURE_FAILED",
  "CAPTURE_RETRIED",
  "SAVED_CARD_CHARGED",
  "FORCE_DISPATCHED",
  "PACKED",
  "DISPATCHED",
  "DELIVERED",
  "NOT_HOME",
  "REFUSED",
  "RESCHEDULED",
  "RETURNED_TO_SHOP",
  "REFUND_REQUESTED",
  "REFUND_SUCCEEDED_FULL",
  "REFUND_SUCCEEDED_PARTIAL",
  "CANCELLED_BY_CUSTOMER",
  "CANCELLED_BY_SHOP",
  "CLOSED",
] as const;
export type OrderEvent = (typeof ORDER_EVENTS)[number];

export type ActorRole = "CUSTOMER" | "SYSTEM" | "PSP" | "OWNER" | "MANAGER" | "BUTCHER" | "PACKER" | "DRIVER" | "VIEWER";

export type Effect =
  | "RESERVE_SLOT_AND_STOCK"
  | "RELEASE_SLOT_AND_STOCK"
  | "RESTORE_CART"
  | "CONVERT_CART"
  | "CREATE_PAYMENT_PAGE"
  | "VOID_AUTHORIZATION"
  | "FREEZE_OVER_TOLERANCE_LINE"
  | "TRIM_OVER_TOLERANCE_LINE"
  | "CHARGE_EXTRA_ON_TOKEN"
  | "COMPUTE_FINAL_TOTAL"
  | "CAPTURE_PAYMENT"
  | "CHARGE_SAVED_TOKEN"
  | "ISSUE_INVOICE"
  | "COMMIT_STOCK_PICKED"
  | "RESTOCK"
  | "MARK_UNPAID_DISPATCH"
  | "INCREMENT_DELIVERY_ATTEMPT"
  | "RESERVE_NEW_SLOT"
  | "REFUND_PAYMENT"
  | "AUDIT"
  | `NOTIFY:${string}`;

export interface TransitionContext {
  actor: ActorRole;
  captureAttempts?: number;
  finalTotalAgorot?: number | null;
  authorizationCeilingAgorot?: number;
  hasSavedCard?: boolean;
  hoursSinceCapture?: number | null;
  coldChainMaxHours?: number;
  reason?: string | null;
}

export type RejectionKey =
  | "INVALID_TRANSITION"
  | "NOT_PERMITTED"
  | "FINAL_EXCEEDS_HOLD"
  | "TOO_MANY_CAPTURE_ATTEMPTS"
  | "NO_SAVED_CARD"
  | "COLD_CHAIN_EXCEEDED"
  | "REASON_REQUIRED";

export const REJECTION_KEYS: readonly RejectionKey[] = [
  "INVALID_TRANSITION",
  "NOT_PERMITTED",
  "FINAL_EXCEEDS_HOLD",
  "TOO_MANY_CAPTURE_ATTEMPTS",
  "NO_SAVED_CARD",
  "COLD_CHAIN_EXCEEDED",
  "REASON_REQUIRED",
];

export type TransitionResult =
  | { ok: true; from: OrderStatus; to: OrderStatus; effects: Effect[] }
  | { ok: false; from: OrderStatus; event: OrderEvent; reason: RejectionKey };

export const MAX_CAPTURE_ATTEMPTS = 3;

const STAFF: ActorRole[] = ["OWNER", "MANAGER", "BUTCHER", "PACKER", "DRIVER"];
const FLOOR: ActorRole[] = ["OWNER", "MANAGER", "BUTCHER", "PACKER"];
const MANAGERS: ActorRole[] = ["OWNER", "MANAGER"];
const MACHINE: ActorRole[] = ["SYSTEM", "PSP"];

type Guard = (ctx: TransitionContext) => RejectionKey | null;

interface Rule {
  to: OrderStatus;
  actors: ActorRole[];
  effects: Effect[];
  guard?: Guard;
}

const needsReason: Guard = (ctx) => ((ctx.reason ?? "").trim().length >= 10 ? null : "REASON_REQUIRED");

const T: Partial<Record<OrderStatus, Partial<Record<OrderEvent, Rule>>>> = {
  PLACED: {
    AUTH_REQUESTED: { to: "AUTH_PENDING", actors: ["CUSTOMER", "SYSTEM"], effects: ["CREATE_PAYMENT_PAGE"] },
    CANCELLED_BY_CUSTOMER: { to: "CANCELLED_BY_CUSTOMER", actors: ["CUSTOMER"], effects: ["RELEASE_SLOT_AND_STOCK", "RESTORE_CART"] },
  },
  AUTH_PENDING: {
    AUTH_APPROVED: { to: "AUTHORIZED", actors: MACHINE, effects: ["CONVERT_CART", "NOTIFY:order.authorized"] },
    AUTH_DECLINED: { to: "AUTH_DECLINED", actors: MACHINE, effects: ["RELEASE_SLOT_AND_STOCK", "RESTORE_CART"] },
    AUTH_TIMED_OUT: { to: "AUTH_EXPIRED", actors: MACHINE, effects: ["RELEASE_SLOT_AND_STOCK", "RESTORE_CART"] },
    CANCELLED_BY_CUSTOMER: { to: "CANCELLED_BY_CUSTOMER", actors: ["CUSTOMER"], effects: ["RELEASE_SLOT_AND_STOCK", "RESTORE_CART"] },
  },
  AUTHORIZED: {
    PICKING_STARTED: { to: "PICKING", actors: FLOOR, effects: ["NOTIFY:order.picking"] },
    HOLD_EXPIRED: { to: "AUTH_EXPIRED", actors: MACHINE, effects: ["NOTIFY:order.reauth_required"] },
    CANCELLED_BY_CUSTOMER: {
      to: "CANCELLED_BY_CUSTOMER",
      actors: ["CUSTOMER"],
      effects: ["VOID_AUTHORIZATION", "RELEASE_SLOT_AND_STOCK", "NOTIFY:order.cancelled"],
    },
    CANCELLED_BY_SHOP: {
      to: "CANCELLED_BY_SHOP",
      actors: MANAGERS,
      effects: ["VOID_AUTHORIZATION", "RELEASE_SLOT_AND_STOCK", "AUDIT", "NOTIFY:order.cancelled_by_shop"],
      guard: needsReason,
    },
  },
  AUTH_EXPIRED: {
    REAUTH_REQUESTED: { to: "AUTH_PENDING", actors: ["CUSTOMER", ...MANAGERS], effects: ["CREATE_PAYMENT_PAGE"] },
    CANCELLED_BY_SHOP: {
      to: "CANCELLED_BY_SHOP",
      actors: MANAGERS,
      effects: ["RELEASE_SLOT_AND_STOCK", "AUDIT", "NOTIFY:order.cancelled_by_shop"],
      guard: needsReason,
    },
  },
  PICKING: {
    OVER_TOLERANCE_ASKED: {
      to: "AWAITING_CUSTOMER_APPROVAL",
      actors: FLOOR,
      effects: ["FREEZE_OVER_TOLERANCE_LINE", "NOTIFY:order.over_tolerance"],
    },
    LINES_COMPLETED: { to: "WEIGHED", actors: FLOOR, effects: ["COMMIT_STOCK_PICKED"] },
    CANCELLED_BY_SHOP: {
      to: "CANCELLED_BY_SHOP",
      actors: MANAGERS,
      effects: ["VOID_AUTHORIZATION", "RESTOCK", "AUDIT", "NOTIFY:order.cancelled_by_shop"],
      guard: needsReason,
    },
  },
  AWAITING_CUSTOMER_APPROVAL: {
    CUSTOMER_APPROVED_EXTRA: { to: "PICKING", actors: ["CUSTOMER"], effects: ["CHARGE_EXTRA_ON_TOKEN", "NOTIFY:order.extra_approved"] },
    CUSTOMER_DECLINED_EXTRA: { to: "PICKING", actors: ["CUSTOMER"], effects: ["TRIM_OVER_TOLERANCE_LINE", "NOTIFY:order.trimmed"] },
    APPROVAL_DEADLINE_PASSED: { to: "PICKING", actors: MACHINE, effects: ["TRIM_OVER_TOLERANCE_LINE", "NOTIFY:order.trimmed"] },
    CANCELLED_BY_SHOP: {
      to: "CANCELLED_BY_SHOP",
      actors: MANAGERS,
      effects: ["VOID_AUTHORIZATION", "RESTOCK", "AUDIT", "NOTIFY:order.cancelled_by_shop"],
      guard: needsReason,
    },
  },
  WEIGHED: {
    REPRICED: { to: "REPRICED", actors: [...FLOOR, ...MACHINE], effects: ["COMPUTE_FINAL_TOTAL", "NOTIFY:order.repriced"] },
  },
  REPRICED: {
    CAPTURE_REQUESTED: {
      to: "CAPTURE_PENDING",
      actors: [...FLOOR, ...MACHINE],
      effects: ["CAPTURE_PAYMENT"],
      guard: (ctx) =>
        ctx.finalTotalAgorot != null && ctx.authorizationCeilingAgorot != null && ctx.finalTotalAgorot <= ctx.authorizationCeilingAgorot
          ? null
          : "FINAL_EXCEEDS_HOLD",
    },
  },
  CAPTURE_PENDING: {
    CAPTURE_SUCCEEDED: { to: "CAPTURED", actors: MACHINE, effects: ["ISSUE_INVOICE", "NOTIFY:order.captured"] },
    CAPTURE_FAILED: { to: "CAPTURE_FAILED", actors: MACHINE, effects: ["AUDIT", "NOTIFY:order.capture_issue"] },
  },
  CAPTURE_FAILED: {
    CAPTURE_RETRIED: {
      to: "CAPTURE_PENDING",
      actors: [...FLOOR, ...MACHINE],
      effects: ["CAPTURE_PAYMENT"],
      guard: (ctx) => ((ctx.captureAttempts ?? 0) < MAX_CAPTURE_ATTEMPTS ? null : "TOO_MANY_CAPTURE_ATTEMPTS"),
    },
    SAVED_CARD_CHARGED: {
      to: "CAPTURE_PENDING",
      actors: MANAGERS,
      effects: ["CHARGE_SAVED_TOKEN", "AUDIT"],
      guard: (ctx) => (ctx.hasSavedCard ? null : "NO_SAVED_CARD"),
    },
    FORCE_DISPATCHED: { to: "PACKED", actors: MANAGERS, effects: ["MARK_UNPAID_DISPATCH", "AUDIT"], guard: needsReason },
    CANCELLED_BY_SHOP: {
      to: "CANCELLED_BY_SHOP",
      actors: MANAGERS,
      effects: ["VOID_AUTHORIZATION", "RESTOCK", "AUDIT", "NOTIFY:order.cancelled_by_shop"],
      guard: needsReason,
    },
  },
  CAPTURED: {
    PACKED: { to: "PACKED", actors: FLOOR, effects: ["NOTIFY:order.packed"] },
  },
  PACKED: {
    DISPATCHED: { to: "OUT_FOR_DELIVERY", actors: [...MANAGERS, "DRIVER"], effects: ["INCREMENT_DELIVERY_ATTEMPT", "NOTIFY:order.out_for_delivery"] },
  },
  OUT_FOR_DELIVERY: {
    DELIVERED: { to: "DELIVERED", actors: [...MANAGERS, "DRIVER"], effects: ["NOTIFY:order.delivered"] },
    NOT_HOME: { to: "DELIVERY_FAILED_NOT_HOME", actors: [...MANAGERS, "DRIVER"], effects: ["NOTIFY:order.not_home"] },
    REFUSED: { to: "RETURNED_TO_SHOP", actors: [...MANAGERS, "DRIVER"], effects: ["AUDIT", "NOTIFY:order.returned"] },
  },
  DELIVERY_FAILED_NOT_HOME: {
    RESCHEDULED: {
      to: "RESCHEDULED",
      actors: ["CUSTOMER", ...MANAGERS],
      effects: ["RESERVE_NEW_SLOT", "NOTIFY:order.rescheduled"],
      guard: (ctx) =>
        ctx.hoursSinceCapture == null || ctx.hoursSinceCapture <= (ctx.coldChainMaxHours ?? 6) ? null : "COLD_CHAIN_EXCEEDED",
    },
    RETURNED_TO_SHOP: { to: "RETURNED_TO_SHOP", actors: [...MANAGERS, "DRIVER"], effects: ["AUDIT", "NOTIFY:order.returned"] },
  },
  RESCHEDULED: {
    DISPATCHED: { to: "OUT_FOR_DELIVERY", actors: [...MANAGERS, "DRIVER"], effects: ["INCREMENT_DELIVERY_ATTEMPT", "NOTIFY:order.out_for_delivery"] },
  },
  RETURNED_TO_SHOP: {
    REFUND_REQUESTED: { to: "REFUND_PENDING", actors: MANAGERS, effects: ["REFUND_PAYMENT", "AUDIT"], guard: needsReason },
  },
  REFUND_PENDING: {
    // A refund the provider rejected can be tried again, with a (new) recorded reason.
    REFUND_REQUESTED: { to: "REFUND_PENDING", actors: MANAGERS, effects: ["REFUND_PAYMENT", "AUDIT"], guard: needsReason },
    REFUND_SUCCEEDED_FULL: { to: "REFUNDED", actors: MACHINE, effects: ["NOTIFY:order.refunded"] },
    REFUND_SUCCEEDED_PARTIAL: { to: "PARTIALLY_REFUNDED", actors: MACHINE, effects: ["NOTIFY:order.refunded"] },
  },
  DELIVERED: {
    REFUND_REQUESTED: { to: "REFUND_PENDING", actors: MANAGERS, effects: ["REFUND_PAYMENT", "AUDIT"], guard: needsReason },
    CLOSED: { to: "CLOSED", actors: MACHINE, effects: [] },
  },
  PARTIALLY_REFUNDED: {
    REFUND_REQUESTED: { to: "REFUND_PENDING", actors: MANAGERS, effects: ["REFUND_PAYMENT", "AUDIT"], guard: needsReason },
    CLOSED: { to: "CLOSED", actors: MACHINE, effects: [] },
  },
};

export function transition(from: OrderStatus, event: OrderEvent, ctx: TransitionContext): TransitionResult {
  const rule = T[from]?.[event];
  if (!rule) return { ok: false, from, event, reason: "INVALID_TRANSITION" };
  if (!rule.actors.includes(ctx.actor)) return { ok: false, from, event, reason: "NOT_PERMITTED" };
  const blocked = rule.guard?.(ctx);
  if (blocked) return { ok: false, from, event, reason: blocked };
  return { ok: true, from, to: rule.to, effects: [...rule.effects] };
}

/** Events that could ever be valid from a state (ignoring actor and guards) — drives which buttons exist. */
export function eventsFrom(status: OrderStatus): OrderEvent[] {
  return Object.keys(T[status] ?? {}) as OrderEvent[];
}

export const TERMINAL: readonly OrderStatus[] = ["AUTH_DECLINED", "REFUNDED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_SHOP", "CLOSED"];

export { STAFF as STAFF_ROLES };
