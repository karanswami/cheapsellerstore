import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-4 tracking-wide [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-primary/15 text-primary",
        highlight: "border-highlight/30 bg-highlight/15 text-highlight",
        success: "border-success/30 bg-success/15 text-success",
        warning: "border-warning/30 bg-warning/15 text-warning",
        destructive: "border-destructive/30 bg-destructive/15 text-destructive",
        muted: "border-border bg-muted text-muted-foreground",
        outline: "border-border text-foreground",
        solid: "border-transparent bg-brand-gradient text-primary-foreground",
      },
      shape: { rect: "", pill: "rounded-full px-2.5" },
    },
    defaultVariants: { variant: "default", shape: "rect" },
  },
);

function Badge({
  className,
  variant,
  shape,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, shape }), className)} {...props} />;
}

export { Badge, badgeVariants };
