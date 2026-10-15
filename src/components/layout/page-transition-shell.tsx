import { cn } from "@/lib/utils";

/**
 * Plain layout wrapper. Route changes used to be intercepted with the View
 * Transitions API plus an enter animation, which delayed every navigation.
 */
export function PageTransitionShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
