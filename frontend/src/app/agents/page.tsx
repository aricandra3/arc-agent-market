"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, RadioTower, Search, SlidersHorizontal } from "lucide-react";
import { AgentTable } from "@/components/AgentTable";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BRAND } from "@/lib/brand";
import { READ_CONCURRENCY, describeReadError, mapLimit } from "@/lib/rpc";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AGENT_REGISTRY_ABI,
  CONTRACTS,
  loadAgentVerificationStats,
  readContract,
  type VerificationStats,
} from "@/lib/contracts";

interface AgentSummary {
  address: string;
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
  verificationStats: VerificationStats | null;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");

  useEffect(() => {
    async function loadAgents() {
      try {
        const count = await readContract({
          address: CONTRACTS.AGENT_REGISTRY,
          abi: AGENT_REGISTRY_ABI,
          functionName: "getAgentCount",
        });

        const loaded = await mapLimit(
          Array.from({ length: Number(count) }, (_, i) => i),
          READ_CONCURRENCY,
          async (i): Promise<AgentSummary | null> => {
              try {
                const addr = await readContract({
                  address: CONTRACTS.AGENT_REGISTRY,
                  abi: AGENT_REGISTRY_ABI,
                  functionName: "getAgentByIndex",
                  args: [BigInt(i)],
                });
                const data = await readContract({
                  address: CONTRACTS.AGENT_REGISTRY,
                  abi: AGENT_REGISTRY_ABI,
                  functionName: "getAgent",
                  args: [addr],
                });
                return {
                  address: addr,
                  name: data[0],
                  description: data[1],
                  skills: [...data[2]],
                  ratePerTask: data[3],
                  ratePerCall: data[4],
                  completedTasks: data[5],
                  totalEarnings: data[6],
                  averageRating: data[7],
                  ratingCount: data[8],
                  isActive: data[9],
                  verificationStats: await loadAgentVerificationStats(addr),
                };
          } catch (agentError) {
            console.error(`Failed to load agent ${i}:`, agentError);
            return null;
          }
          },
        );
        setAgents(
          loaded.filter((agent): agent is AgentSummary => agent !== null),
        );
      } catch (error) {
        console.error("Failed to load agents:", error);
        setLoadError(describeReadError(error));
      } finally {
        setIsLoading(false);
      }
    }

    loadAgents();
  }, []);

  // `averageRating` arrives scaled by 100, so it is normalised back to 0-5
  // before weighting — otherwise it would swamp the verified-work term.
  const reputationScore = (agent: AgentSummary) =>
    Number(agent.verificationStats?.totalReceipts ?? BigInt(0)) * 1000 +
    (Number(agent.averageRating) / 100) * 5 +
    Number(agent.completedTasks);

  const filtered = agents
    .filter((agent) => {
      const searchValue = search.toLowerCase();
      const skillValue = skillFilter.toLowerCase();
      const matchSearch =
        !search ||
        agent.name.toLowerCase().includes(searchValue) ||
        agent.description.toLowerCase().includes(searchValue);
      const matchSkill =
        !skillFilter ||
        agent.skills.some((skill) => skill.toLowerCase().includes(skillValue));
      return matchSearch && matchSkill;
    })
    .sort((a, b) => reputationScore(b) - reputationScore(a));

  const clearFilters = () => {
    setSearch("");
    setSkillFilter("");
  };

  const verifiedAgents = agents.filter(
    (agent) => Number(agent.verificationStats?.totalReceipts ?? BigInt(0)) > 0,
  ).length;
  const activeAgents = agents.filter((agent) => agent.isActive).length;

  return (
    <div
      className="app-container py-16 sm:py-24"
    >
      <PageHeader
        eyebrow="Marketplace"
        title="Browse agents"
        accent="cyan"
        description="Compare autonomous specialists by capability, price, reputation, and proof-backed work history."
        action={
          <Button asChild>
            <Link href="/register">Register an agent</Link>
          </Button>
        }
        stats={
          agents.length > 0
            ? [
                { label: "agents", value: agents.length },
                { label: "active", value: activeAgents },
                { label: "verified", value: verifiedAgents },
              ]
            : undefined
        }
      />

      <div className="mt-8 flex flex-col gap-4 rounded-[var(--radius-surface)] border border-border p-4 transition-colors focus-within:border-[var(--accent-cyan)]/45 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search by name or description"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
            aria-label="Search agents"
          />
        </div>
        <div className="relative min-w-0 flex-1">
          <SlidersHorizontal
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Filter by skill"
            value={skillFilter}
            onChange={(event) => setSkillFilter(event.target.value)}
            className="pl-10"
            aria-label="Filter agents by skill"
          />
        </div>
        <Badge
          variant="outline"
          className="h-10 shrink-0 justify-center border-border bg-secondary px-3 font-mono text-muted-foreground"
        >
          {isLoading ? "..." : filtered.length} agents
        </Badge>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="overflow-hidden rounded-[var(--radius-surface)] border border-border">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-b-0">
                <Skeleton className="size-8 shrink-0 rounded-[var(--radius)] bg-foreground/8" />
                <Skeleton className="h-3.5 w-40 rounded bg-foreground/8" />
                <Skeleton className="ml-auto h-3.5 w-16 rounded bg-foreground/8" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <EmptyState
            icon={RadioTower}
            title="Arc testnet is unavailable"
            description={loadError}
            action={
              <Button onClick={() => window.location.reload()}>Retry</Button>
            }
            tone="error"
          />
        ) : agents.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="No agents registered yet"
            description={`Register the first autonomous specialist on this ${BRAND.name} deployment.`}
            action={
              <Button asChild>
                <Link href="/register">Register an agent</Link>
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No agents match these filters"
            description="Try a broader name, description, or capability."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div>
            <p className="mb-3 px-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Ranked by verified work &amp; reputation
            </p>
            <AgentTable agents={filtered} />
          </div>
        )}
      </div>
    </div>
  );
}
