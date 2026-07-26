"use client";

import { useState } from "react";
import { FileCheck2 } from "lucide-react";
import { encodeFunctionData } from "viem";
import { toast } from "sonner";
import { TransactionButton } from "@/components/exagora/TransactionButton";
import {
  TransactionState,
  type TransactionPhase,
} from "@/components/TransactionState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CONTRACTS,
  WORK_RECEIPT_ABI,
  hasConfiguredWorkReceipt,
} from "@/lib/contracts";
import { resolveDeliverableCommitment } from "@/lib/deliverable";
import { describeTxError, sendTransaction, waitForTx } from "@/lib/tx";
import { useWrongNetwork } from "@/lib/useWrongNetwork";

type CreateReceiptFormProps = {
  taskId: string;
  onCreated: () => void | Promise<void>;
};

/**
 * Opens a proof receipt for a submitted deliverable.
 *
 * WorkReceipt.createReceipt is provider-only, requires the task to be Submitted,
 * and allows exactly one receipt per task — the caller decides when those hold.
 * The proof URI points at evidence a verifier can inspect: a test run, an audit
 * report, a reproduction.
 */
export function CreateReceiptForm({
  taskId,
  onCreated,
}: CreateReceiptFormProps) {
  const wrongNetwork = useWrongNetwork();
  const [form, setForm] = useState({ uri: "", hash: "" });
  const [phase, setPhase] = useState<TransactionPhase>("idle");
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState("");

  if (!hasConfiguredWorkReceipt()) return null;

  const isBusy = phase === "signing" || phase === "submitted";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const commitment = resolveDeliverableCommitment(form.uri, form.hash);
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
          functionName: "createReceipt",
          args: [BigInt(taskId), commitment.uri, commitment.hash],
        }),
      });
      setTxHash(hash);
      setPhase("submitted");
      setMessage("Waiting for Arc to confirm the receipt.");

      await waitForTx(hash);
      await onCreated();
      setPhase("confirmed");
      setMessage("");
      setForm({ uri: "", hash: "" });
      toast.success("Proof receipt opened", {
        description: "An active verifier can now pass or fail it.",
      });
    } catch (error) {
      const description = describeTxError(error);
      console.error("createReceipt failed:", error);
      setPhase("failed");
      setMessage(description);
      toast.error("Receipt creation failed", { description });
    }
  };

  return (
    <form onSubmit={submit} className="brutal-surface space-y-5 p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <FileCheck2 className="size-4 text-primary" aria-hidden="true" />
        <h2 className="font-display text-lg font-semibold text-foreground">
          Open a proof receipt
        </h2>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        Attach evidence a verifier can check — a test run, an audit report, a
        reproduction. One receipt per task, and it cannot be replaced.
      </p>

      <div className="space-y-2">
        <Label htmlFor="proof-uri">
          Proof URI <span className="text-[#efa2a7]">*</span>
        </Label>
        <Input
          id="proof-uri"
          value={form.uri}
          onChange={(event) =>
            setForm((current) => ({ ...current, uri: event.target.value }))
          }
          placeholder="ipfs://bafy... or https://..."
          className="font-mono text-xs"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="proof-hash">Proof hash (optional)</Label>
        <Input
          id="proof-hash"
          value={form.hash}
          onChange={(event) =>
            setForm((current) => ({ ...current, hash: event.target.value }))
          }
          placeholder="0x… 32-byte hash of the evidence"
          className="font-mono text-xs"
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Leave empty to commit <code>keccak256</code> of the URI instead.
        </p>
      </div>

      <TransactionButton
        phase={phase}
        type="submit"
        disabled={isBusy || wrongNetwork}
        submittedLabel="Receipt submitted"
      >
        <FileCheck2 aria-hidden="true" />
        {wrongNetwork ? "Switch to Arc Testnet first" : "Open receipt"}
      </TransactionButton>

      <TransactionState
        phase={phase}
        hash={txHash || undefined}
        message={message || undefined}
      />
    </form>
  );
}
