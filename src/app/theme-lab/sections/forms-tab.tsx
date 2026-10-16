"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Section } from "./section";

export function FormsTab() {
  return (
    <>
      <Section title="Inputs">
        <div className="grid gap-4 rounded-2xl border bg-card p-6 md:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">Email<Input type="email" placeholder="you@example.com" /></label>
          <label className="space-y-1.5 text-sm font-medium">Promo code<Input placeholder="GAMER10" /></label>
          <label className="space-y-1.5 text-sm font-medium">Invalid<Input aria-invalid defaultValue="not-an-email" /><span className="text-xs text-destructive">Enter a valid email.</span></label>
          <label className="space-y-1.5 text-sm font-medium">Disabled<Input disabled placeholder="Disabled" /></label>
        </div>
      </Section>
      <Section title="Switches">
        <div className="flex flex-wrap gap-8 rounded-2xl border bg-card p-6">
          <label className="flex items-center gap-3 text-sm"><Switch defaultChecked /> Email receipts</label>
          <label className="flex items-center gap-3 text-sm"><Switch /> Push notifications</label>
        </div>
      </Section>
      <Section title="Dialog">
        <div className="rounded-2xl border bg-card p-6">
          <Dialog>
            <DialogTrigger asChild><Button>Open checkout dialog</Button></DialogTrigger>
            <DialogContent>
              <div>
                <DialogTitle>Confirm purchase</DialogTitle>
                <DialogDescription>Drip Client Root · 30 days</DialogDescription>
              </div>
              <div className="flex items-center justify-between rounded-xl border bg-muted p-4">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-gradient font-display text-2xl font-bold">$4.99</span>
              </div>
              <div className="flex gap-2">
                <DialogClose asChild><Button variant="secondary" className="flex-1">Cancel</Button></DialogClose>
                <Button className="flex-1">Pay from wallet</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Section>
    </>
  );
}
