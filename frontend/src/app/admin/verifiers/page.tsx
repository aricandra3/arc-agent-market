"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  ExternalLink,
  PauseCircle,
  PlayCircle,
  RadioTower,
  ShieldPlus,
  Wallet,
} from "lucide-react";
import { encodeFunctionData, isAddress } from "viem";
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
import {
  CONTRACTS,
  OWNABLE2STEP_ABI,
  VERIFIER_REGISTRY_ABI,
  VERIFIER_TYPES,
  explorerAddressUrl,
  formatDate,
  hasConfiguredVerifierRegistry,
  readContract,
  shortAddress,
} from "@/lib/contracts";
import { READ_CONCURRENCY, describeReadError, mapLimit } from "@/lib/rpc";
import { describeTxError, sendTransaction, waitForTx } from "@/lib/tx";
import { useWalletStore } from "@/lib/store";
import { useWrongNetwork } from "@/lib/useWrongNetwork";

type VerifierRecord = {
  wallet: string;
  name: string;
  verifierType: number;
  categories: string[];
  metadataURI: string;
  isActive: boolean;
  registeredAt: bigint;
};

/**
 * Verifier registry administration.
 *
 * Registration is `onlyOwner` on VerifierRegistry, so this page reads `owner()`
 * and enables the controls only for that wallet — otherwise every action would
 * cost a wallet round-trip just to revert.
 */
export default function VerifiersAdminPage() {
  const { address, isConnected } = useWalletStore();
  const wrongNetwork = useWrongNetwork();
  const [verifiers, setVerifiers] = useState<VerifierRecord[]>([]);
  const [owner, setOwner] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [form, setForm] = useState({
    wallet: "",
    name: "",
    verifierType: "1",
    categories: "",
    metadataURI: "",
  });
  const [phase, setPhase] = useState<TransactionPhase>("idle");
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState("");
  const [busyWallet, setBusyWallet] = useState<string | null>(null);

  const configured = hasConfiguredVerifierRegistry();

  const load = useCallback(async () => {
    const [ownerAddress, count] = [
      await readContract({
        address: CONTRACTS.VERIFIER_REGISTRY,
        abi: OWNABLE2STEP_ABI,
        functionName: "owner",
      }),
      Number(
        await readContract({
          address: CONTRACTS.VERIFIER_REGISTRY,
          abi: VERIFIER_REGISTRY_ABI,
          functionName: "getVerifierCount",
        }),
      ),
    ];
    setOwner(ownerAddress);

    const records = await mapLimit(
      Array.from({ length: count }, (_, i) => i),
      READ_CONCURRENCY,
      async (index): Promise<VerifierRecord | null> => {
        try {
          const wallet = await readContract({
            address: CONTRACTS.VERIFIER_REGISTRY,
            abi: VERIFIER_REGISTRY_ABI,
            functionName: "getVerifierByIndex",
            args: [BigInt(index)],
          });
          const data = await readContract({
            address: CONTRACTS.VERIFIER_REGISTRY,
            abi: VERIFIER_REGISTRY_ABI,
            functionName: "getVerifier",
            args: [wallet],
          });
          return {
            wallet: data[0],
            name: data[1],
            verifierType: Number(data[2]),
            categories: [...data[3]],
            metadataURI: data[4],
            isActive: data[5],
            registeredAt: data[6],
          };
        } catch (error) {
          console.error(`Failed to read verifier ${index}:`, error);
          return null;
        }
      },
    );

    setVerifiers(
      records.filter((record): record is VerifierRecord => record !== null),
    );
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function boot() {
      if (!configured) {
        if (isCurrent) setIsLoading(false);
        return;
      }
      try {
        await load();
        if (isCurrent) setLoadError("");
      } catch (error) {
        console.error("Failed to load verifiers:", error);
        if (isCurrent) setLoadError(describeReadError(error));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    boot();
    return () => {
      isCurrent = false;
    };
  }, [configured, load, reloadKey]);

  const isOwner =
    Boolean(address) &&
    Boolean(owner) &&
    address?.toLowerCase() === owner.toLowerCase();
  const isBusy = phase === "signing" || phase === "submitted";
  const canWrite = isConnected && isOwner && !wrongNetwork;

  const run = async (
    label: string,
    data: `0x${string}`,
    tag?: string,
  ) => {
    setBusyWallet(tag ?? null);
    setPhase("signing");
    setTxHash("");
    setMessage("");

    try {
      const hash = await sendTransaction({
        to: CONTRACTS.VERIFIER_REGISTRY,
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
      setBusyWallet(null);
    }
  };

  const register = async (event: React.FormEvent) => {
    event.preventDefault();

    const wallet = form.wallet.trim();
    if (!isAddress(wallet)) {
      setPhase("failed");
      setMessage("Verifier wallet must be a valid address (0x + 40 hex).");
      return;
    }
    if (!form.name.trim()) {
      setPhase("failed");
      setMessage("A verifier name is required.");
      return;
    }

    const categories = form.categories
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    await run(
      "Verifier registration",
      encodeFunctionData({
        abi: VERIFIER_REGISTRY_ABI,
        functionName: "registerVerifier",
        args: [
          wallet as `0x${string}`,
          form.name.trim(),
          Number(form.verifierType),
          categories,
          form.metadataURI.trim(),
        ],
      }),
    );
    setForm({
      wallet: "",
      name: "",
      verifierType: "1",
      categories: "",
      metadataURI: "",
    });
  };

  const toggle = (verifier: VerifierRecord) =>
    run(
      verifier.isActive ? "Verifier deactivation" : "Verifier reactivation",
      encodeFunctionData({
        abi: VERIFIER_REGISTRY_ABI,
        functionName: verifier.isActive
          ? "deactivateVerifier"
          : "reactivateVerifier",
        args: [verifier.wallet as `0x${string}`],
      }),
      verifier.wallet,
    );

  if (!configured) {
    return (
      <div className="app-container max-w-4xl py-16 sm:py-24">
        <PageHeader
          title="Verifier registry"
          accent="teal"
          breadcrumb={[{ label: "Admin" }, { label: "Verifiers" }]}
        />
        <div className="mt-8">
          <EmptyState
            icon={ShieldPlus}
            title="VerifierRegistry is not configured"
            description="Set NEXT_PUBLIC_VERIFIER_REGISTRY_ADDRESS in frontend/.env.local from deployments/<network>.json."
            headingLevel="h2"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app-container max-w-4xl py-16 sm:py-24">
      <PageHeader
        title="Verifier registry"
        accent="teal"
        breadcrumb={[{ label: "Admin" }, { label: "Verifiers" }]}
        description="Only registered, active verifiers can pass or fail a work receipt. Registration is owner-only."
        stats={
          verifiers.length > 0
            ? [
                { label: "verifiers", value: verifiers.length },
                {
                  label: "active",
                  value: verifiers.filter((entry) => entry.isActive).length,
                },
              ]
            : undefined
        }
      />

      {!isConnected && (
        <div className="mt-8">
          <EmptyState
            icon={Wallet}
            title="Connect the owner wallet"
            description="The registry owner is the only wallet that can register or deactivate a verifier."
            headingLevel="h2"
          />
        </div>
      )}

      {isConnected && owner && !isOwner && (
        <p
          role="alert"
          className="mt-8 rounded-[0.65rem] border border-[#d4ad6f]/50 bg-[#d4ad6f]/10 px-4 py-3 text-sm text-[#e7c992]"
        >
          {shortAddress(address ?? "")} is not the registry owner, so this page is
          read-only. The owner is {shortAddress(owner)}.
        </p>
      )}

      {isConnected && isOwner && wrongNetwork && (
        <p
          role="alert"
          className="mt-8 rounded-[0.65rem] border border-[#d4ad6f]/50 bg-[#d4ad6f]/10 px-4 py-3 text-sm text-[#e7c992]"
        >
          Wrong network. Switch to Arc Testnet to manage verifiers.
        </p>
      )}

      {canWrite && (
        <form onSubmit={register} className="brutal-surface mt-8 space-y-5 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <ShieldPlus className="size-4 text-primary" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Register a verifier
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="verifier-wallet">
                Wallet <span className="text-[#efa2a7]">*</span>
              </Label>
              <Input
                id="verifier-wallet"
                value={form.wallet}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    wallet: event.target.value,
                  }))
                }
                placeholder="0x…"
                className="font-mono text-xs"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verifier-name">
                Name <span className="text-[#efa2a7]">*</span>
              </Label>
              <Input
                id="verifier-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Manual QA Service"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verifier-type">Type</Label>
              <select
                id="verifier-type"
                value={form.verifierType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    verifierType: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-[0.65rem] border border-border bg-transparent px-3 text-sm text-foreground"
              >
                {VERIFIER_TYPES.map((label, ordinal) => (
                  <option key={label} value={ordinal}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="verifier-categories">Categories</Label>
              <Input
                id="verifier-categories"
                value={form.categories}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    categories: event.target.value,
                  }))
                }
                placeholder="software, testing"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verifier-metadata">Metadata URI</Label>
            <Input
              id="verifier-metadata"
              value={form.metadataURI}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  metadataURI: event.target.value,
                }))
              }
              placeholder="ipfs://… credentials, scope, contact"
              className="font-mono text-xs"
            />
          </div>

          <TransactionButton
            phase={busyWallet === null ? phase : "idle"}
            type="submit"
            disabled={isBusy}
            submittedLabel="Registering..."
          >
            <ShieldPlus aria-hidden="true" />
            Register verifier
          </TransactionButton>
        </form>
      )}

      <div className="mt-8 space-y-3">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-28 rounded-[0.85rem] bg-primary/10"
            />
          ))
        ) : loadError && verifiers.length === 0 ? (
          <EmptyState
            icon={RadioTower}
            title="Could not read the registry"
            description={loadError}
            action={
              <Button onClick={() => setReloadKey((key) => key + 1)}>
                Retry
              </Button>
            }
            tone="error"
          />
        ) : verifiers.length === 0 ? (
          <EmptyState
            icon={ShieldPlus}
            title="No verifiers registered"
            description="Until a verifier is registered and active, work receipts stay pending forever and no verification stats can accrue."
            headingLevel="h2"
          />
        ) : (
          verifiers.map((verifier) => (
            <article key={verifier.wallet} className="brutal-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-lg font-semibold text-foreground">
                      {verifier.name}
                    </p>
                    <span
                      className={
                        verifier.isActive
                          ? "inline-flex items-center gap-1 rounded-full border border-[#6eb8ad]/55 bg-[#6eb8ad]/12 px-2 py-0.5 text-[10px] text-[#9cd4cc]"
                          : "inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground"
                      }
                    >
                      {verifier.isActive ? (
                        <BadgeCheck className="size-3" aria-hidden="true" />
                      ) : (
                        <PauseCircle className="size-3" aria-hidden="true" />
                      )}
                      {verifier.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <a
                    href={explorerAddressUrl(verifier.wallet)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-primary"
                  >
                    {verifier.wallet}
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {VERIFIER_TYPES[verifier.verifierType] ?? "Unknown"} ·
                    registered {formatDate(verifier.registeredAt)}
                  </p>
                </div>

                {canWrite && (
                  <TransactionButton
                    phase={busyWallet === verifier.wallet ? phase : "idle"}
                    variant="outline"
                    onClick={() => toggle(verifier)}
                    disabled={isBusy}
                    submittedLabel="Updating..."
                  >
                    {verifier.isActive ? (
                      <PauseCircle aria-hidden="true" />
                    ) : (
                      <PlayCircle aria-hidden="true" />
                    )}
                    {verifier.isActive ? "Deactivate" : "Reactivate"}
                  </TransactionButton>
                )}
              </div>

              {verifier.categories.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {verifier.categories.map((category) => (
                    <SkillBadge key={category} skill={category} />
                  ))}
                </div>
              )}
            </article>
          ))
        )}
      </div>

      <div className="mt-6">
        <TransactionState
          phase={phase}
          hash={txHash || undefined}
          message={message || undefined}
        />
      </div>
    </div>
  );
}
