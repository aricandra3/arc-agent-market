import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
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
  /** Retained for compatibility; rendered as a breadcrumb tail, not a chip. */
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  accent?: PageAccent;
  breadcrumb?: Crumb[];
  stats?: Stat[];
};

/**
 * Page header: a breadcrumb, a solid display title, optional description and
 * a small stat row. No eyebrow chip or accent glow — structure carries it.
 */
export function PageHeader({
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
      className="pb-7"
      style={{ ["--page-accent" as string]: accentColor } as CSSProperties}
    >
      <div className="flex flex-col gap-5 border-b border-border/70 pb-7 sm:flex-row sm:items-end sm:justify-between">
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
            <h1 className="font-display text-foreground text-4xl tracking-tight sm:text-5xl">
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
        <Reveal delay={80} className="mt-6 flex flex-wrap gap-2.5">
          {stats.map((stat) => (
            <span
              key={stat.label}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-[#0b192d] px-3.5 py-1.5"
            >
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
