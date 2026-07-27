import { describe, it, expect } from "vitest";
import { parseUnits } from "viem";
import {
  MAX_REASON_LENGTH,
  MIN_REASON_LENGTH,
  describeDisputeWindow,
  parseRequesterPercent,
  splitDisputedBudget,
  validateDisputeReason,
} from "@/lib/dispute";

const usdc = (amount: string) => parseUnits(amount, 6);

describe("validateDisputeReason", () => {
  it("accepts a reason long enough to be actionable", () => {
    expect(validateDisputeReason("Deliverable is empty")).toEqual({
      ok: true,
      reason: "Deliverable is empty",
    });
  });

  it("trims before measuring, so padding cannot pass the minimum", () => {
    const padded = `${" ".repeat(40)}short${" ".repeat(40)}`;
    expect(validateDisputeReason(padded).ok).toBe(false);
  });

  it("rejects a reason too short for the resolver to act on", () => {
    const result = validateDisputeReason("bad");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(String(MIN_REASON_LENGTH));
  });

  it("rejects a reason beyond the calldata cap", () => {
    const result = validateDisputeReason("x".repeat(MAX_REASON_LENGTH + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(String(MAX_REASON_LENGTH));
  });
});

describe("parseRequesterPercent", () => {
  it("accepts the whole range the contract allows", () => {
    for (const value of ["0", "50", "100"]) {
      expect(parseRequesterPercent(value)).toEqual({
        ok: true,
        percent: Number(value),
      });
    }
  });

  it("refuses fractions rather than rounding someone's money away", () => {
    const result = parseRequesterPercent("50.5");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/whole percentages/i);
  });

  it("rejects values the contract would revert on", () => {
    for (const value of ["101", "-1", "abc", "", "  "]) {
      expect(parseRequesterPercent(value).ok, `input ${value}`).toBe(false);
    }
  });
});

describe("splitDisputedBudget", () => {
  it("splits a clean budget as expected", () => {
    const split = splitDisputedBudget(usdc("100"), 40);
    expect(split.requesterShare).toBe(usdc("40"));
    expect(split.providerShare).toBe(usdc("60"));
    expect(split.requesterLabel).toBe("40.00 USDC");
    expect(split.providerLabel).toBe("60.00 USDC");
  });

  it("awards everything to one side at the extremes", () => {
    const all = splitDisputedBudget(usdc("75"), 100);
    expect(all.requesterShare).toBe(usdc("75"));
    expect(all.providerShare).toBe(BigInt(0));

    const none = splitDisputedBudget(usdc("75"), 0);
    expect(none.requesterShare).toBe(BigInt(0));
    expect(none.providerShare).toBe(usdc("75"));
  });

  it("never strands dust: the shares always sum to the budget", () => {
    // 1 wei-of-USDC amounts and odd percentages are where truncation bites.
    for (const budget of [BigInt(1), BigInt(7), usdc("0.000003"), usdc("33.33")]) {
      for (const percent of [1, 33, 49, 50, 67, 99]) {
        const split = splitDisputedBudget(budget, percent);
        expect(
          split.requesterShare + split.providerShare,
          `budget ${budget} at ${percent}%`,
        ).toBe(budget);
      }
    }
  });

  it("truncates the requester's share, matching the contract's integer division", () => {
    // 7 * 33 / 100 = 2.31 → the contract keeps 2 and the remainder goes to the provider.
    const split = splitDisputedBudget(BigInt(7), 33);
    expect(split.requesterShare).toBe(BigInt(2));
    expect(split.providerShare).toBe(BigInt(5));
  });
});

describe("describeDisputeWindow", () => {
  const now = 1_700_000_000;

  it("reports the window as not yet open before submission", () => {
    const result = describeDisputeWindow(BigInt(0), now);
    expect(result.open).toBe(false);
    expect(result.label).toMatch(/once a deliverable is submitted/i);
  });

  it("counts down in days, hours, then minutes", () => {
    expect(describeDisputeWindow(BigInt(now + 3 * 86400), now).label).toBe(
      "3 days left to dispute",
    );
    expect(describeDisputeWindow(BigInt(now + 86400), now).label).toBe(
      "1 day left to dispute",
    );
    expect(describeDisputeWindow(BigInt(now + 5 * 3600), now).label).toBe(
      "5 hours left to dispute",
    );
    expect(describeDisputeWindow(BigInt(now + 3600), now).label).toBe(
      "1 hour left to dispute",
    );
    expect(describeDisputeWindow(BigInt(now + 600), now).label).toBe(
      "10 minutes left to dispute",
    );
  });

  it("never counts down to zero minutes while still open", () => {
    const result = describeDisputeWindow(BigInt(now + 5), now);
    expect(result.open).toBe(true);
    expect(result.label).toBe("1 minute left to dispute");
  });

  it("closes the window once the deadline passes", () => {
    for (const offset of [0, -1, -86400]) {
      const result = describeDisputeWindow(BigInt(now + offset), now);
      expect(result.open, `offset ${offset}`).toBe(false);
      expect(result.label).toBe("Dispute window closed");
    }
  });
});
