'use client';

import { formatUSDC, TASK_STATUS } from '@/lib/contracts';
import Link from 'next/link';

interface TaskCardProps {
  id: number;
  requester: string;
  provider: string;
  budget: bigint;
  description: string;
  status: number;
  createdAt: bigint;
  deadline: bigint;
}

export default function TaskCard({
  id,
  requester,
  provider,
  budget,
  description,
  status,
}: TaskCardProps) {
  const statusColor = [
    'bg-blue-500/20 text-blue-400',    // Open
    'bg-yellow-500/20 text-yellow-400', // Accepted
    'bg-purple-500/20 text-purple-400', // InProgress
    'bg-orange-500/20 text-orange-400', // Submitted
    'bg-green-500/20 text-green-400',   // Approved
    'bg-green-500/20 text-green-400',   // Paid
    'bg-red-500/20 text-red-400',       // Disputed
    'bg-green-500/20 text-green-400',   // Resolved
    'bg-slate-500/20 text-slate-400',   // Cancelled
    'bg-slate-500/20 text-slate-400',   // Expired
  ][status] || 'bg-slate-500/20 text-slate-400';

  return (
    <Link href={`/tasks/${id}`}>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:border-blue-500/50 transition-all">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-white line-clamp-1">Task #{id}</h3>
          <span className={`px-2 py-1 text-xs rounded-full ${statusColor}`}>
            {TASK_STATUS[status]}
          </span>
        </div>
        
        <p className="text-sm text-slate-400 mb-4 line-clamp-2">{description}</p>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-slate-500">
              By {requester.slice(0, 6)}...{requester.slice(-4)}
            </span>
            {provider !== '0x0000000000000000000000000000000000000000' && (
              <span className="text-slate-500">
                → {provider.slice(0, 6)}...{provider.slice(-4)}
              </span>
            )}
          </div>
          <span className="text-blue-400 font-semibold">
            ${formatUSDC(budget)} USDC
          </span>
        </div>
      </div>
    </Link>
  );
}
