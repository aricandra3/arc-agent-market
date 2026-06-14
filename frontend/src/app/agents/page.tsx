"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, RadioTower, Search, SlidersHorizontal } from "lucide-react";
import AgentCard from "@/components/AgentCard";
import { EmptyState } from "@/components/EmptyState";
import { MarketplaceHoverGrid } from "@/components/exagora/MarketplaceHoverGrid";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AGENT_REGISTRY_ABI,
  CONTRACTS,
  loadAgentVerificationStats,
  publicClient,
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
        const count = await publicClient.readContract({
          address: CONTRACTS.AGENT_REGISTRY,
          abi: AGENT_REGISTRY_ABI,
          functionName: "getAgentCount",
        });

        const loaded: AgentSummary[] = [];
        for (let i = 0; i < Number(count); i++) {
          try {
            const addr = await publicClient.readContract({
              address: CONTRACTS.AGENT_REGISTRY,
              abi: AGENT_REGISTRY_ABI,
              functionName: "getAgentByIndex",
              args: [BigInt(i)],
            });
            const data = await publicClient.readContract({
              address: CONTRACTS.AGENT_REGISTRY,
              abi: AGENT_REGISTRY_ABI,
              functionName: "getAgent",
              args: [addr],
            });
            loaded.push({
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
            });
          } catch (agentError) {
            console.error(`Failed to load agent ${i}:`, agentError);
          }
        }
        setAgents(loaded);
      } catch (error) {
        console.error("Failed to load agents:", error);
        setLoadError("Agent records could not be loaded from Arc testnet.");
      } finally {
        setIsLoading(false);
      }
    }

    loadAgents();
  }, []);

  const filtered = agents.filter((agent) => {
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
  });

  const clearFilters = () => {
    setSearch("");
    setSkillFilter("");
  };

  return (
    <div className="app-container py-10 sm:py-14">
      <PageHeader
        eyebrow="Marketplace"
        title="Browse agents"
        description="Compare autonomous specialists by capability, price, reputation, and proof-backed work history."
        action={
          <Button asChild>
            <Link href="/register">Register an agent</Link>
          </Button>
        }
      />

      <div className="mt-8 flex flex-col gap-4 border border-border/70 bg-[#0b192d] p-4 sm:flex-row sm:items-center">
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
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="brutal-surface min-h-[22rem] space-y-5 p-5"
              >
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-36 rounded-[2px] bg-primary/10" />
                    <Skeleton className="h-3 w-28 rounded-[2px] bg-primary/10" />
                  </div>
                  <Skeleton className="h-7 w-16 rounded-[2px] bg-primary/10" />
                </div>
                <Skeleton className="h-12 w-full rounded-[2px] bg-primary/10" />
                <Skeleton className="h-14 w-full rounded-[2px] bg-primary/10" />
                <Skeleton className="mt-16 h-12 w-full rounded-[2px] bg-primary/10" />
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
            description="Register the first autonomous specialist on this Arc Agent Market deployment."
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
          <MarketplaceHoverGrid className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((agent) => (
              <AgentCard key={agent.address} {...agent} />
            ))}
          </MarketplaceHoverGrid>
        )}
      </div>
    </div>
  );
}
