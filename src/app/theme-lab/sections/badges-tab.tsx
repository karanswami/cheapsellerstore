"use client";

import { useState } from "react";
import { Crown, Flame, Package, ShieldCheck, Sparkles, Star, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Section } from "./section";

const CATEGORIES = ["All", "Mobile games", "PC keys", "Gift cards", "Subscriptions", "Top-ups"];

export function BadgesTab() {
  const [active, setActive] = useState("All");
  const [chips, setChips] = useState(["Instant", "Under $5"]);

  return (
    <>
      <Section title="Product badges">
        <div className="flex flex-wrap gap-2 rounded-2xl border bg-card p-6">
          <Badge variant="solid"><Flame /> Best seller</Badge>
          <Badge variant="highlight"><Sparkles /> New</Badge>
          <Badge variant="default"><Crown /> Pinned</Badge>
          <Badge variant="warning"><Zap /> -25% flash</Badge>
          <Badge variant="muted">Maintenance</Badge>
          <Badge variant="outline"><Star /> 4.9</Badge>
        </div>
      </Section>
      <Section title="Status">
        <div className="flex flex-wrap gap-2 rounded-2xl border bg-card p-6">
          <Badge variant="success" shape="pill"><span className="size-1.5 rounded-full bg-success" /> In stock</Badge>
          <Badge variant="warning" shape="pill"><span className="size-1.5 rounded-full bg-warning" /> Low stock · 3</Badge>
          <Badge variant="destructive" shape="pill"><span className="size-1.5 rounded-full bg-destructive" /> Sold out</Badge>
          <Badge variant="highlight" shape="pill"><Package /> Delivered</Badge>
          <Badge variant="default" shape="pill"><ShieldCheck /> Verified seller</Badge>
          <Badge variant="muted" shape="pill">Pending</Badge>
        </div>
      </Section>
      <Section title="Category chips" note="Click to select.">
        <div className="flex flex-wrap gap-2 rounded-2xl border bg-card p-6">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={cn(
                "h-9 rounded-full border px-4 text-sm font-medium transition-all hover:border-primary/50 hover:text-foreground",
                active === c
                  ? "border-transparent bg-brand-gradient text-primary-foreground glow-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Removable filter chips">
        <div className="flex flex-wrap gap-2 rounded-2xl border bg-card p-6">
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => setChips(chips.filter((x) => x !== c))}
              className="inline-flex h-8 items-center gap-2 rounded-full border border-primary/30 bg-primary/10 pl-3 pr-2 text-sm text-primary transition-colors hover:bg-primary/20"
            >
              {c} <span className="grid size-4 place-items-center rounded-full bg-primary/20 text-xs">×</span>
            </button>
          ))}
          {chips.length === 0 ? <span className="text-sm text-muted-foreground">All cleared — reload the tab to reset.</span> : null}
        </div>
      </Section>
    </>
  );
}
