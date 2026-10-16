"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Eraser, Save, Search, Trash2, X } from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import { Chips, ConfirmDialog, SearchBox, SubmitButton, TableSkeleton, adminFetch, errMsg, useAdminQuery, useDebounced } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserSearchPicker } from "./picker";
import { cn } from "@/lib/utils";
import { formatMoney, microcentsToUsd } from "@/lib/currencies";

export type PickedUser = { id: string; username: string; email: string; role: string };
type OverviewUser = PickedUser & { count: number; savedMc: number };
type Dur = { id: string; label: string; retailPrice: number | null; resellerPrice: number | null; specialPrice: number | null };
type Prod = { id: string; title: string; specialCount: number; durations: Dur[] };

const usd = (mc: number) => String(Math.round(microcentsToUsd(mc) * 100) / 100);

export function PriceDesk({ user, onUser, onChanged }: { user: PickedUser | null; onUser: (u: PickedUser | null) => void; onChanged: () => void }) {
  return user ? <Workspace key={user.id} user={user} onBack={() => onUser(null)} onChanged={onChanged} /> : <UserPicker onPick={onUser} />;
}

/* ───────────────────────── user picker ───────────────────────── */

function UserPicker({ onPick }: { onPick: (u: PickedUser) => void }) {
  const ov = useAdminQuery<{ users: OverviewUser[] }>("/api/admin/special-prices/overview");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-display text-lg font-semibold">Add special price</h3>
        <p className="mb-3 text-sm text-muted-foreground">Select a user to set the exact price they pay for each product.</p>
        <UserSearchPicker value={null} onPick={onPick} large placeholder="Select or search a user…" />
      </div>
      <div className="rounded-xl border bg-card">
        <p className="border-b px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Users with special prices</p>
        {ov.loading && !ov.data ? (
          <TableSkeleton rows={4} />
        ) : !ov.data?.users.length ? (
          <div className="p-6">
            <EmptyState icon={Search} title="No special prices yet" hint="Select a user above to give them their first custom price." />
          </div>
        ) : (
          <ul className="divide-y">
            {ov.data.users.map((u) => (
              <UserRow key={u.id} u={u} count={u.count} saved={u.savedMc} onPick={onPick} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function UserRow({ u, count, saved, onPick }: { u: PickedUser; count: number; saved?: number; onPick: (u: PickedUser) => void }) {
  return (
    <li>
      <button type="button" onClick={() => onPick(u)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">@{u.username}</span>
          <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {saved ? <span className="text-xs text-muted-foreground">{formatMoney(saved)} below retail</span> : null}
          <Badge variant="muted">{u.role}</Badge>
          <Badge variant={count ? "success" : "default"}>{count} deal{count === 1 ? "" : "s"}</Badge>
        </span>
      </button>
    </li>
  );
}

/* ───────────────────────── workspace ───────────────────────── */

function Workspace({ user, onBack, onChanged }: { user: PickedUser; onBack: () => void; onChanged: () => void }) {
  const [tab, setTab] = useState<"set" | "active">("set");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState("");
  const catalog = useAdminQuery<{ products: Prod[] }>(`/api/admin/special-prices/catalog?userId=${user.id}&limit=200`);
  /** Unsaved edits: durationId → USD string ("" = clear). */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [copying, setCopying] = useState(false);

  const all = useMemo(() => catalog.data?.products ?? [], [catalog.data]);
  const shown = useMemo(() => all.filter((p) => p.title.toLowerCase().includes(q.trim().toLowerCase())), [all, q]);
  const product = all.find((p) => p.id === sel) ?? shown[0] ?? null;
  const activeRows = useMemo(() => all.flatMap((p) => p.durations.filter((d) => d.specialPrice != null).map((d) => ({ p, d }))), [all]);
  const dirty = Object.keys(drafts);
  const dirtyIn = (p: Prod) => p.durations.some((d) => d.id in drafts);

  function setDraft(d: Dur, v: string) {
    setDrafts((cur) => {
      const next = { ...cur };
      const same = v !== "" ? d.specialPrice != null && Number(v) === Number(usd(d.specialPrice)) : d.specialPrice == null;
      if (same) delete next[d.id];
      else next[d.id] = v;
      return next;
    });
  }

  async function reloadAll() {
    setDrafts({});
    catalog.reload();
    onChanged();
  }

  async function save() {
    const set: { durationId: string; priceUsd: number }[] = [];
    const clear: string[] = [];
    for (const id of dirty) {
      const v = drafts[id];
      if (v === "") clear.push(id);
      else if (Number(v) >= 0 && Number.isFinite(Number(v))) set.push({ durationId: id, priceUsd: Number(v) });
      else return toast.error("Fix the invalid price before saving.");
    }
    setBusy(true);
    try {
      const r = await adminFetch<{ saved: number; cleared: number }>("/api/admin/special-prices/bulk", { method: "POST", json: { userId: user.id, set, clear } });
      toast.success(`${r.saved} saved, ${r.cleared} cleared.`);
      await reloadAll();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Back to users">
            <ArrowLeft />
          </Button>
          <div>
            <p className="font-display text-lg font-semibold leading-tight">@{user.username}</p>
            <p className="text-xs text-muted-foreground">
              {user.email} · {user.role}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setCopying(true)}>
            <Copy /> Copy from user
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirmAll(true)} disabled={!activeRows.length}>
            <Eraser /> Clear all
          </Button>
        </div>
      </div>

      <Chips
        value={tab}
        onChange={setTab}
        options={[
          { v: "set", label: "Set prices" },
          { v: "active", label: `This user's special prices (${activeRows.length})` },
        ]}
      />

      {catalog.loading && !catalog.data ? (
        <TableSkeleton />
      ) : tab === "active" ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          {activeRows.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Search} title="No special prices" hint="Use “Set prices” to give this user a custom price." />
            </div>
          ) : (
            <ul className="divide-y">
              {activeRows.map(({ p, d }) => (
                <DurationRow key={d.id} d={d} title={p.title} draft={drafts[d.id]} onChange={(v) => setDraft(d, v)} />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="rounded-xl border bg-card p-2">
            <SearchBox value={q} onChange={setQ} placeholder={`Filter ${all.length} products…`} />
            <ul className="mt-2 max-h-[60vh] space-y-0.5 overflow-y-auto">
              {shown.map((p) => {
                const n = p.durations.filter((d) => (d.id in drafts ? drafts[d.id] !== "" : d.specialPrice != null)).length;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSel(p.id)}
                      className={cn("flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent", product?.id === p.id && "bg-primary/10 font-medium text-primary")}
                    >
                      <span className="truncate">{p.title}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {dirtyIn(p) ? <span className="size-2 rounded-full bg-warning" title="Unsaved" /> : null}
                        {n ? <Badge variant="success">{n}</Badge> : <span className="text-xs text-muted-foreground">{p.durations.length}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
              {shown.length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted-foreground">No products match.</li> : null}
            </ul>
          </div>
          <div className="overflow-hidden rounded-xl border bg-card">
            {product ? (
              <>
                <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2.5">
                  <p className="truncate text-sm font-semibold">{product.title}</p>
                  <span className="text-xs text-muted-foreground">{product.durations.length} durations</span>
                </div>
                <ul className="max-h-[60vh] divide-y overflow-y-auto">
                  {product.durations.map((d) => (
                    <DurationRow key={d.id} d={d} draft={drafts[d.id]} onChange={(v) => setDraft(d, v)} />
                  ))}
                </ul>
              </>
            ) : (
              <div className="p-6">
                <EmptyState icon={Search} title="Pick a product" hint="Choose a product on the left to set prices for its durations." />
              </div>
            )}
          </div>
        </div>
      )}

      {dirty.length > 0 ? (
        <div className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-[calc(100%-2rem)] max-w-xl items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-lg">
          <p className="text-sm">
            <span className="font-semibold">{dirty.length}</span> unsaved change{dirty.length === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDrafts({})}>
              <X /> Discard
            </Button>
            <SubmitButton busy={busy} size="sm" onClick={save}>
              <Save /> Save changes
            </SubmitButton>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title={`Clear every special price for @${user.username}?`}
        description="They go back to normal prices on all products. This is logged in History."
        confirmLabel="Clear all"
        destructive
        onConfirm={async () => {
          try {
            const r = await adminFetch<{ cleared: number }>("/api/admin/special-prices/bulk", { method: "POST", json: { userId: user.id, clearAll: true } });
            toast.success(`${r.cleared} special price${r.cleared === 1 ? "" : "s"} cleared.`);
            await reloadAll();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
      <Dialog open={copying} onOpenChange={setCopying}>
        <DialogContent className="max-w-lg">{copying ? <CopyFrom target={user} onDone={() => { setCopying(false); void reloadAll(); }} /> : null}</DialogContent>
      </Dialog>
    </div>
  );
}

function DurationRow({ d, title, draft, onChange }: { d: Dur; title?: string; draft: string | undefined; onChange: (v: string) => void }) {
  const edited = draft !== undefined;
  const value = edited ? draft : d.specialPrice != null ? usd(d.specialPrice) : "";

  return (
    <li className={cn("grid items-center gap-2 px-4 py-2.5 sm:grid-cols-[1fr_auto_auto]", edited && "bg-primary/5")}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title ? `${title} · ${d.label}` : d.label}</p>
        <p className="text-xs text-muted-foreground">
          Retail {d.retailPrice != null ? formatMoney(d.retailPrice) : "—"}
          {d.resellerPrice != null ? ` · Reseller ${formatMoney(d.resellerPrice)}` : ""}
        </p>
      </div>
      <div className="relative w-32">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
        <Input type="number" min="0" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Normal" className={cn("pl-6", d.specialPrice != null && !edited && "border-success/50")} />
      </div>
      <div className="flex w-10 items-center justify-end gap-1">
        {value !== "" ? (
          <Button variant="ghost" size="icon-sm" onClick={() => onChange("")} aria-label="Remove special price">
            <Trash2 />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

/* ───────────────────────── copy from user ───────────────────────── */

function CopyFrom({ target, onDone }: { target: PickedUser; onDone: () => void }) {
  const [q, setQ] = useState("");
  const dq = useDebounced(q).trim();
  const users = useAdminQuery<{ users: (PickedUser & { specialPriceCount: number })[] }>(dq.length >= 2 ? `/api/admin/special-prices?q=${encodeURIComponent(dq)}` : null);
  const [busy, setBusy] = useState<string | null>(null);

  async function copy(src: PickedUser) {
    setBusy(src.id);
    try {
      const r = await adminFetch<{ overrides: { durationId: string; price: number }[] }>(`/api/admin/special-prices?userId=${src.id}`);
      if (!r.overrides.length) return toast.error(`@${src.username} has no special prices.`);
      const set = r.overrides.map((o) => ({ durationId: o.durationId, priceUsd: microcentsToUsd(o.price) }));
      const res = await adminFetch<{ saved: number }>("/api/admin/special-prices/bulk", { method: "POST", json: { userId: target.id, set } });
      toast.success(`Copied ${res.saved} price${res.saved === 1 ? "" : "s"} from @${src.username}.`);
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Copy prices from another user</DialogTitle>
        <DialogDescription>All of their special prices are applied to @{target.username}. Matching products are overwritten.</DialogDescription>
      </DialogHeader>
      <SearchBox value={q} onChange={setQ} placeholder="Username or email (2+ chars)" />
      <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border empty:hidden">
        {(users.data?.users ?? [])
          .filter((u) => u.id !== target.id)
          .map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="min-w-0 text-sm">
                <span className="font-medium">@{u.username}</span> <span className="text-xs text-muted-foreground">{u.specialPriceCount} deals</span>
              </span>
              <SubmitButton busy={busy === u.id} size="sm" variant="outline" disabled={!u.specialPriceCount || busy !== null} onClick={() => copy(u)}>
                <Copy /> Copy
              </SubmitButton>
            </li>
          ))}
      </ul>
    </>
  );
}
