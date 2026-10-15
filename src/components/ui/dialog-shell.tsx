"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type DialogShellSize = "sm" | "md" | "lg" | "xl";

const sizeMax: Record<DialogShellSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
};

/**
 * Polished dialog chrome: muted header band, scroll body, sticky footer.
 * Use for create/edit/detail flows — same actions, better hierarchy.
 */
export function DialogShell({
  open,
  onOpenChange,
  icon,
  title,
  description,
  children,
  footer,
  size = "md",
  maxHeightClass = "max-h-[min(92dvh,640px)]",
  showCloseButton = true,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: DialogShellSize;
  maxHeightClass?: string;
  showCloseButton?: boolean;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={showCloseButton}
        className={cn(
          "flex w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0",
          maxHeightClass,
          sizeMax[size],
          className,
        )}
      >
        <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
          <DialogHeader className="gap-1.5 pr-8 text-left">
            {icon ? (
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                {icon}
              </div>
            ) : null}
            <DialogTitle className="text-lg">{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          {children}
        </div>
        {footer ? (
          <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 rounded-none border-t border-border/40 bg-muted/20 px-4 py-3 sm:justify-end sm:px-5">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
