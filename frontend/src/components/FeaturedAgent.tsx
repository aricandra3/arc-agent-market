"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatUSDC,
  shortAddress,
  type VerificationStats,
} from "@/lib/contracts";

interface FeaturedAgentProps {
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

export default function FeaturedAgent({
  address,
  name,
  description,
  skills,
  ratePerTask,
  averageRating,
  ratingCount,
  completedTasks,
  isActive,
  verificationStats,
}: FeaturedAgentProps) {
  const rating = ratingCount > 0 ? Number(averageRating) / 100 : 0;
  const verifiedCount = Number(verificationStats?.totalReceipts ?? BigInt(0));

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-surface)] border border-[var(--ink)] bg-[var(--surface-deep)] transition-transform duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5">
      {/* calm header band */}
      <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-[var(--surface-strong)] px-6 py-5">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/10 px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.16em] text-[var(--accent-gold)] uppercase">
            <Star className="size-3 fill-current" aria-hidden="true" />
            Top specialist
          </span>
          <h3 className="mt-2 truncate text-2xl font-light tracking-[-0.03em] text-foreground">
            {name}
          </h3>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius)] border border-border/70 bg-[var(--surface-deep)] text-[var(--muted-foreground)]">
          <Boxes className="size-5" aria-hidden="true" />
        </span>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col px-6 py-5">
        <div className="rounded-[var(--radius-surface)] border border-border/50 bg-[var(--ink)]/60 p-4 font-mono text-xs leading-6 text-[var(--muted-foreground)]">
          <p>
            <span className="text-[var(--muted-foreground)]">agent:</span> verified specialist
          </p>
          <p>
            <span className="text-[var(--muted-foreground)]">wallet:</span>{" "}
            {shortAddress(address, 10, 6)}
          </p>
          <p className="truncate">
            <span className="text-[var(--muted-foreground)]">skills:</span>{" "}
            {skills.slice(0, 4).join(", ") || "—"}
          </p>
          <p>
            <span className="text-[var(--muted-foreground)]">status:</span>{" "}
            {isActive ? "active" : "inactive"} · {Number(completedTasks)} tasks
          </p>
        </div>

        <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {description || "No description provided."}
        </p>

        {/* two solid stat chips (PRICE / UNLOCKS style) */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[var(--radius-surface)] border border-[var(--ink)] bg-[var(--accent-gold)] px-4 py-3 text-[var(--ink)]">
            <p className="font-mono text-[10px] font-bold tracking-[0.14em] uppercase opacity-80">
              Rate
            </p>
            <p className="font-display text-xl">{formatUSDC(ratePerTask)}</p>
          </div>
          <div className="rounded-[var(--radius-surface)] border border-[var(--ink)] bg-[var(--accent-azure)] px-4 py-3 text-[var(--ink)]">
            <p className="flex items-center gap-1 font-mono text-[10px] font-bold tracking-[0.14em] uppercase opacity-80">
              <BadgeCheck className="size-3" aria-hidden="true" />
              Verified
            </p>
            <p className="font-display text-xl">
              {verifiedCount > 0 ? verifiedCount : "New"}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-sm text-foreground">
            <Star className="size-4 text-[var(--warning)]" aria-hidden="true" />
            {ratingCount > 0 ? rating.toFixed(1) : "—"}
            <span className="text-muted-foreground">
              ({Number(ratingCount)})
            </span>
          </span>
          <Button asChild>
            <Link href={`/agents/${address}`}>
              View profile
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
