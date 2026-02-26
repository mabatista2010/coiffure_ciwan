import type { ComponentProps } from "react";
import { CalendarDays } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const FALLBACK_LABEL = "Sélectionner une date";

function formatDisplayDate(value: string): string {
  const parsedDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

function AdminDateInput({
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "type">) {
  const valueFromProps =
    typeof props.value === "string"
      ? props.value
      : typeof props.defaultValue === "string"
        ? props.defaultValue
        : "";
  const hasValue = valueFromProps.length > 0;
  const displayLabel = hasValue ? formatDisplayDate(valueFromProps) : FALLBACK_LABEL;

  return (
    <div className={cn("group relative w-full", className)}>
      <Input
        type="date"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        {...props}
      />
      <div
        aria-hidden="true"
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-[border-color,box-shadow,background-color]",
          "group-focus-within:border-primary group-focus-within:ring-2 group-focus-within:ring-ring/30",
          props.disabled && "opacity-50"
        )}
      >
        <span
          className={cn(
            "min-w-0 truncate",
            hasValue ? "text-foreground" : "text-muted-foreground/80"
          )}
        >
          {displayLabel}
        </span>
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground/85" />
      </div>
    </div>
  );
}

export { AdminDateInput };
