"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-[0.85rem] !border-[1.5px] !backdrop-blur-md !shadow-[3px_3px_0_#040c18]",
          title: "font-semibold tracking-tight",
          description: "!text-muted-foreground",
        },
      }}
      style={
        {
          "--normal-bg": "color-mix(in srgb, var(--popover) 90%, transparent)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "color-mix(in srgb, var(--primary) 28%, transparent)",
          "--border-radius": "0.85rem",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
