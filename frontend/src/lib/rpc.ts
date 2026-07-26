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

export type RetryOptions = {
  /** Total attempts, including the first. */
  attempts?: number;
  /** Delay before the second attempt, doubled each time after. */
  baseDelayMs?: number;
  /** Injected in tests to avoid real waiting. */
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Runs `task`, retrying only when the failure is a rate limit. Other errors
 * propagate immediately — retrying a reverted call or a bad address is pointless.
 */
export async function withRpcRetry<T>(
  task: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = options.attempts ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 600;
  const sleep = options.sleep ?? defaultSleep;

  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (!isRateLimitError(error) || attempt === attempts - 1) throw error;
      await sleep(baseDelayMs * 2 ** attempt);
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
