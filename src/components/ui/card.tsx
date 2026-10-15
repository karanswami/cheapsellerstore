import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl text-sm text-card-foreground transition-[box-shadow,background-color,border-color] duration-150 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
  {
    variants: {
      variant: {
        default: "bg-card py-(--card-spacing) ring-1 ring-foreground/10",
        hero: "bg-[image:var(--gradient-card)] py-5 ring-1 ring-foreground/10 sm:py-6",
        stat: "bg-card py-3.5 ring-1 ring-foreground/8",
        compact: "bg-card py-(--card-spacing) ring-1 ring-foreground/8 data-[size=default]:[--card-spacing:--spacing(3)]",
        action:
          "bg-primary/8 py-(--card-spacing) ring-1 ring-primary/25 shadow-[var(--glow-soft)]",
        list: "gap-0 bg-card py-0 ring-1 ring-foreground/10",
        info: "bg-muted/40 py-(--card-spacing) ring-1 ring-foreground/5",
        success:
          "border-l-2 border-l-success bg-success/8 py-(--card-spacing) ring-1 ring-success/20",
        warning:
          "border-l-2 border-l-warning bg-warning/8 py-(--card-spacing) ring-1 ring-warning/20",
        danger:
          "border-l-2 border-l-destructive bg-destructive/8 py-(--card-spacing) ring-1 ring-destructive/20",
        glass:
          "bg-card/70 py-(--card-spacing) ring-1 ring-foreground/10 backdrop-blur-md",
        feature:
          "bg-[image:var(--gradient-card)] py-(--card-spacing) ring-1 ring-primary/30 shadow-[var(--glow-soft)]",
        summary:
          "bg-card py-(--card-spacing) ring-1 ring-foreground/10 has-data-[slot=card-footer]:[&_[data-slot=card-footer]]:bg-muted/60",
      },
      size: {
        default: "",
        sm: "data-[size=sm]:[--card-spacing:--spacing(3)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Card({
  className,
  size = "default",
  variant = "default",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      className={cn(cardVariants({ variant, size }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t border-border/40 bg-muted/50 p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
}
