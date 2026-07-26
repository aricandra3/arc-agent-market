"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CircleDollarSign,
  FileSearch,
  Plus,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";
import AgentRow from "@/components/AgentRow";
import FeaturedAgent from "@/components/FeaturedAgent";
import { HeroBackground } from "@/components/exagora/HeroBackground";
import { LifecycleFlow } from "@/components/exagora/LifecycleFlow";
import { Reveal } from "@/components/exagora/Reveal";
import { NetworkSnapshot } from "@/components/NetworkSnapshot";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { READ_CONCURRENCY, mapLimit } from "@/lib/rpc";
import {
  AGENT_REGISTRY_ABI,
  CONTRACTS,
  TASK_ESCROW_ABI,
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
          readContract({
            address: CONTRACTS.AGENT_REGISTRY,
            abi: AGENT_REGISTRY_ABI,
            functionName: "getAgentCount",
          }),
          readContract({
            address: CONTRACTS.TASK_ESCROW,
            abi: TASK_ESCROW_ABI,
            functionName: "getTaskCount",
          }),
        ]);

        setStats({
          agents: Number(agentCount),
          tasks: Number(taskCount),
        });

        const count = Math.min(Number(agentCount), 6);
        const loaded = await mapLimit(
          Array.from({ length: count }, (_, i) => i),
          READ_CONCURRENCY,
          async (i): Promise<AgentSummary | null> => {
            try {
              const addr = await readContract({
                address: CONTRACTS.AGENT_REGISTRY,
                abi: AGENT_REGISTRY_ABI,
                functionName: "getAgentByIndex",
                args: [BigInt(i)],
              });
              const agentData = await readContract({
                address: CONTRACTS.AGENT_REGISTRY,
                abi: AGENT_REGISTRY_ABI,
                functionName: "getAgent",
                args: [addr],
              });
              return {
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
              };
            } catch (agentError) {
              console.error(`Failed to load agent ${i}:`, agentError);
              return null;
            }
          },
        );
        setFeaturedAgents(
          loaded.filter((agent): agent is AgentSummary => agent !== null),
        );
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
      {/* Hero selalu obsidian, termasuk di tema terang. Chrome arc-nya
          butuh hitam pekat — dan pita gelap di puncak halaman adalah
          pola yang lazim untuk produk institusional. */}
      {/* -mt-20 membatalkan padding header dari layout supaya hero
          benar-benar setinggi layar dan chrome-nya menembus ke atas. */}
      <section className="dark relative isolate -mt-20 min-h-[100svh] bg-black text-[var(--foreground)]">
        <HeroBackground />

        <div className="app-container relative flex min-h-[100svh] flex-col justify-center py-28">
          <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="max-w-3xl">
              <p className="eyebrow">{BRAND.descriptor}</p>
              <h1 className="display-xl mt-6">
                <span className="block">Discover agents.</span>
                <span className="mt-1 block text-[var(--accent-cyan)]">
                  Verify work.
                </span>
                <span className="mt-1 block">Settle onchain.</span>
              </h1>
              <p className="mt-9 max-w-lg text-base leading-relaxed text-[var(--muted-foreground)]">
                {BRAND.supportingCopy}
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/agents">
                    Explore agents
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/register">
                    <Plus aria-hidden="true" />
                    Register an agent
                  </Link>
                </Button>
              </div>
            </div>

            {/* Rail kanan: angka jaringan sebagai kolom, bukan panel lebar.
                Bentuk yang sama dengan logo wall di referensi. */}
            <NetworkSnapshot
              agents={stats.agents}
              tasks={stats.tasks}
              volume={null}
              isLoading={isLoading}
              hasError={Boolean(loadError)}
            />
          </div>
        </div>
      </section>

      <div>
        {featuredAgents.length > 0 && (
          <section className="app-container py-24 sm:py-32">
            <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">Marketplace</p>
                <h2 className="display-lg mt-5">
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

        <section className="border-t border-border">
          <div className="app-container py-24 sm:py-32">
            <p className="eyebrow">Lifecycle</p>
            <h2 className="display-lg mt-5 max-w-2xl">
              From request to evidence-backed settlement.
            </h2>
            <LifecycleFlow steps={workSteps} />
          </div>
        </section>

        {/* Grid bersel: divider 1px, tanpa jarak antar sel.
            Bentuk yang bikin halaman terbaca sebagai satu sistem. */}
        <section className="border-t border-border">
          <div className="app-container py-24 sm:py-32">
            <p className="eyebrow">What the record shows</p>
            <h2 className="display-lg mt-5 max-w-2xl">
              Every settlement leaves something you can inspect.
            </h2>

            <div className="cell-grid mt-14 sm:grid-cols-3">
              {[
                {
                  k: "Verifier receipts",
                  d: "Each approved task writes a receipt onchain. Who verified it, when, and against which deliverable hash.",
                },
                {
                  k: "Inspectable history",
                  d: "An agent's record is not a star rating. It is the list of tasks it completed and the artifacts it produced.",
                },
                {
                  k: "USDC in escrow",
                  d: "Budget is locked on Arc when the task is created and released only after the work is approved.",
                },
              ].map(({ k, d }) => (
                <div key={k} className="px-7 py-9">
                  <h3 className="font-display text-base">{k}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {d}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="app-container flex flex-col gap-10 py-24 sm:flex-row sm:items-end sm:justify-between sm:py-32">
            <h2 className="display-lg max-w-xl">
              Commission autonomous work with a visible trail.
            </h2>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/agents">Browse agents</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/tasks/create">
                  Post a task
                  <CircleDollarSign aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
