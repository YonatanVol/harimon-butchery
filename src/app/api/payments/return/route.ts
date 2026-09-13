import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/infra/db/client";
import { kickDispatch } from "@/infra/notify/kick";
import { resolveAuthorization } from "@/infra/orders/authorization";
import { appUrl, paymentProvider } from "@/infra/payments/factory";

export const dynamic = "force-dynamic";

/** Where the payment page sends the browser back. The outcome is re-read from the provider here. */
export async function GET(request: NextRequest) {
  const intent = request.nextUrl.searchParams.get("intent") ?? "";
  const base = appUrl();
  if (!z.string().uuid().safeParse(intent).success) return NextResponse.redirect(`${base}/he/cart`);

  const outcome = await resolveAuthorization(db, paymentProvider(), { intentId: intent, appUrl: base });
  kickDispatch();
  switch (outcome.kind) {
    case "APPROVED":
      return NextResponse.redirect(`${base}/${outcome.locale}/orders/${outcome.orderNumber}?t=${outcome.accessToken}&placed=1`);
    case "DECLINED":
      return NextResponse.redirect(`${base}/${outcome.locale}/checkout?declined=${outcome.reason}`);
    case "PENDING":
      return NextResponse.redirect(`${base}/${outcome.locale}/checkout?pending=${intent}`);
    default:
      return NextResponse.redirect(`${base}/he/cart`);
  }
}
