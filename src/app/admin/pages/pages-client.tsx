"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Copy, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState, formatDate } from "@/components/app-ui";
import { ConfirmDialog, Field, SearchBox, SubmitButton, TableSkeleton, ToggleRow, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { MiniStats, MoveButtons, StatusDot, nextOrder, useReorder } from "@/components/admin/content-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type StaticPage = { id: string; slug: string; title: string; seoTitle: string | null; seoDescription: string | null; content: string; active: boolean; sortOrder: number; updatedAt?: string };

const TEMPLATES = [
  { title: "Terms of Service", slug: "terms" },
  { title: "Privacy Policy", slug: "privacy" },
  { title: "Refund Policy", slug: "refund-policy" },
  { title: "About Us", slug: "about" },
  { title: "Contact", slug: "contact" },
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export function Pages() {
  const { data, loading, reload } = useAdminQuery<{ pages: StaticPage[] }>("/api/admin/static-pages");
  const [editing, setEditing] = useState<StaticPage | { title: string; slug: string } | "new" | null>(null);
  const [del, setDel] = useState<StaticPage | null>(null);
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const { move, busy } = useReorder<StaticPage>({ endpoint: "/api/admin/static-pages", field: "sortOrder", get: (p) => p.sortOrder, reload });

  const all = useMemo(() => [...(data?.pages ?? [])].sort((a, b) => a.sortOrder - b.sortOrder), [data]);
  const needle = q.trim().toLowerCase();
  const shown = all.filter((p) => !needle || `${p.title} ${p.slug}`.toLowerCase().includes(needle));
  const live = all.filter((p) => p.active).length;
  const missing = TEMPLATES.filter((t) => !all.some((p) => p.slug === t.slug));

  async function toggle(p: StaticPage, active: boolean) {
    try {
      await adminFetch(`/api/admin/static-pages/${p.id}`, { method: "PATCH", json: { active } });
      toast.success(active ? "Page published." : "Page unpublished.");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function copy(slug: string) {
    try {
      await navigator.clipboard.writeText(`/${slug}`);
      setCopied(slug);
      setTimeout(() => setCopied((c) => (c === slug ? null : c)), 1500);
    } catch {
      toast.error("Couldn't copy.");
    }
  }

  const isExisting = (e: typeof editing): e is StaticPage => !!e && typeof e === "object" && "id" in e;

  return (
    <div className="space-y-5">
      <MiniStats
        items={[
          { label: "Total", value: all.length },
          { label: "Published", value: live, tone: "success" },
          { label: "Drafts", value: all.length - live, tone: "muted" },
        ]}
      />
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Search title or slug…" />
        <Button className="ml-auto" onClick={() => setEditing("new")}>
          <Plus /> New page
        </Button>
      </div>
      {missing.length > 0 && !loading ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed p-3 text-sm">
          <span className="text-muted-foreground">Quick start:</span>
          {missing.map((t) => (
            <button key={t.slug} type="button" onClick={() => setEditing({ title: t.title, slug: t.slug })} className="rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary">
              + {t.title}
            </button>
          ))}
        </div>
      ) : null}

      {loading && !data ? (
        <TableSkeleton rows={4} />
      ) : all.length === 0 ? (
        <EmptyState icon={FileText} title="No pages yet" hint="Terms, privacy, refund policy — use the quick start buttons above." />
      ) : shown.length === 0 ? (
        <p className="rounded-xl border bg-card py-10 text-center text-sm text-muted-foreground">No pages match your search.</p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {shown.map((p) => {
            const index = all.findIndex((x) => x.id === p.id);
            return (
              <li key={p.id} className={cn("flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4", !p.active && "bg-muted/30")}>
                <MoveButtons onUp={() => move(all, index, -1)} onDown={() => move(all, index, 1)} disableUp={busy || !!needle || index === 0} disableDown={busy || !!needle || index === all.length - 1} />
                <span className="hidden size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary sm:grid">
                  <FileText className="size-4" />
                </span>
                <button type="button" onClick={() => setEditing(p)} className="min-w-0 flex-1 text-left">
                  <span className="flex items-center gap-2">
                    <span className={cn("truncate text-sm font-medium", !p.active && "text-muted-foreground")}>{p.title}</span>
                    <span className="hidden sm:inline">
                      <StatusDot on={p.active} onLabel="Published" offLabel="Draft" />
                    </span>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {words(p.content)} words{p.updatedAt ? ` · updated ${formatDate(p.updatedAt)}` : ""}
                  </span>
                </button>
                <button type="button" onClick={() => copy(p.slug)} className="hidden items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-accent md:inline-flex" title="Copy path">
                  /{p.slug}
                  {copied === p.slug ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                </button>
                <Switch checked={p.active} onCheckedChange={(v) => toggle(p, v)} aria-label="Published" />
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(p)} aria-label="Edit">
                  <Pencil />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setDel(p)} aria-label="Delete">
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {needle && all.length > 1 ? <p className="text-xs text-muted-foreground">Clear the search to change the order.</p> : null}

      <Sheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          {editing !== null ? (
            <PageForm
              key={editing === "new" ? "new" : isExisting(editing) ? editing.id : editing.slug}
              page={isExisting(editing) ? editing : null}
              preset={editing !== "new" && !isExisting(editing) ? editing : null}
              nextSort={nextOrder(all.map((p) => p.sortOrder))}
              takenSlugs={all.map((p) => p.slug)}
              onSaved={() => {
                setEditing(null);
                reload();
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title={`Delete "${del?.title}"?`}
        description="The page URL will stop working. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            await adminFetch(`/api/admin/static-pages/${del!.id}`, { method: "DELETE" });
            toast.success("Page deleted.");
            reload();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}

function PageForm({
  page,
  preset,
  nextSort,
  takenSlugs,
  onSaved,
}: {
  page: StaticPage | null;
  preset: { title: string; slug: string } | null;
  nextSort: number;
  takenSlugs: string[];
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(page?.title ?? preset?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? preset?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!preset);
  const [seoTitle, setSeoTitle] = useState(page?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(page?.seoDescription ?? "");
  const [seoOpen, setSeoOpen] = useState(!!(page?.seoTitle || page?.seoDescription));
  const [content, setContent] = useState(page?.content ?? "");
  const [active, setActive] = useState(page?.active ?? true);
  const [busy, setBusy] = useState(false);

  const slugTaken = !page && takenSlugs.includes(slug);

  async function save() {
    setBusy(true);
    try {
      const common = { title: title.trim(), seoTitle: seoTitle.trim() || null, seoDescription: seoDescription.trim() || null, content, active };
      await adminFetch(page ? `/api/admin/static-pages/${page.id}` : "/api/admin/static-pages", {
        method: page ? "PATCH" : "POST",
        json: page ? common : { ...common, slug, sortOrder: nextSort },
      });
      toast.success(page ? "Page saved." : "Page created.");
      onSaved();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{page ? "Edit page" : "New page"}</SheetTitle>
        <SheetDescription>{page ? `Lives at /${page.slug}` : "Pick a title — the URL is filled in for you."}</SheetDescription>
      </SheetHeader>
      <div className="grid gap-4 px-4">
        <Field label="Title">
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!page && !slugTouched) setSlug(slugify(e.target.value));
            }}
            maxLength={160}
            placeholder="Refund Policy"
          />
        </Field>
        <Field label="URL" hint={page ? "The URL can't be changed after creation." : slugTaken ? "This URL is already used by another page." : "Lowercase letters, numbers and dashes."}>
          <div className="flex items-center">
            <span className="flex h-9 items-center rounded-l-md border border-r-0 bg-muted px-3 font-mono text-sm text-muted-foreground">/</span>
            <Input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              disabled={!!page}
              className={cn("rounded-l-none font-mono", slugTaken && "border-destructive")}
            />
          </div>
        </Field>
        <Field label="Content" hint={`${words(content)} words · ${content.length.toLocaleString()} characters · rendered as written`}>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={18} className="font-mono text-xs leading-relaxed" />
        </Field>
        <div className="rounded-lg border">
          <button type="button" onClick={() => setSeoOpen((o) => !o)} className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium" aria-expanded={seoOpen}>
            Search engine listing
            <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", seoOpen && "rotate-180")} />
          </button>
          {seoOpen ? (
            <div className="grid gap-4 border-t p-3">
              <Field label="SEO title" hint={`${seoTitle.length}/60 recommended`}>
                <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={title} />
              </Field>
              <Field label="SEO description" hint={`${seoDescription.length}/160 recommended`}>
                <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} />
              </Field>
            </div>
          ) : null}
        </div>
        <ToggleRow label="Published" hint={active ? "Visible to everyone." : "Saved as a draft, not public."} checked={active} onChange={setActive} />
      </div>
      <SheetFooter>
        <SubmitButton busy={busy} disabled={!title.trim() || !content.trim() || (!page && (!slug || slugTaken))} onClick={save}>
          {page ? "Save changes" : "Create page"}
        </SubmitButton>
      </SheetFooter>
    </>
  );
}
