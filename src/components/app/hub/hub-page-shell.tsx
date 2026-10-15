import styles from "@/components/app/hub/hub-page-shell.module.css";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type HubPageShellProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  wide?: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "none";
};

const MAX_WIDTH: Record<NonNullable<HubPageShellProps["maxWidth"]>, string> = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-3xl",
  xl: "max-w-4xl",
  "2xl": "max-w-5xl",
  "3xl": "max-w-6xl",
  "4xl": "max-w-7xl",
  none: "",
};

export function HubPageShell({
  children,
  className,
  contentClassName,
  wide = false,
  maxWidth = "none",
}: HubPageShellProps) {
  return (
    <main
      className={cn(
        styles.shell,
        "flex-1 px-4 py-6",
        MAX_WIDTH[maxWidth],
        maxWidth !== "none" && "mx-auto w-full",
        className,
      )}
    >
      <div className={styles.ambient} aria-hidden />
      <div
        className={cn(
          styles.content,
          wide && styles.contentWide,
          contentClassName,
        )}
      >
        {children}
      </div>
    </main>
  );
}
