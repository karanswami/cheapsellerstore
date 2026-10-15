"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Client-side copy / inspect deterrents (production only).
 * Not real security — browsers cannot fully block DevTools or OS screenshots.
 * Skips localhost + `/admin` so operators can still debug the panel.
 * Intentional Copy buttons (clipboard API) and form fields still work.
 */
export function ContentProtection() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;

    const host = window.location.hostname;
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".local")
    ) {
      return;
    }

    if (pathname.startsWith("/admin")) return;

    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      if (target.closest("[data-allow-select],[data-allow-copy]")) return true;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const onSelectStart = (e: Event) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      return false;
    };

    const onDragStart = (e: DragEvent) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      return false;
    };

    const onCopyCut = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      e.clipboardData?.setData("text/plain", "");
      return false;
    };

    const blockedCombo = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      if (e.key === "F12") return true;
      if (
        ctrl &&
        e.shiftKey &&
        (key === "i" || key === "j" || key === "c" || key === "k")
      ) {
        return true;
      }
      if (ctrl && (key === "u" || key === "s" || key === "p")) return true;

      if (
        !isEditableTarget(e.target) &&
        ctrl &&
        (key === "c" || key === "x" || key === "a")
      ) {
        return true;
      }

      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!blockedCombo(e)) return;
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    document.addEventListener("contextmenu", onContextMenu, true);
    document.addEventListener("selectstart", onSelectStart, true);
    document.addEventListener("dragstart", onDragStart, true);
    document.addEventListener("copy", onCopyCut, true);
    document.addEventListener("cut", onCopyCut, true);
    document.addEventListener("keydown", onKeyDown, true);

    document.documentElement.classList.add("drip-protect");

    return () => {
      document.removeEventListener("contextmenu", onContextMenu, true);
      document.removeEventListener("selectstart", onSelectStart, true);
      document.removeEventListener("dragstart", onDragStart, true);
      document.removeEventListener("copy", onCopyCut, true);
      document.removeEventListener("cut", onCopyCut, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.documentElement.classList.remove("drip-protect");
    };
  }, [pathname]);

  return null;
}
