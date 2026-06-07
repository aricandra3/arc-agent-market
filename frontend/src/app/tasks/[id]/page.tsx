'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { publicClient, CONTRACTS, TASK_ESCROW_ABI, TASK_STATUS, formatUSDC, sendTransaction } from '@/lib/contracts';
import { useWalletStore } from '@/lib/store';
import { encodeFunctionData } from 'viem';

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;
  const { address, isConnected } = useWalletStore();
  const [task, setTask] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTask() {
      try {
        const data = await publicClient.readContract({
          address: CONTRACTS.TASK_ESCROW,
          abi: TASK_ESCROW_ABI,
          functionName: 'getTask',
          args: [BigInt(taskId)],
        });
        setTask({
          requester: data[0], provider: data[1], budget: data[2],
          description: data[3], status: Number(data[4]), createdAt: data[5],
          deadline: data[6], deliverableHash: data[7], deliverableURI: data[8],
        });
      } catch (err) {
        console.error('Failed to load task:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadTask();
  }, [taskId]);

  const handleAction = async (action: string) => {
    if (!isConnected) return;
    try {
      const data = encodeFunctionData({
        abi: TASK_ESCROW_ABI,
        functionName: action as any,
        args: [BigInt(taskId)],
      });
      const tx = await sendTransaction(CONTRACTS.TASK_ESCROW, data);
      alert(`${action} submitted! Tx: ${tx}`);
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    }
  };

  if (isLoading) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400">Loading task...</div>;
  if (!task) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400">Task not found</div>;

  const isRequester = address?.toLowerCase() === task.requester.toLowerCase();
  const isProvider = address?.toLowerCase() === task.provider.toLowerCase();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">Task #{taskId}</h1>
          <span className={`px-3 py-1 text-sm rounded-full bg-blue-500/20 text-blue-400`}>
            {TASK_STATUS[task.status]}
          </span>
        </div>

        <p className="text-slate-300 mb-8 text-lg">{task.description}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/50 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">Budget</div>
            <div className="text-xl font-bold text-blue-400">${formatUSDC(task.budget)}</div>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">Requester</div>
            <div className="text-sm font-mono text-slate-300">{task.requester.slice(0, 10)}...</div>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">Provider</div>
            <div className="text-sm font-mono text-slate-300">
              {task.provider === '0x0000000000000000000000000000000000000000' ? 'Open' : task.provider.slice(0, 10) + '...'}
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">Deadline</div>
            <div className="text-sm text-slate-300">{new Date(Number(task.deadline) * 1000).toLocaleDateString()}</div>
          </div>
        </div>

        {task.deliverableURI && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-2">Deliverable</h3>
            <a href={task.deliverableURI} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
              {task.deliverableURI}
            </a>
          </div>
        )}

        {/* Actions */}
        {isConnected && (
          <div className="flex gap-4">
            {isProvider && task.status === 1 && (
              <button onClick={() => handleAction('startTask')} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold">
                Start Task
              </button>
            )}
            {isRequester && task.status === 3 && (
              <button onClick={() => handleAction('approveTask')} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold">
                Approve & Pay
              </button>
            )}
            {isRequester && task.status === 0 && (
              <button onClick={() => handleAction('cancelTask')} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold">
                Cancel Task
              </button>
            )}
            <a
              href={`https://testnet.arcscan.app/address/${CONTRACTS.TASK_ESCROW}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
            >
              View Contract
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
