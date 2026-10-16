"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CircleHelp, Flag, ImageUp, KeyRound, Loader2, Plus, Wallet } from "lucide-react";
import { EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/currencies";
import type { IssueReportRow } from "@/lib/issue-reports";
import { cn } from "@/lib/utils";

const KIND_LABEL = { KEY: "Key", DEPOSIT: "Deposit", GENERAL: "Question" } as const;
type Kind = keyof typeof KIND_LABEL;

type Page = { reports: IssueReportRow[]; page: number; limit: number; total: number; hasMore: boolean };
type EligibleKey = { keyId: string; orderId: string | null; productTitle: string; durationLabel: string; maskedCode: string; createdAt: string };
type EligibleDeposit = { id: string; amount: number; payCurrency: string; requestedAmount: number; status: string; method: string; createdAt: string };

export function ReportsClient({ initial }: { initial: Page }) {
  const [data, setData] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  async function more() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?page=${data.page + 1}&limit=15`);
      const json = await res.json();
      if (res.ok) setData((p) => ({ ...json.data, reports: [...p.reports, ...json.data.reports] }));
    } finally {
      setLoading(false);
    }
  }

  const openCount = data.reports.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS").length;
  const doneCount = data.reports.filter((r) => r.status === "RESOLVED" || r.status === "CLOSED").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border bg-card px-3 py-1.5 font-medium">{data.total} total</span>
          <span className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1.5 font-medium">{openCount} open</span>
          <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1.5 font-medium">{doneCount} resolved</span>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus /> New report
        </Button>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogTitle>New report</DialogTitle>
          <DialogDescription>Pick a reason, then tell us what happened.</DialogDescription>
          {creating ? (
            <NewReport
              onCreated={(r) => {
                setData((p) => ({ ...p, total: p.total + 1, reports: [r, ...p.reports] }));
                setCreating(false);
                setOpen(r.id);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {data.reports.length === 0 ? (
        <EmptyState icon={Flag} title="No reports yet" hint="If a key doesn't work, a deposit didn't arrive, or you just have a question, open a report and we'll look into it.">
          <Button onClick={() => setCreating(true)}>
            <Plus /> New report
          </Button>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {data.reports.map((r) => {
            const expanded = open === r.id;
            return (
              <li key={r.id} className="rounded-xl border bg-card">
                <button onClick={() => setOpen(expanded ? null : r.id)} className="flex w-full items-center gap-3 p-4 text-left">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-primary">
                    {r.kind === "KEY" ? <KeyRound className="size-4" /> : r.kind === "DEPOSIT" ? <Wallet className="size-4" /> : <CircleHelp className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.subject}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">{KIND_LABEL[r.kind]}</span> · #{r.id.slice(-6).toUpperCase()} · {formatDate(r.createdAt)}
                    </span>
                  </span>
                  <StatusBadge status={r.status} />
                </button>
                {expanded ? (
                  <div className="space-y-3 border-t p-4 text-sm">
                    {r.keyDetails ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
                        <KeyRound className="size-3.5 text-primary" />
                        <span className="font-medium">
                          {r.keyDetails.productTitle} — {r.keyDetails.durationLabel}
                        </span>
                        {r.keyDetails.maskedCode ? <span className="font-mono text-muted-foreground">{r.keyDetails.maskedCode}</span> : null}
                      </div>
                    ) : null}
                    {r.deposit ? (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-muted/50 px-3 py-2 text-xs">
                        <Wallet className="size-3.5 text-primary" />
                        <span className="font-medium">{formatMoney(r.deposit.amount)}</span>
                        <span className="text-muted-foreground">
                          {r.deposit.requestedAmount} {r.deposit.payCurrency}
                        </span>
                        <StatusBadge status={r.deposit.status} />
                        <span className="text-muted-foreground">{formatDate(r.deposit.createdAt)}</span>
                      </div>
                    ) : null}
                    <p className="whitespace-pre-line">{r.explanation}</p>
                    {r.screenshotUrl ? (
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">{r.kind === "DEPOSIT" ? "Paid amount screenshot" : "Screenshot"}</p>
                        <a href={r.screenshotUrl} target="_blank" rel="noreferrer" className="inline-block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.screenshotUrl} alt="Screenshot" className="max-h-48 rounded-lg border" />
                        </a>
                      </div>
                    ) : null}
                    <div className={cn("rounded-lg border p-3", r.adminNote ? "border-primary/30 bg-primary/10" : "border-dashed text-muted-foreground")}>
                      <p className="text-xs font-semibold uppercase tracking-wider">Support reply</p>
                      <p className="mt-1 whitespace-pre-line">{r.adminNote ?? "No reply yet — we'll update this ticket soon."}</p>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {data.hasMore ? (
        <div className="text-center">
          <Button variant="secondary" onClick={more} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : null} Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}

const REASONS: { kind: Kind; title: string; hint: string; icon: typeof Flag }[] = [
  { kind: "KEY", title: "Key", hint: "A purchased key isn't working", icon: KeyRound },
  { kind: "DEPOSIT", title: "Deposit", hint: "Paid but wallet not credited", icon: Wallet },
  { kind: "GENERAL", title: "Question", hint: "Anything else you need help with", icon: CircleHelp },
];

function NewReport({ onCreated }: { onCreated: (r: IssueReportRow) => void }) {
  const [kind, setKind] = useState<Kind>("KEY");
  const [keys, setKeys] = useState<EligibleKey[] | null>(null);
  const [deposits, setDeposits] = useState<EligibleDeposit[] | null>(null);
  const [target, setTarget] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [shot, setShot] = useState<{ url: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Load the picker list for the selected kind once.
  const list = kind === "KEY" ? keys : kind === "DEPOSIT" ? deposits : [];
  const needsLoad = kind !== "GENERAL" && list === null;
  useEffect(() => {
    if (!needsLoad) return;
    fetch(`/api/reports?${kind === "KEY" ? "eligibleKeys" : "eligibleDeposits"}=1`)
      .then((r) => r.json())
      .then((j) => (kind === "KEY" ? setKeys(j.data.keys ?? []) : setDeposits(j.data.deposits ?? [])))
      .catch(() => (kind === "KEY" ? setKeys([]) : setDeposits([])));
  }, [kind, needsLoad]);

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
      if (!res.ok) throw new Error(json.error?.message ?? "Could not submit report.");
      toast.success("Report submitted.");
      onCreated(json.data.report);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit report.");
      setBusy(false);
    }
  }

  const empty = list !== null && list.length === 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {REASONS.map(({ kind: k, title, hint, icon: Icon }) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setKind(k);
              setTarget("");
              setShot(null);
            }}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors",
              kind === k ? "border-primary bg-primary/10 text-foreground" : "bg-muted/40 text-muted-foreground hover:border-primary/40",
            )}
          >
            <Icon className={cn("size-5", kind === k && "text-primary")} />
            <span className="text-sm font-semibold">{title}</span>
            <span className="hidden text-[11px] leading-tight sm:block">{hint}</span>
          </button>
        ))}
      </div>

      {kind === "GENERAL" ? (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Subject</span>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} placeholder="e.g. How do I activate my key?" />
        </label>
      ) : (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {kind === "KEY" ? "Which key?" : "Which deposit? (one report per deposit)"}
          </span>
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="h-10 w-full rounded-lg border bg-input px-3 text-sm outline-none focus-visible:border-primary">
            <option value="">{list === null ? "Loading…" : empty ? (kind === "KEY" ? "No purchased keys" : "No unsuccessful deposits to report") : "Select…"}</option>
            {kind === "KEY"
              ? keys?.map((k) => (
                  <option key={k.keyId} value={k.keyId}>
                    {k.productTitle} — {k.durationLabel} ({k.maskedCode})
                  </option>
                ))
              : deposits?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {formatDate(d.createdAt)} · {formatMoney(d.amount)} · {d.status}
                  </option>
                ))}
          </select>
        </label>
      )}

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">{kind === "GENERAL" ? "Your question" : "What went wrong?"}</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={4000}
          className="w-full rounded-lg border bg-input px-3 py-2 text-sm outline-none focus-visible:border-primary"
          placeholder={kind === "GENERAL" ? "Ask your question in detail." : "Describe the problem with as much detail as you can."}
        />
      </label>

      {kind === "DEPOSIT" ? (
        <label className={cn("flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm hover:border-primary/50", !shot && "border-primary/40")}>
          {uploading ? <Loader2 className="size-4 animate-spin text-primary" /> : <ImageUp className="size-4 text-primary" />}
          <span className="truncate">{shot ? shot.name : "Screenshot of paid amount (required)"}</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      ) : null}

      <Button onClick={submit} disabled={busy || uploading || (kind !== "GENERAL" && empty)} className="w-full">
        {busy ? <Loader2 className="animate-spin" /> : null} Submit report
      </Button>
    </div>
  );
}
