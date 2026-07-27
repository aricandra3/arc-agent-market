"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Gavel, RadioTower, Scale, ShieldAlert, Wallet } from "lucide-react";
import { encodeFunctionData } from "viem";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { TransactionButton } from "@/components/exagora/TransactionButton";
import {
  TransactionState,
  type TransactionPhase,
} from "@/components/TransactionState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CONTRACTS,
  OWNABLE2STEP_ABI,
  TASK_ESCROW_ABI,
  arcTestnet,
  formatDate,
  formatUSDC,
  readContract,
  shortAddress,
} from "@/lib/contracts";
import {
  parseRequesterPercent,
  splitDisputedBudget,
} from "@/lib/dispute";
import { READ_CONCURRENCY, describeReadError, mapLimit } from "@/lib/rpc";
import { describeTxError, sendTransaction, waitForTx } from "@/lib/tx";
import { useWalletStore } from "@/lib/store";
import { useWrongNetwork } from "@/lib/useWrongNetwork";

/** TaskStatus.Disputed */
const DISPUTED = 6;

/**
 * Task ids inspected per page. The escrow keeps no index of disputed tasks, so
 * the queue walks ids down from getTaskCount, and each id is one paced call.
 */
const SCAN_SIZE = 9;

type DisputedTask = {
  id: number;
  requester: string;
  provider: string;
  budget: bigint;
  description: string;
  createdAt: bigint;
};

/**
 * Dispute resolution.
 *
 * `resolveDispute` is `onlyOwner`, and a disputed task has no other exit — not
 * approval, not the uncontested claim. Without this page a single dispute would
 * strand the escrow permanently, which is why it ships alongside the ability to
 * raise one.
 */
export default function DisputesAdminPage() {
  const { address, isConnected } = useWalletStore();
  const wrongNetwork = useWrongNetwork();
  const [disputes, setDisputes] = useState<DisputedTask[]>([]);
  const [owner, setOwner] = useState("");
  const [highestScanned, setHighestScanned] = useState(0);
  const [lowestScanned, setLowestScanned] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanningMore, setIsScanningMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const scan = useCallback(
    async (from: number, to: number): Promise<DisputedTask[]> => {
      if (from < to || from < 1) return [];
      const ids = Array.from({ length: from - to + 1 }, (_, i) => from - i);

      const tasks = await mapLimit(
        ids,
        READ_CONCURRENCY,
        async (id): Promise<DisputedTask | null> => {
          try {
            const data = await readContract({
              address: CONTRACTS.TASK_ESCROW,
              abi: TASK_ESCROW_ABI,
              functionName: "getTask",
              args: [BigInt(id)],
            });
            if (Number(data[4]) !== DISPUTED) return null;
            return {
              id,
              requester: data[0],
              provider: data[1],
              budget: data[2],
              description: data[3],
              createdAt: data[5],
            };
          } catch (error) {
            console.error(`Failed to read task ${id}:`, error);
            return null;
          }
        },
      );

      return tasks.filter((task): task is DisputedTask => task !== null);
    },
    [],
  );

  const load = useCallback(async () => {
    const ownerAddress = await readContract({
      address: CONTRACTS.TASK_ESCROW,
      abi: OWNABLE2STEP_ABI,
      functionName: "owner",
    });
    setOwner(ownerAddress);

    const total = Number(
      await readContract({
        address: CONTRACTS.TASK_ESCROW,
        abi: TASK_ESCROW_ABI,
        functionName: "getTaskCount",
      }),
    );
    const lowest = Math.max(1, total - SCAN_SIZE + 1);
    setHighestScanned(total);
    setLowestScanned(lowest);
    setDisputes(total >= 1 ? await scan(total, lowest) : []);
  }, [scan]);

  useEffect(() => {
    let isCurrent = true;

    async function boot() {
      try {
        await load();
        if (isCurrent) setLoadError("");
      } catch (error) {
        console.error("Failed to load disputes:", error);
        if (isCurrent) setLoadError(describeReadError(error));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    boot();
    return () => {
      isCurrent = false;
    };
  }, [load, reloadKey]);

  const scanOlder = async () => {
    setIsScanningMore(true);
    setLoadError("");
    try {
      const from = lowestScanned - 1;
      const to = Math.max(1, from - SCAN_SIZE + 1);
      const older = await scan(from, to);
      setDisputes((current) => [...current, ...older]);
      setLowestScanned(to);
    } catch (error) {
      console.error("Failed to scan older tasks:", error);
      setLoadError(describeReadError(error));
    } finally {
      setIsScanningMore(false);
    }
  };

  const isOwner =
    Boolean(address) &&
    Boolean(owner) &&
    address?.toLowerCase() === owner.toLowerCase();
  const canResolve = isConnected && isOwner && !wrongNetwork;

  return (
    <div className="app-container max-w-4xl py-16 sm:py-24">
      <PageHeader
        title="Dispute resolution"
        accent="gold"
        breadcrumb={[{ label: "Admin" }, { label: "Disputes" }]}
        description="A disputed task has no other exit: approval and the uncontested claim are both blocked. Splitting the budget here is the only way the escrow releases."
        stats={
          highestScanned > 0
            ? [
                { label: "awaiting resolution", value: disputes.length },
                { label: "tasks scanned", value: highestScanned - lowestScanned + 1 },
              ]
            : undefined
        }
      />

      {!isConnected && (
        <div className="mt-8">
          <EmptyState
            icon={Wallet}
            title="Connect the owner wallet"
            description="Only the escrow owner can resolve a dispute."
            headingLevel="h2"
          />
        </div>
      )}

      {isConnected && owner && !isOwner && (
        <p
          role="alert"
          className="mt-8 rounded-[0.65rem] border border-[#d4ad6f]/50 bg-[#d4ad6f]/10 px-4 py-3 text-sm text-[#e7c992]"
        >
          {shortAddress(address ?? "")} is not the escrow owner, so this page is
          read-only. The owner is {shortAddress(owner)}.
        </p>
      )}

      {isConnected && isOwner && wrongNetwork && (
        <p
          role="alert"
          className="mt-8 rounded-[0.65rem] border border-[#d4ad6f]/50 bg-[#d4ad6f]/10 px-4 py-3 text-sm text-[#e7c992]"
        >
          Wrong network. Switch to {arcTestnet.name} to resolve a dispute.
        </p>
      )}

      <div className="mt-8 space-y-4">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-48 rounded-[0.85rem] bg-primary/10"
            />
          ))
        ) : loadError && disputes.length === 0 ? (
          <EmptyState
            icon={RadioTower}
            title="Could not read the escrow"
            description={loadError}
            action={
              <Button onClick={() => setReloadKey((key) => key + 1)}>
                Retry
              </Button>
            }
            tone="error"
          />
        ) : highestScanned === 0 ? (
          <EmptyState
            icon={Scale}
            title="No tasks on chain yet"
            description="Disputes appear here once a party contests a submitted deliverable."
            headingLevel="h2"
          />
        ) : disputes.length === 0 ? (
          <EmptyState
            icon={Scale}
            title="Nothing awaiting resolution"
            description={`Tasks ${lowestScanned}–${highestScanned} are all clear. Scan further back for older ones.`}
            headingLevel="h2"
          />
        ) : (
          disputes.map((task) => (
            <DisputeCard
              key={task.id}
              task={task}
              canResolve={canResolve}
              onResolved={load}
            />
          ))
        )}

        {loadError && disputes.length > 0 && (
          <p role="alert" className="text-xs text-[#efa2a7]">
            {loadError}
          </p>
        )}

        {!isLoading && lowestScanned > 1 && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={scanOlder}
              disabled={isScanningMore}
            >
              {isScanningMore
                ? "Scanning..."
                : `Scan older tasks (${lowestScanned - 1} left)`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function DisputeCard({
  task,
  canResolve,
  onResolved,
}: {
  task: DisputedTask;
  canResolve: boolean;
  onResolved: () => void | Promise<void>;
}) {
  const [percent, setPercent] = useState("50");
  const [phase, setPhase] = useState<TransactionPhase>("idle");
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState("");

  const isBusy = phase === "signing" || phase === "submitted";
  const parsed = parseRequesterPercent(percent);
  // Preview the exact split the contract will perform, including truncation.
  const preview = parsed.ok
    ? splitDisputedBudget(task.budget, parsed.percent)
    : null;

  const resolve = async () => {
    if (!parsed.ok) {
      setPhase("failed");
      setMessage(parsed.error);
      return;
    }

    setPhase("signing");
    setTxHash("");
    setMessage("");

    try {
      const hash = await sendTransaction({
        to: CONTRACTS.TASK_ESCROW,
        data: encodeFunctionData({
          abi: TASK_ESCROW_ABI,
          functionName: "resolveDispute",
          args: [BigInt(task.id), BigInt(parsed.percent)],
        }),
      });
      setTxHash(hash);
      setPhase("submitted");
      setMessage("Waiting for Arc to settle the split.");

      await waitForTx(hash);
      setPhase("confirmed");
      setMessage("");
      toast.success(`Task #${task.id} resolved`, {
        description: "The budget has been split and the escrow is empty.",
      });
      await onResolved();
    } catch (error) {
      const description = describeTxError(error);
      console.error("resolveDispute failed:", error);
      setPhase("failed");
      setMessage(description);
      toast.error("Resolution failed", { description });
    }
  };

  return (
    <article className="brutal-surface space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold text-foreground">
            Task #{task.id}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {shortAddress(task.requester)} → {shortAddress(task.provider)} ·
            created {formatDate(task.createdAt)}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-[0.6rem] border border-[#d4ad6f]/55 bg-[#d4ad6f]/12 px-2.5 py-1 font-mono text-sm text-[#e7c992]">
          {formatUSDC(task.budget)} USDC
        </span>
      </div>

      <p className="border-t border-border/55 pt-4 text-sm leading-6 text-muted-foreground">
        {task.description}
      </p>

      <p className="flex gap-2.5 rounded-[0.65rem] border border-border/60 p-3 text-xs leading-5 text-muted-foreground">
        <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          The dispute reason was emitted as an event, not stored, so it is not
          readable here — check the task&apos;s{" "}
          <Link
            href={`/tasks/${task.id}`}
            className="text-primary hover:underline"
          >
            transaction history
          </Link>
          . No platform fee is taken on a resolution: the whole budget is split.
        </span>
      </p>

      {canResolve && (
        <>
          <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start">
            <div className="space-y-2">
              <Label htmlFor={`percent-${task.id}`}>
                Requester share % <span className="text-[#efa2a7]">*</span>
              </Label>
              <Input
                id={`percent-${task.id}`}
                value={percent}
                onChange={(event) => setPercent(event.target.value)}
                inputMode="numeric"
                placeholder="50"
                className="font-mono text-xs"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Whole percentages only.
              </p>
            </div>

            <dl className="grid gap-3 rounded-[0.65rem] border border-border/60 p-4 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">
                  Requester {shortAddress(task.requester)}
                </dt>
                <dd className="mt-1 font-mono text-sm text-foreground">
                  {preview ? preview.requesterLabel : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  Provider {shortAddress(task.provider)}
                </dt>
                <dd className="mt-1 font-mono text-sm text-foreground">
                  {preview ? preview.providerLabel : "—"}
                </dd>
              </div>
            </dl>
          </div>

          <TransactionButton
            phase={phase}
            onClick={resolve}
            disabled={isBusy || !parsed.ok}
            submittedLabel="Settling..."
          >
            <Gavel aria-hidden="true" />
            Resolve and split
          </TransactionButton>

          <TransactionState
            phase={phase}
            hash={txHash || undefined}
            message={message || undefined}
          />
        </>
      )}
    </article>
  );
}
