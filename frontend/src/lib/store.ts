'use client';

import { create } from 'zustand';
import type { Eip1193Provider } from '@/lib/siwe';

interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  /**
   * The EIP-1193 provider the user actually signed in with. Transactions must
   * go through this object — `window.ethereum` is whichever extension won the
   * injection race, not necessarily the wallet the user picked, and it is absent
   * entirely for WalletConnect sessions.
   */
  provider: Eip1193Provider | null;
  /** EIP-6963 rdns of the active wallet, used to re-attach after a reload. */
  walletRdns: string | null;
  setConnected: (
    address: string,
    chainId: number,
    provider?: Eip1193Provider | null,
    walletRdns?: string | null,
  ) => void;
  setProvider: (
    provider: Eip1193Provider | null,
    walletRdns?: string | null,
  ) => void;
  setDisconnected: () => void;
  setConnecting: (connecting: boolean) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  provider: null,
  walletRdns: null,
  setConnected: (address, chainId, provider, walletRdns) =>
    set((state) => ({
      address,
      chainId,
      isConnected: true,
      isConnecting: false,
      provider: provider !== undefined ? provider : state.provider,
      walletRdns: walletRdns !== undefined ? walletRdns : state.walletRdns,
    })),
  setProvider: (provider, walletRdns) =>
    set((state) => ({
      provider,
      walletRdns: walletRdns !== undefined ? walletRdns : state.walletRdns,
    })),
  setDisconnected: () =>
    set({
      address: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      provider: null,
      walletRdns: null,
    }),
  setConnecting: (connecting) => set({ isConnecting: connecting }),
}));

interface Agent {
  address: string;
  name: string;
  description: string;
  skills: string[];
  ratePerTask: bigint;
  ratePerCall: bigint;
  completedTasks: bigint;
  totalEarnings: bigint;
  averageRating: bigint;
  ratingCount: bigint;
  isActive: boolean;
}

interface AgentsState {
  agents: Agent[];
  isLoading: boolean;
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  setLoading: (loading: boolean) => void;
}

export const useAgentsStore = create<AgentsState>((set) => ({
  agents: [],
  isLoading: false,
  setAgents: (agents) => set({ agents, isLoading: false }),
  addAgent: (agent) => set((state) => ({ agents: [...state.agents, agent] })),
  setLoading: (loading) => set({ isLoading: loading }),
}));
