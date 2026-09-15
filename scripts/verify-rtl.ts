/**
 * Fails when source code uses physical left/right layout instead of logical start/end.
 * Hebrew is the default direction here, so `pl-4` or `margin-left` is a mirroring bug waiting to happen.
 * A line can opt out with a trailing `rtl-ok` comment and a reason.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..", "src");

const TAILWIND_PHYSICAL =
  /(?<![\w-])(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|scroll-ml|scroll-mr|scroll-pl|scroll-pr|left|right|border-l|border-r|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br|text-left|text-right|float-left|float-right|clear-left|clear-right)(?:-[\w./[\]%]+)?(?![\w-])/;
const CSS_PHYSICAL =
  /\b(?:margin-left|margin-right|padding-left|padding-right|border-left|border-right|text-align:\s*(?:left|right)|float:\s*(?:left|right)|(?<![\w-])left:|(?<![\w-])right:)/;

/** Written content (recipes, product facts) is prose — "250 ml", "turn left" — never class names, so it's not scanned. */
const PROSE_DIRS = new Set([path.join(ROOT, "content")]);

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (PROSE_DIRS.has(full)) continue;
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(tsx|ts|css)$/.test(name)) yield full;
  }
}

/** Only inspect string literals and className-like contexts in TS/TSX, the whole line in CSS. */
function candidates(line: string, isCss: boolean): string[] {
  if (isCss) return [line];
  const strings = line.match(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g) ?? [];
  return strings.map((s) => s.slice(1, -1));
}

const problems: string[] = [];
for (const file of walk(ROOT)) {
  const isCss = file.endsWith(".css");
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (line.includes("rtl-ok")) return;
      for (const text of candidates(line, isCss)) {
        const tokens = isCss ? [text] : text.split(/\s+/);
        for (const token of tokens) {
          const hit = isCss ? CSS_PHYSICAL.exec(token) : TAILWIND_PHYSICAL.exec(token);
          if (hit && (isCss || hit[0] === token)) {
            problems.push(`${path.relative(process.cwd(), file)}:${i + 1}  "${hit[0]}"`);
          }
        }
      }
    });
}

if (problems.length) {
  console.error("✗ Physical left/right layout found. Use logical start/end (ps-/pe-/ms-/me-/start-/end-):");
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log("✓ RTL check: no physical left/right layout in src/");
