import { NextResponse } from "next/server";
import { cartSummary } from "@/infra/cart/repository";
import { readCartToken } from "@/infra/cart/session";

export const dynamic = "force-dynamic";

/** Line count for the header cart button. The header itself stays static and cached. */
export async function GET() {
  const summary = await cartSummary(await readCartToken());
  return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
}
