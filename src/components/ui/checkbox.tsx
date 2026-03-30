import * as React from "react";

import { cn } from "@/lib/utils";

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, checked, onCheckedChange, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      className={cn(
        "h-4 w-4 rounded border border-white/15 bg-black/30 text-[#C4A574] accent-[#C4A574] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A574]/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});

export { Checkbox };
