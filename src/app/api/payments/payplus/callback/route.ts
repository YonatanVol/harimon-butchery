import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/infra/db/client";
import { paymentIntent } from "@/infra/db/schema";
import { kickDispatch } from "@/infra/notify/kick";
import { resolveAuthorization } from "@/infra/orders/authorization";
import { appUrl, payplusConfigFromEnv } from "@/infra/payments/factory";
import { createPayPlusProvider } from "@/infra/payments/payplus";

export const dynamic = "force-dynamic";

/**
 * PayPlus posts here when a payment page finishes. The post is only a nudge: after checking its signature
 * we look the payment up with PayPlus ourselves, exactly as when the customer's browser comes back.
 */
export async function POST(request: NextRequest) {
  if (process.env.PAYMENT_PROVIDER !== "PAYPLUS") return NextResponse.json({ error: "not enabled" }, { status: 404 });
  const c = payplusConfigFromEnv();
  if (!c.ok) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const provider = createPayPlusProvider(c.config);

  const raw = await request.text();
  if (!provider.verifyCallback(raw, request.headers)) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  let pageRef: string | null = null;
  try {
    const body = JSON.parse(raw) as { transaction?: { payment_request_uid?: unknown } };
    pageRef = typeof body.transaction?.payment_request_uid === "string" ? body.transaction.payment_request_uid : null;
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  if (!pageRef) return NextResponse.json({ ok: true, ignored: "no payment page" });

  const [intent] = await db.select({ id: paymentIntent.id }).from(paymentIntent).where(eq(paymentIntent.hostedPageRef, pageRef));
  // Acknowledge pages that aren't ours so PayPlus stops retrying; nothing changes.
  if (!intent) return NextResponse.json({ ok: true, ignored: "unknown page" });

  const outcome = await resolveAuthorization(db, provider, { intentId: intent.id, appUrl: appUrl() });
  kickDispatch();
  return NextResponse.json({ ok: true, outcome: outcome.kind });
}
