"use client";

import {
  feedbackTap,
  preloadInteractionFeedback,
  type FeedbackTapOptions,
} from "@/lib/feedback";
import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";

const TAP_SLOP_PX = 12;

export type UseInteractionFeedbackOptions = FeedbackTapOptions & {
  /** Disable all tap feedback for this binding. */
  disabled?: boolean;
};

/**
 * Imperative press handlers for custom interactive elements.
 * Prefer the global InteractionFeedbackProvider for standard buttons/links.
 */
export function useInteractionFeedback(
  options: UseInteractionFeedbackOptions = {},
) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    preloadInteractionFeedback();
  }, []);

  const trigger = useCallback((overrides?: FeedbackTapOptions) => {
    const opts = optionsRef.current;
    if (opts.disabled) return;
    feedbackTap({
      silent: opts.silent,
      noHaptic: opts.noHaptic,
      hapticMs: opts.hapticMs,
      impact: opts.impact,
      sound: opts.sound,
      ...overrides,
    });
  }, []);

  const pendingRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    cancelled: boolean;
  } | null>(null);

  const onPointerDown = useCallback((event: ReactPointerEvent) => {
    if (event.button !== 0) return;
    if (optionsRef.current.disabled) return;
    if (!event.isPrimary) return;

    pendingRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      cancelled: false,
    };
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent) => {
    const pending = pendingRef.current;
    if (!pending || pending.pointerId !== event.pointerId || pending.cancelled) {
      return;
    }

    const dx = event.clientX - pending.startX;
    const dy = event.clientY - pending.startY;
    if (dx * dx + dy * dy > TAP_SLOP_PX * TAP_SLOP_PX) {
      pending.cancelled = true;
    }
  }, []);

  const onPointerUp = useCallback(
    (event: ReactPointerEvent) => {
      const pending = pendingRef.current;
      if (!pending || pending.pointerId !== event.pointerId) return;
      pendingRef.current = null;

      if (pending.cancelled) return;
      trigger();
    },
    [trigger],
  );

  const onPointerCancel = useCallback((event: ReactPointerEvent) => {
    const pending = pendingRef.current;
    if (pending?.pointerId === event.pointerId) {
      pendingRef.current = null;
    }
  }, []);

  return {
    trigger,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
}
