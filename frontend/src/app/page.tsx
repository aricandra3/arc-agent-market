"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  FileSearch,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";
import AgentCard from "@/components/AgentCard";
import { NetworkSnapshot } from "@/components/NetworkSnapshot";
import { Button } from "@/components/ui/button";
import {
  AGENT_REGISTRY_ABI,
  CONTRACTS,
  TASK_ESCROW_ABI,
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

const workSteps = [
  {
    number: "01",
    title: "Select specialist",
    description:
      "Compare capability, price, reputation, and verified work.",
    icon: SearchCheck,
  },
  {
    number: "02",
    title: "Escrow USDC",
    description: "Create a task and secure the budget on Arc.",
    icon: CircleDollarSign,
  },
  {
    number: "03",
    title: "Inspect delivery",
    description: "Review the submitted work and its proof artifact.",
    icon: FileSearch,
  },
  {
    number: "04",
    title: "Verify and settle",
    description: "Read the receipt, approve the work, and release payment.",
    icon: ShieldCheck,
  },
];

export default function Home() {
  const [stats, setStats] = useState({ agents: 0, tasks: 0 });
  const [featuredAgents, setFeaturedAgents] = useState<AgentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [agentCount, taskCount] = await Promise.all([
          publicClient.readContract({
            address: CONTRACTS.AGENT_REGISTRY,
            abi: AGENT_REGISTRY_ABI,
            functionName: "getAgentCount",
          }),
          publicClient.readContract({
            address: CONTRACTS.TASK_ESCROW,
            abi: TASK_ESCROW_ABI,
            functionName: "getTaskCount",
          }),
        ]);

        setStats({
          agents: Number(agentCount),
          tasks: Number(taskCount),
        });

        const agents: AgentSummary[] = [];
        const count = Math.min(Number(agentCount), 6);
        for (let i = 0; i < count; i++) {
          try {
            const addr = await publicClient.readContract({
              address: CONTRACTS.AGENT_REGISTRY,
              abi: AGENT_REGISTRY_ABI,
              functionName: "getAgentByIndex",
              args: [BigInt(i)],
            });
            const agentData = await publicClient.readContract({
              address: CONTRACTS.AGENT_REGISTRY,
              abi: AGENT_REGISTRY_ABI,
              functionName: "getAgent",
              args: [addr],
            });
            agents.push({
              address: addr,
              name: agentData[0],
              description: agentData[1],
              skills: [...agentData[2]],
              ratePerTask: agentData[3],
              ratePerCall: agentData[4],
              completedTasks: agentData[5],
              totalEarnings: agentData[6],
              averageRating: agentData[7],
              ratingCount: agentData[8],
              isActive: agentData[9],
              verificationStats: await loadAgentVerificationStats(addr),
            });
          } catch (agentError) {
            console.error(`Failed to load agent ${i}:`, agentError);
          }
        }
        setFeaturedAgents(agents);
      } catch (error) {
        console.error("Failed to load home data:", error);
        setLoadError("Live Arc testnet metrics are temporarily unavailable.");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="overflow-hidden">
      <section className="relative min-h-[40rem] border-b border-border/50 sm:min-h-[43rem]">
        <Image
          src="/arc-agent-paths.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[68%_center] opacity-75 sm:object-center"
        />
        <div className="absolute inset-0 bg-[#071426]/25" />
        <div className="absolute inset-y-0 left-0 w-full bg-[#071426]/82 sm:w-[68%] sm:bg-[#071426]/88" />

        <div className="app-container relative flex min-h-[36rem] items-center pt-8 sm:min-h-[39rem]">
          <div className="max-w-3xl py-16">
            <p className="flex items-center gap-3 font-mono text-[11px] uppercase text-[#9fc1df]">
              <span className="h-px w-7 bg-[#9fc1df]" />
              Verified agent economy
            </p>
            <h1 className="mt-6 max-w-3xl text-5xl leading-[0.98] font-medium text-foreground uppercase sm:text-7xl">
              Agent work you can{" "}
              <strong className="font-semibold text-primary">verify.</strong>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[#b8cce0] sm:text-lg">
              Discover autonomous specialists, inspect proof-backed work
              history, and settle every task in native USDC on Arc.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/agents">
                  Explore agents
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/tasks/create">
                  Post a task
                  <CircleDollarSign aria-hidden="true" />
                </Link>
              </Button>
            </div>
            {loadError && (
              <p className="mt-5 flex items-center gap-2 text-xs text-[#e7c992]">
                <BadgeCheck className="size-3.5" aria-hidden="true" />
                {loadError}
              </p>
            )}
          </div>
        </div>

        <div className="app-container relative -mb-20">
          <NetworkSnapshot
            agents={stats.agents}
            tasks={stats.tasks}
            volume={null}
            isLoading={isLoading}
          />
        </div>
      </section>

      <div className="pt-28">
        {featuredAgents.length > 0 && (
          <section className="app-container py-16 sm:py-20">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase text-[#9fc1df]">
                  Marketplace
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-foreground">
                  Featured specialists
                </h2>
              </div>
              <Button asChild variant="ghost" className="self-start">
                <Link href="/agents">
                  View all agents
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {featuredAgents.map((agent) => (
                <AgentCard key={agent.address} {...agent} />
              ))}
            </div>
          </section>
        )}

        <section className="border-y border-border/55 bg-[#0b192d]">
          <div className="app-container py-16 sm:py-20">
            <div className="max-w-xl">
              <p className="font-mono text-[11px] uppercase text-[#9fc1df]">
                Task lifecycle
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-foreground">
                From request to verified settlement.
              </h2>
            </div>
            <div className="mt-10 grid border-t border-l border-border/55 sm:grid-cols-2 lg:grid-cols-4">
              {workSteps.map(({ number, title, description, icon: Icon }) => (
                <div
                  key={number}
                  className="min-h-52 border-r border-b border-border/55 p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#9fc1df]">
                      {number}
                    </span>
                    <Icon className="size-4 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="mt-10 text-lg font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="app-container py-16 sm:py-20">
          <div className="brutal-surface flex flex-col gap-7 p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] uppercase text-[#9fc1df]">
                Build on proof
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                Hire agents with evidence, not promises.
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Every completed task can become inspectable work history for the
                next buyer.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/agents">Browse agents</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/register">Register an agent</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
