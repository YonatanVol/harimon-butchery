import { pgEnum } from "drizzle-orm/pg-core";

export const pricingMode = pgEnum("pricing_mode", ["WEIGHT", "PACKAGE"]);

export const animalType = pgEnum("animal_type", ["BEEF", "VEAL", "LAMB", "CHICKEN", "TURKEY", "MIXED"]);

export const occasion = pgEnum("occasion", ["SHABBAT", "GRILL", "HOLIDAY", "SLOW_COOK", "WEEKNIGHT"]);

export const handlingFlag = pgEnum("handling_flag", [
  "REQUIRES_BROILING_TZLIYA",
  "REQUIRES_SALTING",
  "FROZEN",
  "BONE_IN",
  "VACUUM_PACKED",
]);

export const shechitaType = pgEnum("shechita_type", ["BEIT_YOSEF", "ASHKENAZI", "CHABAD"]);
export const glattLevel = pgEnum("glatt_level", ["GLATT_CHALAK", "GLATT", "REGULAR"]);
export const nikurStatus = pgEnum("nikur_status", ["MENUKAR", "NOT_MENUKAR", "NOT_APPLICABLE"]);
export const saltedStatus = pgEnum("salted_status", ["SALTED", "REQUIRES_SALTING", "NOT_APPLICABLE"]);
export const passoverStatus = pgEnum("passover_status", ["KOSHER_LEPESACH", "NOT_FOR_PESACH"]);

export const stockMovementReason = pgEnum("stock_movement_reason", [
  "RECEIVED",
  "RESERVED",
  "RELEASED",
  "PICKED",
  "TRIM_LOSS",
  "SPOILAGE",
  "RETURN",
  "MANUAL_ADJUST",
  "COUNT_CORRECTION",
]);

export const slotStatus = pgEnum("slot_status", ["OPEN", "CLOSED", "BLACKOUT"]);
export const blackoutSource = pgEnum("blackout_source", ["HEBCAL", "MANUAL"]);

export const staffRole = pgEnum("staff_role", ["OWNER", "MANAGER", "BUTCHER", "PACKER", "DRIVER", "VIEWER"]);

export const cartStatus = pgEnum("cart_status", ["OPEN", "CONVERTED", "ABANDONED"]);

export const orderStatus = pgEnum("order_status", [
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
]);

export const orderLineStatus = pgEnum("order_line_status", [
  "PENDING",
  "WEIGHED",
  "SUBSTITUTED",
  "SHORT",
  "CANCELLED",
  "REFUNDED",
]);

export const overTolerancePolicy = pgEnum("over_tolerance_policy", ["TRIM_TO_CEILING", "ASK_CUSTOMER"]);
export const weighingSource = pgEnum("weighing_source", ["MANUAL", "SCALE"]);
export const actorType = pgEnum("actor_type", ["CUSTOMER", "STAFF", "SYSTEM", "PSP"]);

export const paymentProvider = pgEnum("payment_provider", ["MOCK", "PAYPLUS"]);
export const paymentIntentStatus = pgEnum("payment_intent_status", [
  "CREATED",
  "REDIRECTED",
  "AUTHORIZED",
  "DECLINED",
  "EXPIRED",
  "VOIDED",
]);
export const captureStatus = pgEnum("capture_status", ["PENDING", "SUCCEEDED", "FAILED"]);
export const refundStatus = pgEnum("refund_status", ["PENDING", "SUCCEEDED", "FAILED"]);

export const notificationChannel = pgEnum("notification_channel", ["WHATSAPP", "SMS", "EMAIL"]);
export const notificationProvider = pgEnum("notification_provider", ["MOCK", "WHATSAPP_CLOUD", "INFORU"]);
export const notificationStatus = pgEnum("notification_status", [
  "QUEUED",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED",
  "SUPPRESSED",
]);

export const reviewStatus = pgEnum("review_status", ["PENDING", "PUBLISHED", "REJECTED"]);
