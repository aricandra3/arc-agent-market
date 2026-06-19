import { cn } from "@/lib/utils";

type ExAgoraMarkProps = {
  className?: string;
};

export function ExAgoraMark({ className }: ExAgoraMarkProps) {
  return (
    <span
      className={cn(
        "relative grid size-7 shrink-0 place-items-center rounded-[0.55rem] border border-current bg-gradient-to-br from-[#1b3a5c] to-[#10243c] font-mono text-[9px] font-semibold uppercase leading-none shadow-[2px_2px_0_#040c18,inset_0_1px_0_rgba(127,227,212,0.25)]",
        className,
      )}
      aria-hidden="true"
    >
      EX
      <span className="absolute -right-1 -bottom-1 size-1.5 rounded-full border border-current bg-[#071426]" />
    </span>
  );
}
