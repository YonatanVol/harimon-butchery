import { describe, expect, it } from "vitest";
import { resolveAppUrl, resolveIdleTimeout, resolvePoolMax } from "@/infra/runtimeEnv";

describe("resolveAppUrl", () => {
  it("prefers APP_URL and drops a trailing slash", () => {
    expect(resolveAppUrl({ APP_URL: "https://shop.example/", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" })).toBe("https://shop.example");
  });
  it("uses the Vercel production domain when APP_URL is not set", () => {
    expect(resolveAppUrl({ VERCEL_PROJECT_PRODUCTION_URL: "harimon-butchery.vercel.app" })).toBe("https://harimon-butchery.vercel.app");
  });
  it("falls back to the local dev server", () => {
    expect(resolveAppUrl({})).toBe("http://localhost:3000");
  });
});

describe("resolvePoolMax", () => {
  it("honours DB_POOL_MAX", () => {
    expect(resolvePoolMax({ DB_POOL_MAX: "5", VERCEL: "1" })).toBe(5);
  });
  it("is small on Vercel and larger elsewhere", () => {
    expect(resolvePoolMax({ VERCEL: "1" })).toBe(3);
    expect(resolvePoolMax({})).toBe(10);
  });
  it("ignores nonsense values", () => {
    expect(resolvePoolMax({ DB_POOL_MAX: "0" })).toBe(10);
    expect(resolvePoolMax({ DB_POOL_MAX: "abc", VERCEL: "1" })).toBe(3);
  });
});

describe("resolveIdleTimeout", () => {
  it("closes idle connections quickly on Vercel", () => {
    expect(resolveIdleTimeout({ VERCEL: "1" })).toBe(5);
    expect(resolveIdleTimeout({})).toBe(30);
  });
});
