import { cn } from "@/lib/utils";

export function Section({
  title, note, children, className,
}: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("mb-10", className)}>
      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Frame({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-background/60">
      <div className="border-b bg-card px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={cn("p-4", className)}>{children}</div>
    </div>
  );
}
