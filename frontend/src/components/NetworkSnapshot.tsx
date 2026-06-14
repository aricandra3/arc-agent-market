import { Activity, Bot, CircleDollarSign, ListChecks } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type NetworkSnapshotProps = {
  agents: number;
  tasks: number;
  volume: string | null;
  isLoading: boolean;
};

const metrics = [
  { key: "agents", label: "Registered agents", icon: Bot },
  { key: "tasks", label: "Tasks created", icon: ListChecks },
  { key: "volume", label: "USDC settled", icon: CircleDollarSign },
] as const;

export function NetworkSnapshot({
  agents,
  tasks,
  volume,
  isLoading,
}: NetworkSnapshotProps) {
  const values = {
    agents: agents.toLocaleString(),
    tasks: tasks.toLocaleString(),
    volume: volume ?? "Not indexed",
  };

  return (
    <section className="glass-surface relative z-10">
      <div className="flex items-center justify-between border-b border-primary/20 px-5 py-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-[#9fc1df]" aria-hidden="true" />
          <h2 className="text-xs font-semibold uppercase text-foreground">
            Network snapshot
          </h2>
        </div>
        <span className="font-mono text-[10px] text-[#9fc1df]">
          ARC TESTNET / LIVE
        </span>
      </div>
      <div className="grid md:grid-cols-3">
        {metrics.map(({ key, label, icon: Icon }, index) => (
          <div
            key={key}
            className="min-h-24 border-b border-primary/15 px-5 py-5 last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon className="size-3.5" aria-hidden="true" />
              <span>{label}</span>
            </div>
            {isLoading ? (
              <Skeleton className="mt-3 h-7 w-24 rounded-[2px] bg-primary/10" />
            ) : (
              <p
                className={`mt-2 font-mono text-xl font-semibold ${
                  index === 2 && !volume
                    ? "text-base text-muted-foreground"
                    : "text-foreground"
                }`}
              >
                {values[key]}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
