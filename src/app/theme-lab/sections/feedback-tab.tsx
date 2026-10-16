"use client";

import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Section } from "./section";

const ALERTS = [
  { tone: "success", icon: CheckCircle2, title: "Payment received", text: "$10.00 added to your wallet.", cls: "border-success/30 bg-success/10 text-success" },
  { tone: "info", icon: Info, title: "Heads up", text: "Delivery may take up to 5 minutes at peak hours.", cls: "border-highlight/30 bg-highlight/10 text-highlight" },
  { tone: "warning", icon: AlertTriangle, title: "Low stock", text: "Only 3 keys left for this duration.", cls: "border-warning/30 bg-warning/10 text-warning" },
  { tone: "error", icon: XCircle, title: "Payment failed", text: "Your bank declined the transaction.", cls: "border-destructive/30 bg-destructive/10 text-destructive" },
];

export function FeedbackTab() {
  return (
    <>
      <Section title="Toasts" note="Click to fire real toasts (bottom-right).">
        <div className="flex flex-wrap gap-3 rounded-2xl border bg-card p-6">
          <Button variant="secondary" onClick={() => toast.success("Order placed", { description: "Your key is ready in History." })}>Success</Button>
          <Button variant="secondary" onClick={() => toast.error("Payment failed", { description: "Please try another method." })}>Error</Button>
          <Button variant="secondary" onClick={() => toast.warning("Low stock", { description: "Only 3 left." })}>Warning</Button>
          <Button variant="secondary" onClick={() => toast.info("New drop", { description: "Fresh keys just landed." })}>Info</Button>
          <Button variant="secondary" onClick={() => toast.promise(new Promise((r) => setTimeout(r, 1800)), { loading: "Processing…", success: "Done!", error: "Failed" })}>Promise</Button>
        </div>
      </Section>
      <Section title="Inline alerts">
        <div className="grid gap-3 md:grid-cols-2">
          {ALERTS.map((a) => (
            <div key={a.tone} className={cn("flex gap-3 rounded-xl border p-4", a.cls)}>
              <a.icon className="mt-0.5 size-5 shrink-0" />
              <div><p className="font-semibold">{a.title}</p><p className="text-sm text-foreground/70">{a.text}</p></div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Loading &amp; empty">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl border bg-card p-5">
            <div className="h-28 animate-pulse rounded-xl bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid place-items-center rounded-2xl border border-dashed bg-card p-8 text-center">
            <Loader2 className="mb-3 size-6 text-muted-foreground" />
            <p className="font-display font-semibold">No orders yet</p>
            <p className="text-sm text-muted-foreground">Your purchases will show up here.</p>
          </div>
        </div>
      </Section>
    </>
  );
}
