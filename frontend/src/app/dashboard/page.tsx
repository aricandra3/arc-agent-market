'use client';

import { useEffect, useState } from 'react';
import { useWalletStore } from '@/lib/store';
import { publicClient, CONTRACTS, AGENT_REGISTRY_ABI, TASK_ESCROW_ABI, formatUSDC, loadAgentVerificationStats, type VerificationStats } from '@/lib/contracts';
import TaskCard from '@/components/TaskCard';
import Link from 'next/link';

interface DashboardAgent {
  name: string;
  skills: string[];
  ratePerTask: bigint;
  completedTasks: bigint;
  totalEarnings: bigint;
  averageRating: bigint;
  ratingCount: bigint;
  verificationStats: VerificationStats | null;
}

interface DashboardTask {
  id: number;
  requester: string;
  provider: string;
  budget: bigint;
  description: string;
  status: number;
  createdAt: bigint;
  deadline: bigint;
}

export default function DashboardPage() {
  const { address, isConnected } = useWalletStore();
  const [agent, setAgent] = useState<DashboardAgent | null>(null);
  const [myTasks, setMyTasks] = useState<DashboardTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    const walletAddress = address;
    
    async function loadDashboard() {
      try {
        // Load agent profile
        try {
          const isReg = await publicClient.readContract({
            address: CONTRACTS.AGENT_REGISTRY,
            abi: AGENT_REGISTRY_ABI,
            functionName: 'isRegistered',
            args: [walletAddress as `0x${string}`],
          });
          if (isReg) {
            const data = await publicClient.readContract({
              address: CONTRACTS.AGENT_REGISTRY,
              abi: AGENT_REGISTRY_ABI,
              functionName: 'getAgent',
              args: [walletAddress as `0x${string}`],
            });
            setAgent({
              name: data[0], skills: [...data[2]], ratePerTask: data[3],
              completedTasks: data[5], totalEarnings: data[6],
              averageRating: data[7], ratingCount: data[8],
              verificationStats: await loadAgentVerificationStats(walletAddress),
            });
          }
        } catch {}

        // Load tasks
        const taskIds = await publicClient.readContract({
          address: CONTRACTS.TASK_ESCROW,
          abi: TASK_ESCROW_ABI,
          functionName: 'getRequesterTasks',
          args: [walletAddress as `0x${string}`],
        });

        const tasks: DashboardTask[] = [];
        for (const id of taskIds.slice(0, 10)) {
          try {
            const data = await publicClient.readContract({
              address: CONTRACTS.TASK_ESCROW,
              abi: TASK_ESCROW_ABI,
              functionName: 'getTask',
              args: [id],
            });
            tasks.push({
              id: Number(id), requester: data[0], provider: data[1],
              budget: data[2], description: data[3], status: Number(data[4]),
              createdAt: data[5], deadline: data[6],
            });
          } catch {}
        }
        setMyTasks(tasks);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, [address]);

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Dashboard</h1>
        <p className="text-slate-400 mb-8">Connect your wallet to view your dashboard</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">Loading dashboard...</div>;
  }

  const agentVerifiedReceipts = Number(agent?.verificationStats?.totalReceipts ?? BigInt(0));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-white">Dashboard</h1>
        <span className="text-sm text-slate-500 font-mono">{address}</span>
      </div>

      {/* Agent Profile Summary */}
      {agent ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">{agent.name}</h2>
              <div className="flex gap-2 mt-2">
                {agent.skills.map((s: string) => (
                  <span key={s} className="px-2 py-1 text-xs bg-blue-500/10 text-blue-400 rounded-md">{s}</span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-400">${formatUSDC(agent.totalEarnings)}</div>
              <div className="text-sm text-slate-500">{Number(agent.completedTasks)} tasks completed</div>
              {agentVerifiedReceipts > 0 && (
                <div className="mt-1 text-xs text-emerald-300">
                  {agentVerifiedReceipts} verified receipts
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-8 text-center">
          <p className="text-slate-400 mb-4">You have not registered as an agent yet</p>
          <button className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg">
            Register as Agent
          </button>
        </div>
      )}

      {/* My Tasks */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">My Tasks</h2>
        {myTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 mb-4">No tasks yet</p>
            <Link href="/tasks/create" className="text-blue-400 hover:text-blue-300">
              Create your first task →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myTasks.map((task) => (
              <TaskCard key={task.id} {...task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
