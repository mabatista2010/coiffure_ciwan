import * as React from "react";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AdminCardTone = "default" | "highlight";

interface AdminCardProps extends React.ComponentPropsWithoutRef<typeof Card> {
  tone?: AdminCardTone;
}

const toneClass: Record<AdminCardTone, string> = {
  default: "border-border/80 bg-card",
  highlight:
    "border-primary/30 bg-[linear-gradient(165deg,rgba(59,130,246,0.12),rgba(255,255,255,0.98)_65%)]",
};

const AdminCard = React.forwardRef<
  React.ElementRef<typeof Card>,
  AdminCardProps
>(({ className, tone = "default", ...props }, ref) => (
  <Card
    ref={ref}
    className={cn(
      "rounded-2xl text-card-foreground shadow-[0_24px_55px_-40px_rgba(15,23,42,0.28)]",
      toneClass[tone],
      className
    )}
    {...props}
  />
));

AdminCard.displayName = "AdminCard";

const AdminCardHeader = React.forwardRef<
  React.ElementRef<typeof CardHeader>,
  React.ComponentPropsWithoutRef<typeof CardHeader>
>(({ className, ...props }, ref) => (
  <CardHeader ref={ref} className={cn("gap-2 p-6", className)} {...props} />
));

AdminCardHeader.displayName = "AdminCardHeader";

const AdminCardContent = React.forwardRef<
  React.ElementRef<typeof CardContent>,
  React.ComponentPropsWithoutRef<typeof CardContent>
>(({ className, ...props }, ref) => (
  <CardContent ref={ref} className={cn("p-6 pt-2", className)} {...props} />
));

AdminCardContent.displayName = "AdminCardContent";

const AdminCardFooter = React.forwardRef<
  React.ElementRef<typeof CardFooter>,
  React.ComponentPropsWithoutRef<typeof CardFooter>
>(({ className, ...props }, ref) => (
  <CardFooter
    ref={ref}
    className={cn("border-t border-border p-6 pt-4", className)}
    {...props}
  />
));

AdminCardFooter.displayName = "AdminCardFooter";

export { AdminCard, AdminCardHeader, AdminCardContent, AdminCardFooter };
