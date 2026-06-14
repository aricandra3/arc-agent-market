"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  CircleDollarSign,
  Clock3,
  FilePlus2,
  UserRound,
  Wallet,
} from "lucide-react";
import { encodeFunctionData, isAddress, parseUnits } from "viem";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { TransactionState } from "@/components/TransactionState";
import { Badge } from "@/components/ui/badge";
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
  isUserRejectedError,
  sendTransaction,
} from "@/lib/contracts";
import { useWalletStore } from "@/lib/store";

type CreateTaskPhase =
  | "idle"
  | "approving"
  | "creating"
  | "submitted"
  | "failed";

export default function CreateTaskPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="app-container max-w-5xl py-12">
          <Skeleton className="h-[34rem] rounded-[2px] bg-primary/10" />
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
  const [form, setForm] = useState({
    provider: searchParams.get("provider") || "",
    description: "",
    budget: "",
    deadline: "3",
    skills: "",
  });
  const [phase, setPhase] = useState<CreateTaskPhase>("idle");
  const [txHash, setTxHash] = useState("");
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
      await sendTransaction(CONTRACTS.USDC, approveData);

      setPhase("creating");
      const deadline = BigInt(
        Math.floor(Date.now() / 1000) + deadlineDays * 86400,
      );
      const skills = form.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);
      const provider =
        form.provider || "0x0000000000000000000000000000000000000000";
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

      const createTx = await sendTransaction(
        CONTRACTS.TASK_ESCROW,
        createData,
      );
      setTxHash(createTx);
      setPhase("submitted");
      toast.success("Task submitted to Arc", {
        description: "Track the escrow transaction on Arcscan.",
      });
    } catch (submitError: unknown) {
      const message = isUserRejectedError(submitError)
        ? "The wallet transaction was cancelled."
        : submitError instanceof Error
          ? submitError.message
          : "Task creation failed.";
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
    submitted: "Task submitted",
    failed: "Try again",
  }[phase];
  const transactionPhase =
    phase === "submitted"
      ? "submitted"
      : phase === "failed"
        ? "failed"
        : isBusy
          ? "signing"
          : "idle";

  return (
    <div className="app-container max-w-6xl py-10 sm:py-14">
      <PageHeader
        eyebrow="Task escrow"
        title="Create a task"
        description="Define the work, select a provider or open the request to the market, and secure the budget in USDC."
      />

      <form
        onSubmit={handleSubmit}
        className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]"
      >
        <section className="brutal-surface space-y-6 p-5 sm:p-7">
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
                <Badge
                  key={skill}
                  variant="outline"
                  className="border-[#416789]/70 bg-[#10243c] text-[#b8d0e6]"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="brutal-surface p-5">
            <p className="font-mono text-[11px] uppercase text-[#9fc1df]">
              Escrow summary
            </p>
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
          </div>

          {error && (
            <p
              className="border border-[#d36c72]/55 bg-[#d36c72]/10 p-3 text-sm text-[#efa2a7]"
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

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isBusy || phase === "submitted"}
          >
            <FilePlus2 aria-hidden="true" />
            {buttonLabel}
          </Button>
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
        {required && <span className="text-[#efa2a7]"> *</span>}
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
            ? "border-[#6eb8ad]/55 bg-[#6eb8ad]/12 text-[#9cd4cc]"
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
