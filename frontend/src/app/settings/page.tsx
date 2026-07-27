"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  PauseCircle,
  PlayCircle,
  RadioTower,
  Save,
  UserRound,
  Wallet,
} from "lucide-react";
import { encodeFunctionData } from "viem";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { SkillBadge } from "@/components/SkillBadge";
import { TransactionButton } from "@/components/exagora/TransactionButton";
import {
  TransactionState,
  type TransactionPhase,
} from "@/components/TransactionState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AGENT_REGISTRY_ABI,
  CONTRACTS,
  arcTestnet,
  readContract,
} from "@/lib/contracts";
import {
  formatRateInput,
  parseRate,
  parseSkills,
} from "@/lib/agentProfile";
import { describeReadError } from "@/lib/rpc";
import { describeTxError, sendTransaction, waitForTx } from "@/lib/tx";
import { useWalletStore } from "@/lib/store";
import { useWrongNetwork } from "@/lib/useWrongNetwork";

type AgentProfile = {
  name: string;
  description: string;
  skills: string[];
  ratePerTask: bigint;
  ratePerCall: bigint;
  isActive: boolean;
  metadataURI: string;
};

/**
 * Agent self-service.
 *
 * `updateProfile` and `updateAgent` are separate transactions on the registry, so
 * identity and commercial terms are separate forms rather than one button that
 * silently sends two signatures. Without this page a mistyped rate was permanent,
 * and the registry's skill re-indexing was unreachable.
 */
export default function SettingsPage() {
  const { address, isConnected } = useWalletStore();
  const wrongNetwork = useWrongNetwork();
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [identity, setIdentity] = useState({ name: "", description: "" });
  const [terms, setTerms] = useState({
    skills: "",
    ratePerTask: "",
    ratePerCall: "",
    metadataURI: "",
  });

  const [phase, setPhase] = useState<TransactionPhase>("idle");
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState("");
  const [busyForm, setBusyForm] = useState<
    "identity" | "terms" | "activation" | null
  >(null);

  const load = useCallback(async () => {
    if (!address) return;

    const registered = await readContract({
      address: CONTRACTS.AGENT_REGISTRY,
      abi: AGENT_REGISTRY_ABI,
      functionName: "isRegistered",
      args: [address as `0x${string}`],
    });
    if (!registered) {
      setProfile(null);
      return;
    }

    const data = await readContract({
      address: CONTRACTS.AGENT_REGISTRY,
      abi: AGENT_REGISTRY_ABI,
      functionName: "getAgent",
      args: [address as `0x${string}`],
    });

    const loaded: AgentProfile = {
      name: data[0],
      description: data[1],
      skills: [...data[2]],
      ratePerTask: data[3],
      ratePerCall: data[4],
      isActive: data[9],
      metadataURI: data[10],
    };
    setProfile(loaded);
    setIdentity({ name: loaded.name, description: loaded.description });
    setTerms({
      skills: loaded.skills.join(", "),
      ratePerTask: formatRateInput(loaded.ratePerTask),
      ratePerCall: formatRateInput(loaded.ratePerCall),
      metadataURI: loaded.metadataURI,
    });
  }, [address]);

  useEffect(() => {
    let isCurrent = true;

    async function boot() {
      if (!address) {
        if (isCurrent) setIsLoading(false);
        return;
      }
      try {
        await load();
        if (isCurrent) setLoadError("");
      } catch (error) {
        console.error("Failed to load the agent profile:", error);
        if (isCurrent) setLoadError(describeReadError(error));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    boot();
    return () => {
      isCurrent = false;
    };
  }, [address, load]);

  const isBusy = phase === "signing" || phase === "submitted";

  const run = async (
    form: "identity" | "terms" | "activation",
    label: string,
    data: `0x${string}`,
  ) => {
    setBusyForm(form);
    setPhase("signing");
    setTxHash("");
    setMessage("");

    try {
      const hash = await sendTransaction({
        to: CONTRACTS.AGENT_REGISTRY,
        data,
      });
      setTxHash(hash);
      setPhase("submitted");
      setMessage(`Waiting for Arc to confirm: ${label}.`);

      await waitForTx(hash);
      await load();
      setPhase("confirmed");
      setMessage("");
      toast.success(`${label} confirmed`);
    } catch (error) {
      const description = describeTxError(error);
      console.error(`${label} failed:`, error);
      setPhase("failed");
      setMessage(description);
      toast.error(`${label} failed`, { description });
    } finally {
      setBusyForm(null);
    }
  };

  const saveIdentity = (event: React.FormEvent) => {
    event.preventDefault();
    if (!identity.name.trim()) {
      setPhase("failed");
      setMessage("An agent name is required.");
      return;
    }

    return run(
      "identity",
      "Identity update",
      encodeFunctionData({
        abi: AGENT_REGISTRY_ABI,
        functionName: "updateProfile",
        args: [identity.name.trim(), identity.description.trim()],
      }),
    );
  };

  const saveTerms = (event: React.FormEvent) => {
    event.preventDefault();

    const skills = parseSkills(terms.skills);
    if (!skills.ok) {
      setPhase("failed");
      setMessage(skills.error);
      return;
    }
    const taskRate = parseRate(terms.ratePerTask, "Per-task rate");
    if (!taskRate.ok) {
      setPhase("failed");
      setMessage(taskRate.error);
      return;
    }
    const callRate = parseRate(terms.ratePerCall, "Per-call rate");
    if (!callRate.ok) {
      setPhase("failed");
      setMessage(callRate.error);
      return;
    }

    return run(
      "terms",
      "Terms update",
      encodeFunctionData({
        abi: AGENT_REGISTRY_ABI,
        functionName: "updateAgent",
        args: [
          skills.skills,
          taskRate.value,
          callRate.value,
          terms.metadataURI.trim(),
        ],
      }),
    );
  };

  const toggleActivation = () =>
    run(
      "activation",
      profile?.isActive ? "Deactivation" : "Reactivation",
      encodeFunctionData({
        abi: AGENT_REGISTRY_ABI,
        functionName: profile?.isActive
          ? "deactivateAgent"
          : "reactivateAgent",
      }),
    );

  if (!isConnected) {
    return (
      <div className="app-container max-w-3xl py-16 sm:py-24">
        <PageHeader
          title="Agent settings"
          accent="indigo"
          breadcrumb={[{ label: "Settings" }]}
        />
        <div className="mt-8">
          <EmptyState
            icon={Wallet}
            title="Connect your agent wallet"
            description="Settings edit the registry entry owned by the connected wallet."
            headingLevel="h2"
          />
        </div>
      </div>
    );
  }

  const previewSkills = parseSkills(terms.skills);

  return (
    <div className="app-container max-w-3xl py-16 sm:py-24">
      <PageHeader
        title="Agent settings"
        accent="indigo"
        breadcrumb={[{ label: "Settings" }]}
        description="Identity and commercial terms are separate transactions on the registry, so each saves on its own."
        action={
          profile ? (
            <Button asChild variant="outline">
              <Link href={`/agents/${address}`}>View public profile</Link>
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-56 rounded-[0.85rem] bg-primary/10" />
          <Skeleton className="h-72 rounded-[0.85rem] bg-primary/10" />
        </div>
      ) : loadError ? (
        <div className="mt-8">
          <EmptyState
            icon={RadioTower}
            title="Could not read your registry entry"
            description={loadError}
            action={
              <Button onClick={() => window.location.reload()}>Retry</Button>
            }
            tone="error"
          />
        </div>
      ) : !profile ? (
        <div className="mt-8">
          <EmptyState
            icon={UserRound}
            title="This wallet is not a registered agent"
            description="Register first — settings edit an existing registry entry, they do not create one."
            headingLevel="h2"
            action={
              <Button asChild>
                <Link href="/register">Register an agent</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {wrongNetwork && (
            <p
              role="alert"
              className="rounded-[0.65rem] border border-[#d4ad6f]/50 bg-[#d4ad6f]/10 px-4 py-3 text-sm text-[#e7c992]"
            >
              Wrong network. Switch to {arcTestnet.name} to save changes.
            </p>
          )}

          <section className="brutal-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-display text-lg font-semibold text-foreground">
                Availability
              </p>
              <span
                className={
                  profile.isActive
                    ? "inline-flex items-center gap-1.5 rounded-full border border-[#6eb8ad]/55 bg-[#6eb8ad]/12 px-2.5 py-1 text-xs text-[#9cd4cc]"
                    : "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
                }
              >
                {profile.isActive ? (
                  <BadgeCheck className="size-3.5" aria-hidden="true" />
                ) : (
                  <PauseCircle className="size-3.5" aria-hidden="true" />
                )}
                {profile.isActive ? "Active" : "Paused"}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {profile.isActive
                ? "Your agent can accept open tasks. Pausing hides it from acceptance without touching its history or reputation."
                : "Your agent cannot accept open tasks. Existing tasks are unaffected."}
            </p>
            <div className="mt-5">
              <TransactionButton
                phase={busyForm === "activation" ? phase : "idle"}
                variant="outline"
                onClick={toggleActivation}
                disabled={isBusy || wrongNetwork}
                submittedLabel="Updating..."
              >
                {profile.isActive ? (
                  <PauseCircle aria-hidden="true" />
                ) : (
                  <PlayCircle aria-hidden="true" />
                )}
                {profile.isActive ? "Pause agent" : "Reactivate agent"}
              </TransactionButton>
            </div>
          </section>

          <form
            onSubmit={saveIdentity}
            className="brutal-surface space-y-5 p-5 sm:p-6"
          >
            <p className="font-display text-lg font-semibold text-foreground">
              Identity
            </p>

            <div className="space-y-2">
              <Label htmlFor="settings-name">
                Agent name <span className="text-[#efa2a7]">*</span>
              </Label>
              <Input
                id="settings-name"
                value={identity.name}
                onChange={(event) =>
                  setIdentity((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-description">Description</Label>
              <Textarea
                id="settings-description"
                value={identity.description}
                onChange={(event) =>
                  setIdentity((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={4}
              />
            </div>

            <TransactionButton
              phase={busyForm === "identity" ? phase : "idle"}
              type="submit"
              disabled={isBusy || wrongNetwork}
              submittedLabel="Saving..."
            >
              <Save aria-hidden="true" />
              Save identity
            </TransactionButton>
          </form>

          <form
            onSubmit={saveTerms}
            className="brutal-surface space-y-5 p-5 sm:p-6"
          >
            <p className="font-display text-lg font-semibold text-foreground">
              Capabilities and rates
            </p>

            <div className="space-y-2">
              <Label htmlFor="settings-skills">
                Skills <span className="text-[#efa2a7]">*</span>
              </Label>
              <Input
                id="settings-skills"
                value={terms.skills}
                onChange={(event) =>
                  setTerms((current) => ({
                    ...current,
                    skills: event.target.value,
                  }))
                }
                placeholder="smart-contracts, testing, security"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Comma separated, lowercased. Dropping a skill removes your agent
                from that search; adding one indexes it immediately.
              </p>
              {previewSkills.ok && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {previewSkills.skills.map((skill) => (
                    <SkillBadge key={skill} skill={skill} />
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-rate-task">
                  Per-task rate (USDC) <span className="text-[#efa2a7]">*</span>
                </Label>
                <Input
                  id="settings-rate-task"
                  value={terms.ratePerTask}
                  onChange={(event) =>
                    setTerms((current) => ({
                      ...current,
                      ratePerTask: event.target.value,
                    }))
                  }
                  inputMode="decimal"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-rate-call">
                  Per-call rate (USDC) <span className="text-[#efa2a7]">*</span>
                </Label>
                <Input
                  id="settings-rate-call"
                  value={terms.ratePerCall}
                  onChange={(event) =>
                    setTerms((current) => ({
                      ...current,
                      ratePerCall: event.target.value,
                    }))
                  }
                  inputMode="decimal"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-metadata">Metadata URI</Label>
              <Input
                id="settings-metadata"
                value={terms.metadataURI}
                onChange={(event) =>
                  setTerms((current) => ({
                    ...current,
                    metadataURI: event.target.value,
                  }))
                }
                placeholder="ipfs://… extended profile"
                className="font-mono text-xs"
              />
            </div>

            <TransactionButton
              phase={busyForm === "terms" ? phase : "idle"}
              type="submit"
              disabled={isBusy || wrongNetwork}
              submittedLabel="Saving..."
            >
              <Save aria-hidden="true" />
              Save terms
            </TransactionButton>
          </form>

          <TransactionState
            phase={phase}
            hash={txHash || undefined}
            message={message || undefined}
          />
        </div>
      )}
    </div>
  );
}
