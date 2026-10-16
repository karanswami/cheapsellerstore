"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Field, ImageUpload, SubmitButton, TableSkeleton, ToggleRow, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SITE_SOCIAL_LINKS_MAX, newSiteSocialLinkId, type SiteConfig } from "@/types/site-config";
import { SettingsCard, useSettingsSave, type AdminSettings } from "./settings-kit";

export function GeneralSection({ s }: { s: AdminSettings }) {
  const { save, busy } = useSettingsSave();
  const [maintenance, setMaintenance] = useState(s.maintenanceMode);
  const [contact, setContact] = useState(s.supportContact);
  const [telegram, setTelegram] = useState(s.supportTelegram);
  const [whatsapp, setWhatsapp] = useState(s.supportWhatsapp);
  const [demo, setDemo] = useState(s.defaultProductDemoUrl);

  return (
    <SettingsCard
      title="General"
      description="Maintenance mode and support contacts."
      busy={busy}
      onSave={() =>
        save({ maintenanceMode: maintenance, supportContact: contact, supportTelegram: telegram, supportWhatsapp: whatsapp, defaultProductDemoUrl: demo.trim() })
      }
    >
      <ToggleRow label="Maintenance mode" hint="Blocks the storefront for everyone except admins." checked={maintenance} onChange={setMaintenance} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Support email / contact">
          <Input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} />
        </Field>
        <Field label="Support Telegram">
          <Input value={telegram} onChange={(e) => setTelegram(e.target.value)} maxLength={200} />
        </Field>
        <Field label="Support WhatsApp">
          <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} maxLength={200} />
        </Field>
      </div>
      <Field label="Default product demo URL" hint="Used when a product has no demo of its own.">
        <Input value={demo} onChange={(e) => setDemo(e.target.value)} placeholder="https://" />
      </Field>
    </SettingsCard>
  );
}

const COLORS: { k: keyof SiteConfig; label: string }[] = [
  { k: "primaryColor", label: "Primary" },
  { k: "primaryDarkColor", label: "Primary (dark)" },
  { k: "accentColor", label: "Accent" },
  { k: "accentDarkColor", label: "Accent (dark)" },
  { k: "successColor", label: "Success" },
  { k: "successDarkColor", label: "Success (dark)" },
];

export function BrandingSection() {
  const { data } = useAdminQuery<SiteConfig>("/api/admin/site-config");
  return data ? <BrandingForm initial={data} /> : <TableSkeleton rows={4} />;
}

function BrandingForm({ initial }: { initial: SiteConfig }) {
  const [cfg, setC] = useState<SiteConfig>(initial);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof SiteConfig>(k: K, v: SiteConfig[K]) => setC({ ...cfg, [k]: v });

  async function save() {
    setBusy(true);
    try {
      const body: Record<string, unknown> = { ...cfg };
      // Empty image strings are valid ("none"); the API only needs non-empty hex colours.
      await adminFetch("/api/admin/site-config", { method: "PATCH", json: body });
      toast.success("Branding saved. Reload the store to see it.");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsCard title="Branding" description="Name, logos, theme colours and footer social links.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Site name">
          <Input value={cfg.siteName} onChange={(e) => set("siteName", e.target.value)} maxLength={80} />
        </Field>
        <Field label="Tagline">
          <Input value={cfg.siteTagline} onChange={(e) => set("siteTagline", e.target.value)} maxLength={200} />
        </Field>
      </div>
      <Field label="SEO description">
        <Textarea value={cfg.siteSeoDescription} onChange={(e) => set("siteSeoDescription", e.target.value)} rows={2} maxLength={300} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <ImageUpload label="Logo" value={cfg.logoUrl || null} onChange={(u) => set("logoUrl", u ?? "")} endpoint="/api/admin/site-config/upload" />
        <ImageUpload label="Favicon" value={cfg.faviconUrl || null} onChange={(u) => set("faviconUrl", u ?? "")} endpoint="/api/admin/site-config/upload" />
        <ImageUpload label="Share image (OG)" value={cfg.ogImageUrl || null} onChange={(u) => set("ogImageUrl", u ?? "")} endpoint="/api/admin/site-config/upload" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {COLORS.map(({ k, label }) => (
          <Field key={k} label={label}>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={String(cfg[k]).startsWith("#") && String(cfg[k]).length === 7 ? String(cfg[k]) : "#000000"}
                onChange={(e) => set(k, e.target.value as never)}
                className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
                aria-label={label}
              />
              <Input value={String(cfg[k])} onChange={(e) => set(k, e.target.value as never)} className="font-mono text-xs" maxLength={9} />
            </div>
          </Field>
        ))}
      </div>
      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Footer social links</p>
          <Button
            variant="secondary"
            size="sm"
            disabled={cfg.socialLinks.length >= SITE_SOCIAL_LINKS_MAX}
            onClick={() => set("socialLinks", [...cfg.socialLinks, { id: newSiteSocialLinkId(), label: "", url: "https://", iconUrl: "" }])}
          >
            <Plus /> Add link
          </Button>
        </div>
        {cfg.socialLinks.map((l, i) => (
          <div key={l.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[10rem_1fr_auto]">
            <Input placeholder="Label" value={l.label} onChange={(e) => set("socialLinks", cfg.socialLinks.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} maxLength={40} />
            <Input placeholder="https://…" value={l.url} onChange={(e) => set("socialLinks", cfg.socialLinks.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
            <Button variant="ghost" size="icon-sm" onClick={() => set("socialLinks", cfg.socialLinks.filter((_, j) => j !== i))} aria-label="Remove">
              <Trash2 />
            </Button>
            <div className="sm:col-span-3">
              <ImageUpload label="Icon" value={l.iconUrl || null} onChange={(u) => set("socialLinks", cfg.socialLinks.map((x, j) => (j === i ? { ...x, iconUrl: u ?? "" } : x)))} endpoint="/api/admin/site-config/upload" />
            </div>
          </div>
        ))}
      </div>
      <div>
        <SubmitButton busy={busy} onClick={save}>
          Save branding
        </SubmitButton>
      </div>
    </SettingsCard>
  );
}
