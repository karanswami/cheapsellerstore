"use client";

import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => {
    finished: Promise<void>;
    ready: Promise<void>;
    updateCallbackDone: Promise<void>;
  };
};

function shouldHandleAnchor(
  anchor: HTMLAnchorElement,
  pathname: string,
): boolean {
  if (!anchor.href) return false;
  const target = anchor.getAttribute("target");
  const rel = anchor.getAttribute("rel");
  if (target === "_blank") return false;
  if (rel?.includes("external")) return false;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  if (url.pathname === pathname && url.search === window.location.search) {
    return false;
  }

  return true;
}

export function PageTransitionShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const nativeSupported = useMemo(() => {
    if (typeof document === "undefined") return false;
    return typeof (document as TransitionDocument).startViewTransition === "function";
  }, []);

  useEffect(() => {
    if (!nativeSupported) return;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const raw = event.target;
      if (!(raw instanceof Element)) return;
      const anchor = raw.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      // Sidebar nav: let Next Link navigate immediately (sheet already closing)
      if (anchor.hasAttribute("data-sidebar-nav")) return;
      // Dropdown / select menus: capture preventDefault races Radix dismiss
      if (
        anchor.closest(
          '[data-slot="dropdown-menu-content"], [data-slot="select-content"], [role="menu"]',
        )
      ) {
        return;
      }
      if (!shouldHandleAnchor(anchor, pathname)) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.hash && url.pathname === window.location.pathname) return;

      const doc = document as TransitionDocument;
      if (!doc.startViewTransition) return;

      event.preventDefault();
      doc.startViewTransition(() => {
        router.push(`${url.pathname}${url.search}${url.hash}`);
      });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [nativeSupported, pathname, router]);

  return (
    <div
      data-page-transition-root
      data-page-transition-native={nativeSupported ? "true" : "false"}
      className={cn("relative min-w-0", className)}
    >
      <div
        key={pathname}
        data-page-transition-content
        className="motion-safe-page-enter flex min-h-0 flex-1 flex-col"
      >
        {children}
      </div>
    </div>
  );
}
