import { describe, it, expect } from "vitest";
import { keccak256, toHex } from "viem";
import { resolveDeliverableCommitment } from "@/lib/deliverable";

const URI = "ipfs://bafybeigdyrztestdeliverable";
const HASH32 = `0x${"ab".repeat(32)}`;

describe("resolveDeliverableCommitment", () => {
  it("derives keccak256 of the URI when no hash is supplied", () => {
    const result = resolveDeliverableCommitment(URI, "");
    expect(result).toEqual({
      ok: true,
      uri: URI,
      hash: keccak256(toHex(URI)),
      derived: true,
    });
  });

  it("keeps an explicit 32-byte hash", () => {
    const result = resolveDeliverableCommitment(URI, HASH32);
    expect(result).toEqual({
      ok: true,
      uri: URI,
      hash: HASH32,
      derived: false,
    });
  });

  it("trims surrounding whitespace", () => {
    const result = resolveDeliverableCommitment(`  ${URI}  `, `  ${HASH32}  `);
    expect(result).toMatchObject({ ok: true, uri: URI, hash: HASH32 });
  });

  it("rejects a missing URI", () => {
    expect(resolveDeliverableCommitment("", HASH32)).toEqual({
      ok: false,
      error: "A deliverable URI is required.",
    });
    expect(resolveDeliverableCommitment("   ", "")).toMatchObject({
      ok: false,
    });
  });

  it("rejects a hash that is not 32 bytes of hex", () => {
    for (const bad of ["0xabc", "not-hex", `0x${"ab".repeat(31)}`, `0x${"ab".repeat(33)}`]) {
      const result = resolveDeliverableCommitment(URI, bad);
      expect(result.ok, `expected ${bad} to be rejected`).toBe(false);
    }
  });

  it("always produces a non-zero 32-byte commitment", () => {
    const result = resolveDeliverableCommitment(URI, "");
    if (!result.ok) throw new Error("expected success");
    expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.hash).not.toBe(`0x${"0".repeat(64)}`);
  });
});
