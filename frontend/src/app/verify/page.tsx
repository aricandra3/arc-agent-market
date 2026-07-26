"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CircleCheck,
  CircleX,
  ExternalLink,
  FileCheck2,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CONTRACTS,
  VERIFIER_REGISTRY_ABI,
  WORK_RECEIPT_ABI,
  formatDate,
  hasConfiguredVerifierRegistry,
  hasConfiguredWorkReceipt,
  normalizeWorkReceipt,
  readContract,
  shortAddress,
  type WorkReceiptRecord,
} from "@/lib/contracts";
import { resolveDeliverableCommitment } from "@/lib/deliverable";
import { READ_CONCURRENCY, describeReadError, mapLimit } from "@/lib/rpc";
import { parseScorePercent } from "@/lib/review";
import { describeTxError, sendTransaction, waitForTx } from "@/lib/tx";
import { useWalletStore } from "@/lib/store";
import { useWrongNetwork } from "@/lib/useWrongNetwork";

/** ReceiptStatus.Pending */
const PENDING = 1;

/**
 * How many receipt ids to inspect per page. WorkReceipt keeps no index of
 * pending receipts, so the queue walks ids down from nextReceiptId and filters.
 */
const SCAN_SIZE = 9;

export default function VerifyPage() {
  const { address, isConnected } = useWalletStore();
  const wrongNetwork = useWrongNetwork();
  const [pending, setPending] = useState<WorkReceiptRecord[]>([]);
  const [highestScanned, setHighestScanned] = useState(0);
  const [lowestScanned, setLowestScanned] = useState(0);
  const [isVerifier, setIsVerifier] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanningMore, setIsScanningMore] = useState(false);
  const [loadError, setLoadError] = useState("");

  const configured =
    hasConfiguredWorkReceipt() && hasConfiguredVerifierRegistry();

  const scan = useCallback(
    async (from: number, to: number): Promise<WorkReceiptRecord[]> => {
      if (from < to) return [];
      const ids = Array.from({ length: from - to + 1 }, (_, i) => from - i);

      const receipts = await mapLimit(
        ids,
        READ_CONCURRENCY,
        async (id): Promise<WorkReceiptRecord | null> => {
          try {
            const raw = await readContract({
              address: CONTRACTS.WORK_RECEIPT,
              abi: WORK_RECEIPT_ABI,
              functionName: "getReceipt",
              args: [BigInt(id)],
            });
            const receipt = normalizeWorkReceipt(raw);
            return receipt.status === PENDING ? receipt : null;
          } catch (error) {
            console.error(`Failed to read receipt ${id}:`, error);
            return null;
          }
        },
      );

      return receipts.filter(
        (receipt): receipt is WorkReceiptRecord => receipt !== null,
      );
    },
    [],
  );

  const load = useCallback(async () => {
    const next = Number(
      await readContract({
        address: CONTRACTS.WORK_RECEIPT,
        abi: WORK_RECEIPT_ABI,
        functionName: "nextReceiptId",
      }),
    );
    const highest = next - 1;
    const lowest = Math.max(1, highest - SCAN_SIZE + 1);

    setHighestScanned(highest);
    setLowestScanned(lowest);
    setPending(highest >= 1 ? await scan(highest, lowest) : []);
  }, [scan]);

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
        console.error("Failed to load the verification queue:", error);
        if (isCurrent) setLoadError(describeReadError(error));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    boot();
    return () => {
      isCurrent = false;
    };
  }, [configured, load]);

  // Registration is what the contract actually gates on, so surface it up front.
  useEffect(() => {
    let isCurrent = true;

    async function check() {
      if (!address || !configured) {
        if (isCurrent) setIsVerifier(null);
        return;
      }
      try {
        const active = await readContract({
          address: CONTRACTS.VERIFIER_REGISTRY,
          abi: VERIFIER_REGISTRY_ABI,
          functionName: "isActiveVerifier",
          args: [address as `0x${string}`],
        });
        if (isCurrent) setIsVerifier(Boolean(active));
      } catch {
        if (isCurrent) setIsVerifier(null);
      }
    }

    check();
    return () => {
      isCurrent = false;
    };
  }, [address, configured]);

  const scanOlder = async () => {
    setIsScanningMore(true);
    setLoadError("");
    try {
      const from = lowestScanned - 1;
      const to = Math.max(1, from - SCAN_SIZE + 1);
      const older = await scan(from, to);
      setPending((current) => [...current, ...older]);
      setLowestScanned(to);
    } catch (error) {
      console.error("Failed to scan older receipts:", error);
      setLoadError(describeReadError(error));
    } finally {
      setIsScanningMore(false);
    }
  };

  if (!configured) {
    return (
      <div className="app-container max-w-4xl py-16 sm:py-24">
        <PageHeader
          title="Verification queue"
          accent="teal"
          breadcrumb={[{ label: "Verify" }]}
        />
        <div className="mt-8">
          <EmptyState
            icon={FileCheck2}
            title="Verification contracts are not configured"
            description="Set NEXT_PUBLIC_WORK_RECEIPT_ADDRESS and NEXT_PUBLIC_VERIFIER_REGISTRY_ADDRESS in frontend/.env.local from deployments/<network>.json."
            headingLevel="h2"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app-container max-w-4xl py-16 sm:py-24">
      <PageHeader
        title="Verification queue"
        accent="teal"
        breadcrumb={[{ label: "Verify" }]}
        description="Proof receipts opened against submitted work. Recording a pass or fail updates the provider's verification stats on chain."
        stats={
          highestScanned > 0
            ? [
                { label: "pending", value: pending.length },
                { label: "receipts on chain", value: highestScanned },
              ]
            : undefined
        }
      />

      {!isConnected && (
        <div className="mt-8">
          <EmptyState
            icon={Wallet}
            title="Connect a verifier wallet"
            description="Only wallets registered as active verifiers can pass or fail a receipt."
            headingLevel="h2"
          />
        </div>
      )}

      {isConnected && isVerifier === false && (
        <p
          role="alert"
          className="mt-8 rounded-[0.65rem] border border-[#d4ad6f]/50 bg-[#d4ad6f]/10 px-4 py-3 text-sm text-[#e7c992]"
        >
          {shortAddress(address ?? "")} is not an active verifier, so the queue is
          read-only. The protocol owner registers verifiers from{" "}
          <Link href="/admin/verifiers" className="underline">
            admin / verifiers
          </Link>
          .
        </p>
      )}

      {isConnected && wrongNetwork && (
        <p
          role="alert"
          className="mt-4 rounded-[0.65rem] border border-[#d4ad6f]/50 bg-[#d4ad6f]/10 px-4 py-3 text-sm text-[#e7c992]"
        >
          Wrong network. Switch to Arc Testnet to record a verification.
        </p>
      )}

      <div className="mt-8 space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-40 rounded-[0.85rem] bg-primary/10"
            />
          ))
        ) : loadError && pending.length === 0 ? (
          <EmptyState
            icon={RadioTower}
            title="Could not read the queue"
            description={loadError}
            action={
              <Button onClick={() => window.location.reload()}>Retry</Button>
            }
            tone="error"
          />
        ) : highestScanned === 0 ? (
          <EmptyState
            icon={FileCheck2}
            title="No receipts have been opened yet"
            description="A provider opens a receipt from the task page once a deliverable is submitted."
            headingLevel="h2"
          />
        ) : pending.length === 0 ? (
          <EmptyState
            icon={CircleCheck}
            title="Nothing waiting on a verifier"
            description={`Receipts ${lowestScanned}–${highestScanned} are all finalised. Scan further back for older ones.`}
            headingLevel="h2"
          />
        ) : (
          pending.map((receipt) => (
            <ReceiptCard
              key={receipt.id.toString()}
              receipt={receipt}
              canVerify={Boolean(isVerifier) && !wrongNetwork}
              onVerified={load}
            />
          ))
        )}

        {loadError && pending.length > 0 && (
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
                : `Scan older receipts (${lowestScanned - 1} left)`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReceiptCard({
  receipt,
  canVerify,
  onVerified,
}: {
  receipt: WorkReceiptRecord;
  canVerify: boolean;
  onVerified: () => void | Promise<void>;
}) {
  const [score, setScore] = useState("");
  const [proof, setProof] = useState({ uri: "", hash: "" });
  const [phase, setPhase] = useState<TransactionPhase>("idle");
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState("");

  const isBusy = phase === "signing" || phase === "submitted";

  const verify = async (outcome: "pass" | "fail") => {
    const parsedScore = parseScorePercent(score);
    if (!parsedScore.ok) {
      setPhase("failed");
      setMessage(parsedScore.error);
      return;
    }

    // The verifier may attach their own evidence; otherwise the provider's
    // proof stands, and re-committing it keeps the stored hash consistent.
    const commitment = resolveDeliverableCommitment(
      proof.uri || receipt.proofURI,
      proof.hash,
    );
    if (!commitment.ok) {
      setPhase("failed");
      setMessage(commitment.error);
      return;
    }

    setPhase("signing");
    setTxHash("");
    setMessage("");

    try {
      const hash = await sendTransaction({
        to: CONTRACTS.WORK_RECEIPT,
        data: encodeFunctionData({
          abi: WORK_RECEIPT_ABI,
          functionName: outcome === "pass" ? "passReceipt" : "failReceipt",
          args: [
            receipt.id,
            parsedScore.bps,
            commitment.uri,
            commitment.hash,
          ],
        }),
      });
      setTxHash(hash);
      setPhase("submitted");
      setMessage("Waiting for Arc to confirm the verification.");

      await waitForTx(hash);
      setPhase("confirmed");
      setMessage("");
      toast.success(
        outcome === "pass" ? "Receipt passed" : "Receipt failed",
        { description: "Provider verification stats updated." },
      );
      await onVerified();
    } catch (error) {
      const description = describeTxError(error);
      console.error(`${outcome}Receipt failed:`, error);
      setPhase("failed");
      setMessage(description);
      toast.error("Verification failed", { description });
    }
  };

  return (
    <article className="brutal-surface space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold text-foreground">
            Receipt #{receipt.id.toString()}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            task #{receipt.taskId.toString()} · provider{" "}
            {shortAddress(receipt.provider)} · opened{" "}
            {formatDate(receipt.createdAt)}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/tasks/${receipt.taskId.toString()}`}>View task</Link>
        </Button>
      </div>

      <dl className="grid gap-4 border-t border-border/55 pt-4 text-xs sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-muted-foreground">Deliverable</dt>
          <dd className="mt-1 truncate">
            {receipt.deliverableURI ? (
              <a
                href={receipt.deliverableURI}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
              >
                {receipt.deliverableURI}
                <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <span className="text-muted-foreground">None recorded</span>
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Provider proof</dt>
          <dd className="mt-1 truncate">
            {receipt.proofURI ? (
              <a
                href={receipt.proofURI}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
              >
                {receipt.proofURI}
                <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <span className="text-muted-foreground">None recorded</span>
            )}
          </dd>
        </div>
      </dl>

      {canVerify && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`score-${receipt.id}`}>
                Score % <span className="text-[#efa2a7]">*</span>
              </Label>
              <Input
                id={`score-${receipt.id}`}
                value={score}
                onChange={(event) => setScore(event.target.value)}
                placeholder="94"
                inputMode="decimal"
                className="font-mono text-xs"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Stored on chain as basis points, so two decimals is the limit.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`proof-uri-${receipt.id}`}>
                Your evidence URI
              </Label>
              <Input
                id={`proof-uri-${receipt.id}`}
                value={proof.uri}
                onChange={(event) =>
                  setProof((current) => ({
                    ...current,
                    uri: event.target.value,
                  }))
                }
                placeholder="Leave blank to keep the provider's proof"
                className="font-mono text-xs"
              />
              <Input
                aria-label="Your evidence hash"
                value={proof.hash}
                onChange={(event) =>
                  setProof((current) => ({
                    ...current,
                    hash: event.target.value,
                  }))
                }
                placeholder="0x… optional 32-byte hash"
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <TransactionButton
              phase={phase}
              onClick={() => verify("pass")}
              disabled={isBusy}
              submittedLabel="Recording..."
            >
              <ShieldCheck aria-hidden="true" />
              Pass
            </TransactionButton>
            <TransactionButton
              phase={phase}
              variant="outline"
              className="border-[#d36c72]/65 text-[#efa2a7] hover:bg-[#d36c72]/10"
              onClick={() => verify("fail")}
              disabled={isBusy}
              submittedLabel="Recording..."
            >
              <CircleX aria-hidden="true" />
              Fail
            </TransactionButton>
          </div>

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
