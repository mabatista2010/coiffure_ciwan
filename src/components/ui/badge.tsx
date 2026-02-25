import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring/60 focus:ring-offset-2 focus:ring-offset-black",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-[0_8px_22px_-14px_rgba(212,160,23,0.95)] hover:bg-primary/90",
        secondary:
          "border-white/10 bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-[0_8px_20px_-14px_rgba(224,85,63,0.95)] hover:bg-destructive/90",
        outline: "border-primary/50 text-primary",
        success: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
        warning: "border-amber-400/25 bg-amber-400/15 text-amber-300",
        info: "border-sky-400/25 bg-sky-400/15 text-sky-300",
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
