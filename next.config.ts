import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // A stray package-lock.json in the home directory otherwise makes Turbopack guess the wrong root.
  turbopack: { root: path.resolve(process.cwd()) },
  // End-to-end runs build into their own folder so they never disturb a running dev or production server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default withNextIntl(nextConfig);
