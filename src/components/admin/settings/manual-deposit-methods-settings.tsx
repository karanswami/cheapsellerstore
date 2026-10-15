"use client";

import { adminMutate } from "@/components/admin/use-admin-fetch";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  ManualDepositCurrency,
  ManualDepositMethod,
} from "@/types/manual-deposit";
import {
  defaultManualCurrencyMeta,
  defaultManualDepositIconKey,
  resolveManualMethodIconKey,
} from "@/types/manual-deposit";
import {
  DEFAULT_DEPOSIT_CURRENCIES,
  type DepositCurrencyDef,
} from "@/types/deposit-currency";
import {
  SITE_ICON_META,
  type SiteIconKey,
} from "@/types/site-icons";
import { ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ManualDepositMethodsSettingsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  methods: ManualDepositMethod[];
  /** Registered deposit currencies — method currency must be one of these. */
  currencies: DepositCurrencyDef[];
  onSaved: () => void;
};

const DEPOSIT_ICON_OPTIONS = SITE_ICON_META.filter((m) => m.group === "deposit");

function emptyMethod(
  sortOrder: number,
  currencies: DepositCurrencyDef[],
): ManualDepositMethod {
  const first =
    currencies.find((c) => c.code === "USD") ??
    currencies[0] ??
    DEFAULT_DEPOSIT_CURRENCIES[0]!;
  return {
    id: "",
    name: "",
    currency: first.code,
    currencyName: first.name,
    currencySymbol: first.symbol,
    accountNumber: "",
    qrUrl: "",
    iconUrl: "",
    iconKey: "deposit-manual",
    instructions: "",
    enabled: true,
    sortOrder,
  };
}

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function previewLogoSrc(method: ManualDepositMethod): string {
  if (method.iconUrl?.trim()) return method.iconUrl.trim();
  const key = resolveManualMethodIconKey(method);
  return (
    DEPOSIT_ICON_OPTIONS.find((o) => o.key === key)?.defaultUrl ??
    `/icons/${key}.png`
  );
}

export function ManualDepositMethodsSettings({
  open,
  onOpenChange,
  methods,
  currencies,
  onSaved,
}: ManualDepositMethodsSettingsProps) {
  const registered =
    currencies.length > 0 ? currencies : DEFAULT_DEPOSIT_CURRENCIES;
  const [draft, setDraft] = useState<ManualDepositMethod[]>(methods);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorIndex, setEditorIndex] = useState<number | null>(null);
  const [editorDraft, setEditorDraft] = useState<ManualDepositMethod>(
    emptyMethod(0, registered),
  );
  const [pending, setPending] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [siteIconUrls, setSiteIconUrls] = useState<
    Partial<Record<SiteIconKey, string>>
  >({});

  useEffect(() => {
    if (!open && !editorOpen) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/site-icons", { cache: "no-store" });
        const json = (await res.json()) as {
          data?: { icons?: Record<string, string> };
        };
        if (cancelled || !json.data?.icons) return;
        setSiteIconUrls(json.data.icons as Partial<Record<SiteIconKey, string>>);
      } catch {
        /* keep built-in defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, editorOpen]);

  const packPreview = useMemo(() => {
    return (key: SiteIconKey) =>
      siteIconUrls[key] ||
      DEPOSIT_ICON_OPTIONS.find((o) => o.key === key)?.defaultUrl ||
      `/icons/${key}.png`;
  }, [siteIconUrls]);

  function syncFromProps() {
    setDraft(methods);
  }

  function openEditor(index: number | null) {
    if (registered.length === 0) {
      toast.error("Add a currency under Currencies & rates first.");
      return;
    }
    if (index === null) {
      setEditorDraft(emptyMethod(draft.length, registered));
    } else {
      const existing = draft[index];
      const fromRegistry = registered.find((c) => c.code === existing.currency);
      const meta = fromRegistry
        ? { currencyName: fromRegistry.name, currencySymbol: fromRegistry.symbol }
        : defaultManualCurrencyMeta(existing.currency);
      setEditorDraft({
        ...existing,
        currencyName: existing.currencyName?.trim() || meta.currencyName,
        currencySymbol: existing.currencySymbol?.trim() || meta.currencySymbol,
      });
    }
    setEditorIndex(index);
    setEditorOpen(true);
  }

  async function uploadQr(file: File) {
    setUploadingQr(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/settings/deposit-qr", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const json = (await res.json()) as {
        data?: { upload: { url: string } };
        error?: { message: string };
      };
      if (!res.ok || !json.data?.upload?.url) {
        toast.error(json.error?.message ?? "Upload failed");
        return;
      }
      setEditorDraft((prev) => ({ ...prev, qrUrl: json.data!.upload.url }));
      toast.success("QR uploaded");
    } finally {
      setUploadingQr(false);
    }
  }

  async function uploadIcon(file: File) {
    setUploadingIcon(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/icons/upload", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const json = (await res.json()) as {
        data?: { upload: { url: string } };
        error?: { message: string };
      };
      if (!res.ok || !json.data?.upload?.url) {
        toast.error(json.error?.message ?? "Upload failed");
        return;
      }
      setEditorDraft((prev) => ({
        ...prev,
        iconUrl: json.data!.upload.url,
        iconKey: undefined,
      }));
      toast.success("Method logo uploaded");
    } finally {
      setUploadingIcon(false);
    }
  }

  function pickPackIcon(key: SiteIconKey) {
    setEditorDraft((prev) => ({
      ...prev,
      iconKey: key,
      iconUrl: undefined,
    }));
  }

  function clearLogo() {
    setEditorDraft((prev) => ({
      ...prev,
      iconUrl: undefined,
      iconKey: defaultManualDepositIconKey(prev.currency),
    }));
  }

  function saveEditor() {
    if (!registered.some((c) => c.code === editorDraft.currency)) {
      toast.error(
        "Pick a registered currency. Add it under Currencies & rates first.",
      );
      return;
    }
    const name = editorDraft.name.trim();
    const id =
      editorDraft.id.trim() ||
      slugify(name) ||
      slugify(editorDraft.currency) ||
      `method-${Date.now()}`;
    const accountNumber = editorDraft.accountNumber?.trim() ?? "";
    const qrUrl = editorDraft.qrUrl?.trim() ?? "";
    const iconUrl = editorDraft.iconUrl?.trim() ?? "";
    const fromRegistry = registered.find((c) => c.code === editorDraft.currency);
    const meta = fromRegistry
      ? { currencyName: fromRegistry.name, currencySymbol: fromRegistry.symbol }
      : defaultManualCurrencyMeta(editorDraft.currency);
    const next: ManualDepositMethod = {
      ...editorDraft,
      id,
      name,
      currencyName:
        editorDraft.currencyName.trim() || meta.currencyName,
      currencySymbol:
        editorDraft.currencySymbol.trim() || meta.currencySymbol,
      accountNumber: accountNumber || undefined,
      qrUrl: qrUrl || undefined,
      iconUrl: iconUrl || undefined,
      iconKey: iconUrl ? undefined : editorDraft.iconKey,
      instructions: editorDraft.instructions?.trim() || undefined,
    };
    setDraft((prev) => {
      if (editorIndex === null) return [...prev, next];
      return prev.map((m, i) => (i === editorIndex ? next : m));
    });
    setEditorOpen(false);
  }

  function removeAt(index: number) {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveAll() {
    if (draft.length === 0) {
      toast.error("Add at least one manual method.");
      return;
    }
    setPending(true);
    try {
      const result = await adminMutate("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          manualDepositMethods: draft.map((m, i) => ({
            ...m,
            sortOrder: i,
          })),
        }),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Manual methods saved");
      onOpenChange(false);
      onSaved();
    } finally {
      setPending(false);
    }
  }

  const selectedPackKey = resolveManualMethodIconKey(editorDraft);
  const editorLogoSrc = editorDraft.iconUrl?.trim()
    ? editorDraft.iconUrl.trim()
    : packPreview(selectedPackKey);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) syncFromProps();
          onOpenChange(next);
        }}
      >
        <DialogContent className="flex max-h-[min(92dvh,820px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <DialogTitle className="text-lg">Manual deposit methods</DialogTitle>
              <DialogDescription>
                Add a currency under <strong>Currencies &amp; rates</strong>{" "}
                first, then attach methods here. Pay currency drives rates/mins;
                name/symbol are what customers see.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
            {registered.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No currencies registered. Open Currencies &amp; rates and add
                one before creating a manual method.
              </p>
            ) : null}
            {draft.map((m, index) => (
              <div
                key={`${m.id}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-border px-3 py-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    m.iconUrl?.trim()
                      ? m.iconUrl.trim()
                      : packPreview(resolveManualMethodIconKey(m))
                  }
                  alt=""
                  className="size-10 shrink-0 rounded-xl object-contain ring-1 ring-border"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{m.name}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {m.currencySymbol} · {m.currencyName || m.currency}
                    </Badge>
                    <Badge
                      variant={m.enabled ? "secondary" : "outline"}
                      className="text-[10px]"
                    >
                      {m.enabled ? "On" : "Off"}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.accountNumber
                      ? `Account · ${m.accountNumber}`
                      : m.qrUrl
                        ? "QR configured"
                        : m.instructions
                          ? "Instructions only"
                          : "No pay details yet"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0"
                  onClick={() => openEditor(index)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0 text-destructive"
                  disabled={draft.length <= 1}
                  onClick={() => removeAt(index)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={registered.length === 0}
              onClick={() => openEditor(null)}
            >
              <Plus className="size-4" />
              Add method
            </Button>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => void saveAll()}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="flex max-h-[min(92dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <DialogTitle className="text-lg">
                {editorIndex === null ? "Add manual method" : "Edit method"}
              </DialogTitle>
              <DialogDescription>
                Pay currency code drives rates/mins. Set the display name and
                symbol customers see on amounts.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="manual-name">Display name (optional)</Label>
              <Input
                id="manual-name"
                value={editorDraft.name}
                onChange={(e) =>
                  setEditorDraft({ ...editorDraft, name: e.target.value })
                }
                placeholder="Defaults to currency label if empty"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-id">Slug (optional)</Label>
              <Input
                id="manual-id"
                value={editorDraft.id}
                onChange={(e) =>
                  setEditorDraft({ ...editorDraft, id: e.target.value })
                }
                placeholder={slugify(editorDraft.name) || "esewa"}
                className="h-11 font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Pay currency (must be registered)</Label>
              <Select
                value={editorDraft.currency}
                onValueChange={(v) => {
                  const currency = v as ManualDepositCurrency;
                  const fromRegistry = registered.find((c) => c.code === currency);
                  const meta = fromRegistry
                    ? {
                        currencyName: fromRegistry.name,
                        currencySymbol: fromRegistry.symbol,
                      }
                    : defaultManualCurrencyMeta(currency);
                  setEditorDraft((prev) => ({
                    ...prev,
                    currency,
                    currencyName: meta.currencyName,
                    currencySymbol: meta.currencySymbol,
                    iconKey: prev.iconUrl
                      ? prev.iconKey
                      : defaultManualDepositIconKey(currency),
                  }));
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {registered.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.code} · {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Missing a currency? Add it under Currencies &amp; rates first.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="manual-currency-name">Currency name</Label>
                <Input
                  id="manual-currency-name"
                  value={editorDraft.currencyName}
                  onChange={(e) =>
                    setEditorDraft({
                      ...editorDraft,
                      currencyName: e.target.value,
                    })
                  }
                  placeholder={
                    defaultManualCurrencyMeta(editorDraft.currency).currencyName
                  }
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-currency-symbol">Currency symbol</Label>
                <Input
                  id="manual-currency-symbol"
                  value={editorDraft.currencySymbol}
                  onChange={(e) =>
                    setEditorDraft({
                      ...editorDraft,
                      currencySymbol: e.target.value,
                    })
                  }
                  placeholder={
                    defaultManualCurrencyMeta(editorDraft.currency)
                      .currencySymbol
                  }
                  className="h-11"
                  maxLength={8}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
              <Label htmlFor="manual-enabled" className="text-sm">
                Enabled for customers
              </Label>
              <Switch
                id="manual-enabled"
                checked={editorDraft.enabled}
                onCheckedChange={(checked) =>
                  setEditorDraft({ ...editorDraft, enabled: checked })
                }
              />
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
              <div className="space-y-1">
                <Label>Method logo</Label>
                <p className="text-[11px] text-muted-foreground">
                  Upload a custom logo, or pick a deposit icon from the Icons
                  desk pack (updates there apply when using pack).
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={editorLogoSrc || previewLogoSrc(editorDraft)}
                    alt=""
                    className="size-full object-contain p-1"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <label
                    className={cn(
                      "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium",
                      uploadingIcon && "pointer-events-none opacity-50",
                    )}
                  >
                    <ImagePlus className="size-3.5" />
                    {uploadingIcon ? "Uploading…" : "Upload logo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={uploadingIcon}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void uploadIcon(file);
                      }}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearLogo}
                  >
                    Reset default
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Icons pack
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {DEPOSIT_ICON_OPTIONS.map((opt) => {
                    const active =
                      !editorDraft.iconUrl?.trim() &&
                      selectedPackKey === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        title={opt.label}
                        onClick={() => pickPackIcon(opt.key)}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-xl border border-border bg-background p-1.5 transition-colors",
                          active &&
                            "border-primary ring-2 ring-primary/30",
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={packPreview(opt.key)}
                          alt={opt.label}
                          className="size-9 object-contain"
                        />
                        <span className="truncate text-[9px] font-medium text-muted-foreground">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-account">Account number</Label>
              <Textarea
                id="manual-account"
                value={editorDraft.accountNumber ?? ""}
                onChange={(e) =>
                  setEditorDraft({
                    ...editorDraft,
                    accountNumber: e.target.value,
                  })
                }
                placeholder="Bank / wallet account number"
                rows={2}
              />
            </div>
            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
              <Label>Pay QR (optional)</Label>
              <div className="flex gap-3">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
                  {editorDraft.qrUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={editorDraft.qrUrl}
                      alt=""
                      className="size-full object-contain p-1"
                    />
                  ) : (
                    <ImagePlus className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <label
                    className={cn(
                      "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium",
                      uploadingQr && "pointer-events-none opacity-50",
                    )}
                  >
                    <ImagePlus className="size-3.5" />
                    {uploadingQr ? "Uploading…" : "Upload QR"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={uploadingQr}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void uploadQr(file);
                      }}
                    />
                  </label>
                  {editorDraft.qrUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setEditorDraft({ ...editorDraft, qrUrl: "" })
                      }
                    >
                      Clear QR
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-instructions">Instructions (optional)</Label>
              <Textarea
                id="manual-instructions"
                value={editorDraft.instructions ?? ""}
                onChange={(e) =>
                  setEditorDraft({
                    ...editorDraft,
                    instructions: e.target.value,
                  })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditorOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveEditor}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function useManualMethodsSummary(methods: ManualDepositMethod[] | undefined) {
  if (!methods?.length) return "No manual methods";
  const enabled = methods.filter((m) => m.enabled).length;
  return `${enabled} active · ${methods.length} total`;
}
