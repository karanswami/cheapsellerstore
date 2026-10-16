"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ClipboardPaste, Eraser, KeyRound, PackagePlus, ShieldCheck, Upload } from "lucide-react";
import { Field, SubmitButton, adminFetch, errMsg } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type StockRow = { id: string; label: string; productId: string; productTitle: string; available: number; sold: number; disabled: number; total: number };
type Rejected = { code: string; reason: string };
type Result = { imported: number; rejected: Rejected[] };

const CHUNK = 500;
const MAX_TOTAL = 5000;

function parse(text: string) {
  const all = text.split(/[\r\n,;]+/).map((c) => c.trim()).filter(Boolean);
  const seen = new Set<string>();
  const unique: string[] = [];
  const dupes: string[] = [];
  for (const c of all) {
    if (seen.has(c)) dupes.push(c);
    else {
      seen.add(c);
      unique.push(c);
    }
  }
  return { total: all.length, unique, dupes };
}

export function AddKeys({ rows, initialDurationId, onUploaded }: { rows: StockRow[]; initialDurationId: string; onUploaded: () => void }) {
  const [productId, setProductId] = useState(() => rows.find((r) => r.id === initialDurationId)?.productId ?? "");
  const [durationId, setDurationId] = useState(initialDurationId);
  const [text, setText] = useState("");
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const products = useMemo(() => {
    const m = new Map<string, { id: string; title: string; available: number; count: number }>();
    for (const r of rows) {
      const cur = m.get(r.productId) ?? { id: r.productId, title: r.productTitle, available: 0, count: 0 };
      cur.available += r.available;
      cur.count += 1;
      m.set(r.productId, cur);
    }
    return [...m.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [rows]);
  const durations = rows.filter((r) => r.productId === productId);
  const target = rows.find((r) => r.id === durationId) ?? null;
  const parsed = useMemo(() => parse(text), [text]);
  const tooMany = parsed.unique.length > MAX_TOTAL;
  const ready = !!target && parsed.unique.length > 0 && !tooMany;
  const step = !productId ? 1 : !durationId ? 2 : 3;

  async function upload() {
    if (!target) return;
    setBusy(true);
    setProgress(0);
    const rejected: Rejected[] = [];
    let imported = 0;
    try {
      for (let i = 0; i < parsed.unique.length; i += CHUNK) {
        const r = await adminFetch<Result>("/api/admin/keys/import", {
          method: "POST",
          json: { durationId: target.id, codes: parsed.unique.slice(i, i + CHUNK) },
        });
        imported += r.imported;
        rejected.push(...r.rejected);
        setProgress(Math.min(parsed.unique.length, i + CHUNK));
      }
      setReview(false);
      setResult({ imported, rejected });
      setText("");
      onUploaded();
    } catch (e) {
      toast.error(errMsg(e));
      if (imported) {
        setReview(false);
        setResult({ imported, rejected });
        onUploaded();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {[
            { n: 1, label: "Product" },
            { n: 2, label: "Duration" },
            { n: 3, label: "Paste keys" },
          ].map((s) => (
            <Badge key={s.n} variant={step > s.n ? "success" : step === s.n ? "default" : "outline"} shape="pill">
              {step > s.n ? <CheckCircle2 className="size-3" /> : <span>{s.n}</span>} {s.label}
            </Badge>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product">
            <Select
              value={productId}
              onValueChange={(v) => {
                setProductId(v);
                setDurationId("");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title} · {p.available} in stock
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Duration">
            <Select value={durationId} onValueChange={setDurationId} disabled={!productId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={productId ? "Choose a duration" : "Pick a product first"} />
              </SelectTrigger>
              <SelectContent>
                {durations.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label} · {d.available} available
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {target ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" shape="pill">{target.productTitle}</Badge>
            <Badge variant="outline" shape="pill">{target.label}</Badge>
            <Badge variant={target.available === 0 ? "destructive" : target.available < 5 ? "warning" : "success"} shape="pill">{target.available} available</Badge>
            <Badge variant="muted" shape="pill">{target.sold} sold</Badge>
            {target.disabled ? <Badge variant="warning" shape="pill">{target.disabled} disabled</Badge> : null}
          </div>
        ) : null}

        <div className="mt-4">
          <Field label="Keys" hint="Paste one key per line (commas also work). Max 5,000 per upload.">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              disabled={!target}
              className="font-mono text-xs"
              placeholder={target ? "XXXX-XXXX-XXXX\nYYYY-YYYY-YYYY" : "Select a product and duration to start pasting"}
            />
          </Field>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="default" shape="pill"><KeyRound className="size-3" /> {parsed.total} detected</Badge>
            <Badge variant="success" shape="pill">{parsed.unique.length} unique</Badge>
            {parsed.dupes.length ? <Badge variant="warning" shape="pill">{parsed.dupes.length} duplicate in paste</Badge> : null}
            {tooMany ? <Badge variant="destructive" shape="pill">Over {MAX_TOTAL} limit</Badge> : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" disabled={!text} onClick={() => setText("")}>
            <Eraser /> Clear
          </Button>
          <Button
            variant="secondary"
            disabled={!target}
            onClick={async () => {
              try {
                setText(await navigator.clipboard.readText());
              } catch {
                toast.error("Clipboard blocked — paste manually.");
              }
            }}
          >
            <ClipboardPaste /> Paste
          </Button>
          <Button disabled={!ready} onClick={() => setReview(true)}>
            <ShieldCheck /> Review {parsed.unique.length || ""}
          </Button>
        </div>
      </div>

      <Dialog open={review} onOpenChange={(o) => !busy && setReview(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="size-5 text-primary" /> Review upload
            </DialogTitle>
            <DialogDescription>Check everything below before the keys go live.</DialogDescription>
          </DialogHeader>
          {target ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" shape="pill">{target.productTitle}</Badge>
                <Badge variant="outline" shape="pill">{target.label}</Badge>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <Stat label="Keys pasted" value={parsed.total} />
                <Stat label="Will upload" value={parsed.unique.length} tone="success" />
                <Stat label="Duplicates removed" value={parsed.dupes.length} tone={parsed.dupes.length ? "warning" : undefined} />
                <Stat label="Stock after" value={`${target.available} → ${target.available + parsed.unique.length}`} />
              </dl>
              {parsed.unique.length > CHUNK ? (
                <p className="text-xs text-muted-foreground">Uploads in {Math.ceil(parsed.unique.length / CHUNK)} batches of {CHUNK}.</p>
              ) : null}
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Preview</p>
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {parsed.unique.slice(0, 100).map((c, i) => (
                    <li key={c} className="flex items-center gap-2 text-xs">
                      <span className="w-6 shrink-0 text-right text-muted-foreground">{i + 1}</span>
                      <code className="truncate">{c}</code>
                    </li>
                  ))}
                  {parsed.unique.length > 100 ? <li className="text-center text-xs text-muted-foreground">+ {parsed.unique.length - 100} more</li> : null}
                </ul>
              </div>
              <p className="text-xs text-muted-foreground">Keys already in inventory are skipped automatically and listed after upload.</p>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" disabled={busy} onClick={() => setReview(false)}>
              Back
            </Button>
            <SubmitButton busy={busy} onClick={upload}>
              <Upload /> {busy ? `Uploading ${progress}/${parsed.unique.length}` : `Upload ${parsed.unique.length} keys`}
            </SubmitButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!result} onOpenChange={(o) => !o && setResult(null)}>
        <DialogContent className="max-w-lg">
          {result ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {result.rejected.length && !result.imported ? <AlertTriangle className="size-5 text-warning" /> : <CheckCircle2 className="size-5 text-success" />}
                  Upload complete
                </DialogTitle>
                <DialogDescription>
                  {target?.productTitle} · {target?.label}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="success" shape="pill">{result.imported} imported</Badge>
                <Badge variant={result.rejected.length ? "warning" : "outline"} shape="pill">{result.rejected.length} skipped</Badge>
              </div>
              {result.rejected.length ? (
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2 text-xs">
                  {result.rejected.map((r, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <code className="truncate">{r.code}</code>
                      <Badge variant="outline" className="shrink-0">{r.reason}</Badge>
                    </li>
                  ))}
                </ul>
              ) : null}
              <DialogFooter>
                <Button onClick={() => setResult(null)}>Done</Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "success" | "warning" }) {
  return (
    <div className="rounded-lg border p-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`font-display text-lg font-semibold ${tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : ""}`}>{value}</dd>
    </div>
  );
}
