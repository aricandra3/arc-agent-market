import { describe, it, expect, beforeEach } from "vitest";
import {
  generateNonce,
  buildSiweMessage,
  saveSession,
  loadSession,
  clearSession,
  type SiweSession,
} from "@/lib/siwe";

describe("generateNonce", () => {
  it("returns a non-empty alphanumeric token", () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(/^[a-z0-9]+$/i);
    expect(nonce.length).toBeGreaterThanOrEqual(8);
  });

  it("returns unique values", () => {
    expect(generateNonce()).not.toBe(generateNonce());
  });
});

describe("buildSiweMessage", () => {
  const params = {
    domain: "exagora.app",
    address: "0x1234567890abcdef1234567890abcdef12345678",
    uri: "https://exagora.app",
    chainId: 5042002,
    nonce: "abc123",
    issuedAt: "2024-01-01T00:00:00.000Z",
  };

  it("produces an EIP-4361 formatted message", () => {
    const message = buildSiweMessage(params);
    const lines = message.split("\n");

    expect(lines[0]).toBe(
      "exagora.app wants you to sign in with your Ethereum account:",
    );
    expect(lines[1]).toBe(params.address);
    expect(message).toContain("URI: https://exagora.app");
    expect(message).toContain("Version: 1");
    expect(message).toContain("Chain ID: 5042002");
    expect(message).toContain("Nonce: abc123");
    expect(message).toContain("Issued At: 2024-01-01T00:00:00.000Z");
  });
});

describe("session storage", () => {
  const session: SiweSession = {
    address: "0x1234567890abcdef1234567890abcdef12345678",
    chainId: 5042002,
    nonce: "abc123",
    signature: "0xsig",
    issuedAt: "2024-01-01T00:00:00.000Z",
    expiresAt: Date.now() + 60_000,
  };

  beforeEach(() => {
    clearSession();
  });

  it("round-trips a valid session", () => {
    saveSession(session);
    expect(loadSession()?.address).toBe(session.address);
  });

  it("drops and clears an expired session", () => {
    saveSession({ ...session, expiresAt: Date.now() - 1 });
    expect(loadSession()).toBeNull();
    expect(localStorage.getItem("siwe-session")).toBeNull();
  });

  it("returns null when no session exists", () => {
    clearSession();
    expect(loadSession()).toBeNull();
  });
});
