"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PALETTES, type PaletteId } from "../palettes";
import { Section } from "./section";

const TOKENS = [
  ["background", "bg-background"], ["card", "bg-card"], ["muted", "bg-muted"], ["accent", "bg-accent"],
  ["border", "bg-border"], ["primary", "bg-primary"], ["highlight", "bg-highlight"],
  ["success", "bg-success"], ["warning", "bg-warning"], ["destructive", "bg-destructive"],
];

export function PaletteTab({ palette, onChange }: { palette: PaletteId; onChange: (id: PaletteId) => void }) {
  return (
    <>
      <Section title="Color palettes" note="Click one — the whole page (and every tab) re-skins instantly. It is remembered on this device.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PALETTES.map((p) => {
            const active = p.id === palette;
            return (
              <button
                key={p.id}
                onClick={() => onChange(p.id)}
                className={cn(
                  "group rounded-2xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50",
                  active && "border-primary ring-2 ring-primary/30",
                )}
              >
                <div className="mb-4 flex h-20 overflow-hidden rounded-xl border">
                  <div className="flex-[3]" style={{ background: p.swatch[0] }} />
                  <div className="flex-[2]" style={{ background: p.swatch[1] }} />
                  <div className="flex-1" style={{ background: p.swatch[2] }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-display font-semibold">{p.name}</span>
                  {active ? <Badge variant="solid"><Check /> Active</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{p.note}</p>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Live tokens" note="Every color in the app comes from these. Components never use raw hex.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {TOKENS.map(([name, cls]) => (
            <div key={name} className="overflow-hidden rounded-xl border bg-card">
              <div className={cn("h-14", cls)} />
              <div className="px-3 py-2 text-xs font-medium">{name}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="In context">
        <Card className="overflow-hidden">
          <div className="bg-brand-gradient h-1.5" />
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Premium Account – 30 days</CardTitle>
              <Badge variant="highlight">Instant</Badge>
            </div>
            <CardDescription>Delivered to your inbox in under a minute.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-gradient font-display text-3xl font-bold">$4.99</span>
            <Button>Buy now</Button>
          </CardContent>
        </Card>
      </Section>
    </>
  );
}
