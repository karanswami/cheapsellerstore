"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  CircleHelp,
  Clock,
  Flag,
  Inbox,
  KeyRound,
  Loader2,
  Lock,
  Paperclip,
  Send,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { Chips, SearchBox } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/currencies";
import type { IssueReportRow } from "@/lib/issue-reports";
import { cn } from "@/lib/utils";

type Counts = { OPEN: number; IN_PROGRESS: number; RESOLVED: number; CLOSED: number };
type Page = { reports: IssueReportRow[]; page: number; limit: number; total: number; hasMore: boolean; counts: Counts };
type Status = "open" | "RESOLVED" | "CLOSED" | "ALL";
type Kind = "ALL" | "KEY" | "DEPOSIT" | "GENERAL";

const KIND_OPTIONS: { v: Kind; label: string }[] = [
  { v: "ALL", label: "All types" },
  { v: "KEY", label: "Key issues" },
  { v: "DEPOSIT", label: "Deposits" },
  { v: "GENERAL", label: "Questions" },
];
const KIND_META: Record<IssueReportRow["kind"], { label: string; icon: LucideIcon; tint: string }> = {
  KEY: { label: "Key", icon: KeyRound, tint: "bg-primary/15 text-primary" },
  DEPOSIT: { label: "Deposit", icon: Wallet, tint: "bg-warning/15 text-warning" },
  GENERAL: { label: "Question", icon: CircleHelp, tint: "bg-highlight/15 text-highlight" },
};

function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia("(min-width: 1024px)");
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
}

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return formatDate(iso);
}

function Avatar({ name, className }: { name?: string; className?: string }) {
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold uppercase text-muted-foreground", className)}>
      {(name ?? "?").trim().charAt(0) || "?"}
    </span>
  );
}

export function AdminReportsClient({ initial }: { initial: Page }) {
  const [data, setData] = useState(initial);
  const [status, setStatus] = useState<Status>("open");
  const [kind, setKind] = useState<Kind>("ALL");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<IssueReportRow | null>(null);
  const first = useRef(true);
  const desktop = useIsDesktop();

  const load = useCallback(
    async (page: number, append: boolean) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ page: String(page), limit: "20", status, kind });
        if (q.trim()) qs.set("q", q.trim());
        const res = await fetch(`/api/admin/issue-reports?${qs}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Failed to load reports.");
        setData((p) => (append ? { ...json.data, reports: [...p.reports, ...json.data.reports] } : json.data));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load reports.");
      } finally {
        setLoading(false);
      }
    },
    [status, kind, q],
  );

  // Refetch when filters/search change (debounced); skip the server-rendered first load.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => void load(1, false), 250);
    return () => clearTimeout(t);
  }, [load]);

  function onUpdated(r: IssueReportRow) {
    setData((p) => ({ ...p, reports: p.reports.map((x) => (x.id === r.id ? { ...x, ...r } : x)) }));
    setSelected((s) => (s && s.id === r.id ? { ...s, ...r } : s));
    // Counts changed - refresh the list (keeps tiles + filtered list consistent).
    void load(1, false);
  }

  const c = data.counts;
  const tiles: { v: Status; label: string; value: number; icon: LucideIcon; color: string; hint: string }[] = [
    { v: "open", label: "Active", value: c.OPEN + c.IN_PROGRESS, icon: Inbox, color: "text-warning", hint: `${c.OPEN} new · ${c.IN_PROGRESS} in progress` },
    { v: "RESOLVED", label: "Resolved", value: c.RESOLVED, icon: CheckCircle2, color: "text-success", hint: "Fixed for the user" },
    { v: "CLOSED", label: "Closed", value: c.CLOSED, icon: Lock, color: "text-muted-foreground", hint: "No action needed" },
    { v: "ALL", label: "All reports", value: c.OPEN + c.IN_PROGRESS + c.RESOLVED + c.CLOSED, icon: Flag, color: "text-primary", hint: "Everything ever filed" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const active = status === t.v;
          return (
            <button
              key={t.v}
              type="button"
              onClick={() => setStatus(t.v)}
              aria-pressed={active}
              className={cn(
                "rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40",
                active && "border-primary bg-primary/5 ring-1 ring-primary/30",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.label}</span>
                <t.icon className={cn("size-4", t.color)} />
              </div>
              <p className="mt-2 font-display text-3xl font-bold tracking-tight">{t.value}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.hint}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Chips value={kind} onChange={setKind} options={KIND_OPTIONS} />
        <SearchBox value={q} onChange={setQ} placeholder="Search user, subject, text…" className="lg:w-80" />
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {data.total} report{data.total === 1 ? "" : "s"}
        </span>
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <div className="space-y-3">
          {data.reports.length === 0 ? (
            <EmptyState icon={Flag} title="No reports here" hint="Nothing matches these filters. You're all caught up." />
          ) : (
            <ul className={cn("divide-y overflow-hidden rounded-xl border bg-card transition-opacity lg:max-h-[calc(100vh-17rem)] lg:overflow-y-auto", loading && "opacity-60")}>
              {data.reports.map((r) => (
                <li key={r.id}>
                  <ReportRow report={r} active={selected?.id === r.id} onOpen={() => setSelected(r)} />
                </li>
              ))}
              {data.hasMore ? (
                <li className="p-3 text-center">
                  <Button variant="secondary" size="sm" disabled={loading} onClick={() => load(data.page + 1, true)}>
                    {loading ? <Loader2 className="animate-spin" /> : null} Load more
                  </Button>
                </li>
              ) : null}
            </ul>
          )}
        </div>

        {desktop ? (
          <div className="sticky top-4 overflow-hidden rounded-xl border bg-card lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
            {selected ? (
              <Detail key={selected.id} report={selected} onUpdated={onUpdated} />
            ) : (
              <div className="grid min-h-[22rem] place-items-center p-8 text-center">
                <div>
                  <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                    <MessageSquare className="size-5" />
                  </span>
                  <p className="mt-3 font-semibold">Select a report</p>
                  <p className="mt-1 text-sm text-muted-foreground">The key, order, deposit and the user&apos;s message will show up here.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
            <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-xl">
              <SheetTitle className="sr-only">Report details</SheetTitle>
              <SheetDescription className="sr-only">Report details and reply</SheetDescription>
              {selected ? <Detail key={selected.id} report={selected} onUpdated={onUpdated} /> : null}
            </SheetContent>
          </Sheet>
        )}
      </div>
    </div>
  );
}

function ReportRow({ report: r, active, onOpen }: { report: IssueReportRow; active: boolean; onOpen: () => void }) {
  const meta = KIND_META[r.kind];
  const fresh = r.status === "OPEN";
  const context = r.keyDetails
    ? `${r.keyDetails.productTitle}${r.keyDetails.durationLabel ? ` — ${r.keyDetails.durationLabel}` : ""} · ${r.keyDetails.maskedCode}`
    : r.deposit
      ? `${formatMoney(r.deposit.amount)} · ${r.deposit.method} · ${r.deposit.status}`
      : null;
  return (
    <button onClick={onOpen} className={cn("flex w-full items-start gap-3 border-l-2 border-transparent p-4 text-left transition-colors hover:bg-accent/50", active && "border-l-primary bg-primary/5")}>
      <span className={cn("mt-0.5 grid size-10 shrink-0 place-items-center rounded-lg", meta.tint)}>
        <meta.icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {fresh ? <span className="size-2 shrink-0 rounded-full bg-warning" title="New" /> : null}
          <span className={cn("truncate text-sm", fresh ? "font-semibold" : "font-medium")}>{r.subject}</span>
          {r.screenshotUrl || r.deposit?.proofImage ? <Paperclip className="size-3.5 shrink-0 text-muted-foreground" /> : null}
        </span>
        {context ? <span className="mt-0.5 block truncate text-xs text-foreground/80">{context}</span> : null}
        <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{r.explanation}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/70">@{r.user?.username}</span>
          <span>·</span>
          <span>{meta.label}</span>
          <span>·</span>
          <span className="font-mono">#{r.id.slice(-6).toUpperCase()}</span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusBadge status={r.status} />
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="size-3" />
          {timeAgo(r.createdAt)}
        </span>
      </span>
    </button>
  );
}

function Tile({ label, children, mono, wide }: { label: string; children: React.ReactNode; mono?: boolean; wide?: boolean }) {
  return (
    <div className={cn("min-w-0 rounded-lg border bg-muted/30 px-3 py-2", wide && "sm:col-span-2")}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className={cn("mt-0.5 break-all text-sm font-medium", mono && "font-mono text-[13px]")}>{children}</div>
    </div>
  );
}

function Section({ title, icon: Icon, aside, children }: { title: string; icon?: LucideIcon; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {Icon ? <Icon className="size-3.5" /> : null}
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function CopyBtn({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Copy failed.");
        }
      }}
    >
      {done ? <Check /> : <Copy />} {done ? "Copied" : label}
    </Button>
  );
}

function Detail({ report: r, onUpdated }: { report: IssueReportRow; onUpdated: (r: IssueReportRow) => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const d = r.deposit;
  const k = r.keyDetails;
  const meta = KIND_META[r.kind];

  async function setStatus(status: IssueReportRow["status"]) {
    setBusy(status);
    try {
      const res = await fetch(`/api/admin/issue-reports/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: note.trim() || r.adminNote || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Update failed.");
      setNote("");
      onUpdated(json.data.report);
      toast.success(`Marked ${status.toLowerCase().replace("_", " ")}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(null);
    }
  }

  const actions = (["IN_PROGRESS", "RESOLVED", "CLOSED", "OPEN"] as const).filter((s) => s !== r.status);
  const actionLabel = { IN_PROGRESS: "Start working", OPEN: "Reopen", RESOLVED: "Resolve", CLOSED: "Close" } as const;

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="border-b p-5 pr-12">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("grid size-8 place-items-center rounded-lg", meta.tint)}>
            <meta.icon className="size-4" />
          </span>
          <span className="text-sm font-semibold">{meta.label} report</span>
          <StatusBadge status={r.status} />
          <span className="font-mono text-xs text-muted-foreground">#{r.id.slice(-6).toUpperCase()}</span>
          <span className="ml-auto text-xs text-muted-foreground">{formatDate(r.createdAt, true)}</span>
        </div>
        <h2 className="mt-3 font-display text-xl font-bold leading-snug">{r.subject}</h2>
      </div>

      <div className="flex-1 space-y-6 p-5">
        {/* User */}
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
          <Avatar name={r.user?.name} className="size-11 text-base" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">
              {r.user?.name} <span className="font-normal text-muted-foreground">@{r.user?.username}</span>
            </p>
            <p className="truncate text-xs text-muted-foreground">{r.user?.email}</p>
          </div>
          <div className="shrink-0 text-right">
            {r.user?.walletBalance != null ? <p className="text-sm font-semibold">{formatMoney(r.user.walletBalance)}</p> : null}
            <p className="text-[11px] text-muted-foreground">{r.user?.role ?? "wallet"}</p>
          </div>
        </div>

        {/* Message thread */}
        <Section title={r.kind === "GENERAL" ? "Question" : "What the user says"} icon={MessageSquare}>
          <div className="rounded-2xl rounded-tl-sm border bg-muted/40 p-4">
            <p className="whitespace-pre-line text-sm leading-relaxed">{r.explanation}</p>
            {r.screenshotUrl ? (
              <div className="mt-3">
                <p className="mb-1.5 text-xs text-muted-foreground">{r.kind === "DEPOSIT" ? "Screenshot of paid amount" : "Attached screenshot"} — click to open</p>
                <ShotLink src={r.screenshotUrl} alt="Screenshot" />
              </div>
            ) : null}
          </div>
          {r.adminNote ? (
            <div className="ml-6 rounded-2xl rounded-tr-sm border border-primary/30 bg-primary/10 p-4">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
                <ShieldCheck className="size-3.5" /> Your last reply{r.reviewedAt ? ` · ${formatDate(r.reviewedAt, true)}` : ""}
              </p>
              <p className="whitespace-pre-line text-sm">{r.adminNote}</p>
            </div>
          ) : null}
        </Section>

        {/* Reported key */}
        {k ? (
          <Section title="Reported key" icon={KeyRound}>
            <div className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{k.productTitle}</p>
                  <p className="text-xs text-muted-foreground">{k.durationLabel || "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {k.isSpecialInventory ? <Badge variant="highlight">Special stock</Badge> : null}
                  {k.keyStatus ? <StatusBadge status={k.keyStatus} /> : null}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg border bg-muted/40 p-2 pl-3">
                <code className="min-w-0 flex-1 break-all font-mono text-sm font-semibold">{k.code || "No key code stored"}</code>
                {k.code ? <CopyBtn value={k.code} label="Copy key" /> : null}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Tile label="Price paid">{k.unitPrice != null ? formatMoney(k.unitPrice) : "—"}</Tile>
                <Tile label="Purchased">{k.purchasedAt ? formatDate(k.purchasedAt, true) : "—"}</Tile>
                <Tile label="Order" mono>
                  {k.orderId ? `#${k.orderId.slice(-8).toUpperCase()}` : "—"}
                </Tile>
                <Tile label="Order status">{k.orderStatus ? <StatusBadge status={k.orderStatus} /> : "—"}</Tile>
                {k.orderTotal != null ? <Tile label="Order total">{formatMoney(k.orderTotal)}</Tile> : null}
                {k.androidId ? (
                  <Tile label="Android ID" mono>
                    {k.androidId}
                  </Tile>
                ) : null}
                {k.buyerEmail ? <Tile label="Buyer email">{k.buyerEmail}</Tile> : null}
                {k.buyerDiscord ? <Tile label="Buyer Discord">{k.buyerDiscord}</Tile> : null}
              </div>
            </div>
          </Section>
        ) : null}

        {/* Reported deposit */}
        {d ? (
          <Section
            title="Reported deposit"
            icon={Wallet}
            aside={
              <Button asChild size="sm" variant="ghost">
                <a href="/admin/deposits" target="_blank" rel="noreferrer">
                  Open deposits <ExternalLink />
                </a>
              </Button>
            }
          >
            <div className="rounded-xl border p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Credit amount</p>
                  <p className="font-display text-2xl font-bold">{formatMoney(d.amount)}</p>
                </div>
                <StatusBadge status={d.status} />
              </div>
              {d.failReason ? <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{d.failReason}</p> : null}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Tile label="Requested">
                  {d.requestedAmount} {d.payCurrency}
                </Tile>
                <Tile label="Payable">{d.payableAmount ? `${d.payableAmount} ${d.payCurrency}` : "—"}</Tile>
                <Tile label="Paid (detected)">{d.paidAmount != null ? d.paidAmount : "—"}</Tile>
                <Tile label="Method">
                  {d.method}
                  {d.manualMethodKey ? ` (${d.manualMethodKey})` : ""}
                </Tile>
                <Tile label="Created">{formatDate(d.createdAt, true)}</Tile>
                <Tile label="Deposit ID" mono>
                  {d.id}
                </Tile>
                {d.providerReference ? (
                  <Tile label="Provider reference" mono wide>
                    {d.providerReference}
                  </Tile>
                ) : null}
              </div>
              {d.proofImage ? (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs text-muted-foreground">Proof uploaded with the deposit — click to open</p>
                  <ShotLink src={d.proofImage} alt="Deposit proof" />
                </div>
              ) : null}
            </div>
          </Section>
        ) : null}
      </div>

      {/* Reply composer */}
      <div className="sticky bottom-0 space-y-3 border-t bg-card p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold uppercase tracking-wider">Reply to user</span>
          <span>{note.length}/500</span>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={r.adminNote ? "Write a new reply (leave empty to keep the last one)…" : "Message sent to the user as a notification and shown on their ticket…"}
          className="w-full resize-none rounded-lg border bg-input px-3 py-2 text-sm outline-none focus-visible:border-primary"
        />
        <div className="flex flex-wrap gap-2">
          {actions.map((s) => (
            <Button key={s} size="sm" variant={s === "RESOLVED" ? "default" : "secondary"} disabled={busy !== null} onClick={() => setStatus(s)}>
              {busy === s ? <Loader2 className="animate-spin" /> : s === "RESOLVED" ? <Send /> : null}
              {actionLabel[s]}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShotLink({ src, alt }: { src: string; alt: string }) {
  return (
    <a href={src} target="_blank" rel="noreferrer" className="inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="max-h-80 rounded-lg border object-contain" />
    </a>
  );
}
