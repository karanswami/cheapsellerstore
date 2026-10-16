import {
  Gift, History, Home, LifeBuoy, LogOut, Package, Settings, Store, Trophy, Users, Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Frame, Section } from "./section";

const GROUPS = [
  { label: "Store", items: [{ n: "Home", i: Home, active: true }, { n: "Products", i: Store }, { n: "Orders", i: Package, b: "3" }] },
  { label: "Account", items: [{ n: "Wallet", i: Wallet }, { n: "History", i: History }, { n: "Gift codes", i: Gift }, { n: "Leaderboard", i: Trophy }] },
  { label: "More", items: [{ n: "Referrals", i: Users }, { n: "Support", i: LifeBuoy }, { n: "Settings", i: Settings }] },
];

export function SidebarTab() {
  return (
    <>
      <Section title="A · Full sidebar" note="Grouped labels, active glow bar, wallet card at the bottom.">
        <Frame label="Expanded · 260px" className="flex justify-center">
          <aside className="flex h-[560px] w-64 flex-col rounded-2xl border bg-card p-3">
            <div className="mb-4 px-2 pt-1 font-display text-lg font-bold">Cheap<span className="text-gradient">Seller</span></div>
            <nav className="flex-1 space-y-4 overflow-y-auto">
              {GROUPS.map((g) => (
                <div key={g.label}>
                  <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{g.label}</p>
                  {g.items.map((it) => (
                    <div
                      key={it.n}
                      className={cn(
                        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        it.active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      {it.active ? <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-primary glow-primary" /> : null}
                      <it.i className="size-4" /> {it.n}
                      {it.b ? <Badge variant="solid" shape="pill" className="ml-auto">{it.b}</Badge> : null}
                    </div>
                  ))}
                </div>
              ))}
            </nav>
            <div className="rounded-xl border bg-muted p-3">
              <p className="text-xs text-muted-foreground">Wallet</p>
              <p className="font-display text-xl font-bold">$24.50</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><LogOut className="size-3.5" /> Sign out</div>
            </div>
          </aside>
        </Frame>
      </Section>

      <Section title="B · Icon rail" note="Slim 64px rail with tooltips. Gives the content more room.">
        <Frame label="Collapsed · 64px" className="flex justify-center">
          <aside className="flex h-[480px] w-16 flex-col items-center gap-1 rounded-2xl border bg-card py-3">
            <span className="bg-brand-gradient mb-3 grid size-9 place-items-center rounded-lg font-display text-sm font-bold text-primary-foreground">C</span>
            {GROUPS.flatMap((g) => g.items).slice(0, 8).map((it) => (
              <div
                key={it.n}
                title={it.n}
                className={cn(
                  "grid size-10 place-items-center rounded-lg transition-colors",
                  it.active ? "bg-primary/15 text-primary glow-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <it.i className="size-[18px]" />
              </div>
            ))}
          </aside>
        </Frame>
      </Section>
    </>
  );
}
