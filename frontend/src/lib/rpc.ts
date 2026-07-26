/**
 * Rate-limit handling for the shared Arc RPC.
 *
 * The public endpoint answers `-32011 "request limit reached"` once a per-IP
 * quota is exhausted, and it counts individual calls — batching does not help.
 * Reads must therefore back off and retry rather than surface the failure as
 * "the network is down", which is what a bare error looks like to a user.
 */

const RATE_LIMIT_CODE = -32011;

export function isRateLimitError(error: unknown): boolean {
  if (!error) return false;

  const code = (error as { code?: unknown }).code;
  if (code === RATE_LIMIT_CODE) return true;

  // viem wraps the RPC error, so the code is not always on the outer object.
  const text = [
    (error as { message?: unknown }).message,
    (error as { details?: unknown }).details,
    (error as { shortMessage?: unknown }).shortMessage,
  ]
    .filter((part): part is string => typeof part === "string")
    .join(" ")
    .toLowerCase();

  return (
    text.includes("request limit") ||
    text.includes("rate limit") ||
    text.includes("too many requests") ||
    text.includes(String(RATE_LIMIT_CODE))
  );
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Fixed-window rate limiter.
 *
 * Measured against the public Arc endpoint: roughly three calls per second, and
 * it recovers within about a second. Per-call-site concurrency caps do not
 * compose — a page reading a list at 3-in-flight plus one component read is 4 —
 * so every read is paced through one shared gate instead.
 */
export function createRateLimiter(options: {
  capacity: number;
  windowMs: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}) {
  const { capacity, windowMs } = options;
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? defaultSleep;

  let windowStart = -Infinity;
  let usedInWindow = 0;
  // Serializes admission so concurrent callers cannot all observe the same
  // free slot and pile in together.
  let gate: Promise<void> = Promise.resolve();

  async function admit(): Promise<void> {
    for (;;) {
      const current = now();
      if (current - windowStart >= windowMs) {
        windowStart = current;
        usedInWindow = 0;
      }
      if (usedInWindow < capacity) {
        usedInWindow += 1;
        return;
      }
      await sleep(Math.max(1, windowStart + windowMs - current));
    }
  }

  return {
    acquire(): Promise<void> {
      const turn = gate.then(admit);
      // Keep the chain alive regardless of outcome so one failure cannot wedge it.
      gate = turn.then(
        () => undefined,
        () => undefined,
      );
      return turn;
    },
  };
}

/** Shared gate for every contract read. Tuned to the measured public quota. */
export const readLimiter = createRateLimiter({ capacity: 3, windowMs: 1100 });

/**
 * Up to 25% of the backoff, added to spread simultaneous retries apart.
 * Math.random is fine here: this only affects timing, never correctness, and
 * tests inject their own sleep so they never observe it.
 */
function jitter(backoffMs: number): number {
  return Math.floor(Math.random() * backoffMs * 0.25);
}

export type RetryOptions = {
  /** Total attempts, including the first. */
  attempts?: number;
  /** Delay before the second attempt, doubled each time after. */
  baseDelayMs?: number;
  /** Injected in tests to avoid real waiting. */
  sleep?: (ms: number) => Promise<void>;
};

/**
 * Runs `task`, retrying only when the failure is a rate limit. Other errors
 * propagate immediately — retrying a reverted call or a bad address is pointless.
 */
export async function withRpcRetry<T>(
  task: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = options.attempts ?? 6;
  // The measured quota window is ~1.1s, so the first wait already clears one
  // full window instead of retrying inside it.
  const baseDelayMs = options.baseDelayMs ?? 1200;
  const sleep = options.sleep ?? defaultSleep;

  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (!isRateLimitError(error) || attempt === attempts - 1) throw error;
      // Jitter so concurrent callers that were throttled together do not all
      // wake at the same instant and trip the limit again.
      const backoff = baseDelayMs * 2 ** attempt;
      await sleep(backoff + jitter(backoff));
    }
  }

  throw lastError;
}

/**
 * Maps `items` through `task` with at most `limit` in flight.
 *
 * List views read one record per item. Firing them all at once trips the
 * per-IP quota outright, so retrying afterwards is treating the symptom —
 * bounding concurrency avoids provoking it in the first place.
 */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const size = Math.max(1, Math.floor(limit));
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, worker),
  );

  return results;
}

/** Default in-flight cap for list reads against the shared public RPC. */
export const READ_CONCURRENCY = 3;

/** Message worth showing a user for a failed read. */
export function describeReadError(error: unknown): string {
  if (isRateLimitError(error)) {
    return "The public Arc RPC is rate-limiting this IP. Wait a moment and retry, or point NEXT_PUBLIC_ARC_RPC_URL at a dedicated endpoint.";
  }
  const message = error instanceof Error ? error.message : "";
  return message
    ? `Read failed: ${message.split("\n")[0]}`
    : "The read could not be completed.";
}
