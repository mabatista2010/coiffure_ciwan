"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type AdminSidePanelWidth = "sm" | "md" | "lg" | "xl" | "full";

interface AdminSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  width?: AdminSidePanelWidth;
  bodyClassName?: string;
  overlayClassName?: string;
  contentClassName?: string;
  scrollBody?: boolean;
}

const WIDTH_CLASS: Record<AdminSidePanelWidth, string> = {
  sm: "w-[min(96vw,30rem)]",
  md: "w-[min(96vw,36rem)]",
  lg: "w-[min(96vw,42rem)]",
  xl: "w-[min(100vw,58rem)]",
  full: "w-[100vw]",
};

function AdminSidePanel({
  open,
  onOpenChange,
  title,
  description,
  children,
  headerActions,
  footer,
  width = "lg",
  bodyClassName,
  overlayClassName,
  contentClassName,
  scrollBody = true,
}: AdminSidePanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[230] bg-black/30 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
            overlayClassName
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "admin-scope fixed inset-y-0 right-0 z-[240] h-[100dvh] border-l border-border bg-background text-foreground shadow-2xl duration-300 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-right-full",
            WIDTH_CLASS[width],
            contentClassName
          )}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>

          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                {headerActions}
                <DialogPrimitive.Close asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl border border-border"
                    aria-label="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DialogPrimitive.Close>
              </div>
            </div>

            {scrollBody ? (
              <ScrollArea className={cn("min-h-0 flex-1 px-5 py-4", bodyClassName)}>{children}</ScrollArea>
            ) : (
              <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", bodyClassName)}>{children}</div>
            )}

            {footer ? <div className="border-t border-border px-5 py-3">{footer}</div> : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

export { AdminSidePanel };
