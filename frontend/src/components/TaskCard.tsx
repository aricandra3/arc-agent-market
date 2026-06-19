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
      <Card
        data-market-card
        onPointerMove={(event) => {
          const target = event.currentTarget;
          const rect = target.getBoundingClientRect();
          target.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
          target.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
          target.style.setProperty("--spot-o", "1");
        }}
        onPointerLeave={(event) => {
          event.currentTarget.style.setProperty("--spot-o", "0");
        }}
        className="h-full min-h-64 gap-0 border-primary/20 bg-gradient-to-b from-[#18365a]/35 to-[#0b192d]/85 py-0 shadow-[3px_3px_0_#040c18] backdrop-blur-md transition-[transform,border-color,box-shadow] duration-200 ease-out group-hover:-translate-x-px group-hover:-translate-y-1 group-hover:border-[#7bb0ec]/45 group-hover:shadow-[6px_6px_0_#040c18,0_26px_60px_-30px_rgba(123,176,236,0.6)]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 opacity-[var(--spot-o,0)] transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(16rem 16rem at var(--spot-x,50%) var(--spot-y,50%), color-mix(in srgb, var(--accent-azure) 18%, transparent), transparent 60%)",
          }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 z-[2] h-1.5 bg-[var(--accent-azure)]"
        />
        <CardContent className="relative z-[1] flex h-full flex-col px-5 py-5">
          <div className="flex min-h-10 items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase text-[#8fb6ec]">
                Task record
              </p>
              <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
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

          <div className="mt-auto flex items-center justify-between gap-4 border-t border-border/55 pt-4">
            <span className="text-xs text-muted-foreground">Escrow budget</span>
            <span className="inline-flex items-center gap-1 rounded-[0.6rem] border-[1.5px] border-[#04101f] bg-[var(--accent-gold)] px-2.5 py-1 font-display text-sm text-[#071426] shadow-[2px_2px_0_#040c18]">
              <CircleDollarSign className="size-3.5" aria-hidden="true" />
              {formatUSDC(budget)} USDC
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
