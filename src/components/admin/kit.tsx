"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, Trash2, UploadCloud, type LucideIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/** fetch wrapper for /api/admin/*: unwraps `{data}` and throws the API's error message. */
export async function adminFetch<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message ?? `Request failed (${res.status}).`);
  return body.data as T;
}

export function errMsg(e: unknown, fallback = "Something went wrong.") {
  return e instanceof Error ? e.message : fallback;
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function SearchBox({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full sm:w-72", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  );
}

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "destructive";
}) {
  const color = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "destructive" ? "text-destructive" : "text-primary";
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon ? <Icon className={cn("size-4", color)} /> : null}
      </div>
      <p className="mt-2 font-display text-2xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
  loading,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  loading?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between gap-3 pt-3 text-sm text-muted-foreground">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        {loading ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
        <Button variant="secondary" size="icon-sm" disabled={page <= 1 || loading} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft />
        </Button>
        <span className="min-w-14 text-center text-xs">
          {page} / {pages}
        </span>
        <Button variant="secondary" size="icon-sm" disabled={page >= pages || loading} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

/** Pill-style filter chips. */
export function Chips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value === o.v ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Destructive/important confirmation built on shadcn AlertDialog. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 className="animate-spin" /> : null} {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SubmitButton({ busy, children, ...p }: React.ComponentProps<typeof Button> & { busy?: boolean }) {
  return (
    <Button disabled={busy || p.disabled} {...p}>
      {busy ? <Loader2 className="animate-spin" /> : null} {children}
    </Button>
  );
}

export function Muted({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("text-muted-foreground", className)}>{children}</span>;
}

type ListState<T> = { k: string; items: T[]; total: number; error: string | null };

/**
 * Paged list loader for admin list endpoints that return `{ [key]: T[], total }`.
 * Re-fetches whenever the (stringified) params change; `reload()` refetches in place.
 * `loading` is derived (the stored result belongs to an older request), so no setState-in-effect.
 */
export function useAdminList<T>(endpoint: string, key: string, params: Record<string, string | number | undefined>) {
  const [state, setState] = useState<ListState<T>>({ k: "", items: [], total: 0, error: null });
  const [tick, setTick] = useState(0);
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  const reqKey = `${endpoint}?${qs}#${tick}`;

  useEffect(() => {
    let live = true;
    adminFetch<Record<string, unknown>>(`${endpoint}?${qs}`)
      .then((d) => {
        if (!live) return;
        const items = (d[key] as T[]) ?? [];
        setState({ k: reqKey, items, total: Number(d.total ?? items.length), error: null });
      })
      .catch((e) => {
        if (!live) return;
        setState((s) => ({ ...s, k: reqKey, error: errMsg(e) }));
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqKey, endpoint, key]);

  return {
    items: state.items,
    total: state.total,
    error: state.error,
    loading: state.k !== reqKey,
    reload: () => setTick((t) => t + 1),
    setItems: (fn: (i: T[]) => T[]) => setState((s) => ({ ...s, items: fn(s.items) })),
  };
}

/** Image picker that uploads to an admin upload endpoint and returns the stored URL. */
export function ImageUpload({
  value,
  onChange,
  endpoint,
  label = "Image",
  hint,
  maxMb = 4,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  endpoint: string;
  label?: string;
  hint?: string;
  maxMb?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    const { toast } = await import("sonner");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return void toast.error("Use a PNG, JPG or WebP image.");
    if (file.size > maxMb * 1024 * 1024) return void toast.error(`Image must be ${maxMb} MB or smaller.`);
    const local = URL.createObjectURL(file);
    setPreview(local);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await adminFetch<{ upload: { url: string } }>(endpoint, { method: "POST", body: fd });
      onChange(res.upload.url);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
      setPreview(null);
      URL.revokeObjectURL(local);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const shown = preview ?? value;
  return (
    <Field label={label} hint={hint}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); void pick(e.dataTransfer.files?.[0]); }}
        onPaste={(e) => void pick(Array.from(e.clipboardData.files)[0])}
        className={cn("relative overflow-hidden rounded-xl border-2 border-dashed bg-muted/30 transition-colors", drag ? "border-primary bg-primary/10" : "border-border hover:border-primary/50")}
      >
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
        {shown ? (
          <div className="flex items-center gap-4 p-3">
            <div className="relative size-28 shrink-0 overflow-hidden rounded-lg border bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shown} alt="" className="size-full object-contain" />
              {busy ? (
                <div className="absolute inset-0 grid place-items-center bg-background/70"><Loader2 className="size-6 animate-spin text-primary" /></div>
              ) : null}
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-medium">{busy ? "Uploading…" : "Image uploaded"}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}><RefreshCw /> Replace</Button>
                <Button type="button" variant="ghost" size="sm" disabled={busy} className="text-destructive hover:text-destructive" onClick={() => onChange(null)}><Trash2 /> Remove</Button>
              </div>
            </div>
          </div>
        ) : (
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center gap-1.5 px-4 py-7 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary"><UploadCloud className="size-5" /></span>
            <span className="text-sm font-medium">Click to upload, drag &amp; drop, or paste</span>
            <span className="text-xs text-muted-foreground">PNG, JPG or WebP · up to {maxMb} MB</span>
          </button>
        )}
      </div>
    </Field>
  );
}

/** Labelled switch row used in forms. */
export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/** Loads a single admin GET endpoint (`{ data }` unwrapped). `url=null` skips. `reload()` refetches. */
export function useAdminQuery<T>(url: string | null) {
  const [res, setRes] = useState<{ k: string; data: T | null; error: string | null }>({ k: "", data: null, error: null });
  const [tick, setTick] = useState(0);
  const reqKey = url === null ? null : `${url}#${tick}`;

  useEffect(() => {
    if (url === null) return;
    let live = true;
    adminFetch<T>(url)
      .then((d) => live && setRes({ k: reqKey!, data: d, error: null }))
      .catch((e) => live && setRes((r) => ({ ...r, k: reqKey!, error: errMsg(e) })));
    return () => {
      live = false;
    };
  }, [url, reqKey]);

  return {
    data: res.data,
    setData: (d: T | null) => setRes((r) => ({ ...r, data: d })),
    error: res.error,
    loading: reqKey !== null && res.k !== reqKey,
    reload: () => setTick((t) => t + 1),
  };
}
