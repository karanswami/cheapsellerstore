"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText, HelpCircle, ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import { ConfirmDialog, Field, ImageUpload, SubmitButton, TableSkeleton, ToggleRow, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export function AdminContentClient() {
  return (
    <Tabs defaultValue="banners" className="space-y-4">
      <TabsList>
        <TabsTrigger value="banners">
          <ImageIcon className="size-4" /> Banners
        </TabsTrigger>
        <TabsTrigger value="faqs">
          <HelpCircle className="size-4" /> FAQs
        </TabsTrigger>
        <TabsTrigger value="pages">
          <FileText className="size-4" /> Pages
        </TabsTrigger>
      </TabsList>
      <TabsContent value="banners">
        <Banners />
      </TabsContent>
      <TabsContent value="faqs">
        <Faqs />
      </TabsContent>
      <TabsContent value="pages">
        <Pages />
      </TabsContent>
    </Tabs>
  );
}

/* ───────────────────────────── Banners ───────────────────────────── */

type Banner = { id: string; title: string; imageUrl: string | null; active: boolean; priority: number };

function Banners() {
  const { data, loading, reload } = useAdminQuery<{ banners: Banner[] }>("/api/admin/banners");
  const [editing, setEditing] = useState<Banner | "new" | null>(null);
  const [del, setDel] = useState<Banner | null>(null);

  async function toggle(b: Banner, active: boolean) {
    try {
      await adminFetch(`/api/admin/banners/${b.id}`, { method: "PATCH", json: { active } });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus /> New banner
        </Button>
      </div>
      {loading && !data ? (
        <TableSkeleton rows={3} />
      ) : (data?.banners.length ?? 0) === 0 ? (
        <EmptyState icon={ImageIcon} title="No banners" hint="Banners rotate at the top of the store home page." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data!.banners.map((b) => (
            <div key={b.id} className="overflow-hidden rounded-xl border bg-card">
              <div className="aspect-[16/6] bg-muted">
                {b.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.imageUrl} alt={b.title} className="size-full object-cover" />
                ) : null}
              </div>
              <div className="flex items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.title}</p>
                  <p className="text-xs text-muted-foreground">Priority {b.priority}</p>
                </div>
                <Switch checked={b.active} onCheckedChange={(v) => toggle(b, v)} aria-label="Active" />
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(b)} aria-label="Edit">
                  <Pencil />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setDel(b)} aria-label="Delete">
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          {editing !== null ? (
            <BannerForm
              key={editing === "new" ? "new" : editing.id}
              banner={editing === "new" ? null : editing}
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
        title={`Delete "${del?.title}"?`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            await adminFetch(`/api/admin/banners/${del!.id}`, { method: "DELETE" });
            toast.success("Banner deleted.");
            reload();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}

function BannerForm({ banner, onSaved }: { banner: Banner | null; onSaved: () => void }) {
  const [title, setTitle] = useState(banner?.title ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(banner?.imageUrl ?? null);
  const [priority, setPriority] = useState(String(banner?.priority ?? 100));
  const [active, setActive] = useState(banner?.active ?? true);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!imageUrl) return toast.error("Upload an image first.");
    setBusy(true);
    try {
      const body = { title: title.trim() || undefined, imageUrl, priority: Math.trunc(Number(priority)) || 0, active };
      await adminFetch(banner ? `/api/admin/banners/${banner.id}` : "/api/admin/banners", { method: banner ? "PATCH" : "POST", json: body });
      toast.success("Banner saved.");
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
        <DialogTitle>{banner ? "Edit banner" : "New banner"}</DialogTitle>
        <DialogDescription>Image-only banner on the store home page. Lower priority shows first.</DialogDescription>
      </DialogHeader>
      <ImageUpload value={imageUrl} onChange={setImageUrl} endpoint="/api/admin/banners/upload" label="Banner image" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title (internal)">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </Field>
        <Field label="Priority">
          <Input type="number" min="0" max="10000" value={priority} onChange={(e) => setPriority(e.target.value)} />
        </Field>
      </div>
      <ToggleRow label="Active" checked={active} onChange={setActive} />
      <DialogFooter>
        <SubmitButton busy={busy} onClick={save}>
          Save banner
        </SubmitButton>
      </DialogFooter>
    </>
  );
}

/* ───────────────────────────── FAQs ───────────────────────────── */

type Faq = { id: string; question: string; answer: string; category: string | null; active: boolean; sortOrder: number };

function Faqs() {
  const { data, loading, reload } = useAdminQuery<{ faqs: Faq[] }>("/api/admin/faqs");
  const [editing, setEditing] = useState<Faq | "new" | null>(null);
  const [del, setDel] = useState<Faq | null>(null);

  async function toggle(f: Faq, active: boolean) {
    try {
      await adminFetch(`/api/admin/faqs/${f.id}`, { method: "PATCH", json: { active } });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus /> New FAQ
        </Button>
      </div>
      <div className="rounded-xl border bg-card">
        {loading && !data ? (
          <TableSkeleton />
        ) : (data?.faqs.length ?? 0) === 0 ? (
          <div className="p-6">
            <EmptyState icon={HelpCircle} title="No FAQs" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Order</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.faqs.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="max-w-md">
                    <p className="truncate text-sm font-medium">{f.question}</p>
                    <p className="truncate text-xs text-muted-foreground">{f.answer}</p>
                  </TableCell>
                  <TableCell>{f.category ? <Badge variant="outline">{f.category}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right">{f.sortOrder}</TableCell>
                  <TableCell>
                    <Switch checked={f.active} onCheckedChange={(v) => toggle(f, v)} aria-label="Active" />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditing(f)} aria-label="Edit">
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDel(f)} aria-label="Delete">
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          {editing !== null ? (
            <FaqForm
              key={editing === "new" ? "new" : editing.id}
              faq={editing === "new" ? null : editing}
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

function FaqForm({ faq, onSaved }: { faq: Faq | null; onSaved: () => void }) {
  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");
  const [category, setCategory] = useState(faq?.category ?? "");
  const [sortOrder, setSortOrder] = useState(String(faq?.sortOrder ?? 100));
  const [active, setActive] = useState(faq?.active ?? true);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const body = { question: question.trim(), answer: answer.trim(), category: category.trim() || null, sortOrder: Math.trunc(Number(sortOrder)) || 0, active };
      await adminFetch(faq ? `/api/admin/faqs/${faq.id}` : "/api/admin/faqs", { method: faq ? "PATCH" : "POST", json: body });
      toast.success("FAQ saved.");
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
        <DialogDescription>Shown on the help centre page.</DialogDescription>
      </DialogHeader>
      <Field label="Question">
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={300} />
      </Field>
      <Field label="Answer">
        <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={6} maxLength={5000} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Payments" />
        </Field>
        <Field label="Sort order">
          <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </Field>
      </div>
      <ToggleRow label="Active" checked={active} onChange={setActive} />
      <DialogFooter>
        <SubmitButton busy={busy} disabled={!question.trim() || !answer.trim()} onClick={save}>
          Save FAQ
        </SubmitButton>
      </DialogFooter>
    </>
  );
}

/* ───────────────────────────── Static pages ───────────────────────────── */

type StaticPage = { id: string; slug: string; title: string; seoTitle: string | null; seoDescription: string | null; content: string; active: boolean; sortOrder: number };

function Pages() {
  const { data, loading, reload } = useAdminQuery<{ pages: StaticPage[] }>("/api/admin/static-pages");
  const [editing, setEditing] = useState<StaticPage | "new" | null>(null);
  const [del, setDel] = useState<StaticPage | null>(null);

  async function toggle(p: StaticPage, active: boolean) {
    try {
      await adminFetch(`/api/admin/static-pages/${p.id}`, { method: "PATCH", json: { active } });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus /> New page
        </Button>
      </div>
      <div className="rounded-xl border bg-card">
        {loading && !data ? (
          <TableSkeleton />
        ) : (data?.pages.length ?? 0) === 0 ? (
          <div className="p-6">
            <EmptyState icon={FileText} title="No pages" hint="Terms, privacy, refund policy…" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Order</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.pages.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">/{p.slug}</TableCell>
                  <TableCell className="text-right">{p.sortOrder}</TableCell>
                  <TableCell>
                    <Switch checked={p.active} onCheckedChange={(v) => toggle(p, v)} aria-label="Published" />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditing(p)} aria-label="Edit">
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDel(p)} aria-label="Delete">
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Sheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          {editing !== null ? (
            <PageForm
              key={editing === "new" ? "new" : editing.id}
              page={editing === "new" ? null : editing}
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

function PageForm({ page, onSaved }: { page: StaticPage | null; onSaved: () => void }) {
  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [seoTitle, setSeoTitle] = useState(page?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(page?.seoDescription ?? "");
  const [content, setContent] = useState(page?.content ?? "");
  const [sortOrder, setSortOrder] = useState(String(page?.sortOrder ?? 0));
  const [active, setActive] = useState(page?.active ?? true);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const common = { title: title.trim(), seoTitle: seoTitle.trim() || null, seoDescription: seoDescription.trim() || null, content, sortOrder: Math.trunc(Number(sortOrder)) || 0, active };
      await adminFetch(page ? `/api/admin/static-pages/${page.id}` : "/api/admin/static-pages", {
        method: page ? "PATCH" : "POST",
        json: page ? common : { ...common, slug: slug.trim() },
      });
      toast.success("Page saved.");
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
        <SheetDescription>{page ? `/${page.slug}` : "Content is rendered as written."}</SheetDescription>
      </SheetHeader>
      <div className="grid gap-4 px-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
          </Field>
          <Field label="Slug" hint={page ? "Slug can't change." : "a-z, 0-9 and dashes."}>
            <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} disabled={!!page} />
          </Field>
        </div>
        <Field label="Content">
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={16} className="font-mono text-xs" />
        </Field>
        <Field label="SEO title">
          <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
        </Field>
        <Field label="SEO description">
          <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} />
        </Field>
        <Field label="Sort order">
          <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </Field>
        <ToggleRow label="Published" checked={active} onChange={setActive} />
      </div>
      <SheetFooter>
        <SubmitButton busy={busy} disabled={!title.trim() || !content.trim() || (!page && !slug.trim())} onClick={save}>
          Save page
        </SubmitButton>
      </SheetFooter>
    </>
  );
}
