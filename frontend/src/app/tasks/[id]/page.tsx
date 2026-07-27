"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  CircleDollarSign,
  ExternalLink,
  FileBox,
  Fingerprint,
  HandCoins,
  Play,
  RadioTower,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { encodeFunctionData } from "viem";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { Reveal } from "@/components/exagora/Reveal";
import { TransactionButton } from "@/components/exagora/TransactionButton";
import { StatusBadge } from "@/components/StatusBadge";
import { useWrongNetwork } from "@/lib/useWrongNetwork";
import {
  TransactionState,
  type TransactionPhase,
} from "@/components/TransactionState";
import { CreateReceiptForm } from "@/components/CreateReceiptForm";
import { DisputePanel } from "@/components/DisputePanel";
import { ReviewPanel } from "@/components/ReviewPanel";
import { WorkReceiptPanel } from "@/components/WorkReceiptPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BRAND } from "@/lib/brand";
import {
  AGENT_REGISTRY_ABI,
  CONTRACTS,
  TASK_ESCROW_ABI,
  ZERO_ADDRESS,
  arcTestnet,
  explorerAddressUrl,
  formatDate,
  formatUSDC,
  loadTaskReceipt,
  readContract,
  shortAddress,
  type WorkReceiptRecord,
} from "@/lib/contracts";
import { resolveDeliverableCommitment } from "@/lib/deliverable";
import { describeDisputeWindow } from "@/lib/dispute";
import { describeReadError } from "@/lib/rpc";
import { describeTxError, sendTransaction, waitForTx } from "@/lib/tx";
import { useWalletStore } from "@/lib/store";

interface TaskDetail {
  requester: string;
  provider: string;
  budget: bigint;
  description: string;
  status: number;
  createdAt: bigint;
  deadline: bigint;
  deliverableHash: string;
  deliverableURI: string;
  /**
   * Snapshot taken when the record was read. Deadlines are days out, so a
   * read-time comparison is accurate enough and keeps `Date.now()` out of
   * render, where it would be an impure call.
   */
  pastDeadline: boolean;
  /** True once the dispute window on a submitted deliverable has lapsed. */
  disputeWindowClosed: boolean;
  /** Raw deadline, kept so the remaining window can be described. */
  disputeDeadline: bigint;
  /** Read-time clock, so `Date.now()` stays out of render. */
  readAtSeconds: number;
}

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;
  const { address, isConnected } = useWalletStore();
  const wrongNetwork = useWrongNetwork();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [receipt, setReceipt] = useState<WorkReceiptRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionPhase, setActionPhase] =
    useState<TransactionPhase>("idle");
  const [actionHash, setActionHash] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isRegisteredAgent, setIsRegisteredAgent] = useState(false);
  const [deliverableForm, setDeliverableForm] = useState({ uri: "", hash: "" });

  const refreshTask = useCallback(async () => {
    const [data, disputeDeadline] = await Promise.all([
      readContract({
        address: CONTRACTS.TASK_ESCROW,
        abi: TASK_ESCROW_ABI,
        functionName: "getTask",
        args: [BigInt(taskId)],
      }),
      readContract({
        address: CONTRACTS.TASK_ESCROW,
        abi: TASK_ESCROW_ABI,
        functionName: "getDisputeDeadline",
        args: [BigInt(taskId)],
      }),
    ]);
    const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
    setTask({
      requester: data[0],
      provider: data[1],
      budget: data[2],
      description: data[3],
      status: Number(data[4]),
      createdAt: data[5],
      deadline: data[6],
      deliverableHash: data[7],
      deliverableURI: data[8],
      pastDeadline: data[6] <= nowSeconds,
      disputeWindowClosed:
        disputeDeadline > BigInt(0) && disputeDeadline < nowSeconds,
      disputeDeadline,
      readAtSeconds: Number(nowSeconds),
    });
    setReceipt(await loadTaskReceipt(BigInt(taskId)));
  }, [taskId]);

  useEffect(() => {
    let isCurrent = true;

    async function loadTask() {
      try {
        await refreshTask();
      } catch (error) {
        console.error("Failed to load task:", error);
        if (isCurrent) {
          setLoadError(describeReadError(error));
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadTask();
    return () => {
      isCurrent = false;
    };
  }, [refreshTask]);

  // Accepting an open task requires an active registry entry; surface that
  // upfront instead of letting the wallet hit a bare "Not registered" revert.
  useEffect(() => {
    let isCurrent = true;

    async function checkRegistration() {
      if (!address) {
        if (isCurrent) setIsRegisteredAgent(false);
        return;
      }
      try {
        const active = await readContract({
          address: CONTRACTS.AGENT_REGISTRY,
          abi: AGENT_REGISTRY_ABI,
          functionName: "isActive",
          args: [address as `0x${string}`],
        });
        if (isCurrent) setIsRegisteredAgent(Boolean(active));
      } catch {
        if (isCurrent) setIsRegisteredAgent(false);
      }
    }

    checkRegistration();
    return () => {
      isCurrent = false;
    };
  }, [address]);

  /** Submits a task transaction, waits for confirmation, then refetches. */
  const runAction = async (
    label: string,
    data: `0x${string}`,
    onConfirmed?: () => void,
  ) => {
    if (!isConnected) return;
    setActionPhase("signing");
    setActionHash("");
    setActionMessage("");

    try {
      const hash = await sendTransaction({
        to: CONTRACTS.TASK_ESCROW,
        data,
      });
      setActionHash(hash);
      setActionPhase("submitted");
      setActionMessage("Waiting for Arc to confirm the state change.");
      toast.success(`${label} submitted`, {
        description: "Waiting for confirmation.",
      });

      await waitForTx(hash);
      await refreshTask();
      setActionPhase("confirmed");
      setActionMessage("");
      onConfirmed?.();
      toast.success(`${label} confirmed`);
    } catch (actionError: unknown) {
      const message = describeTxError(actionError);
      console.error(`${label} failed:`, actionError);
      setActionPhase("failed");
      setActionMessage(message);
      toast.error(`${label} failed`, { description: message });
    }
  };

  const handleAction = (
    action:
      | "startTask"
      | "approveTask"
      | "cancelTask"
      | "acceptTask"
      | "claimUncontestedTask",
    label: string,
  ) =>
    runAction(
      label,
      encodeFunctionData({
        abi: TASK_ESCROW_ABI,
        functionName: action,
        args: [BigInt(taskId)],
      }),
    );

  const handleSubmitDeliverable = (event: React.FormEvent) => {
    event.preventDefault();

    const commitment = resolveDeliverableCommitment(
      deliverableForm.uri,
      deliverableForm.hash,
    );
    if (!commitment.ok) {
      setActionPhase("failed");
      setActionMessage(commitment.error);
      return;
    }

    return runAction(
      "Deliverable submission",
      encodeFunctionData({
        abi: TASK_ESCROW_ABI,
        functionName: "submitDeliverable",
        args: [BigInt(taskId), commitment.hash, commitment.uri],
      }),
      () => setDeliverableForm({ uri: "", hash: "" }),
    );
  };

  if (isLoading) {
    return (
      <div className="app-container max-w-5xl space-y-6 py-10">
        <Skeleton className="h-28 rounded-lg bg-primary/10" />
        <Skeleton className="h-40 rounded-lg bg-primary/10" />
        <Skeleton className="h-52 rounded-lg bg-primary/10" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="app-container py-12">
        <EmptyState
          icon={RadioTower}
          title="Task record not found"
          description={
            loadError || `This task ID does not exist on ${BRAND.name}.`
          }
          headingLevel="h1"
          tone={loadError ? "error" : "neutral"}
        />
      </div>
    );
  }

  const isRequester =
    address?.toLowerCase() === task.requester.toLowerCase();
  const providerOpen = task.provider === ZERO_ADDRESS;
  const isProvider =
    !providerOpen && address?.toLowerCase() === task.provider.toLowerCase();
  const isBusy = actionPhase === "signing" || actionPhase === "submitted";
  const pastDeadline = task.pastDeadline;
  // The escrow accepts a deliverable while Accepted (1) or InProgress (2).
  const canSubmitDeliverable =
    isProvider && (task.status === 1 || task.status === 2) && !pastDeadline;
  // Submitted (3) work the requester never answered: releasable by anyone once
  // the dispute window lapses, so the escrow cannot be held hostage.
  const canClaimUncontested =
    isProvider && task.status === 3 && task.disputeWindowClosed;
  const disputeWindow = describeDisputeWindow(
    task.disputeDeadline,
    task.readAtSeconds,
  );
  // Either party may dispute Submitted (3) work while the window is open.
  const canDispute =
    Boolean(isRequester || isProvider) && task.status === 3 && disputeWindow.open;

  return (
    <div
      className="app-container max-w-5xl py-16 sm:py-24"
    >
      <header className="border-b border-border/65 pb-7">
        <nav className="mb-3 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <span className="text-border">/</span>
          <Link
            href="/dashboard"
            className="transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
          <span className="text-border">/</span>
          <span className="text-foreground/80">Task #{taskId}</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="display-lg text-foreground">
              Task #{taskId}
            </h1>
          </div>
          <StatusBadge kind="task" status={task.status} />
        </div>
        <p className="mt-6 max-w-3xl text-base leading-7 text-[var(--muted-foreground)]">
          {task.description}
        </p>
      </header>

      <Reveal className="mt-7 grid overflow-hidden rounded-[var(--radius-surface)] border-t border-l border-border/55 sm:grid-cols-2 lg:grid-cols-4">
        <TaskMetric
          icon={CircleDollarSign}
          label="Budget"
          value={`${formatUSDC(task.budget)} USDC`}
        />
        <TaskMetric
          icon={UserRound}
          label="Requester"
          value={shortAddress(task.requester, 8, 4)}
          mono
        />
        <TaskMetric
          icon={UserRound}
          label="Provider"
          value={providerOpen ? "Open marketplace" : shortAddress(task.provider, 8, 4)}
          mono={!providerOpen}
        />
        <TaskMetric
          icon={CalendarDays}
          label="Deadline"
          value={formatDate(task.deadline)}
        />
      </Reveal>

      <Reveal className="mt-8 panel block p-5 sm:p-6" delay={80}>
        <div className="flex items-center gap-2">
          <FileBox className="size-4 text-primary" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-foreground">
            Deliverable
          </h2>
        </div>
        {task.deliverableURI ? (
          <div className="mt-5 space-y-4">
            <Button asChild variant="outline" size="sm">
              <a
                href={task.deliverableURI}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open deliverable
                <ExternalLink aria-hidden="true" />
              </a>
            </Button>
            <Separator className="bg-border/60" />
            <div className="flex items-start gap-3">
              <Fingerprint
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  Deliverable hash
                </p>
                <p className="mt-2 break-all font-mono text-xs leading-5 text-foreground">
                  {task.deliverableHash}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The provider has not submitted a deliverable for this task.
          </p>
        )}
      </Reveal>

      <Reveal className="mt-8 block" delay={120}>
        <WorkReceiptPanel receipt={receipt} taskStatus={task.status} />
      </Reveal>

      {/* Submitted (3) with no receipt yet is the only window createReceipt
          accepts, and it is provider-only. */}
      {isProvider && task.status === 3 && !receipt && (
        <Reveal className="mt-8 block" delay={140}>
          <CreateReceiptForm taskId={taskId} onCreated={refreshTask} />
        </Reveal>
      )}

      {canDispute && (
        <Reveal className="mt-8 block" delay={150}>
          <DisputePanel
            taskId={taskId}
            windowLabel={disputeWindow.label}
            onDisputed={refreshTask}
          />
        </Reveal>
      )}

      {/* Paid (5) is the only status Reputation accepts a review for. */}
      <Reveal className="mt-8 block" delay={160}>
        <ReviewPanel
          taskId={taskId}
          isParty={Boolean(isRequester || isProvider)}
          taskPaid={task.status === 5}
          counterpartyLabel={isRequester ? "the provider's" : "the requester's"}
        />
      </Reveal>

      {isConnected && (
        <section className="mt-8 border-t border-border/65 pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              {providerOpen && !isRequester && task.status === 0 && (
                <TransactionButton
                  phase={actionPhase}
                  onClick={() => handleAction("acceptTask", "Task acceptance")}
                  disabled={
                    isBusy || wrongNetwork || !isRegisteredAgent || pastDeadline
                  }
                  submittedLabel="Acceptance submitted"
                >
                  <HandCoins aria-hidden="true" />
                  Accept task
                </TransactionButton>
              )}
              {isProvider && task.status === 1 && (
                <TransactionButton
                  phase={actionPhase}
                  onClick={() => handleAction("startTask", "Task start")}
                  disabled={isBusy || wrongNetwork}
                  submittedLabel="Start submitted"
                >
                  <Play aria-hidden="true" />
                  Start task
                </TransactionButton>
              )}
              {isRequester && task.status === 3 && (
                <TransactionButton
                  phase={actionPhase}
                  onClick={() => handleAction("approveTask", "Approval")}
                  disabled={isBusy || wrongNetwork}
                  submittedLabel="Approval submitted"
                >
                  <ShieldCheck aria-hidden="true" />
                  Approve & release USDC
                </TransactionButton>
              )}
              {canClaimUncontested && (
                <TransactionButton
                  phase={actionPhase}
                  onClick={() =>
                    handleAction("claimUncontestedTask", "Payment release")
                  }
                  disabled={isBusy || wrongNetwork}
                  submittedLabel="Release submitted"
                >
                  <HandCoins aria-hidden="true" />
                  Release payment
                </TransactionButton>
              )}
              {isRequester && task.status === 0 && (
                <TransactionButton
                  phase={actionPhase}
                  variant="outline"
                  className="border-[var(--destructive)]/65 text-[var(--destructive-fg)] hover:bg-[var(--destructive)]/10"
                  onClick={() => handleAction("cancelTask", "Cancellation")}
                  disabled={isBusy || wrongNetwork}
                  submittedLabel="Cancellation submitted"
                >
                  <Trash2 aria-hidden="true" />
                  Cancel task
                </TransactionButton>
              )}
              <Button asChild variant="outline">
                <a
                  href={explorerAddressUrl(CONTRACTS.TASK_ESCROW)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View escrow contract
                  <ExternalLink aria-hidden="true" />
                </a>
              </Button>
            </div>

            {providerOpen &&
              !isRequester &&
              task.status === 0 &&
              !isRegisteredAgent && (
                <p className="text-xs leading-5 text-muted-foreground">
                  Only active registered agents can accept tasks.{" "}
                  <Link href="/register" className="text-primary hover:underline">
                    Register an agent
                  </Link>{" "}
                  to bid on this work.
                </p>
              )}

            {canSubmitDeliverable && (
              <form
                onSubmit={handleSubmitDeliverable}
                className="panel space-y-5 p-5 sm:p-6"
              >
                <div className="flex items-center gap-2">
                  <Upload className="size-4 text-primary" aria-hidden="true" />
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Submit deliverable
                  </h2>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Publish the artifact somewhere the requester can fetch it
                  (IPFS, a signed URL, a release tag), then commit its location
                  and hash on chain.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="deliverable-uri">
                    Deliverable URI <span className="text-[var(--destructive-fg)]">*</span>
                  </Label>
                  <Input
                    id="deliverable-uri"
                    value={deliverableForm.uri}
                    onChange={(event) =>
                      setDeliverableForm((current) => ({
                        ...current,
                        uri: event.target.value,
                      }))
                    }
                    placeholder="ipfs://bafy... or https://..."
                    className="font-mono text-xs"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliverable-hash">
                    Content hash (optional)
                  </Label>
                  <Input
                    id="deliverable-hash"
                    value={deliverableForm.hash}
                    onChange={(event) =>
                      setDeliverableForm((current) => ({
                        ...current,
                        hash: event.target.value,
                      }))
                    }
                    placeholder="0x… 32-byte hash of the artifact"
                    className="font-mono text-xs"
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    Leave empty to commit <code>keccak256</code> of the URI
                    instead. Supplying the artifact&apos;s own hash lets the
                    requester verify the bytes they receive.
                  </p>
                </div>
                <TransactionButton
                  phase={actionPhase}
                  type="submit"
                  disabled={isBusy || wrongNetwork}
                  submittedLabel="Submission sent"
                >
                  <Upload aria-hidden="true" />
                  {wrongNetwork
                    ? `Switch to ${arcTestnet.name} first`
                    : "Submit deliverable"}
                </TransactionButton>
              </form>
            )}

            <TransactionState
              phase={actionPhase}
              hash={actionHash || undefined}
              message={actionMessage || undefined}
            />
          </div>
        </section>
      )}

      <p className="mt-8 font-mono text-[10px] text-muted-foreground">
        Created {formatDate(task.createdAt)} / {arcTestnet.name}
      </p>
    </div>
  );
}

function TaskMetric({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: typeof CircleDollarSign;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="group/metric relative min-h-24 overflow-hidden border-r border-b border-border/55 p-4 transition-colors duration-300 hover:bg-[color-mix(in_srgb,var(--page-accent)_5%,transparent)]">
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px scale-x-0 bg-[linear-gradient(to_right,transparent,color-mix(in_srgb,var(--page-accent)_70%,transparent),transparent)] transition-transform duration-500 group-hover/metric:scale-x-100" />
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon
          className="size-3.5 transition-colors group-hover/metric:[color:var(--page-accent)]"
          aria-hidden="true"
        />
        {label}
      </p>
      <p
        className={`mt-3 text-sm font-semibold text-foreground ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
