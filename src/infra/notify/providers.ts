import { randomBytes } from "node:crypto";
import type { Notifier, OutboundMessage, SendResult } from "@/domain/notifications/notifier";

/** Demo mode: the message is recorded with its full text and marked as not sent. */
export const mockNotifier: Notifier = {
  name: "MOCK",
  channel: "WHATSAPP",
  demo: true,
  async send() {
    return { ok: true, providerMessageId: `demo_${randomBytes(8).toString("hex")}` };
  },
};

/**
 * WhatsApp Business Cloud API. Business-initiated messages must use templates approved by Meta, named
 * here as `harimon_<key>` with body parameters in the order given by the template's variables.
 * Built from Meta's public reference; not verified against a live business account.
 */
export function whatsappCloudNotifier(config: { token: string; phoneNumberId: string; apiVersion?: string }): Notifier {
  const version = config.apiVersion ?? "v23.0";
  return {
    name: "WHATSAPP_CLOUD",
    channel: "WHATSAPP",
    demo: false,
    async send(m: OutboundMessage): Promise<SendResult> {
      let res: Response;
      try {
        res = await fetch(`https://graph.facebook.com/${version}/${config.phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: m.toE164.replace(/^\+/, ""),
          type: "template",
          template: {
            name: `harimon_${m.templateKey.replace(/\./g, "_")}`,
            language: { code: m.locale === "he" ? "he" : "en" },
            components: [{ type: "body", parameters: m.templateParams.map((text) => ({ type: "text", text })) }],
          },
        }),
        });
      } catch (e) {
        return { ok: false, reason: (e as Error).message, permanent: false };
      }
      const data = (await res.json().catch(() => ({}))) as { messages?: Array<{ id: string }>; error?: { message?: string; code?: number } };
      if (res.ok && data.messages?.[0]?.id) return { ok: true, providerMessageId: data.messages[0].id };
      // 131026: undeliverable number; 132xxx: template problems — retrying won't fix those.
      const code = data.error?.code ?? res.status;
      return { ok: false, reason: data.error?.message ?? `HTTP ${res.status}`, permanent: code === 131026 || (code >= 132000 && code < 133000) };
    },
  };
}

/**
 * InforU (Israeli SMS gateway), JSON API v2 with Basic auth (user:token).
 * Built from InforU's public documentation; not verified against a live account.
 */
export function inforuNotifier(config: { user: string; token: string; sender: string }): Notifier {
  return {
    name: "INFORU",
    channel: "SMS",
    demo: false,
    async send(m: OutboundMessage): Promise<SendResult> {
      const auth = Buffer.from(`${config.user}:${config.token}`).toString("base64");
      const res = await fetch("https://capi.inforu.co.il/api/v2/SMS/SendSms", {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          Data: {
            Message: m.body,
            Recipients: [{ Phone: m.toE164.replace(/^\+972/, "0") }],
            Settings: { Sender: config.sender, CustomerMessageId: m.notificationId },
          },
        }),
      }).catch(() => null);
      if (!res) return { ok: false, reason: "network error", permanent: false };
      const data = (await res.json().catch(() => ({}))) as { StatusId?: number; StatusDescription?: string };
      if (res.ok && data.StatusId === 1) return { ok: true, providerMessageId: m.notificationId };
      return { ok: false, reason: data.StatusDescription ?? `HTTP ${res.status}`, permanent: false };
    },
  };
}

export function activeNotifier(env = process.env): Notifier {
  switch (env.NOTIFICATIONS_PROVIDER ?? "MOCK") {
    case "WHATSAPP_CLOUD":
      if (env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID) {
        return whatsappCloudNotifier({ token: env.WHATSAPP_TOKEN, phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID });
      }
      break;
    case "INFORU":
      if (env.INFORU_USER && env.INFORU_TOKEN) {
        return inforuNotifier({ user: env.INFORU_USER, token: env.INFORU_TOKEN, sender: env.INFORU_SENDER ?? "Harimon" });
      }
      break;
  }
  if ((env.NOTIFICATIONS_PROVIDER ?? "MOCK") !== "MOCK") {
    // Misconfigured: stay in demo mode, which the message timeline states plainly — never send half-configured.
    console.warn(`NOTIFICATIONS_PROVIDER=${env.NOTIFICATIONS_PROVIDER} is missing credentials; using demo mode.`);
  }
  return mockNotifier;
}
