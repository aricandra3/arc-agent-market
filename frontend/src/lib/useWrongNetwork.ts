"use client";

import { arcTestnet } from "@/lib/contracts";
import { useWalletStore } from "@/lib/store";

/**
 * True when a wallet is connected but on a chain other than Arc Testnet.
 * Use to block transaction submits that would otherwise fail.
 */
export function useWrongNetwork(): boolean {
  const isConnected = useWalletStore((state) => state.isConnected);
  const chainId = useWalletStore((state) => state.chainId);
  return isConnected && chainId !== null && chainId !== arcTestnet.id;
}
