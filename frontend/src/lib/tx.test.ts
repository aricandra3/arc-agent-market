import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  WalletNotConnectedError,
  WrongNetworkError,
  describeTxError,
  getActiveProvider,
  sendTransaction,
} from "@/lib/tx";
import { arcTestnet } from "@/lib/contracts";
import { useWalletStore } from "@/lib/store";
import type { Eip1193Provider } from "@/lib/siwe";

const ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const TO = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const HASH = "0x" + "ab".repeat(32);

function stubProvider(hash: string = HASH): Eip1193Provider & {
  request: ReturnType<typeof vi.fn>;
} {
  return { request: vi.fn().mockResolvedValue(hash) };
}

describe("sendTransaction", () => {
  beforeEach(() => {
    useWalletStore.getState().setDisconnected();
    // A stray global provider must never be picked up in place of the
    // wallet the user actually signed in with.
    window.ethereum = stubProvider("0xdeadbeef");
  });

  it("throws when no wallet is connected", async () => {
    await expect(sendTransaction({ to: TO, data: "0x00" })).rejects.toThrow(
      WalletNotConnectedError,
    );
  });

  it("throws when connected without a usable provider", async () => {
    useWalletStore.getState().setConnected(ADDRESS, arcTestnet.id, null);
    await expect(sendTransaction({ to: TO, data: "0x00" })).rejects.toThrow(
      WalletNotConnectedError,
    );
  });

  it("throws when the wallet is on another chain", async () => {
    useWalletStore.getState().setConnected(ADDRESS, 1, stubProvider());
    await expect(sendTransaction({ to: TO, data: "0x00" })).rejects.toThrow(
      WrongNetworkError,
    );
  });

  it("sends through the connected provider, not window.ethereum", async () => {
    const provider = stubProvider();
    useWalletStore.getState().setConnected(ADDRESS, arcTestnet.id, provider);

    const hash = await sendTransaction({ to: TO, data: "0xabcd" });

    expect(hash).toBe(HASH);
    expect(provider.request).toHaveBeenCalledWith({
      method: "eth_sendTransaction",
      params: [{ from: ADDRESS, to: TO, data: "0xabcd", value: "0x0" }],
    });
    expect(
      (window.ethereum as ReturnType<typeof stubProvider>).request,
    ).not.toHaveBeenCalled();
  });

  it("forwards an explicit value", async () => {
    const provider = stubProvider();
    useWalletStore.getState().setConnected(ADDRESS, arcTestnet.id, provider);

    await sendTransaction({ to: TO, data: "0x00", value: "0x2710" });

    expect(provider.request).toHaveBeenCalledWith(
      expect.objectContaining({
        params: [expect.objectContaining({ value: "0x2710" })],
      }),
    );
  });

  it("rejects a non-string hash from the wallet", async () => {
    const provider = { request: vi.fn().mockResolvedValue(null) };
    useWalletStore.getState().setConnected(ADDRESS, arcTestnet.id, provider);

    await expect(sendTransaction({ to: TO, data: "0x00" })).rejects.toThrow(
      /invalid transaction hash/i,
    );
  });
});

describe("getActiveProvider", () => {
  beforeEach(() => {
    useWalletStore.getState().setDisconnected();
  });

  it("returns null before a wallet connects", () => {
    expect(getActiveProvider()).toBeNull();
  });

  it("returns the provider stored at sign-in", () => {
    const provider = stubProvider();
    useWalletStore.getState().setConnected(ADDRESS, arcTestnet.id, provider);
    expect(getActiveProvider()).toBe(provider);
  });

  it("is cleared on disconnect", () => {
    useWalletStore.getState().setConnected(ADDRESS, arcTestnet.id, stubProvider());
    useWalletStore.getState().setDisconnected();
    expect(getActiveProvider()).toBeNull();
  });
});

describe("describeTxError", () => {
  it("maps wallet rejection to a plain message", () => {
    expect(describeTxError(new Error("User rejected the request"))).toBe(
      "The wallet transaction was cancelled.",
    );
    expect(describeTxError(new Error("MetaMask Tx Signature: User denied"))).toBe(
      "The wallet transaction was cancelled.",
    );
  });

  it("maps insufficient funds", () => {
    expect(
      describeTxError(new Error("insufficient funds for gas * price + value")),
    ).toMatch(/insufficient usdc balance/i);
  });

  it("passes through wrong-network guidance", () => {
    expect(describeTxError(new WrongNetworkError(1))).toContain(
      String(arcTestnet.id),
    );
  });

  it("falls back for unknown values", () => {
    expect(describeTxError(undefined)).toBe("The transaction failed.");
    expect(describeTxError(new Error("nonce too low"))).toBe("nonce too low");
  });
});
