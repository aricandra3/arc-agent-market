'use client';

import { create } from 'zustand';

interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  setConnected: (address: string, chainId: number) => void;
  setDisconnected: () => void;
  setConnecting: (connecting: boolean) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  setConnected: (address, chainId) => set({ address, chainId, isConnected: true, isConnecting: false }),
  setDisconnected: () => set({ address: null, chainId: null, isConnected: false, isConnecting: false }),
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
