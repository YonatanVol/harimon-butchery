import { describe, expect, it } from "vitest";
import {
  averageTenths,
  displayNameOf,
  formatTenths,
  MAX_BODY_CHARS,
  reviewGate,
  starsOf,
  summarize,
  validateReview,
} from "@/domain/catalog/reviews";

describe("validateReview", () => {
  it("accepts a whole star and a real sentence", () => {
    const r = validateReview({ rating: 5, body: "  צלינו על גריל, יצא מצוין.  " });
    expect(r).toEqual({ ok: true, value: { rating: 5, body: "צלינו על גריל, יצא מצוין." } });
  });

  it("refuses a rating outside one to five", () => {
    for (const rating of [0, 6, -1, 2.5]) {
      const r = validateReview({ rating, body: "טעים מאוד, נקנה שוב" });
      expect(r.ok === false && r.problem.key).toBe("RATING_INVALID");
    }
  });

  it("refuses a body that says nothing, and one that never ends", () => {
    expect(validateReview({ rating: 4, body: "טעים" }).ok).toBe(false);
    expect(validateReview({ rating: 4, body: "א".repeat(MAX_BODY_CHARS + 1) }).ok).toBe(false);
    expect(validateReview({ rating: 4, body: "א".repeat(MAX_BODY_CHARS) }).ok).toBe(true);
  });

  it("collapses runs of blank lines instead of rejecting them", () => {
    const r = validateReview({ rating: 4, body: "שורה ראשונה\n\n\n\nשורה שנייה" });
    expect(r.ok && r.value.body).toBe("שורה ראשונה\n\nשורה שנייה");
  });
});

describe("displayNameOf", () => {
  it("shows a first name and one initial", () => {
    expect(displayNameOf("יונתן", "וולסקי")).toBe("יונתן ו.");
    expect(displayNameOf("Dana Bar", "Levi")).toBe("Dana L.");
  });

  it("never shows an empty name", () => {
    expect(displayNameOf("", "")).toBe("—");
    expect(displayNameOf("", "כהן")).toBe("כ.");
    expect(displayNameOf("רותם", "")).toBe("רותם");
  });
});

describe("summarize", () => {
  it("counts, averages in tenths and keeps the distribution", () => {
    const s = summarize([5, 4, 5, 3]);
    expect(s.count).toBe(4);
    expect(s.averageTenths).toBe(43);
    expect(s.distribution).toEqual({ 1: 0, 2: 0, 3: 1, 4: 1, 5: 2 });
  });

  it("is empty for no reviews, and ignores ratings it cannot trust", () => {
    expect(summarize([]).averageTenths).toBe(0);
    expect(summarize([]).count).toBe(0);
    expect(summarize([5, 9, 0]).count).toBe(1);
  });
});

describe("averageTenths", () => {
  it("matches summarize when it works from totals the database counted", () => {
    const ratings = [5, 4, 5, 3];
    expect(averageTenths(ratings.length, ratings.reduce((a, b) => a + b, 0))).toBe(summarize(ratings).averageTenths);
  });

  it("is zero with nothing to average", () => {
    expect(averageTenths(0, 0)).toBe(0);
  });
});

describe("stars", () => {
  it("formats tenths for people and for search engines", () => {
    expect(formatTenths(43)).toBe("4.3");
    expect(formatTenths(50)).toBe("5.0");
  });

  it("draws a half star only in the middle of one", () => {
    expect(starsOf(42)).toEqual({ full: 4, half: false, empty: 1 });
    expect(starsOf(45)).toEqual({ full: 4, half: true, empty: 0 });
    expect(starsOf(48)).toEqual({ full: 5, half: false, empty: 0 });
    expect(starsOf(50)).toEqual({ full: 5, half: false, empty: 0 });
    expect(starsOf(0)).toEqual({ full: 0, half: false, empty: 5 });
  });
});

describe("reviewGate", () => {
  const now = new Date("2026-09-18T10:00:00Z");
  const delivered = new Date("2026-09-10T10:00:00Z");

  it("lets a delivered order be reviewed once", () => {
    expect(reviewGate({ status: "DELIVERED", deliveredAt: delivered, alreadyReviewed: false, now })).toEqual({ kind: "ALLOWED" });
    expect(reviewGate({ status: "CLOSED", deliveredAt: delivered, alreadyReviewed: false, now })).toEqual({ kind: "ALLOWED" });
    expect(reviewGate({ status: "DELIVERED", deliveredAt: delivered, alreadyReviewed: true, now }).kind).toBe("ALREADY_REVIEWED");
  });

  it("refuses an order that has not arrived", () => {
    expect(reviewGate({ status: "PACKED", deliveredAt: null, alreadyReviewed: false, now }).kind).toBe("NOT_DELIVERED");
  });

  it("closes the window three months after delivery", () => {
    const old = new Date("2026-05-01T10:00:00Z");
    expect(reviewGate({ status: "DELIVERED", deliveredAt: old, alreadyReviewed: false, now }).kind).toBe("WINDOW_CLOSED");
  });
});
