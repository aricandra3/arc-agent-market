import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function MarketplaceHoverGrid({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-market-grid
      className={cn("group/market-grid", className)}
      {...props}
    />
  );
}
