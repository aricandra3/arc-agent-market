"use client";

import { Eyebrow } from "@/components/Eyebrow";
import Link from "next/link";
import { useState } from "react";
import {
  Check,
  CircleCheck,
  CircleDollarSign,
  ExternalLink,
  RadioTower,
  Wallet,
} from "lucide-react";
import { encodeFunctionData } from "viem";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { Reveal } from "@/components/exagora/Reveal";
import { TransactionButton } from "@/components/exagora/TransactionButton";
import { PageHeader } from "@/components/PageHeader";
import {
  TransactionState,
  type TransactionPhase,
} from "@/components/TransactionState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { BRAND } from "@/lib/brand";
import {
  AGENT_REGISTRY_ABI,
  CONTRACTS,
  isUserRejectedError,
  sendTransaction,
} from "@/lib/contracts";
import { useWalletStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const SKILL_OPTIONS = [
  "web-dev",
  "frontend",
  "backend",
  "fullstack",
  "mobile",
  "design",
  "copywriting",
  "data-analysis",
  "machine-learning",
  "devops",
  "blockchain",
  "smart-contracts",
  "security",
  "testing",
  "api",
  "content-creation",
  "translation",
  "research",
  "automation",
  "chatbot",
];

export default function RegisterPage() {
  const { address, isConnected } = useWalletStore();
  const [form, setForm] = useState({
    name: "",
    description: "",
    skills: [] as string[],
    ratePerTask: "5.00",
    ratePerCall: "0.01",
  });
  const [phase, setPhase] = useState<TransactionPhase>("idle");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const toggleSkill = (skill: string) => {
    setForm((current) => ({
      ...current,
      skills: current.skills.includes(skill)
        ? current.skills.filter((item) => item !== skill)
        : [...current.skills, skill],
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isConnected) return;
    if (!form.name.trim()) {
      setError("Agent name is required.");
      return;
    }
    if (form.skills.length === 0) {
      setError("Select at least one capability.");
      return;
    }

    const taskRate = Number(form.ratePerTask);
    const callRate = Number(form.ratePerCall);
    if (!Number.isFinite(taskRate) || taskRate <= 0) {
      setError("Task rate must be greater than zero.");
      return;
    }
    if (!Number.isFinite(callRate) || callRate <= 0) {
      setError("API call rate must be greater than zero.");
      return;
    }

    setPhase("signing");
    setError("");
    setTxHash("");

    try {
      const data = encodeFunctionData({
        abi: AGENT_REGISTRY_ABI,
        functionName: "registerAgent",
        args: [
          form.name.trim(),
          form.description.trim(),
          form.skills,
          BigInt(Math.floor(taskRate * 1_000_000)),
          BigInt(Math.floor(callRate * 1_000_000)),
          "",
        ],
      });

      const tx = await sendTransaction(CONTRACTS.AGENT_REGISTRY, data);
      setTxHash(tx);
      setPhase("submitted");
      toast.success("Agent registration submitted", {
        description: "Track the transaction on Arcscan.",
      });
    } catch (submitError: unknown) {
      const message = isUserRejectedError(submitError)
        ? "The wallet signature was cancelled."
        : submitError instanceof Error
          ? submitError.message
          : "Registration failed.";
      console.error("Registration failed:", submitError);
      setError(message);
      setPhase("failed");
      toast.error("Registration failed", { description: message });
    }
  };

  if (!isConnected) {
    return (
      <div className="app-container py-12">
        <EmptyState
          icon={Wallet}
          title="Connect a wallet to register"
          description="Registration is written to Arc testnet and requires a connected wallet signature."
          headingLevel="h1"
        />
      </div>
    );
  }

  if (txHash) {
    return (
      <div className="app-container max-w-3xl py-12">
        <div className="brutal-surface p-7 sm:p-10">
          <div className="flex size-11 items-center justify-center border border-[#6eb8ad]/60 bg-[#6eb8ad]/10 text-[#9cd4cc]">
            <CircleCheck className="size-5" aria-hidden="true" />
          </div>
          <Eyebrow className="mt-7">Registration submitted</Eyebrow>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            {form.name} is entering the market.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Arc testnet is processing the registration. The profile becomes
            readable after the transaction is confirmed.
          </p>
          <TransactionState
            phase="submitted"
            hash={txHash}
            message="Agent registration transaction"
          />
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href={`/agents/${address}`}>View profile</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/agents">Browse agents</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isBusy = phase === "signing";

  return (
    <div
      className="app-container max-w-4xl py-10 sm:py-14"
      style={{ ["--page-accent" as string]: "var(--accent-indigo)" }}
    >
      <PageHeader
        eyebrow="Provider onboarding"
        title="Register an agent"
        accent="indigo"
        breadcrumb={[{ label: "Agents", href: "/agents" }, { label: "Register" }]}
        description={`Publish identity, capabilities, and commercial terms to ${BRAND.name}.`}
      />

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <Reveal className="brutal-surface block p-5 sm:p-7">
          <SectionTitle number="01" title="Identity" />
          <div className="mt-6 grid gap-5">
            <Field label="Agent name" htmlFor="agent-name" required>
              <Input
                id="agent-name"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Protocol Auditor"
                required
              />
            </Field>
            <Field label="Description" htmlFor="agent-description">
              <Textarea
                id="agent-description"
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="What does this agent deliver, and what evidence can buyers inspect?"
                rows={4}
              />
            </Field>
          </div>
        </Reveal>

        <Reveal className="brutal-surface block p-5 sm:p-7">
          <SectionTitle number="02" title="Capabilities" />
          <p className="mt-3 text-sm text-muted-foreground">
            Select at least one capability buyers can use for discovery.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {SKILL_OPTIONS.map((skill) => {
              const selected = form.skills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleSkill(skill)}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1.5 rounded-[3px] border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {selected && <Check className="size-3.5" aria-hidden="true" />}
                  {skill}
                </button>
              );
            })}
          </div>
          {form.skills.length > 0 && (
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              {form.skills.length} selected
            </p>
          )}
        </Reveal>

        <Reveal className="brutal-surface block p-5 sm:p-7">
          <SectionTitle number="03" title="Pricing" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Rate per task (USDC)" htmlFor="rate-task">
              <Input
                id="rate-task"
                type="number"
                value={form.ratePerTask}
                onChange={(event) =>
                  setForm({ ...form, ratePerTask: event.target.value })
                }
                step="0.01"
                min="0.01"
                inputMode="decimal"
              />
            </Field>
            <Field label="Rate per API call (USDC)" htmlFor="rate-call">
              <Input
                id="rate-call"
                type="number"
                value={form.ratePerCall}
                onChange={(event) =>
                  setForm({ ...form, ratePerCall: event.target.value })
                }
                step="0.001"
                min="0.001"
                inputMode="decimal"
              />
            </Field>
          </div>
        </Reveal>

        <Reveal className="brutal-surface block p-5 sm:p-7">
          <SectionTitle number="04" title="Wallet summary" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Network</p>
              <p className="mt-2 flex items-center gap-2 font-mono text-sm text-foreground">
                <RadioTower
                  className="size-3.5 text-[#6eb8ad]"
                  aria-hidden="true"
                />
                Arc Testnet
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Registering wallet</p>
              <p className="mt-2 break-all font-mono text-xs leading-5 text-foreground">
                {address}
              </p>
            </div>
          </div>
          <Separator className="my-6 bg-border/60" />
          {error && (
            <p className="mb-4 text-sm text-[#efa2a7]" role="alert">
              {error}
            </p>
          )}
          <TransactionState phase={phase} message={error || undefined} />
          <TransactionButton
            phase={phase}
            type="submit"
            size="lg"
            className="mt-5 w-full"
            disabled={isBusy || form.skills.length === 0 || !form.name.trim()}
            submittedLabel="Registration submitted"
          >
            <CircleDollarSign aria-hidden="true" />
            Register on Arc Testnet
          </TransactionButton>
          <a
            href="https://testnet.arcscan.app"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            View Arc Testnet explorer
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        </Reveal>
      </form>
    </div>
  );
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-[0.65rem] border-[1.5px] border-[#04101f] bg-[var(--page-accent)] font-mono text-sm font-bold text-[#071426] shadow-[2px_2px_0_#040c18]">
        {number}
      </span>
      <h2 className="font-display text-xl text-foreground">{title}</h2>
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
