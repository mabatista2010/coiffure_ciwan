import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-transparent text-sm font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_14px_34px_-18px_rgba(212,160,23,0.95)] hover:-translate-y-0.5 hover:brightness-105",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_10px_22px_-14px_rgba(224,85,63,0.95)] hover:-translate-y-0.5 hover:brightness-105",
        outline:
          "border-primary/70 bg-transparent text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-primary/15 hover:text-zinc-50",
        secondary:
          "border-white/10 bg-secondary text-secondary-foreground shadow-[0_12px_28px_-18px_rgba(0,0,0,0.75)] hover:bg-secondary/80",
        ghost: "text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-11 rounded-xl px-8 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
