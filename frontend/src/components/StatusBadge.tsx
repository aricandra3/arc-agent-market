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
  "border-[#7fa7c8]/50 bg-[#24496b]/30 text-[#c7dbf4]",
  "border-[#d4ad6f]/55 bg-[#d4ad6f]/12 text-[#e7c992]",
  "border-[#7fa7c8]/50 bg-[#24496b]/30 text-[#c7dbf4]",
  "border-[#d4ad6f]/55 bg-[#d4ad6f]/12 text-[#e7c992]",
  "border-[#6eb8ad]/55 bg-[#6eb8ad]/12 text-[#9cd4cc]",
  "border-[#6eb8ad]/55 bg-[#6eb8ad]/12 text-[#9cd4cc]",
  "border-[#d36c72]/55 bg-[#d36c72]/12 text-[#efa2a7]",
  "border-[#6eb8ad]/55 bg-[#6eb8ad]/12 text-[#9cd4cc]",
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
            ? "border-[#6eb8ad]/55 bg-[#6eb8ad]/12 text-[#9cd4cc]"
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
          "border-[#d4ad6f]/55 bg-[#d4ad6f]/12 text-[#e7c992]",
      },
      passed: {
        label: "Passed",
        icon: CircleCheck,
        className:
          "border-[#6eb8ad]/55 bg-[#6eb8ad]/12 text-[#9cd4cc]",
      },
      failed: {
        label: "Failed",
        icon: CircleX,
        className:
          "border-[#d36c72]/55 bg-[#d36c72]/12 text-[#efa2a7]",
      },
      disputed: {
        label: "Disputed",
        icon: ShieldAlert,
        className:
          "border-[#d36c72]/55 bg-[#d36c72]/12 text-[#efa2a7]",
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
