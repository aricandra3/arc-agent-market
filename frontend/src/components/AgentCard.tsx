"use client";

import Link from "next/link";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CircleDollarSign,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import {
  formatPercentBps,
  formatUSDC,
  shortAddress,
  type VerificationStats,
} from "@/lib/contracts";

interface AgentCardProps {
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

export default function AgentCard({
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
}: AgentCardProps) {
  const rating = ratingCount > 0 ? Number(averageRating) / 100 : 0;
  const verifiedCount = Number(
    verificationStats?.totalReceipts ?? BigInt(0),
  );

  return (
    <Link
      href={`/agents/${address}`}
      className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full min-h-[22rem] gap-0 border-border/75 bg-[#0b192d] py-0 shadow-[3px_3px_0_#040c18] transition-[transform,border-color,box-shadow] group-hover:-translate-y-0.5 group-hover:border-primary/55 group-hover:shadow-[5px_5px_0_#040c18]">
        <CardContent className="flex h-full flex-col px-5 py-5">
          <div className="flex min-h-14 items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-foreground">
                {name}
              </h3>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {shortAddress(address, 10, 4)}
              </p>
            </div>
            <StatusBadge
              kind="agent"
              status={isActive ? "active" : "inactive"}
            />
          </div>

          <p className="mt-4 line-clamp-2 min-h-11 text-sm leading-6 text-muted-foreground">
            {description || "No description provided."}
          </p>

          <div className="mt-4 flex min-h-14 flex-wrap content-start gap-1.5">
            {skills.slice(0, 4).map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className="border-[#416789]/70 bg-[#10243c] text-[#b8d0e6]"
              >
                {skill}
              </Badge>
            ))}
            {skills.length > 4 && (
              <Badge variant="ghost" className="text-muted-foreground">
                +{skills.length - 4}
              </Badge>
            )}
          </div>

          <div className="mt-auto">
            {verifiedCount > 0 && (
              <div className="mb-4 flex min-h-14 items-center justify-between gap-3 border-y border-border/55 py-3">
                <span className="flex items-center gap-2 text-xs font-semibold text-[#9cd4cc]">
                  <BadgeCheck className="size-4" aria-hidden="true" />
                  Verified work
                </span>
                <span className="text-right font-mono text-[11px] text-muted-foreground">
                  {verifiedCount} receipts /{" "}
                  {formatPercentBps(
                    verificationStats?.passRate ?? BigInt(0),
                  )}{" "}
                  pass
                </span>
              </div>
            )}

            <div className="grid grid-cols-[1fr_auto] items-end gap-4 border-t border-border/55 pt-4">
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Star className="size-3.5 text-[#d4ad6f]" aria-hidden="true" />
                  {rating.toFixed(1)} ({Number(ratingCount)})
                </span>
                <span className="flex items-center gap-1.5">
                  <BriefcaseBusiness className="size-3.5" aria-hidden="true" />
                  {Number(completedTasks)} tasks
                </span>
              </div>
              <span className="flex items-center gap-1 font-mono text-sm font-semibold text-primary">
                <CircleDollarSign className="size-4" aria-hidden="true" />
                {formatUSDC(ratePerTask)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
