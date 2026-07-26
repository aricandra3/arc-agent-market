"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CircleCheck,
  ExternalLink,
  KeyRound,
  RadioTower,
  ShieldCheck,
  Wallet,
} from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  OWNABLE2STEP_ABI,
  OWNED_CONTRACTS,
  ZERO_ADDRESS,
  explorerAddressUrl,
  isConfiguredAddress,
  readContract,
  shortAddress,
} from "@/lib/contracts";
import { describeReadError } from "@/lib/rpc";
import { describeTxError, sendTransaction, waitForTx } from "@/lib/tx";
import { useWalletStore } from "@/lib/store";
import { useWrongNetwork } from "@/lib/useWrongNetwork";

/**
 * Completes a pending Ownable2Step handover.
 *
 * Arc's explorer has no contract-verification or write UI, so there is no way
 * to call `acceptOwnership()` from a block explorer. This page fills that gap
 * without ever touching a private key: the incoming owner connects their own
 * wallet and signs, exactly as they would anywhere else in the app.
 */
interface OwnershipRow {
  label: string;
  address: string;
  owner: string;
  pendingOwner: string;
}

// Derived from module constants, so it is stable across renders.
const CONFIGURED = OWNED_CONTRACTS.filter((entry) =>
  isConfiguredAddress(entry.address),
);

export default function OwnershipAdminPage() {
  const { address, isConnected } = useWalletStore();
  const wrongNetwork = useWrongNetwork();
  const [rows, setRows] = useState<OwnershipRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [phase, setPhase] = useState<TransactionPhase>("idle");
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(async () => {
    // Read one contract at a time. The public RPC counts individual calls
    // against a per-IP quota, so ten parallel reads reliably trip it.
    const loaded: OwnershipRow[] = [];

    for (const entry of CONFIGURED) {
      const owner = await readContract({
          address: entry.address as `0x${string}`,
          abi: OWNABLE2STEP_ABI,
          functionName: "owner",
        })
      const pendingOwner = await readContract({
          address: entry.address as `0x${string}`,
          abi: OWNABLE2STEP_ABI,
          functionName: "pendingOwner",
        })

      loaded.push({
        label: entry.label,
        address: entry.address,
        owner,
        pendingOwner,
      });
      // Show progress as rows arrive rather than blocking on all five.
      setRows([...loaded]);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function load() {
      try {
        await refresh();
        if (isCurrent) setLoadError("");
      } catch (error) {
        console.error("Failed to read ownership state:", error);
        if (isCurrent) setLoadError(describeReadError(error));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    load();
    return () => {
      isCurrent = false;
    };
  }, [refresh, reloadKey]);

  const retry = () => {
    setIsLoading(true);
    setLoadError("");
    setReloadKey((key) => key + 1);
  };

  const acceptOwnership = async (row: OwnershipRow) => {
    setBusyLabel(row.label);
    setPhase("signing");
    setTxHash("");
    setMessage("");

    try {
      const hash = await sendTransaction({
        to: row.address,
        data: encodeFunctionData({
          abi: OWNABLE2STEP_ABI,
          functionName: "acceptOwnership",
        }),
      });
      setTxHash(hash);
      setPhase("submitted");
      setMessage(`Accepting ownership of ${row.label}.`);

      await waitForTx(hash);
      await refresh();
      setPhase("confirmed");
      setMessage("");
      toast.success(`${row.label} ownership accepted`);
    } catch (error) {
      const description = describeTxError(error);
      console.error(`acceptOwnership on ${row.label} failed:`, error);
      setPhase("failed");
      setMessage(description);
      toast.error(`${row.label} handover failed`, { description });
    } finally {
      setBusyLabel(null);
    }
  };

  const isBusy = phase === "signing" || phase === "submitted";
  const connected = address?.toLowerCase();
  const pendingForMe = rows.filter(
    (row) =>
      row.pendingOwner !== ZERO_ADDRESS &&
      row.pendingOwner.toLowerCase() === connected,
  );
  const stillPending = rows.filter((row) => row.pendingOwner !== ZERO_ADDRESS);

  return (
    <div
      className="app-container max-w-4xl py-16 sm:py-24"
    >
      <PageHeader
        title="Ownership handover"
        accent="teal"
        breadcrumb={[{ label: "Admin" }, { label: "Ownership" }]}
        description="Contracts use Ownable2Step: a transfer only takes effect once the incoming owner accepts it. Connect that wallet to finish the handover."
        stats={
          rows.length > 0
            ? [
                { label: "contracts", value: rows.length },
                { label: "pending", value: stillPending.length },
              ]
            : undefined
        }
      />

      {!isConnected && (
        <div className="mt-8">
          <EmptyState
            icon={Wallet}
            title="Connect the incoming owner wallet"
            description="Use the Connect wallet button in the header, signing in with the address the ownership was transferred to."
            headingLevel="h2"
          />
        </div>
      )}

      {isConnected && wrongNetwork && (
        <p
          role="alert"
          className="mt-8 rounded-[var(--radius)] border border-[var(--warning)]/50 bg-[var(--warning)]/10 px-4 py-3 text-sm text-[var(--warning-fg)]"
        >
          Wrong network. Switch to Arc Testnet before accepting ownership.
        </p>
      )}

      {isConnected && !wrongNetwork && stillPending.length > 0 && (
        <p className="mt-8 text-sm leading-6 text-muted-foreground">
          {pendingForMe.length > 0
            ? `${pendingForMe.length} of ${stillPending.length} pending transfer${stillPending.length === 1 ? "" : "s"} name this wallet. Accept each one below.`
            : `${stillPending.length} transfer${stillPending.length === 1 ? " is" : "s are"} pending, but none name ${shortAddress(address ?? "")}. Connect the wallet listed as pending owner.`}
        </p>
      )}

      <div className="mt-8 space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-28 rounded-[var(--radius-surface)] bg-primary/10"
            />
          ))
        ) : loadError ? (
          <EmptyState
            icon={RadioTower}
            title="Could not read ownership state"
            description={loadError}
            action={<Button onClick={retry}>Retry</Button>}
            tone="error"
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No contract addresses configured"
            description="Set the NEXT_PUBLIC_*_ADDRESS variables in frontend/.env.local from deployments/<network>.json."
          />
        ) : (
          rows.map((row) => {
            const isPending = row.pendingOwner !== ZERO_ADDRESS;
            const isMine =
              isPending && row.pendingOwner.toLowerCase() === connected;

            return (
              <div key={row.label} className="panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold text-foreground">
                      {row.label}
                    </p>
                    <a
                      href={explorerAddressUrl(row.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-primary"
                    >
                      {row.address}
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  </div>

                  {isPending ? (
                    <TransactionButton
                      phase={busyLabel === row.label ? phase : "idle"}
                      onClick={() => acceptOwnership(row)}
                      disabled={
                        !isConnected || !isMine || isBusy || wrongNetwork
                      }
                      submittedLabel="Accepting..."
                    >
                      <ShieldCheck aria-hidden="true" />
                      Accept ownership
                    </TransactionButton>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success)]/55 bg-[var(--success)]/12 px-3 py-1.5 text-xs text-[var(--accent-cyan)]">
                      <CircleCheck className="size-3.5" aria-hidden="true" />
                      Settled
                    </span>
                  )}
                </div>

                <dl className="mt-5 grid gap-3 border-t border-border/55 pt-4 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Current owner</dt>
                    <dd className="mt-1 font-mono text-foreground">
                      {shortAddress(row.owner, 10, 6)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Pending owner</dt>
                    <dd className="mt-1 font-mono text-foreground">
                      {isPending ? shortAddress(row.pendingOwner, 10, 6) : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })
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
