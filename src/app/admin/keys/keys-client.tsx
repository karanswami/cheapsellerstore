"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Ban, CheckCircle2, KeyRound, Search, Trash2, Upload } from "lucide-react";
import { EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { ConfirmDialog, Field, SearchBox, StatCard, SubmitButton, TableSkeleton, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type StockRow = { id: string; label: string; productId: string; productTitle: string; available: number; sold: number; disabled: number; total: number };
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
  const [importFor, setImportFor] = useState<StockRow | null>(null);
  const rows = data?.rows;

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return (rows ?? []).filter((r) => !f || `${r.productTitle} ${r.label}`.toLowerCase().includes(f));
  }, [rows, filter]);
  const totals = useMemo(() => (rows ?? []).reduce((a, r) => ({ available: a.available + r.available, sold: a.sold + r.sold, disabled: a.disabled + r.disabled }), { available: 0, sold: 0, disabled: 0 }), [rows]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Available" value={totals.available} tone="success" icon={KeyRound} />
        <StatCard label="Sold" value={totals.sold} />
        <StatCard label="Disabled" value={totals.disabled} tone={totals.disabled ? "warning" : "default"} />
      </div>

      <KeyLookup onChanged={reload} />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Inventory</h2>
          <SearchBox value={filter} onChange={setFilter} placeholder="Filter products…" />
        </div>
        <div className="rounded-xl border bg-card">
          {loading && !rows ? (
            <TableSkeleton />
          ) : shown.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={KeyRound} title="No durations" hint="Add products and durations first." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Sold</TableHead>
                  <TableHead className="text-right">Disabled</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.productTitle}</TableCell>
                    <TableCell>{r.label}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={r.available === 0 ? "destructive" : r.available < 5 ? "warning" : "success"}>{r.available}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{r.sold}</TableCell>
                    <TableCell className="text-right">{r.disabled}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="secondary" size="sm" onClick={() => setImportFor(r)}>
                        <Upload /> Import
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <ImportDialog
        target={importFor}
        onClose={() => setImportFor(null)}
        onDone={() => {
          setImportFor(null);
          reload();
        }}
      />
    </div>
  );
}

function ImportDialog({ target, onClose, onDone }: { target: StockRow | null; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejected, setRejected] = useState<{ code: string; reason: string }[]>([]);
  const codes = text.split(/\r?\n/).map((c) => c.trim()).filter(Boolean);

  async function run() {
    if (!target) return;
    setBusy(true);
    try {
      const r = await adminFetch<{ imported: number; rejected: { code: string; reason: string }[] }>("/api/admin/keys/import", {
        method: "POST",
        json: { durationId: target.id, codes },
      });
      toast.success(`Imported ${r.imported} key${r.imported === 1 ? "" : "s"}.`);
      if (r.rejected.length) {
        setRejected(r.rejected);
        setText("");
      } else {
        setText("");
        onDone();
      }
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setText("");
    setRejected([]);
    onClose();
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import keys</DialogTitle>
          <DialogDescription>
            {target?.productTitle} · {target?.label}
          </DialogDescription>
        </DialogHeader>
        {rejected.length > 0 ? (
          <>
            <p className="text-sm text-warning">{rejected.length} code(s) were skipped:</p>
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2 text-xs">
              {rejected.map((r, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <code className="truncate">{r.code}</code>
                  <span className="shrink-0 text-muted-foreground">{r.reason}</span>
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button
                onClick={() => {
                  setRejected([]);
                  onDone();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <Field label="Keys" hint={`One per line, up to 500. ${codes.length} detected.`}>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className="font-mono text-xs" placeholder="XXXX-XXXX-XXXX" />
            </Field>
            <DialogFooter>
              <SubmitButton busy={busy} disabled={codes.length === 0 || codes.length > 500} onClick={run}>
                Import {codes.length || ""}
              </SubmitButton>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
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

  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
        <Search className="size-4 text-primary" /> Key lookup
      </h2>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Paste a key code or key ID…" className="font-mono text-sm" />
        <SubmitButton type="submit" busy={busy}>
          Find
        </SubmitButton>
      </form>
      {notFound ? <p className="mt-3 text-sm text-muted-foreground">No key found for that code.</p> : null}

      <Dialog open={!!key} onOpenChange={(o) => !o && setKey(null)}>
        <DialogContent>
          {key ? (
            <>
              <DialogHeader>
                <DialogTitle>Key details</DialogTitle>
                <DialogDescription>
                  {key.productTitle} · {key.durationLabel}
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-2">
                <StatusBadge status={key.status} />
                <span className="text-xs text-muted-foreground">Added {formatDate(key.createdAt)}</span>
              </div>
              {key.status === "SOLD" ? (
                <dl className="grid gap-2 rounded-lg border p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Sold</dt>
                    <dd>{key.soldAt ? formatDate(key.soldAt, true) : "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Buyer</dt>
                    <dd>{key.buyerEmail ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Order</dt>
                    <dd className="font-mono text-xs">{key.orderId ? `#${key.orderId.slice(-8).toUpperCase()}` : "—"}</dd>
                  </div>
                  <code className="break-all rounded bg-muted p-2 text-xs">{key.code}</code>
                </dl>
              ) : (
                <>
                  <Field label="Code">
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
