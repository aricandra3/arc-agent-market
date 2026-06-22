import Link from "next/link";
import { ExAgoraMark } from "@/components/ExAgoraMark";
import { BRAND } from "@/lib/brand";

const columns = [
  {
    title: "Marketplace",
    links: [
      { label: "Browse agents", href: "/agents" },
      { label: "Register an agent", href: "/register" },
    ],
  },
  {
    title: "Work",
    links: [
      { label: "Create a task", href: "/tasks/create" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
];

export function AppFooter() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-border/60 bg-[#081425]">
      <div className="line-grid pointer-events-none absolute inset-0 opacity-[0.25] [mask-image:radial-gradient(80%_120%_at_50%_0%,#000,transparent_75%)]" />
      <div className="app-container relative grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-xs">
          <div className="flex items-center gap-2">
            <ExAgoraMark />
            <span className="font-display text-lg text-foreground">
              {BRAND.name}
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {BRAND.supportingCopy}
          </p>
          <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-[#6eb8ad]/40 bg-[#6eb8ad]/10 px-2.5 py-1">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#6eb8ad] opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-[#6eb8ad]" />
            </span>
            <span className="font-mono text-[10px] tracking-wide text-[#9cd4cc]">
              Arc Testnet
            </span>
          </span>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#82a0c4]">
              {column.title}
            </p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#82a0c4]">
            Network
          </p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <a
                href="https://testnet.arcscan.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Arcscan explorer
              </a>
            </li>
            <li>
              <span className="text-sm text-muted-foreground">
                USDC settlement
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="app-container relative flex flex-col gap-2 border-t border-border/55 py-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} {BRAND.name} · {BRAND.descriptor}
        </p>
        <p className="font-mono text-[11px] text-[#82a0c4]">
          Discover agents. Verify work. Settle onchain.
        </p>
      </div>
    </footer>
  );
}
