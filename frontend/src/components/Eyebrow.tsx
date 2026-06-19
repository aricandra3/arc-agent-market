import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type EyebrowProps = ComponentProps<"span"> & {
  /** Colour for the pulsing dot (defaults to cyan). */
  accentColor?: string;
};

/**
 * Mono uppercase "eyebrow" label rendered as a glassy retro chip with a
 * glowing status dot. Used above section titles across the app.
 */
export function Eyebrow({
  className,
  children,
  accentColor = "#7fe3d4",
  ...props
}: EyebrowProps) {
  return (
    <span className={cn("eyebrow-chip", className)} {...props}>
      <span
        className="size-1.5 shrink-0 animate-pulse rounded-full"
        style={{
          background: accentColor,
          boxShadow: `0 0 8px ${accentColor}`,
        }}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}
