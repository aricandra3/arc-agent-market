import { describe, it, expect, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useWrongNetwork } from "@/lib/useWrongNetwork";
import { useWalletStore } from "@/lib/store";
import { arcTestnet } from "@/lib/contracts";

const ADDR = "0x1234567890abcdef1234567890abcdef12345678";

describe("useWrongNetwork", () => {
  afterEach(() => {
    act(() => {
      useWalletStore.getState().setDisconnected();
    });
  });

  it("is false when no wallet is connected", () => {
    const { result } = renderHook(() => useWrongNetwork());
    expect(result.current).toBe(false);
  });

  it("is true when connected to a non-Arc chain", () => {
    const { result } = renderHook(() => useWrongNetwork());
    act(() => {
      useWalletStore.getState().setConnected(ADDR, 1);
    });
    expect(result.current).toBe(true);
  });

  it("is false when connected to Arc Testnet", () => {
    const { result } = renderHook(() => useWrongNetwork());
    act(() => {
      useWalletStore.getState().setConnected(ADDR, arcTestnet.id);
    });
    expect(result.current).toBe(false);
  });
});
