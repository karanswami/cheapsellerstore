"use client";

import { useState } from "react";
import { Check, Copy, Download, Eye, EyeOff, KeyRound, Loader2, Smartphone } from "lucide-react";
import { feedbackTap } from "@/lib/feedback";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export type OrderKeyItem = {
  id: string;
  productTitle: string;
  durationLabel: string;
  price: string;
  code: string | null;
  image: string | null;
  androidId: string | null;
  deviceLabel: string;
};

function mask(code: string) {
  return code.length <= 8
    ? "•".repeat(code.length)
    : `${code.slice(0, 4)}${"•".repeat(Math.min(14, code.length - 8))}${code.slice(-4)}`;
}

async function copyText(text: string, msg: string) {
  try {
    await navigator.clipboard.writeText(text);
    feedbackTap({ impact: "success", silent: true });
    toast.success(msg);
    return true;
  } catch {
    toast.error("Copy failed");
    return false;
  }
}

/** Small pill that copies a value; used for the order reference and ID rows. */
export function CopyChip({ value, label, msg, className }: { value: string; label: React.ReactNode; msg: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(value, msg)) {
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        }
      }}
      className={cn("tap inline-flex min-w-0 items-center gap-1.5 font-mono", className)}
    >
      <span className="truncate">{label}</span>
      {done ? <Check className="size-3.5 shrink-0 text-success" strokeWidth={3} /> : <Copy className="size-3.5 shrink-0 opacity-60" />}
    </button>
  );
}

/** Keys of one order as tear-off tickets: masked until revealed, tap the code to copy. */
export function OrderKeys({ items, orderRef }: { items: OrderKeyItem[]; orderRef: string }) {
  const [shown, setShown] = useState<Set<string>>(() => new Set(items.length === 1 ? [items[0].id] : []));
  const [copied, setCopied] = useState<string | null>(null);
  const ready = items.filter((i) => i.code);
  const allShown = ready.length > 0 && ready.every((i) => shown.has(i.id));

  const toggle = (id: string) => {
    feedbackTap({ impact: "selection", silent: true });
    setShown((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const copyOne = async (it: OrderKeyItem) => {
    if (!it.code || !(await copyText(it.code, "Key copied"))) return;
    setCopied(it.id);
    setTimeout(() => setCopied((c) => (c === it.id ? null : c)), 1500);
  };

  const lines = ready.map((i) => `${i.productTitle} (${i.durationLabel}): ${i.code}`).join("\n");

  return (
    <section aria-label="Your keys">
      <div className="mb-3 flex items-center justify-between gap-3 px-0.5">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <KeyRound className="size-4 text-amber-300" />
          {items.length > 1 ? `Your keys · ${items.length}` : "Your key"}
        </h2>
        {ready.length > 1 ? (
          <button
            type="button"
            onClick={() => {
              feedbackTap({ impact: "selection", silent: true });
              setShown(allShown ? new Set() : new Set(ready.map((i) => i.id)));
            }}
            className="tap flex items-center gap-1 text-xs font-semibold text-primary"
          >
            {allShown ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />} {allShown ? "Hide all" : "Show all"}
          </button>
        ) : null}
      </div>

      <ul className="space-y-3">
        {items.map((it, idx) => {
          const visible = shown.has(it.id);
          return (
            <li
              key={it.id}
              style={{ "--d": `${80 + idx * 70}ms` } as React.CSSProperties}
              className="anim-fade-up relative overflow-hidden rounded-3xl border border-white/[0.06] bg-card/80 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]"
            >
              <div className="flex items-center gap-3 p-4">
                {it.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.image} alt="" className="size-12 shrink-0 rounded-2xl bg-muted object-cover ring-1 ring-white/10" />
                ) : (
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400/30 to-amber-400/5 text-amber-300 ring-1 ring-inset ring-amber-300/25">
                    <KeyRound className="size-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold leading-tight">{it.productTitle}</p>
                  <p className="mt-1 inline-flex rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {it.durationLabel}
                  </p>
                </div>
                <p className="shrink-0 font-display font-bold tabular-nums">{it.price}</p>
              </div>

              {/* tear line */}
              <div aria-hidden className="relative mx-4 border-t border-dashed border-white/10">
                <span className="absolute -left-[1.6rem] -top-2.5 size-5 rounded-full bg-background" />
                <span className="absolute -right-[1.6rem] -top-2.5 size-5 rounded-full bg-background" />
              </div>

              <div className="p-4">
                {it.code ? (
                  <div className="flex items-stretch gap-2">
                    <button
                      type="button"
                      onClick={() => copyOne(it)}
                      aria-label={`Copy key for ${it.productTitle}`}
                      className="tap min-w-0 flex-1 rounded-2xl border border-amber-300/25 bg-gradient-to-br from-amber-300/15 via-amber-300/5 to-transparent px-4 py-3 text-left"
                    >
                      <span className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/80">
                        License key
                        <span className={cn("flex items-center gap-1 normal-case tracking-normal", copied === it.id ? "text-success" : "text-primary")}>
                          {copied === it.id ? <Check className="size-3.5" strokeWidth={3} /> : <Copy className="size-3.5" />}
                          {copied === it.id ? "Copied" : "Tap to copy"}
                        </span>
                      </span>
                      <span className={cn("mt-1.5 block break-all font-mono text-[15px] font-semibold leading-relaxed", !visible && "tracking-wider text-foreground/70")}>
                        {visible ? it.code : mask(it.code)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(it.id)}
                      aria-label={visible ? "Hide key" : "Show key"}
                      aria-pressed={visible}
                      className="tap grid w-12 shrink-0 place-items-center rounded-2xl bg-muted/70 text-foreground/80"
                    >
                      {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 rounded-2xl bg-warning/10 px-4 py-3.5 text-sm font-medium text-warning">
                    <Loader2 className="size-4 animate-spin" /> Your key is being prepared…
                  </p>
                )}
                {it.androidId ? (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Smartphone className="size-3.5 shrink-0" /> Locked to {it.deviceLabel}
                    <code className="truncate font-mono text-foreground">{it.androidId}</code>
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {ready.length > 1 ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => copyText(lines, `${ready.length} keys copied`)}
            className="tap flex h-12 items-center justify-center gap-2 rounded-2xl bg-muted/70 text-sm font-semibold"
          >
            <Copy className="size-4" /> Copy all
          </button>
          <button
            type="button"
            onClick={() => {
              const a = document.createElement("a");
              a.href = URL.createObjectURL(new Blob([lines + "\n"], { type: "text/plain" }));
              a.download = `order-${orderRef}-keys.txt`;
              a.click();
              URL.revokeObjectURL(a.href);
              feedbackTap({ impact: "success", silent: true });
            }}
            className="tap flex h-12 items-center justify-center gap-2 rounded-2xl bg-muted/70 text-sm font-semibold"
          >
            <Download className="size-4" /> Save .txt
          </button>
        </div>
      ) : null}
    </section>
  );
}
