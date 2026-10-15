"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { useAuth } from "@/components/auth/auth-provider";
import { ConsoleHeader } from "@/components/layout/console-header";
import { PageTransitionShell } from "@/components/layout/page-transition-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { formatMoney } from "@/lib/currencies";
import { consoleSubtitle, consoleTitle, roleBadge } from "@/lib/roles";
import type { ConsoleSidebarStats } from "@/lib/sidebar-stats";
import type { SafeUser } from "@/types/user";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, LogOut, Store, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function AdminUserMenu({ user }: { user: SafeUser }) {
  const { logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function onLogout() {
    setOpen(false);
    await logout();
    // Hard navigate — avoids blank white from admin layout refresh racing logout.
    window.location.assign("/");
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 max-w-[14rem] gap-2 rounded-[0.85rem] border-primary/25 bg-secondary/70 px-2.5 shadow-none hover:border-primary/45 hover:bg-primary/10 hover:shadow-[var(--glow-soft)]"
        >
          <Avatar className="size-7 rounded-lg">
            {user.avatarUrl ? (
              <AvatarImage
                src={user.avatarUrl}
                alt={user.name}
                className="rounded-lg"
              />
            ) : null}
            <AvatarFallback className="rounded-lg bg-primary/20 text-xs text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 flex-col items-start text-left sm:flex">
            <span className="truncate text-xs font-semibold leading-tight">
              @{user.username}
            </span>
            <span className="truncate text-[10px] tracking-wide text-primary uppercase">
              {roleBadge(user.role)}
            </span>
          </span>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56 rounded-xl">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
            <span className="text-xs font-medium text-success">
              {formatMoney(user.walletBalance)}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app">
            <Store />
            Customer app
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onLogout}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AdminShell({
  children,
  user: serverUser,
  stats: initialStats,
  maintenanceMode = false,
}: {
  children: React.ReactNode;
  user: SafeUser;
  stats: ConsoleSidebarStats;
  maintenanceMode?: boolean;
}) {
  const { user: liveUser } = useAuth();
  // Keep SSR user when auth snapshot is missing or a different account.
  const user =
    liveUser && liveUser.id === serverUser.id ? liveUser : serverUser;
  const [stats, setStats] = useState<ConsoleSidebarStats>(initialStats);

  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  useEffect(() => {
    let inFlight = false;
    const syncStats = async () => {
      if (document.hidden || inFlight) return;
      inFlight = true;
      try {
        const res = await fetch("/api/admin/sidebar-stats", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as { data?: ConsoleSidebarStats };
        if (json.data) {
          setStats(json.data);
        }
      } catch {
        // ignore
      } finally {
        inFlight = false;
      }
    };

    const interval = window.setInterval(syncStats, 10_000);
    document.addEventListener("visibilitychange", syncStats);
    window.addEventListener("focus", syncStats);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", syncStats);
      window.removeEventListener("focus", syncStats);
    };
  }, []);

  return (
    <TooltipProvider>
      <SidebarProvider
        className="min-h-svh flex-1"
        style={
          {
            "--sidebar-width": "20rem",
          } as React.CSSProperties
        }
      >
        <AdminSidebar user={user} stats={stats} />
        <SidebarInset>
          <ConsoleHeader
            title={consoleTitle(user.role)}
            subtitle={consoleSubtitle(user.role)}
            brandBadge={roleBadge(user.role)}
            storeHref="/app"
            storeLabel="App"
            trailing={
              <div className="flex items-center gap-2">
                {maintenanceMode ? (
                  <Badge
                    variant="destructive"
                    className="hidden gap-1 sm:inline-flex"
                    asChild
                  >
                    <Link href="/admin/settings" title="Maintenance mode is on">
                      <Wrench className="size-3" aria-hidden />
                      Maintenance ON
                    </Link>
                  </Badge>
                ) : null}
                <AdminUserMenu user={user} />
              </div>
            }
          />
          <PageTransitionShell className="flex min-h-0 min-w-0 flex-1 flex-col p-4 sm:p-6">
            {children}
          </PageTransitionShell>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
