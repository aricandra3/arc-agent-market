import { describe, it, expect } from "vitest";
import {
  MAX_SCORE_BPS,
  formatScorePercent,
  parseScorePercent,
  validateReview,
} from "@/lib/review";

describe("validateReview", () => {
  it("accepts each rating the contract allows", () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      expect(validateReview(rating, "good")).toEqual({
        ok: true,
        rating,
        comment: "good",
      });
    }
  });

  it("trims the comment and allows it to be empty", () => {
    expect(validateReview(4, "   spaced   ")).toMatchObject({
      comment: "spaced",
    });
    expect(validateReview(4, "")).toEqual({ ok: true, rating: 4, comment: "" });
  });

  it("rejects ratings outside 1-5, which the contract would revert on", () => {
    for (const rating of [0, 6, -1, 2.5, Number.NaN]) {
      expect(validateReview(rating, "").ok, `rating ${rating}`).toBe(false);
    }
  });

  it("rejects a comment long enough to be an expensive mistake", () => {
    const result = validateReview(5, "x".repeat(501));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/500/);
  });
});

describe("parseScorePercent", () => {
  it("converts a percentage to basis points", () => {
    expect(parseScorePercent("100")).toEqual({ ok: true, bps: MAX_SCORE_BPS });
    expect(parseScorePercent("94")).toEqual({ ok: true, bps: 9400 });
    expect(parseScorePercent("0")).toEqual({ ok: true, bps: 0 });
  });

  it("keeps two decimals of precision", () => {
    expect(parseScorePercent("87.65")).toEqual({ ok: true, bps: 8765 });
    // Beyond two decimals the contract has no room, so it rounds.
    expect(parseScorePercent("87.654")).toEqual({ ok: true, bps: 8765 });
  });

  it("rejects values the contract would reject", () => {
    for (const input of ["101", "-1", "abc", "", "   "]) {
      expect(parseScorePercent(input).ok, `input ${input}`).toBe(false);
    }
  });
});

describe("formatScorePercent", () => {
  it("renders whole percentages without decimals", () => {
    expect(formatScorePercent(9400)).toBe("94%");
    expect(formatScorePercent(10000)).toBe("100%");
    expect(formatScorePercent(0)).toBe("0%");
  });

  it("keeps decimals when the score has them", () => {
    expect(formatScorePercent(8765)).toBe("87.65%");
  });

  it("accepts the bigint the contract returns", () => {
    expect(formatScorePercent(BigInt(9400))).toBe("94%");
  });
});
