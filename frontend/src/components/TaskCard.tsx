"use client";

import Link from "next/link";
import { ArrowRight, CircleDollarSign, Clock3, UserRound } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatDate,
  formatUSDC,
  shortAddress,
} from "@/lib/contracts";

interface TaskCardProps {
  id: number;
  requester: string;
  provider: string;
  budget: bigint;
  description: string;
  status: number;
  createdAt: bigint;
  deadline: bigint;
}

export default function TaskCard({
  id,
  requester,
  provider,
  budget,
  description,
  status,
  deadline,
}: TaskCardProps) {
  return (
    <Link
      href={`/tasks/${id}`}
      className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full min-h-64 gap-0 border-border/75 bg-[#0b192d] py-0 shadow-[3px_3px_0_#040c18] transition-[transform,border-color,box-shadow] group-hover:-translate-y-0.5 group-hover:border-primary/55 group-hover:shadow-[5px_5px_0_#040c18]">
        <CardContent className="flex h-full flex-col px-5 py-5">
          <div className="flex min-h-10 items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase text-[#9fc1df]">
                Task record
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">
                Task #{id}
              </h3>
            </div>
            <StatusBadge kind="task" status={status} />
          </div>

          <p className="mt-4 line-clamp-2 min-h-11 text-sm leading-6 text-muted-foreground">
            {description}
          </p>

          <div className="mt-5 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
            <span className="flex items-center gap-2">
              <UserRound className="size-3.5" aria-hidden="true" />
              {shortAddress(requester)}
              <ArrowRight className="size-3" aria-hidden="true" />
              {shortAddress(provider)}
            </span>
            <span className="flex items-center gap-2 sm:justify-end">
              <Clock3 className="size-3.5" aria-hidden="true" />
              Due {formatDate(deadline)}
            </span>
          </div>

          <div className="mt-auto flex items-end justify-between gap-4 border-t border-border/55 pt-4">
            <span className="text-xs text-muted-foreground">Escrow budget</span>
            <span className="flex items-center gap-1 font-mono text-sm font-semibold text-primary">
              <CircleDollarSign className="size-4" aria-hidden="true" />
              {formatUSDC(budget)} USDC
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
