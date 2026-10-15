"use client";

import {
  configureFeedbackPack,
  feedbackTap,
  preloadInteractionFeedback,
  resolveTapFeedbackFromElement,
} from "@/lib/feedback";
import type { FeedbackSoundConfig } from "@/types/feedback-sounds";
import { useEffect } from "react";

/**
 * Interactive targets that receive tap sound + haptic via event delegation.
 * Opt out with `data-no-feedback`. Opt in custom nodes with `data-interactive`.
 */
const INTERACTIVE_SELECTOR = [
  "button:not([disabled]):not([data-no-feedback])",
  '[role="button"]:not([aria-disabled="true"]):not([data-no-feedback])',
  '[data-slot="button"]:not([disabled]):not([aria-disabled="true"]):not([data-no-feedback])',
  '[data-slot="tabs-trigger"]:not([disabled]):not([data-no-feedback])',
  '[data-slot="dropdown-menu-item"]:not([data-disabled]):not([data-no-feedback])',
  '[data-slot="dropdown-menu-checkbox-item"]:not([data-disabled]):not([data-no-feedback])',
  '[data-slot="dropdown-menu-radio-item"]:not([data-disabled]):not([data-no-feedback])',
  '[data-slot="select-trigger"]:not([disabled]):not([data-no-feedback])',
  '[data-slot="select-item"]:not([data-disabled]):not([data-no-feedback])',
  '[data-slot="sidebar-menu-button"]:not([disabled]):not([data-no-feedback])',
  '[data-slot="sidebar-menu-sub-button"]:not([data-no-feedback])',
  '[data-slot="sidebar-menu-action"]:not([disabled]):not([data-no-feedback])',
  '[data-slot="sidebar-trigger"]:not([disabled]):not([data-no-feedback])',
  '[data-slot="sidebar-rail"]:not([data-no-feedback])',
  '[data-slot="filter-chip"]:not([disabled]):not([data-no-feedback])',
  '[data-slot="switch"]:not([disabled]):not([data-no-feedback])',
  "[data-interactive]:not([disabled]):not([aria-disabled=\"true\"]):not([data-no-feedback])",
].join(",");

function isEligibleTarget(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") {
    return false;
  }
  if (el.hasAttribute("data-disabled") || el.getAttribute("data-disabled") === "") {
    return false;
  }
  return true;
}

/** Movement beyond this cancels tap feedback (scroll / drag). */
const TAP_SLOP_PX = 12;

type PendingPress = {
  pointerId: number;
  startX: number;
  startY: number;
  target: HTMLElement;
  cancelled: boolean;
};

function resolveInteractiveTarget(raw: Element): HTMLElement | null {
  if (raw.closest("[data-no-feedback]")) return null;
  const target = raw.closest(INTERACTIVE_SELECTOR);
  if (!target || !isEligibleTarget(target)) return null;
  return target as HTMLElement;
}

function releaseMatchesPress(
  event: PointerEvent,
  pressTarget: Element,
): boolean {
  const underPointer = document.elementFromPoint(event.clientX, event.clientY);
  if (!(underPointer instanceof Element)) return false;
  return resolveInteractiveTarget(underPointer) === pressTarget;
}

function clearPressed(el: HTMLElement | null): void {
  if (el?.hasAttribute("data-pressed")) {
    el.removeAttribute("data-pressed");
  }
}

/**
 * Global press feedback: tiered click + haptic on interactive UI.
 * `data-pressed` drives smooth spring release in CSS.
 */
export function InteractionFeedbackProvider({
  children,
  feedbackPack,
}: {
  children: React.ReactNode;
  feedbackPack?: FeedbackSoundConfig | null;
}) {
  useEffect(() => {
    configureFeedbackPack(feedbackPack ?? null);
  }, [feedbackPack]);

  useEffect(() => {
    let primed = false;
    let pending: PendingPress | null = null;
    let pressedEl: HTMLElement | null = null;

    const prime = () => {
      if (primed) return;
      primed = true;
      preloadInteractionFeedback();
    };

    const clearPending = (pointerId: number) => {
      if (pending?.pointerId === pointerId) {
        clearPressed(pending.target);
        pending = null;
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary) return;
      if (event.pointerType === "mouse" && event.detail > 1) return;

      const raw = event.target;
      if (!(raw instanceof Element)) return;

      const target = resolveInteractiveTarget(raw);
      if (!target) return;

      clearPressed(pressedEl);
      pressedEl = target;
      target.setAttribute("data-pressed", "");

      pending = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        target,
        cancelled: false,
      };
      prime();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!pending || pending.pointerId !== event.pointerId || pending.cancelled) {
        return;
      }

      const dx = event.clientX - pending.startX;
      const dy = event.clientY - pending.startY;
      if (dx * dx + dy * dy > TAP_SLOP_PX * TAP_SLOP_PX) {
        pending.cancelled = true;
        clearPressed(pending.target);
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!pending || pending.pointerId !== event.pointerId) return;

      const press = pending;
      pending = null;
      clearPressed(press.target);
      if (pressedEl === press.target) pressedEl = null;

      if (press.cancelled) return;
      if (!releaseMatchesPress(event, press.target)) return;

      const { impact, sound } = resolveTapFeedbackFromElement(press.target);
      feedbackTap({ impact, sound });
    };

    const onPointerCancel = (event: PointerEvent) => {
      if (pending?.pointerId === event.pointerId) {
        clearPressed(pending.target);
        if (pressedEl === pending.target) pressedEl = null;
      }
      clearPending(event.pointerId);
    };

    const listenerOpts = { capture: true, passive: true } as const;

    document.addEventListener("pointerdown", onPointerDown, listenerOpts);
    document.addEventListener("pointermove", onPointerMove, listenerOpts);
    document.addEventListener("pointerup", onPointerUp, listenerOpts);
    document.addEventListener("pointercancel", onPointerCancel, listenerOpts);

    const warm = () => {
      prime();
      window.removeEventListener("pointerdown", warm, true);
      window.removeEventListener("keydown", warm, true);
    };
    window.addEventListener("pointerdown", warm, {
      capture: true,
      passive: true,
      once: true,
    });
    window.addEventListener("keydown", warm, {
      capture: true,
      passive: true,
      once: true,
    });

    return () => {
      clearPressed(pressedEl);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("pointercancel", onPointerCancel, true);
      window.removeEventListener("pointerdown", warm, true);
      window.removeEventListener("keydown", warm, true);
    };
  }, []);

  return children;
}
