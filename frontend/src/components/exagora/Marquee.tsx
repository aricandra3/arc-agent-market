import { cn } from "@/lib/utils";

type MarqueeProps = {
  items: string[];
  className?: string;
};

/**
 * Seamless retro ticker. Items are duplicated so the -50% translate loops
 * without a visible seam; pauses on hover (see `.marquee` in globals.css).
 */
export function Marquee({ items, className }: MarqueeProps) {
  const row = [...items, ...items];

  return (
    <div className={cn("marquee w-full", className)}>
      <div className="marquee-track">
        {row.map((item, index) => (
          <span
            key={index}
            className="flex items-center gap-3 px-5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#9fc1df]"
          >
            <span
              className="size-1 shrink-0 bg-[#7fe3d4]"
              aria-hidden="true"
            />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
