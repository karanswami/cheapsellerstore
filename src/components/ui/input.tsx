import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border bg-input px-3 text-sm outline-none transition-all placeholder:text-muted-foreground/70 hover:border-primary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/25",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
