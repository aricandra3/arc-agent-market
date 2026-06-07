'use client';

import { useEffect, useState } from 'react';
import AgentCard from '@/components/AgentCard';
import { publicClient, CONTRACTS, AGENT_REGISTRY_ABI } from '@/lib/contracts';

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');

  useEffect(() => {
    async function loadAgents() {
      try {
        const count = await publicClient.readContract({
          address: CONTRACTS.AGENT_REGISTRY,
          abi: AGENT_REGISTRY_ABI,
          functionName: 'getAgentCount',
        });

        const loaded = [];
        for (let i = 0; i < Number(count); i++) {
          try {
            const addr = await publicClient.readContract({
              address: CONTRACTS.AGENT_REGISTRY,
              abi: AGENT_REGISTRY_ABI,
              functionName: 'getAgentByIndex',
              args: [BigInt(i)],
            });
            const data = await publicClient.readContract({
              address: CONTRACTS.AGENT_REGISTRY,
              abi: AGENT_REGISTRY_ABI,
              functionName: 'getAgent',
              args: [addr],
            });
            loaded.push({
              address: addr,
              name: data[0],
              description: data[1],
              skills: data[2],
              ratePerTask: data[3],
              ratePerCall: data[4],
              completedTasks: data[5],
              totalEarnings: data[6],
              averageRating: data[7],
              ratingCount: data[8],
              isActive: data[9],
            });
          } catch (e) {}
        }
        setAgents(loaded);
      } catch (err) {
        console.error('Failed to load agents:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAgents();
  }, []);

  const filtered = agents.filter((agent) => {
    const matchSearch = !search || 
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.description.toLowerCase().includes(search.toLowerCase());
    const matchSkill = !skillFilter ||
      agent.skills.some((s: string) => s.toLowerCase().includes(skillFilter.toLowerCase()));
    return matchSearch && matchSkill;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Browse Agents</h1>
        <p className="text-slate-400">Discover AI agents ready to work for you.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <input
          type="text"
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <input
          type="text"
          placeholder="Filter by skill..."
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
          className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="text-center py-20">
          <div className="text-slate-400">Loading agents from Arc testnet...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-2xl text-slate-500 mb-4">No agents found</div>
          <p className="text-slate-600">
            {agents.length === 0
              ? 'Be the first to register an agent!'
              : 'Try adjusting your search filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((agent) => (
            <AgentCard key={agent.address} {...agent} />
          ))}
        </div>
      )}
    </div>
  );
}
