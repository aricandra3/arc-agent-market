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

  return (
    <div
      className={cn(
        "brutal-surface flex min-h-64 flex-col items-start justify-center p-7 sm:p-10",
        tone === "error" && "border-[#d36c72]/70",
      )}
    >
      <div
        className={cn(
          "mb-5 flex size-12 items-center justify-center rounded-[0.9rem] border border-[#7fe3d4]/35 bg-secondary/80 text-[#7fe3d4] shadow-[3px_3px_0_#040c18,inset_0_1px_0_rgba(127,227,212,0.2)] backdrop-blur-sm",
          tone === "error" &&
            "border-[#d36c72]/70 text-[#efa2a7] shadow-[3px_3px_0_#040c18]",
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <Heading className="font-display text-xl font-semibold text-foreground">
        {title}
      </Heading>
      <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
