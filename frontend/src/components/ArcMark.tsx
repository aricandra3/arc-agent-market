import { cn } from "@/lib/utils";

type ArcMarkProps = {
  className?: string;
};

export function ArcMark({ className }: ArcMarkProps) {
  return (
    <span
      className={cn("relative block h-5 w-7 shrink-0", className)}
      aria-hidden="true"
    >
      <span className="absolute inset-x-0 top-0 h-5 rounded-t-full border-2 border-b-0 border-current" />
      <span className="absolute bottom-0 left-1/2 h-4 w-px -translate-x-1/2 -rotate-12 bg-current" />
    </span>
  );
}
