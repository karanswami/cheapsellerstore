"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, HelpCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import { Chips, ConfirmDialog, Field, SearchBox, SubmitButton, TableSkeleton, ToggleRow, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { MiniStats, MoveButtons, StatusDot, nextOrder, useReorder } from "@/components/admin/content-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Faq = { id: string; question: string; answer: string; category: string | null; active: boolean; sortOrder: number };

export function Faqs() {
  const { data, loading, reload } = useAdminQuery<{ faqs: Faq[] }>("/api/admin/faqs");
  const [editing, setEditing] = useState<Faq | "new" | null>(null);
  const [del, setDel] = useState<Faq | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const { move, busy } = useReorder<Faq>({ endpoint: "/api/admin/faqs", field: "sortOrder", get: (f) => f.sortOrder, reload });

  const all = useMemo(() => [...(data?.faqs ?? [])].sort((a, b) => a.sortOrder - b.sortOrder), [data]);
  const categories = useMemo(() => Array.from(new Set(all.map((f) => f.category).filter((c): c is string => !!c))).sort(), [all]);
  const needle = q.trim().toLowerCase();
  const shown = all.filter((f) => (cat === "all" || (cat === "none" ? !f.category : f.category === cat)) && (!needle || `${f.question} ${f.answer}`.toLowerCase().includes(needle)));
  const filtered = needle !== "" || cat !== "all";
  const live = all.filter((f) => f.active).length;

  async function toggle(f: Faq, active: boolean) {
    try {
      await adminFetch(`/api/admin/faqs/${f.id}`, { method: "PATCH", json: { active } });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div className="space-y-5">
      <MiniStats
        items={[
          { label: "Total", value: all.length },
          { label: "Published", value: live, tone: "success" },
          { label: "Categories", value: categories.length },
        ]}
      />
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Search questions or answers…" />
        <Button className="ml-auto" onClick={() => setEditing("new")}>
          <Plus /> New FAQ
        </Button>
      </div>
      {categories.length > 0 ? (
        <Chips
          value={cat}
          onChange={setCat}
          options={[{ v: "all", label: "All" }, ...categories.map((c) => ({ v: c, label: c })), { v: "none", label: "Uncategorised" }]}
        />
      ) : null}

      {loading && !data ? (
        <TableSkeleton rows={4} />
      ) : all.length === 0 ? (
        <EmptyState icon={HelpCircle} title="No FAQs yet" hint="Add the questions customers ask most — they show on the help centre." />
      ) : shown.length === 0 ? (
        <p className="rounded-xl border bg-card py-10 text-center text-sm text-muted-foreground">No FAQs match your filters.</p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {shown.map((f) => {
            const index = all.findIndex((x) => x.id === f.id);
            const expanded = open === f.id;
            return (
              <li key={f.id} className={cn(!f.active && "bg-muted/30")}>
                <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
                  <MoveButtons onUp={() => move(all, index, -1)} onDown={() => move(all, index, 1)} disableUp={busy || filtered || index === 0} disableDown={busy || filtered || index === all.length - 1} />
                  <button type="button" onClick={() => setOpen(expanded ? null : f.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={expanded}>
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-sm font-medium", !f.active && "text-muted-foreground")}>{f.question}</span>
                      {!expanded ? <span className="block truncate text-xs text-muted-foreground">{f.answer}</span> : null}
                    </span>
                    <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
                  </button>
                  {f.category ? (
                    <Badge variant="outline" className="hidden sm:inline-flex">
                      {f.category}
                    </Badge>
                  ) : null}
                  <Switch checked={f.active} onCheckedChange={(v) => toggle(f, v)} aria-label="Published" />
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditing(f)} aria-label="Edit">
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDel(f)} aria-label="Delete">
                    <Trash2 />
                  </Button>
                </div>
                {expanded ? (
                  <div className="border-t bg-muted/20 px-4 py-3 pl-14 text-sm sm:pl-[4.75rem]">
                    <p className="whitespace-pre-wrap text-muted-foreground">{f.answer}</p>
                    <div className="mt-2">
                      <StatusDot on={f.active} onLabel="Published" offLabel="Draft" />
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {filtered && all.length > 1 ? <p className="text-xs text-muted-foreground">Clear search and filters to change the order.</p> : null}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          {editing !== null ? (
            <FaqForm
              key={editing === "new" ? "new" : editing.id}
              faq={editing === "new" ? null : editing}
              categories={categories}
              nextSort={nextOrder(all.map((f) => f.sortOrder))}
              onSaved={() => {
                setEditing(null);
                reload();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title="Delete this FAQ?"
        description={del?.question}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            await adminFetch(`/api/admin/faqs/${del!.id}`, { method: "DELETE" });
            toast.success("FAQ deleted.");
            reload();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}

function FaqForm({ faq, categories, nextSort, onSaved }: { faq: Faq | null; categories: string[]; nextSort: number; onSaved: () => void }) {
  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");
  const [category, setCategory] = useState(faq?.category ?? "");
  const [active, setActive] = useState(faq?.active ?? true);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const body = { question: question.trim(), answer: answer.trim(), category: category.trim() || null, active, ...(faq ? {} : { sortOrder: nextSort }) };
      await adminFetch(faq ? `/api/admin/faqs/${faq.id}` : "/api/admin/faqs", { method: faq ? "PATCH" : "POST", json: body });
      toast.success(faq ? "FAQ updated." : "FAQ added.");
      onSaved();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{faq ? "Edit FAQ" : "New FAQ"}</DialogTitle>
        <DialogDescription>Shown on the help centre. Keep answers short and direct.</DialogDescription>
      </DialogHeader>
      <Field label="Question">
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={300} placeholder="How do I add funds?" />
      </Field>
      <Field label="Answer" hint={`${answer.length}/5000`}>
        <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={6} maxLength={5000} />
      </Field>
      <Field label="Category" hint="Optional. Pick one below or type a new one.">
        <Input value={category} onChange={(e) => setCategory(e.target.value)} maxLength={40} placeholder="Payments" />
        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn("rounded-full border px-2.5 py-0.5 text-xs transition-colors", category === c ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent")}
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}
      </Field>
      <ToggleRow label="Published" hint={active ? "Visible on the help centre." : "Saved as a draft."} checked={active} onChange={setActive} />
      <DialogFooter>
        <SubmitButton busy={busy} disabled={!question.trim() || !answer.trim()} onClick={save}>
          {faq ? "Save changes" : "Add FAQ"}
        </SubmitButton>
      </DialogFooter>
    </>
  );
}
