import { cn } from "@/lib/utils";

function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * A skill tag whose colour is derived deterministically from the skill name,
 * constrained to the teal→indigo analogous band so a row of tags reads as
 * lively-but-cohesive (rather than one flat colour everywhere).
 */
export function SkillBadge({
  skill,
  className,
}: {
  skill: string;
  className?: string;
}) {
  const hue = 165 + (hashString(skill) % 90);
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        className,
      )}
      style={{
        borderColor: `hsl(${hue} 48% 58% / 0.5)`,
        background: `hsl(${hue} 45% 45% / 0.14)`,
        color: `hsl(${hue} 55% 82%)`,
      }}
    >
      {skill}
    </span>
  );
}
