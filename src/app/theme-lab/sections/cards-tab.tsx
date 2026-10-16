import { Flame, Gamepad2, Swords, Trophy, TrendingUp, Wallet, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Section } from "./section";

const ITEMS = [
  { title: "Drip Client Root", cat: "Mobile mods", price: "$4.99", old: "$6.99", icon: Swords, hue: "from-primary/40" },
  { title: "Wire Android + iOS", cat: "Mobile mods", price: "$7.50", old: null, icon: Zap, hue: "from-highlight/40" },
  { title: "Steam Wallet $20", cat: "Gift cards", price: "$19.20", old: null, icon: Gamepad2, hue: "from-success/40" },
];

function Art({ icon: Icon, hue }: { icon: typeof Swords; hue: string }) {
  return (
    <div className={`relative grid h-full w-full place-items-center overflow-hidden bg-gradient-to-br ${hue} to-card`}>
      <div className="grid-bg absolute inset-0 opacity-40" />
      <Icon className="relative size-12 text-foreground/80" />
    </div>
  );
}

export function CardsTab() {
  return (
    <>
      <Section title="A · Poster card" note="Image-led, glow on hover. Best when we have good artwork.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((p) => (
            <Card key={p.title} className="group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:glow-primary">
              <div className="relative aspect-[4/3]">
                <Art icon={p.icon} hue={p.hue} />
                <div className="absolute left-3 top-3 flex gap-1.5">
                  <Badge variant="solid"><Flame /> Best seller</Badge>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-card to-transparent" />
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <p className="text-xs text-muted-foreground">{p.cat}</p>
                  <h3 className="font-display text-base font-semibold">{p.title}</h3>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">From</p>
                    <p className="font-display text-2xl font-bold leading-none">
                      {p.price} {p.old ? <span className="ml-1 text-xs font-normal text-muted-foreground line-through">{p.old}</span> : null}
                    </p>
                  </div>
                  <Button size="sm">Buy</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="B · Cut-corner card" note="Angular gaming silhouette with a price plate.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((p) => (
            <div key={p.title} className="cut-corner bg-border p-px transition-colors hover:bg-primary">
              <div className="cut-corner flex h-full flex-col bg-card">
                <div className="relative aspect-[16/10]"><Art icon={p.icon} hue={p.hue} /></div>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-semibold leading-tight">{p.title}</h3>
                    <Badge variant="highlight">{p.cat}</Badge>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="bg-brand-gradient rounded-sm px-3 py-1 font-display text-lg font-bold text-primary-foreground [clip-path:polygon(8px_0,100%_0,calc(100%-8px)_100%,0_100%)] px-4">{p.price}</span>
                    <Button size="sm" variant="outline">Details</Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="C · Compact row" note="Dense list for long catalogs and mobile.">
        <div className="divide-y overflow-hidden rounded-2xl border bg-card">
          {ITEMS.map((p) => (
            <div key={p.title} className="flex items-center gap-4 p-3 transition-colors hover:bg-accent/60">
              <div className="size-16 shrink-0 overflow-hidden rounded-lg"><Art icon={p.icon} hue={p.hue} /></div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display font-semibold">{p.title}</h3>
                <div className="mt-1 flex gap-1.5"><Badge variant="muted">{p.cat}</Badge><Badge variant="success">In stock</Badge></div>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold">{p.price}</p>
                <Button size="sm" variant="secondary" className="mt-1">Buy</Button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Stat &amp; info cards">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Wallet balance", value: "$24.50", icon: Wallet, delta: "+ $5.00 today" },
            { label: "Orders", value: "128", icon: Trophy, delta: "3 this week" },
            { label: "Spent", value: "$412.80", icon: TrendingUp, delta: "Top 5% buyer" },
          ].map((s) => (
            <Card key={s.label} className="relative overflow-hidden p-5">
              <div className="absolute -right-6 -top-6 size-24 rounded-full bg-primary/15 blur-2xl" />
              <s.icon className="mb-3 size-5 text-highlight" />
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="font-display text-3xl font-bold">{s.value}</p>
              <p className="mt-1 text-xs text-success">{s.delta}</p>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
