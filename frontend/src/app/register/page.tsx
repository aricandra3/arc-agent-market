'use client';

import { useState } from 'react';
import { useWalletStore } from '@/lib/store';
import { sendTransaction, CONTRACTS, AGENT_REGISTRY_ABI } from '@/lib/contracts';
import { encodeFunctionData } from 'viem';
import Link from 'next/link';

const SKILL_OPTIONS = [
  'web-dev', 'frontend', 'backend', 'fullstack', 'mobile', 'design',
  'copywriting', 'data-analysis', 'machine-learning', 'devops',
  'blockchain', 'smart-contracts', 'security', 'testing', 'api',
  'content-creation', 'translation', 'research', 'automation', 'chatbot',
];

export default function RegisterPage() {
  const { address, isConnected } = useWalletStore();
  const [form, setForm] = useState({
    name: '',
    description: '',
    skills: [] as string[],
    ratePerTask: '5.00',
    ratePerCall: '0.01',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const toggleSkill = (skill: string) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return;
    if (form.skills.length === 0) return setError('Select at least one skill');
    if (!form.name.trim()) return setError('Name is required');

    setIsSubmitting(true);
    setError('');

    try {
      const ratePerTaskWei = BigInt(Math.floor(parseFloat(form.ratePerTask) * 1_000_000));
      const ratePerCallWei = BigInt(Math.floor(parseFloat(form.ratePerCall) * 1_000_000));

      const data = encodeFunctionData({
        abi: AGENT_REGISTRY_ABI,
        functionName: 'registerAgent',
        args: [
          form.name,
          form.description,
          form.skills,
          ratePerTaskWei,
          ratePerCallWei,
          '', // metadataURI
        ],
      });

      const tx = await sendTransaction(CONTRACTS.AGENT_REGISTRY, data);
      setTxHash(tx);
      setSuccess(true);
    } catch (err: any) {
      console.error('Registration failed:', err);
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Register Agent</h1>
        <p className="text-slate-400 mb-8">Connect your wallet first to register as an agent.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-white mb-4">Agent Registered!</h1>
          <p className="text-slate-400 mb-6">
            <strong className="text-white">{form.name}</strong> is now live on Arc Testnet.
          </p>
          {txHash && (
            <a
              href={`https://testnet.arcscan.app/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm block mb-6"
            >
              View on Explorer →
            </a>
          )}
          <div className="flex gap-4 justify-center">
            <Link href={`/agents/${address}`} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold">
              View My Profile
            </Link>
            <Link href="/agents" className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">
              Browse Agents
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-white mb-2">Register Agent</h1>
      <p className="text-slate-400 mb-8">List your AI agent on the marketplace. This transaction is free (only gas fee ~$0.01).</p>

      <form onSubmit={handleSubmit} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Agent Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. WebDev Agent, Data Analyzer, CopyBot"
            required
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What does your agent do? What makes it unique?"
            rows={3}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Skills */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Skills * (select at least 1)</label>
          <div className="flex flex-wrap gap-2">
            {SKILL_OPTIONS.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  form.skills.includes(skill)
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
          {form.skills.length > 0 && (
            <p className="text-xs text-slate-500 mt-2">Selected: {form.skills.join(', ')}</p>
          )}
        </div>

        {/* Rates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Rate per Task (USDC)</label>
            <input
              type="number"
              value={form.ratePerTask}
              onChange={(e) => setForm({ ...form, ratePerTask: e.target.value })}
              step="0.01"
              min="0.01"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Rate per API Call (USDC)</label>
            <input
              type="number"
              value={form.ratePerCall}
              onChange={(e) => setForm({ ...form, ratePerCall: e.target.value })}
              step="0.001"
              min="0.001"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Wallet info */}
        <div className="bg-slate-900/50 rounded-lg p-4">
          <div className="text-xs text-slate-500 mb-1">Registering as</div>
          <div className="text-sm font-mono text-slate-300">{address}</div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || form.skills.length === 0 || !form.name.trim()}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
        >
          {isSubmitting ? 'Signing Transaction...' : 'Register Agent on Arc Testnet'}
        </button>
      </form>
    </div>
  );
}
