"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  CircleDollarSign,
  Star,
} from "lucide-react";
import { AgentGlyph } from "@/components/AgentGlyph";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import {
  formatUSDC,
  shortAddress,
  type VerificationStats,
} from "@/lib/contracts";

interface AgentRowProps {
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
  rank?: number;
}

export default function AgentRow({
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
  rank,
}: AgentRowProps) {
  const rating = ratingCount > 0 ? Number(averageRating) / 100 : 0;
  const verifiedCount = Number(verificationStats?.totalReceipts ?? BigInt(0));

  return (
    <Link
      href={`/agents/${address}`}
      className="group relative flex items-stretch gap-4 overflow-hidden rounded-[1.15rem] border border-border/60 bg-gradient-to-r from-[#0d1f37]/80 to-[#0b192d]/60 p-4 backdrop-blur-sm transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[#7fe3d4]/45 hover:shadow-[0_18px_44px_-26px_rgba(127,227,212,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-5 sm:p-5"
    >
      {/* growing left accent */}
      <span className="pointer-events-none absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-gradient-to-b from-[#7fe3d4] to-[#5fa8c9] transition-transform duration-300 group-hover:scale-y-100" />

      <div className="flex items-center gap-3">
        {typeof rank === "number" && (
          <span className="hidden w-6 shrink-0 text-center font-mono text-sm font-semibold text-[#41648a] tabular-nums sm:block">
            {String(rank).padStart(2, "0")}
          </span>
        )}
        <AgentGlyph
          seed={address}
          name={name}
          className="size-12 sm:size-14"
          labelClassName="text-base"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="font-display truncate text-lg text-foreground">
            {name}
          </h3>
          <StatusBadge kind="agent" status={isActive ? "active" : "inactive"} />
          {verifiedCount > 0 && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#9cd4cc]">
              <BadgeCheck className="size-3.5" aria-hidden="true" />
              {verifiedCount} verified
            </span>
          )}
        </div>
        <p className="line-clamp-1 text-sm text-muted-foreground">
          {description || "No description provided."}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[11px] text-[#5f82a6]">
            {shortAddress(address, 6, 4)}
          </span>
          <span className="text-border">·</span>
          {skills.slice(0, 3).map((skill) => (
            <Badge
              key={skill}
              variant="outline"
              className="border-[#416789]/60 bg-[#10243c]/70 text-[11px] text-[#b8d0e6]"
            >
              {skill}
            </Badge>
          ))}
          {skills.length > 3 && (
            <span className="font-mono text-[11px] text-muted-foreground">
              +{skills.length - 3}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-center gap-2 border-l border-border/45 pl-4 sm:pl-5">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="size-3.5 text-[#d4ad6f]" aria-hidden="true" />
            {ratingCount > 0 ? rating.toFixed(1) : "—"}
          </span>
          <span className="hidden items-center gap-1 sm:flex">
            <BriefcaseBusiness className="size-3.5" aria-hidden="true" />
            {Number(completedTasks)}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-[0.6rem] border-[1.5px] border-[#04101f] bg-[var(--accent-gold)] px-2.5 py-1 font-display text-sm text-[#071426] shadow-[2px_2px_0_#040c18]">
          <CircleDollarSign className="size-3.5" aria-hidden="true" />
          {formatUSDC(ratePerTask)}
        </span>
        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-[#7fe3d4]">
          View
          <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
