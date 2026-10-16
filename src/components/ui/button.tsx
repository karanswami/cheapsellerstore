import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-brand-gradient text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] hover:brightness-110 hover:glow-primary",
        highlight:
          "bg-highlight text-highlight-foreground hover:brightness-110 hover:glow-highlight",
        secondary:
          "bg-muted text-foreground border border-border hover:bg-accent hover:border-primary/40",
        outline:
          "border border-primary/50 text-primary hover:bg-primary/10 hover:border-primary",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        glass:
          "bg-white/5 text-foreground border border-white/10 backdrop-blur-md hover:bg-white/10",
        destructive:
          "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive hover:text-white",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
