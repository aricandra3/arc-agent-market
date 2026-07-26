import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-[var(--radius)] border border-input bg-[var(--surface-deep)]/80 px-3 py-2 text-base shadow-[inset_2px_2px_0_rgba(4,12,24,0.45)] transition-[color,box-shadow,border-color] outline-none placeholder:text-muted-foreground focus-visible:border-[var(--accent-cyan)]/70 focus-visible:ring-[3px] focus-visible:ring-[var(--accent-cyan)]/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
