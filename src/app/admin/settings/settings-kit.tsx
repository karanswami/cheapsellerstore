"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronRight, Copy, type LucideIcon } from "lucide-react";
import { SubmitButton, adminFetch, errMsg } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { SellerProgramConfig } from "@/types/seller-program";
import type { SecurityConfig } from "@/lib/security-config-shared";

export type AdminSettings = {
  maintenanceMode: boolean;
  supportContact: string;
  supportTelegram: string;
  supportWhatsapp: string;
  depositMins: { user: Record<string, number>; reseller: Record<string, number> };
  depositCurrencies: { code: string; name: string; symbol: string; rate: number; sortOrder: number }[];
  depositQuickAmounts: Record<string, number[]>;
  depositMethods: Record<string, { enabled: boolean; qrUrl: string; currency: string }>;
  autoGateways: AdminGateway[];
  manualDepositMethods: ManualMethod[];
  feedbackSounds: { hapticsEnabled: boolean; soundsEnabled: boolean; sounds: Record<string, string> };
  telegramNotifications: { enabled: boolean; botToken: string; channels: Record<string, { enabled: boolean; chatId: string; inviteLink: string; label: string }> };
  referralCommissionEnabled: boolean;
  referralPercent: number;
  sellerPurchasePercent: number;
  resellerPurchasePercent: number;
  resellerProgramEnabled: boolean;
  resellerApplyMinBalance: number;
  resellerCreateMinFunding: number;
  resellerAutoApprove: boolean;
  sellerProgram: SellerProgramConfig;
  developerProfitSharePercent: number;
  defaultProductDemoUrl: string;
  securityConfig: SecurityConfig;
  googleClientId: string;
  googleClientSecret: string;
  resendApiKey: string;
  resendFromEmail: string;
  googleAuthEnabled: boolean;
  resendEnabled: boolean;
  binanceApiKey: string;
  binanceSecretKey: string;
  binancePayId: string;
  autogopayApiKey: string;
  autogopayBaseUrl: string;
  famgatewayApiKey: string;
  famgatewayBaseUrl: string;
  cashfreeAppId: string;
  cashfreeSecretKey: string;
  cashfreeWebhookSecret: string;
  cashfreeEnv: "sandbox" | "production";
};

export type AdminGateway = {
  id: string;
  provider: "QRIS" | "UPI" | "BINANCE" | "ESEWA" | "NASIONALPAY";
  name: string;
  currency: string;
  enabled: boolean;
  maintenance: boolean;
  maintenanceNote: string;
  qrUrl: string;
  creds: Record<string, string>;
};

export type ManualMethod = {
  id?: string;
  name: string;
  currency: string;
  currencyName?: string;
  currencySymbol?: string;
  accountNumber?: string;
  qrUrl?: string;
  iconUrl?: string;
  iconKey?: string;
  instructions?: string;
  enabled: boolean;
  sortOrder: number;
};

/** Returns a `save(partial)` that PATCHes /api/admin/settings and toasts the outcome. */
export function useSettingsSave() {
  const [busy, setBusy] = useState(false);
  async function save(partial: Record<string, unknown>, okMsg = "Settings saved.") {
    setBusy(true);
    try {
      await adminFetch("/api/admin/settings", { method: "PATCH", json: partial });
      toast.success(okMsg);
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { save, busy };
}

/**
 * Settings state that mirrors what is saved on the server.
 * - `apply(patch)` saves, then commits on success (used by modals).
 * - `flip(key, value)` is for switches: optimistic, reverted if the save fails.
 */
export function useSettingsState<T extends Record<string, unknown>>(initial: T) {
  const { save, busy } = useSettingsSave();
  const [v, setV] = useState(initial);

  async function apply(patch: Partial<T>, okMsg?: string) {
    const ok = await save(patch, okMsg);
    if (ok) setV((p) => ({ ...p, ...patch }));
    return ok;
  }

  async function flip<K extends keyof T>(key: K, value: T[K], okMsg?: string) {
    const prev = v[key];
    setV((p) => ({ ...p, [key]: value }));
    const ok = await save({ [key]: value }, okMsg ?? (value ? "Turned on." : "Turned off."));
    if (!ok) setV((p) => ({ ...p, [key]: prev }));
    return ok;
  }

  return { v, apply, flip, busy };
}

/** Which modal is open in a section. `bind(key)` spreads onto <EditDialog>. */
export function useModalKey() {
  const [key, setKey] = useState<string | null>(null);
  return {
    open: (k: string) => setKey(k),
    bind: (k: string) => ({ open: key === k, onOpenChange: (o: boolean) => setKey(o ? k : null) }),
  };
}

/** A titled list of setting rows. */
export function SettingsGroup({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="px-1">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="divide-y overflow-hidden rounded-xl border bg-card">{children}</div>
    </section>
  );
}

/**
 * One setting: icon + label, optional current value, an instant Switch and/or a "Configure" button
 * that opens an <EditDialog>.
 */
export function SettingRow({
  icon: Icon,
  title,
  description,
  value,
  checked,
  onCheckedChange,
  switchDisabled,
  onEdit,
  editLabel = "Configure",
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  value?: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
  switchDisabled?: boolean;
  onEdit?: () => void;
  editLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3.5 sm:px-4">
      {Icon ? (
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {value ? <div className="hidden max-w-[40%] truncate text-right text-xs text-muted-foreground sm:block">{value}</div> : null}
      {onEdit ? (
        <Button variant="secondary" size="sm" onClick={onEdit}>
          {editLabel} <ChevronRight />
        </Button>
      ) : null}
      {onCheckedChange ? <Switch checked={!!checked} onCheckedChange={onCheckedChange} disabled={switchDisabled} aria-label={title} /> : null}
    </div>
  );
}

/** Read-only value with a copy button — for URLs the admin must paste into a third-party site. */
export function CopyValue({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="grid gap-1">
      <p className="text-xs font-medium">{label}</p>
      <div className="flex gap-2">
        <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 font-mono text-xs" />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            void navigator.clipboard.writeText(value);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          }}
        >
          {done ? <Check /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}

/** "Set this up on <site> first" box: numbered steps plus values to paste there. */
export function SetupGuide({ title = "Setup on the provider's site", steps, children }: { title?: string; steps: React.ReactNode[]; children?: React.ReactNode }) {
  return (
    <div className="grid gap-3 rounded-lg border bg-muted/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
        {steps.map((st, i) => (
          <li key={i}>{st}</li>
        ))}
      </ol>
      {children}
    </div>
  );
}

export function appOrigin() {
  return typeof window === "undefined" ? "" : window.location.origin;
}

type DraftSetter<T> = <K extends keyof T>(key: K, value: T[K]) => void;

/**
 * Modal editor. The form state lives inside the dialog content, so it resets to `initial`
 * every time the modal is opened and Cancel/close discards edits.
 */
export function EditDialog<T extends object>({
  open,
  onOpenChange,
  title,
  description,
  initial,
  onSave,
  size = "md",
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  initial: T;
  onSave: (draft: T) => Promise<boolean>;
  size?: "md" | "lg";
  children: (draft: T, set: DraftSetter<T>) => React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg")}>
        <DraftBody initial={initial} title={title} description={description} onSave={onSave} onClose={() => onOpenChange(false)}>
          {children}
        </DraftBody>
      </DialogContent>
    </Dialog>
  );
}

function DraftBody<T extends object>({
  initial,
  title,
  description,
  onSave,
  onClose,
  children,
}: {
  initial: T;
  title: string;
  description?: string;
  onSave: (draft: T) => Promise<boolean>;
  onClose: () => void;
  children: (draft: T, set: DraftSetter<T>) => React.ReactNode;
}) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set: DraftSetter<T> = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (await onSave(draft)) onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
      </DialogHeader>
      <div className="grid gap-4">{children(draft, set)}</div>
      <DialogFooter className="sticky -bottom-5 -mx-5 -mb-5 border-t bg-popover px-5 py-3 sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:px-6">
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <SubmitButton type="submit" busy={busy}>
          Save
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
