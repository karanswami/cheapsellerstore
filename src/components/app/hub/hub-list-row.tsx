import rowStyles from "@/components/app/hub/hub-list-row.module.css";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export function HubListStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(rowStyles.stack, className)}>{children}</div>
  );
}

type HubListRowProps = ComponentPropsWithoutRef<"article"> & {
  interactive?: boolean;
  selected?: boolean;
  stripe?: boolean;
  innerClassName?: string;
};

export function HubListRow({
  children,
  className,
  interactive = false,
  selected = false,
  stripe = true,
  innerClassName,
  ...props
}: HubListRowProps) {
  return (
    <article
      data-interactive={interactive ? "" : undefined}
      className={cn(
        rowStyles.row,
        interactive && rowStyles.rowInteractive,
        interactive && "pressable",
        selected && rowStyles.rowSelected,
        className,
      )}
      {...props}
    >
      {stripe ? <div className={rowStyles.stripe} aria-hidden /> : null}
      <div className={cn(rowStyles.inner, innerClassName)}>{children}</div>
    </article>
  );
}

export function HubPanelCard({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div className={cn(rowStyles.card, className)}>
      <div className={cn(rowStyles.cardInner, innerClassName)}>{children}</div>
    </div>
  );
}

export function HubEmptyPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(rowStyles.empty, className)}>{children}</div>
  );
}

export { rowStyles as hubListRowStyles };
