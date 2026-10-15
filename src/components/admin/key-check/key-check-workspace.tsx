"use client";

import {
  AdminEmptyState,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import { adminMutate } from "@/components/admin/use-admin-fetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { KeyRound, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type KeyRow = {
  id: string;
  code: string;
  status: "AVAILABLE" | "SOLD" | "DISABLED" | string;
  productTitle: string;
  durationLabel: string;
  buyerEmail: string | null;
  orderId: string | null;
  soldAt: string | null;
  createdAt: string;
};

export function KeyCheckWorkspace() {
  const [q, setQ] = useState("");
  const [key, setKey] = useState<KeyRow | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [pending, setPending] = useState(false);

  const isSold = key?.status === "SOLD";
  const editable = key != null && !isSold;

  async function parseCheckResponse(res: Response) {
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as {
        data?: { key: KeyRow | null };
        error?: { message: string };
      };
    } catch {
      return null;
    }
  }

  function applyFound(found: KeyRow) {
    setKey(found);
    setCode(found.code);
    setDisabled(found.status === "DISABLED");
    setOpen(true);
  }

  async function lookup(query: string) {
    const res = await fetch(
      `/api/admin/keys/check?q=${encodeURIComponent(query)}`,
      { credentials: "include" },
    );
    const json = await parseCheckResponse(res);
    return { res, json };
  }

  async function search() {
    const query = q.trim();
    if (!query) {
      toast.error("Enter a key code.");
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { res, json } = await lookup(query);
      if (!json) {
        toast.error("Search failed");
        setKey(null);
        return;
      }
      if (!res.ok) {
        toast.error(json.error?.message ?? "Search failed");
        setKey(null);
        return;
      }
      const found = json.data?.key ?? null;
      if (!found) {
        setKey(null);
        setOpen(false);
        toast.error("No matching key.");
        return;
      }
      applyFound(found);
    } catch {
      toast.error("Search failed");
      setKey(null);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!key || !editable) return;
    setPending(true);
    const result = await adminMutate(
      `/api/admin/keys/check?id=${encodeURIComponent(key.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          code: code.trim(),
          status: disabled ? "DISABLED" : "AVAILABLE",
        }),
      },
    );
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Key updated");
    setQ(code.trim());
    setOpen(false);
    const { json } = await lookup(code.trim());
    const found = json?.data?.key ?? null;
    setKey(found);
    setSearched(true);
  }

  async function remove() {
    if (!key || !editable) return;
    if (!window.confirm("Delete this key from inventory?")) return;
    setPending(true);
    const result = await adminMutate(
      `/api/admin/keys/check?id=${encodeURIComponent(key.id)}`,
      { method: "DELETE" },
    );
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Key deleted");
    setOpen(false);
    setKey(null);
    setSearched(true);
  }

  return (
    <main className="space-y-5">
      <AdminPageHeader
        title="Keys Check"
        description="Look up an exact key — sold is view-only"
      />

      <form
        className="flex flex-col gap-2 rounded-xl bg-card ring-1 ring-foreground/10 p-4 sm:flex-row sm:items-end sm:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
            Key code
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Paste exact key code"
              className="h-10 pl-9 font-mono text-sm"
              autoComplete="off"
            />
          </div>
        </div>
        <Button type="submit" disabled={loading} className="sm:w-auto">
          {loading ? "Checking…" : "Check"}
        </Button>
      </form>

      {searched && !key && !loading ? (
        <AdminEmptyState message="No key matched that code." />
      ) : null}

      {key && !open ? (
        <button
          type="button"
          onClick={() => {
            setCode(key.code);
            setDisabled(key.status === "DISABLED");
            setOpen(true);
          }}
          className="flex w-full items-center gap-3.5 rounded-xl bg-card ring-1 ring-foreground/10 px-3.5 py-3.5 text-left transition-colors hover:bg-muted/50"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate font-mono text-sm font-semibold">
                {key.code}
              </p>
              <Badge
                variant={
                  key.status === "SOLD"
                    ? "secondary"
                    : key.status === "DISABLED"
                      ? "destructive"
                      : "outline"
                }
              >
                {key.status}
              </Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {key.productTitle} · {key.durationLabel}
            </p>
          </div>
        </button>
      ) : null}

      <Dialog open={open && key != null} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[min(92dvh,640px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <KeyRound className="size-5" />
              </div>
              <DialogTitle className="text-lg">
                {isSold ? "Sold key" : "Key details"}
              </DialogTitle>
              <DialogDescription>
                {isSold
                  ? "Sold keys are view-only."
                  : "Edit code or disable this key."}
              </DialogDescription>
            </DialogHeader>
          </div>

          {key ? (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  variant={
                    key.status === "SOLD"
                      ? "secondary"
                      : key.status === "DISABLED"
                        ? "destructive"
                        : "outline"
                  }
                >
                  {key.status}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Code
                </Label>
                {editable ? (
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="h-10 font-mono text-sm"
                  />
                ) : (
                  <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 font-mono text-sm">
                    {key.code}
                  </p>
                )}
              </div>

              <div className="space-y-2 rounded-xl bg-card ring-1 ring-foreground/10 px-3.5 py-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Product · </span>
                  {key.productTitle}
                </p>
                <p>
                  <span className="text-muted-foreground">Duration · </span>
                  {key.durationLabel}
                </p>
                {isSold ? (
                  <>
                    <p>
                      <span className="text-muted-foreground">Buyer · </span>
                      {key.buyerEmail ?? "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Order · </span>
                      <span className="font-mono text-xs">
                        {key.orderId ?? "—"}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Sold · </span>
                      {key.soldAt
                        ? new Date(key.soldAt).toLocaleString()
                        : "—"}
                    </p>
                  </>
                ) : null}
              </div>

              {editable ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3">
                  <div>
                    <p className="text-sm font-medium">Disabled</p>
                    <p className="text-xs text-muted-foreground">
                      Disabled keys cannot be sold
                    </p>
                  </div>
                  <Switch checked={disabled} onCheckedChange={setDisabled} />
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 border-t border-border/40 bg-muted/20 px-4 py-4 sm:justify-between sm:px-5">
            {editable ? (
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() => void remove()}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                {isSold ? "Close" : "Cancel"}
              </Button>
              {editable ? (
                <Button
                  type="button"
                  disabled={pending || !code.trim()}
                  onClick={() => void save()}
                >
                  {pending ? "Saving…" : "Save"}
                </Button>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
