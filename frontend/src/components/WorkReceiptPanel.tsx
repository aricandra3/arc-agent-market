import { ExternalLink, FileCheck2, Fingerprint, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, type ReceiptStatus } from "@/components/StatusBadge";
import {
  formatPercentBps,
  shortAddress,
  type WorkReceiptRecord,
} from "@/lib/contracts";

type WorkReceiptPanelProps = {
  receipt: WorkReceiptRecord | null;
  taskStatus: number;
};

const receiptStates: ReceiptStatus[] = [
  "none",
  "pending",
  "passed",
  "failed",
  "disputed",
];

export function WorkReceiptPanel({
  receipt,
  taskStatus,
}: WorkReceiptPanelProps) {
  const status = receiptStates[receipt?.status ?? 0] ?? "none";

  return (
    <section className="brutal-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileCheck2 className="size-4 text-primary" aria-hidden="true" />
            Proof receipt
          </div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {receipt
              ? "Verifier-backed evidence attached to this task record."
              : taskStatus >= 3
                ? "No proof receipt has been attached to this submitted task."
                : "Proof becomes available after the provider submits a deliverable."}
          </p>
        </div>
        <StatusBadge kind="receipt" status={status} />
      </div>

      {receipt && (
        <>
          <Separator className="my-5 bg-border/60" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <BadgeScoreIcon />
                Score
              </p>
              <p className="mt-2 font-mono text-sm text-foreground">
                {receipt.status > 1
                  ? formatPercentBps(receipt.score)
                  : "Pending"}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <UserCheck className="size-3.5" aria-hidden="true" />
                Verifier
              </p>
              <p className="mt-2 font-mono text-sm text-foreground">
                {shortAddress(receipt.verifier)}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Fingerprint className="size-3.5" aria-hidden="true" />
                Receipt
              </p>
              <p className="mt-2 font-mono text-sm text-foreground">
                #{Number(receipt.id)}
              </p>
            </div>
          </div>
          {receipt.proofURI && (
            <div className="mt-5">
              <Button asChild variant="outline" size="sm">
                <a
                  href={receipt.proofURI}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View proof artifact
                  <ExternalLink aria-hidden="true" />
                </a>
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function BadgeScoreIcon() {
  return (
    <span
      className="inline-flex size-3.5 items-center justify-center border border-current font-mono text-[8px]"
      aria-hidden="true"
    >
      %
    </span>
  );
}
