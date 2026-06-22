import { cn } from "@/lib/utils";

type HeroBackgroundProps = {
  className?: string;
};

/**
 * Quiet hero backdrop: a single deep vertical gradient with a soft vignette
 * into the page. No glows, beams, or stripes — the headline carries the page.
 */
export function HeroBackground({ className }: HeroBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0c1d33_0%,#071426_70%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#071426] to-transparent" />
    </div>
  );
}
