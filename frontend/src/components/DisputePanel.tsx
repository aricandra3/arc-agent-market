"use client";

import { useState } from "react";
import { Scale, ShieldAlert } from "lucide-react";
import { encodeFunctionData } from "viem";
import { toast } from "sonner";
import { TransactionButton } from "@/components/exagora/TransactionButton";
import {
  TransactionState,
  type TransactionPhase,
} from "@/components/TransactionState";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CONTRACTS, TASK_ESCROW_ABI, arcTestnet } from "@/lib/contracts";
import { MAX_REASON_LENGTH, validateDisputeReason } from "@/lib/dispute";
import { describeTxError, sendTransaction, waitForTx } from "@/lib/tx";
import { useWrongNetwork } from "@/lib/useWrongNetwork";

type DisputePanelProps = {
  taskId: string;
  /** Countdown text from `describeDisputeWindow`. */
  windowLabel: string;
  onDisputed: () => void | Promise<void>;
};

/**
 * Raises a dispute on submitted work.
 *
 * `disputeTask` is open to either party while the task is Submitted and the
 * window is still open. Once raised, only the protocol owner can resolve it —
 * that asymmetry is why the reason field is mandatory and why the copy is blunt
 * about the consequence.
 */
export function DisputePanel({
  taskId,
  windowLabel,
  onDisputed,
}: DisputePanelProps) {
  const wrongNetwork = useWrongNetwork();
  const [reason, setReason] = useState("");
  const [phase, setPhase] = useState<TransactionPhase>("idle");
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState("");

  const isBusy = phase === "signing" || phase === "submitted";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const draft = validateDisputeReason(reason);
    if (!draft.ok) {
      setPhase("failed");
      setMessage(draft.error);
      return;
    }

    setPhase("signing");
    setTxHash("");
    setMessage("");

    try {
      const hash = await sendTransaction({
        to: CONTRACTS.TASK_ESCROW,
        data: encodeFunctionData({
          abi: TASK_ESCROW_ABI,
          functionName: "disputeTask",
          args: [BigInt(taskId), draft.reason],
        }),
      });
      setTxHash(hash);
      setPhase("submitted");
      setMessage("Waiting for Arc to record the dispute.");

      await waitForTx(hash);
      await onDisputed();
      setPhase("confirmed");
      setMessage("");
      setReason("");
      toast.success("Dispute raised", {
        description: "The escrow is frozen until the protocol owner resolves it.",
      });
    } catch (error) {
      const description = describeTxError(error);
      console.error("disputeTask failed:", error);
      setPhase("failed");
      setMessage(description);
      toast.error("Dispute failed", { description });
    }
  };

  return (
    <form onSubmit={submit} className="brutal-surface space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Scale className="size-4 text-primary" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-foreground">
            Dispute this delivery
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4ad6f]/55 bg-[#d4ad6f]/12 px-2.5 py-1 font-mono text-[11px] text-[#e7c992]">
          {windowLabel}
        </span>
      </div>

      <p className="flex gap-2.5 rounded-[0.65rem] border border-[#d4ad6f]/45 bg-[#d4ad6f]/10 p-3 text-sm leading-6 text-[#e7c992]">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Raising a dispute freezes the escrow. Neither approval nor automatic
          release is possible afterwards — only the protocol owner can split the
          budget, and that decision is final.
        </span>
      </p>

      <div className="space-y-2">
        <Label htmlFor="dispute-reason">
          What is wrong with the delivery?{" "}
          <span className="text-[#efa2a7]">*</span>
        </Label>
        <Textarea
          id="dispute-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="State what was promised, what arrived, and what evidence supports it. This is the only context the resolver gets."
          rows={5}
          maxLength={MAX_REASON_LENGTH}
          required
        />
        <p className="text-xs leading-5 text-muted-foreground">
          {reason.trim().length}/{MAX_REASON_LENGTH} characters, recorded on chain
          in the dispute event.
        </p>
      </div>

      <TransactionButton
        phase={phase}
        type="submit"
        variant="outline"
        className="border-[#d36c72]/65 text-[#efa2a7] hover:bg-[#d36c72]/10"
        disabled={isBusy || wrongNetwork}
        submittedLabel="Dispute submitted"
      >
        <Scale aria-hidden="true" />
        {wrongNetwork ? `Switch to ${arcTestnet.name} first` : "Raise dispute"}
      </TransactionButton>

      <TransactionState
        phase={phase}
        hash={txHash || undefined}
        message={message || undefined}
      />
    </form>
  );
}
