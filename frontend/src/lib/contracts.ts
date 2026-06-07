import { createPublicClient, http, formatUnits } from 'viem';

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
  AGENT_REGISTRY: '0x92daC612422aA424608e02c1723075163EFb3C90' as const,
  TASK_ESCROW: '0x0E2869e0C1863C094a84D4fa0d2928e19D3Fc6b9' as const,
  MICRO_PAYMENT: '0x7AdA27656161b1FB1CE16469E068E5F5017618ec' as const,
  REPUTATION: '0x0AEB90e88963A57774CF63e3CE6c62Fe10aC6299' as const,
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

// Arc wallet helper
export async function getWalletProvider() {
  if (typeof window === 'undefined') return null;
  const arcWallet = (window as any).__arcWallet;
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
  
  const tx = await (window as any).ethereum.request({
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
