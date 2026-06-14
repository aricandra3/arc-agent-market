import {
  CircleAlert,
  CircleCheck,
  ExternalLink,
  LoaderCircle,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TransactionPhase =
  | "idle"
  | "signing"
  | "submitted"
  | "confirmed"
  | "failed";

type TransactionStateProps = {
  phase: TransactionPhase;
  hash?: string;
  message?: string;
};

const states = {
  signing: {
    label: "Waiting for wallet signature",
    icon: LoaderCircle,
    className: "text-[#c7dbf4]",
  },
  submitted: {
    label: "Transaction submitted",
    icon: Radio,
    className: "text-[#c7dbf4]",
  },
  confirmed: {
    label: "Transaction confirmed",
    icon: CircleCheck,
    className: "text-[#9cd4cc]",
  },
  failed: {
    label: "Transaction failed",
    icon: CircleAlert,
    className: "text-[#efa2a7]",
  },
} as const;

export function TransactionState({
  phase,
  hash,
  message,
}: TransactionStateProps) {
  if (phase === "idle") {
    return <div className="min-h-0" aria-live="polite" />;
  }

  const state = states[phase];
  const Icon = state.icon;

  return (
    <div
      className="min-h-16 border border-border/70 bg-[#0b192d] p-4"
      aria-live="polite"
    >
      <div className={cn("flex items-start gap-3", state.className)}>
        <Icon
          className={cn(
            "mt-0.5 size-4 shrink-0",
            phase === "signing" && "animate-spin",
          )}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{state.label}</p>
          {message && (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {message}
            </p>
          )}
          {hash && (
            <a
              href={`https://testnet.arcscan.app/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 font-mono text-xs text-primary hover:text-foreground"
            >
              {shortHash(hash)}
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}
