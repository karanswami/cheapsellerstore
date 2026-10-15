"use client";

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
import { Switch } from "@/components/ui/switch";
import type { BioCustomLink, BioThemePreset, SafeUser } from "@/types/user";
import {
  Globe,
  Layers,
  Palette,
  Pencil,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  Tv,
  MessageCircle,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const THEME_PRESETS: { id: BioThemePreset; name: string; color: string; desc: string }[] = [
  { id: "DEFAULT", name: "Drip Neon", color: "from-fuchsia-500 to-pink-500", desc: "Signature neon magenta & deep onyx" },
  { id: "NEON_TOXIC", name: "Neon Toxic", color: "from-emerald-500 to-teal-400", desc: "Cyberpunk toxic green & obsidian" },
  { id: "PHANTOM_VIOLET", name: "Phantom Violet", color: "from-purple-600 to-fuchsia-500", desc: "Synthwave electric violet" },
  { id: "GLACIER_CYAN", name: "Glacier Cyan", color: "from-cyan-400 to-blue-600", desc: "Ice cold cyan & high-tech navy" },
  { id: "CRIMSON_FURY", name: "Crimson Fury", color: "from-rose-500 to-red-700", desc: "Aggressive blood red & carbon" },
  { id: "GOLD_OBSIDIAN", name: "Gold VIP", color: "from-amber-400 to-yellow-600", desc: "Luxury gold & polished onyx" },
];

export const AVAILABLE_ICONS = [
  { id: "globe", label: "Website", icon: Globe },
  { id: "discord", label: "Discord", icon: MessageCircle },
  { id: "telegram", label: "Telegram", icon: MessageCircle },
  { id: "youtube", label: "YouTube", icon: Tv },
  { id: "zap", label: "Featured / Mod", icon: Zap },
  { id: "star", label: "Vouches / Review", icon: Sparkles },
];

type ProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SafeUser;
  onSave: (data: Partial<SafeUser>) => Promise<void>;
};

export function EditBioProfileDialog({
  open,
  onOpenChange,
  user,
  onSave,
}: ProfileDialogProps) {
  const [tagline, setTagline] = useState(user.bioTagline || "");
  const [bio, setBio] = useState(user.bio || "");
  const [bannerUrl, setBannerUrl] = useState(user.bioBannerUrl || "");
  const [discordInvite, setDiscordInvite] = useState(user.discordInvite || "");
  const [telegramChannel, setTelegramChannel] = useState(user.telegramChannel || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        bioTagline: tagline.trim() || null,
        bio: bio.trim() || null,
        bioBannerUrl: bannerUrl.trim() || null,
        discordInvite: discordInvite.trim() || null,
        telegramChannel: telegramChannel.trim() || null,
      });
      toast.success("Bio profile details updated!");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,680px)] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-primary" />
              Edit Bio Profile & Tagline
            </DialogTitle>
            <DialogDescription>
              Customize how your personal bio page presents your brand to buyers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="bioTagline">Tagline / Headline</Label>
              <Input
                id="bioTagline"
                placeholder="e.g. Instant 24/7 Delivery • 1,400+ Vouches"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                maxLength={100}
              />
              <p className="text-[11px] text-muted-foreground">
                Short punchy line displayed right under your username.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bioText">About Me / Bio</Label>
              <Textarea
                id="bioText"
                placeholder="Describe your services, vouches, and community..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={400}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bioBanner">Cover Banner Image URL</Label>
              <Input
                id="bioBanner"
                placeholder="https://... (PNG, JPG, or GIF)"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="discordInvite">Discord Invite / Code</Label>
                <Input
                  id="discordInvite"
                  placeholder="e.g. dripcommunity"
                  value={discordInvite}
                  onChange={(e) => setDiscordInvite(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telegramChannel">Telegram Handle</Label>
                <Input
                  id="telegramChannel"
                  placeholder="e.g. @dripkeys"
                  value={telegramChannel}
                  onChange={(e) => setTelegramChannel(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type ManageLinksDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: BioCustomLink[];
  onSave: (links: BioCustomLink[]) => Promise<void>;
};

export function ManageBioLinksDialog({
  open,
  onOpenChange,
  links,
  onSave,
}: ManageLinksDialogProps) {
  const [items, setItems] = useState<BioCustomLink[]>(links || []);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newIcon, setNewIcon] = useState("globe");
  const [newBadge, setNewBadge] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAddLink = () => {
    if (!newTitle.trim() || !newUrl.trim()) {
      toast.error("Please enter a title and URL.");
      return;
    }

    const newLink: BioCustomLink = {
      id: "link_" + Math.random().toString(36).substring(2, 9),
      title: newTitle.trim(),
      url: newUrl.trim().startsWith("http") ? newUrl.trim() : `https://${newUrl.trim()}`,
      icon: newIcon,
      badge: newBadge.trim() || undefined,
    };

    setItems((prev) => [...prev, newLink]);
    setNewTitle("");
    setNewUrl("");
    setNewBadge("");
    toast.success("Link added to list!");
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await onSave(items);
      toast.success("Custom link tiles saved!");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save links.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,720px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="size-5 text-primary" />
            Manage Bento Link Tiles
          </DialogTitle>
          <DialogDescription>
            Add glowing custom action tiles (Discord server, Telegram, Guides, Giveaways).
          </DialogDescription>
        </DialogHeader>

        {/* Existing Links List */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase font-semibold">Active Tiles ({items.length})</Label>
          {items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
              No custom tiles added yet. Add your first link below.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {items.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/60 p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{link.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{link.url}</p>
                  </div>
                  {link.badge ? (
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      {link.badge}
                    </span>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(link.id)}
                    className="size-7 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Link Card */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-3">
          <p className="text-xs font-bold text-primary uppercase">Add New Tile</p>
          <div className="space-y-2">
            <Input
              placeholder="Button Title (e.g. Join Official Discord)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={50}
            />
            <Input
              placeholder="Destination URL (e.g. https://discord.gg/...)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] text-muted-foreground">Icon</Label>
                <select
                  aria-label="Icon"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value)}
                >
                  {AVAILABLE_ICONS.map((ic) => (
                    <option key={ic.id} value={ic.id}>
                      {ic.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Optional Badge</Label>
                <Input
                  className="mt-1 h-9 text-xs"
                  placeholder="e.g. 🔥 HOT or 🎁 FREE"
                  value={newBadge}
                  onChange={(e) => setNewBadge(e.target.value)}
                  maxLength={15}
                />
              </div>
            </div>
            <Button
              type="button"
              onClick={handleAddLink}
              variant="secondary"
              size="sm"
              className="w-full gap-1.5 text-xs font-semibold"
            >
              <Plus className="size-3.5" />
              Add Tile to List
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSaveAll} disabled={saving}>
            {saving ? "Saving..." : "Save All Links"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ShowcaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogProducts: { id: string; title: string; category?: { name: string } | null }[];
  featuredIds: string[];
  showVouches: boolean;
  onSave: (data: { featuredProducts: string[]; showVouches: boolean }) => Promise<void>;
};

export function ShowcaseProductsDialog({
  open,
  onOpenChange,
  catalogProducts,
  featuredIds,
  showVouches,
  onSave,
}: ShowcaseDialogProps) {
  const [selected, setSelected] = useState<string[]>(featuredIds || []);
  const [vouches, setVouches] = useState(showVouches);
  const [saving, setSaving] = useState(false);

  const toggleProduct = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        featuredProducts: selected,
        showVouches: vouches,
      });
      toast.success("Storefront showcase updated!");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update showcase.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,700px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="size-5 text-primary" />
            Spotlight Products & Trust
          </DialogTitle>
          <DialogDescription>
            Choose keys to feature directly on your bio page with instant 1-click checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 p-3">
            <div>
              <p className="text-xs font-semibold">Show Live Vouches & Ratings</p>
              <p className="text-[11px] text-muted-foreground">
                Display your verified 5-star order stats
              </p>
            </div>
            <Switch checked={vouches} onCheckedChange={setVouches} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase font-semibold">
              Select Products to Spotlight ({selected.length} Selected)
            </Label>
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {catalogProducts.map((prod) => {
                const isChecked = selected.includes(prod.id);
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => toggleProduct(prod.id)}
                    className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition-all ${
                      isChecked
                        ? "border-primary bg-primary/10"
                        : "border-border/60 bg-card/60 hover:border-primary/50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{prod.title}</p>
                      {prod.category ? (
                        <p className="text-[10px] text-primary">{prod.category.name}</p>
                      ) : null}
                    </div>
                    <div
                      className={`size-5 rounded-md border flex items-center justify-center text-xs ${
                        isChecked ? "bg-primary border-primary text-white" : "border-border"
                      }`}
                    >
                      {isChecked ? "✓" : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Selection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ThemeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTheme: BioThemePreset;
  onSave: (theme: BioThemePreset) => Promise<void>;
};

export function ThemePickerBioDialog({
  open,
  onOpenChange,
  currentTheme,
  onSave,
}: ThemeDialogProps) {
  const [selected, setSelected] = useState<BioThemePreset>(currentTheme || "DEFAULT");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selected);
      toast.success("Theme updated!");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update theme.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,650px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="size-5 text-primary" />
            Cyberpunk Theme Presets
          </DialogTitle>
          <DialogDescription>
            Select a custom glow theme for your personal bio storefront.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {THEME_PRESETS.map((preset) => {
            const active = selected === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelected(preset.id)}
                className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                  active
                    ? "border-primary bg-primary/10 shadow-[0_0_20px_-8px_var(--primary)]"
                    : "border-border/60 bg-card/60 hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div
                    className={`h-3 w-8 rounded-full bg-gradient-to-r ${preset.color}`}
                  />
                  {active ? (
                    <span className="text-[10px] font-bold text-primary">ACTIVE</span>
                  ) : null}
                </div>
                <p className="text-xs font-bold">{preset.name}</p>
                <p className="text-[11px] text-muted-foreground">{preset.desc}</p>
              </button>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Apply Theme"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
