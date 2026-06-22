"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CircleDollarSign,
  FileCheck2,
  ListTodo,
  Plus,
  RadioTower,
  Star,
  UserRound,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { MarketplaceHoverGrid } from "@/components/exagora/MarketplaceHoverGrid";
import { Reveal } from "@/components/exagora/Reveal";
import { PageHeader } from "@/components/PageHeader";
import TaskCard from "@/components/TaskCard";
import { SkillBadge } from "@/components/SkillBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AGENT_REGISTRY_ABI,
  CONTRACTS,
  TASK_ESCROW_ABI,
  formatPercentBps,
  formatUSDC,
  loadAgentVerificationStats,
  publicClient,
  shortAddress,
  type VerificationStats,
} from "@/lib/contracts";
import { useWalletStore } from "@/lib/store";

interface DashboardAgent {
  name: string;
  skills: string[];
  ratePerTask: bigint;
  completedTasks: bigint;
  totalEarnings: bigint;
  averageRating: bigint;
  ratingCount: bigint;
  verificationStats: VerificationStats | null;
}

interface DashboardTask {
  id: number;
  requester: string;
  provider: string;
  budget: bigint;
  description: string;
  status: number;
  createdAt: bigint;
  deadline: bigint;
}

export default function DashboardPage() {
  const { address, isConnected } = useWalletStore();
  const [agent, setAgent] = useState<DashboardAgent | null>(null);
  const [requestedTasks, setRequestedTasks] = useState<DashboardTask[]>([]);
  const [providerTasks, setProviderTasks] = useState<DashboardTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!address) return;

    const walletAddress = address as `0x${string}`;
    let isCurrent = true;

    async function loadTaskRecords(ids: readonly bigint[]) {
      const records = await Promise.all(
        [...ids]
          .slice(-10)
          .reverse()
          .map(async (id): Promise<DashboardTask | null> => {
            try {
              const data = await publicClient.readContract({
                address: CONTRACTS.TASK_ESCROW,
                abi: TASK_ESCROW_ABI,
                functionName: "getTask",
                args: [id],
              });

              return {
                id: Number(id),
                requester: data[0],
                provider: data[1],
                budget: data[2],
                description: data[3],
                status: Number(data[4]),
                createdAt: data[5],
                deadline: data[6],
              };
            } catch (taskError) {
              console.error(`Failed to load task ${id}:`, taskError);
              return null;
            }
          }),
      );

      return records.filter(
        (record): record is DashboardTask => record !== null,
      );
    }

    async function loadAgentProfile(): Promise<DashboardAgent | null> {
      const isRegistered = await publicClient.readContract({
        address: CONTRACTS.AGENT_REGISTRY,
        abi: AGENT_REGISTRY_ABI,
        functionName: "isRegistered",
        args: [walletAddress],
      });

      if (!isRegistered) return null;

      const [data, verificationStats] = await Promise.all([
        publicClient.readContract({
          address: CONTRACTS.AGENT_REGISTRY,
          abi: AGENT_REGISTRY_ABI,
          functionName: "getAgent",
          args: [walletAddress],
        }),
        loadAgentVerificationStats(walletAddress),
      ]);

      return {
        name: data[0],
        skills: [...data[2]],
        ratePerTask: data[3],
        completedTasks: data[5],
        totalEarnings: data[6],
        averageRating: data[7],
        ratingCount: data[8],
        verificationStats,
      };
    }

    async function loadDashboard() {
      setIsLoading(true);
      setLoadError("");

      try {
        const [profile, requesterIds, providerIds] = await Promise.all([
          loadAgentProfile(),
          publicClient.readContract({
            address: CONTRACTS.TASK_ESCROW,
            abi: TASK_ESCROW_ABI,
            functionName: "getRequesterTasks",
            args: [walletAddress],
          }),
          publicClient.readContract({
            address: CONTRACTS.TASK_ESCROW,
            abi: TASK_ESCROW_ABI,
            functionName: "getProviderTasks",
            args: [walletAddress],
          }),
        ]);
        const [requested, assigned] = await Promise.all([
          loadTaskRecords(requesterIds),
          loadTaskRecords(providerIds),
        ]);

        if (!isCurrent) return;
        setAgent(profile);
        setRequestedTasks(requested);
        setProviderTasks(assigned);
      } catch (error) {
        console.error("Failed to load dashboard:", error);
        if (isCurrent) {
          setLoadError(
            "Dashboard data could not be read from Arc testnet. Try again shortly.",
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadDashboard();

    return () => {
      isCurrent = false;
    };
  }, [address]);

  if (!isConnected) {
    return (
      <div className="app-container py-12">
        <EmptyState
          icon={UserRound}
          title="Connect to open your workspace"
          description="Your requester tasks, assigned agent work, earnings, and verified receipts will appear here."
          headingLevel="h1"
          action={
            <Button asChild variant="outline">
              <Link href="/agents">Browse agents</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="app-container space-y-7 py-10 sm:py-14">
        <Skeleton className="h-28 rounded-lg bg-primary/10" />
        <Skeleton className="h-48 rounded-lg bg-primary/10" />
        <Skeleton className="h-64 rounded-lg bg-primary/10" />
      </div>
    );
  }

  const receiptCount = Number(
    agent?.verificationStats?.totalReceipts ?? BigInt(0),
  );
  const rating =
    agent && Number(agent.ratingCount) > 0
      ? Number(agent.averageRating) / 100
      : 0;

  return (
    <div
      className="app-container py-10 sm:py-14"
      style={{ ["--page-accent" as string]: "var(--accent-gold)" }}
    >
      <PageHeader
        eyebrow={`Workspace / ${shortAddress(address || "")}`}
        title="Operations dashboard"
        accent="gold"
        description="Track work from both sides of the marketplace and keep payment, delivery, and verification state in one place."
        stats={[
          { label: "requested", value: requestedTasks.length },
          { label: "provider", value: providerTasks.length },
          { label: "agent", value: agent ? "Registered" : "—" },
        ]}
        action={
          <Button asChild>
            <Link href="/tasks/create">
              <Plus aria-hidden="true" />
              Create task
            </Link>
          </Button>
        }
      />

      {loadError && (
        <div
          className="mt-7 rounded-[0.9rem] border border-[#d36c72]/70 bg-[#351b28]/55 px-5 py-4 text-sm text-[#f1b3b7]"
          role="alert"
        >
          {loadError}
        </div>
      )}

      <Reveal className="mt-7 brutal-surface block">
        {agent ? (
          <>
            <div className="flex flex-col gap-5 border-b border-border/55 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    {agent.name}
                  </h2>
                  <Badge
                    variant="outline"
                    className="border-[#70b7ad]/65 bg-[#102c32] text-[#9cd4cc]"
                  >
                    <BadgeCheck aria-hidden="true" />
                    Registered agent
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {agent.skills.map((skill) => (
                    <SkillBadge key={skill} skill={skill} className="px-3 py-1 text-xs" />
                  ))}
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/agents/${address}`}>View public profile</Link>
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5">
              <DashboardMetric
                icon={CircleDollarSign}
                label="Task rate"
                value={`${formatUSDC(agent.ratePerTask)} USDC`}
              />
              <DashboardMetric
                icon={BriefcaseBusiness}
                label="Completed"
                value={Number(agent.completedTasks).toLocaleString()}
              />
              <DashboardMetric
                icon={CircleDollarSign}
                label="Total earned"
                value={`${formatUSDC(agent.totalEarnings)} USDC`}
              />
              <DashboardMetric
                icon={Star}
                label="Buyer rating"
                value={
                  Number(agent.ratingCount) > 0
                    ? `${rating.toFixed(1)} / 5`
                    : "No reviews"
                }
              />
              <DashboardMetric
                icon={FileCheck2}
                label="Verified receipts"
                value={
                  receiptCount > 0
                    ? receiptCount.toLocaleString()
                    : "Not recorded"
                }
                accent={receiptCount > 0}
              />
            </div>
            {agent.verificationStats && receiptCount > 0 && (
              <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border/55 px-5 py-4 font-mono text-xs text-muted-foreground sm:px-6">
                <span>
                  Pass rate{" "}
                  <strong className="text-[#9cd4cc]">
                    {formatPercentBps(agent.verificationStats.passRate)}
                  </strong>
                </span>
                <span>
                  Average proof score{" "}
                  <strong className="text-foreground">
                    {formatPercentBps(agent.verificationStats.averageScore)}
                  </strong>
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Agent identity</p>
              <h2 className="mt-2 font-display text-xl font-semibold text-foreground">
                Add a provider profile
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Register this wallet to accept tasks, publish commercial terms,
                and build a verifier-backed work history.
              </p>
            </div>
            <Button asChild>
              <Link href="/register">Register an agent</Link>
            </Button>
          </div>
        )}
      </Reveal>

      <Tabs defaultValue="requested" className="mt-9">
        <div className="flex flex-col gap-4 border-b border-border/65 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Task ledger</p>
            <h2 className="mt-2 font-display text-xl font-semibold text-foreground">
              Active work records
            </h2>
          </div>
          <TabsList className="h-auto gap-1 rounded-full border border-border/60 bg-[#0b192d]/70 p-1">
            <TabsTrigger
              value="requested"
              className="gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-all data-[state=active]:!border-[#04101f] data-[state=active]:!bg-[var(--page-accent)] data-[state=active]:!text-[#071426] data-[state=active]:!shadow-[2px_2px_0_#040c18]"
            >
              Requested
              <span className="rounded-full bg-current/15 px-1.5 py-0.5 font-mono text-[11px] tabular-nums">
                {requestedTasks.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="provider"
              className="gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-all data-[state=active]:!border-[#04101f] data-[state=active]:!bg-[var(--page-accent)] data-[state=active]:!text-[#071426] data-[state=active]:!shadow-[2px_2px_0_#040c18]"
            >
              Provider
              <span className="rounded-full bg-current/15 px-1.5 py-0.5 font-mono text-[11px] tabular-nums">
                {providerTasks.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="requested" className="mt-6">
          {requestedTasks.length > 0 ? (
            <MarketplaceHoverGrid className="grid gap-5 md:grid-cols-2">
              {requestedTasks.map((task, index) => (
                <Reveal key={task.id} delay={Math.min(index, 8) * 60} className="h-full">
                  <TaskCard {...task} />
                </Reveal>
              ))}
            </MarketplaceHoverGrid>
          ) : (
            <EmptyState
              icon={ListTodo}
              title="No requested tasks yet"
              description="Create a funded work request for a specific agent or open it to the marketplace."
              action={
                <Button asChild>
                  <Link href="/tasks/create">Create first task</Link>
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="provider" className="mt-6">
          {providerTasks.length > 0 ? (
            <MarketplaceHoverGrid className="grid gap-5 md:grid-cols-2">
              {providerTasks.map((task, index) => (
                <Reveal key={task.id} delay={Math.min(index, 8) * 60} className="h-full">
                  <TaskCard {...task} />
                </Reveal>
              ))}
            </MarketplaceHoverGrid>
          ) : (
            <EmptyState
              icon={RadioTower}
              title="No assigned provider work"
              description="Tasks assigned to this registered agent will appear here with their escrow and delivery state."
              action={
                <Button asChild variant="outline">
                  <Link href="/agents">View marketplace</Link>
                </Button>
              }
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardMetric({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: typeof CircleDollarSign;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="group/metric relative min-h-28 overflow-hidden border-r border-b border-border/55 p-5 transition-colors duration-300 hover:bg-[color-mix(in_srgb,var(--page-accent)_5%,transparent)] lg:border-b-0">
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px scale-x-0 bg-[linear-gradient(to_right,transparent,color-mix(in_srgb,var(--page-accent)_70%,transparent),transparent)] transition-transform duration-500 group-hover/metric:scale-x-100" />
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon
          className="size-3.5 transition-colors group-hover/metric:[color:var(--page-accent)]"
          aria-hidden="true"
        />
        {label}
      </p>
      <p
        className={`font-display mt-3 text-lg ${
          accent ? "text-[#9cd4cc]" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
