"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleHelp,
  Copy,
  ImageUp,
  KeyRound,
  LifeBuoy,
  Loader2,
  MessageSquareText,
  Plus,
  ReceiptText,
  Search,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { IconTile, Surface, type Tone } from "@/components/app-kit";
import { BottomSheet } from "@/components/app-kit-client";
import { formatDate } from "@/components/app-ui";
import { formatMoney } from "@/lib/currencies";
import { feedbackSuccess, feedbackTap } from "@/lib/feedback";
import type { IssueReportRow } from "@/lib/issue-reports";
import { cn } from "@/lib/utils";

type Kind = IssueReportRow["kind"];
type Status = IssueReportRow["status"];
type Page = { reports: IssueReportRow[]; page: number; limit: number; total: number; hasMore: boolean };
type Counts = { total: number; open: number; done: number };
type Filter = "all" | "open" | "done";
type EligibleKey = { keyId: string; orderId: string | null; productTitle: string; durationLabel: string; maskedCode: string; createdAt: string };
type EligibleDeposit = { id: string; amount: number; payCurrency: string; requestedAmount: number; status: string; method: string; createdAt: string };

const KINDS: Record<Kind, { label: string; title: string; hint: string; icon: LucideIcon; tone: Tone }> = {
  KEY: { label: "Key", title: "Key not working", hint: "A key you bought won't activate", icon: KeyRound, tone: "amber" },
  DEPOSIT: { label: "Deposit", title: "Deposit missing", hint: "Paid, but the wallet wasn't credited", icon: Wallet, tone: "emerald" },
  GENERAL: { label: "Question", title: "Ask a question", hint: "Anything else you need help with", icon: CircleHelp, tone: "sky" },
};
const KIND_ORDER: Kind[] = ["KEY", "DEPOSIT", "GENERAL"];

const STATUS: Record<Status, { label: string; className: string; dot: string }> = {
  OPEN: { label: "Open", className: "bg-warning/15 text-warning", dot: "bg-warning" },
  IN_PROGRESS: { label: "In review", className: "bg-sky-400/15 text-sky-300", dot: "bg-sky-300" },
  RESOLVED: { label: "Resolved", className: "bg-success/15 text-success", dot: "bg-success" },
  CLOSED: { label: "Closed", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
};

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "done", label: "Resolved" },
];

const tap = () => feedbackTap({ impact: "selection", silent: true });
const ticketNo = (id: string) => `#${id.slice(-6).toUpperCase()}`;
const isActive = (s: Status) => s === "OPEN" || s === "IN_PROGRESS";
const pretty = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
const inputCls =
  "w-full rounded-2xl border border-white/[0.06] bg-muted/50 px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50";

export function ReportsClient({
  initial,
  counts: initialCounts,
  focus,
  compose,
}: {
  initial: Page;
  counts: Counts;
  focus: IssueReportRow | null;
  /** Deep link (e.g. from a failed deposit) that opens the composer preselected. */
  compose?: { kind: Kind; target?: string } | null;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [data, setData] = useState(initial);
  const [counts, setCounts] = useState(initialCounts);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<IssueReportRow | null>(focus);
  const [sheetOpen, setSheetOpen] = useState(Boolean(focus));
  const [composer, setComposer] = useState<{ open: boolean; kind: Kind | null; key: number; target?: string }>(
    compose && !focus ? { open: true, kind: compose.kind, key: 0, target: compose.target } : { open: false, kind: null, key: 0 },
  );
  const req = useRef(0);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(async (f: Filter, page: number) => {
    const id = ++req.current;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: "15" });
      if (f !== "all") qs.set("status", f);
      const res = await fetch(`/api/reports?${qs}`);
      const json = await res.json();
      if (id !== req.current) return;
      if (!res.ok) throw new Error(json.error?.message ?? "Could not load tickets.");
      setData((p) => (page === 1 ? json.data : { ...json.data, reports: [...p.reports, ...json.data.reports] }));
      // Keep an open ticket in step with its refreshed row.
      setDetail((d) => (d && (json.data.reports as IssueReportRow[]).find((r) => r.id === d.id)) || d);
    } catch (e) {
      if (id === req.current) toast.error(e instanceof Error ? e.message : "Could not load tickets.");
    } finally {
      if (id === req.current) setLoading(false);
    }
  }, []);

  // Live update: newer data from the server (e.g. an admin reply) refreshes the list and counts.
  const seen = useRef(initial);
  useEffect(() => {
    if (seen.current === initial) return;
    seen.current = initial;
    setCounts(initialCounts);
    void load(filter, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  function pickFilter(f: Filter) {
    if (f === filter) return;
    tap();
    setFilter(f);
    setData({ reports: [], page: 1, limit: 15, total: 0, hasMore: false });
    void load(f, 1);
  }

  // Infinite scroll; the "Load more" button stays as a fallback.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !data.hasMore) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && !loading && load(filter, data.page + 1), { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [data.hasMore, data.page, filter, load, loading]);

  function openTicket(r: IssueReportRow) {
    tap();
    setDetail(r);
    setSheetOpen(true);
  }

  function startNew(kind: Kind | null) {
    tap();
    setSheetOpen(false);
    setComposer((c) => ({ open: true, kind, key: c.key + 1 }));
  }

  function onCreated(r: IssueReportRow) {
    setCounts((c) => ({ total: c.total + 1, open: c.open + 1, done: c.done }));
    if (filter !== "done") setData((p) => ({ ...p, total: p.total + 1, reports: [r, ...p.reports] }));
  }

  const filterIndex = FILTERS.findIndex((f) => f.id === filter);
  const filterCount = { all: counts.total, open: counts.open, done: counts.done };

  return (
    <div className="space-y-5">
      <HelpHero counts={counts} onNew={() => startNew(null)} />

      {/* Quick reasons */}
      <div className="grid grid-cols-3 gap-2.5">
        {KIND_ORDER.map((k) => {
          const m = KINDS[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => startNew(k)}
              className="tap group flex flex-col items-start gap-2.5 rounded-3xl border border-white/[0.06] bg-card/80 p-3.5 text-left shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] transition-colors hover:border-white/15"
            >
              <IconTile icon={m.icon} tone={m.tone} className="size-10 rounded-xl transition-transform group-hover:-translate-y-0.5" />
              <span className="min-w-0">
                <span className="block text-[13px] font-bold leading-tight">{m.title}</span>
                <span className="mt-1 hidden text-[11.5px] leading-snug text-muted-foreground sm:block">{m.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar: sticks under the mobile app bar */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 bg-background/85 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div role="tablist" aria-label="Ticket status" className="relative grid grid-cols-3 rounded-2xl border border-white/[0.06] bg-card/80 p-1">
          <span
            aria-hidden
            className="bg-brand-gradient absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-xl shadow-lg shadow-primary/25 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(${filterIndex * 100}%)` }}
          />
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => pickFilter(f.id)}
              className={cn(
                "relative flex h-9 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold transition-colors",
                filter === f.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
              <span className={cn("text-[11px] font-bold tabular-nums", filter === f.id ? "opacity-80" : "opacity-60")}>{filterCount[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {data.reports.length === 0 ? (
        loading ? (
          <Surface className="space-y-1 p-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-2.5 py-3">
                <span className="skeleton size-10 rounded-xl" />
                <span className="flex-1 space-y-2">
                  <span className="skeleton block h-3.5 w-2/3 rounded" />
                  <span className="skeleton block h-3 w-1/3 rounded" />
                </span>
              </div>
            ))}
          </Surface>
        ) : (
          <EmptyTickets filter={filter} onNew={() => startNew(null)} />
        )
      ) : (
        <Surface className="divide-y divide-white/[0.05] p-1.5">
          {data.reports.map((r) => (
            <TicketRow key={r.id} r={r} onOpen={() => openTicket(r)} />
          ))}
        </Surface>
      )}

      {data.hasMore ? (
        <div ref={sentinel} className="text-center">
          <button
            type="button"
            onClick={() => load(filter, data.page + 1)}
            disabled={loading}
            className="tap inline-flex h-10 items-center gap-2 rounded-full bg-muted/70 px-5 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null} Load more
          </button>
        </div>
      ) : null}

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={detail?.subject}
        subtitle={detail ? `Ticket ${ticketNo(detail.id)} · ${KINDS[detail.kind].label}` : undefined}
        icon={detail ? <IconTile icon={KINDS[detail.kind].icon} tone={KINDS[detail.kind].tone} className="size-10 rounded-xl" /> : null}
      >
        {detail ? <TicketDetail r={detail} onNew={() => startNew(detail.kind === "DEPOSIT" ? null : detail.kind)} /> : null}
      </BottomSheet>

      <BottomSheet
        open={composer.open}
        onClose={() => setComposer((c) => ({ ...c, open: false }))}
        title="New ticket"
        subtitle="We reply right here, usually within a few hours"
        icon={<IconTile icon={LifeBuoy} tone="rose" className="size-10 rounded-xl" />}
      >
        <Composer
          key={composer.key}
          initialKind={composer.kind}
          initialTarget={composer.target}
          onCreated={onCreated}
          onView={(r) => {
            setComposer((c) => ({ ...c, open: false }));
            setDetail(r);
            setSheetOpen(true);
          }}
        />
      </BottomSheet>
    </div>
  );
}

function HelpHero({ counts, onNew }: { counts: Counts; onNew: () => void }) {
  const stats = [
    { label: "Open", value: counts.open },
    { label: "Resolved", value: counts.done },
    { label: "Total", value: counts.total },
  ];
  return (
    <section className="hero-card p-5 [--hero-a:#f43f5e] [--hero-b:#8b5cf6] sm:p-6">
      <div aria-hidden className="anim-sheen-loop pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" />
      {/* lifebuoy watermark */}
      <LifeBuoy aria-hidden className="anim-float absolute -right-6 -top-6 -z-10 size-36 text-white/[0.07]" strokeWidth={1.25} />

      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
        <LifeBuoy className="size-3.5" /> Help center
      </p>
      <h1 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">How can we help?</h1>
      <p className="mt-1.5 max-w-sm text-sm text-white/65">Key not working or a deposit didn&apos;t land? Open a ticket and follow the reply right here.</p>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="flex gap-5">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="font-display text-xl font-bold leading-none tabular-nums">{s.value}</p>
              <p className="mt-1 text-[10.5px] uppercase tracking-wider text-white/55">{s.label}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onNew}
          className="tap flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-[#0b1020] shadow-lg shadow-black/30"
        >
          <Plus className="size-4" strokeWidth={2.75} /> New ticket
        </button>
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: Status }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold", s.className)}>
      {isActive(status) ? <span className={cn("size-1.5 rounded-full", s.dot, status === "IN_PROGRESS" && "animate-pulse")} /> : null}
      {s.label}
    </span>
  );
}

function TicketRow({ r, onOpen }: { r: IssueReportRow; onOpen: () => void }) {
  const m = KINDS[r.kind];
  const sub = r.keyDetails
    ? `${r.keyDetails.productTitle} · ${r.keyDetails.durationLabel}`
    : r.deposit
      ? `${formatMoney(r.deposit.amount)} · ${pretty(r.deposit.method)}`
      : m.label;
  return (
    <button type="button" onClick={onOpen} className="tap flex w-full items-center gap-3 rounded-2xl px-2.5 py-3 text-left transition-colors hover:bg-white/[0.03]">
      <IconTile icon={m.icon} tone={m.tone} className="size-10 rounded-xl" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{r.subject}</span>
          <StatusPill status={r.status} />
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          <span className="font-mono">{ticketNo(r.id)}</span> · {sub} · {formatDate(r.createdAt)}
        </span>
        {r.adminNote ? (
          <span className="mt-1.5 flex items-center gap-1.5 text-xs text-primary">
            <MessageSquareText className="size-3.5 shrink-0" />
            <span className="truncate font-medium">{r.adminNote}</span>
          </span>
        ) : null}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />
    </button>
  );
}

function EmptyTickets({ filter, onNew }: { filter: Filter; onNew: () => void }) {
  const copy =
    filter === "open"
      ? { title: "No open tickets", hint: "Everything's handled. New tickets show up here while we work on them." }
      : filter === "done"
        ? { title: "Nothing resolved yet", hint: "Tickets move here once support closes them." }
        : { title: "No tickets yet", hint: "If a key doesn't work, a deposit didn't arrive, or you just have a question, we're one tap away." };
  return (
    <Surface className="flex flex-col items-center px-6 py-14 text-center">
      <span className="anim-float grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-rose-400/30 to-rose-400/5 text-rose-300 ring-1 ring-inset ring-rose-300/25">
        <LifeBuoy className="size-7" />
      </span>
      <p className="mt-4 font-display text-lg font-bold">{copy.title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{copy.hint}</p>
      {filter === "all" ? (
        <button type="button" onClick={onNew} className="tap bg-brand-gradient mt-5 rounded-2xl px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25">
          Open a ticket
        </button>
      ) : null}
    </Surface>
  );
}

/** Submitted → In review → Resolved/Closed. */
function StatusTrack({ status }: { status: Status }) {
  const step = status === "OPEN" ? 0 : status === "IN_PROGRESS" ? 1 : 2;
  const steps = ["Submitted", "In review", status === "CLOSED" ? "Closed" : "Resolved"];
  return (
    <div className="rounded-3xl border border-white/[0.06] bg-muted/40 px-4 py-4">
      <div className="relative mx-3 h-1 rounded-full bg-white/10">
        <span
          className="bg-brand-gradient absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `${step * 50}%` }}
        />
        {steps.map((_, i) => (
          <span
            key={i}
            className={cn(
              "absolute top-1/2 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full ring-4 ring-card",
              i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              i === step && step < 2 && "shadow-[0_0_0_7px_color-mix(in_oklab,var(--primary)_22%,transparent)]",
            )}
            style={{ left: `${i * 50}%` }}
          >
            {i < step || step === 2 ? <Check className="size-3" strokeWidth={3.5} /> : <span className="size-1.5 rounded-full bg-current" />}
          </span>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 text-[11.5px] font-semibold">
        {steps.map((s, i) => (
          <span key={s} className={cn(i === 0 ? "text-left" : i === 1 ? "text-center" : "text-right", i <= step ? "text-foreground" : "text-muted-foreground")}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function TicketDetail({ r, onNew }: { r: IssueReportRow; onNew: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copyId() {
    try {
      await navigator.clipboard.writeText(r.id);
      feedbackTap({ impact: "success", silent: true });
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <div className="space-y-4 pb-2">
      <StatusTrack status={r.status} />

      {r.keyDetails ? (
        <LinkedItem
          icon={KeyRound}
          tone="amber"
          title={`${r.keyDetails.productTitle} · ${r.keyDetails.durationLabel}`}
          sub={r.keyDetails.maskedCode ? <span className="font-mono">{r.keyDetails.maskedCode}</span> : "Key"}
          href={r.keyDetails.orderId ? `/app/order/${r.keyDetails.orderId}` : undefined}
        />
      ) : null}
      {r.deposit ? (
        <LinkedItem
          icon={Wallet}
          tone="emerald"
          title={`${formatMoney(r.deposit.amount)} deposit`}
          sub={`${r.deposit.requestedAmount} ${r.deposit.payCurrency} · ${pretty(r.deposit.status)} · ${formatDate(r.deposit.createdAt)}`}
          href={`/app/deposit/${r.deposit.id}`}
        />
      ) : null}

      {/* Conversation */}
      <div className="space-y-3">
        <div className="ml-8 flex flex-col items-end">
          <div className="max-w-full rounded-3xl rounded-br-lg border border-primary/25 bg-primary/12 px-4 py-3 text-sm">
            <p className="whitespace-pre-line break-words">{r.explanation}</p>
            {r.screenshotUrl ? (
              <a href={r.screenshotUrl} target="_blank" rel="noreferrer" className="tap mt-3 block overflow-hidden rounded-2xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.screenshotUrl} alt="Attached screenshot" className="max-h-56 w-full object-cover" />
              </a>
            ) : null}
          </div>
          <p className="mt-1 px-1 text-[11px] text-muted-foreground">You · {formatDate(r.createdAt, true)}</p>
        </div>

        <div className="mr-8 flex items-end gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-400/35 to-violet-500/30 text-rose-200 ring-1 ring-inset ring-white/10">
            <LifeBuoy className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            {r.adminNote ? (
              <div className="anim-fade-up rounded-3xl rounded-bl-lg border border-white/[0.06] bg-muted/60 px-4 py-3 text-sm">
                <p className="whitespace-pre-line break-words">{r.adminNote}</p>
              </div>
            ) : isActive(r.status) ? (
              <div className="rounded-3xl rounded-bl-lg border border-dashed border-white/10 px-4 py-3 text-sm text-muted-foreground">
                <span className="mb-1.5 flex gap-1" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </span>
                We&apos;ve got your ticket. Our reply will appear here and you&apos;ll get a notification.
              </div>
            ) : (
              <div className="rounded-3xl rounded-bl-lg border border-white/[0.06] bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                This ticket was marked {STATUS[r.status].label.toLowerCase()}.
              </div>
            )}
            <p className="mt-1 px-1 text-[11px] text-muted-foreground">
              Support{r.reviewedAt ? ` · ${formatDate(r.reviewedAt, true)}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={copyId} className="tap flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-muted/70 text-sm font-semibold">
          {copied ? <Check className="anim-pop-in size-4 text-success" strokeWidth={3} /> : <Copy className="size-4" />}
          Ticket {ticketNo(r.id)}
        </button>
        {!isActive(r.status) ? (
          <button type="button" onClick={onNew} className="tap bg-brand-gradient flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25">
            <Plus className="size-4" /> Still stuck?
          </button>
        ) : null}
      </div>
    </div>
  );
}

function LinkedItem({ icon, tone, title, sub, href }: { icon: LucideIcon; tone: Tone; title: string; sub: React.ReactNode; href?: string }) {
  const body = (
    <>
      <IconTile icon={icon} tone={tone} className="size-10 rounded-xl" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{sub}</span>
      </span>
      {href ? (
        <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary">
          <ReceiptText className="size-3.5" /> View <ChevronRight className="size-3.5" />
        </span>
      ) : null}
    </>
  );
  const cls = "flex items-center gap-3 rounded-3xl border border-white/[0.06] bg-muted/40 px-3 py-3";
  return href ? (
    <Link href={href} className={cn("tap transition-colors hover:border-white/15", cls)}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function Composer({
  initialKind,
  initialTarget,
  onCreated,
  onView,
}: {
  initialKind: Kind | null;
  initialTarget?: string;
  onCreated: (r: IssueReportRow) => void;
  onView: (r: IssueReportRow) => void;
}) {
  const [kind, setKind] = useState<Kind | null>(initialKind);
  const [keys, setKeys] = useState<EligibleKey[] | null>(null);
  const [deposits, setDeposits] = useState<EligibleDeposit[] | null>(null);
  const [target, setTarget] = useState(initialTarget ?? "");
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [shot, setShot] = useState<{ url: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [created, setCreated] = useState<IssueReportRow | null>(null);

  // Load the picker list for the selected kind once.
  const list = kind === "KEY" ? keys : kind === "DEPOSIT" ? deposits : [];
  const needsLoad = (kind === "KEY" || kind === "DEPOSIT") && list === null;
  useEffect(() => {
    if (!needsLoad) return;
    fetch(`/api/reports?${kind === "KEY" ? "eligibleKeys" : "eligibleDeposits"}=1`)
      .then((r) => r.json())
      .then((j) => (kind === "KEY" ? setKeys(j.data.keys ?? []) : setDeposits(j.data.deposits ?? [])))
      .catch(() => (kind === "KEY" ? setKeys([]) : setDeposits([])));
  }, [kind, needsLoad]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (kind === "KEY")
      return (keys ?? [])
        .map((k) => ({ id: k.keyId, title: `${k.productTitle} · ${k.durationLabel}`, sub: k.maskedCode, mono: true, date: k.createdAt, status: null as string | null }))
        .filter((o) => !q || `${o.title} ${o.sub}`.toLowerCase().includes(q));
    if (kind === "DEPOSIT")
      return (deposits ?? []).map((d) => ({
        id: d.id,
        title: formatMoney(d.amount),
        sub: `${d.requestedAmount} ${d.payCurrency} · ${pretty(d.method)}`,
        mono: false,
        date: d.createdAt,
        status: d.status as string | null,
      }));
    return [];
  }, [kind, keys, deposits, query]);

  function choose(k: Kind) {
    tap();
    setKind(k);
    setTarget("");
    setQuery("");
  }

  async function upload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/support/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Upload failed.");
      setShot({ url: json.data.upload.url, name: file.name });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!kind) return;
    if (kind === "KEY" && !target) return toast.error("Pick the key you have a problem with.");
    if (kind === "DEPOSIT" && !target) return toast.error("Pick the deposit.");
    if (kind === "DEPOSIT" && !shot) return toast.error("Attach a screenshot of the paid amount.");
    if (kind === "GENERAL" && subject.trim().length < 3) return toast.error("Enter a subject.");
    if (text.trim().length < 10) return toast.error(`Please describe ${kind === "GENERAL" ? "your question" : "the problem"} (min 10 characters).`);
    setBusy(true);
    try {
      const picked = kind === "KEY" ? keys?.find((k) => k.keyId === target) : null;
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          explanation: text.trim(),
          subject: kind === "GENERAL" ? subject.trim() : undefined,
          screenshotUrl: shot?.url,
          ...(kind === "KEY" ? { keyId: target, orderId: picked?.orderId } : kind === "DEPOSIT" ? { depositId: target } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not submit ticket.");
      feedbackSuccess();
      setCreated(json.data.report);
      onCreated(json.data.report);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit ticket.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <div className="flex flex-col items-center px-2 pb-3 pt-4 text-center">
        <svg viewBox="0 0 64 64" className="anim-success-pop size-20 text-success" fill="none">
          <circle cx="32" cy="32" r="30" className="fill-success/15" />
          <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="3" className="draw-ring" />
          <path d="M20 33l8 8 16-17" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" className="draw-check" />
        </svg>
        <p className="anim-fade-up mt-4 font-display text-xl font-bold [--d:150ms]">Ticket {ticketNo(created.id)} opened</p>
        <p className="anim-fade-up mt-1.5 max-w-xs text-sm text-muted-foreground [--d:250ms]">
          We&apos;ll reply on this ticket and send you a notification as soon as there&apos;s an update.
        </p>
        <button
          type="button"
          onClick={() => onView(created)}
          className="tap bg-brand-gradient anim-fade-up mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 [--d:350ms]"
        >
          View ticket <ChevronRight className="size-4" />
        </button>
      </div>
    );
  }

  if (!kind) {
    return (
      <div className="space-y-2.5 pb-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">What&apos;s it about?</p>
        {KIND_ORDER.map((k) => {
          const m = KINDS[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => choose(k)}
              className="tap flex w-full items-center gap-3 rounded-3xl border border-white/[0.06] bg-muted/40 px-3 py-3.5 text-left transition-colors hover:border-white/15"
            >
              <IconTile icon={m.icon} tone={m.tone} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{m.title}</span>
                <span className="block text-xs text-muted-foreground">{m.hint}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />
            </button>
          );
        })}
      </div>
    );
  }

  const m = KINDS[kind];
  const empty = list !== null && list.length === 0;

  return (
    <div className="space-y-4 pb-2">
      <button
        type="button"
        onClick={() => {
          tap();
          setKind(null);
        }}
        className="tap flex items-center gap-2 rounded-full border border-white/[0.06] bg-muted/50 py-1 pl-1 pr-3 text-xs font-semibold"
      >
        <IconTile icon={m.icon} tone={m.tone} className="size-7 rounded-full shadow-none" />
        {m.title}
        <span className="flex items-center gap-1 text-muted-foreground">
          · <ArrowLeft className="size-3" /> change
        </span>
      </button>

      {kind === "GENERAL" ? (
        <Field label="Subject">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} placeholder="e.g. How do I activate my key?" className={cn(inputCls, "h-12")} />
        </Field>
      ) : (
        <Field label={kind === "KEY" ? "Which key?" : "Which deposit?"} hint={kind === "DEPOSIT" ? "One ticket per deposit" : undefined}>
          {kind === "KEY" && (keys?.length ?? 0) > 5 ? (
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your keys…" className={cn(inputCls, "h-11 pl-10")} />
            </div>
          ) : null}
          {list === null ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <span key={i} className="skeleton block h-14 rounded-2xl" />
              ))}
            </div>
          ) : empty ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-center text-sm text-muted-foreground">
              {kind === "KEY" ? "You haven't bought any keys yet." : "No unsuccessful deposits to report. Completed deposits are already in your wallet."}
            </div>
          ) : (
            <div role="radiogroup" className="max-h-64 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5">
              {options.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No keys match.</p> : null}
              {options.map((o) => {
                const on = target === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      tap();
                      setTarget(o.id);
                    }}
                    className={cn(
                      "tap flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-colors",
                      on ? "border-primary/60 bg-primary/10" : "border-white/[0.06] bg-muted/40 hover:border-white/15",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{o.title}</span>
                        {o.status ? <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-semibold text-muted-foreground">{pretty(o.status)}</span> : null}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        <span className={cn(o.mono && "font-mono")}>{o.sub}</span> · {formatDate(o.date)}
                      </span>
                    </span>
                    <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "border-white/20")}>
                      {on ? <Check className="anim-pop-in size-3" strokeWidth={3.5} /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Field>
      )}

      <Field label={kind === "GENERAL" ? "Your question" : "What went wrong?"} hint={`${text.trim().length}/4000`}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={4000}
          className={cn(inputCls, "resize-none py-3 leading-relaxed")}
          placeholder={
            kind === "KEY"
              ? "What happens when you use the key? Any error message?"
              : kind === "DEPOSIT"
                ? "How much did you pay, from where, and when?"
                : "Ask your question in detail."
          }
        />
      </Field>

      <Field label={kind === "DEPOSIT" ? "Payment screenshot" : "Screenshot"} hint={kind === "DEPOSIT" ? "Required" : "Optional"}>
        {shot ? (
          <div className="relative overflow-hidden rounded-2xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot.url} alt={shot.name} className="max-h-44 w-full object-cover" />
            <button
              type="button"
              aria-label="Remove screenshot"
              onClick={() => setShot(null)}
              className="tap absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/70 text-white backdrop-blur"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <label
            className={cn(
              "tap flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed px-4 py-4 text-sm transition-colors hover:border-primary/50",
              kind === "DEPOSIT" ? "border-primary/40 bg-primary/5" : "border-white/10",
            )}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-primary">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">{uploading ? "Uploading…" : "Add a screenshot"}</span>
              <span className="block text-xs text-muted-foreground">
                {kind === "DEPOSIT" ? "Show the paid amount and transaction ID" : "PNG, JPG or WebP"}
              </span>
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void upload(f);
              }}
            />
          </label>
        )}
      </Field>

      <button
        type="button"
        onClick={submit}
        disabled={busy || uploading || (kind !== "GENERAL" && empty)}
        className="tap bg-brand-gradient flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null} Submit ticket
      </button>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
