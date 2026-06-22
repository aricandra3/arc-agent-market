import { cn } from "@/lib/utils";

type ExAgoraMarkProps = {
  className?: string;
};

export function ExAgoraMark({ className }: ExAgoraMarkProps) {
  return (
    <span
      className={cn(
        "font-display relative grid size-7 shrink-0 place-items-center rounded-[0.55rem] border-[1.5px] border-[#04101f] bg-[var(--accent-cyan)] text-[11px] font-extrabold uppercase leading-none text-[#071426] shadow-[2px_2px_0_#040c18]",
        className,
      )}
      aria-hidden="true"
    >
      EX
      <span className="absolute -right-1 -bottom-1 size-1.5 rounded-full border-[1.5px] border-[#04101f] bg-[var(--accent-gold)]" />
    </span>
  );
}
