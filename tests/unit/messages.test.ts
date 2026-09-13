import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import he from "@/i18n/messages/he.json";

type Tree = { [key: string]: string | Tree };

function leaves(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.set(path, v);
    else for (const [p, s] of leaves(v, path)) out.set(p, s);
  }
  return out;
}

const heKeys = leaves(he as Tree);
const enKeys = leaves(en as Tree);
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\s*[,}]/g)].map((m) => m[1]).filter((p, i, a) => a.indexOf(p) === i).sort();

describe("messages", () => {
  it("Hebrew and English have exactly the same keys", () => {
    expect([...heKeys.keys()].filter((k) => !enKeys.has(k))).toEqual([]);
    expect([...enKeys.keys()].filter((k) => !heKeys.has(k))).toEqual([]);
  });

  it("both languages use the same placeholders, so no value silently goes missing", () => {
    const mismatched = [...heKeys].filter(([k, v]) => enKeys.has(k) && placeholders(v).join() !== placeholders(enKeys.get(k)!).join()).map(([k]) => k);
    expect(mismatched).toEqual([]);
  });

  it("every literal t(\"…\") key used in the code exists", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(name)) files.push(p);
      }
    };
    walk("src");
    const missing: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      // useTranslations("ns") / getTranslations("ns") paired with t("key") in the same file.
      const namespaces = [...src.matchAll(/(?:useTranslations|getTranslations)\(\s*(?:\{[^}]*namespace:\s*)?"([\w.]+)"/g)].map((m) => m[1]);
      const rootT = /(?:useTranslations|getTranslations)\(\s*\)/.test(src);
      for (const m of src.matchAll(/\bt\(\s*"([\w.]+)"/g)) {
        const key = m[1];
        const candidates = [...namespaces.map((ns) => `${ns}.${key}`), ...(rootT || namespaces.length === 0 ? [key] : [])];
        const isPrefix = (c: string) => [...heKeys.keys()].some((k) => k.startsWith(`${c}.`));
        if (!candidates.some((c) => heKeys.has(c) || isPrefix(c))) missing.push(`${file}: ${key}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
