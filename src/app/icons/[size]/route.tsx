import { ImageResponse } from "next/og";
import { brandMark } from "@/ui/brandMark";

/** The home-screen icons the web app manifest asks for. Drawn once at build time, never per request. */
export const dynamic = "force-static";

const SIZES = [192, 512] as const;

export function generateStaticParams() {
  return SIZES.map((size) => ({ size: String(size) }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = SIZES.find((s) => String(s) === raw);
  if (!size) return new Response("Not found", { status: 404 });

  // A tenth of the icon is left clear so Android can crop it to a circle without cutting the fruit.
  return new ImageResponse(brandMark({ size, pad: Math.round(size * 0.1) }), { width: size, height: size });
}
