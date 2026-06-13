'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { publicClient, CONTRACTS, AGENT_REGISTRY_ABI, REPUTATION_ABI, formatPercentBps, formatUSDC, loadAgentVerificationStats, type VerificationStats } from '@/lib/contracts';
import { useWalletStore } from '@/lib/store';

interface AgentProfile {
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
  metadataURI: string;
}

interface ReputationSummary {
  averageRating: bigint;
  totalReviews: bigint;
  completedTasks: bigint;
  disputedTasks: bigint;
  totalEarnings: bigint;
  completionRate: bigint;
}

export default function AgentProfilePage() {
  const params = useParams();
  const address = params.id as string;
  const { isConnected } = useWalletStore();
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [reputation, setReputation] = useState<ReputationSummary | null>(null);
  const [verificationStats, setVerificationStats] = useState<VerificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAgent() {
      try {
        const data = await publicClient.readContract({
          address: CONTRACTS.AGENT_REGISTRY,
          abi: AGENT_REGISTRY_ABI,
          functionName: 'getAgent',
          args: [address as `0x${string}`],
        });
        setAgent({
          name: data[0], description: data[1], skills: [...data[2]],
          ratePerTask: data[3], ratePerCall: data[4], completedTasks: data[5],
          totalEarnings: data[6], averageRating: data[7], ratingCount: data[8],
          isActive: data[9], metadataURI: data[10],
        });

        try {
          const rep = await publicClient.readContract({
            address: CONTRACTS.REPUTATION,
            abi: REPUTATION_ABI,
            functionName: 'getReputation',
            args: [address as `0x${string}`],
          });
          setReputation({
            averageRating: rep[0], totalReviews: rep[1], completedTasks: rep[2],
            disputedTasks: rep[3], totalEarnings: rep[4], completionRate: rep[6],
          });
        } catch {}

        setVerificationStats(await loadAgentVerificationStats(address));
      } catch (err) {
        console.error('Failed to load agent:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAgent();
  }, [address]);

  if (isLoading) {
    return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400">Loading agent profile...</div>;
  }

  if (!agent || !agent.name) {
    return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400">Agent not found</div>;
  }

  const rating = Number(agent.ratingCount) > 0 ? Number(agent.averageRating) / 100 : 0;
  const hasVerificationStats = verificationStats !== null && Number(verificationStats.totalReceipts) > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{agent.name}</h1>
            <p className="text-sm text-slate-500 font-mono">{address}</p>
          </div>
          <span className={`px-3 py-1 text-sm rounded-full ${agent.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/50 text-slate-400'}`}>
            {agent.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <p className="text-slate-300 mb-6">{agent.description}</p>

        <div className="flex flex-wrap gap-2 mb-8">
          {agent.skills.map((skill: string) => (
            <span key={skill} className="px-3 py-1 text-sm bg-blue-500/10 text-blue-400 rounded-lg">
              {skill}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">${formatUSDC(agent.ratePerTask)}</div>
            <div className="text-xs text-slate-500">Per Task</div>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{rating.toFixed(1)} ★</div>
            <div className="text-xs text-slate-500">{Number(agent.ratingCount)} reviews</div>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{Number(agent.completedTasks)}</div>
            <div className="text-xs text-slate-500">Tasks Done</div>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">${formatUSDC(agent.totalEarnings)}</div>
            <div className="text-xs text-slate-500">Earned</div>
          </div>
        </div>

        {reputation && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Reputation</h3>
            <div className="bg-slate-900/50 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-blue-400">
                  {Number(reputation.averageRating) > 0 ? (Number(reputation.averageRating) / 100).toFixed(1) : '0.0'}
                </div>
                <div>
                  <div className="text-yellow-400 text-lg">{'★'.repeat(Math.round(Number(reputation.averageRating) / 100))}</div>
                  <div className="text-sm text-slate-500">{Number(reputation.totalReviews)} reviews</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {hasVerificationStats && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Verified Work</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-emerald-500/20 bg-emerald-500/10 rounded-xl p-4">
                <div className="text-2xl font-bold text-emerald-300">
                  {Number(verificationStats.totalReceipts)}
                </div>
                <div className="text-xs text-emerald-100/70">Receipts</div>
              </div>
              <div className="border border-slate-700/70 bg-slate-900/50 rounded-xl p-4">
                <div className="text-2xl font-bold text-white">
                  {formatPercentBps(verificationStats.passRate)}
                </div>
                <div className="text-xs text-slate-500">Pass Rate</div>
              </div>
              <div className="border border-slate-700/70 bg-slate-900/50 rounded-xl p-4">
                <div className="text-2xl font-bold text-white">
                  {formatPercentBps(verificationStats.averageScore)}
                </div>
                <div className="text-xs text-slate-500">Avg Score</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          {isConnected && (
            <a
              href={`/tasks/create?provider=${address}`}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-center transition-colors"
            >
              Hire This Agent
            </a>
          )}
          <a
            href={`https://testnet.arcscan.app/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            View on Explorer
          </a>
        </div>
      </div>
    </div>
  );
}
