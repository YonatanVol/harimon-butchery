/**
 * The contract every message channel implements.
 *
 * In plain words: we never pretend a message was delivered. The demo notifier records the exact text
 * and says so; the real providers report what their API actually told us.
 */

export interface OutboundMessage {
  notificationId: string;
  channel: "WHATSAPP" | "SMS";
  toE164: string;
  locale: "he" | "en";
  templateKey: string;
  body: string;
  /** Ordered values for providers that need a pre-approved template (WhatsApp). */
  templateParams: string[];
}

export type SendResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; reason: string; /** Retrying won't help (bad number, rejected template). */ permanent: boolean };

export interface Notifier {
  readonly name: "MOCK" | "WHATSAPP_CLOUD" | "INFORU";
  readonly channel: "WHATSAPP" | "SMS";
  /** True when nothing actually leaves the system. */
  readonly demo: boolean;
  send(message: OutboundMessage): Promise<SendResult>;
}
