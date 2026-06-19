import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-[0.7rem] text-sm font-semibold whitespace-nowrap transition-[transform,background-color,color,border-color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#040c18] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "sheen border border-primary bg-gradient-to-b from-[#dceafa] to-primary text-primary-foreground shadow-[3px_3px_0_#040c18] hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#040c18] hover:brightness-105",
        destructive:
          "border border-destructive bg-destructive text-white shadow-[3px_3px_0_#040c18] hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#040c18] hover:bg-destructive/90 focus-visible:ring-destructive/20",
        outline:
          "border border-border bg-background/60 text-foreground shadow-[3px_3px_0_#040c18] backdrop-blur-sm hover:-translate-x-px hover:-translate-y-px hover:border-[#7fe3d4]/60 hover:shadow-[5px_5px_0_#040c18] hover:bg-accent hover:text-accent-foreground",
        secondary:
          "sheen border border-border bg-secondary text-secondary-foreground shadow-[3px_3px_0_#040c18] hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#040c18] hover:bg-[#24496b]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        xs: "h-7 gap-1 px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 px-6 has-[>svg]:px-4",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
