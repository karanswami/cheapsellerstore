"use client";

import {
  CheckIcon,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { cn } from "@/lib/utils";

function ToastIcon({
  children,
  className,
  glow,
}: {
  children: React.ReactNode;
  className: string;
  glow: string;
}) {
  return (
    <span
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-xl",
        "ring-1 ring-white/10",
        className,
      )}
      style={{ boxShadow: glow }}
    >
      {children}
    </span>
  );
}

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-center"
      offset={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
      mobileOffset={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
      gap={10}
      visibleToasts={3}
      expand={false}
      duration={2400}
      closeButton={false}
      icons={{
        success: (
          <ToastIcon
            className="bg-success/20 text-success"
            glow="0 0 16px -2px color-mix(in oklab, var(--success) 55%, transparent)"
          >
            <CheckIcon className="size-4" strokeWidth={3} />
          </ToastIcon>
        ),
        info: (
          <ToastIcon
            className="bg-primary/20 text-primary"
            glow="0 0 16px -2px color-mix(in oklab, var(--primary) 55%, transparent)"
          >
            <InfoIcon className="size-4" strokeWidth={2.75} />
          </ToastIcon>
        ),
        warning: (
          <ToastIcon
            className="bg-warning/20 text-warning"
            glow="0 0 16px -2px color-mix(in oklab, var(--warning) 50%, transparent)"
          >
            <TriangleAlertIcon className="size-4" strokeWidth={2.75} />
          </ToastIcon>
        ),
        error: (
          <ToastIcon
            className="bg-destructive/20 text-destructive"
            glow="0 0 16px -2px color-mix(in oklab, var(--destructive) 55%, transparent)"
          >
            <XIcon className="size-4" strokeWidth={3} />
          </ToastIcon>
        ),
        loading: (
          <ToastIcon
            className="bg-white/10 text-foreground"
            glow="0 0 12px -2px color-mix(in oklab, white 25%, transparent)"
          >
            <Loader2Icon className="size-4 animate-spin" strokeWidth={2.75} />
          </ToastIcon>
        ),
      }}
      style={
        {
          "--normal-bg":
            "color-mix(in oklab, #141018 78%, transparent)",
          "--normal-text": "#f5f5f7",
          "--normal-border":
            "color-mix(in oklab, var(--primary) 28%, transparent)",
          "--border-radius": "1rem",
          "--toast-duration": "2400ms",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: cn(
            "cn-toast group/toast",
            "!border !border-[var(--normal-border)] !bg-[var(--normal-bg)] !text-[var(--normal-text)]",
            "backdrop-blur-2xl backdrop-saturate-150",
            "shadow-[0_10px_36px_-8px_rgba(0,0,0,0.55),0_0_24px_-6px_color-mix(in_oklab,var(--primary)_35%,transparent)]",
          ),
          title:
            "text-[13px] font-semibold leading-snug tracking-[-0.01em] text-[#f5f5f7]",
          description:
            "text-[11.5px] leading-snug !text-white/55 line-clamp-2",
          content: "gap-0.5 min-w-0 pt-0.5",
          icon: "!me-0 !ms-0",
          actionButton: cn(
            "!h-7 !rounded-lg !px-2.5 !text-[11px] !font-semibold",
            "!bg-primary/20 !text-primary",
            "transition-colors hover:!bg-primary/30",
          ),
          cancelButton: cn(
            "!h-7 !rounded-lg !px-2.5 !text-[11px] !font-medium",
            "!bg-transparent !text-white/60",
            "transition-colors hover:!text-white",
          ),
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
