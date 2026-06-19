"use client";

import { useEffect, useState } from "react";
import type { Eip1193Provider } from "@/lib/siwe";

/** EIP-6963 provider info advertised by injected wallets. */
export type Eip6963ProviderInfo = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
};

export type DiscoveredWallet = {
  info: Eip6963ProviderInfo;
  provider: Eip1193Provider;
};

type AnnounceEvent = CustomEvent<DiscoveredWallet>;

/**
 * Discovers every injected EVM wallet via EIP-6963 (Multi Injected Provider
 * Discovery). This is how modern dapps support *all* browser wallets —
 * MetaMask, Rabby, Coinbase, Brave, OKX, Frame, Zerion, Trust, and so on —
 * without hardcoding each one. Falls back to a legacy `window.ethereum`
 * entry when a wallet predates EIP-6963.
 */
export function useInjectedWallets(): DiscoveredWallet[] {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const byRdns = new Map<string, DiscoveredWallet>();

    const onAnnounce = (event: Event) => {
      const detail = (event as AnnounceEvent).detail;
      if (!detail?.info?.rdns || !detail.provider) return;
      byRdns.set(detail.info.rdns, detail);
      setWallets(Array.from(byRdns.values()));
    };

    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    // Re-request shortly after mount in case a wallet injects late.
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new Event("eip6963:requestProvider"));
    }, 350);

    return () => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      window.clearTimeout(timer);
    };
  }, []);

  return wallets;
}
