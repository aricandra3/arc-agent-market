import { isHex, keccak256, toHex } from 'viem';

/**
 * Resolves the on-chain commitment for a submitted deliverable.
 *
 * The escrow stores a URI plus a 32-byte hash. Providers may supply the
 * artifact's own hash so the requester can verify the bytes they download;
 * when they don't, the URI itself is hashed so the commitment is never empty.
 */
export type DeliverableCommitment =
  | { ok: true; uri: string; hash: `0x${string}`; derived: boolean }
  | { ok: false; error: string };

export function resolveDeliverableCommitment(
  rawUri: string,
  rawHash: string,
): DeliverableCommitment {
  const uri = rawUri.trim();
  if (!uri) {
    return { ok: false, error: 'A deliverable URI is required.' };
  }

  const hash = rawHash.trim();
  if (!hash) {
    return { ok: true, uri, hash: keccak256(toHex(uri)), derived: true };
  }

  // bytes32 as hex is exactly 0x + 64 characters.
  if (!isHex(hash) || hash.length !== 66) {
    return {
      ok: false,
      error: 'The proof hash must be 32 bytes of hex (0x + 64 characters).',
    };
  }

  return { ok: true, uri, hash: hash as `0x${string}`, derived: false };
}
