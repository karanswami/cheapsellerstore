"use client";

import { AdminListSkeleton, AdminPageHeader } from "@/components/admin/admin-page-header";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  newSiteSocialLinkId,
  SITE_CONFIG_DEFAULTS,
  SITE_SOCIAL_LINKS_MAX,
  type SiteConfig,
  type SiteSocialLink,
} from "@/types/site-config";
import {
  ChevronRight,
  ImageIcon,
  Loader2,
  Palette,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

type EditSection = "brand" | "colors" | "assets" | "socials" | null;

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function ColorField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const pickerValue =
    value.length === 4
      ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
      : HEX_RE.test(value)
        ? value
        : "#000000";

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          className="size-11 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-1"
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#10b981"
          className="h-11 font-mono text-sm uppercase"
        />
        <span
          className="size-11 shrink-0 rounded-lg border border-border"
          style={{ backgroundColor: HEX_RE.test(value) ? value : "transparent" }}
          aria-hidden
        />
      </div>
    </div>
  );
}

function AssetField({
  label,
  hint,
  value,
  uploading,
  onUpload,
  onClear,
}: {
  label: string;
  hint: string;
  value: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:flex-row sm:items-center">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="size-full object-contain p-1" />
          ) : (
            <ImageIcon className="size-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="truncate text-xs text-muted-foreground">
            {value || "No image set"}
          </p>
          <div className="flex flex-wrap gap-2">
            <label
              className={cn(
                "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium shadow-xs transition-colors hover:bg-muted",
                uploading && "pointer-events-none opacity-50",
              )}
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              {uploading ? "Uploading…" : "Upload"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/x-icon,.ico"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) onUpload(file);
                }}
              />
            </label>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={uploading}
                onClick={onClear}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SiteConfigWorkspace() {
  const router = useRouter();
  const { data, loading, reload } = useAdminFetch<SiteConfig>(
    "/api/admin/site-config",
  );
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [edit, setEdit] = useState<EditSection>(null);
  const [pending, setPending] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<
    "logoUrl" | "faviconUrl" | "ogImageUrl" | `social:${string}` | null
  >(null);

  const [brandDraft, setBrandDraft] = useState({
    siteName: SITE_CONFIG_DEFAULTS.siteName,
    siteTagline: "",
    siteSeoDescription: "",
  });
  const [colorsDraft, setColorsDraft] = useState({
    primaryDarkColor: SITE_CONFIG_DEFAULTS.primaryDarkColor,
    accentDarkColor: SITE_CONFIG_DEFAULTS.accentDarkColor,
    successDarkColor: SITE_CONFIG_DEFAULTS.successDarkColor,
  });
  const [assetsDraft, setAssetsDraft] = useState({
    logoUrl: "",
    faviconUrl: "",
    ogImageUrl: "",
  });
  const [socialsDraft, setSocialsDraft] = useState<SiteSocialLink[]>([]);

  useEffect(() => {
    if (data) setConfig(data);
  }, [data]);

  function openBrand() {
    if (!config) return;
    setBrandDraft({
      siteName: config.siteName,
      siteTagline: config.siteTagline,
      siteSeoDescription: config.siteSeoDescription,
    });
    setEdit("brand");
  }

  function openColors() {
    if (!config) return;
    setColorsDraft({
      primaryDarkColor: config.primaryDarkColor,
      accentDarkColor: config.accentDarkColor,
      successDarkColor: config.successDarkColor,
    });
    setEdit("colors");
  }

  function openAssets() {
    if (!config) return;
    setAssetsDraft({
      logoUrl: config.logoUrl,
      faviconUrl: config.faviconUrl,
      ogImageUrl: config.ogImageUrl,
    });
    setEdit("assets");
  }

  function openSocials() {
    if (!config) return;
    setSocialsDraft(
      config.socialLinks.map((link) => ({
        id: link.id,
        label: link.label,
        url: link.url,
        iconUrl: link.iconUrl,
      })),
    );
    setEdit("socials");
  }

  function socialCount(cfg: SiteConfig) {
    return cfg.socialLinks.filter((s) => s.url.trim().length > 0).length;
  }

  function addSocial() {
    if (socialsDraft.length >= SITE_SOCIAL_LINKS_MAX) {
      toast.error(`Max ${SITE_SOCIAL_LINKS_MAX} social links`);
      return;
    }
    setSocialsDraft((prev) => [
      ...prev,
      {
        id: newSiteSocialLinkId(),
        label: "",
        url: "",
        iconUrl: "",
      },
    ]);
  }

  function updateSocial(
    id: string,
    patch: Partial<Pick<SiteSocialLink, "label" | "url" | "iconUrl">>,
  ) {
    setSocialsDraft((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function removeSocial(id: string) {
    setSocialsDraft((prev) => prev.filter((row) => row.id !== id));
  }

  function socialsValid() {
    if (socialsDraft.length === 0) return true;
    return socialsDraft.every((row) => {
      const label = row.label.trim();
      const url = row.url.trim();
      if (!label || !url) return false;
      return /^https?:\/\//i.test(url);
    });
  }

  async function save(partial: Partial<SiteConfig>) {
    setPending(true);
    const result = await adminMutate("/api/admin/site-config", {
      method: "PATCH",
      body: JSON.stringify(partial),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return false;
    }
    toast.success("Site config saved");
    if (result.data && typeof result.data === "object") {
      setConfig(result.data as SiteConfig);
    }
    void reload();
    router.refresh();
    return true;
  }

  async function uploadAsset(
    key: "logoUrl" | "faviconUrl" | "ogImageUrl" | `social:${string}`,
    file: File,
  ) {
    setUploadingKey(key);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/site-config/upload", {
        method: "POST",
        body,
      });
      const json = (await res.json()) as {
        data?: { upload?: { url?: string } };
        error?: { message?: string };
      };
      if (!res.ok || !json.data?.upload?.url) {
        throw new Error(json.error?.message || "Upload failed");
      }
      const url = json.data.upload.url;
      if (key === "logoUrl" || key === "faviconUrl" || key === "ogImageUrl") {
        setAssetsDraft((prev) => ({ ...prev, [key]: url }));
      } else {
        const socialId = key.slice("social:".length);
        updateSocial(socialId, { iconUrl: url });
      }
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingKey(null);
    }
  }

  function colorsValid() {
    return (
      HEX_RE.test(colorsDraft.primaryDarkColor) &&
      HEX_RE.test(colorsDraft.accentDarkColor) &&
      HEX_RE.test(colorsDraft.successDarkColor)
    );
  }

  return (
    <main className="space-y-6">
      <AdminPageHeader
        title="Site Config"
        description="Brand name, theme colours, assets, and social links"
      />
      {loading || !config ? (
        <AdminListSkeleton rows={4} />
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <ConfigRow
            icon={<Sparkles className="size-4" />}
            title="Brand & SEO"
            description={
              config.siteTagline.trim()
                ? `${config.siteName} · ${config.siteTagline}`
                : config.siteName
            }
            badges={
              <Badge variant="secondary" className="max-w-[12rem] truncate">
                {config.siteSeoDescription.trim()
                  ? "SEO set"
                  : "No SEO description"}
              </Badge>
            }
            onClick={openBrand}
          />
          <ConfigRow
            icon={<Palette className="size-4" />}
            title="Theme colours"
            description="Primary, accent, and success (dark theme)"
            badges={
              <span className="flex items-center gap-1.5">
                {[
                  config.primaryDarkColor,
                  config.accentDarkColor,
                  config.successDarkColor,
                ].map((c) => (
                  <span
                    key={c}
                    className="size-4 rounded-full border border-border"
                    style={{ backgroundColor: c }}
                    aria-hidden
                  />
                ))}
              </span>
            }
            onClick={openColors}
          />
          <ConfigRow
            icon={<ImageIcon className="size-4" />}
            title="Images & icons"
            description="Logo, favicon, and social share image"
            badges={
              <>
                <Badge variant="secondary">
                  Logo {config.logoUrl ? "on" : "off"}
                </Badge>
                <Badge variant="secondary">
                  Favicon {config.faviconUrl ? "on" : "off"}
                </Badge>
              </>
            }
            onClick={openAssets}
          />
          <ConfigRow
            icon={<Share2 className="size-4" />}
            title="Social links"
            description="Custom footer icons — add or remove any"
            badges={
              <Badge variant="secondary">
                {socialCount(config) > 0
                  ? `${socialCount(config)} linked`
                  : "None set"}
              </Badge>
            }
            onClick={openSocials}
            last
          />
        </div>
      )}

      <Dialog
        open={edit === "brand"}
        onOpenChange={(open) => !open && setEdit(null)}
      >
        <DialogContent className="flex max-h-[min(92dvh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Sparkles className="size-5" />
              </div>
              <DialogTitle className="text-lg">Brand & SEO</DialogTitle>
              <DialogDescription>
                Site name, tagline, and search engine description.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="site-name">Site name</Label>
              <Input
                id="site-name"
                value={brandDraft.siteName}
                onChange={(e) =>
                  setBrandDraft({ ...brandDraft, siteName: e.target.value })
                }
                className="h-11"
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={brandDraft.siteTagline}
                onChange={(e) =>
                  setBrandDraft({ ...brandDraft, siteTagline: e.target.value })
                }
                className="h-11"
                maxLength={200}
                placeholder="Digital Product Store"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seo">SEO description</Label>
              <Textarea
                id="seo"
                value={brandDraft.siteSeoDescription}
                onChange={(e) =>
                  setBrandDraft({
                    ...brandDraft,
                    siteSeoDescription: e.target.value,
                  })
                }
                className="min-h-24"
                maxLength={300}
                placeholder="Premium digital products delivered instantly."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEdit(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || !brandDraft.siteName.trim()}
              onClick={() => {
                void save(brandDraft).then((ok) => {
                  if (ok) setEdit(null);
                });
              }}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={edit === "colors"}
        onOpenChange={(open) => !open && setEdit(null)}
      >
        <DialogContent className="flex max-h-[min(92dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Palette className="size-5" />
              </div>
              <DialogTitle className="text-lg">Theme colours</DialogTitle>
              <DialogDescription>
                Primary, accent, and success tokens for the dark theme.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            <div className="space-y-3">
              <ColorField
                id="primary-dark"
                label="Primary"
                value={colorsDraft.primaryDarkColor}
                onChange={(v) =>
                  setColorsDraft({ ...colorsDraft, primaryDarkColor: v })
                }
              />
              <ColorField
                id="accent-dark"
                label="Accent / ring"
                value={colorsDraft.accentDarkColor}
                onChange={(v) =>
                  setColorsDraft({ ...colorsDraft, accentDarkColor: v })
                }
              />
              <ColorField
                id="success-dark"
                label="Success"
                value={colorsDraft.successDarkColor}
                onChange={(v) =>
                  setColorsDraft({ ...colorsDraft, successDarkColor: v })
                }
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() =>
                setColorsDraft({
                  primaryDarkColor: SITE_CONFIG_DEFAULTS.primaryDarkColor,
                  accentDarkColor: SITE_CONFIG_DEFAULTS.accentDarkColor,
                  successDarkColor: SITE_CONFIG_DEFAULTS.successDarkColor,
                })
              }
            >
              Reset to Cheap Seller defaults
            </Button>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEdit(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || !colorsValid()}
              onClick={() => {
                // Keep legacy light keys in sync (dark-only app).
                void save({
                  primaryColor: colorsDraft.primaryDarkColor,
                  accentColor: colorsDraft.accentDarkColor,
                  successColor: colorsDraft.successDarkColor,
                  primaryDarkColor: colorsDraft.primaryDarkColor,
                  accentDarkColor: colorsDraft.accentDarkColor,
                  successDarkColor: colorsDraft.successDarkColor,
                }).then((ok) => {
                  if (ok) setEdit(null);
                });
              }}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={edit === "assets"}
        onOpenChange={(open) => !open && setEdit(null)}
      >
        <DialogContent className="flex max-h-[min(92dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <ImageIcon className="size-5" />
              </div>
              <DialogTitle className="text-lg">Images & icons</DialogTitle>
              <DialogDescription>
                Upload logo, favicon, and Open Graph share image (JPG, PNG, WebP,
                ICO · max 4 MB).
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            <AssetField
              label="Logo"
              hint="Shown in header, splash, and console brand."
              value={assetsDraft.logoUrl}
              uploading={uploadingKey === "logoUrl"}
              onUpload={(file) => void uploadAsset("logoUrl", file)}
              onClear={() => setAssetsDraft({ ...assetsDraft, logoUrl: "" })}
            />
            <AssetField
              label="Favicon"
              hint="Browser tab icon. Falls back to logo when empty."
              value={assetsDraft.faviconUrl}
              uploading={uploadingKey === "faviconUrl"}
              onUpload={(file) => void uploadAsset("faviconUrl", file)}
              onClear={() =>
                setAssetsDraft({ ...assetsDraft, faviconUrl: "" })
              }
            />
            <AssetField
              label="Social / OG image"
              hint="Preview image for link shares."
              value={assetsDraft.ogImageUrl}
              uploading={uploadingKey === "ogImageUrl"}
              onUpload={(file) => void uploadAsset("ogImageUrl", file)}
              onClear={() =>
                setAssetsDraft({ ...assetsDraft, ogImageUrl: "" })
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEdit(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || uploadingKey !== null}
              onClick={() => {
                void save(assetsDraft).then((ok) => {
                  if (ok) setEdit(null);
                });
              }}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={edit === "socials"}
        onOpenChange={(open) => !open && setEdit(null)}
      >
        <DialogContent className="flex max-h-[min(92dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Share2 className="size-5" />
              </div>
              <DialogTitle className="text-lg">Social links</DialogTitle>
              <DialogDescription>
                Add any socials you want for the store footer — custom label,
                https URL, and optional icon. Remove ones you don’t need.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {socialsDraft.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No socials yet. Tap Add social to create one.
              </p>
            ) : (
              socialsDraft.map((row, index) => {
                const uploadKey = `social:${row.id}` as const;
                const uploading = uploadingKey === uploadKey;
                return (
                  <div
                    key={row.id}
                    className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Social {index + 1}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-destructive hover:text-destructive"
                        disabled={uploading}
                        onClick={() => removeSocial(row.id)}
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`social-label-${row.id}`}>Label</Label>
                      <Input
                        id={`social-label-${row.id}`}
                        value={row.label}
                        onChange={(e) =>
                          updateSocial(row.id, { label: e.target.value })
                        }
                        className="h-11"
                        maxLength={40}
                        placeholder="Telegram, Discord, TikTok…"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`social-url-${row.id}`}>URL</Label>
                      <Input
                        id={`social-url-${row.id}`}
                        type="url"
                        inputMode="url"
                        value={row.url}
                        onChange={(e) =>
                          updateSocial(row.id, { url: e.target.value })
                        }
                        className="h-11"
                        maxLength={500}
                        placeholder="https://…"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
                        {row.iconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.iconUrl}
                            alt=""
                            className="size-full object-contain p-1.5"
                          />
                        ) : (
                          <span className="text-xs font-semibold text-muted-foreground">
                            {row.label.trim().charAt(0).toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Icon (optional — letter fallback if empty)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <label
                            className={cn(
                              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium shadow-xs transition-colors hover:bg-muted",
                              uploading && "pointer-events-none opacity-50",
                            )}
                          >
                            {uploading ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Upload className="size-3.5" />
                            )}
                            {uploading ? "Uploading…" : "Upload"}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="sr-only"
                              disabled={uploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = "";
                                if (file) void uploadAsset(uploadKey, file);
                              }}
                            />
                          </label>
                          {row.iconUrl ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={uploading}
                              onClick={() =>
                                updateSocial(row.id, { iconUrl: "" })
                              }
                            >
                              Clear icon
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full gap-1.5"
              disabled={
                uploadingKey !== null ||
                socialsDraft.length >= SITE_SOCIAL_LINKS_MAX
              }
              onClick={addSocial}
            >
              <Plus className="size-4" />
              Add social
              {socialsDraft.length > 0
                ? ` (${socialsDraft.length}/${SITE_SOCIAL_LINKS_MAX})`
                : null}
            </Button>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEdit(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || uploadingKey !== null || !socialsValid()}
              onClick={() => {
                void save({ socialLinks: socialsDraft }).then((ok) => {
                  if (ok) setEdit(null);
                });
              }}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function ConfigRow({
  icon,
  title,
  description,
  badges,
  onClick,
  last,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  badges?: ReactNode;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50",
        !last && "border-b border-border",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badges}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {description}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
