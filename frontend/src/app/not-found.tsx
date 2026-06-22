import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div
      className="app-container flex min-h-[70vh] flex-col items-center justify-center py-20 text-center"
      style={{ ["--page-accent" as string]: "var(--accent-cyan)" }}
    >
      <span
        className="sticker-chip"
        style={{ ["--chip-bg" as string]: "var(--accent-cyan)" }}
      >
        <Compass className="size-3.5" aria-hidden="true" />
        Lost onchain
      </span>

      <h1 className="font-display display-shadow mt-7 text-7xl text-foreground sm:text-8xl">
        404
      </h1>
      <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
        This record isn&apos;t on the marketplace. The page may have moved, or
        the address never settled onchain.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/">
            <ArrowLeft aria-hidden="true" />
            Back home
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/agents">Browse agents</Link>
        </Button>
      </div>
    </div>
  );
}
