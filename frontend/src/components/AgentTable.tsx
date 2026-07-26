"use client";

import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Star } from "lucide-react";
import { AgentGlyph } from "@/components/AgentGlyph";
import {
  formatUSDC,
  shortAddress,
  type VerificationStats,
} from "@/lib/contracts";

export interface AgentTableItem {
  address: string;
  name: string;
  description: string;
  skills: string[];
  ratePerTask: bigint;
  averageRating: bigint;
  ratingCount: bigint;
  completedTasks: bigint;
  isActive: boolean;
  verificationStats?: VerificationStats | null;
}

/** Lebar kolom dipakai bersama header dan baris agar sejajar sempurna. */
const COLS =
  "grid-cols-[2.5rem_minmax(0,1fr)_7rem_6rem_5.5rem_2rem] lg:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,14rem)_7rem_6rem_5.5rem_2rem]";

export function AgentTable({ agents }: { agents: AgentTableItem[] }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-surface)] border border-border">
      {/* Header kolom: mono kecil, uppercase. Bahasa alat kerja. */}
      <div
        className={`grid ${COLS} items-center gap-4 border-b border-border bg-[var(--surface-deep)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground`}
      >
        <span className="text-right">#</span>
        <span>Agent</span>
        <span className="hidden lg:block">Skills</span>
        <span className="text-right">Rate</span>
        <span className="text-right">Done</span>
        <span className="text-right">Rating</span>
        <span />
      </div>

      {agents.map((agent, index) => {
        const rating =
          agent.ratingCount > 0 ? Number(agent.averageRating) / 100 : null;
        const verified = Number(
          agent.verificationStats?.totalReceipts ?? BigInt(0),
        );

        return (
          <Link
            key={agent.address}
            href={`/agents/${agent.address}`}
            className={`data-row group ${COLS} gap-4 px-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`}
          >
            <span className="text-right font-mono text-xs tabular-nums text-muted-foreground">
              {index + 1}
            </span>

            <span className="flex min-w-0 items-center gap-3">
              <AgentGlyph
                seed={agent.address}
                name={agent.name}
                className="size-8 shrink-0"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-foreground">
                    {agent.name}
                  </span>
                  {verified > 0 && (
                    <BadgeCheck
                      className="size-3.5 shrink-0 text-[var(--accent-cyan)]"
                      aria-label={`${verified} verifier receipts`}
                    />
                  )}
                  {!agent.isActive && (
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      paused
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                  {shortAddress(agent.address)}
                </span>
              </span>
            </span>

            <span className="hidden min-w-0 gap-1.5 lg:flex">
              {agent.skills.slice(0, 2).map((skill) => (
                <span
                  key={skill}
                  className="truncate rounded-[var(--radius)] border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground"
                >
                  {skill}
                </span>
              ))}
              {agent.skills.length > 2 && (
                <span className="shrink-0 self-center font-mono text-[11px] text-muted-foreground">
                  +{agent.skills.length - 2}
                </span>
              )}
            </span>

            <span className="text-right font-mono text-sm tabular-nums text-foreground">
              {formatUSDC(agent.ratePerTask)}
            </span>

            <span className="text-right font-mono text-sm tabular-nums text-muted-foreground">
              {Number(agent.completedTasks)}
            </span>

            <span className="flex items-center justify-end gap-1 font-mono text-sm tabular-nums text-muted-foreground">
              {rating === null ? (
                <>&mdash;</>
              ) : (
                <>
                  <Star
                    className="size-3 fill-[var(--warning)] text-[var(--warning)]"
                    aria-hidden="true"
                  />
                  {rating.toFixed(1)}
                </>
              )}
            </span>

            <ArrowUpRight
              className="size-4 justify-self-end text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden="true"
            />
          </Link>
        );
      })}
    </div>
  );
}
