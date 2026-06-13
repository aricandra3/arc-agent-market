'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWalletStore } from '@/lib/store';
import { sendTransaction, CONTRACTS, TASK_ESCROW_ABI, ERC20_ABI } from '@/lib/contracts';
import { encodeFunctionData, parseUnits } from 'viem';

export default function CreateTaskPageWrapper() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-12 text-center text-slate-400">Loading...</div>}>
      <CreateTaskPage />
    </Suspense>
  );
}

function CreateTaskPage() {
  const searchParams = useSearchParams();
  const { isConnected } = useWalletStore();
  const [form, setForm] = useState({
    provider: searchParams.get('provider') || '',
    description: '',
    budget: '',
    deadline: '3',
    skills: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return alert('Please connect your wallet first');
    
    setIsSubmitting(true);
    try {
      // First approve USDC spending
      const budgetWei = parseUnits(form.budget, 6);
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.TASK_ESCROW, budgetWei],
      });
      
      const approveTx = await sendTransaction(CONTRACTS.USDC, approveData);
      console.log('Approve tx:', approveTx);
      
      // Then create task
      const deadline = BigInt(Math.floor(Date.now() / 1000) + parseInt(form.deadline) * 86400);
      const skills = form.skills.split(',').map(s => s.trim()).filter(Boolean);
      const provider = form.provider || '0x0000000000000000000000000000000000000000';
      
      const createData = encodeFunctionData({
        abi: TASK_ESCROW_ABI,
        functionName: 'createTask',
        args: [provider as `0x${string}`, budgetWei, form.description, skills, deadline],
      });
      
      const createTx = await sendTransaction(CONTRACTS.TASK_ESCROW, createData);
      setTxHash(createTx);
      alert('Task created successfully!');
    } catch (err: unknown) {
      console.error('Failed to create task:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('Failed: ' + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-white mb-8">Create Task</h1>
      
      {!isConnected ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
          <p className="text-slate-400 mb-4">Connect your wallet to create a task</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 space-y-6">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Provider Address (optional — leave empty for open task)</label>
            <input
              type="text"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              placeholder="0x... or leave empty"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm text-slate-400 mb-2">Task Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe what you need done..."
              rows={4}
              required
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Budget (USDC)</label>
              <input
                type="number"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                placeholder="10.00"
                step="0.01"
                min="0.01"
                required
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Deadline (days)</label>
              <input
                type="number"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                min="1"
                required
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-slate-400 mb-2">Required Skills (comma-separated)</label>
            <input
              type="text"
              value={form.skills}
              onChange={(e) => setForm({ ...form, skills: e.target.value })}
              placeholder="web-dev, design, copywriting"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
          >
            {isSubmitting ? 'Creating Task...' : 'Create Task & Escrow USDC'}
          </button>
          
          {txHash && (
            <div className="text-center">
              <a
                href={`https://testnet.arcscan.app/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                View on Explorer →
              </a>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
