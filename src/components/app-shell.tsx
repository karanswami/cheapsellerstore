"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gamepad2, LogOut, Shield, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";

type Props = {
  siteName: string;
  user: { name: string; username: string; role: string; roleLabel: string; balance: string };
  children: React.ReactNode;
};

export function AppShell({ siteName, user, children }: Props) {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const items = [
    { href: "/app", label: "Store", icon: Store, active: true },
    ...(user.role === "ADMIN" ? [{ href: "/admin", label: "Admin", icon: Shield, active: false }] : []),
  ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r bg-card/50 p-3 lg:flex lg:h-screen lg:flex-col lg:sticky lg:top-0">
        <Link href="/app" className="mb-4 flex items-center gap-2.5 px-2 pt-1">
          <span className="bg-brand-gradient grid size-8 place-items-center rounded-lg text-primary-foreground">
            <Gamepad2 className="size-4" />
          </span>
          <span className="font-display text-lg font-bold">{siteName}</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                it.active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {it.active ? <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-primary glow-primary" /> : null}
              <it.icon className="size-4" /> {it.label}
            </Link>
          ))}
        </nav>
        <AccountCard user={user} onSignOut={signOut} />
      </aside>

      <div className="min-w-0">
        <div className="lg:hidden">
          <SiteHeader config={{ siteName, siteTagline: "", logoUrl: "" }} user={user} />
        </div>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

function AccountCard({ user, onSignOut }: { user: Props["user"]; onSignOut: () => void }) {
  return (
    <div className="rounded-xl border bg-muted p-3">
      <div className="flex items-center justify-between">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <Badge variant="muted">{user.roleLabel}</Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Wallet</p>
      <p className="font-display text-xl font-bold">{user.balance}</p>
      <button
        onClick={onSignOut}
        className="mt-2 flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <LogOut className="size-3.5" /> Sign out
      </button>
    </div>
  );
}
