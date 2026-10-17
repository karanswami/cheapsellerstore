"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Construction, Globe, Headphones, Image as ImageIcon, Link2, Palette, Plus, Trash2, Type } from "lucide-react";
import { ConfirmDialog, Field, ImageUpload, TableSkeleton, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SITE_SOCIAL_LINKS_MAX, newSiteSocialLinkId, type SiteConfig } from "@/types/site-config";
import { EditDialog, SettingRow, SettingsGroup, useModalKey, useSettingsState, type AdminSettings } from "./settings-kit";

export function GeneralSection({ s }: { s: AdminSettings }) {
  const { v, apply, flip, busy } = useSettingsState({
    maintenanceMode: s.maintenanceMode,
    supportContact: s.supportContact,
    supportTelegram: s.supportTelegram,
    supportWhatsapp: s.supportWhatsapp,
    defaultProductDemoUrl: s.defaultProductDemoUrl,
  });
  const m = useModalKey();
  const [confirmMaintenance, setConfirmMaintenance] = useState(false);
  const contactCount = [v.supportContact, v.supportTelegram, v.supportWhatsapp].filter((x) => x.trim()).length;

  return (
    <>
      <SettingsGroup title="General" description="Store availability and support.">
        <SettingRow
          icon={Construction}
          title="Maintenance mode"
          description={v.maintenanceMode ? "The storefront is blocked for everyone except admins." : "Blocks the storefront for everyone except admins."}
          checked={v.maintenanceMode}
          switchDisabled={busy}
          onCheckedChange={(on) => (on ? setConfirmMaintenance(true) : flip("maintenanceMode", false, "Maintenance mode off."))}
        />
        <SettingRow
          icon={Headphones}
          title="Support contacts"
          description="Email, Telegram and WhatsApp shown to customers."
          value={`${contactCount} of 3 set`}
          onEdit={() => m.open("contacts")}
        />
        <SettingRow
          icon={Link2}
          title="Default product demo URL"
          description="Used when a product has no demo of its own."
          value={v.defaultProductDemoUrl || "Not set"}
          onEdit={() => m.open("demo")}
        />
      </SettingsGroup>

      <ConfirmDialog
        open={confirmMaintenance}
        onOpenChange={setConfirmMaintenance}
        title="Turn on maintenance mode?"
        description="Customers will be locked out of the storefront until you turn it off. Admins can still sign in."
        confirmLabel="Turn on"
        destructive
        onConfirm={async () => {
          await flip("maintenanceMode", true, "Maintenance mode on.");
        }}
      />

      <EditDialog
        {...m.bind("contacts")}
        title="Support contacts"
        initial={{ contact: v.supportContact, telegram: v.supportTelegram, whatsapp: v.supportWhatsapp }}
        onSave={(d) => apply({ supportContact: d.contact, supportTelegram: d.telegram, supportWhatsapp: d.whatsapp })}
      >
        {(d, set) => (
          <>
            <Field label="Support email / contact">
              <Input value={d.contact} onChange={(e) => set("contact", e.target.value)} maxLength={200} />
            </Field>
            <Field label="Support Telegram">
              <Input value={d.telegram} onChange={(e) => set("telegram", e.target.value)} maxLength={200} />
            </Field>
            <Field label="Support WhatsApp">
              <Input value={d.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} maxLength={200} />
            </Field>
          </>
        )}
      </EditDialog>

      <EditDialog
        {...m.bind("demo")}
        title="Default product demo URL"
        initial={{ url: v.defaultProductDemoUrl }}
        onSave={(d) => apply({ defaultProductDemoUrl: d.url.trim() })}
      >
        {(d, set) => (
          <Field label="Demo URL" hint="Used when a product has no demo of its own. Leave empty for none.">
            <Input value={d.url} onChange={(e) => set("url", e.target.value)} placeholder="https://" />
          </Field>
        )}
      </EditDialog>
    </>
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
  const [cfg, setCfg] = useState<SiteConfig>(initial);
  const m = useModalKey();

  /** Saves the whole branding config with `patch` applied; commits it on success. */
  async function apply(patch: Partial<SiteConfig>, okMsg: string) {
    const next = { ...cfg, ...patch };
    try {
      await adminFetch("/api/admin/site-config", { method: "PATCH", json: { ...next } });
      setCfg(next);
      toast.success(okMsg);
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    }
  }

  const swatches = (
    <span className="inline-flex gap-1">
      {COLORS.filter((c) => !c.label.includes("dark")).map((c) => (
        <span key={c.k} className="size-4 rounded-full border" style={{ background: String(cfg[c.k]) }} />
      ))}
    </span>
  );

  return (
    <>
      <SettingsGroup title="Branding" description="How the store looks. Reload the store to see changes.">
        <SettingRow icon={Type} title="Name, tagline & SEO" description="Site name, tagline and search description." value={cfg.siteName} onEdit={() => m.open("identity")} />
        <SettingRow icon={ImageIcon} title="Logo & images" description="Logo, favicon and share image." onEdit={() => m.open("images")} />
        <SettingRow icon={Palette} title="Theme colours" description="Primary, accent and success colours." value={swatches} onEdit={() => m.open("colors")} />
        <SettingRow
          icon={Globe}
          title="Footer social links"
          description="Links with icons shown in the footer."
          value={`${cfg.socialLinks.length} link${cfg.socialLinks.length === 1 ? "" : "s"}`}
          onEdit={() => m.open("social")}
        />
      </SettingsGroup>

      <EditDialog
        {...m.bind("identity")}
        title="Name, tagline & SEO"
        initial={{ siteName: cfg.siteName, siteTagline: cfg.siteTagline, siteSeoDescription: cfg.siteSeoDescription }}
        onSave={(d) => apply(d, "Branding saved.")}
      >
        {(d, set) => (
          <>
            <Field label="Site name">
              <Input value={d.siteName} onChange={(e) => set("siteName", e.target.value)} maxLength={80} />
            </Field>
            <Field label="Tagline">
              <Input value={d.siteTagline} onChange={(e) => set("siteTagline", e.target.value)} maxLength={200} />
            </Field>
            <Field label="SEO description">
              <Textarea value={d.siteSeoDescription} onChange={(e) => set("siteSeoDescription", e.target.value)} rows={3} maxLength={300} />
            </Field>
          </>
        )}
      </EditDialog>

      <EditDialog
        {...m.bind("images")}
        size="lg"
        title="Logo & images"
        initial={{ logoUrl: cfg.logoUrl, faviconUrl: cfg.faviconUrl, ogImageUrl: cfg.ogImageUrl }}
        onSave={(d) => apply(d, "Images saved.")}
      >
        {(d, set) => (
          <div className="grid gap-4 sm:grid-cols-3">
            <ImageUpload label="Logo" value={d.logoUrl || null} onChange={(u) => set("logoUrl", u ?? "")} endpoint="/api/admin/site-config/upload" />
            <ImageUpload label="Favicon" value={d.faviconUrl || null} onChange={(u) => set("faviconUrl", u ?? "")} endpoint="/api/admin/site-config/upload" />
            <ImageUpload label="Share image (OG)" value={d.ogImageUrl || null} onChange={(u) => set("ogImageUrl", u ?? "")} endpoint="/api/admin/site-config/upload" />
          </div>
        )}
      </EditDialog>

      <EditDialog
        {...m.bind("colors")}
        title="Theme colours"
        initial={Object.fromEntries(COLORS.map(({ k }) => [k, String(cfg[k])])) as Record<string, string>}
        onSave={(d) => apply(d as Partial<SiteConfig>, "Colours saved.")}
      >
        {(d, set) => (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {COLORS.map(({ k, label }) => (
              <Field key={k} label={label}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={d[k].startsWith("#") && d[k].length === 7 ? d[k] : "#000000"}
                    onChange={(e) => set(k, e.target.value)}
                    className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
                    aria-label={label}
                  />
                  <Input value={d[k]} onChange={(e) => set(k, e.target.value)} className="font-mono text-xs" maxLength={9} />
                </div>
              </Field>
            ))}
          </div>
        )}
      </EditDialog>

      <EditDialog
        {...m.bind("social")}
        size="lg"
        title="Footer social links"
        description={`Up to ${SITE_SOCIAL_LINKS_MAX} links.`}
        initial={{ socialLinks: cfg.socialLinks }}
        onSave={(d) => apply(d, "Social links saved.")}
      >
        {(d, set) => {
          const edit = (i: number, patch: Partial<SiteConfig["socialLinks"][number]>) =>
            set("socialLinks", d.socialLinks.map((x, j) => (j === i ? { ...x, ...patch } : x)));
          return (
            <div className="grid gap-3">
              {d.socialLinks.map((l, i) => (
                <div key={l.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[10rem_1fr_auto]">
                  <Input placeholder="Label" value={l.label} onChange={(e) => edit(i, { label: e.target.value })} maxLength={40} />
                  <Input placeholder="https://…" value={l.url} onChange={(e) => edit(i, { url: e.target.value })} />
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => set("socialLinks", d.socialLinks.filter((_, j) => j !== i))} aria-label="Remove">
                    <Trash2 />
                  </Button>
                  <div className="sm:col-span-3">
                    <ImageUpload label="Icon" value={l.iconUrl || null} onChange={(u) => edit(i, { iconUrl: u ?? "" })} endpoint="/api/admin/site-config/upload" />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-self-start"
                disabled={d.socialLinks.length >= SITE_SOCIAL_LINKS_MAX}
                onClick={() => set("socialLinks", [...d.socialLinks, { id: newSiteSocialLinkId(), label: "", url: "https://", iconUrl: "" }])}
              >
                <Plus /> Add link
              </Button>
            </div>
          );
        }}
      </EditDialog>
    </>
  );
}
