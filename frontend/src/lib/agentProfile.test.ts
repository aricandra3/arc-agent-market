import { describe, it, expect } from "vitest";
import { parseUnits } from "viem";
import {
  formatRateInput,
  parseRate,
  parseSkills,
} from "@/lib/agentProfile";

describe("parseRate", () => {
  it("reads a decimal rate exactly", () => {
    expect(parseRate("5")).toEqual({ ok: true, value: parseUnits("5", 6) });
    expect(parseRate("0.01")).toEqual({ ok: true, value: parseUnits("0.01", 6) });
    expect(parseRate("1234.567891")).toEqual({
      ok: true,
      value: BigInt(1_234_567_891),
    });
  });

  it("does not lose units the way float multiplication does", () => {
    // Math.floor(1.005 * 1e6) === 1004999 — the bug this replaces.
    const result = parseRate("1.005");
    expect(result).toEqual({ ok: true, value: BigInt(1_005_000) });
    expect(BigInt(Math.floor(1.005 * 1_000_000))).toBe(BigInt(1_004_999));
  });

  it("refuses precision USDC cannot represent, rather than rounding it away", () => {
    // parseUnits would silently round 1.1234567 to 1123457.
    const result = parseRate("1.1234567");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/6 decimals/);
  });

  it("refuses an amount that would round down to zero", () => {
    expect(parseRate("0.0000001").ok).toBe(false);
    expect(parseRate("0").ok).toBe(false);
    expect(parseRate("0.000000").ok).toBe(false);
  });

  it("refuses negatives, exponents, and junk", () => {
    for (const input of ["-1", "1e3", "abc", "1,5", ".", "", "  "]) {
      expect(parseRate(input).ok, `input ${JSON.stringify(input)}`).toBe(false);
    }
  });

  it("names the field in its error, so a form can show two rates", () => {
    const result = parseRate("", "Per-call rate");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Per-call rate");
  });
});

describe("parseSkills", () => {
  it("splits, trims, and lowercases", () => {
    expect(parseSkills(" Solidity , Testing ")).toEqual({
      ok: true,
      skills: ["solidity", "testing"],
    });
  });

  it("collapses duplicates that would split the skill index", () => {
    // The registry indexes by exact string, so these would be two buckets.
    expect(parseSkills("Testing, testing, TESTING")).toEqual({
      ok: true,
      skills: ["testing"],
    });
  });

  it("drops empty entries from trailing or doubled commas", () => {
    expect(parseSkills("solidity,,audit,")).toEqual({
      ok: true,
      skills: ["solidity", "audit"],
    });
  });

  it("requires at least one skill, which the registry enforces too", () => {
    for (const input of ["", "   ", ",,,"]) {
      const result = parseSkills(input);
      expect(result.ok, `input ${JSON.stringify(input)}`).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/at least one skill/i);
    }
  });
});

describe("formatRateInput", () => {
  it("round-trips through parseRate", () => {
    for (const input of ["5", "0.01", "1.005", "1234.567891", "0.000001"]) {
      const parsed = parseRate(input);
      if (!parsed.ok) throw new Error(`${input} should parse`);
      expect(formatRateInput(parsed.value)).toBe(input);
    }
  });

  it("drops trailing zeros rather than showing 5.000000", () => {
    expect(formatRateInput(parseUnits("5", 6))).toBe("5");
    expect(formatRateInput(parseUnits("5.10", 6))).toBe("5.1");
  });

  it("renders sub-unit amounts with a leading zero", () => {
    expect(formatRateInput(BigInt(1))).toBe("0.000001");
    expect(formatRateInput(BigInt(0))).toBe("0");
  });
});
