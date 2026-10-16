"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BadgePercent, Pencil, Plus, Tag, Trash2, Zap } from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import { ConfirmDialog, Field, SubmitButton, TableSkeleton, ToggleRow, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { AudienceSelect, ScopeFields, type Audience, type Scope } from "@/components/admin/pickers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { flashDateTimeInput, flashDateTimeLabel, localDateTimeToIso } from "@/lib/flash-sale-format";
import { formatMoney, microcentsToUsd } from "@/lib/currencies";
import { SpecialPricesTab } from "./special-prices";

export function AdminPromosClient() {
  return (
    <Tabs defaultValue="promos" className="space-y-4">
      <TabsList>
        <TabsTrigger value="promos">
          <Tag className="size-4" /> Promo codes
        </TabsTrigger>
        <TabsTrigger value="flash">
          <Zap className="size-4" /> Flash sales
        </TabsTrigger>
        <TabsTrigger value="special">
          <BadgePercent className="size-4" /> Special prices
        </TabsTrigger>
      </TabsList>
      <TabsContent value="promos">
        <PromosTab />
      </TabsContent>
      <TabsContent value="flash">
        <FlashTab />
      </TabsContent>
      <TabsContent value="special">
        <SpecialPricesTab />
      </TabsContent>
    </Tabs>
  );
}

function windowLabel(startsAt: string | null, expiresAt: string | null) {
  if (!startsAt && !expiresAt) return "Always on";
  return `${startsAt ? flashDateTimeLabel(startsAt) : "now"} → ${expiresAt ? flashDateTimeLabel(expiresAt) : "no end"}`;
}

/* ───────────────────────────── Promo codes ───────────────────────────── */

type Promo = {
  id: string;
  code: string;
  description: string | null;
  discountPercent: number;
  discountAmount: number;
  scope: Scope;
  targetRole: Audience;
  productId: string | null;
  durationId: string | null;
  maxRedemptions: number | null;
  perUserLimit: number;
  active: boolean;
  showBanner: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  _count: { redemptions: number };
};

function PromosTab() {
  const { data, loading, reload } = useAdminQuery<{ promos: Promo[] }>("/api/admin/promos");
  const [editing, setEditing] = useState<Promo | "new" | null>(null);
  const [del, setDel] = useState<Promo | null>(null);

  async function toggle(p: Promo, active: boolean) {
    try {
      await adminFetch(`/api/admin/promos/${p.id}`, { method: "PATCH", json: { active } });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus /> New promo code
        </Button>
      </div>
      <div className="rounded-xl border bg-card">
        {loading && !data ? (
          <TableSkeleton />
        ) : (data?.promos.length ?? 0) === 0 ? (
          <div className="p-6">
            <EmptyState icon={Tag} title="No promo codes" hint="Create a code customers can apply at checkout." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.promos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-mono text-sm font-semibold">{p.code}</p>
                    {p.description ? <p className="max-w-48 truncate text-xs text-muted-foreground">{p.description}</p> : null}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.discountPercent > 0 ? `${p.discountPercent}%` : ""}
                    {p.discountPercent > 0 && p.discountAmount > 0 ? " + " : ""}
                    {p.discountAmount > 0 ? formatMoney(p.discountAmount) : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.scope.toLowerCase()}</Badge> <Badge variant="muted">{p.targetRole.toLowerCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {p._count.redemptions}
                    {p.maxRedemptions ? ` / ${p.maxRedemptions}` : ""}
                  </TableCell>
                  <TableCell className="max-w-56 text-xs text-muted-foreground">{windowLabel(p.startsAt, p.expiresAt)}</TableCell>
                  <TableCell>
                    <Switch checked={p.active} onCheckedChange={(v) => toggle(p, v)} aria-label="Active" />
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
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          {editing !== null ? (
            <PromoForm
              key={editing === "new" ? "new" : editing.id}
              promo={editing === "new" ? null : editing}
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
        title={`Delete ${del?.code}?`}
        description="Past orders keep their discount."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            await adminFetch(`/api/admin/promos/${del!.id}`, { method: "DELETE" });
            toast.success("Promo deleted.");
            reload();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}

function PromoForm({ promo, onSaved }: { promo: Promo | null; onSaved: () => void }) {
  const [code, setCode] = useState(promo?.code ?? "");
  const [description, setDescription] = useState(promo?.description ?? "");
  const [percent, setPercent] = useState(String(promo?.discountPercent ?? 10));
  const [amount, setAmount] = useState(promo?.discountAmount ? String(microcentsToUsd(promo.discountAmount)) : "0");
  const [scope, setScope] = useState({ scope: promo?.scope ?? ("GLOBAL" as Scope), productId: promo?.productId ?? "", durationId: promo?.durationId ?? "" });
  const [audience, setAudience] = useState<Audience>(promo?.targetRole ?? "ALL");
  const [max, setMax] = useState(promo?.maxRedemptions ? String(promo.maxRedemptions) : "");
  const [perUser, setPerUser] = useState(String(promo?.perUserLimit ?? 1));
  const [startsAt, setStartsAt] = useState(flashDateTimeInput(promo?.startsAt));
  const [expiresAt, setExpiresAt] = useState(flashDateTimeInput(promo?.expiresAt));
  const [active, setActive] = useState(promo?.active ?? true);
  const [showBanner, setShowBanner] = useState(promo?.showBanner ?? false);
  const [notify, setNotify] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const body = {
        code: code.trim(),
        description: description.trim() || null,
        discountPercent: Number(percent) || 0,
        discountAmount: Number(amount) || 0,
        scope: scope.scope,
        targetRole: audience,
        productId: scope.scope === "GLOBAL" ? null : scope.productId || null,
        durationId: scope.scope === "DURATION" ? scope.durationId || null : null,
        maxRedemptions: max ? Number(max) : null,
        perUserLimit: Number(perUser) || 1,
        active,
        showBanner,
        startsAt: localDateTimeToIso(startsAt),
        expiresAt: localDateTimeToIso(expiresAt),
        sendNotification: notify,
      };
      await adminFetch(promo ? `/api/admin/promos/${promo.id}` : "/api/admin/promos", { method: promo ? "PATCH" : "POST", json: body });
      toast.success(promo ? "Promo saved." : "Promo created.");
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
        <DialogTitle>{promo ? "Edit promo code" : "New promo code"}</DialogTitle>
        <DialogDescription>Customers enter the code at checkout.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono" maxLength={64} />
        </Field>
        <Field label="Description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
        </Field>
        <Field label="Percent off">
          <Input type="number" min="0" max="100" value={percent} onChange={(e) => setPercent(e.target.value)} />
        </Field>
        <Field label="Flat off (USD)">
          <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Max redemptions" hint="Empty = unlimited.">
          <Input type="number" min="1" value={max} onChange={(e) => setMax(e.target.value)} />
        </Field>
        <Field label="Per-user limit">
          <Input type="number" min="1" value={perUser} onChange={(e) => setPerUser(e.target.value)} />
        </Field>
        <Field label="Starts">
          <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </Field>
        <Field label="Expires">
          <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </Field>
      </div>
      <ScopeFields {...scope} onChange={setScope} />
      <AudienceSelect value={audience} onChange={setAudience} />
      <div className="grid gap-2">
        <ToggleRow label="Active" checked={active} onChange={setActive} />
        <ToggleRow label="Show storefront banner" hint="Advertise this code while it's live." checked={showBanner} onChange={setShowBanner} />
        <ToggleRow label="Notify audience" hint="Send an in-app notification when saved." checked={notify} onChange={setNotify} />
      </div>
      <DialogFooter>
        <SubmitButton busy={busy} onClick={save}>
          {promo ? "Save changes" : "Create promo"}
        </SubmitButton>
      </DialogFooter>
    </>
  );
}

/* ───────────────────────────── Flash sales ───────────────────────────── */

type Flash = {
  id: string;
  title: string;
  discountPercent: number;
  scope: Scope;
  targetRole: Audience;
  productId: string | null;
  durationId: string | null;
  active: boolean;
  showBanner: boolean;
  bannerDescription: string | null;
  displayPromoCode: string | null;
  startsAt: string | null;
  expiresAt: string | null;
};

function FlashTab() {
  const { data, loading, reload } = useAdminQuery<{ sales: Flash[] }>("/api/admin/flash-sales");
  const [editing, setEditing] = useState<Flash | "new" | null>(null);
  const [del, setDel] = useState<Flash | null>(null);

  async function toggle(s: Flash, active: boolean) {
    try {
      await adminFetch(`/api/admin/flash-sales/${s.id}`, { method: "PATCH", json: { active } });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus /> New flash sale
        </Button>
      </div>
      <div className="rounded-xl border bg-card">
        {loading && !data ? (
          <TableSkeleton />
        ) : (data?.sales.length ?? 0) === 0 ? (
          <div className="p-6">
            <EmptyState icon={Zap} title="No flash sales" hint="Run a timed percentage discount across the store." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.sales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>{s.discountPercent}%</TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.scope.toLowerCase()}</Badge> <Badge variant="muted">{s.targetRole.toLowerCase()}</Badge>
                  </TableCell>
                  <TableCell className="max-w-56 text-xs text-muted-foreground">{windowLabel(s.startsAt, s.expiresAt)}</TableCell>
                  <TableCell>
                    <Switch checked={s.active} onCheckedChange={(v) => toggle(s, v)} aria-label="Active" />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditing(s)} aria-label="Edit">
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDel(s)} aria-label="Delete">
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
        <DialogContent className="max-w-xl">
          {editing !== null ? (
            <FlashForm
              key={editing === "new" ? "new" : editing.id}
              sale={editing === "new" ? null : editing}
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
            await adminFetch(`/api/admin/flash-sales/${del!.id}`, { method: "DELETE" });
            toast.success("Flash sale deleted.");
            reload();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}

function FlashForm({ sale, onSaved }: { sale: Flash | null; onSaved: () => void }) {
  const [title, setTitle] = useState(sale?.title ?? "");
  const [percent, setPercent] = useState(String(sale?.discountPercent ?? 20));
  const [scope, setScope] = useState({ scope: sale?.scope ?? ("GLOBAL" as Scope), productId: sale?.productId ?? "", durationId: sale?.durationId ?? "" });
  const [audience, setAudience] = useState<Audience>(sale?.targetRole ?? "ALL");
  const [bannerDescription, setBannerDescription] = useState(sale?.bannerDescription ?? "");
  const [displayPromoCode, setDisplayPromoCode] = useState(sale?.displayPromoCode ?? "");
  const [startsAt, setStartsAt] = useState(flashDateTimeInput(sale?.startsAt));
  const [expiresAt, setExpiresAt] = useState(flashDateTimeInput(sale?.expiresAt));
  const [active, setActive] = useState(sale?.active ?? true);
  const [showBanner, setShowBanner] = useState(sale?.showBanner ?? true);
  const [notify, setNotify] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        discountPercent: Number(percent),
        scope: scope.scope,
        targetRole: audience,
        productId: scope.scope === "GLOBAL" ? null : scope.productId || null,
        durationId: scope.scope === "DURATION" ? scope.durationId || null : null,
        active,
        showBanner,
        bannerDescription: bannerDescription.trim() || null,
        displayPromoCode: displayPromoCode.trim() || null,
        startsAt: localDateTimeToIso(startsAt),
        expiresAt: localDateTimeToIso(expiresAt),
        sendNotification: notify,
      };
      await adminFetch(sale ? `/api/admin/flash-sales/${sale.id}` : "/api/admin/flash-sales", { method: sale ? "PATCH" : "POST", json: body });
      toast.success(sale ? "Flash sale saved." : "Flash sale created.");
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
        <DialogTitle>{sale ? "Edit flash sale" : "New flash sale"}</DialogTitle>
        <DialogDescription>Automatically discounts matching products while live.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </Field>
        <Field label="Discount (%)">
          <Input type="number" min="1" max="100" value={percent} onChange={(e) => setPercent(e.target.value)} />
        </Field>
        <Field label="Starts">
          <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </Field>
        <Field label="Ends">
          <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </Field>
        <Field label="Banner text" className="sm:col-span-2">
          <Input value={bannerDescription} onChange={(e) => setBannerDescription(e.target.value)} maxLength={240} />
        </Field>
        <Field label="Promo code to display" hint="Shown for copy; not applied automatically.">
          <Input value={displayPromoCode} onChange={(e) => setDisplayPromoCode(e.target.value.toUpperCase())} className="font-mono" />
        </Field>
      </div>
      <ScopeFields {...scope} onChange={setScope} />
      <AudienceSelect value={audience} onChange={setAudience} />
      <div className="grid gap-2">
        <ToggleRow label="Active" checked={active} onChange={setActive} />
        <ToggleRow label="Show storefront banner" checked={showBanner} onChange={setShowBanner} />
        <ToggleRow label="Notify audience" hint="Send an in-app notification when saved." checked={notify} onChange={setNotify} />
      </div>
      <DialogFooter>
        <SubmitButton busy={busy} onClick={save}>
          {sale ? "Save changes" : "Create flash sale"}
        </SubmitButton>
      </DialogFooter>
    </>
  );
}
