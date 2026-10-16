import { Bell, ChevronDown, Gamepad2, Menu, Search, ShoppingBag, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Frame, Section } from "./section";

const Logo = () => (
  <div className="flex items-center gap-2">
    <span className="bg-brand-gradient grid size-8 place-items-center rounded-lg text-primary-foreground"><Gamepad2 className="size-4" /></span>
    <span className="font-display text-lg font-bold tracking-tight">Cheap<span className="text-gradient">Seller</span></span>
  </div>
);
const Avatar = () => <span className="bg-brand-gradient grid size-9 place-items-center rounded-full text-sm font-bold text-primary-foreground">K</span>;
const Balance = () => (
  <span className="hidden items-center gap-2 rounded-lg border bg-muted px-3 py-1.5 text-sm font-semibold sm:flex"><Wallet className="size-4 text-highlight" /> $24.50</span>
);

export function HeaderTab() {
  return (
    <>
      <Section title="A · Classic bar" note="Logo, search, wallet, account. One row, always visible.">
        <Frame label="Desktop">
          <div className="flex items-center gap-4 rounded-xl border bg-card px-4 py-3">
            <Logo />
            <div className="relative mx-4 hidden flex-1 md:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input placeholder="Search products…" className="h-10 w-full rounded-lg border bg-input pl-9 pr-3 text-sm outline-none focus:border-primary" />
            </div>
            <div className="ml-auto flex items-center gap-2"><Balance /><Button size="icon" variant="ghost"><Bell /></Button><Avatar /></div>
          </div>
        </Frame>
      </Section>

      <Section title="B · Two-tier with category nav" note="Top row for account, second row for categories — good for big catalogs.">
        <Frame label="Desktop">
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <Logo />
              <div className="flex items-center gap-2"><Balance /><Button size="sm">Login</Button></div>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-3 py-2 text-sm">
              {["Home", "Mobile games", "PC keys", "Gift cards", "Subscriptions", "Top-ups"].map((n, i) => (
                <span key={n} className={`shrink-0 rounded-md px-3 py-1.5 font-medium ${i === 0 ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>{n}</span>
              ))}
            </nav>
          </div>
        </Frame>
      </Section>

      <Section title="C · Floating glass pill" note="Detached rounded bar over the page. Most “premium” feel.">
        <Frame label="Desktop" className="relative h-44 overflow-hidden">
          <div className="grid-bg absolute inset-0 opacity-50" />
          <div className="absolute left-1/4 top-4 size-40 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative mx-auto flex max-w-2xl items-center justify-between rounded-full border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-xl">
            <Logo />
            <nav className="hidden gap-5 text-sm text-muted-foreground md:flex"><span className="text-foreground">Store</span><span>Deposit</span><span>History</span><span>Support</span></nav>
            <div className="flex items-center gap-2"><Button size="sm"><ShoppingBag /> $24.50</Button><Avatar /></div>
          </div>
        </Frame>
      </Section>

      <Section title="Mobile" note="Same for all three: logo, wallet, menu.">
        <Frame label="Phone width" className="flex justify-center">
          <div className="flex w-80 items-center justify-between rounded-xl border bg-card px-3 py-2.5">
            <Logo />
            <div className="flex items-center gap-1"><span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold">$24.50</span><Button size="icon" variant="ghost"><Menu /></Button></div>
          </div>
        </Frame>
        <p className="mt-2 hidden"><ChevronDown /></p>
      </Section>
    </>
  );
}
