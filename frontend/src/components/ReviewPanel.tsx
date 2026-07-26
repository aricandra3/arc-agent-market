"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, MessageSquarePlus, Star } from "lucide-react";
import { encodeFunctionData } from "viem";
import { toast } from "sonner";
import { StarRating } from "@/components/StarRating";
import { TransactionButton } from "@/components/exagora/TransactionButton";
import {
  TransactionState,
  type TransactionPhase,
} from "@/components/TransactionState";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTRACTS,
  REPUTATION_ABI,
  arcTestnet,
  readContract,
} from "@/lib/contracts";
import { validateReview } from "@/lib/review";
import { describeTxError, sendTransaction, waitForTx } from "@/lib/tx";
import { useWalletStore } from "@/lib/store";
import { useWrongNetwork } from "@/lib/useWrongNetwork";

type ReviewPanelProps = {
  taskId: string;
  /** Whether the connected wallet is the requester or the provider. */
  isParty: boolean;
  /** Reputation only accepts a review once the task is Paid. */
  taskPaid: boolean;
  counterpartyLabel: string;
};

/**
 * Review submission for a settled task.
 *
 * Reputation.submitReview accepts one review per party per task and only after
 * the task reaches Paid, so the panel reads `hasReviewForTask` first rather than
 * offering a form that is guaranteed to revert.
 */
export function ReviewPanel({
  taskId,
  isParty,
  taskPaid,
  counterpartyLabel,
}: ReviewPanelProps) {
  const { address, isConnected } = useWalletStore();
  const wrongNetwork = useWrongNetwork();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [phase, setPhase] = useState<TransactionPhase>("idle");
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState("");

  const refreshReviewed = useCallback(async () => {
    if (!address || !taskPaid) return false;
    return readContract({
      address: CONTRACTS.REPUTATION,
      abi: REPUTATION_ABI,
      functionName: "hasReviewForTask",
      args: [BigInt(taskId), address as `0x${string}`],
    });
  }, [address, taskId, taskPaid]);

  useEffect(() => {
    let isCurrent = true;

    async function check() {
      try {
        const reviewed = await refreshReviewed();
        if (isCurrent) setAlreadyReviewed(Boolean(reviewed));
      } catch {
        // A failed read should not hide the form; the contract is the gate.
        if (isCurrent) setAlreadyReviewed(false);
      }
    }

    check();
    return () => {
      isCurrent = false;
    };
  }, [refreshReviewed]);

  if (!taskPaid || !isConnected || !isParty) return null;

  const isBusy = phase === "signing" || phase === "submitted";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const draft = validateReview(rating, comment);
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
        to: CONTRACTS.REPUTATION,
        data: encodeFunctionData({
          abi: REPUTATION_ABI,
          functionName: "submitReview",
          args: [BigInt(taskId), draft.rating, draft.comment],
        }),
      });
      setTxHash(hash);
      setPhase("submitted");
      setMessage("Waiting for Arc to confirm the review.");

      await waitForTx(hash);
      setAlreadyReviewed(true);
      setPhase("confirmed");
      setMessage("");
      toast.success("Review submitted", {
        description: `${counterpartyLabel} reputation updated.`,
      });
    } catch (error) {
      const description = describeTxError(error);
      console.error("submitReview failed:", error);
      setPhase("failed");
      setMessage(description);
      toast.error("Review failed", { description });
    }
  };

  if (alreadyReviewed) {
    return (
      <section className="brutal-surface p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <CircleCheck
            className="size-4 text-[#9cd4cc]"
            aria-hidden="true"
          />
          <h2 className="font-display text-lg font-semibold text-foreground">
            Review submitted
          </h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          You have already rated this task. Each party can review once, and the
          rating is final once it is on chain.
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="brutal-surface space-y-5 p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Star className="size-4 text-primary" aria-hidden="true" />
        <h2 className="font-display text-lg font-semibold text-foreground">
          Rate this task
        </h2>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        Your rating feeds {counterpartyLabel} public reputation and trust score.
        It is stored on chain and cannot be edited.
      </p>

      <div className="space-y-2">
        <Label htmlFor="review-rating">
          Rating <span className="text-[#efa2a7]">*</span>
        </Label>
        <div id="review-rating">
          <StarRating value={rating} onChange={setRating} disabled={isBusy} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-comment">Comment</Label>
        <Textarea
          id="review-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="What went well, and what would you change?"
          rows={4}
          maxLength={500}
        />
        <p className="text-xs leading-5 text-muted-foreground">
          {comment.trim().length}/500 characters, stored on chain.
        </p>
      </div>

      <TransactionButton
        phase={phase}
        type="submit"
        disabled={isBusy || wrongNetwork || rating === 0}
        submittedLabel="Review submitted"
      >
        <MessageSquarePlus aria-hidden="true" />
        {wrongNetwork ? `Switch to ${arcTestnet.name} first` : "Submit review"}
      </TransactionButton>

      <TransactionState
        phase={phase}
        hash={txHash || undefined}
        message={message || undefined}
      />
    </form>
  );
}
