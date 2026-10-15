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
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Page = {
  id: string;
  slug: string;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  content: string;
  active: boolean;
  sortOrder: number;
};

type FormState = {
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  content: string;
  active: boolean;
  sortOrder: string;
};

const emptyForm: FormState = {
  slug: "",
  title: "",
  seoTitle: "",
  seoDescription: "",
  content: "",
  active: true,
  sortOrder: "100",
};

function pageToForm(page: Page): FormState {
  return {
    slug: page.slug,
    title: page.title,
    seoTitle: page.seoTitle ?? "",
    seoDescription: page.seoDescription ?? "",
    content: page.content,
    active: page.active,
    sortOrder: String(page.sortOrder),
  };
}

function formPayload(form: FormState, includeSlug: boolean) {
  const sortOrder = Number.parseInt(form.sortOrder, 10);
  const base = {
    title: form.title.trim(),
    seoTitle: form.seoTitle.trim() || null,
    seoDescription: form.seoDescription.trim() || null,
    content: form.content.trim(),
    active: form.active,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 100,
  };
  if (!includeSlug) return base;
  return {
    ...base,
    slug: form.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, ""),
  };
}

export function StaticPagesWorkspace() {
  const { data, loading, reload } = useAdminFetch<{ pages: Page[] }>(
    "/api/admin/static-pages",
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Page | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pending, setPending] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(page: Page) {
    setEditing(page);
    setForm(pageToForm(page));
    setOpen(true);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    const payload = formPayload(form, !editing);
    if (!payload.title || !payload.content) {
      toast.error("Title and content are required");
      return;
    }
    if (!editing && !("slug" in payload && payload.slug)) {
      toast.error("Slug is required (lowercase letters, numbers, hyphens)");
      return;
    }
    setPending(true);
    const result = editing
      ? await adminMutate(`/api/admin/static-pages/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await adminMutate("/api/admin/static-pages", {
          method: "POST",
          body: JSON.stringify(payload),
        });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(editing ? "Page updated" : "Page created");
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    void reload();
  }

  async function remove(page: Page) {
    if (!window.confirm(`Delete “${page.title}”?`)) return;
    const result = await adminMutate(`/api/admin/static-pages/${page.id}`, {
      method: "DELETE",
    });
    if (!result.ok) toast.error(result.message);
    else {
      toast.success("Deleted");
      void reload();
    }
  }

  const pages = data?.pages ?? [];
  const createValid =
    form.slug.trim().length > 0 &&
    form.title.trim().length > 0 &&
    form.content.trim().length > 0;
  const editValid =
    form.title.trim().length > 0 && form.content.trim().length > 0;

  return (
    <main className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <AdminPageHeader
          title="Static Pages"
          description="Legal and info pages for footer and profile"
        />
        <Button size="sm" className="shrink-0" onClick={openCreate}>
          <Plus data-icon="inline-start" />
          New page
        </Button>
      </div>

      {loading ? (
        <AdminListSkeleton />
      ) : !pages.length ? (
        <AdminEmptyState message="No static pages yet. Add Privacy, Terms, or About." />
      ) : (
        <ul className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {pages.map((page) => (
            <li key={page.id}>
              <div className="flex w-full items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/50">
                <button
                  type="button"
                  onClick={() => openEdit(page)}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="line-clamp-1 text-sm font-semibold">
                        {page.title}
                      </span>
                      <Badge variant="outline">/{page.slug}</Badge>
                      <Badge variant={page.active ? "secondary" : "outline"}>
                        {page.active ? "Active" : "Off"}
                      </Badge>
                    </span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {page.content}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      Sort {page.sortOrder} · /pages/{page.slug}
                    </span>
                  </span>
                </button>
                <span className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Edit page"
                    onClick={() => openEdit(page)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    aria-label="Delete page"
                    onClick={() => void remove(page)}
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
                  <FileText className="size-4" />
                </span>
                {editing ? "Edit page" : "New static page"}
              </DialogTitle>
              <DialogDescription>
                Active pages appear in the site footer and profile help section.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="sp-slug">Slug</Label>
              <Input
                id="sp-slug"
                value={form.slug}
                onChange={(e) => updateField("slug", e.target.value)}
                placeholder="privacy-policy"
                maxLength={80}
                disabled={Boolean(editing)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Public URL: /pages/{form.slug.trim() || "…"}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-title">Title</Label>
              <Input
                id="sp-title"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Privacy Policy"
                maxLength={160}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-content">Content</Label>
              <Textarea
                id="sp-content"
                value={form.content}
                onChange={(e) => updateField("content", e.target.value)}
                placeholder="Page body…"
                className="min-h-36"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sp-seo-title">SEO title (optional)</Label>
                <Input
                  id="sp-seo-title"
                  value={form.seoTitle}
                  onChange={(e) => updateField("seoTitle", e.target.value)}
                  maxLength={160}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp-sort">Sort order</Label>
                <Input
                  id="sp-sort"
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
            <div className="space-y-1.5">
              <Label htmlFor="sp-seo-desc">SEO description (optional)</Label>
              <Textarea
                id="sp-seo-desc"
                value={form.seoDescription}
                onChange={(e) => updateField("seoDescription", e.target.value)}
                className="min-h-16"
                maxLength={320}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
              <div className="min-w-0">
                <Label htmlFor="sp-active" className="text-sm font-medium">
                  Active
                </Label>
                <p className="text-xs text-muted-foreground">
                  Publish on footer and profile
                </p>
              </div>
              <Switch
                id="sp-active"
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
              disabled={pending || (editing ? !editValid : !createValid)}
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
