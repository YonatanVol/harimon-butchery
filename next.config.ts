import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // A stray package-lock.json in the home directory otherwise makes Turbopack guess the wrong root.
  turbopack: { root: path.join(__dirname) },
};

export default withNextIntl(nextConfig);
