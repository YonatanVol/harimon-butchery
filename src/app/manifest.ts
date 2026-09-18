import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";

/**
 * What a phone needs to keep the shop on its home screen: the name, the mark, and the two colours it
 * paints around the page. Hebrew, because that is the shop's language; the English site is the same app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name.he,
    short_name: brand.name.he,
    description: brand.tagline.he,
    // Straight into Hebrew, the way the site itself opens.
    start_url: "/he",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    dir: "rtl",
    lang: "he",
    background_color: "#f3f0ea",
    theme_color: "#f3f0ea",
    categories: ["food", "shopping"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
