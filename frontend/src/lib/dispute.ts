import { formatUSDC } from "@/lib/contracts";

/**
 * Dispute input rules and split arithmetic, kept out of the components so the
 * money maths can be tested without rendering anything.
 */

/** A reason is what the resolver actually reads, so an empty one is useless. */
export const MIN_REASON_LENGTH = 12;
/** Stored in an event, not storage, but still paid for as calldata. */
export const MAX_REASON_LENGTH = 600;

export type ReasonDraft =
  | { ok: true; reason: string }
  | { ok: false; error: string };

export function validateDisputeReason(input: string): ReasonDraft {
  const reason = input.trim();

  if (reason.length < MIN_REASON_LENGTH) {
    return {
      ok: false,
      error: `Describe the problem in at least ${MIN_REASON_LENGTH} characters — this is what the resolver reads.`,
    };
  }
  if (reason.length > MAX_REASON_LENGTH) {
    return {
      ok: false,
      error: `Keep the reason under ${MAX_REASON_LENGTH} characters.`,
    };
  }

  return { ok: true, reason };
}

export type PercentDraft =
  | { ok: true; percent: number }
  | { ok: false; error: string };

/**
 * `resolveDispute` takes a whole-percent share for the requester and rejects
 * anything above 100. Fractions are not representable, so they are refused
 * rather than silently rounded into someone's loss.
 */
export function parseRequesterPercent(input: string): PercentDraft {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter the requester's share, 0 to 100." };
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return { ok: false, error: "The share must be between 0 and 100." };
  }
  if (!Number.isInteger(value)) {
    return {
      ok: false,
      error: "Only whole percentages are supported on chain.",
    };
  }

  return { ok: true, percent: value };
}

export type DisputeSplit = {
  requesterShare: bigint;
  providerShare: bigint;
  requesterLabel: string;
  providerLabel: string;
};

/**
 * Mirrors the contract exactly: the requester's share is truncated by integer
 * division and the provider takes the remainder, so no dust is stranded. Any
 * other rounding here would preview a split that does not happen.
 */
export function splitDisputedBudget(
  budget: bigint,
  requesterPercent: number,
): DisputeSplit {
  const requesterShare = (budget * BigInt(requesterPercent)) / BigInt(100);
  const providerShare = budget - requesterShare;

  return {
    requesterShare,
    providerShare,
    requesterLabel: `${formatUSDC(requesterShare)} USDC`,
    providerLabel: `${formatUSDC(providerShare)} USDC`,
  };
}

/**
 * Time left to raise a dispute. The window closes at `disputeDeadline`, after
 * which the escrow only allows `claimUncontestedTask`.
 */
export function describeDisputeWindow(
  disputeDeadline: bigint,
  nowSeconds: number,
): { open: boolean; label: string } {
  const deadline = Number(disputeDeadline);
  if (deadline === 0) {
    return { open: false, label: "Opens once a deliverable is submitted" };
  }

  const remaining = deadline - nowSeconds;
  if (remaining <= 0) return { open: false, label: "Dispute window closed" };

  const hours = Math.floor(remaining / 3600);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return {
      open: true,
      label: `${days} ${days === 1 ? "day" : "days"} left to dispute`,
    };
  }
  if (hours >= 1) {
    return {
      open: true,
      label: `${hours} ${hours === 1 ? "hour" : "hours"} left to dispute`,
    };
  }
  const minutes = Math.max(1, Math.floor(remaining / 60));
  return {
    open: true,
    label: `${minutes} ${minutes === 1 ? "minute" : "minutes"} left to dispute`,
  };
}
