import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Skeleton } from "@/components/ui/skeleton";

type NetworkSnapshotProps = {
  agents: number;
  tasks: number;
  volume: string | null;
  isLoading: boolean;
  /** Pembacaan onchain gagal. Angka yang ada tidak bisa dipercaya. */
  hasError?: boolean;
};

/**
 * Rail angka jaringan untuk hero: kolom vertikal, bukan panel lebar.
 * Tiga state jujur — memuat, gagal baca, dan benar-benar kosong.
 */
export function NetworkSnapshot({
  agents,
  tasks,
  volume,
  isLoading,
  hasError = false,
}: NetworkSnapshotProps) {
  // Kontrak terjangkau dan menjawab; isinya memang masih kosong.
  const isColdStart = !isLoading && !hasError && agents === 0 && tasks === 0;

  const metrics = [
    { key: "agents", label: "Live agents", value: agents },
    { key: "tasks", label: "Work records", value: tasks },
    { key: "volume", label: "USDC settled", value: null },
  ] as const;

  return (
    <aside className="relative lg:w-64" aria-label="Network snapshot">
      {/* Scrim lokal: radial closest-side, jadi memudar tanpa tepi keras.
          Chrome arc lewat tepat di belakang angka-angka ini. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-12 -inset-y-14 bg-[radial-gradient(closest-side,rgb(0_0_0/0.92),transparent)]"
      />

      <div className="relative grid grid-cols-3 gap-6 lg:grid-cols-1 lg:gap-9">
        {metrics.map(({ key, label, value }) => (
          <div key={key}>
            <p className="eyebrow">{label}</p>
            {isLoading ? (
              <Skeleton className="mt-2 h-9 w-20 rounded-[var(--radius)] bg-white/8" />
            ) : hasError ? (
              // Jangan pernah menampilkan angka yang tidak kita punya.
              // Nol karangan lebih merusak kepercayaan daripada em-dash,
              // karena pembaca tak bisa membedakannya dari nol asli.
              <p
                className="mt-2 font-mono text-4xl font-light tabular-nums text-[var(--muted-foreground)]"
                aria-label={`${label} unavailable`}
              >
                &mdash;
              </p>
            ) : value === null ? (
              <p className="mt-2 font-mono text-4xl font-light tabular-nums text-[var(--muted-foreground)]">
                {volume ?? <>&mdash;</>}
              </p>
            ) : (
              <p className="mt-2 font-mono text-4xl font-light tabular-nums text-[var(--foreground)]">
                <AnimatedCounter value={value} />
              </p>
            )}
          </div>
        ))}
      </div>

      {(hasError || isColdStart) && (
        <p className="relative mt-8 max-w-64 border-t border-[var(--hairline)] pt-4 text-xs leading-relaxed text-[var(--muted-foreground)]">
          {hasError ? (
            <>
              Live metrics unavailable &mdash; the Arc testnet RPC is rate
              limited. Contracts are unaffected.
            </>
          ) : (
            <>
              Contracts are deployed and responding. No agent has registered yet
              &mdash; this deployment is waiting for its first one.
            </>
          )}
        </p>
      )}
    </aside>
  );
}
