import { createPublicClient, http, formatUnits } from 'viem';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

type TupleLike = Record<string, unknown> & { [index: number]: unknown };

interface BrowserWalletProvider {
  state?: {
    address?: string;
  };
  connect: () => Promise<unknown>;
  disconnect: () => Promise<unknown> | unknown;
}

interface EthereumRequestProvider {
  request: (args: {
    method: string;
    params?: unknown[];
  }) => Promise<string>;
}

declare global {
  interface Window {
    __arcWallet?: BrowserWalletProvider;
    ethereum?: EthereumRequestProvider;
  }
}

// Arc Testnet chain definition
export const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
    public: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
} as const;

// Contract addresses
export const CONTRACTS = {
  AGENT_REGISTRY: '0x26A6cc98a85ec5b0051e2152f366C7A9228c2e70' as const,
  TASK_ESCROW: '0x4F4E5d4192B99BA92c1339e35760003a6AC938be' as const,
  MICRO_PAYMENT: '0x8659E22Ac4bADa8D1a2Eb11bc8FF66410C8BfF5C' as const,
  REPUTATION: '0x5A2457c4bE7405bF4ED63aFd4689f52435cB1065' as const,
  VERIFIER_REGISTRY: ZERO_ADDRESS,
  WORK_RECEIPT: ZERO_ADDRESS,
  USDC: '0x3600000000000000000000000000000000000000' as const,
};

// Public client for reads
export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http('https://rpc.testnet.arc.network'),
});

// ABIs (minimal - only what we need)
export const AGENT_REGISTRY_ABI = [
  { inputs: [{ name: 'name', type: 'string' }, { name: 'description', type: 'string' }, { name: 'skills', type: 'string[]' }, { name: 'ratePerTask', type: 'uint256' }, { name: 'ratePerCall', type: 'uint256' }, { name: 'metadataURI', type: 'string' }], name: 'registerAgent', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'wallet', type: 'address' }], name: 'getAgent', outputs: [{ name: 'name', type: 'string' }, { name: 'description', type: 'string' }, { name: 'skills', type: 'string[]' }, { name: 'ratePerTask', type: 'uint256' }, { name: 'ratePerCall', type: 'uint256' }, { name: 'completedTasks', type: 'uint256' }, { name: 'totalEarnings', type: 'uint256' }, { name: 'averageRating', type: 'uint256' }, { name: 'ratingCount', type: 'uint256' }, { name: 'isActive', type: 'bool' }, { name: 'metadataURI', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getAgentCount', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '', type: 'uint256' }], name: 'getAgentByIndex', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'skill', type: 'string' }], name: 'getAgentsBySkill', outputs: [{ name: '', type: 'address[]' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'wallet', type: 'address' }], name: 'isRegistered', outputs: [{ name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'wallet', type: 'address' }], name: 'isActive', outputs: [{ name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'skills', type: 'string[]' }, { name: 'ratePerTask', type: 'uint256' }, { name: 'ratePerCall', type: 'uint256' }, { name: 'metadataURI', type: 'string' }], name: 'updateAgent', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'name', type: 'string' }, { name: 'description', type: 'string' }], name: 'updateProfile', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { anonymous: false, inputs: [{ indexed: true, name: 'wallet', type: 'address' }, { indexed: false, name: 'name', type: 'string' }, { indexed: false, name: 'skills', type: 'string[]' }], name: 'AgentRegistered', type: 'event' },
] as const;

export const TASK_ESCROW_ABI = [
  { inputs: [{ name: 'provider', type: 'address' }, { name: 'budget', type: 'uint256' }, { name: 'description', type: 'string' }, { name: 'requiredSkills', type: 'string[]' }, { name: 'deadline', type: 'uint256' }], name: 'createTask', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'taskId', type: 'uint256' }], name: 'acceptTask', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'taskId', type: 'uint256' }], name: 'startTask', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'taskId', type: 'uint256' }, { name: 'deliverableHash', type: 'bytes32' }, { name: 'deliverableURI', type: 'string' }], name: 'submitDeliverable', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'taskId', type: 'uint256' }], name: 'approveTask', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'taskId', type: 'uint256' }], name: 'cancelTask', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'taskId', type: 'uint256' }], name: 'getTask', outputs: [{ name: 'requester', type: 'address' }, { name: 'provider', type: 'address' }, { name: 'budget', type: 'uint256' }, { name: 'description', type: 'string' }, { name: 'status', type: 'uint8' }, { name: 'createdAt', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'deliverableHash', type: 'bytes32' }, { name: 'deliverableURI', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getTaskCount', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'requester', type: 'address' }], name: 'getRequesterTasks', outputs: [{ name: '', type: 'uint256[]' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'provider', type: 'address' }], name: 'getProviderTasks', outputs: [{ name: '', type: 'uint256[]' }], stateMutability: 'view', type: 'function' },
  { anonymous: false, inputs: [{ indexed: true, name: 'taskId', type: 'uint256' }, { indexed: true, name: 'requester', type: 'address' }, { indexed: false, name: 'budget', type: 'uint256' }, { indexed: false, name: 'description', type: 'string' }], name: 'TaskCreated', type: 'event' },
] as const;

export const REPUTATION_ABI = [
  { inputs: [{ name: 'taskId', type: 'uint256' }, { name: 'rating', type: 'uint8' }, { name: 'comment', type: 'string' }], name: 'submitReview', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'agent', type: 'address' }], name: 'getReputation', outputs: [{ name: 'averageRating', type: 'uint256' }, { name: 'totalReviews', type: 'uint256' }, { name: 'completedTasks', type: 'uint256' }, { name: 'disputedTasks', type: 'uint256' }, { name: 'totalEarnings', type: 'uint256' }, { name: 'avgResponseTime', type: 'uint256' }, { name: 'completionRate', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'agent', type: 'address' }], name: 'getTrustScore', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'agent', type: 'address' }, { name: 'offset', type: 'uint256' }, { name: 'limit', type: 'uint256' }], name: 'getReviews', outputs: [{ name: 'reviewIds', type: 'uint256[]' }, { name: 'reviewers', type: 'address[]' }, { name: 'ratings', type: 'uint8[]' }, { name: 'comments', type: 'string[]' }, { name: 'taskIds', type: 'uint256[]' }, { name: 'createdAts', type: 'uint256[]' }], stateMutability: 'view', type: 'function' },
] as const;

export const WORK_RECEIPT_ABI = [
  {
    inputs: [{ name: 'taskId', type: 'uint256' }],
    name: 'getReceiptByTask',
    outputs: [{
      name: '',
      type: 'tuple',
      components: [
        { name: 'id', type: 'uint256' },
        { name: 'taskId', type: 'uint256' },
        { name: 'requester', type: 'address' },
        { name: 'provider', type: 'address' },
        { name: 'verifier', type: 'address' },
        { name: 'deliverableURI', type: 'string' },
        { name: 'proofURI', type: 'string' },
        { name: 'proofHash', type: 'bytes32' },
        { name: 'score', type: 'uint16' },
        { name: 'status', type: 'uint8' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'verifiedAt', type: 'uint256' },
      ],
    }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'agent', type: 'address' }],
    name: 'getAgentVerificationStats',
    outputs: [{
      name: '',
      type: 'tuple',
      components: [
        { name: 'totalReceipts', type: 'uint256' },
        { name: 'passedReceipts', type: 'uint256' },
        { name: 'failedReceipts', type: 'uint256' },
        { name: 'averageScore', type: 'uint256' },
        { name: 'passRate', type: 'uint256' },
      ],
    }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'agent', type: 'address' }],
    name: 'getAgentReceipts',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const ERC20_ABI = [
  { inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], name: 'approve', outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'owner', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'decimals', outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view', type: 'function' },
] as const;

// Helper: format USDC amount
export function formatUSDC(amount: bigint): string {
  return parseFloat(formatUnits(amount, 6)).toFixed(2);
}

// Task status enum
export const TASK_STATUS = ['Open', 'Accepted', 'InProgress', 'Submitted', 'Approved', 'Paid', 'Disputed', 'Resolved', 'Cancelled', 'Expired'] as const;

export const RECEIPT_STATUS = ['None', 'Pending', 'Passed', 'Failed', 'Disputed'] as const;

export interface VerificationStats {
  totalReceipts: bigint;
  passedReceipts: bigint;
  failedReceipts: bigint;
  averageScore: bigint;
  passRate: bigint;
}

export interface WorkReceiptRecord {
  id: bigint;
  taskId: bigint;
  requester: string;
  provider: string;
  verifier: string;
  deliverableURI: string;
  proofURI: string;
  proofHash: string;
  score: bigint;
  status: number;
  createdAt: bigint;
  verifiedAt: bigint;
}

export function hasConfiguredWorkReceipt(): boolean {
  return CONTRACTS.WORK_RECEIPT.toLowerCase() !== ZERO_ADDRESS.toLowerCase();
}

export function formatPercentBps(value: bigint | number): string {
  const numeric = typeof value === 'bigint' ? Number(value) : value;
  return `${(numeric / 100).toFixed(1)}%`;
}

function toBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' || typeof value === 'string') return BigInt(value);
  return BigInt(0);
}

export function normalizeVerificationStats(raw: unknown): VerificationStats {
  const data = raw as TupleLike | null | undefined;
  return {
    totalReceipts: toBigInt(data?.totalReceipts ?? data?.[0]),
    passedReceipts: toBigInt(data?.passedReceipts ?? data?.[1]),
    failedReceipts: toBigInt(data?.failedReceipts ?? data?.[2]),
    averageScore: toBigInt(data?.averageScore ?? data?.[3]),
    passRate: toBigInt(data?.passRate ?? data?.[4]),
  };
}

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function normalizeWorkReceipt(raw: unknown): WorkReceiptRecord {
  const data = raw as TupleLike | null | undefined;
  return {
    id: toBigInt(data?.id ?? data?.[0]),
    taskId: toBigInt(data?.taskId ?? data?.[1]),
    requester: toStringValue(data?.requester ?? data?.[2], ZERO_ADDRESS),
    provider: toStringValue(data?.provider ?? data?.[3], ZERO_ADDRESS),
    verifier: toStringValue(data?.verifier ?? data?.[4], ZERO_ADDRESS),
    deliverableURI: toStringValue(data?.deliverableURI ?? data?.[5]),
    proofURI: toStringValue(data?.proofURI ?? data?.[6]),
    proofHash: toStringValue(data?.proofHash ?? data?.[7], '0x'),
    score: toBigInt(data?.score ?? data?.[8]),
    status: Number(data?.status ?? data?.[9] ?? 0),
    createdAt: toBigInt(data?.createdAt ?? data?.[10]),
    verifiedAt: toBigInt(data?.verifiedAt ?? data?.[11]),
  };
}

export async function loadAgentVerificationStats(agent: string): Promise<VerificationStats | null> {
  if (!hasConfiguredWorkReceipt()) return null;

  try {
    const stats = await publicClient.readContract({
      address: CONTRACTS.WORK_RECEIPT,
      abi: WORK_RECEIPT_ABI,
      functionName: 'getAgentVerificationStats',
      args: [agent as `0x${string}`],
    });

    return normalizeVerificationStats(stats);
  } catch (err) {
    console.error('Failed to load verification stats:', err);
    return null;
  }
}

export async function loadTaskReceipt(taskId: bigint): Promise<WorkReceiptRecord | null> {
  if (!hasConfiguredWorkReceipt()) return null;

  try {
    const receipt = await publicClient.readContract({
      address: CONTRACTS.WORK_RECEIPT,
      abi: WORK_RECEIPT_ABI,
      functionName: 'getReceiptByTask',
      args: [taskId],
    });
    const normalized = normalizeWorkReceipt(receipt);
    return normalized.id > BigInt(0) ? normalized : null;
  } catch (err) {
    console.error('Failed to load task receipt:', err);
    return null;
  }
}

// Arc wallet helper
export async function getWalletProvider() {
  if (typeof window === 'undefined') return null;
  const arcWallet = window.__arcWallet;
  if (!arcWallet) return null;
  return arcWallet;
}

export async function connectWallet() {
  const wallet = await getWalletProvider();
  if (!wallet) throw new Error('No wallet detected');
  return wallet.connect();
}

export async function disconnectWallet() {
  const wallet = await getWalletProvider();
  if (!wallet) return;
  return wallet.disconnect();
}

export async function sendTransaction(to: string, data: string, value?: string) {
  const wallet = await getWalletProvider();
  if (!wallet?.state?.address) throw new Error('Wallet not connected');
  
  if (!window.ethereum) throw new Error('No Ethereum provider detected');

  const tx = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
      from: wallet.state.address,
      to,
      data,
      value: value || '0x0',
    }],
  });
  return tx;
}
