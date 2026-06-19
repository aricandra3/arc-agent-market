import { cn } from "@/lib/utils";

/** FNV-1a — small, fast, deterministic string hash. */
function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function getInitials(name: string, seed: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return seed.replace(/^0x/, "").slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

type AgentGlyphProps = {
  /** Stable seed — the agent address. */
  seed: string;
  name: string;
  /** Size + any extra classes, e.g. "size-12". */
  className?: string;
  labelClassName?: string;
  rounded?: string;
};

/**
 * Deterministic, on-brand identity tile for an agent. Each agent gets a
 * unique gradient (constrained to the teal→blue band so it stays cohesive)
 * plus a monogram — so a list of agents reads as distinct individuals rather
 * than identical placeholders.
 */
export function AgentGlyph({
  seed,
  name,
  className,
  labelClassName,
  rounded = "rounded-[0.85rem]",
}: AgentGlyphProps) {
  const h = hashString(seed || name);
  const hue1 = 165 + (h % 90); // 165..255: teal → blue → indigo (analogous)
  const hue2 = hue1 + 16 + ((h >> 7) % 30);
  const angle = (h >> 3) % 360;
  const mono = getInitials(name, seed);
  const nodeHue = hue1 + 28;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden border border-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),2px_2px_0_#040c18]",
        rounded,
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(${angle}deg, hsl(${hue1} 52% 34%), hsl(${hue2} 58% 20%))`,
      }}
    >
      {/* soft diagonal sheen */}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/25" />
      {/* faint orbiting ring for texture */}
      <span
        className="pointer-events-none absolute -right-1/3 -bottom-1/3 size-[120%] rounded-full border border-white/10"
        style={{ borderColor: `hsl(${nodeHue} 70% 70% / 0.18)` }}
      />
      <span
        className={cn(
          "relative font-mono font-semibold tracking-tight",
          labelClassName ?? "text-sm",
        )}
      >
        {mono}
      </span>
      <span
        className="absolute right-1.5 bottom-1.5 size-1.5 rounded-full ring-2 ring-black/20"
        style={{ background: `hsl(${nodeHue} 85% 72%)` }}
      />
    </span>
  );
}
