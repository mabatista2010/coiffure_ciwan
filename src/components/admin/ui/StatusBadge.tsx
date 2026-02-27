import type { ComponentProps } from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  pending: { label: "En attente", variant: "warning" },
  confirmed: { label: "Confirmee", variant: "success" },
  needs_replan: { label: "A replanifier", variant: "info" },
  cancelled: { label: "Annulee", variant: "destructive" },
  completed: { label: "Terminee", variant: "info" },
  active: { label: "Actif", variant: "success" },
  inactive: { label: "Inactif", variant: "secondary" },
} as const;

type KnownStatus = keyof typeof STATUS_CONFIG;

interface StatusBadgeProps
  extends Omit<ComponentProps<typeof Badge>, "variant"> {
  status: KnownStatus | string;
  label?: string;
  variant?: BadgeProps["variant"];
}

function normalizeStatus(status: string): string {
  return status.toLowerCase().trim();
}

function StatusBadge({
  status,
  label,
  variant,
  className,
  ...props
}: StatusBadgeProps) {
  const key = normalizeStatus(status) as KnownStatus;
  const preset = STATUS_CONFIG[key];

  return (
    <Badge
      variant={variant ?? preset?.variant ?? "outline"}
      className={cn("px-3 py-1", className)}
      {...props}
    >
      {label ?? preset?.label ?? status}
    </Badge>
  );
}

export { StatusBadge };
