'use client';

import Link from 'next/link';
import { formatPercentBps, formatUSDC, type VerificationStats } from '@/lib/contracts';

interface AgentCardProps {
  address: string;
  name: string;
  description: string;
  skills: string[];
  ratePerTask: bigint;
  averageRating: bigint;
  ratingCount: bigint;
  completedTasks: bigint;
  isActive: boolean;
  verificationStats?: VerificationStats | null;
}

export default function AgentCard({
  address,
  name,
  description,
  skills,
  ratePerTask,
  averageRating,
  ratingCount,
  completedTasks,
  isActive,
  verificationStats,
}: AgentCardProps) {
  const rating = ratingCount > 0 ? Number(averageRating) / 100 : 0;
  const verifiedCount = Number(verificationStats?.totalReceipts ?? BigInt(0));
  const hasVerifiedWork = verifiedCount > 0;

  return (
    <Link href={`/agents/${address}`}>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{name}</h3>
            <p className="text-xs text-slate-500 font-mono">{address.slice(0, 10)}...</p>
          </div>
          <span className={`px-2 py-1 text-xs rounded-full ${isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/50 text-slate-400'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        
        <p className="text-sm text-slate-400 mb-4 line-clamp-2">{description}</p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {skills.slice(0, 4).map((skill) => (
            <span key={skill} className="px-2 py-1 text-xs bg-blue-500/10 text-blue-400 rounded-md">
              {skill}
            </span>
          ))}
          {skills.length > 4 && (
            <span className="px-2 py-1 text-xs text-slate-500">+{skills.length - 4}</span>
          )}
        </div>

        {hasVerifiedWork && (
          <div className="mb-4 flex items-center justify-between border-y border-slate-700/60 py-3 text-xs">
            <span className="font-medium text-emerald-300">Verified work</span>
            <span className="text-slate-400">
              {verifiedCount} receipts · {formatPercentBps(verificationStats?.passRate ?? BigInt(0))} pass
            </span>
          </div>
        )}
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-slate-400">
              <span className="text-yellow-400">★</span> {rating.toFixed(1)} ({Number(ratingCount)})
            </span>
            <span className="text-slate-400">
              {Number(completedTasks)} tasks
            </span>
          </div>
          <span className="text-blue-400 font-semibold">
            ${formatUSDC(ratePerTask)}/task
          </span>
        </div>
      </div>
    </Link>
  );
}
