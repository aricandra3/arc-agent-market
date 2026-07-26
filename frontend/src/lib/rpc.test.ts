import { describe, it, expect, vi } from "vitest";
import {
  describeReadError,
  isRateLimitError,
  mapLimit,
  withRpcRetry,
} from "@/lib/rpc";

/** The shape viem surfaces for Arc's quota error. */
const rateLimited = () =>
  Object.assign(new Error("RPC Request failed.\nDetails: request limit reached"), {
    details: "request limit reached",
  });

const noSleep = () => Promise.resolve();

describe("isRateLimitError", () => {
  it("detects the -32011 code", () => {
    expect(isRateLimitError({ code: -32011 })).toBe(true);
  });

  it("detects the message viem wraps it in", () => {
    expect(isRateLimitError(rateLimited())).toBe(true);
    expect(isRateLimitError(new Error("Too Many Requests"))).toBe(true);
    expect(isRateLimitError(new Error("rate limit exceeded"))).toBe(true);
  });

  it("does not flag unrelated failures", () => {
    expect(isRateLimitError(new Error("execution reverted"))).toBe(false);
    expect(isRateLimitError({ code: -32000 })).toBe(false);
    expect(isRateLimitError(null)).toBe(false);
    expect(isRateLimitError(undefined)).toBe(false);
  });
});

describe("withRpcRetry", () => {
  it("returns the first successful result without waiting", async () => {
    const task = vi.fn().mockResolvedValue("ok");
    const sleep = vi.fn(noSleep);

    await expect(withRpcRetry(task, { sleep })).resolves.toBe("ok");
    expect(task).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("retries a rate limit until it succeeds", async () => {
    const task = vi
      .fn()
      .mockRejectedValueOnce(rateLimited())
      .mockRejectedValueOnce(rateLimited())
      .mockResolvedValue("ok");

    await expect(withRpcRetry(task, { sleep: noSleep })).resolves.toBe("ok");
    expect(task).toHaveBeenCalledTimes(3);
  });

  it("backs off exponentially between attempts", async () => {
    const delays: number[] = [];
    const task = vi.fn().mockRejectedValue(rateLimited());

    await expect(
      withRpcRetry(task, {
        attempts: 4,
        baseDelayMs: 100,
        sleep: async (ms) => {
          delays.push(ms);
        },
      }),
    ).rejects.toThrow();

    expect(delays).toEqual([100, 200, 400]);
  });

  it("gives up after the attempt budget and rethrows", async () => {
    const task = vi.fn().mockRejectedValue(rateLimited());

    await expect(
      withRpcRetry(task, { attempts: 2, sleep: noSleep }),
    ).rejects.toThrow(/request limit/i);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("does not retry a non-rate-limit failure", async () => {
    const task = vi.fn().mockRejectedValue(new Error("execution reverted"));

    await expect(withRpcRetry(task, { sleep: noSleep })).rejects.toThrow(
      "execution reverted",
    );
    expect(task).toHaveBeenCalledTimes(1);
  });
});

describe("mapLimit", () => {
  it("preserves input order regardless of completion order", async () => {
    const items = [30, 10, 20, 5];
    const result = await mapLimit(items, 2, async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return ms;
    });
    expect(result).toEqual(items);
  });

  it("never exceeds the concurrency limit", async () => {
    let inFlight = 0;
    let peak = 0;

    await mapLimit(Array.from({ length: 20 }, (_, i) => i), 3, async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 2));
      inFlight--;
    });

    expect(peak).toBe(3);
  });

  it("runs every item exactly once", async () => {
    const seen: number[] = [];
    await mapLimit(Array.from({ length: 25 }, (_, i) => i), 4, async (i) => {
      seen.push(i);
    });
    expect(seen).toHaveLength(25);
    expect(new Set(seen).size).toBe(25);
  });

  it("handles an empty list without spawning workers", async () => {
    const task = vi.fn();
    expect(await mapLimit([], 4, task)).toEqual([]);
    expect(task).not.toHaveBeenCalled();
  });

  it("treats a limit below 1 as sequential", async () => {
    let peak = 0;
    let inFlight = 0;
    await mapLimit([1, 2, 3], 0, async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await Promise.resolve();
      inFlight--;
    });
    expect(peak).toBe(1);
  });

  it("propagates a rejection from any item", async () => {
    await expect(
      mapLimit([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error("boom");
        return n;
      }),
    ).rejects.toThrow("boom");
  });
});

describe("describeReadError", () => {
  it("explains a rate limit and points at the config escape hatch", () => {
    const message = describeReadError(rateLimited());
    expect(message).toMatch(/rate-limiting/i);
    expect(message).toContain("NEXT_PUBLIC_ARC_RPC_URL");
  });

  it("passes through other failures without claiming the network is down", () => {
    const message = describeReadError(new Error("execution reverted"));
    expect(message).toContain("execution reverted");
    expect(message).not.toMatch(/unavailable/i);
  });

  it("falls back for non-error values", () => {
    expect(describeReadError(undefined)).toBe(
      "The read could not be completed.",
    );
  });
});
