import {
  CircleCheck,
  CircleDashed,
  FileCheck2,
  Fingerprint,
  WalletCards,
} from "lucide-react";
import {
  formatDate,
  type WorkReceiptRecord,
} from "@/lib/contracts";
import { cn } from "@/lib/utils";

type ProofTimelineProps = {
  receipt: WorkReceiptRecord;
  taskStatus: number;
};

type TimelineItem = {
  label: string;
  detail: string;
  icon: typeof CircleCheck;
  tone: "neutral" | "success" | "warning" | "error";
};

export function ProofTimeline({
  receipt,
  taskStatus,
}: ProofTimelineProps) {
  const items: TimelineItem[] = [
    {
      label: "Work submitted",
      detail:
        receipt.createdAt > BigInt(0)
          ? formatDate(receipt.createdAt)
          : "Deliverable anchored to the task record",
      icon: FileCheck2,
      tone: "neutral",
    },
    {
      label: "Proof attached",
      detail: receipt.proofURI
        ? "External proof artifact is available"
        : "Proof hash recorded onchain",
      icon: Fingerprint,
      tone: "neutral",
    },
  ];

  if (receipt.status > 1) {
    items.push({
      label:
        receipt.status === 2
          ? "Verification passed"
          : receipt.status === 3
            ? "Verification failed"
            : "Verification disputed",
      detail:
        receipt.verifiedAt > BigInt(0)
          ? formatDate(receipt.verifiedAt)
          : "Verifier decision recorded",
      icon: receipt.status === 2 ? CircleCheck : CircleDashed,
      tone:
        receipt.status === 2
          ? "success"
          : receipt.status === 3
            ? "error"
            : "warning",
    });
  } else {
    items.push({
      label: "Verification pending",
      detail: "Awaiting a verifier decision",
      icon: CircleDashed,
      tone: "warning",
    });
  }

  if (taskStatus >= 5) {
    items.push({
      label: "USDC settled",
      detail: "Escrow payment released to the provider",
      icon: WalletCards,
      tone: "success",
    });
  }

  return (
    <ol className="mt-6 border-l border-border/70 pl-5">
      {items.map(({ label, detail, icon: Icon, tone }) => (
        <li key={label} className="relative pb-5 last:pb-0">
          <span
            className={cn(
              "absolute top-0 -left-[1.83rem] flex size-4 items-center justify-center border bg-[#0b192d]",
              tone === "success" && "border-[#6eb8ad] text-[#9cd4cc]",
              tone === "warning" && "border-[#d4ad6f] text-[#e7c992]",
              tone === "error" && "border-[#d36c72] text-[#efa2a7]",
              tone === "neutral" && "border-border text-primary",
            )}
          >
            <Icon className="size-2.5" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {detail}
          </p>
        </li>
      ))}
    </ol>
  );
}
