import { CircleCheck, LoaderCircle } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { TransactionPhase } from "@/components/TransactionState";

type TransactionButtonProps = ComponentProps<typeof Button> & {
  phase: TransactionPhase;
  submittedLabel?: ReactNode;
};

export function TransactionButton({
  phase,
  children,
  submittedLabel = "Submitted",
  disabled,
  ...props
}: TransactionButtonProps) {
  const busy = phase === "signing" || phase === "submitted";

  return (
    <Button disabled={disabled || busy} {...props}>
      {busy && <LoaderCircle className="animate-spin" aria-hidden="true" />}
      {phase === "confirmed" && <CircleCheck aria-hidden="true" />}
      {phase === "submitted" ? submittedLabel : children}
    </Button>
  );
}
