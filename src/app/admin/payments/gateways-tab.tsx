"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Banknote, Bitcoin, KeyRound, Landmark, Plus, QrCode, Wrench, type LucideIcon } from "lucide-react";
import { Field, ImageUpload } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GATEWAY_PROVIDERS, PROVIDER_META, type GatewayProvider, type GatewayStatus } from "@/lib/gateway-providers";
import { useSettingsSave, type AdminGateway, type AdminSettings } from "../settings/settings-kit";
import { EditorDialog, EditorFooter, InlineDelete, ListRow, SectionHead, StatusSwitch } from "./payments-ui";

const ICON: Record<GatewayProvider, LucideIcon> = { QRIS: QrCode, UPI: Landmark, BINANCE: Bitcoin, ESEWA: Banknote };

const statusOf = (g: AdminGateway): GatewayStatus => (!g.enabled ? "off" : g.maintenance ? "maintenance" : "live");
const withStatus = (g: AdminGateway, s: GatewayStatus): AdminGateway => ({ ...g, enabled: s !== "off", maintenance: s === "maintenance" });

type Props = {
  list: AdminGateway[];
  setList: (l: AdminGateway[]) => void;
  currencies: AdminSettings["depositCurrencies"];
  /** Shared (Settings/env) provider keys, shown as the fallback hint. */
  shared: Record<string, string>;
};

export function GatewaysTab({ list, setList, currencies, shared }: Props) {
  const { save, busy } = useSettingsSave();
  const [openId, setOpenId] = useState<string | null>(null);
  const editing = list.find((g) => g.id === openId) ?? null;
  const codes = currencies.map((c) => c.code);

  const missing = GATEWAY_PROVIDERS.filter((p) => !list.some((g) => g.provider === p));

  async function setup(provider: GatewayProvider) {
    const meta = PROVIDER_META[provider];
    const cur = meta.lockedCurrency ?? (codes.includes(meta.defaultCurrency) ? meta.defaultCurrency : codes[0] ?? "");
    if (!cur || !codes.includes(cur)) return void toast.error(`Create the ${cur || "pay"} currency first (Currencies tab).`);
    const g: AdminGateway = { id: `gw_${Math.random().toString(16).slice(2, 10)}`, provider, name: meta.label, currency: cur, enabled: false, maintenance: false, maintenanceNote: "", qrUrl: "", creds: {} };
    if (await persist([...list, g], `${meta.label} added — fill in its keys, then switch it Live.`)) setOpenId(g.id);
  }

  async function persist(next: AdminGateway[], msg?: string) {
    const ok = await save({ autoGateways: next }, msg);
    if (ok) setList(next);
    return ok;
  }

  // Group by currency so it is obvious how many options each currency offers.
  const order = [...new Set([...codes, ...list.map((g) => g.currency)])];
  const groups = order.map((code) => ({ code, items: list.filter((g) => g.currency === code) })).filter((g) => g.items.length > 0);

  return (
    <>
      <SectionHead
        title="Auto payment gateways"
        desc="Each provider has its own keys, currency and Live / Maintenance / Off switch. Press Set up on a provider to configure it."
      />

      <div className="grid gap-6">
        {groups.map((grp) => {
          const cur = currencies.find((c) => c.code === grp.code);
          const live = grp.items.filter((g) => statusOf(g) === "live").length;
          return (
            <section key={grp.code} className="grid gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="default" shape="pill">{grp.code}</Badge>
                <span className="font-medium">{cur?.name ?? "Unregistered currency"}</span>
                <span className="text-muted-foreground">· {grp.items.length} gateway{grp.items.length === 1 ? "" : "s"}, {live} live</span>
              </div>
              {grp.items.map((g) => (
                <GatewayCard
                  key={g.id}
                  g={g}
                  onEdit={() => setOpenId(g.id)}
                  shared={shared}
                  busy={busy}
                  onStatus={(s) => persist(list.map((x) => (x.id === g.id ? withStatus(x, s) : x)), s === "live" ? "Gateway live." : s === "off" ? "Gateway turned off." : "Gateway in maintenance.")}
                />
              ))}
            </section>
          );
        })}

        {missing.length > 0 ? (
          <section className="grid gap-3">
            <p className="text-sm font-medium text-muted-foreground">Not set up yet</p>
            {missing.map((p) => (
              <ListRow
                key={p}
                onEdit={() => setup(p)}
                icon={ICON[p]}
                title={PROVIDER_META[p].label}
                dim
                badges={<Badge variant="muted">Not set up</Badge>}
                meta={<span>via {PROVIDER_META[p].via}</span>}
                actions={<Button type="button" size="sm" disabled={busy} onClick={() => setup(p)}><Plus /> Set up</Button>}
              />
            ))}
          </section>
        ) : null}
      </div>

      <EditorDialog open={editing !== null} onClose={() => setOpenId(null)} title={editing ? `Edit ${editing.name}` : "Edit gateway"} icon={editing ? ICON[editing.provider] : undefined} desc="Keys, currency, maintenance message and QR for this gateway.">
        {editing ? (
          <GatewayEditor
            key={editing.id}
            g={editing}
            codes={codes}
            shared={shared}
            busy={busy}
            onSave={(next) => persist(list.map((x) => (x.id === editing.id ? next : x)), "Gateway saved.")}
            onClose={() => setOpenId(null)}
            onDelete={async () => {
              if (await persist(list.filter((x) => x.id !== editing.id), "Gateway deleted.")) setOpenId(null);
            }}
          />
        ) : null}
      </EditorDialog>
    </>
  );
}

function CurrencySelect({ value, codes, onChange, disabled }: { value: string; codes: string[]; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <Select value={value} disabled={disabled} onValueChange={onChange}>
      <SelectTrigger className="w-full"><SelectValue placeholder="Currency" /></SelectTrigger>
      <SelectContent>
        {codes.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
      </SelectContent>
    </Select>
  );
}

function GatewayCard({ g, onEdit, shared, busy, onStatus }: {
  g: AdminGateway;
  onEdit: () => void;
  shared: Record<string, string>;
  busy: boolean;
  onStatus: (s: GatewayStatus) => void;
}) {
  const meta = PROVIDER_META[g.provider];
  const required = meta.fields.filter((f) => f.required);
  const have = required.filter((f) => (g.creds[f.key] || shared[f.key] || "").trim()).length;
  const ready = have === required.length;
  const ownKeys = Object.keys(g.creds).length > 0;
  const status = statusOf(g);

  return (
    <ListRow
      onEdit={onEdit}
      icon={ICON[g.provider]}
      title={g.name}
      dim={status === "off"}
      badges={<Badge variant="outline">{meta.label}</Badge>}
      meta={
        <>
          <span>via {meta.via}</span>
          {required.length > 0 ? (
            <Badge variant={ready ? "success" : "warning"}><KeyRound /> {ready ? (ownKeys ? "Own keys" : "Shared keys") : `Keys ${have}/${required.length}`}</Badge>
          ) : null}
          {meta.qr ? <Badge variant={g.qrUrl ? "highlight" : "warning"}>{g.qrUrl ? "QR uploaded" : "QR missing"}</Badge> : null}
          {status === "maintenance" ? <Badge variant="warning"><Wrench /> {g.maintenanceNote || "Maintenance"}</Badge> : null}
        </>
      }
      actions={<StatusSwitch value={status} disabled={busy} onChange={onStatus} />}
    />
  );
}

function GatewayEditor({ g, codes, shared, busy, onSave, onClose, onDelete }: {
  g: AdminGateway;
  codes: string[];
  shared: Record<string, string>;
  busy: boolean;
  onSave: (g: AdminGateway) => Promise<boolean>;
  onClose: () => void;
  onDelete: () => void;
}) {
  const meta = PROVIDER_META[g.provider];
  const [d, setD] = useState<AdminGateway>(g);
  const dirty = JSON.stringify(d) !== JSON.stringify(g);
  const setCred = (k: string, v: string) => setD({ ...d, creds: { ...d.creds, [k]: v } });

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field label="Display name"><Input value={d.name} maxLength={60} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
        <Field label="Pay currency" hint={meta.lockedCurrency ? "Fixed by provider." : "Wallet credit converts at its rate."}>
          <CurrencySelect value={d.currency} codes={codes} disabled={Boolean(meta.lockedCurrency)} onChange={(v) => setD({ ...d, currency: v })} />
        </Field>
      </div>

      <Field label="Maintenance message" hint="Shown to customers while this gateway is in Maintenance (it stays visible but can’t be picked).">
        <Textarea rows={2} maxLength={200} value={d.maintenanceNote} placeholder="Back in ~1 hour — please use another method." onChange={(e) => setD({ ...d, maintenanceNote: e.target.value })} />
      </Field>

      {meta.fields.length > 0 ? (
        <div className="grid gap-4 rounded-xl border bg-card p-4">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold"><KeyRound className="size-4 text-primary" /> Keys for this gateway</p>
            <p className="text-xs text-muted-foreground">Leave a box empty to use the shared key from Settings / env. Fill it to give this gateway its own account.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {meta.fields.map((f) =>
              f.env ? (
                <Field key={f.key} label={f.label}>
                  <Select value={d.creds[f.key] || "shared"} onValueChange={(v) => setCred(f.key, v === "shared" ? "" : v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shared">Use shared setting</SelectItem>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              ) : (
                <Field key={f.key} label={f.label + (f.required ? " *" : "")}>
                  <Input
                    type={f.secret ? "password" : "text"}
                    autoComplete="off"
                    className="font-mono text-xs"
                    value={d.creds[f.key] ?? ""}
                    placeholder={shared[f.key] ? "Using shared key" : "Not set"}
                    onChange={(e) => setCred(f.key, e.target.value)}
                  />
                </Field>
              ),
            )}
          </div>
        </div>
      ) : null}

      {meta.qr ? <ImageUpload label="Payment QR" hint="Shown to customers on the payment ticket." value={d.qrUrl || null} onChange={(u) => setD({ ...d, qrUrl: u ?? "" })} endpoint="/api/admin/settings/deposit-qr" /> : null}

      <EditorFooter
        busy={busy}
        dirty={dirty}
        onSave={() => onSave(d)}
        onCancel={onClose}
        extra={
          <>
            <InlineDelete busy={busy} onConfirm={onDelete} />
          </>
        }
      />
    </>
  );
}
