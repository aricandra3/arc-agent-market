"use client";

import { Eyebrow } from "@/components/Eyebrow";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  CircleDollarSign,
  ExternalLink,
  FileBox,
  Fingerprint,
  Play,
  RadioTower,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { encodeFunctionData } from "viem";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { Reveal } from "@/components/exagora/Reveal";
import { TransactionButton } from "@/components/exagora/TransactionButton";
import { StatusBadge } from "@/components/StatusBadge";
import {
  TransactionState,
  type TransactionPhase,
} from "@/components/TransactionState";
import { WorkReceiptPanel } from "@/components/WorkReceiptPanel";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BRAND } from "@/lib/brand";
import {
  CONTRACTS,
  TASK_ESCROW_ABI,
  ZERO_ADDRESS,
  formatDate,
  formatUSDC,
  isUserRejectedError,
  loadTaskReceipt,
  publicClient,
  sendTransaction,
  shortAddress,
  type WorkReceiptRecord,
} from "@/lib/contracts";
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
}

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;
  const { address, isConnected } = useWalletStore();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [receipt, setReceipt] = useState<WorkReceiptRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionPhase, setActionPhase] =
    useState<TransactionPhase>("idle");
  const [actionHash, setActionHash] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    async function loadTask() {
      try {
        const data = await publicClient.readContract({
          address: CONTRACTS.TASK_ESCROW,
          abi: TASK_ESCROW_ABI,
          functionName: "getTask",
          args: [BigInt(taskId)],
        });
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
        });
        setReceipt(await loadTaskReceipt(BigInt(taskId)));
      } catch (error) {
        console.error("Failed to load task:", error);
        setLoadError("The task record could not be read from Arc testnet.");
      } finally {
        setIsLoading(false);
      }
    }

    loadTask();
  }, [taskId]);

  const handleAction = async (
    action: "startTask" | "approveTask" | "cancelTask",
  ) => {
    if (!isConnected) return;
    setActionPhase("signing");
    setActionHash("");
    setActionMessage("");

    try {
      const data = encodeFunctionData({
        abi: TASK_ESCROW_ABI,
        functionName: action,
        args: [BigInt(taskId)],
      });
      const tx = await sendTransaction(CONTRACTS.TASK_ESCROW, data);
      setActionHash(tx);
      setActionPhase("submitted");
      setActionMessage("The task state will update after confirmation.");
      toast.success("Task transaction submitted", {
        description: "Track the state change on Arcscan.",
      });
    } catch (actionError: unknown) {
      const message = isUserRejectedError(actionError)
        ? "The wallet transaction was cancelled."
        : actionError instanceof Error
          ? actionError.message
          : "Task action failed.";
      setActionPhase("failed");
      setActionMessage(message);
      toast.error("Task action failed", { description: message });
    }
  };

  if (isLoading) {
    return (
      <div className="app-container max-w-5xl space-y-6 py-10">
        <Skeleton className="h-28 rounded-[2px] bg-primary/10" />
        <Skeleton className="h-40 rounded-[2px] bg-primary/10" />
        <Skeleton className="h-52 rounded-[2px] bg-primary/10" />
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
  const isProvider = address?.toLowerCase() === task.provider.toLowerCase();
  const providerOpen = task.provider === ZERO_ADDRESS;

  return (
    <div
      className="app-container max-w-5xl py-10 sm:py-14"
      style={{ ["--page-accent" as string]: "var(--accent-azure)" }}
    >
      <header className="relative isolate border-b border-border/65 pb-7">
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
            <Eyebrow
              accentColor="var(--page-accent)"
              className="border-[color:color-mix(in_srgb,var(--page-accent)_38%,transparent)] bg-[color:color-mix(in_srgb,var(--page-accent)_9%,transparent)] text-[color:color-mix(in_srgb,var(--page-accent)_82%,var(--foreground))]"
            >
              Task record / {taskId}
            </Eyebrow>
            <h1 className="font-display text-gradient mt-3 text-4xl tracking-tight sm:text-5xl">
              Task #{taskId}
            </h1>
          </div>
          <StatusBadge kind="task" status={task.status} />
        </div>
        <p className="mt-6 max-w-3xl text-base leading-7 text-[#b8cce0]">
          {task.description}
        </p>
      </header>

      <Reveal className="mt-7 grid overflow-hidden rounded-[1.15rem] border-t border-l border-border/55 sm:grid-cols-2 lg:grid-cols-4">
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

      <Reveal className="mt-8 brutal-surface block p-5 sm:p-6" delay={80}>
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

      {isConnected && (
        <section className="mt-8 border-t border-border/65 pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              {isProvider && task.status === 1 && (
                <TransactionButton
                  phase={actionPhase}
                  onClick={() => handleAction("startTask")}
                  disabled={actionPhase === "signing"}
                  submittedLabel="Start submitted"
                >
                  <Play aria-hidden="true" />
                  Start task
                </TransactionButton>
              )}
              {isRequester && task.status === 3 && (
                <TransactionButton
                  phase={actionPhase}
                  onClick={() => handleAction("approveTask")}
                  disabled={actionPhase === "signing"}
                  submittedLabel="Approval submitted"
                >
                  <ShieldCheck aria-hidden="true" />
                  Approve & release USDC
                </TransactionButton>
              )}
              {isRequester && task.status === 0 && (
                <TransactionButton
                  phase={actionPhase}
                  variant="outline"
                  className="border-[#d36c72]/65 text-[#efa2a7] hover:bg-[#d36c72]/10"
                  onClick={() => handleAction("cancelTask")}
                  disabled={actionPhase === "signing"}
                  submittedLabel="Cancellation submitted"
                >
                  <Trash2 aria-hidden="true" />
                  Cancel task
                </TransactionButton>
              )}
              <Button asChild variant="outline">
                <a
                  href={`https://testnet.arcscan.app/address/${CONTRACTS.TASK_ESCROW}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View escrow contract
                  <ExternalLink aria-hidden="true" />
                </a>
              </Button>
            </div>
            <TransactionState
              phase={actionPhase}
              hash={actionHash || undefined}
              message={actionMessage || undefined}
            />
          </div>
        </section>
      )}

      <p className="mt-8 font-mono text-[10px] text-muted-foreground">
        Created {formatDate(task.createdAt)} / Arc Testnet
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
