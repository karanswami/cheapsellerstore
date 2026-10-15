"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import { adminMutate, useAdminFetch } from "@/components/admin/use-admin-fetch";
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
import { Textarea } from "@/components/ui/textarea";
import { FileQuestion, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Faq = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  active: boolean;
  sortOrder: number;
};

type FormState = {
  question: string;
  answer: string;
  category: string;
  active: boolean;
  sortOrder: string;
};

const emptyForm: FormState = {
  question: "",
  answer: "",
  category: "",
  active: true,
  sortOrder: "100",
};

function faqToForm(faq: Faq): FormState {
  return {
    question: faq.question,
    answer: faq.answer,
    category: faq.category ?? "",
    active: faq.active,
    sortOrder: String(faq.sortOrder),
  };
}

function formPayload(form: FormState) {
  const sortOrder = Number.parseInt(form.sortOrder, 10);
  return {
    question: form.question.trim(),
    answer: form.answer.trim(),
    category: form.category.trim() || null,
    active: form.active,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 100,
  };
}

export function FaqsWorkspace() {
  const { data, loading, reload } = useAdminFetch<{ faqs: Faq[] }>(
    "/api/admin/faqs",
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pending, setPending] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(faq: Faq) {
    setEditing(faq);
    setForm(faqToForm(faq));
    setOpen(true);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    const payload = formPayload(form);
    if (!payload.question || !payload.answer) {
      toast.error("Question and answer are required");
      return;
    }
    setPending(true);
    const result = editing
      ? await adminMutate(`/api/admin/faqs/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await adminMutate("/api/admin/faqs", {
          method: "POST",
          body: JSON.stringify(payload),
        });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(editing ? "FAQ updated" : "FAQ created");
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    void reload();
  }

  async function remove(faq: Faq) {
    if (!window.confirm(`Delete “${faq.question.slice(0, 60)}”?`)) return;
    const result = await adminMutate(`/api/admin/faqs/${faq.id}`, {
      method: "DELETE",
    });
    if (!result.ok) toast.error(result.message);
    else {
      toast.success("Deleted");
      void reload();
    }
  }

  const faqs = data?.faqs ?? [];

  return (
    <main className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <AdminPageHeader
          title="FAQs"
          description="Help articles for storefront, profile, and support chat"
        />
        <Button size="sm" className="shrink-0" onClick={openCreate}>
          <Plus data-icon="inline-start" />
          New FAQ
        </Button>
      </div>

      {loading ? (
        <AdminListSkeleton />
      ) : !faqs.length ? (
        <AdminEmptyState message="No FAQs yet. Add questions customers ask most." />
      ) : (
        <ul className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {faqs.map((faq) => (
            <li key={faq.id}>
              <div className="flex w-full items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/50">
                <button
                  type="button"
                  onClick={() => openEdit(faq)}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileQuestion className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="line-clamp-2 text-sm font-semibold">
                        {faq.question}
                      </span>
                      <Badge variant={faq.active ? "secondary" : "outline"}>
                        {faq.active ? "Active" : "Off"}
                      </Badge>
                      {faq.category ? (
                        <Badge variant="outline">{faq.category}</Badge>
                      ) : null}
                    </span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {faq.answer}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      Sort {faq.sortOrder}
                    </span>
                  </span>
                </button>
                <span className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Edit FAQ"
                    onClick={() => openEdit(faq)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    aria-label="Delete FAQ"
                    onClick={() => void remove(faq)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setEditing(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="flex max-h-[min(92dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <DialogTitle className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileQuestion className="size-4" />
                </span>
                {editing ? "Edit FAQ" : "New FAQ"}
              </DialogTitle>
              <DialogDescription>
                Active FAQs show on /faq, profile help, and support quick chips.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="faq-q">Question</Label>
              <Input
                id="faq-q"
                value={form.question}
                onChange={(e) => updateField("question", e.target.value)}
                placeholder="How do I deposit?"
                maxLength={300}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="faq-a">Answer</Label>
              <Textarea
                id="faq-a"
                value={form.answer}
                onChange={(e) => updateField("answer", e.target.value)}
                placeholder="Step-by-step answer…"
                className="min-h-28"
                maxLength={5000}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="faq-cat">Category (optional)</Label>
                <Input
                  id="faq-cat"
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  placeholder="Wallet, Keys…"
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faq-sort">Sort order</Label>
                <Input
                  id="faq-sort"
                  type="number"
                  min={0}
                  max={10000}
                  value={form.sortOrder}
                  onChange={(e) => updateField("sortOrder", e.target.value)}
                  className="tabular-nums"
                />
                <p className="text-xs text-muted-foreground">Lower shows first</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
              <div className="min-w-0">
                <Label htmlFor="faq-active" className="text-sm font-medium">
                  Active
                </Label>
                <p className="text-xs text-muted-foreground">
                  Publish on storefront and support
                </p>
              </div>
              <Switch
                id="faq-active"
                checked={form.active}
                onCheckedChange={(checked) => updateField("active", checked)}
              />
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 border-t border-border/40 bg-muted/20 px-4 py-4 sm:justify-end sm:px-5">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                pending || !form.question.trim() || !form.answer.trim()
              }
              onClick={() => void save()}
            >
              {pending ? "Saving…" : editing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
