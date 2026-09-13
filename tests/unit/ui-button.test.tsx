import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "@/ui/primitives/Button";

describe("Button", () => {
  it("is enabled by default and renders no reason", () => {
    const html = renderToStaticMarkup(<Button>הוסף לסל</Button>);
    expect(html).not.toMatch(/<button[^>]*\sdisabled=""/);
    expect(html).not.toContain("aria-disabled");
    expect(html).not.toContain("data-disabled-reason");
  });

  it("can only be disabled by giving a reason, which is visible and linked for screen readers", () => {
    const html = renderToStaticMarkup(<Button disabledReason="אזל מהמלאי — חוזר ביום ג׳">הוסף לסל</Button>);
    expect(html).toMatch(/<button[^>]*disabled=""/);
    expect(html).toContain("אזל מהמלאי — חוזר ביום ג׳");
    const describedBy = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(describedBy).toBeTruthy();
    expect(html).toContain(`id="${describedBy}"`);
  });

  it("has no way to be disabled silently", () => {
    // @ts-expect-error — `disabled` is intentionally not a prop.
    const html = renderToStaticMarkup(<Button disabled>x</Button>);
    // A stray `disabled` must not disable the control without a visible reason.
    expect(html).not.toMatch(/<button[^>]*disabled=""/);
    expect(html).not.toContain("data-disabled-reason");
  });

  it("shows what is happening while pending", () => {
    const html = renderToStaticMarkup(<Button pendingLabel="שומר…">שמור</Button>);
    expect(html).toContain("שומר…");
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain(">שמור<");
  });
});
