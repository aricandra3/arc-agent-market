import { cn } from "@/lib/utils";

type HeroBackgroundProps = {
  className?: string;
};

/**
 * Chrome arc: dua torus iridescent murni CSS (conic-gradient + radial mask),
 * dimiringkan di bawah perspective. Nol byte aset, tajam di resolusi apa pun.
 *
 * Flare-nya memakai teal ExAgora, bukan tembaga — inilah satu-satunya sumber
 * warna di hero, sehingga sisa halaman bisa monokrom total.
 */
export function HeroBackground({ className }: HeroBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("arc-stage bg-black", className)}
    >
      <div
        className="arc"
        style={{
          width: "min(78vw, 1180px)",
          top: "-24vh",
          right: "-16vw",
          transform: "rotateX(72deg)",
        }}
      >
        <i style={{ ["--dur" as string]: "52s" }} />
      </div>
      <div
        className="arc opacity-85"
        style={{
          width: "min(58vw, 820px)",
          bottom: "-30vh",
          left: "-14vw",
          transform: "rotateX(64deg) rotateY(18deg)",
        }}
      >
        <i
          style={{
            ["--dur" as string]: "76s",
            animationDirection: "reverse",
          }}
        />
      </div>
    </div>
  );
}
