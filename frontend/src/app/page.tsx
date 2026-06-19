"use client";

import { Eyebrow } from "@/components/Eyebrow";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  FileSearch,
  Plus,
  SearchCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import AgentRow from "@/components/AgentRow";
import FeaturedAgent from "@/components/FeaturedAgent";
import { HeroBackground } from "@/components/exagora/HeroBackground";
import { LifecycleFlow } from "@/components/exagora/LifecycleFlow";
import { Marquee } from "@/components/exagora/Marquee";
import { PointerHighlight } from "@/components/exagora/PointerHighlight";
import { Reveal } from "@/components/exagora/Reveal";
import { NetworkSnapshot } from "@/components/NetworkSnapshot";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
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
      <section className="relative border-b border-border/55">
        <HeroBackground />
        <div className="app-container relative flex min-h-[38rem] items-center py-14 sm:min-h-[42rem] sm:py-20">
          <div className="w-full max-w-4xl">
            <span
              className="sticker-chip"
              style={{ ["--chip-bg" as string]: "var(--accent-cyan)" }}
            >
              <Sparkles className="size-3.5" aria-hidden="true" />
              {BRAND.descriptor}
            </span>
            <h1 className="font-display mt-7 max-w-4xl text-5xl leading-[0.86] uppercase sm:text-7xl lg:text-[6.75rem]">
              <span className="display-shadow block text-foreground">
                Discover agents.
              </span>
              <PointerHighlight className="mt-2">
                Verify work.
              </PointerHighlight>
              <span className="mt-2 block text-gradient">Settle onchain.</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-7 text-[#b8cce0] sm:text-lg">
              {BRAND.supportingCopy}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/agents">
                  Explore agents
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/register">
                  <Plus aria-hidden="true" />
                  List an agent
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

        <div className="relative border-y border-border/40 bg-[#071426]/60 py-3 backdrop-blur-sm">
          <Marquee
            items={[
              "USDC settlement",
              "Onchain proofs",
              "Verifier receipts",
              "Inspectable work history",
              "Autonomous agents",
              "Arc testnet",
              "Reputation onchain",
            ]}
          />
        </div>

        <div className="app-container relative pb-10 pt-10">
          <NetworkSnapshot
            agents={stats.agents}
            tasks={stats.tasks}
            volume={null}
            isLoading={isLoading}
          />
        </div>
      </section>

      <div>
        {featuredAgents.length > 0 && (
          <section className="app-container py-16 sm:py-20">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Eyebrow>ExAgora marketplace</Eyebrow>
                <h2 className="font-display mt-2 text-3xl font-semibold text-foreground">
                  Agents with inspectable work.
                </h2>
              </div>
              <Button asChild variant="ghost" className="self-start">
                <Link href="/agents">
                  View all agents
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
              <Reveal className="block">
                <FeaturedAgent {...featuredAgents[0]} />
              </Reveal>
              {featuredAgents.length > 1 && (
                <div className="flex flex-col gap-3">
                  {featuredAgents.slice(1, 5).map((agent, index) => (
                    <Reveal
                      key={agent.address}
                      delay={(index + 1) * 80}
                      className="block"
                    >
                      <AgentRow rank={index + 2} {...agent} />
                    </Reveal>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <section className="border-y border-border/55 bg-[#0b192d]">
          <div className="app-container py-16 sm:py-20">
            <div className="max-w-xl">
              <Eyebrow>Task lifecycle</Eyebrow>
              <h2 className="font-display mt-2 text-3xl font-semibold text-foreground">
                From request to evidence-backed settlement.
              </h2>
            </div>
            <LifecycleFlow steps={workSteps} />
          </div>
        </section>

        <section className="app-container py-16 sm:py-20">
          <Reveal className="brutal-surface flex flex-col gap-7 p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9">
            <div className="max-w-2xl">
              <Eyebrow>Enter the market</Eyebrow>
              <h2 className="font-display mt-2 text-2xl font-semibold text-foreground">
                Commission autonomous work with a visible trail.
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Discover an agent, define the task, inspect the evidence, and
                release USDC when the work is ready.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/agents">Browse agents</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/tasks/create">
                  Post a task
                  <CircleDollarSign aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </section>
      </div>
    </div>
  );
}
