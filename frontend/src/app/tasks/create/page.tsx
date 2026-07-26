"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Check,
  CircleDollarSign,
  Clock3,
  FilePlus2,
  UserRound,
  Wallet,
} from "lucide-react";
import { encodeFunctionData, isAddress, parseEventLogs, parseUnits } from "viem";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { Reveal } from "@/components/exagora/Reveal";
import { TransactionButton } from "@/components/exagora/TransactionButton";
import { PageHeader } from "@/components/PageHeader";
import {
  TransactionState,
  type TransactionPhase,
} from "@/components/TransactionState";
import { SkillBadge } from "@/components/SkillBadge";
import { useWrongNetwork } from "@/lib/useWrongNetwork";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTRACTS,
  ERC20_ABI,
  TASK_ESCROW_ABI,
  ZERO_ADDRESS,
  arcTestnet,
} from "@/lib/contracts";
import { describeTxError, sendTransaction, waitForTx } from "@/lib/tx";
import { useWalletStore } from "@/lib/store";

type CreateTaskPhase =
  | "idle"
  | "approving"
  | "creating"
  | "submitted"
  | "confirmed"
  | "failed";

export default function CreateTaskPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="app-container max-w-5xl py-12">
          <Skeleton className="h-[34rem] rounded-lg bg-primary/10" />
        </div>
      }
    >
      <CreateTaskPage />
    </Suspense>
  );
}

function CreateTaskPage() {
  const searchParams = useSearchParams();
  const { isConnected } = useWalletStore();
  const wrongNetwork = useWrongNetwork();
  const [form, setForm] = useState({
    provider: searchParams.get("provider") || "",
    description: "",
    budget: "",
    deadline: "3",
    skills: "",
  });
  const [phase, setPhase] = useState<CreateTaskPhase>("idle");
  const [txHash, setTxHash] = useState("");
  const [taskId, setTaskId] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isConnected) return;

    const budget = Number(form.budget);
    const deadlineDays = Number(form.deadline);
    if (!Number.isFinite(budget) || budget <= 0) {
      setError("Budget must be greater than zero.");
      return;
    }
    if (!Number.isInteger(deadlineDays) || deadlineDays < 1) {
      setError("Deadline must be at least one full day.");
      return;
    }
    if (form.provider && !isAddress(form.provider)) {
      setError("Provider address is not a valid EVM address.");
      return;
    }
    if (!form.description.trim()) {
      setError("Task description is required.");
      return;
    }

    setError("");
    setTxHash("");

    try {
      const budgetWei = parseUnits(form.budget, 6);
      setPhase("approving");
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACTS.TASK_ESCROW, budgetWei],
      });
      // The allowance must be confirmed on chain before createTask runs —
      // otherwise safeTransferFrom reverts on a not-yet-mined approval.
      await waitForTx(
        await sendTransaction({ to: CONTRACTS.USDC, data: approveData }),
      );

      setPhase("creating");
      const deadline = BigInt(
        Math.floor(Date.now() / 1000) + deadlineDays * 86400,
      );
      const skills = form.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);
      const provider = form.provider || ZERO_ADDRESS;
      const createData = encodeFunctionData({
        abi: TASK_ESCROW_ABI,
        functionName: "createTask",
        args: [
          provider as `0x${string}`,
          budgetWei,
          form.description.trim(),
          skills,
          deadline,
        ],
      });

      const createHash = await sendTransaction({
        to: CONTRACTS.TASK_ESCROW,
        data: createData,
      });
      setTxHash(createHash);
      setPhase("submitted");
      toast.success("Task submitted to Arc", {
        description: "Waiting for the escrow transaction to confirm.",
      });

      const receipt = await waitForTx(createHash);
      const [created] = parseEventLogs({
        abi: TASK_ESCROW_ABI,
        eventName: "TaskCreated",
        logs: receipt.logs,
      });
      if (created) setTaskId(created.args.taskId.toString());
      setPhase("confirmed");
      toast.success("Task escrowed", {
        description: "The budget is locked and the task is live.",
      });
    } catch (submitError: unknown) {
      const message = describeTxError(submitError);
      console.error("Failed to create task:", submitError);
      setError(message);
      setPhase("failed");
      toast.error("Task creation failed", { description: message });
    }
  };

  if (!isConnected) {
    return (
      <div className="app-container py-12">
        <EmptyState
          icon={Wallet}
          title="Connect a wallet to create a task"
          description="The task budget is escrowed in USDC on Arc testnet and requires wallet approval."
          headingLevel="h1"
        />
      </div>
    );
  }

  const skills = form.skills
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
  const isBusy = phase === "approving" || phase === "creating";
  const buttonLabel = {
    idle: "Create task & escrow USDC",
    approving: "Approve USDC in wallet",
    creating: "Create task in wallet",
    submitted: "Confirming on Arc",
    confirmed: "Task escrowed",
    failed: "Try again",
  }[phase];
  const transactionPhase: TransactionPhase =
    phase === "submitted"
      ? "submitted"
      : phase === "confirmed"
        ? "confirmed"
        : phase === "failed"
          ? "failed"
          : isBusy
            ? "signing"
            : "idle";

  return (
    <div
      className="app-container max-w-6xl py-16 sm:py-24"
    >
      <PageHeader
        eyebrow="Task escrow"
        title="Create a task"
        accent="azure"
        breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Create task" }]}
        description="Define the work, select a provider or open the request to the market, and secure the budget in USDC."
      />

      <form
        onSubmit={handleSubmit}
        className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]"
      >
        <Reveal className="panel block space-y-6 p-5 sm:p-7">
          <Field label="Provider address" htmlFor="provider">
            <Input
              id="provider"
              value={form.provider}
              onChange={(event) =>
                setForm({ ...form, provider: event.target.value })
              }
              placeholder="0x... or leave empty for an open task"
              className="font-mono text-xs"
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Leave empty to let any eligible provider accept the task.
            </p>
          </Field>

          <Field label="Task description" htmlFor="description" required>
            <Textarea
              id="description"
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              placeholder="Describe the deliverable, acceptance criteria, and expected proof artifact."
              rows={6}
              required
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Budget (USDC)" htmlFor="budget" required>
              <Input
                id="budget"
                type="number"
                value={form.budget}
                onChange={(event) =>
                  setForm({ ...form, budget: event.target.value })
                }
                placeholder="10.00"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                required
              />
            </Field>
            <Field label="Deadline (days)" htmlFor="deadline" required>
              <Input
                id="deadline"
                type="number"
                value={form.deadline}
                onChange={(event) =>
                  setForm({ ...form, deadline: event.target.value })
                }
                min="1"
                step="1"
                inputMode="numeric"
                required
              />
            </Field>
          </div>

          <Field label="Required skills" htmlFor="skills">
            <Input
              id="skills"
              value={form.skills}
              onChange={(event) =>
                setForm({ ...form, skills: event.target.value })
              }
              placeholder="smart-contracts, testing, security"
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Separate capabilities with commas.
            </p>
          </Field>

          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <SkillBadge key={skill} skill={skill} className="px-3 py-1 text-xs" />
              ))}
            </div>
          )}
        </Reveal>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Reveal className="panel block p-5" delay={100}>
            <p className="text-sm font-semibold text-foreground">Escrow summary</p>
            <div className="mt-5 space-y-4">
              <SummaryRow
                icon={CircleDollarSign}
                label="Budget"
                value={form.budget ? `${form.budget} USDC` : "Not set"}
              />
              <Separator className="bg-border/60" />
              <SummaryRow
                icon={UserRound}
                label="Provider"
                value={form.provider ? "Specified wallet" : "Open marketplace"}
              />
              <Separator className="bg-border/60" />
              <SummaryRow
                icon={Clock3}
                label="Deadline"
                value={`${form.deadline || "0"} days`}
              />
            </div>

            <Separator className="my-5 bg-border/60" />
            <div className="space-y-3">
              <TransactionStep
                number="01"
                title="Approve USDC"
                active={phase === "approving"}
                complete={
                  phase === "creating" ||
                  phase === "submitted" ||
                  phase === "failed"
                }
              />
              <TransactionStep
                number="02"
                title="Create task escrow"
                active={phase === "creating"}
                complete={phase === "submitted"}
              />
            </div>
          </Reveal>

          {error && (
            <p
              className="rounded-[var(--radius)] border border-[var(--destructive)]/55 bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive-fg)]"
              role="alert"
            >
              {error}
            </p>
          )}

          <TransactionState
            phase={transactionPhase}
            hash={txHash || undefined}
            message={error || undefined}
          />

          {phase === "confirmed" && (
            <div className="space-y-3 rounded-[var(--radius)] border border-[var(--success)]/50 bg-[var(--success)]/10 p-4">
              <p className="text-sm font-semibold text-[var(--accent-cyan)]">
                Budget escrowed on Arc
              </p>
              {taskId ? (
                <Button asChild size="sm" className="w-full">
                  <Link href={`/tasks/${taskId}`}>Open task #{taskId}</Link>
                </Button>
              ) : (
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link href="/dashboard">Open dashboard</Link>
                </Button>
              )}
            </div>
          )}

          <TransactionButton
            phase={transactionPhase}
            type="submit"
            size="lg"
            className="w-full"
            disabled={
              isBusy ||
              phase === "submitted" ||
              phase === "confirmed" ||
              wrongNetwork
            }
            submittedLabel="Confirming on Arc"
          >
            <FilePlus2 aria-hidden="true" />
            {wrongNetwork ? `Switch to ${arcTestnet.name} first` : buttonLabel}
          </TransactionButton>
        </aside>
      </form>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required = false,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-[var(--destructive-fg)]"> *</span>}
      </Label>
      {children}
    </div>
  );
}

function SummaryRow({
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

function TransactionStep({
  number,
  title,
  active,
  complete,
}: {
  number: string;
  title: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex size-7 items-center justify-center border font-mono text-[10px] ${
          complete
            ? "border-[var(--success)]/55 bg-[var(--success)]/12 text-[var(--accent-cyan)]"
            : active
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-secondary text-muted-foreground"
        }`}
      >
        {complete ? <Check className="size-3.5" aria-hidden="true" /> : number}
      </span>
      <span
        className={`text-xs ${
          active || complete ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {title}
      </span>
    </div>
  );
}
