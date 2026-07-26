import {
  BadgeCheck,
  Circle,
  CircleCheck,
  CircleX,
  Clock3,
  PauseCircle,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TASK_STATUS } from "@/lib/contracts";
import { cn } from "@/lib/utils";

type AgentStatus = "active" | "inactive";
export type ReceiptStatus =
  | "none"
  | "pending"
  | "passed"
  | "failed"
  | "disputed";

type StatusBadgeProps =
  | { kind: "agent"; status: AgentStatus }
  | { kind: "task"; status: number }
  | { kind: "receipt"; status: ReceiptStatus };

const taskStyles = [
  "border-[var(--muted-foreground)]/50 bg-[var(--steel)]/30 text-[var(--foreground)]",
  "border-[var(--warning)]/55 bg-[var(--warning)]/12 text-[var(--warning-fg)]",
  "border-[var(--muted-foreground)]/50 bg-[var(--steel)]/30 text-[var(--foreground)]",
  "border-[var(--warning)]/55 bg-[var(--warning)]/12 text-[var(--warning-fg)]",
  "border-[var(--success)]/55 bg-[var(--success)]/12 text-[var(--accent-cyan)]",
  "border-[var(--success)]/55 bg-[var(--success)]/12 text-[var(--accent-cyan)]",
  "border-[var(--destructive)]/55 bg-[var(--destructive)]/12 text-[var(--destructive-fg)]",
  "border-[var(--success)]/55 bg-[var(--success)]/12 text-[var(--accent-cyan)]",
  "border-border bg-secondary text-muted-foreground",
  "border-border bg-secondary text-muted-foreground",
];

export function StatusBadge(props: StatusBadgeProps) {
  if (props.kind === "agent") {
    const active = props.status === "active";
    const Icon = active ? BadgeCheck : PauseCircle;
    return (
      <Badge
        variant="outline"
        className={cn(
          active
            ? "border-[var(--success)]/55 bg-[var(--success)]/12 text-[var(--accent-cyan)]"
            : "border-border bg-secondary text-muted-foreground",
        )}
      >
        <Icon aria-hidden="true" />
        {active ? "Active" : "Inactive"}
      </Badge>
    );
  }

  if (props.kind === "receipt") {
    const receiptMap = {
      none: {
        label: "No receipt",
        icon: Circle,
        className: "border-border bg-secondary text-muted-foreground",
      },
      pending: {
        label: "Pending",
        icon: Clock3,
        className:
          "border-[var(--warning)]/55 bg-[var(--warning)]/12 text-[var(--warning-fg)]",
      },
      passed: {
        label: "Passed",
        icon: CircleCheck,
        className:
          "border-[var(--success)]/55 bg-[var(--success)]/12 text-[var(--accent-cyan)]",
      },
      failed: {
        label: "Failed",
        icon: CircleX,
        className:
          "border-[var(--destructive)]/55 bg-[var(--destructive)]/12 text-[var(--destructive-fg)]",
      },
      disputed: {
        label: "Disputed",
        icon: ShieldAlert,
        className:
          "border-[var(--destructive)]/55 bg-[var(--destructive)]/12 text-[var(--destructive-fg)]",
      },
    } satisfies Record<
      ReceiptStatus,
      { label: string; icon: typeof Circle; className: string }
    >;
    const state = receiptMap[props.status];
    const Icon = state.icon;
    return (
      <Badge variant="outline" className={state.className}>
        <Icon aria-hidden="true" />
        {state.label}
      </Badge>
    );
  }

  const status = TASK_STATUS[props.status] ?? "Unknown";
  const Icon =
    props.status === 4 || props.status === 5 || props.status === 7
      ? CircleCheck
      : props.status === 6
        ? ShieldAlert
        : props.status === 8 || props.status === 9
          ? PauseCircle
          : props.status === 1 || props.status === 3
            ? Clock3
            : Circle;

  return (
    <Badge
      variant="outline"
      className={taskStyles[props.status] ?? taskStyles[0]}
    >
      <Icon aria-hidden="true" />
      {status}
    </Badge>
  );
}
