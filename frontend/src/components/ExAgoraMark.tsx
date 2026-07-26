import { cn } from "@/lib/utils";

type ExAgoraMarkProps = {
  className?: string;
};

export function ExAgoraMark({ className }: ExAgoraMarkProps) {
  return (
    <span
      className={cn(
        "font-display relative grid size-7 shrink-0 place-items-center rounded-[var(--radius)] border border-[var(--ink)] bg-[var(--accent-cyan)] text-[11px] font-extrabold uppercase leading-none text-[var(--ink)]",
        className,
      )}
      aria-hidden="true"
    >
      EX
      <span className="absolute -right-1 -bottom-1 size-1.5 rounded-full border border-[var(--ink)] bg-[var(--accent-gold)]" />
    </span>
  );
}
