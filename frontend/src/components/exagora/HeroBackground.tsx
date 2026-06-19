import { cn } from "@/lib/utils";

type HeroBackgroundProps = {
  className?: string;
};

/** Drifting vertical data beams — positioned across the hero width. */
const beams = [
  { left: "12%", delay: "0s", duration: "8.5s" },
  { left: "27%", delay: "2.6s", duration: "7s" },
  { left: "44%", delay: "1.2s", duration: "9.5s" },
  { left: "63%", delay: "3.8s", duration: "7.8s" },
  { left: "78%", delay: "0.6s", duration: "8.8s" },
  { left: "91%", delay: "2s", duration: "9s" },
];

/**
 * Cohesive futuristic hero backdrop: deep gradient base, breathing aurora
 * orbs, a receding perspective grid, drifting data beams, and a vignette
 * that blends cleanly into the page. Pure CSS — no dependencies.
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
      {/* Base wash */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-20%,#0d2138_0%,#071426_60%)]" />

      {/* Diagonal colour bands (ExMarket-style energy) */}
      <div
        className="diagonal-band top-[16%] h-28"
        style={{
          background:
            "linear-gradient(90deg, color-mix(in srgb, var(--accent-azure) 16%, transparent), color-mix(in srgb, var(--accent-cyan) 6%, transparent) 60%, transparent)",
        }}
      />
      <div
        className="diagonal-band bottom-[10%] h-24 opacity-80"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent-indigo) 14%, transparent) 40%, color-mix(in srgb, var(--steel) 30%, transparent))",
        }}
      />

      {/* Receding grid */}
      <div className="hero-grid opacity-60" />

      {/* Aurora orbs */}
      <div
        className="absolute -top-24 right-[8%] size-[34rem] rounded-full blur-[90px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--glow-cyan) 26%, transparent), transparent 65%)",
          animation: "glow-pulse 11s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-[18%] -left-24 size-[30rem] rounded-full blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--primary) 22%, transparent), transparent 66%)",
          animation: "glow-pulse 14s ease-in-out infinite 1.5s",
        }}
      />

      {/* Data beams */}
      {beams.map((b, i) => (
        <span
          key={i}
          className="hero-beam"
          style={{
            left: b.left,
            animationDelay: b.delay,
            animationDuration: b.duration,
          }}
        />
      ))}

      {/* Top + bottom vignette to blend into the page */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#071426] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#071426] via-[#071426]/70 to-transparent" />
      {/* Subtle scanline texture */}
      <div className="scanlines absolute inset-0 opacity-[0.05]" />
    </div>
  );
}
