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
  const iconColor = tone === "error" ? "text-[var(--destructive-fg)]" : "text-[var(--muted-foreground)]";

  return (
    <div
      className={cn(
        "flex min-h-72 flex-col items-start justify-center rounded-[var(--radius-surface)] border border-border px-8 py-12 sm:px-12",
        tone === "error" && "border-[var(--destructive)]/50",
      )}
    >
      <Icon className={cn("size-5 shrink-0", iconColor)} aria-hidden="true" />
      <Heading className="mt-5 text-2xl font-light tracking-[-0.03em] text-foreground">
        {title}
      </Heading>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
