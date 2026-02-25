import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-xl border border-white/15 bg-black/35 px-4 py-2 text-base text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition-[border-color,box-shadow,background-color] placeholder:text-zinc-500 focus-visible:border-primary/70 focus-visible:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
