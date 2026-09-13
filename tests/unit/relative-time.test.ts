import { describe, expect, it } from "vitest";
import { tidyRelative } from "@/i18n/relativeTime";

describe("relative time in Hebrew", () => {
  const he = new Intl.RelativeTimeFormat("he", { numeric: "auto" });

  it("drops the bracketed number CLDR adds to dual forms", () => {
    expect(tidyRelative(he.format(2, "hour"))).toBe("בעוד שעתיים");
    expect(tidyRelative(he.format(-2, "hour"))).toBe("לפני שעתיים");
    expect(tidyRelative(he.format(1, "hour"))).toBe("בעוד שעה");
  });

  it("leaves ordinary plurals and English alone", () => {
    expect(tidyRelative(he.format(3, "hour"))).toBe("בעוד 3 שעות");
    expect(tidyRelative(new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(2, "hour"))).toBe("in 2 hours");
  });
});
