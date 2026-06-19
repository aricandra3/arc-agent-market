import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ActiveBorderProps = {
  active?: boolean;
  children: ReactNode;
  className?: string;
};

export function ActiveBorder({
  active = false,
  children,
  className,
}: ActiveBorderProps) {
  return (
    <div
      data-active={active}
      className={cn("exagora-active-border", className)}
    >
      {active && (
        <span className="exagora-active-border-runner" aria-hidden="true" />
      )}
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
