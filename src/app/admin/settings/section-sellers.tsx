"use client";

import { ArrowDown, ArrowUp, ClipboardList, DoorOpen, FileText, Gift, Plus, UserCheck, Users, Wallet, X } from "lucide-react";
import { Chips, Field } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MAX_SELLER_PERKS, SELLER_FIELDS, type SellerFieldMode } from "@/types/seller-program";
import { EditDialog, SettingRow, SettingsGroup, useModalKey, useSettingsState, type AdminSettings } from "./settings-kit";

const MODE_OPTIONS: { v: SellerFieldMode; label: string }[] = [
  { v: "required", label: "Required" },
  { v: "optional", label: "Optional" },
  { v: "hidden", label: "Hidden" },
];

function Num({ label, hint, value, onChange, max, step = "1" }: { label: string; hint?: string; value: string; onChange: (v: string) => void; max?: string; step?: string }) {
  return (
    <Field label={label} hint={hint}>
      <Input type="number" min="0" max={max} step={step} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function SellersSection({ s }: { s: AdminSettings }) {
  const { v, apply, flip, busy } = useSettingsState({
    resellerProgramEnabled: s.resellerProgramEnabled,
    resellerAutoApprove: s.resellerAutoApprove,
    resellerApplyMinBalance: s.resellerApplyMinBalance,
    resellerCreateMinFunding: s.resellerCreateMinFunding,
    sellerPurchasePercent: s.sellerPurchasePercent,
    resellerPurchasePercent: s.resellerPurchasePercent,
    sellerProgram: s.sellerProgram,
  });
  const m = useModalKey();
  const sp = v.sellerProgram;
  const modeCount = (mode: SellerFieldMode) => SELLER_FIELDS.filter((f) => sp.fields[f.key] === mode).length;

  return (
    <>
      <SettingsGroup title="Applications" description="Whether users can apply to become a seller, and how requests are handled.">
        <SettingRow
          icon={DoorOpen}
          title="Applications open"
          description={v.resellerProgramEnabled ? "The Become a Seller form is live." : "Users see the closed message instead of the form."}
          checked={v.resellerProgramEnabled}
          switchDisabled={busy}
          onCheckedChange={(on) => flip("resellerProgramEnabled", on)}
        />
        <SettingRow
          icon={UserCheck}
          title="Auto-approve applications"
          description="Upgrade applicants to Seller instantly, skipping manual review."
          checked={v.resellerAutoApprove}
          switchDisabled={busy}
          onCheckedChange={(on) => flip("resellerAutoApprove", on)}
        />
        <SettingRow
          icon={Wallet}
          title="Eligibility & messages"
          description="Minimum balance, re-apply wait and the closed message."
          value={v.resellerApplyMinBalance > 0 ? `Min $${v.resellerApplyMinBalance}` : "Anyone can apply"}
          onEdit={() => m.open("rules")}
        />
      </SettingsGroup>

      <SettingsGroup title="Become a Seller page" description="What customers see before applying.">
        <SettingRow icon={FileText} title="Headline & perks" description="The headline and the “What you get” list." value={sp.headline} onEdit={() => m.open("page")} />
        <SettingRow
          icon={ClipboardList}
          title="Application form"
          description="Name, phone, country, Telegram and “why join” are always required."
          value={`${modeCount("required")} required · ${modeCount("optional")} optional · ${modeCount("hidden")} hidden`}
          onEdit={() => m.open("fields")}
        />
      </SettingsGroup>

      <SettingsGroup title="Seller accounts" description="Rules for existing sellers and the resellers they create.">
        <SettingRow
          icon={Users}
          title="Reseller creation"
          description="Whole dollars a seller must load into a new reseller."
          value={`Min $${v.resellerCreateMinFunding}`}
          onEdit={() => m.open("create")}
        />
        <SettingRow
          icon={Gift}
          title="Referral commission rates"
          description={s.referralCommissionEnabled ? "Paid to the referrer when a referred seller or reseller buys." : "Only used when referral commission is on (Commerce tab)."}
          value={`Seller ${v.sellerPurchasePercent}% · Reseller ${v.resellerPurchasePercent}%`}
          onEdit={() => m.open("rates")}
        />
      </SettingsGroup>

      <EditDialog
        {...m.bind("rules")}
        title="Eligibility & messages"
        initial={{ min: String(v.resellerApplyMinBalance), cooldown: String(sp.reapplyCooldownDays), closed: sp.closedMessage }}
        onSave={(d) =>
          apply({
            resellerApplyMinBalance: Number(d.min),
            sellerProgram: { ...sp, closedMessage: d.closed, reapplyCooldownDays: Math.max(0, Math.round(Number(d.cooldown) || 0)) },
          })
        }
      >
        {(d, set) => (
          <>
            <Num label="Min wallet balance to apply (USD)" hint="Whole dollars. 0 = anyone can apply." value={d.min} onChange={(x) => set("min", x)} />
            <Num label="Re-apply wait after rejection (days)" hint="0 = they can apply again right away." max="365" value={d.cooldown} onChange={(x) => set("cooldown", x)} />
            <Field label="Closed message" hint="Shown on the page while applications are closed.">
              <Textarea rows={3} maxLength={300} value={d.closed} onChange={(e) => set("closed", e.target.value)} />
            </Field>
          </>
        )}
      </EditDialog>

      <EditDialog
        {...m.bind("page")}
        title="Become a Seller page"
        initial={{ headline: sp.headline, perks: sp.perks }}
        onSave={(d) => apply({ sellerProgram: { ...sp, headline: d.headline, perks: d.perks.map((p) => p.trim()).filter(Boolean) } })}
      >
        {(d, set) => {
          const edit = (i: number, val: string) => set("perks", d.perks.map((x, j) => (j === i ? val : x)));
          const move = (i: number, dir: -1 | 1) => {
            const n = [...d.perks];
            [n[i], n[i + dir]] = [n[i + dir], n[i]];
            set("perks", n);
          };
          return (
            <>
              <Field label="Headline">
                <Input maxLength={80} value={d.headline} onChange={(e) => set("headline", e.target.value)} />
              </Field>
              <Field label={`Perks (${d.perks.length}/${MAX_SELLER_PERKS})`}>
                <div className="grid gap-2">
                  {d.perks.map((p, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Input maxLength={120} value={p} onChange={(e) => edit(i, e.target.value)} placeholder="e.g. Wholesale pricing on the full catalog" />
                      <Button type="button" size="icon-sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                        <ArrowUp />
                      </Button>
                      <Button type="button" size="icon-sm" variant="ghost" disabled={i === d.perks.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                        <ArrowDown />
                      </Button>
                      <Button type="button" size="icon-sm" variant="ghost" onClick={() => set("perks", d.perks.filter((_, j) => j !== i))} aria-label="Remove">
                        <X />
                      </Button>
                    </div>
                  ))}
                  {d.perks.length < MAX_SELLER_PERKS ? (
                    <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => set("perks", [...d.perks, ""])}>
                      <Plus /> Add perk
                    </Button>
                  ) : null}
                </div>
              </Field>
            </>
          );
        }}
      </EditDialog>

      <EditDialog
        {...m.bind("fields")}
        title="Application form"
        description="Choose what else to ask applicants."
        initial={{ fields: sp.fields }}
        onSave={(d) => apply({ sellerProgram: { ...sp, fields: d.fields } })}
      >
        {(d, set) => (
          <div className="divide-y rounded-lg border">
            {SELLER_FIELDS.map((f) => (
              <div key={f.key} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <p className="text-sm font-medium">{f.label}</p>
                <Chips value={d.fields[f.key]} onChange={(mode) => set("fields", { ...d.fields, [f.key]: mode })} options={MODE_OPTIONS} />
              </div>
            ))}
          </div>
        )}
      </EditDialog>

      <EditDialog
        {...m.bind("create")}
        title="Reseller creation"
        initial={{ min: String(v.resellerCreateMinFunding) }}
        onSave={(d) => apply({ resellerCreateMinFunding: Number(d.min) })}
      >
        {(d, set) => <Num label="Min funding to create a reseller (USD)" hint="Whole dollars a seller must load into a new reseller." value={d.min} onChange={(x) => set("min", x)} />}
      </EditDialog>

      <EditDialog
        {...m.bind("rates")}
        title="Referral commission rates"
        initial={{ seller: String(v.sellerPurchasePercent), reseller: String(v.resellerPurchasePercent) }}
        onSave={(d) => apply({ sellerPurchasePercent: Number(d.seller), resellerPurchasePercent: Number(d.reseller) })}
      >
        {(d, set) => (
          <>
            <Num label="When a seller buys (%)" max="100" value={d.seller} onChange={(x) => set("seller", x)} />
            <Num label="When a reseller buys (%)" max="100" value={d.reseller} onChange={(x) => set("reseller", x)} />
          </>
        )}
      </EditDialog>
    </>
  );
}
