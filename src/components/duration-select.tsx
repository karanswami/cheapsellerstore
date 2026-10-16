"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { formatDurationLabel, type DurationOption } from "@/types/product";

type Props = {
  options: DurationOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function DurationSelect({ options, value, onChange, disabled, onOpenChange }: Props) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.id === value);

  function toggle(next: boolean) {
    if (next && btn.current) {
      const r = btn.current.getBoundingClientRect();
      setUp(window.innerHeight - r.bottom < Math.min(280, options.length * 60 + 16) && r.top > window.innerHeight - r.bottom);
      setActive(options.findIndex((o) => o.id === value));
    }
    setOpen(next);
    onOpenChange?.(next);
  }

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) {
        setOpen(false);
        onOpenChange?.(false);
      }
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open, onOpenChange]);

  function pick(o: DurationOption) {
    if (o.stock <= 0 || o.price == null) return;
    onChange(o.id);
    toggle(false);
    btn.current?.focus();
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        toggle(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      toggle(false);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const dir = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a + dir + options.length) % options.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (options[active]) pick(options[active]);
    }
  }

  return (
    <div ref={root} className="relative" onKeyDown={onKey}>
      <button
        ref={btn}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => toggle(!open)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-background px-3.5 text-left text-sm font-semibold transition-colors",
          open ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/50",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="truncate">{selected ? formatDurationLabel(selected) : "Select duration"}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            "anim-pop-in absolute inset-x-0 z-40 max-h-64 overflow-y-auto rounded-xl border bg-popover p-1 shadow-xl",
            up ? "bottom-full mb-1.5" : "top-full mt-1.5",
          )}
        >
          {options.map((o, i) => {
            const out = o.stock <= 0 || o.price == null;
            const sale = o.listPrice != null && o.price != null && o.listPrice > o.price;
            return (
              <li key={o.id} role="option" aria-selected={o.id === value} aria-disabled={out}>
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={out}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(o)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    i === active && !out && "bg-muted",
                    o.id === value && "bg-primary/10",
                    out && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span className="grid size-4 shrink-0 place-items-center">
                    {o.id === value ? <Check className="size-4 text-primary" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{formatDurationLabel(o)}</span>
                    <span className={cn("block text-[11px]", out ? "text-destructive" : o.stock <= 5 ? "text-warning" : "text-success")}>
                      {out ? "Out of stock" : o.stock <= 5 ? `Only ${o.stock} left` : "In stock"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-display font-bold tabular-nums">
                      {o.price != null ? formatMoney(o.price, o.currency) : "—"}
                    </span>
                    {sale ? (
                      <span className="block text-[11px] text-muted-foreground line-through">
                        {formatMoney(o.listPrice!, o.currency)}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
