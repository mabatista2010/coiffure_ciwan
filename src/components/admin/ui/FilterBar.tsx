import * as React from "react";

import { cn } from "@/lib/utils";

interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  actions?: React.ReactNode;
}

function FilterBar({ className, children, actions, ...props }: FilterBarProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-black/35 p-4 shadow-[0_18px_45px_-34px_rgba(0,0,0,0.9)]",
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {children}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { FilterBar };
