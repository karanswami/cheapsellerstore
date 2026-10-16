"use client";

import { useState } from "react";
import {
  Banknote,
  CheckCircle2,
  CircleDashed,
  Coins,
  CreditCard,
  KeyRound,
  Landmark,
  Lock,
  Pencil,
  Plus,
  QrCode,
  Trash2,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Field, ImageUpload, SubmitButton, ToggleRow } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useSettingsSave, type AdminSettings, type ManualMethod } from "../settings/settings-kit";

const LOCKED = new Set(["USD", "INR", "IDR", "NPR"]);
/** Rails whose provider only settles in one currency. */
const LOCKED_RAIL_CURRENCY = new Set(["QRIS", "UPI"]);
const QR_METHODS = new Set(["BINANCE", "ESEWA"]);
const METHOD_META: Record<string, { label: string; via: string; icon: LucideIcon }> = {
  QRIS: { label: "QRIS", via: "AutoGoPay", icon: QrCode },
  BINANCE: { label: "Binance Pay", via: "Binance", icon: Coins },
  UPI: { label: "UPI", via: "Cashfree / FamGateway", icon: Wallet },
  ESEWA: { label: "eSewa", via: "Static QR", icon: Banknote },
};

type Providers = Pick<
  AdminSettings,
  | "binanceApiKey" | "binanceSecretKey" | "binancePayId"
  | "autogopayApiKey" | "autogopayBaseUrl"
  | "famgatewayApiKey" | "famgatewayBaseUrl"
  | "cashfreeAppId" | "cashfreeSecretKey" | "cashfreeWebhookSecret" | "cashfreeEnv"
>;
type KeyField = Exclude<keyof Providers, "cashfreeEnv">;

/** Credentials each auto rail needs. `required` decides the "Keys ready" badge. */
const RAIL_KEYS: Record<string, { required: KeyField[]; optional?: KeyField[] }> = {
  QRIS: { required: ["autogopayBaseUrl", "autogopayApiKey"] },
  BINANCE: { required: ["binancePayId", "binanceApiKey", "binanceSecretKey"] },
  UPI: { required: ["cashfreeAppId", "cashfreeSecretKey", "cashfreeWebhookSecret"], optional: ["famgatewayBaseUrl", "famgatewayApiKey"] },
  ESEWA: { required: [] },
};

const FIELD_LABEL: Record<KeyField, { label: string; secret?: boolean }> = {
  binancePayId: { label: "Pay ID" },
  binanceApiKey: { label: "API key", secret: true },
  binanceSecretKey: { label: "Secret key", secret: true },
  autogopayBaseUrl: { label: "Base URL" },
  autogopayApiKey: { label: "API key", secret: true },
  cashfreeAppId: { label: "App ID" },
  cashfreeSecretKey: { label: "Secret key", secret: true },
  cashfreeWebhookSecret: { label: "Webhook secret", secret: true },
  famgatewayBaseUrl: { label: "FamGateway base URL" },
  famgatewayApiKey: { label: "FamGateway API key", secret: true },
};

export function PaymentsSection({ s }: { s: AdminSettings }) {
  const [methods, setMethods] = useState(s.depositMethods);
  const [currencies, setCurrencies] = useState(s.depositCurrencies);
  const [mins, setMins] = useState(s.depositMins);
  const [quick, setQuick] = useState(s.depositQuickAmounts);
  const [manual, setManual] = useState<ManualMethod[]>(s.manualDepositMethods);
  const [prov, setProv] = useState<Providers>({
    binanceApiKey: s.binanceApiKey, binanceSecretKey: s.binanceSecretKey, binancePayId: s.binancePayId,
    autogopayApiKey: s.autogopayApiKey, autogopayBaseUrl: s.autogopayBaseUrl,
    famgatewayApiKey: s.famgatewayApiKey, famgatewayBaseUrl: s.famgatewayBaseUrl,
    cashfreeAppId: s.cashfreeAppId, cashfreeSecretKey: s.cashfreeSecretKey, cashfreeWebhookSecret: s.cashfreeWebhookSecret, cashfreeEnv: s.cashfreeEnv,
  });

  const codes = currencies.map((c) => c.code);
  const used = new Set([...Object.values(methods).map((m) => m.currency), ...manual.map((m) => m.currency)]);
  const autoLive = Object.values(methods).filter((m) => m.enabled).length;
  const manualLive = manual.filter((m) => m.enabled).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Coins} label="Currencies" value={currencies.length} />
        <Stat icon={Zap} label="Auto live" value={`${autoLive}/${Object.keys(methods).length}`} />
        <Stat icon={Landmark} label="Manual live" value={`${manualLive}/${manual.length}`} />
        <Stat icon={CreditCard} label="Currencies in use" value={used.size} />
      </div>

      <Tabs defaultValue="currencies" className="gap-5">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 sm:w-fit">
          <TabsTrigger value="currencies">1 · Currencies</TabsTrigger>
          <TabsTrigger value="auto">2 · Auto payments</TabsTrigger>
          <TabsTrigger value="manual">3 · Manual payments</TabsTrigger>
        </TabsList>
        <TabsContent value="currencies">
          <CurrenciesTab list={currencies} setList={setCurrencies} mins={mins} setMins={setMins} quick={quick} setQuick={setQuick} used={used} />
        </TabsContent>
        <TabsContent value="auto">
          <AutoTab methods={methods} setMethods={setMethods} prov={prov} setProv={setProv} codes={codes} />
        </TabsContent>
        <TabsContent value="manual">
          <ManualTab list={manual} setList={setManual} codes={codes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- shared bits ---------- */

function Stat({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: React.ReactNode; tone?: "success" | "warning" }) {
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

function Row({ icon: Icon, title, badges, meta, actions, dim }: { icon: LucideIcon; title: string; badges?: React.ReactNode; meta?: React.ReactNode; actions: React.ReactNode; dim?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/40 sm:p-4", dim && "opacity-70")}>
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate font-display font-semibold">{title}</p>
          {badges}
        </div>
        {meta ? <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">{meta}</div> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
    </div>
  );
}

function SectionHead({ title, desc, action }: { title: string; desc: string; action?: React.ReactNode }) {
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

function EnabledBadge({ on }: { on: boolean }) {
  return on ? (
    <Badge variant="success" shape="pill"><CheckCircle2 /> Live</Badge>
  ) : (
    <Badge variant="muted" shape="pill"><CircleDashed /> Off</Badge>
  );
}

function EditDialog({ open, onOpenChange, title, description, busy, onSave, children, wide }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  busy: boolean;
  onSave: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className={wide ? "max-w-xl" : undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="grid gap-4">{children}</div>
        <DialogFooter>
          <Button variant="secondary" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
          <SubmitButton busy={busy} onClick={onSave}>Save changes</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- auto ---------- */

type MethodMap = AdminSettings["depositMethods"];

function AutoTab({ methods, setMethods, prov, setProv, codes }: {
  methods: MethodMap;
  setMethods: (m: MethodMap) => void;
  prov: Providers;
  setProv: (p: Providers) => void;
  codes: string[];
}) {
  const { save, busy } = useSettingsSave();
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ enabled: false, qrUrl: "", currency: "USD" });
  const [f, setF] = useState<Providers>(prov);

  const keysState = (id: string) => {
    const k = RAIL_KEYS[id] ?? { required: [] };
    const filled = k.required.filter((x) => String(prov[x] ?? "").trim()).length;
    return { total: k.required.length, filled, ok: filled === k.required.length };
  };

  async function toggle(id: string, enabled: boolean) {
    const next = { ...methods, [id]: { ...methods[id], enabled } };
    setMethods(next);
    if (!(await save({ depositMethods: next }, enabled ? "Method enabled." : "Method disabled."))) setMethods(methods);
  }

  async function submit() {
    if (!editId) return;
    const next = { ...methods, [editId]: { ...methods[editId], ...draft } };
    const keyFields = [...(RAIL_KEYS[editId]?.required ?? []), ...(RAIL_KEYS[editId]?.optional ?? [])];
    const creds: Record<string, unknown> = Object.fromEntries(keyFields.map((k) => [k, f[k]]));
    if (editId === "UPI") creds.cashfreeEnv = f.cashfreeEnv;
    if (await save({ depositMethods: next, ...creds })) {
      setMethods(next);
      setProv({ ...prov, ...(creds as Partial<Providers>) });
      setEditId(null);
    }
  }

  const keyInput = (k: KeyField) => (
    <Field key={k} label={FIELD_LABEL[k].label}>
      <Input type={FIELD_LABEL[k].secret ? "password" : "text"} autoComplete="off" value={String(f[k] ?? "")} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="font-mono text-xs" />
    </Field>
  );

  const rail = editId ? RAIL_KEYS[editId] : undefined;
  const lockedCur = editId ? LOCKED_RAIL_CURRENCY.has(editId) : false;

  return (
    <>
      <SectionHead title="Auto payments" desc="Gateway-confirmed rails. Only the keys each provider needs — customers are credited automatically." />
      <div className="grid gap-3">
        {Object.keys(methods).map((id) => {
          const meta = METHOD_META[id] ?? { label: id, via: "Custom", icon: CreditCard };
          const m = methods[id];
          const k = keysState(id);
          return (
            <Row
              key={id}
              icon={meta.icon}
              title={meta.label}
              dim={!m.enabled}
              badges={
                <>
                  <EnabledBadge on={m.enabled} />
                  <Badge variant="default" shape="pill">{m.currency}</Badge>
                </>
              }
              meta={
                <>
                  <Badge variant="outline">via {meta.via}</Badge>
                  {k.total > 0 ? (
                    <Badge variant={k.ok ? "success" : "warning"}><KeyRound /> {k.ok ? "Keys ready" : `Keys ${k.filled}/${k.total}`}</Badge>
                  ) : null}
                  {QR_METHODS.has(id) ? <Badge variant={m.qrUrl ? "highlight" : "warning"}>{m.qrUrl ? "QR uploaded" : "QR missing"}</Badge> : null}
                  {LOCKED_RAIL_CURRENCY.has(id) ? <Badge variant="muted"><Lock /> Currency fixed by provider</Badge> : null}
                </>
              }
              actions={
                <>
                  <Switch checked={m.enabled} onCheckedChange={(v) => toggle(id, v)} aria-label={`Toggle ${meta.label}`} />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setDraft({ enabled: m.enabled, qrUrl: m.qrUrl, currency: m.currency });
                      setF(prov);
                      setEditId(id);
                    }}
                  >
                    <Pencil /> Edit
                  </Button>
                </>
              }
            />
          );
        })}
      </div>

      <EditDialog
        open={editId !== null}
        onOpenChange={(o) => !o && setEditId(null)}
        title={editId ? (METHOD_META[editId]?.label ?? editId) : ""}
        description="Currency, availability and the keys this provider needs."
        busy={busy}
        onSave={submit}
        wide
      >
        <ToggleRow label="Enabled" hint="Customers can pick this at deposit." checked={draft.enabled} onChange={(v) => setDraft({ ...draft, enabled: v })} />
        <Field label="Pay currency" hint={lockedCur ? "This provider only settles in this currency." : "Customers pay in this currency; wallet credit converts at its rate."}>
          <Select value={draft.currency} disabled={lockedCur} onValueChange={(v) => setDraft({ ...draft, currency: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {codes.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        {editId && QR_METHODS.has(editId) ? (
          <ImageUpload label="Payment QR" value={draft.qrUrl || null} onChange={(u) => setDraft({ ...draft, qrUrl: u ?? "" })} endpoint="/api/admin/settings/deposit-qr" />
        ) : null}
        {rail && (rail.required.length > 0 || rail.optional?.length) ? (
          <div className="grid gap-4 rounded-xl border bg-muted/30 p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold"><KeyRound className="size-4 text-primary" /> Provider keys</p>
            {rail.required.map(keyInput)}
            {editId === "UPI" ? (
              <Field label="Cashfree environment">
                <Select value={f.cashfreeEnv} onValueChange={(v) => setF({ ...f, cashfreeEnv: v as "sandbox" | "production" })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            {rail.optional?.map(keyInput)}
          </div>
        ) : null}
      </EditDialog>
    </>
  );
}

/* ---------- currencies ---------- */

type Cur = AdminSettings["depositCurrencies"][number];

function CurrenciesTab({ list, setList, mins, setMins, quick, setQuick, used }: {
  used: Set<string>;
  list: Cur[];
  setList: (l: Cur[]) => void;
  mins: AdminSettings["depositMins"];
  setMins: (m: AdminSettings["depositMins"]) => void;
  quick: Record<string, number[]>;
  setQuick: (q: Record<string, number[]>) => void;
}) {
  const { save, busy } = useSettingsSave();
  const [idx, setIdx] = useState<number | null>(null); // -1 = new
  const [c, setC] = useState<Cur>({ code: "", name: "", symbol: "", rate: 1, sortOrder: 0 });
  const [minU, setMinU] = useState("");
  const [minR, setMinR] = useState("");
  const [qk, setQk] = useState("");
  const [del, setDel] = useState<number | null>(null);

  function open(i: number) {
    const cur = i === -1 ? { code: "", name: "", symbol: "", rate: 1, sortOrder: list.length } : list[i];
    setC(cur);
    setMinU(String(mins.user[cur.code] ?? ""));
    setMinR(String(mins.reseller[cur.code] ?? ""));
    setQk((quick[cur.code] ?? []).join(", "));
    setIdx(i);
  }

  async function persist(nextList: Cur[], nextMins = mins, nextQuick = quick, msg?: string) {
    const ok = await save(
      { depositCurrencies: nextList.map((x, i) => ({ ...x, code: x.code.toUpperCase(), sortOrder: i })), depositMins: nextMins, depositQuickAmounts: nextQuick },
      msg,
    );
    if (ok) {
      setList(nextList);
      setMins(nextMins);
      setQuick(nextQuick);
    }
    return ok;
  }

  async function submit() {
    if (idx === null) return;
    const code = c.code.trim().toUpperCase();
    if (!code || !c.name.trim()) return void (await import("sonner")).toast.error("Code and name are required.");
    const prevCode = idx === -1 ? code : list[idx].code;
    const entry = { ...c, code };
    const nextList = idx === -1 ? [...list, entry] : list.map((x, j) => (j === idx ? entry : x));
    const nextMins = {
      user: { ...mins.user, [code]: Number(minU) || 0 },
      reseller: { ...mins.reseller, [code]: Number(minR) || 0 },
    };
    const nextQuick = { ...quick };
    if (prevCode !== code) delete nextQuick[prevCode];
    const nums = qk.split(",").map((x) => Number(x.trim())).filter((n) => n > 0).slice(0, 4);
    if (nums.length) nextQuick[code] = nums;
    else delete nextQuick[code];
    if (await persist(nextList, nextMins, nextQuick)) setIdx(null);
  }

  const locked = idx !== null && idx !== -1 && LOCKED.has(list[idx]?.code);

  return (
    <>
      <SectionHead
        title="Pay currencies"
        desc="Create currencies first — every auto and manual payment method attaches to one. Wallet credit is always USD."
        action={<Button size="sm" onClick={() => open(-1)}><Plus /> Add currency</Button>}
      />
      <div className="grid gap-3">
        {list.map((x, i) => (
          <Row
            key={x.code + i}
            icon={Coins}
            title={`${x.name} · ${x.code}`}
            badges={
              <>
                <Badge variant="default" shape="pill">{x.symbol || x.code}</Badge>
                {x.code === "USD" ? <Badge variant="highlight" shape="pill">Base</Badge> : null}
              </>
            }
            meta={
              <>
                {x.code !== "USD" ? <Badge variant="outline">1 USD = {x.rate} {x.code}</Badge> : <Badge variant="outline">1 USD = 1 USD</Badge>}
                {used.has(x.code) ? <Badge variant="success">In use</Badge> : null}
                <Badge variant="muted">Min user {mins.user[x.code] ?? "—"}</Badge>
                <Badge variant="muted">Min seller {mins.reseller[x.code] ?? "—"}</Badge>
                {(quick[x.code] ?? []).map((n) => (
                  <Badge key={n} variant="success" shape="pill">{n}</Badge>
                ))}
              </>
            }
            actions={
              <>
                <Button variant="secondary" size="sm" onClick={() => open(i)}><Pencil /> Edit</Button>
                <Button variant="ghost" size="icon-sm" disabled={LOCKED.has(x.code) || used.has(x.code)} title={used.has(x.code) ? "In use by a payment method" : undefined} onClick={() => setDel(i)} aria-label="Remove"><Trash2 /></Button>
              </>
            }
          />
        ))}
      </div>

      <EditDialog open={idx !== null} onOpenChange={(o) => !o && setIdx(null)} title={idx === -1 ? "Add currency" : "Edit currency"} description="Set the code, symbol and how much of this currency equals the base currency (1 USD)." busy={busy} onSave={submit} wide>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Code"><Input value={c.code} disabled={locked} maxLength={8} onChange={(e) => setC({ ...c, code: e.target.value.toUpperCase() })} /></Field>
          <Field label="Symbol"><Input value={c.symbol} maxLength={8} onChange={(e) => setC({ ...c, symbol: e.target.value })} /></Field>
          <Field label="Amount = 1 USD" hint={c.code ? `How many ${c.code} you get for 1 USD.` : undefined}><Input type="number" min="0" step="any" value={c.rate} disabled={c.code === "USD"} onChange={(e) => setC({ ...c, rate: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Name"><Input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Min deposit (users)"><Input type="number" min="0" value={minU} onChange={(e) => setMinU(e.target.value)} /></Field>
          <Field label="Min deposit (sellers)"><Input type="number" min="0" value={minR} onChange={(e) => setMinR(e.target.value)} /></Field>
        </div>
        <Field label="Quick amounts" hint="Up to 4, comma separated.">
          <Input value={qk} onChange={(e) => setQk(e.target.value)} placeholder="5, 10, 25, 50" />
        </Field>
      </EditDialog>

      <ConfirmRemove
        open={del !== null}
        onOpenChange={(o) => !o && setDel(null)}
        name={del !== null ? list[del]?.code : ""}
        busy={busy}
        onConfirm={async () => {
          if (del === null) return;
          const code = list[del].code;
          const nextQuick = { ...quick };
          delete nextQuick[code];
          if (await persist(list.filter((_, j) => j !== del), mins, nextQuick, "Currency removed.")) setDel(null);
        }}
      />
    </>
  );
}

function ConfirmRemove({ open, onOpenChange, name, busy, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; name: string; busy: boolean; onConfirm: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {name || "item"}?</DialogTitle>
          <DialogDescription>This is saved immediately and customers will no longer see it.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
          <SubmitButton variant="destructive" busy={busy} onClick={onConfirm}>Remove</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- manual ---------- */

function ManualTab({ list, setList, codes }: { list: ManualMethod[]; setList: (l: ManualMethod[]) => void; codes: string[] }) {
  const { save, busy } = useSettingsSave();
  const [idx, setIdx] = useState<number | null>(null);
  const [m, setM] = useState<ManualMethod>({ name: "", currency: "USD", enabled: true, sortOrder: 0 });
  const [del, setDel] = useState<number | null>(null);

  const persist = async (next: ManualMethod[], msg?: string) => {
    const ok = await save({ manualDepositMethods: next.map((x, i) => ({ ...x, sortOrder: i })) }, msg);
    if (ok) setList(next);
    return ok;
  };

  function open(i: number) {
    setM(i === -1 ? { name: "", currency: codes[0] ?? "USD", enabled: true, sortOrder: list.length } : list[i]);
    setIdx(i);
  }

  async function submit() {
    if (idx === null) return;
    if (!m.name.trim()) return void (await import("sonner")).toast.error("Method name is required.");
    if (await persist(idx === -1 ? [...list, m] : list.map((x, j) => (j === idx ? m : x)))) setIdx(null);
  }

  return (
    <>
      <SectionHead
        title="Manual payment methods"
        desc="Bank, wallet or crypto accounts customers pay into and upload a proof for."
        action={<Button size="sm" onClick={() => open(-1)}><Plus /> Add method</Button>}
      />
      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No manual methods yet.</p>
      ) : (
        <div className="grid gap-3">
          {list.map((x, i) => (
            <Row
              key={x.id ?? i}
              icon={Landmark}
              title={x.name || "Untitled"}
              dim={!x.enabled}
              badges={<EnabledBadge on={x.enabled} />}
              meta={
                <>
                  <Badge variant="default" shape="pill">{x.currency}</Badge>
                  <Badge variant={x.accountNumber ? "outline" : "warning"}>{x.accountNumber ? "Account set" : "No account"}</Badge>
                  {x.qrUrl ? <Badge variant="highlight">QR</Badge> : null}
                  {x.instructions ? <Badge variant="muted">Instructions</Badge> : null}
                </>
              }
              actions={
                <>
                  <Switch
                    checked={x.enabled}
                    aria-label={`Toggle ${x.name}`}
                    onCheckedChange={async (v) => void (await persist(list.map((y, j) => (j === i ? { ...y, enabled: v } : y)), v ? "Method enabled." : "Method disabled."))}
                  />
                  <Button variant="secondary" size="sm" onClick={() => open(i)}><Pencil /> Edit</Button>
                  <Button variant="ghost" size="icon-sm" disabled={list.length <= 1} onClick={() => setDel(i)} aria-label="Remove"><Trash2 /></Button>
                </>
              }
            />
          ))}
        </div>
      )}

      <EditDialog open={idx !== null} onOpenChange={(o) => !o && setIdx(null)} title={idx === -1 ? "Add manual method" : "Edit manual method"} busy={busy} onSave={submit} wide>
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Field label="Method name"><Input value={m.name} maxLength={80} onChange={(e) => setM({ ...m, name: e.target.value })} /></Field>
          <Field label="Currency">
            <Select value={m.currency} onValueChange={(v) => setM({ ...m, currency: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {codes.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Account / address"><Input value={m.accountNumber ?? ""} maxLength={500} onChange={(e) => setM({ ...m, accountNumber: e.target.value })} /></Field>
        <Field label="Instructions"><Textarea value={m.instructions ?? ""} rows={3} maxLength={1000} onChange={(e) => setM({ ...m, instructions: e.target.value })} /></Field>
        <ImageUpload label="QR code" value={m.qrUrl || null} onChange={(u) => setM({ ...m, qrUrl: u ?? "" })} endpoint="/api/admin/settings/deposit-qr" />
        <ToggleRow label="Enabled" checked={m.enabled} onChange={(v) => setM({ ...m, enabled: v })} />
      </EditDialog>

      <ConfirmRemove
        open={del !== null}
        onOpenChange={(o) => !o && setDel(null)}
        name={del !== null ? list[del]?.name : ""}
        busy={busy}
        onConfirm={async () => {
          if (del !== null && (await persist(list.filter((_, j) => j !== del), "Method removed."))) setDel(null);
        }}
      />
    </>
  );
}

