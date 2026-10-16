"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Ban, Boxes, CheckCircle2, Copy, KeyRound, Plus, Search, SearchX, Trash2, Upload } from "lucide-react";
import { EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { ConfirmDialog, Field, SearchBox, StatCard, SubmitButton, TableSkeleton, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddKeys, type StockRow } from "./add-keys";

type FoundKey = {
  id: string;
  code: string;
  status: "AVAILABLE" | "SOLD" | "DISABLED";
  soldAt: string | null;
  createdAt: string;
  productTitle: string;
  durationLabel: string;
  orderId: string | null;
  buyerEmail: string | null;
};

export function AdminKeysClient() {
  const { data, loading, reload } = useAdminQuery<{ rows: StockRow[] }>("/api/admin/keys");
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState("add");
  const [preset, setPreset] = useState("");
  const rows = data?.rows;

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return (rows ?? []).filter((r) => !f || `${r.productTitle} ${r.label}`.toLowerCase().includes(f));
  }, [rows, filter]);
  const groups = useMemo(() => {
    const m = new Map<string, { id: string; title: string; available: number; items: StockRow[] }>();
    for (const r of shown) {
      const g = m.get(r.productId) ?? { id: r.productId, title: r.productTitle, available: 0, items: [] };
      g.available += r.available;
      g.items.push(r);
      m.set(r.productId, g);
    }
    return [...m.values()];
  }, [shown]);
  const totals = useMemo(() => (rows ?? []).reduce((a, r) => ({ available: a.available + r.available, sold: a.sold + r.sold, disabled: a.disabled + r.disabled }), { available: 0, sold: 0, disabled: 0 }), [rows]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Available" value={totals.available} tone="success" icon={KeyRound} />
        <StatCard label="Sold" value={totals.sold} />
        <StatCard label="Disabled" value={totals.disabled} tone={totals.disabled ? "warning" : "default"} />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="add"><Upload /> Add keys</TabsTrigger>
          <TabsTrigger value="lookup"><Search /> Key lookup</TabsTrigger>
        </TabsList>
        <TabsContent value="lookup" className="space-y-6">
      <KeyLookup onChanged={reload} />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Boxes className="size-4 text-primary" /> Inventory
            <Badge variant="muted" shape="pill">{groups.length} products</Badge>
          </h2>
          <SearchBox value={filter} onChange={setFilter} placeholder="Filter products…" />
        </div>
        {loading && !rows ? (
          <TableSkeleton />
        ) : groups.length === 0 ? (
          <div className="rounded-xl border bg-card p-6">
            <EmptyState icon={KeyRound} title="No durations" hint="Add products and durations first." />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {groups.map((g) => (
              <div key={g.id} className="overflow-hidden rounded-xl border bg-card">
                <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
                  <p className="min-w-0 truncate font-display font-semibold">{g.title}</p>
                  <Badge variant={g.available === 0 ? "destructive" : g.available < 5 ? "warning" : "success"} shape="pill" className="shrink-0">
                    {g.available} in stock
                  </Badge>
                </div>
                <ul className="divide-y">
                  {g.items.map((r) => {
                    const pct = r.total ? Math.round((r.available / r.total) * 100) : 0;
                    return (
                      <li key={r.id} className="space-y-2 px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-sm font-medium">{r.label}</span>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="shrink-0"
                            onClick={() => {
                              setPreset(r.id);
                              setTab("add");
                            }}
                          >
                            <Plus /> Add keys
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant={r.available === 0 ? "destructive" : r.available < 5 ? "warning" : "success"} shape="pill">{r.available} available</Badge>
                          <Badge variant="muted" shape="pill">{r.sold} sold</Badge>
                          {r.disabled ? <Badge variant="warning" shape="pill">{r.disabled} disabled</Badge> : null}
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className={`h-full rounded-full ${r.available === 0 ? "bg-destructive" : r.available < 5 ? "bg-warning" : "bg-success"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
        </TabsContent>
        <TabsContent value="add">
          <AddKeys key={preset} rows={rows ?? []} initialDurationId={preset} onUploaded={reload} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KeyLookup({ onChanged }: { onChanged: () => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState<FoundKey | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [edit, setEdit] = useState("");
  const [del, setDel] = useState(false);

  async function search() {
    if (!q.trim()) return;
    setBusy(true);
    setNotFound(false);
    try {
      const r = await adminFetch<{ key: FoundKey | null }>(`/api/admin/keys/check?q=${encodeURIComponent(q.trim())}`);
      setKey(r.key);
      setEdit(r.key?.code ?? "");
      setNotFound(!r.key);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function patch(body: { status?: "AVAILABLE" | "DISABLED"; code?: string }) {
    if (!key) return;
    try {
      await adminFetch(`/api/admin/keys/check?id=${key.id}`, { method: "PATCH", json: body });
      toast.success("Key updated.");
      setKey({ ...key, ...(body.status ? { status: body.status } : {}), ...(body.code ? { code: body.code } : {}) });
      onChanged();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  const tone = key?.status === "AVAILABLE" ? "bg-success/10" : key?.status === "DISABLED" ? "bg-warning/10" : "bg-muted";
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="bg-gradient-to-br from-primary/10 via-transparent to-transparent p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary">
            <Search className="size-4" />
          </span>
          Key lookup
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Find any key to see its status, buyer and order — or fix, disable and delete it.</p>
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <div className="relative flex-1">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Paste a key code or key ID…" className="h-11 pl-9 font-mono text-sm" />
          </div>
          <SubmitButton type="submit" busy={busy} className="h-11 sm:px-8">
            <Search /> Find key
          </SubmitButton>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="outline" shape="pill">Key code</Badge>
          <Badge variant="outline" shape="pill">Key ID</Badge>
        </div>
        {notFound ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
            <SearchX className="size-4 shrink-0" /> No key found for that code.
          </div>
        ) : null}
      </div>

      <Dialog open={!!key} onOpenChange={(o) => !o && setKey(null)}>
        <DialogContent className="max-w-lg">
          {key ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <KeyRound className="size-5 text-primary" /> Key details
                </DialogTitle>
                <DialogDescription>Review this key before making changes.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={key.status} />
                <Badge variant="outline" shape="pill">{key.productTitle}</Badge>
                <Badge variant="outline" shape="pill">{key.durationLabel}</Badge>
              </div>
              <div className={`flex items-center gap-2 rounded-lg border p-2.5 ${tone}`}>
                <code className="min-w-0 flex-1 break-all text-xs">{key.code}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => {
                    void navigator.clipboard.writeText(key.code);
                    toast.success("Key copied.");
                  }}
                >
                  <Copy />
                </Button>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <Info label="Added" value={formatDate(key.createdAt)} />
                <Info label="Sold" value={key.soldAt ? formatDate(key.soldAt, true) : "—"} />
                <Info label="Buyer" value={key.buyerEmail ?? "—"} />
                <Info label="Order" value={key.orderId ? `#${key.orderId.slice(-8).toUpperCase()}` : "—"} mono />
              </dl>
              {key.status !== "SOLD" ? (
                <>
                  <Field label="Edit code">
                    <div className="flex gap-2">
                      <Input value={edit} onChange={(e) => setEdit(e.target.value)} className="font-mono text-xs" />
                      <Button variant="secondary" disabled={!edit.trim() || edit === key.code} onClick={() => patch({ code: edit.trim() })}>
                        Save
                      </Button>
                    </div>
                  </Field>
                  <DialogFooter>
                    {key.status === "AVAILABLE" ? (
                      <Button variant="secondary" onClick={() => patch({ status: "DISABLED" })}>
                        <Ban /> Disable
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={() => patch({ status: "AVAILABLE" })}>
                        <CheckCircle2 /> Enable
                      </Button>
                    )}
                    <Button variant="destructive" onClick={() => setDel(true)}>
                      <Trash2 /> Delete
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Sold keys are locked and can’t be edited.</p>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={del}
        onOpenChange={setDel}
        title="Delete this key?"
        description="This permanently removes the key from stock."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            await adminFetch(`/api/admin/keys/${key!.id}`, { method: "DELETE" });
            toast.success("Key deleted.");
            setKey(null);
            onChanged();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border p-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`truncate ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
