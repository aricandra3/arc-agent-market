import { describe, it, expect } from "vitest";
import {
  ZERO_ADDRESS,
  formatUSDC,
  formatPercentBps,
  formatDate,
  shortAddress,
  isUserRejectedError,
} from "@/lib/contracts";

describe("formatUSDC", () => {
  it("formats 6-decimal USDC amounts to 2 places", () => {
    expect(formatUSDC(1_500_000n)).toBe("1.50");
    expect(formatUSDC(0n)).toBe("0.00");
    expect(formatUSDC(12_340_000n)).toBe("12.34");
  });

  it("rounds to two decimals", () => {
    expect(formatUSDC(1_005_000n)).toBe("1.00");
  });
});

describe("formatPercentBps", () => {
  it("converts basis points to a one-decimal percent", () => {
    expect(formatPercentBps(9000n)).toBe("90.0%");
    expect(formatPercentBps(8550)).toBe("85.5%");
    expect(formatPercentBps(0n)).toBe("0.0%");
  });
});

describe("shortAddress", () => {
  const addr = "0x1234567890abcdef1234567890abcdef12345678";

  it("truncates the middle of an address", () => {
    expect(shortAddress(addr)).toBe("0x1234...5678");
  });

  it("respects custom start/end lengths", () => {
    expect(shortAddress(addr, 4, 6)).toBe("0x12...345678");
  });

  it("returns 'Open' for the zero address or empty input", () => {
    expect(shortAddress(ZERO_ADDRESS)).toBe("Open");
    expect(shortAddress("")).toBe("Open");
  });

  it("returns short strings unchanged", () => {
    expect(shortAddress("0xabcd")).toBe("0xabcd");
  });
});

describe("isUserRejectedError", () => {
  it("detects wallet rejection messages", () => {
    expect(isUserRejectedError(new Error("User rejected the request"))).toBe(
      true,
    );
    expect(isUserRejectedError(new Error("MetaMask: User denied"))).toBe(true);
  });

  it("returns false for unrelated or non-error values", () => {
    expect(isUserRejectedError(new Error("network timeout"))).toBe(false);
    expect(isUserRejectedError("nope")).toBe(false);
    expect(isUserRejectedError(undefined)).toBe(false);
  });
});

describe("formatDate", () => {
  it("formats a unix-seconds bigint to a readable date", () => {
    // 2021-06-15T12:00:00Z (mid-day so the result is timezone-stable)
    const result = formatDate(1623758400n);
    expect(result).toMatch(/^Jun \d{1,2}, 2021$/);
  });
});
