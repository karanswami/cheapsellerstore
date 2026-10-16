"use client";

import { useState } from "react";
import { Pencil, Trash2, Wrench, type LucideIcon } from "lucide-react";
import { SubmitButton } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { GatewayStatus } from "@/lib/gateway-providers";

export function Stat({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: React.ReactNode; tone?: "success" | "warning" }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary", tone === "success" && "bg-success/15 text-success", tone === "warning" && "bg-warning/15 text-warning")}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}

export function SectionHead({ title, desc, action }: { title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      {action}
    </div>
  );
}

/** A list row; the editor opens in a modal (see EditorDialog). */
export function ListRow({ onEdit, icon: Icon, title, badges, meta, actions, dim }: {
  onEdit: () => void;
  icon: LucideIcon;
  title: string;
  badges?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  dim?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card transition-colors hover:border-primary/40">
      <div className={cn("flex flex-wrap items-center gap-3 p-3.5 sm:p-4", dim && "opacity-70")}>
        <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 basis-56 items-center gap-3 text-left">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
            <Icon className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="truncate font-display font-semibold">{title}</span>
              {badges}
            </span>
            {meta ? <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">{meta}</span> : null}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <Button type="button" variant="secondary" size="sm" onClick={onEdit}><Pencil /> Edit</Button>
        </div>
      </div>
    </div>
  );
}

export function EditorDialog({ open, onClose, title, desc, icon: Icon, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  desc?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl gap-5" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {Icon ? <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span> : null}
            {title}
          </DialogTitle>
          <DialogDescription>{desc ?? "Changes apply once you press Save."}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

const STATUS_STYLE: Record<GatewayStatus, string> = {
  live: "bg-success text-slate-900",
  maintenance: "bg-warning text-slate-900",
  off: "bg-foreground/80 text-background",
};

/** Live / Maintenance / Off segmented switch. Maintenance is only offered where it applies. */
export function StatusSwitch({ value, onChange, disabled, withMaintenance = true }: {
  value: GatewayStatus;
  onChange: (v: GatewayStatus) => void;
  disabled?: boolean;
  withMaintenance?: boolean;
}) {
  const items: { v: GatewayStatus; label: string; icon?: LucideIcon }[] = [
    { v: "live", label: "Live" },
    ...(withMaintenance ? [{ v: "maintenance" as const, label: "Maint.", icon: Wrench }] : []),
    { v: "off", label: "Off" },
  ];
  return (
    <div role="radiogroup" className="inline-flex rounded-lg border bg-muted p-0.5 text-xs font-semibold">
      {items.map(({ v, label, icon: Icon }) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          disabled={disabled}
          onClick={() => value !== v && onChange(v)}
          className={cn("flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors disabled:opacity-60", value === v ? STATUS_STYLE[v] : "text-muted-foreground hover:text-foreground")}
        >
          {Icon ? <Icon className="size-3" /> : null}
          {label}
        </button>
      ))}
    </div>
  );
}

/** Two-step delete without a dialog: first click arms, second confirms. */
export function InlineDelete({ onConfirm, busy, disabled, title, label = "Delete" }: {
  onConfirm: () => void;
  busy?: boolean;
  disabled?: boolean;
  title?: string;
  label?: string;
}) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <Button type="button" variant="ghost" size="sm" disabled={disabled} title={title} onClick={() => setArmed(true)} className="text-destructive hover:text-destructive">
        <Trash2 /> {label}
      </Button>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Sure?</span>
      <SubmitButton type="button" variant="destructive" size="sm" busy={busy} onClick={onConfirm}>Yes, delete</SubmitButton>
      <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => setArmed(false)}>No</Button>
    </span>
  );
}

export function EditorFooter({ busy, dirty, onSave, onCancel, extra }: {
  busy: boolean;
  dirty: boolean;
  onSave: () => void;
  onCancel: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="sticky -bottom-6 -mx-6 -mb-6 flex flex-wrap items-center justify-between gap-2 border-t bg-popover px-6 py-4">
      <div className="flex items-center gap-1.5">{extra}</div>
      <div className="flex items-center gap-2">
        {dirty ? <span className="text-xs text-warning">Unsaved changes</span> : null}
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={onCancel}>Close</Button>
        <SubmitButton type="button" size="sm" busy={busy} disabled={!dirty} onClick={onSave}>Save</SubmitButton>
      </div>
    </div>
  );
}
