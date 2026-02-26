import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring/60 focus:ring-offset-2 focus:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-[0_8px_22px_-14px_rgba(15,23,42,0.35)] hover:bg-primary/90",
        secondary:
          "border-border bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-[0_8px_20px_-14px_rgba(220,38,38,0.65)] hover:bg-destructive/90",
        outline: "border-border bg-transparent text-foreground",
        success: "border-emerald-500/35 bg-emerald-500/14 text-emerald-700",
        warning: "border-amber-500/35 bg-amber-500/14 text-amber-700",
        info: "border-sky-500/35 bg-sky-500/14 text-sky-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
