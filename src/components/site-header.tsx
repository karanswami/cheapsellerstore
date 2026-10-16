"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Gamepad2, LayoutDashboard, LogOut, Shield, Wallet } from "lucide-react";
import type { SiteConfig } from "@/types/site-config";

export type HeaderUser = {
  name: string;
  username: string;
  role: string;
  roleLabel: string;
  balance: string;
};

export function SiteHeader({
  config,
  user,
  maxWidth = "max-w-7xl",
}: {
  config: Pick<SiteConfig, "siteName" | "siteTagline" | "logoUrl">;
  user?: HeaderUser | null;
  maxWidth?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const links = user
    ? [
        { href: "/app", label: "Dashboard" },
        { href: "/#products", label: "Products" },
      ]
    : [{ href: "/#products", label: "Products" }];

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
      <div className={`mx-auto flex h-14 items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr] gap-2 rounded-[14px] border border-border/70 bg-background/70 pl-3 pr-2 shadow-[0_8px_30px_rgb(0_0_0/0.25)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sm:pl-5 ${maxWidth}`}>
        <Link href={user ? "/app" : "/"} className="group flex min-w-0 items-center gap-2.5 justify-self-start">
          {config.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logoUrl} alt="" className="size-8 rounded-lg object-cover" />
          ) : (
            <span className="bg-brand-gradient grid size-8 place-items-center rounded-lg text-primary-foreground transition-transform duration-200 group-hover:-rotate-6">
              <Gamepad2 className="size-4.5" />
            </span>
          )}
          <span className="truncate font-display text-[17px] font-semibold tracking-tight">{config.siteName}</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-[14px] px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 justify-self-end sm:gap-2">
          {user ? (
            <>
              <span className="flex items-center gap-2 rounded-[14px] border bg-muted/60 px-3 py-1.5 text-sm font-semibold">
                <Wallet className="size-4 text-highlight" /> {user.balance}
              </span>
              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setOpen((o) => !o)}
                  aria-label="Account menu"
                  aria-expanded={open}
                  className="bg-brand-gradient grid size-9 place-items-center rounded-[14px] text-sm font-bold text-primary-foreground outline-none ring-2 ring-transparent ring-offset-2 ring-offset-background transition-shadow hover:ring-primary/40 focus-visible:ring-ring/60"
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>
                {open ? (
                  <div className="absolute right-0 top-12 w-60 overflow-hidden rounded-[14px] border bg-popover p-1.5 shadow-2xl">
                    <div className="px-3 py-2.5">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{user.username} · {user.roleLabel}
                      </p>
                    </div>
                    <div className="my-1 h-px bg-border" />
                    <MenuLink href="/app" icon={LayoutDashboard}>Dashboard</MenuLink>
                    {user.role === "ADMIN" ? <MenuLink href="/admin" icon={Shield}>Admin</MenuLink> : null}
                    <button
                      onClick={signOut}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <LogOut className="size-4" /> Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-[14px] px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 items-center rounded-[14px] bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-85"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Icon className="size-4" /> {children}
    </Link>
  );
}
