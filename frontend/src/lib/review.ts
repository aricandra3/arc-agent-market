/**
 * Review and verification input rules, kept out of the components so they can
 * be tested without rendering.
 */

export const MIN_RATING = 1;
export const MAX_RATING = 5;

/** `WorkReceipt.MAX_SCORE` — scores are basis points, so 10000 is 100%. */
export const MAX_SCORE_BPS = 10000;

export type ReviewDraft =
  | { ok: true; rating: number; comment: string }
  | { ok: false; error: string };

/**
 * Reputation.submitReview takes a uint8 rating of 1-5 and rejects anything else,
 * so a bad value must be caught before it costs a wallet round-trip.
 */
export function validateReview(rating: number, comment: string): ReviewDraft {
  if (!Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) {
    return {
      ok: false,
      error: `Pick a rating between ${MIN_RATING} and ${MAX_RATING} stars.`,
    };
  }

  const trimmed = comment.trim();
  if (trimmed.length > 500) {
    return {
      ok: false,
      error: "Keep the comment under 500 characters — it is stored on chain.",
    };
  }

  return { ok: true, rating, comment: trimmed };
}

export type ScoreDraft =
  | { ok: true; bps: number }
  | { ok: false; error: string };

/**
 * Converts a percentage as typed by a verifier into the basis points the
 * contract stores. Two decimals is the full precision available: 10000 bps
 * across 100% means 0.01% per unit.
 */
export function parseScorePercent(input: string): ScoreDraft {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Enter a score between 0 and 100." };

  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return { ok: false, error: "Score must be between 0 and 100." };
  }

  const bps = Math.round(value * 100);
  if (bps > MAX_SCORE_BPS) {
    return { ok: false, error: "Score must be between 0 and 100." };
  }

  return { ok: true, bps };
}

/** Formats a basis-point score the way the contract stores it. */
export function formatScorePercent(bps: number | bigint): string {
  const numeric = typeof bps === "bigint" ? Number(bps) : bps;
  return `${(numeric / 100).toFixed(numeric % 100 === 0 ? 0 : 2)}%`;
}
