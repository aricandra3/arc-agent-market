import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Gavel, KeyRound, ShieldPlus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Protocol admin",
  description:
    "Owner-only controls: ownership handover, the verifier registry, and dispute resolution.",
  robots: { index: false, follow: false },
};

const surfaces = [
  {
    href: "/admin/disputes",
    icon: Gavel,
    title: "Dispute resolution",
    description:
      "Split the escrow of a contested task. A disputed task has no other exit, so this is the only way its funds move.",
  },
  {
    href: "/admin/verifiers",
    icon: ShieldPlus,
    title: "Verifier registry",
    description:
      "Register and deactivate the verifiers allowed to pass or fail work receipts. Until one exists, receipts stay pending forever.",
  },
  {
    href: "/admin/ownership",
    icon: KeyRound,
    title: "Ownership handover",
    description:
      "Accept a pending Ownable2Step transfer. Arc's explorer cannot write to contracts, so this is the only route.",
  },
];

/**
 * Index for the owner-only surfaces.
 *
 * Each page already gates itself on `owner()`, but until this existed they were
 * reachable only by typing the URL — built, and effectively hidden.
 */
export default function AdminIndexPage() {
  return (
    <div className="app-container max-w-4xl py-16 sm:py-24">
      <PageHeader
        title="Protocol admin"
        accent="teal"
        breadcrumb={[{ label: "Admin" }]}
        description="Controls restricted to the contract owner. Every page here reads the on-chain owner and stays read-only for anyone else."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {surfaces.map((surface) => (
          <Link
            key={surface.href}
            href={surface.href}
            className="brutal-surface group flex flex-col p-5 transition-colors hover:border-[var(--accent-cyan)]/50"
          >
            <surface.icon className="size-5 text-primary" aria-hidden="true" />
            <p className="font-display mt-4 text-lg font-semibold text-foreground">
              {surface.title}
            </p>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
              {surface.description}
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              Open
              <ArrowRight
                className="size-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
