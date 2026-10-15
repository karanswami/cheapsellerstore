import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type AuthFieldProps = {
  id: string;
  label: string;
  icon: LucideIcon;
  children: React.ReactNode;
  hint?: string;
  className?: string;
};

export function AuthField({
  id,
  label,
  icon: Icon,
  children,
  hint,
  className,
}: AuthFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        {children}
      </div>
      {hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export const authInputClassName =
  "h-11 w-full rounded-xl border border-border/80 bg-background/70 py-2 pr-3 pl-10 text-sm outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/70 supports-backdrop-filter:backdrop-blur-sm focus:border-primary focus:bg-background/90 focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_22%,transparent)]";
