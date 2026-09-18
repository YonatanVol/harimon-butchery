import { ImageResponse } from "next/og";
import { brandMark } from "@/ui/brandMark";

/** The icon iOS uses when the shop is added to the home screen. iOS rounds the corners itself. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(brandMark({ size: 180, pad: 14 }), size);
}
