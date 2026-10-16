import { ArrowRight, Heart, Loader2, ShoppingBag, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "./section";

const VARIANTS = ["default", "highlight", "secondary", "outline", "ghost", "glass", "destructive", "link"] as const;

export function ButtonsTab() {
  return (
    <>
      <Section title="Variants">
        <div className="flex flex-wrap gap-3 rounded-2xl border bg-card p-6">
          {VARIANTS.map((v) => (
            <Button key={v} variant={v}>{v}</Button>
          ))}
        </div>
      </Section>
      <Section title="Sizes &amp; icons">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-6">
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg"><ShoppingBag /> Buy now</Button>
          <Button size="lg" variant="highlight">Instant <Zap /></Button>
          <Button size="icon" variant="secondary" aria-label="Wishlist"><Heart /></Button>
          <Button variant="outline">Continue <ArrowRight /></Button>
        </div>
      </Section>
      <Section title="States">
        <div className="flex flex-wrap gap-3 rounded-2xl border bg-card p-6">
          <Button disabled>Disabled</Button>
          <Button><Loader2 className="animate-spin" /> Processing</Button>
          <Button variant="secondary" disabled>Sold out</Button>
        </div>
      </Section>
    </>
  );
}
