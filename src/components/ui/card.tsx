import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]",
        className,
      )}
      {...props}
    />
  );
}
const CardHeader = ({ className, ...p }: React.ComponentProps<"div">) => (
  <div className={cn("flex flex-col gap-1 p-5 pb-3", className)} {...p} />
);
const CardTitle = ({ className, ...p }: React.ComponentProps<"h3">) => (
  <h3 className={cn("font-display text-base font-semibold tracking-tight", className)} {...p} />
);
const CardDescription = ({ className, ...p }: React.ComponentProps<"p">) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...p} />
);
const CardContent = ({ className, ...p }: React.ComponentProps<"div">) => (
  <div className={cn("p-5 pt-2", className)} {...p} />
);
const CardFooter = ({ className, ...p }: React.ComponentProps<"div">) => (
  <div className={cn("flex items-center p-5 pt-0", className)} {...p} />
);

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
