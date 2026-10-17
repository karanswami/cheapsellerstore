"use client";

/*
 * In-app amount entry. Phones get our own keypad instead of the OS keyboard: the system keyboard
 * resizes the viewport, shoves the tab dock around and lets people type junk into a number field.
 * Fine-pointer desktops hide the keypad and type straight into it (window keydown + paste).
 */
import { useEffect, useRef, useState } from "react";
import { Delete } from "lucide-react";
import { feedbackTap } from "@/lib/feedback";
import { cn } from "@/lib/utils";

const MAX_INT_DIGITS = 9;
/** Rails with no minor unit in practice: a decimal point is just a typo there. */
const WHOLE_ONLY = new Set(["IDR", "JPY", "KRW", "VND"]);

export function decimalsFor(code: string) {
  return WHOLE_ONLY.has(code) ? 0 : 2;
}

/** Apply one key to the typed string; returns null when the key is not allowed. */
export function applyKey(value: string, key: string, decimals: number): string | null {
  if (key === "back") return value.slice(0, -1);
  if (key === "clear") return "";
  const [int, frac] = value.split(".");
  if (key === ".") {
    if (!decimals || value.includes(".")) return null;
    return value ? `${value}.` : "0.";
  }
  if (!/^\d$/.test(key)) return null;
  if (frac !== undefined) return frac.length >= decimals ? null : value + key;
  if (int === "0") return key === "0" ? null : key;
  if (int.length >= MAX_INT_DIGITS) return null;
  return value + key;
}

/** Turn pasted / prefilled text into a value the keypad could have produced. */
export function cleanAmount(raw: string, decimals: number): string {
  const digits = raw.replace(/[^\d.]/g, "");
  const [int = "", ...rest] = digits.split(".");
  const i = int.replace(/^0+(?=\d)/, "").slice(0, MAX_INT_DIGITS);
  const f = rest.join("").slice(0, decimals);
  if (!decimals || !digits.includes(".")) return i;
  return `${i || "0"}.${f}`;
}

/** Group the integer part for display, keeping whatever the user typed after the point. */
function pretty(value: string, code: string) {
  if (!value) return "";
  const [int, frac] = value.split(".");
  const grouped = Number(int || 0).toLocaleString(code === "INR" ? "en-IN" : "en-US");
  return frac === undefined ? grouped : `${grouped}.${frac}`;
}

/** Shrink the figure as it grows so 9 digits still fit a 320px phone. */
function sizeFor(len: number) {
  if (len <= 5) return "text-[3.6rem]";
  if (len <= 8) return "text-[3rem]";
  if (len <= 11) return "text-[2.4rem]";
  return "text-[2rem]";
}

export function AmountDisplay({
  value,
  symbol,
  code,
  error,
  shakeKey,
}: {
  value: string;
  symbol: string;
  code: string;
  error: boolean;
  /** Bump to replay the shake. */
  shakeKey: number;
}) {
  const shown = pretty(value, code);
  return (
    <div
      key={shakeKey}
      role="textbox"
      aria-label={`Amount in ${code}`}
      aria-readonly
      aria-live="polite"
      className={cn(
        "flex h-[4.5rem] items-center justify-center gap-1.5 overflow-hidden font-display font-bold leading-none tracking-tight tabular-nums",
        shakeKey > 0 && "anim-shake",
      )}
    >
      <span className={cn("shrink-0 text-muted-foreground transition-[font-size] duration-200", value ? "text-[1.9rem]" : "text-[2.4rem]")}>
        {symbol || code}
      </span>
      <span className={cn("flex min-w-0 items-center transition-[font-size] duration-200", sizeFor(shown.length), error && "text-destructive")}>
        <span className={cn("truncate", !shown && "text-muted-foreground/35")}>{shown || "0"}</span>
        <span aria-hidden className="anim-caret ml-0.5 h-[0.85em] w-[3px] shrink-0 rounded-full bg-primary" />
      </span>
    </div>
  );
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"] as const;

export function Keypad({
  decimals,
  onKey,
  className,
}: {
  decimals: number;
  onKey: (key: string) => void;
  className?: string;
}) {
  const hold = useRef<number | null>(null);

  const stopHold = () => {
    if (hold.current) window.clearTimeout(hold.current);
    hold.current = null;
  };

  return (
    <div className={cn("grid select-none grid-cols-3 gap-2", className)} role="group" aria-label="Keypad">
      {KEYS.map((k) => {
        const back = k === "back";
        const dot = k === ".";
        if (dot && !decimals) return <span key={k} aria-hidden />;
        return (
          <button
            key={k}
            type="button"
            aria-label={back ? "Delete (hold to clear)" : dot ? "Decimal point" : k}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              // Fire on press, not release, so fast typing never drops digits.
              e.preventDefault();
              onKey(k);
              if (back) hold.current = window.setTimeout(() => onKey("clear"), 550);
            }}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onKey(k);
              }
            }}
            className={cn(
              "keypad-key grid h-14 touch-manipulation place-items-center rounded-2xl font-display text-[1.6rem] font-semibold tabular-nums",
              back ? "text-muted-foreground" : "bg-white/[0.045] ring-1 ring-inset ring-white/[0.05]",
            )}
          >
            {back ? <Delete className="size-6" /> : k}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Amount state + input wiring shared by the keypad and a physical keyboard.
 * Rejected keys shake the figure and buzz instead of silently doing nothing.
 */
export function useAmountInput({
  initial,
  decimals,
  active,
  onEnter,
}: {
  initial: string;
  decimals: number;
  active: boolean;
  onEnter: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [shake, setShake] = useState(0);
  const valueRef = useRef(value);
  const enterRef = useRef(onEnter);
  useEffect(() => {
    valueRef.current = value;
    enterRef.current = onEnter;
  });

  const reject = () => {
    // Haptic only: an error chime on every extra digit would get old fast.
    feedbackTap({ impact: "error", silent: true });
    setShake((n) => n + 1);
  };

  const press = (key: string) => {
    const next = applyKey(valueRef.current, key, decimals);
    if (next == null || (key === "back" && !valueRef.current)) return reject();
    feedbackTap({ impact: "light", silent: true });
    valueRef.current = next;
    setValue(next);
  };

  const set = (v: string) => {
    valueRef.current = v;
    setValue(v);
  };

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, [contenteditable=true]")) return;
      const k = e.key === "Backspace" ? "back" : e.key === "Delete" ? "clear" : e.key === "," ? "." : e.key;
      if (e.key === "Enter") {
        // A focused keypad key handles its own Enter.
        if (t?.closest("button")) return;
        e.preventDefault();
        enterRef.current();
        return;
      }
      if (/^[\d.]$/.test(k) || k === "back" || k === "clear") {
        e.preventDefault();
        const next = applyKey(valueRef.current, k, decimals);
        if (next == null) return reject();
        valueRef.current = next;
        setValue(next);
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, [contenteditable=true]")) return;
      const text = e.clipboardData?.getData("text") ?? "";
      const next = cleanAmount(text, decimals);
      if (!next) return reject();
      e.preventDefault();
      valueRef.current = next;
      setValue(next);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, [active, decimals]);

  return { value, set, press, shake, reject };
}
