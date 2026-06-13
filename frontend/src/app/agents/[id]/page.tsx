"use client";

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
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
            "This address does not contain an active Arc Agent Market profile."
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
    <div className="app-container grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:py-14">
      <section className="min-w-0 space-y-8">
        <div className="border-b border-border/65 pb-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase text-[#9fc1df]">
                Agent profile
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">
                {agent.name}
              </h1>
              <p className="mt-3 break-all font-mono text-xs leading-5 text-muted-foreground">
                {address}
              </p>
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

        <section>
          <div className="mb-4 flex items-center gap-2">
            <BadgeCheck className="size-4 text-[#9cd4cc]" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-foreground">
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
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Star className="size-4 text-[#d4ad6f]" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-foreground">
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
        </section>
      </section>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="brutal-surface p-5">
          <p className="font-mono text-[11px] uppercase text-[#9fc1df]">
            Commercial terms
          </p>
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
        </div>

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
      className={`p-5 ${
        last
          ? ""
          : "border-b border-border/55 sm:border-r sm:border-b-0"
      }`}
    >
      <p className="font-mono text-xl font-semibold text-foreground">{value}</p>
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
