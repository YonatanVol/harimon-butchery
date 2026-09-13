import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.join(import.meta.dirname, "src"),
      // `server-only` guards Next bundles; in Node tests it is just a marker.
      "server-only": path.join(import.meta.dirname, "tests/integration/support/server-only-stub.ts"),
    },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/integration/support/env.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
