import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  tone?: "neutral" | "error";
  headingLevel?: "h1" | "h2";
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral",
  headingLevel = "h2",
}: EmptyStateProps) {
  const Heading = headingLevel;
  const iconColor = tone === "error" ? "text-[#efa2a7]" : "text-[#9fc1df]";

  return (
    <div
      className={cn(
        "brutal-surface flex min-h-64 flex-col items-start justify-center p-7 sm:p-10",
        tone === "error" && "border-[#d36c72]/70",
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn("size-6 shrink-0", iconColor)} aria-hidden="true" />
        <Heading className="font-display text-2xl text-foreground">
          {title}
        </Heading>
      </div>
      <p className="mt-3 max-w-prose text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
