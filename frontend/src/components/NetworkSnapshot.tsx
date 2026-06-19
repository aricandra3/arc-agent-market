import { Activity, Bot, CircleDollarSign, ListChecks } from "lucide-react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Skeleton } from "@/components/ui/skeleton";

type NetworkSnapshotProps = {
  agents: number;
  tasks: number;
  volume: string | null;
  isLoading: boolean;
};

export function NetworkSnapshot({
  agents,
  tasks,
  volume,
  isLoading,
}: NetworkSnapshotProps) {
  const metrics = [
    {
      key: "agents",
      label: "Live agents",
      icon: Bot,
      value: agents,
      accent: "var(--accent-cyan)",
    },
    {
      key: "tasks",
      label: "Work records",
      icon: ListChecks,
      value: tasks,
      accent: "var(--accent-azure)",
    },
    {
      key: "volume",
      label: "USDC settled",
      icon: CircleDollarSign,
      value: null,
      accent: "var(--accent-gold)",
    },
  ] as const;

  return (
    <section className="glass-panel relative z-10">
      <div className="dot-grid flex items-center justify-between border-b border-primary/20 px-5 py-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-[#7fe3d4]" aria-hidden="true" />
          <h2 className="text-xs font-semibold uppercase text-foreground">
            Marketplace pulse
          </h2>
        </div>
        <span className="flex items-center gap-2 font-mono text-[10px] text-[#9fc1df]">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#7fe3d4] opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-[#7fe3d4]" />
          </span>
          EXAGORA / ARC TESTNET
        </span>
      </div>
      <div className="grid md:grid-cols-3">
        {metrics.map(({ key, label, icon: Icon, value, accent }) => (
          <div
            key={key}
            style={{ ["--accent" as string]: accent }}
            className="group/metric relative min-h-28 overflow-hidden border-b border-primary/20 px-5 py-5 transition-colors duration-300 last:border-b-0 hover:bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] md:border-r md:border-b-0 md:last:border-r-0"
          >
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px scale-x-0 bg-[linear-gradient(to_right,transparent,var(--accent),transparent)] opacity-75 transition-transform duration-500 group-hover/metric:scale-x-100" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon
                className="size-3.5 transition-colors group-hover/metric:[color:var(--accent)]"
                aria-hidden="true"
              />
              <span>{label}</span>
            </div>
            {isLoading ? (
              <Skeleton className="mt-3 h-7 w-24 rounded-[2px] bg-primary/10" />
            ) : value === null ? (
              <p className="mt-3 font-mono text-base font-semibold text-[#caa874]">
                {volume ?? "Not indexed"}
              </p>
            ) : (
              <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                <AnimatedCounter value={value} />
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
