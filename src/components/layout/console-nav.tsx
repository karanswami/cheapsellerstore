"use client";

import sidebarSurface from "@/components/layout/console-sidebar.module.css";
import { SiteIcon } from "@/components/theme/site-icon";
import { useSidebarOptional } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { SiteIconKey } from "@/types/site-icons";
import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type ConsoleNavBadgeTone =
  | "primary"
  | "info"
  | "warning"
  | "destructive"
  | "success";

export type ConsoleNavLink = {
  title: string;
  description: string;
  href: string;
  /** Optional custom PNG from Icons desk — prefer Lucide `icon` for console nav. */
  iconKey?: SiteIconKey;
  /** Lucide icon (customer + admin sidebars). */
  icon?: LucideIcon;
  exact?: boolean;
  badge?: { label: string; tone?: ConsoleNavBadgeTone };
};

export type ConsoleNavSection = {
  label: string;
  items: ConsoleNavLink[];
};

function pathActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

const BADGE_TONE: Record<ConsoleNavBadgeTone, string> = {
  primary: "border-primary/40 bg-primary/20 text-primary",
  info: "border-sky-500/40 bg-sky-500/15 text-sky-400",
  warning: "border-amber-500/40 bg-amber-500/15 text-amber-400",
  destructive: "border-rose-500/40 bg-rose-500/15 text-rose-400",
  success: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
};

/** Console side nav — same markup on SSR and client (no mount gate). */
export function ConsoleNav({
  sections,
  className,
}: {
  sections: ConsoleNavSection[];
  className?: string;
}) {
  const pathname = usePathname();
  const sidebar = useSidebarOptional();

  const closeMobileSoon = () => {
    if (sidebar?.isMobile) sidebar.setOpenMobile(false);
  };

  return (
    <nav className={cn("flex flex-col gap-5 px-3 py-2", className)}>
      {sections.map((section) => (
        <div key={section.label} className="space-y-1.5">
          <div className="px-2 py-1">
            <span className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {section.label}
            </span>
          </div>
          <ul className="space-y-1.5">
            {section.items.map((item) => {
              const active = pathActive(pathname, item.href, item.exact);
              const FallbackIcon = item.icon;
              const tone = item.badge?.tone ?? "primary";
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch
                    data-active={active ? "true" : "false"}
                    data-interactive
                    data-sidebar-nav
                    onClick={closeMobileSoon}
                    className={cn(
                      sidebarSurface.navLink,
                      "group relative z-0 flex items-center gap-3 px-2.5 py-2.5",
                      "text-foreground",
                    )}
                  >
                    <span className="relative z-[1] flex min-w-0 flex-1 items-center gap-3">
                      {item.iconKey ? (
                        <SiteIcon
                          name={item.iconKey}
                          className={cn(
                            "size-7 shrink-0 overflow-visible transition-transform duration-150 ease-out group-hover:scale-105",
                            active && "scale-105",
                          )}
                        />
                      ) : FallbackIcon ? (
                        <FallbackIcon
                          className={cn(
                            "size-5 shrink-0 transition-[transform,color] duration-150 ease-out group-hover:scale-105",
                            active
                              ? "scale-105 text-primary drop-shadow-[0_0_6px_color-mix(in_oklab,var(--primary)_50%,transparent)]"
                              : "text-primary/80 group-hover:text-primary",
                          )}
                        />
                      ) : null}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="block truncate text-sm font-semibold leading-tight">
                            {item.title}
                          </span>
                          {item.badge ? (
                            <span
                              className={cn(
                                "shrink-0 rounded-full border px-1.5 py-px text-[9px] font-bold tracking-wide uppercase",
                                BADGE_TONE[tone],
                              )}
                            >
                              {item.badge.label}
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 block truncate text-xs leading-snug",
                            active
                              ? "text-primary/80"
                              : "text-muted-foreground",
                          )}
                        >
                          {item.description}
                        </span>
                      </span>
                      <ChevronRight
                        aria-hidden
                        className={cn(
                          "size-4 shrink-0 transition-colors duration-150",
                          active
                            ? "text-primary"
                            : "text-muted-foreground/70 group-hover:text-foreground",
                        )}
                      />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
