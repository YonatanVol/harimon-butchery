import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.join(import.meta.dirname, "..", "..", "src");

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : /\.tsx?$/.test(name) ? [full] : [];
  });
}

function importsOf(file: string): string[] {
  const source = readFileSync(file, "utf8");
  const found = [...source.matchAll(/(?:import|export)\s[^'"]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)];
  return found.map((m) => m[1] ?? m[2]);
}

describe("architecture", () => {
  it("src/domain is pure: no infra, framework, React, or I/O imports", () => {
    const forbidden = [/^@\/(?!domain\/)/, /^next(\/|$)/, /^next-intl/, /^react(\/|$|-dom)/, /^node:/, /^postgres$/, /^drizzle-orm/, /infra\//];
    const violations: string[] = [];
    for (const file of filesUnder(path.join(SRC, "domain"))) {
      for (const spec of importsOf(file)) {
        if (forbidden.some((re) => re.test(spec))) {
          violations.push(`${path.relative(SRC, file)} imports "${spec}"`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("client components import server code only as types or server actions", () => {
    const violations: string[] = [];
    const clientFiles = filesUnder(SRC).filter((f) => /^\s*["']use client["']/.test(readFileSync(f, "utf8")));
    for (const file of clientFiles) {
      const source = readFileSync(file, "utf8");
      for (const m of source.matchAll(/import\s+(type\s+)?[^'"]*?from\s+["'](@\/infra\/[^"']+|\.{1,2}\/[^"']*infra\/[^"']+)["']/g)) {
        const [, typeOnly, spec] = m;
        if (typeOnly) continue;
        const target = path.join(SRC, spec.replace(/^@\//, "")).replace(/$/, "");
        const candidates = [`${target}.ts`, `${target}.tsx`];
        const isServerActions = candidates.some((c) => {
          try {
            return /^\s*["']use server["']/.test(readFileSync(c, "utf8"));
          } catch {
            return false;
          }
        });
        if (!isServerActions) violations.push(`${path.relative(SRC, file)} imports values from "${spec}"`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("no floating-point money helpers are used in src/domain", () => {
    const violations: string[] = [];
    for (const file of filesUnder(path.join(SRC, "domain"))) {
      const source = readFileSync(file, "utf8");
      for (const banned of ["parseFloat", ".toFixed(", "Number.parseFloat"]) {
        if (source.includes(banned)) violations.push(`${path.relative(SRC, file)} uses ${banned}`);
      }
    }
    expect(violations).toEqual([]);
  });
});
