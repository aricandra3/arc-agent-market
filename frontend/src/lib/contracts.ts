import { createPublicClient, http, formatUnits } from 'viem';
import { readLimiter, withRpcRetry } from '@/lib/rpc';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

type TupleLike = Record<string, unknown> & { [index: number]: unknown };

export type Address = `0x${string}`;

/**
 * Reads a `NEXT_PUBLIC_*` value, falling back when it is unset or blank.
 * Next inlines these at build time, so each variable must be referenced
 * literally — no dynamic `process.env[key]` lookups.
 */
function envAddress(value: string | undefined, fallback: Address): Address {
  const trimmed = value?.trim();
  return trimmed ? (trimmed as Address) : fallback;
}

const RPC_URL =
  process.env.NEXT_PUBLIC_ARC_RPC_URL?.trim() || 'https://rpc.testnet.arc.network';
const EXPLORER_URL =
  process.env.NEXT_PUBLIC_ARC_EXPLORER_URL?.trim() || 'https://testnet.arcscan.app';
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID ?? 5042002);

/**
 * Human name for the configured chain.
 *
 * Derived from the chain id, never hardcoded: `ensureArcChain` passes this to
 * `wallet_addEthereumChain`, which *persists* in the user's wallet. A local
 * chain announced as "Arc Testnet" leaves a saved network of that name pointing
 * at 127.0.0.1, which then shadows the real one long after the dev server is
 * gone.
 */
export function chainNameFor(chainId: number): string {
  if (chainId === 5042002) return 'Arc Testnet';
  if (chainId === 31337 || chainId === 1337) return `Arc Local (${chainId})`;
  return `Arc (chain ${chainId})`;
}

// Arc chain definition, driven by NEXT_PUBLIC_ARC_CHAIN_ID.
export const arcTestnet = {
  id: CHAIN_ID,
  name: chainNameFor(CHAIN_ID),
  network: 'arc-testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: EXPLORER_URL },
  },
} as const;

// Contract addresses — override per environment via NEXT_PUBLIC_*_ADDRESS.
// Fallbacks are the current Arc testnet deployment; VerifierRegistry and
// WorkReceipt have no default because they were never wired to the frontend.
export const CONTRACTS = {
  AGENT_REGISTRY: envAddress(
    process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS,
    '0x26A6cc98a85ec5b0051e2152f366C7A9228c2e70',
  ),
  TASK_ESCROW: envAddress(
    process.env.NEXT_PUBLIC_TASK_ESCROW_ADDRESS,
    '0x4F4E5d4192B99BA92c1339e35760003a6AC938be',
  ),
  MICRO_PAYMENT: envAddress(
    process.env.NEXT_PUBLIC_MICRO_PAYMENT_ADDRESS,
    '0x8659E22Ac4bADa8D1a2Eb11bc8FF66410C8BfF5C',
  ),
  REPUTATION: envAddress(
    process.env.NEXT_PUBLIC_REPUTATION_ADDRESS,
    '0x5A2457c4bE7405bF4ED63aFd4689f52435cB1065',
  ),
  VERIFIER_REGISTRY: envAddress(
    process.env.NEXT_PUBLIC_VERIFIER_REGISTRY_ADDRESS,
    ZERO_ADDRESS,
  ),
  WORK_RECEIPT: envAddress(
    process.env.NEXT_PUBLIC_WORK_RECEIPT_ADDRESS,
    ZERO_ADDRESS,
  ),
  USDC: envAddress(
    process.env.NEXT_PUBLIC_USDC_ADDRESS,
    '0x3600000000000000000000000000000000000000',
  ),
};

export const EXPLORER_BASE_URL = EXPLORER_URL;

export function isConfiguredAddress(address: string): boolean {
  return Boolean(address) && address.toLowerCase() !== ZERO_ADDRESS;
}

export function explorerTxUrl(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${EXPLORER_URL}/address/${address}`;
}

// Public client for reads.
//
// The escrow and registry expose no bulk getters, so list views fan out into
// one `eth_call` per record. The public Arc RPC rate-limits that ("request
// limit reached"), so JSON-RPC batching is enabled: calls issued in the same
// tick are coalesced into a single HTTP request.
export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(RPC_URL, {
    batch: { wait: 16, batchSize: 24 },
    retryCount: 3,
    retryDelay: 200,
  }),
});

/**
 * `publicClient.readContract` with automatic rate-limit retry.
 *
 * Prefer this everywhere over the raw client method. viem's own `retryCount`
 * does not cover Arc's `-32011 "request limit reached"`, because that arrives as
 * a successful HTTP response carrying a JSON-RPC error. Routing every read
 * through one wrapper keeps a page from being the one that forgot to retry.
 */
export const readContract: typeof publicClient.readContract = ((
  args: Parameters<typeof publicClient.readContract>[0],
) =>
  withRpcRetry(async () => {
    // Paced first, retried second: the gate keeps normal traffic under the
    // quota, and retry only covers the cases where the estimate is off — other
    // tabs, a background refetch, or a shifting server-side limit.
    await readLimiter.acquire();
    return publicClient.readContract(args);
  })) as typeof publicClient.readContract;

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
  { inputs: [{ name: 'taskId', type: 'uint256' }], name: 'claimUncontestedTask', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'taskId', type: 'uint256' }], name: 'getTask', outputs: [{ name: 'requester', type: 'address' }, { name: 'provider', type: 'address' }, { name: 'budget', type: 'uint256' }, { name: 'description', type: 'string' }, { name: 'status', type: 'uint8' }, { name: 'createdAt', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'deliverableHash', type: 'bytes32' }, { name: 'deliverableURI', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getTaskCount', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'taskId', type: 'uint256' }, { name: 'reason', type: 'string' }], name: 'disputeTask', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'taskId', type: 'uint256' }, { name: 'requesterPercent', type: 'uint256' }], name: 'resolveDispute', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'disputeWindow', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { anonymous: false, inputs: [{ indexed: true, name: 'taskId', type: 'uint256' }, { indexed: true, name: 'disputer', type: 'address' }, { indexed: false, name: 'reason', type: 'string' }], name: 'TaskDisputed', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, name: 'taskId', type: 'uint256' }, { indexed: false, name: 'requesterShare', type: 'uint256' }, { indexed: false, name: 'providerShare', type: 'uint256' }], name: 'TaskResolved', type: 'event' },
  { inputs: [{ name: 'taskId', type: 'uint256' }], name: 'getDisputeDeadline', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'requester', type: 'address' }], name: 'getRequesterTasks', outputs: [{ name: '', type: 'uint256[]' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'provider', type: 'address' }], name: 'getProviderTasks', outputs: [{ name: '', type: 'uint256[]' }], stateMutability: 'view', type: 'function' },
  { anonymous: false, inputs: [{ indexed: true, name: 'taskId', type: 'uint256' }, { indexed: true, name: 'requester', type: 'address' }, { indexed: false, name: 'budget', type: 'uint256' }, { indexed: false, name: 'description', type: 'string' }], name: 'TaskCreated', type: 'event' },
] as const;

export const REPUTATION_ABI = [
  { inputs: [{ name: 'taskId', type: 'uint256' }, { name: 'rating', type: 'uint8' }, { name: 'comment', type: 'string' }], name: 'submitReview', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'agent', type: 'address' }], name: 'getReputation', outputs: [{ name: 'averageRating', type: 'uint256' }, { name: 'totalReviews', type: 'uint256' }, { name: 'completedTasks', type: 'uint256' }, { name: 'disputedTasks', type: 'uint256' }, { name: 'totalEarnings', type: 'uint256' }, { name: 'avgResponseTime', type: 'uint256' }, { name: 'completionRate', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'agent', type: 'address' }], name: 'getTrustScore', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'taskId', type: 'uint256' }, { name: 'reviewer', type: 'address' }], name: 'hasReviewForTask', outputs: [{ name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'agent', type: 'address' }], name: 'getReviewCount', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'agent', type: 'address' }, { name: 'offset', type: 'uint256' }, { name: 'limit', type: 'uint256' }], name: 'getReviews', outputs: [{ name: 'reviewIds', type: 'uint256[]' }, { name: 'reviewers', type: 'address[]' }, { name: 'ratings', type: 'uint8[]' }, { name: 'comments', type: 'string[]' }, { name: 'taskIds', type: 'uint256[]' }, { name: 'createdAts', type: 'uint256[]' }], stateMutability: 'view', type: 'function' },
] as const;

export const WORK_RECEIPT_ABI = [
  {
    inputs: [
      { name: 'taskId', type: 'uint256' },
      { name: 'proofURI', type: 'string' },
      { name: 'proofHash', type: 'bytes32' },
    ],
    name: 'createReceipt',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'receiptId', type: 'uint256' },
      { name: 'score', type: 'uint16' },
      { name: 'proofURI', type: 'string' },
      { name: 'proofHash', type: 'bytes32' },
    ],
    name: 'passReceipt',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'receiptId', type: 'uint256' },
      { name: 'score', type: 'uint16' },
      { name: 'proofURI', type: 'string' },
      { name: 'proofHash', type: 'bytes32' },
    ],
    name: 'failReceipt',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'receiptId', type: 'uint256' }],
    name: 'getReceipt',
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
  // No global index of pending receipts exists, so the verifier queue walks
  // ids down from this counter and filters on status.
  { inputs: [], name: 'nextReceiptId', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'MAX_SCORE', outputs: [{ name: '', type: 'uint16' }], stateMutability: 'view', type: 'function' },
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

/** Ownable2Step surface, shared by every owned protocol contract. */
export const OWNABLE2STEP_ABI = [
  { inputs: [], name: 'owner', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'pendingOwner', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'acceptOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'newOwner', type: 'address' }], name: 'transferOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function' },
] as const;

/** Contracts that inherit Ownable2Step. WorkReceipt has no owner. */
export const OWNED_CONTRACTS = [
  { label: 'AgentRegistry', address: CONTRACTS.AGENT_REGISTRY },
  { label: 'TaskEscrow', address: CONTRACTS.TASK_ESCROW },
  { label: 'MicroPayment', address: CONTRACTS.MICRO_PAYMENT },
  { label: 'Reputation', address: CONTRACTS.REPUTATION },
  { label: 'VerifierRegistry', address: CONTRACTS.VERIFIER_REGISTRY },
] as const;

/** VerifierRegistry. Registration is owner-only; verification checks isActiveVerifier. */
export const VERIFIER_REGISTRY_ABI = [
  {
    inputs: [
      { name: 'wallet', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'verifierType', type: 'uint8' },
      { name: 'categories', type: 'string[]' },
      { name: 'metadataURI', type: 'string' },
    ],
    name: 'registerVerifier',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  { inputs: [{ name: 'wallet', type: 'address' }], name: 'deactivateVerifier', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'wallet', type: 'address' }], name: 'reactivateVerifier', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'wallet', type: 'address' }], name: 'isActiveVerifier', outputs: [{ name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [{ name: 'verifierAddress', type: 'address' }],
    name: 'getVerifier',
    outputs: [
      { name: 'wallet', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'verifierType', type: 'uint8' },
      { name: 'categories', type: 'string[]' },
      { name: 'metadataURI', type: 'string' },
      { name: 'isActive', type: 'bool' },
      { name: 'registeredAt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  { inputs: [], name: 'getVerifierCount', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'index', type: 'uint256' }], name: 'getVerifierByIndex', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
] as const;

/** VerifierRegistry.VerifierType, by enum ordinal. */
export const VERIFIER_TYPES = ['Human', 'Service', 'Automated', 'Committee'] as const;

export function hasConfiguredVerifierRegistry(): boolean {
  return isConfiguredAddress(CONTRACTS.VERIFIER_REGISTRY);
}

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
  return isConfiguredAddress(CONTRACTS.WORK_RECEIPT);
}

export function formatPercentBps(value: bigint | number): string {
  const numeric = typeof value === 'bigint' ? Number(value) : value;
  return `${(numeric / 100).toFixed(1)}%`;
}

export function shortAddress(address: string, start = 6, end = 4): string {
  if (!address || address === ZERO_ADDRESS) return 'Open';
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function formatDate(timestamp: bigint): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(Number(timestamp) * 1000));
}

export function isUserRejectedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('user rejected') || message.includes('user denied');
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
    const stats = await readContract({
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
    const receipt = await readContract({
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

// Transaction submission lives in @/lib/tx — it needs the connected wallet
// provider from the store, which this module deliberately does not depend on.
