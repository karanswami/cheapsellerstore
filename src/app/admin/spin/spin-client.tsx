"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Frown, KeyRound, Pencil, Plus, RotateCcw, TicketPercent, Trash2, Wallet } from "lucide-react";
import { Field, SubmitButton, TableSkeleton, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { MiniStats, MoveButtons } from "@/components/admin/content-kit";
import { WheelPointer, WheelSvg, slotColor } from "@/components/spin-wheel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { microcentsToUsd } from "@/lib/currencies";
import type { DurationOption, SpinKind, SpinPrizeAdmin } from "@/lib/spin";
import { cn } from "@/lib/utils";

type Data = {
  enabled: boolean;
  winPct: number;
  prizes: SpinPrizeAdmin[];
  durations: DurationOption[];
  stats: { granted: number; used: number; pending: number };
};

type Row = {
  key: string;
  kind: SpinKind;
  label: string;
  durationId: string;
  quantity: string;
  walletUsd: string;
  couponMode: "percent" | "amount";
  couponPercent: string;
  couponUsd: string;
  couponDays: string;
  weight: string;
  active: boolean;
};

const MIN_SLOTS = 1;
const MAX_SLOTS = 8;
const LOSE = "Better luck next time";
const SELECT = "h-9 w-full rounded-md border bg-background px-2.5 text-sm";

const KINDS: { v: SpinKind; label: string; hint: string; icon: typeof KeyRound }[] = [
  { v: "KEY", label: "Key", hint: "License key from stock", icon: KeyRound },
  { v: "WALLET", label: "Wallet", hint: "Credit added to wallet", icon: Wallet },
  { v: "COUPON", label: "Coupon", hint: "One-time discount code", icon: TicketPercent },
  { v: "SPIN", label: "Extra spins", hint: "More free spins", icon: RotateCcw },
  { v: "NONE", label: "No prize", hint: "Try again next time", icon: Frown },
];
const KIND = Object.fromEntries(KINDS.map((k) => [k.v, k])) as Record<SpinKind, (typeof KINDS)[number]>;

let seq = 0;
const newKey = () => `n${++seq}`;

function toRow(p: SpinPrizeAdmin): Row {
  return {
    key: p.id,
    kind: p.kind,
    label: p.label,
    durationId: p.durationId ?? "",
    quantity: String(p.quantity),
    walletUsd: p.walletAmount ? String(microcentsToUsd(p.walletAmount)) : "",
    couponMode: p.couponPercent > 0 || !p.couponAmount ? "percent" : "amount",
    couponPercent: p.couponPercent ? String(p.couponPercent) : "",
    couponUsd: p.couponAmount ? String(microcentsToUsd(p.couponAmount)) : "",
    couponDays: String(p.couponDays || 7),
    weight: String(p.weight),
    active: p.active,
  };
}

const num = (v: string) => Number(v) || 0;
const qty = (r: Row) => Math.max(1, Math.floor(num(r.quantity) || 1));

function autoLabel(r: Row, durations: DurationOption[]) {
  switch (r.kind) {
    case "NONE":
      return LOSE;
    case "WALLET":
      return num(r.walletUsd) > 0 ? `$${num(r.walletUsd).toFixed(2)} Wallet` : "";
    case "COUPON":
      if (r.couponMode === "percent") return num(r.couponPercent) > 0 ? `${num(r.couponPercent)}% Coupon` : "";
      return num(r.couponUsd) > 0 ? `$${num(r.couponUsd).toFixed(2)} Coupon` : "";
    case "SPIN":
      return `+${qty(r)} Spin${qty(r) > 1 ? "s" : ""}`;
    case "KEY": {
      const d = durations.find((x) => x.id === r.durationId);
      return d ? `${d.productTitle} ${d.label}` : "";
    }
  }
}

function problem(r: Row): string | null {
  if (!r.active) return null;
  if (r.kind === "KEY" && !r.durationId) return "Pick a product and duration.";
  if (r.kind === "WALLET" && !(num(r.walletUsd) > 0)) return "Enter a wallet amount.";
  if (r.kind === "COUPON" && !(r.couponMode === "percent" ? num(r.couponPercent) > 0 : num(r.couponUsd) > 0)) return "Enter a coupon discount.";
  return null;
}

export function SpinAdmin() {
  const { data, loading, reload } = useAdminQuery<Data>("/api/admin/spin");
  if (loading && !data) return <TableSkeleton rows={4} />;
  if (!data) return null;
  // Remount on fresh data so the "unsaved changes" baseline resets after a save.
  return <SpinForm key={JSON.stringify([data.enabled, data.winPct, data.prizes])} data={data} reload={reload} />;
}

function SpinForm({ data, reload }: { data: Data; reload: () => void }) {
  const initial = useMemo(() => ({ enabled: data.enabled, winPct: String(data.winPct), rows: data.prizes.map(toRow) }), [data]);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [winPct, setWinPct] = useState(initial.winPct);
  const [rows, setRows] = useState<Row[]>(initial.rows);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dirty = JSON.stringify([enabled, winPct, rows]) !== JSON.stringify([initial.enabled, initial.winPct, initial.rows]);
  const stockOf = (id: string) => data.durations.find((d) => d.id === id)?.stock ?? 0;
  const labelOf = (r: Row) => r.label.trim() || autoLabel(r, data.durations) || "Untitled";

  const weightOf = (r: Row) => (r.active ? Math.max(0, Math.floor(num(r.weight))) : 0);
  const winW = rows.reduce((s, r) => s + (r.kind !== "NONE" ? weightOf(r) : 0), 0);
  const loseW = rows.reduce((s, r) => s + (r.kind === "NONE" ? weightOf(r) : 0), 0);
  const pctNum = Math.min(100, Math.max(0, Math.round(num(winPct))));
  // Mirrors performSpin: an empty group hands its share to the other one.
  const winShare = winW === 0 ? 0 : loseW === 0 ? 100 : pctNum;
  const slotPct = (r: Row) => {
    const w = weightOf(r);
    if (r.kind === "NONE") return loseW > 0 ? ((100 - winShare) * w) / loseW : 0;
    return winW > 0 ? (winShare * w) / winW : 0;
  };
  const errors = rows.filter((r) => problem(r)).length;

  function update(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function move(i: number, d: -1 | 1) {
    setRows((rs) => {
      const next = [...rs];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
  }
  function add() {
    const key = newKey();
    setRows((rs) => [
      ...rs,
      { key, kind: "NONE", label: LOSE, durationId: "", quantity: "1", walletUsd: "", couponMode: "percent", couponPercent: "", couponUsd: "", couponDays: "7", weight: "10", active: true },
    ]);
    setEditing(key);
  }

  async function save() {
    const badIndex = rows.findIndex((r) => problem(r));
    if (badIndex >= 0) {
      setEditing(rows[badIndex].key);
      return toast.error(`Slot ${badIndex + 1}: ${problem(rows[badIndex])}`);
    }
    setBusy(true);
    try {
      await adminFetch("/api/admin/spin", {
        method: "PUT",
        json: {
          enabled,
          winPct: pctNum,
          prizes: rows.map((r) => ({
            kind: r.kind,
            label: r.label.trim() || autoLabel(r, data.durations),
            durationId: r.kind === "KEY" ? r.durationId || null : null,
            quantity: Math.min(100, qty(r)),
            walletUsd: num(r.walletUsd),
            couponPercent: r.couponMode === "percent" ? num(r.couponPercent) : 0,
            couponUsd: r.couponMode === "amount" ? num(r.couponUsd) : 0,
            couponDays: Math.min(365, Math.max(1, Math.floor(num(r.couponDays) || 7))),
            weight: Math.max(0, Math.floor(num(r.weight))),
            active: r.active,
          })),
        },
      });
      toast.success("Spin wheel saved.");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const preview = rows.map((r, i) => ({ slot: i, kind: r.kind, label: labelOf(r), quantity: r.kind === "KEY" ? qty(r) : 1 }));
  const editRow = rows.find((r) => r.key === editing) ?? null;

  function detail(r: Row): React.ReactNode {
    switch (r.kind) {
      case "KEY": {
        const d = data.durations.find((x) => x.id === r.durationId);
        if (!d) return <span className="text-destructive">No product selected</span>;
        const low = stockOf(r.durationId) < qty(r);
        return (
          <>
            {qty(r)}× {d.productTitle} {d.label} ·{" "}
            <span className={cn(low && "font-medium text-amber-600")}>{low ? `only ${stockOf(r.durationId)} in stock` : `${stockOf(r.durationId)} in stock`}</span>
          </>
        );
      }
      case "WALLET":
        return `$${num(r.walletUsd).toFixed(2)} credited to wallet`;
      case "COUPON":
        return `${r.couponMode === "percent" ? `${num(r.couponPercent)}%` : `$${num(r.couponUsd).toFixed(2)}`} off · one-time code · ${num(r.couponDays) || 7} days`;
      case "SPIN":
        return `+${qty(r)} free spin${qty(r) > 1 ? "s" : ""}`;
      default:
        return "Nothing is given";
    }
  }

  return (
    <div className="space-y-5 pb-20">
      <MiniStats
        items={[
          { label: "Spins granted", value: data.stats.granted },
          { label: "Spins used", value: data.stats.used },
          { label: "Waiting to spin", value: data.stats.pending, tone: "success" },
          { label: "Win chance", value: `${winShare}%` },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* wheel + global settings */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="bg-[radial-gradient(120%_85%_at_50%_0%,#3b1d6e_0%,#1b1038_55%,#0b0718_100%)] px-6 pb-6 pt-8 sm:px-8">
              <div className="relative mx-auto max-w-[17rem]">
                <WheelPointer />
                <WheelSvg prizes={preview} />
              </div>
            </div>
            <div className="divide-y">
              <label className="flex cursor-pointer items-center justify-between gap-3 p-4">
                <span>
                  <span className="block text-sm font-medium">Wheel live</span>
                  <span className="block text-xs text-muted-foreground">Users earn &amp; use spins.</span>
                </span>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </label>
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block text-sm font-medium">Win chance</span>
                    <span className="block text-xs text-muted-foreground">Share of spins that land on a prize.</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Input type="number" min={0} max={100} className="h-8 w-16 text-right" value={winPct} onChange={(e) => setWinPct(e.target.value)} />
                    <span className="text-sm font-semibold">%</span>
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={pctNum}
                  onChange={(e) => setWinPct(e.target.value)}
                  className="mt-3 w-full accent-[var(--primary)]"
                  aria-label="Win chance"
                />
                {winW > 0 && loseW === 0 ? (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-600">
                    <AlertTriangle className="mt-px size-3.5 shrink-0" /> No “No prize” slot — every spin wins.
                  </p>
                ) : null}
                {winW === 0 ? (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-600">
                    <AlertTriangle className="mt-px size-3.5 shrink-0" /> Add a prize slot or the wheel stays hidden.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            A referrer gets 1 spin when a friend they invited makes their <b>first deposit</b>.
          </p>
        </div>

        {/* slots */}
        <div className="rounded-2xl border bg-card">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <p className="font-display font-bold">Slots</p>
              <p className="text-xs text-muted-foreground">
                {rows.length} of {MAX_SLOTS} · clockwise from the top
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={add} disabled={rows.length >= MAX_SLOTS}>
              <Plus /> Add slot
            </Button>
          </div>

          <ul className="divide-y">
            {rows.map((r, i) => {
              const K = KIND[r.kind];
              const err = problem(r);
              return (
                <li key={r.key} className={cn("group flex items-center gap-2 px-2 py-3 sm:gap-3 sm:px-4", !r.active && "opacity-55")}>
                  <MoveButtons className="shrink-0" onUp={() => move(i, -1)} onDown={() => move(i, 1)} disableUp={i === 0} disableDown={i === rows.length - 1} />
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white shadow-inner sm:size-9"
                    style={{ background: slotColor(i, r.kind) }}
                  >
                    {i + 1}
                  </span>
                  <button type="button" onClick={() => setEditing(r.key)} className="min-w-0 flex-1 text-left">
                    <span className="flex items-center gap-2">
                      <K.icon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-semibold">{labelOf(r)}</span>
                    </span>
                    <span className={cn("mt-0.5 block truncate text-xs", err ? "text-destructive" : "text-muted-foreground")}>{err ?? detail(r)}</span>
                    <span className="mt-0.5 block text-xs font-semibold tabular-nums sm:hidden">{slotPct(r).toFixed(1)}% chance</span>
                  </button>
                  <span className="hidden w-14 shrink-0 text-right text-sm font-semibold tabular-nums sm:block">{slotPct(r).toFixed(1)}%</span>
                  <Switch className="shrink-0" checked={r.active} onCheckedChange={(v) => update(r.key, { active: v })} aria-label="Active" />
                  <div className="flex shrink-0">
                    <Button variant="ghost" size="icon-sm" className="hidden sm:inline-flex" onClick={() => setEditing(r.key)} aria-label="Edit slot">
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                      disabled={rows.length <= MIN_SLOTS}
                      aria-label="Remove slot"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          {rows.length < MAX_SLOTS ? (
            <button
              type="button"
              onClick={add}
              className="m-3 flex w-[calc(100%-1.5rem)] items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <Plus className="size-4" /> Add slot
            </button>
          ) : null}
        </div>
      </div>

      {/* save bar */}
      {dirty ? (
        <div className="anim-sheet-up fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[calc(100%-1.5rem)] max-w-xl items-center justify-between gap-2 rounded-2xl border bg-neutral-950 px-3 py-2.5 text-white shadow-2xl sm:w-[calc(100%-2rem)] sm:gap-3 sm:px-4 sm:py-3">
          <span className="min-w-0 text-sm leading-tight">
            Unsaved changes
            {errors ? (
              <span className="block text-xs text-red-300 sm:inline sm:text-sm">
                <span className="hidden sm:inline"> · </span>
                {errors} slot{errors > 1 ? "s" : ""} need attention
              </span>
            ) : null}
          </span>
          <span className="flex shrink-0 gap-1.5 sm:gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={() => {
                setEnabled(initial.enabled);
                setWinPct(initial.winPct);
                setRows(initial.rows);
              }}
            >
              Discard
            </Button>
            <SubmitButton size="sm" busy={busy} onClick={save}>
              Save wheel
            </SubmitButton>
          </span>
        </div>
      ) : null}

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditing(null)}>
        {editRow ? (
          <SlotEditor
            row={editRow}
            index={rows.indexOf(editRow)}
            durations={data.durations}
            onChange={(p) => update(editRow.key, p)}
            onDone={() => setEditing(null)}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

function SlotEditor({
  row: r,
  index,
  durations,
  onChange,
  onDone,
}: {
  row: Row;
  index: number;
  durations: DurationOption[];
  onChange: (p: Partial<Row>) => void;
  onDone: () => void;
}) {
  const products = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of durations) m.set(d.productId, d.productTitle);
    return [...m].sort((a, b) => a[1].localeCompare(b[1]));
  }, [durations]);
  const productId = durations.find((d) => d.id === r.durationId)?.productId ?? "";
  const err = problem(r);

  /** Apply a patch and refresh the label too when it was auto-generated. */
  function set(p: Partial<Row>) {
    const wasAuto = !r.label.trim() || r.label === autoLabel(r, durations);
    const next = { ...r, ...p };
    onChange(wasAuto ? { ...p, label: autoLabel(next, durations) } : p);
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full text-xs font-bold text-white" style={{ background: slotColor(index, r.kind) }}>
            {index + 1}
          </span>
          Slot {index + 1}
        </DialogTitle>
        <DialogDescription>Choose what this slot gives and how often it comes up.</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {KINDS.map((k) => (
          <button
            key={k.v}
            type="button"
            onClick={() => set({ kind: k.v })}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition-colors",
              r.kind === k.v ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <k.icon className="size-5" />
            <span className="text-xs font-semibold">{k.label}</span>
          </button>
        ))}
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">{KIND[r.kind].hint}</p>

      <div className="grid gap-3">
        {r.kind === "KEY" ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_5rem]">
            <Field label="Product">
              <select
                className={SELECT}
                value={productId}
                onChange={(e) => set({ durationId: durations.find((d) => d.productId === e.target.value)?.id ?? "" })}
              >
                <option value="">Select…</option>
                {products.map(([id, title]) => (
                  <option key={id} value={id}>
                    {title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Duration">
              <select className={SELECT} value={r.durationId} disabled={!productId} onChange={(e) => set({ durationId: e.target.value })}>
                {durations
                  .filter((d) => d.productId === productId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label} ({d.stock})
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Keys">
              <Input type="number" min={1} max={100} value={r.quantity} onChange={(e) => set({ quantity: e.target.value })} />
            </Field>
          </div>
        ) : null}

        {r.kind === "WALLET" ? (
          <Field label="Wallet credit (USD)">
            <div className="flex flex-wrap items-center gap-2">
              <Input type="number" min={0.01} step="0.01" className="w-28" value={r.walletUsd} onChange={(e) => set({ walletUsd: e.target.value })} placeholder="0.50" />
              {["0.10", "0.50", "1", "5"].map((v) => (
                <button key={v} type="button" onClick={() => set({ walletUsd: v })} className="h-8 rounded-full border px-3 text-xs text-muted-foreground hover:bg-muted">
                  ${v}
                </button>
              ))}
            </div>
          </Field>
        ) : null}

        {r.kind === "COUPON" ? (
          <div className="grid gap-3 sm:grid-cols-[auto_1fr_6rem]">
            <Field label="Type">
              <div className="inline-flex h-9 rounded-md border p-0.5">
                {(["percent", "amount"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set({ couponMode: m })}
                    className={cn("rounded px-3 text-sm font-medium", r.couponMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                  >
                    {m === "percent" ? "% off" : "$ off"}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={r.couponMode === "percent" ? "Discount (%)" : "Discount (USD)"}>
              {r.couponMode === "percent" ? (
                <Input type="number" min={1} max={100} value={r.couponPercent} onChange={(e) => set({ couponPercent: e.target.value })} placeholder="10" />
              ) : (
                <Input type="number" min={0.01} step="0.01" value={r.couponUsd} onChange={(e) => set({ couponUsd: e.target.value })} placeholder="1.00" />
              )}
            </Field>
            <Field label="Valid (days)">
              <Input type="number" min={1} max={365} value={r.couponDays} onChange={(e) => onChange({ couponDays: e.target.value })} />
            </Field>
          </div>
        ) : null}

        {r.kind === "SPIN" ? (
          <Field label="Extra spins">
            <div className="flex flex-wrap items-center gap-2">
              {["1", "2", "3", "5"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set({ quantity: v })}
                  className={cn("h-9 min-w-12 rounded-lg border px-3 text-sm font-semibold", r.quantity === v ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}
                >
                  +{v}
                </button>
              ))}
              <Input type="number" min={1} max={100} className="w-20" value={r.quantity} onChange={(e) => set({ quantity: e.target.value })} />
            </div>
          </Field>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
          <Field label="Text on wheel">
            <Input value={r.label} maxLength={60} onChange={(e) => onChange({ label: e.target.value })} placeholder={autoLabel(r, durations) || "Auto"} />
          </Field>
          <Field label="Weight" hint="Within its group">
            <Input type="number" min={0} value={r.weight} onChange={(e) => onChange({ weight: e.target.value })} />
          </Field>
        </div>
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
      </div>

      <DialogFooter>
        <Button onClick={onDone}>Done</Button>
      </DialogFooter>
    </DialogContent>
  );
}
