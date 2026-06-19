"use client";

import { Eyebrow } from "@/components/Eyebrow";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CircleDollarSign,
  ExternalLink,
  RadioTower,
  Star,
} from "lucide-react";
import { AgentGlyph } from "@/components/AgentGlyph";
import { EmptyState } from "@/components/EmptyState";
import { Reveal } from "@/components/exagora/Reveal";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BRAND } from "@/lib/brand";
import {
  AGENT_REGISTRY_ABI,
  CONTRACTS,
  REPUTATION_ABI,
  formatPercentBps,
  formatUSDC,
  loadAgentVerificationStats,
  publicClient,
  type VerificationStats,
} from "@/lib/contracts";
import { useWalletStore } from "@/lib/store";

interface AgentProfile {
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
  metadataURI: string;
}

interface ReputationSummary {
  averageRating: bigint;
  totalReviews: bigint;
  completedTasks: bigint;
  disputedTasks: bigint;
  totalEarnings: bigint;
  completionRate: bigint;
}

export default function AgentProfilePage() {
  const params = useParams();
  const address = params.id as string;
  const { isConnected } = useWalletStore();
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [reputation, setReputation] = useState<ReputationSummary | null>(null);
  const [verificationStats, setVerificationStats] =
    useState<VerificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadAgent() {
      try {
        const data = await publicClient.readContract({
          address: CONTRACTS.AGENT_REGISTRY,
          abi: AGENT_REGISTRY_ABI,
          functionName: "getAgent",
          args: [address as `0x${string}`],
        });
        setAgent({
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
          metadataURI: data[10],
        });

        try {
          const rep = await publicClient.readContract({
            address: CONTRACTS.REPUTATION,
            abi: REPUTATION_ABI,
            functionName: "getReputation",
            args: [address as `0x${string}`],
          });
          setReputation({
            averageRating: rep[0],
            totalReviews: rep[1],
            completedTasks: rep[2],
            disputedTasks: rep[3],
            totalEarnings: rep[4],
            completionRate: rep[6],
          });
        } catch (reputationError) {
          console.error("Failed to load reputation:", reputationError);
        }

        setVerificationStats(await loadAgentVerificationStats(address));
      } catch (error) {
        console.error("Failed to load agent:", error);
        setLoadError("The agent record could not be read from Arc testnet.");
      } finally {
        setIsLoading(false);
      }
    }

    loadAgent();
  }, [address]);

  if (isLoading) {
    return (
      <div className="app-container grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Skeleton className="h-9 w-64 rounded-[2px] bg-primary/10" />
          <Skeleton className="h-5 w-full max-w-xl rounded-[2px] bg-primary/10" />
          <Skeleton className="h-56 w-full rounded-[2px] bg-primary/10" />
        </div>
        <Skeleton className="h-80 rounded-[2px] bg-primary/10" />
      </div>
    );
  }

  if (!agent || !agent.name) {
    return (
      <div className="app-container py-12">
        <EmptyState
          icon={RadioTower}
          title="Agent record not found"
          description={
            loadError ||
            `This address does not contain an active ${BRAND.name} profile.`
          }
          headingLevel="h1"
          action={
            <Button asChild variant="outline">
              <Link href="/agents">Back to agents</Link>
            </Button>
          }
          tone={loadError ? "error" : "neutral"}
        />
      </div>
    );
  }

  const rating =
    Number(agent.ratingCount) > 0 ? Number(agent.averageRating) / 100 : 0;
  const hasVerificationStats =
    verificationStats !== null &&
    Number(verificationStats.totalReceipts) > 0;

  return (
    <div
      className="app-container grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:py-14"
      style={{ ["--page-accent" as string]: "var(--accent-cyan)" }}
    >
      <section className="min-w-0 space-y-8">
        <div className="relative isolate border-b border-border/65 pb-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-[10vw] -left-[10vw] -z-10 h-60"
            style={{
              background:
                "radial-gradient(46% 100% at 30% 0%, color-mix(in srgb, var(--page-accent) 15%, transparent), transparent 72%)",
            }}
          />
          <nav className="mb-3 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <Link href="/" className="transition-colors hover:text-foreground">
              Home
            </Link>
            <span className="text-border">/</span>
            <Link
              href="/agents"
              className="transition-colors hover:text-foreground"
            >
              Agents
            </Link>
            <span className="text-border">/</span>
            <span className="truncate text-foreground/80">{agent.name}</span>
          </nav>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Eyebrow
                accentColor="var(--page-accent)"
                className="border-[color:color-mix(in_srgb,var(--page-accent)_38%,transparent)] bg-[color:color-mix(in_srgb,var(--page-accent)_9%,transparent)] text-[color:color-mix(in_srgb,var(--page-accent)_82%,var(--foreground))]"
              >
                Agent profile
              </Eyebrow>
              <div className="mt-4 flex items-center gap-4">
                <AgentGlyph
                  seed={address}
                  name={agent.name}
                  className="size-14"
                  labelClassName="text-lg"
                />
                <div className="min-w-0">
                  <h1 className="font-display text-gradient text-4xl tracking-tight sm:text-5xl">
                    {agent.name}
                  </h1>
                  <p className="mt-2 break-all font-mono text-xs leading-5 text-muted-foreground">
                    {address}
                  </p>
                </div>
              </div>
            </div>
            <StatusBadge
              kind="agent"
              status={agent.isActive ? "active" : "inactive"}
            />
          </div>
          <p className="mt-6 max-w-3xl text-base leading-7 text-[#b8cce0]">
            {agent.description || "No profile description provided."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {agent.skills.map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className="border-[#416789]/70 bg-[#10243c] text-[#b8d0e6]"
              >
                {skill}
              </Badge>
            ))}
          </div>
        </div>

        <Reveal className="block">
          <div className="mb-4 flex items-center gap-2">
            <BadgeCheck className="size-4 text-[#9cd4cc]" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Verified work
            </h2>
          </div>
          {hasVerificationStats ? (
            <div className="brutal-surface grid sm:grid-cols-3">
              <Metric
                label="Receipts"
                value={Number(
                  verificationStats.totalReceipts,
                ).toLocaleString()}
              />
              <Metric
                label="Pass rate"
                value={formatPercentBps(verificationStats.passRate)}
              />
              <Metric
                label="Average score"
                value={formatPercentBps(verificationStats.averageScore)}
                last
              />
            </div>
          ) : (
            <div className="brutal-surface p-6">
              <p className="text-sm leading-6 text-muted-foreground">
                No verifier-backed work has been recorded for this agent yet.
              </p>
            </div>
          )}
        </Reveal>

        <Reveal className="block" delay={90}>
          <div className="mb-4 flex items-center gap-2">
            <Star className="size-4 text-[#d4ad6f]" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Reputation
            </h2>
          </div>
          <div className="brutal-surface divide-y divide-border/55">
            <div className="flex flex-wrap items-center justify-between gap-4 p-5">
              <span className="text-sm text-muted-foreground">
                Buyer rating
              </span>
              <span className="flex items-center gap-2 font-mono text-sm text-foreground">
                <Star
                  className="size-3.5 text-[#d4ad6f]"
                  aria-hidden="true"
                />
                {rating.toFixed(1)} / {Number(agent.ratingCount)} reviews
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 p-5">
              <span className="text-sm text-muted-foreground">
                Completion rate
              </span>
              <span className="font-mono text-sm text-foreground">
                {reputation
                  ? formatPercentBps(reputation.completionRate)
                  : "Not available"}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 p-5">
              <span className="text-sm text-muted-foreground">
                Disputed tasks
              </span>
              <span className="font-mono text-sm text-foreground">
                {reputation
                  ? Number(reputation.disputedTasks).toLocaleString()
                  : "Not available"}
              </span>
            </div>
          </div>
        </Reveal>
      </section>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Reveal className="brutal-surface block p-5" delay={120}>
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1.5 bg-[var(--page-accent)]"
          />
          <Eyebrow>Commercial terms</Eyebrow>
          <div className="mt-5 space-y-4">
            <PriceRow
              icon={CircleDollarSign}
              label="Per task"
              value={`${formatUSDC(agent.ratePerTask)} USDC`}
            />
            <Separator className="bg-border/60" />
            <PriceRow
              icon={CircleDollarSign}
              label="Per API call"
              value={`${formatUSDC(agent.ratePerCall)} USDC`}
            />
            <Separator className="bg-border/60" />
            <PriceRow
              icon={BriefcaseBusiness}
              label="Completed"
              value={`${Number(agent.completedTasks)} tasks`}
            />
            <Separator className="bg-border/60" />
            <PriceRow
              icon={CircleDollarSign}
              label="Total earned"
              value={`${formatUSDC(agent.totalEarnings)} USDC`}
            />
          </div>
        </Reveal>

        <div className="flex flex-col gap-3">
          {isConnected && (
            <Button asChild size="lg" className="w-full">
              <Link href={`/tasks/create?provider=${address}`}>
                Hire this agent
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" className="w-full">
            <a
              href={`https://testnet.arcscan.app/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Arcscan
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        </div>
      </aside>
    </div>
  );
}

function Metric({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`group/metric relative overflow-hidden p-5 transition-colors duration-300 hover:bg-[color-mix(in_srgb,var(--page-accent)_5%,transparent)] ${
        last ? "" : "border-b border-border/55 sm:border-r sm:border-b-0"
      }`}
    >
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px scale-x-0 bg-[linear-gradient(to_right,transparent,color-mix(in_srgb,var(--page-accent)_70%,transparent),transparent)] transition-transform duration-500 group-hover/metric:scale-x-100" />
      <p className="font-mono font-display text-xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function PriceRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CircleDollarSign;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </span>
      <span className="text-right font-mono text-xs text-foreground">
        {value}
      </span>
    </div>
  );
}
