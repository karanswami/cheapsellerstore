"use client";

import { useSidebarOptional } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ChevronDown, Search, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

export type SideNavTone =
  | "primary"
  | "info"
  | "warning"
  | "danger"
  | "success";

export type SideNavItem = {
  title: string;
  /** Shown as a native tooltip and matched by the search box. */
  hint?: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: { label: string; tone?: SideNavTone };
};

export type SideNavGroup = {
  label: string;
  items: SideNavItem[];
};

const TONE: Record<SideNavTone, string> = {
  primary: "bg-primary/15 text-primary",
  info: "bg-sky-500/15 text-sky-500 dark:text-sky-400",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  danger: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

/** With this many links or fewer, every group starts expanded. */
const EXPAND_ALL_LIMIT = 14;

function isActive(pathname: string, item: SideNavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function activeGroupLabel(groups: SideNavGroup[], pathname: string) {
  // Longest matching href wins so /admin doesn't claim /admin/users.
  let best: { label: string; len: number } | null = null;
  for (const g of groups) {
    for (const item of g.items) {
      if (isActive(pathname, item) && (!best || item.href.length > best.len)) {
        best = { label: g.label, len: item.href.length };
      }
    }
  }
  return best?.label ?? null;
}

export function SideNav({ groups }: { groups: SideNavGroup[] }) {
  const pathname = usePathname();
  const sidebar = useSidebarOptional();
  const [query, setQuery] = useState("");

  const total = useMemo(
    () => groups.reduce((n, g) => n + g.items.length, 0),
    [groups],
  );
  const activeLabel = useMemo(
    () => activeGroupLabel(groups, pathname),
    [groups, pathname],
  );

  const [closed, setClosed] = useState<Set<string>>(() => {
    if (total <= EXPAND_ALL_LIMIT) return new Set();
    return new Set(
      groups.map((g) => g.label).filter((l) => l !== activeLabel),
    );
  });

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) =>
          `${i.title} ${i.hint ?? ""}`.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, q]);

  const toggle = (label: string) =>
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  const showSearch = total > EXPAND_ALL_LIMIT;

  return (
    <nav aria-label="Main" className="flex min-h-0 flex-col gap-1 px-3 py-3">
      {showSearch ? (
        <div className="relative mb-2">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search menu…"
            aria-label="Search menu"
            className="h-9 w-full rounded-lg border border-sidebar-border bg-background/60 pr-8 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 grid size-5 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          ) : null}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="px-2 py-6 text-center text-xs text-muted-foreground">
          No menu items match “{query.trim()}”.
        </p>
      ) : null}

      {visible.map((group) => {
        // The group holding the current page stays open so you never lose your place.
        const open =
          q.length > 0 || group.label === activeLabel || !closed.has(group.label);
        const panelId = `side-nav-${group.label.replace(/\W+/g, "-").toLowerCase()}`;
        return (
          <section key={group.label} className="mb-1">
            <button
              type="button"
              onClick={() => toggle(group.label)}
              aria-expanded={open}
              aria-controls={panelId}
              disabled={q.length > 0}
              className="group/head flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default disabled:hover:text-muted-foreground"
            >
              <span className="flex-1">{group.label}</span>
              {q.length === 0 ? (
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "size-3.5 transition-transform duration-200",
                    !open && "-rotate-90",
                  )}
                />
              ) : null}
            </button>

            <div
              id={panelId}
              className={cn(
                "grid transition-[grid-template-rows] duration-200 ease-out",
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <ul className="min-h-0 space-y-0.5 overflow-hidden">
                {group.items.map((item) => {
                  const active = isActive(pathname, item);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch
                        title={item.hint}
                        tabIndex={open ? 0 : -1}
                        aria-current={active ? "page" : undefined}
                        data-interactive
                        onClick={() => {
                          if (sidebar?.isMobile) sidebar.setOpenMobile(false);
                        }}
                        className={cn(
                          "group/link relative flex h-10 items-center gap-3 rounded-lg px-2 text-sm font-medium transition-colors",
                          "outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "absolute top-2 bottom-2 -left-3 w-1 rounded-r-full bg-primary transition-opacity",
                            active ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span
                          className={cn(
                            "grid size-7 shrink-0 place-items-center rounded-md transition-colors",
                            active
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-muted/70 text-muted-foreground group-hover/link:bg-background group-hover/link:text-foreground",
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {item.title}
                        </span>
                        {item.badge ? (
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[10px] leading-none font-bold tracking-wide tabular-nums",
                              TONE[item.badge.tone ?? "primary"],
                            )}
                          >
                            {item.badge.label}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        );
      })}
    </nav>
  );
}
