import { parseUnits } from "viem";

/**
 * Agent profile input rules, shared by registration and editing so the two
 * cannot drift apart.
 */

/** USDC decimals on Arc. A rate finer than this is not representable. */
export const USDC_DECIMALS = 6;

export type RateDraft =
  | { ok: true; value: bigint }
  | { ok: false; error: string };

/**
 * Parses a USDC rate from what the user typed.
 *
 * Deliberately not `Number(input) * 1e6`: float multiplication loses units on
 * ordinary values — `1.005` becomes 1004999 rather than 1005000. `parseUnits`
 * reads the decimal string exactly, but it also silently rounds anything beyond
 * six decimals and happily accepts negatives, so those are rejected here rather
 * than quietly changing the rate the agent advertises.
 */
export function parseRate(input: string, label = "Rate"): RateDraft {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: `${label} is required.` };

  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === ".") {
    return { ok: false, error: `${label} must be a plain decimal number.` };
  }

  const [, fraction = ""] = trimmed.split(".");
  if (fraction.length > USDC_DECIMALS) {
    return {
      ok: false,
      error: `${label} cannot be finer than ${USDC_DECIMALS} decimals — USDC has no smaller unit.`,
    };
  }

  let value: bigint;
  try {
    value = parseUnits(trimmed, USDC_DECIMALS);
  } catch {
    return { ok: false, error: `${label} must be a plain decimal number.` };
  }

  if (value <= BigInt(0)) {
    return { ok: false, error: `${label} must be greater than zero.` };
  }

  return { ok: true, value };
}

export type SkillsDraft =
  | { ok: true; skills: string[] }
  | { ok: false; error: string };

/**
 * Normalises a comma-separated skill list.
 *
 * Duplicates are collapsed case-insensitively: the registry indexes skills by
 * exact string, so "Testing" and "testing" would occupy two buckets and split an
 * agent's discoverability in two.
 */
export function parseSkills(input: string): SkillsDraft {
  const seen = new Set<string>();
  const skills: string[] = [];

  for (const raw of input.split(",")) {
    const skill = raw.trim().toLowerCase();
    if (!skill) continue;
    if (seen.has(skill)) continue;
    seen.add(skill);
    skills.push(skill);
  }

  if (skills.length === 0) {
    return {
      ok: false,
      error: "List at least one skill — the registry requires it.",
    };
  }

  return { ok: true, skills };
}

/** Renders a stored rate back into an editable decimal string. */
export function formatRateInput(value: bigint): string {
  const unit = BigInt(10) ** BigInt(USDC_DECIMALS);
  const whole = value / unit;
  const fraction = value % unit;
  if (fraction === BigInt(0)) return whole.toString();

  const padded = fraction.toString().padStart(USDC_DECIMALS, "0");
  return `${whole}.${padded.replace(/0+$/, "")}`;
}
