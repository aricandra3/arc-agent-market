import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Eyebrow } from "@/components/Eyebrow";
import { Reveal } from "@/components/exagora/Reveal";

export type PageAccent = "cyan" | "azure" | "indigo" | "gold" | "teal";

const ACCENT_VAR: Record<PageAccent, string> = {
  cyan: "var(--accent-cyan)",
  azure: "var(--accent-azure)",
  indigo: "var(--accent-indigo)",
  gold: "var(--accent-gold)",
  teal: "var(--accent-teal)",
};

type Crumb = { label: string; href?: string };
type Stat = { label: string; value: ReactNode };

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  accent?: PageAccent;
  breadcrumb?: Crumb[];
  stats?: Stat[];
};

/**
 * Page hero band: an ambient backdrop (grid + an accent glow) sits behind a
 * breadcrumb, animated eyebrow, gradient title and optional stat chips. The
 * `accent` gives each tab its own colour identity via `--page-accent`, which
 * page-level accents (hover lines, etc.) also read.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  accent = "cyan",
  breadcrumb,
  stats,
}: PageHeaderProps) {
  const accentColor = ACCENT_VAR[accent];

  return (
    <div
      className="relative isolate pb-7"
      style={{ ["--page-accent" as string]: accentColor } as CSSProperties}
    >
      {/* ambient backdrop — bleeds slightly past the container */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -right-[12vw] -left-[12vw] -z-10 h-72"
        style={{
          background:
            "radial-gradient(48% 100% at 50% 0%, color-mix(in srgb, var(--page-accent) 16%, transparent), transparent 72%)",
        }}
      />
      <div
        aria-hidden="true"
        className="line-grid pointer-events-none absolute -top-24 -right-[12vw] -left-[12vw] -z-10 h-60 opacity-[0.4] [mask-image:radial-gradient(60%_100%_at_50%_0%,#000,transparent_75%)]"
      />

      <div className="flex flex-col gap-5 border-b border-border/70 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-px w-28 bg-[linear-gradient(to_right,var(--page-accent),transparent)]"
        />
        <div className="max-w-2xl">
          {breadcrumb && breadcrumb.length > 0 && (
            <nav className="mb-3 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <Link href="/" className="transition-colors hover:text-foreground">
                Home
              </Link>
              {breadcrumb.map((crumb) => (
                <span key={crumb.label} className="flex items-center gap-1.5">
                  <span className="text-border">/</span>
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="transition-colors hover:text-foreground"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground/80">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
          <Reveal>
            {eyebrow && (
              <Eyebrow
                className="mb-4 border-[color:color-mix(in_srgb,var(--page-accent)_38%,transparent)] bg-[color:color-mix(in_srgb,var(--page-accent)_9%,transparent)] text-[color:color-mix(in_srgb,var(--page-accent)_82%,var(--foreground))]"
                accentColor="var(--page-accent)"
              >
                {eyebrow}
              </Eyebrow>
            )}
            <h1 className="font-display text-gradient text-4xl tracking-tight sm:text-5xl">
              {title}
            </h1>
            {description && (
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                {description}
              </p>
            )}
          </Reveal>
        </div>
        {action && (
          <Reveal delay={120} variant="left" className="shrink-0">
            {action}
          </Reveal>
        )}
      </div>

      {stats && stats.length > 0 && (
        <Reveal
          delay={80}
          className="mt-6 flex flex-wrap gap-2.5"
        >
          {stats.map((stat) => (
            <span
              key={stat.label}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-[#0b192d]/70 px-3.5 py-1.5 backdrop-blur-sm"
            >
              <span className="size-1.5 rounded-full bg-[var(--page-accent)] shadow-[0_0_8px_var(--page-accent)]" />
              <span className="font-mono text-sm font-semibold text-foreground tabular-nums">
                {stat.value}
              </span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </span>
          ))}
        </Reveal>
      )}
    </div>
  );
}
