"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Ban,
  Check,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  UserPlus,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { IconTile, Surface } from "@/components/app-kit";
import { BottomSheet } from "@/components/app-kit-client";
import { RobotAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { formatMoney, usdToMicrocents } from "@/lib/currencies";
import { cn } from "@/lib/utils";

type Reseller = {
  id: string;
  name: string;
  username: string;
  email: string;
  walletBalance: number;
  banned: boolean;
  createdAt: string;
  orders: number;
  spent: number;
  lastOrderAt: string | null;
};
type Can = { create: boolean; manage: boolean; fund: boolean };
type Filter = "all" | "active" | "suspended";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "suspended", label: "Suspended" },
];

const CHIPS = [5, 10, 25, 50, 100];

async function api(url: string, method: string, body?: object) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message ?? "Request failed.");
  return json.data;
}

async function copy(text: string, label = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("Couldn't copy.");
  }
}

const ago = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

export function SellerClient({ resellers, walletBalance, active30, minUsd, can }: { resellers: Reseller[]; walletBalance: number; active30: number; minUsd: number; can: Can }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const counts = {
    all: resellers.length,
    active: resellers.filter((r) => !r.banned).length,
    suspended: resellers.filter((r) => r.banned).length,
  };
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return resellers.filter(
      (r) =>
        (filter === "all" || (filter === "active" ? !r.banned : r.banned)) &&
        (!term || r.username.toLowerCase().includes(term) || r.name.toLowerCase().includes(term) || r.email.toLowerCase().includes(term)),
    );
  }, [resellers, filter, q]);
  const open = resellers.find((r) => r.id === openId) ?? null;
  const fi = FILTERS.findIndex((f) => f.id === filter);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Hero resellers={resellers} walletBalance={walletBalance} active30={active30} canCreate={can.create} onCreate={() => setCreating(true)} />

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["Create", can.create],
            ["Manage", can.manage],
            ["Fund", can.fund],
          ] as const
        ).map(([label, on]) => (
          <span
            key={label}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
              on ? "bg-emerald-400/10 text-emerald-300 ring-emerald-300/20" : "bg-white/[0.03] text-muted-foreground ring-white/10",
            )}
          >
            {on ? <Check className="size-3" strokeWidth={3} /> : <Ban className="size-3" />} {label}
          </span>
        ))}
      </div>

      {resellers.length > 0 ? (
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 space-y-2 bg-background/85 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6">
          <div role="tablist" aria-label="Reseller status" className="relative grid grid-cols-3 rounded-2xl border border-white/[0.06] bg-card/80 p-1">
            <span
              aria-hidden
              className="bg-brand-gradient absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-xl shadow-lg shadow-primary/25 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ transform: `translateX(${fi * 100}%)` }}
            />
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "relative flex h-9 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold transition-colors",
                  filter === f.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
                <span className={cn("text-[11px] font-bold tabular-nums", filter === f.id ? "opacity-80" : "opacity-60")}>{counts[f.id]}</span>
              </button>
            ))}
          </div>
          {resellers.length > 5 ? (
            <label className="flex h-11 items-center gap-2 rounded-2xl border border-white/[0.06] bg-card/80 px-3.5">
              <Search className="size-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, @username or email" className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70" />
            </label>
          ) : null}
        </div>
      ) : null}

      {resellers.length === 0 ? (
        <Surface className="p-8 text-center">
          <IconTile icon={UsersRound} tone="sky" className="mx-auto size-14 rounded-3xl [&_svg]:size-6" />
          <h2 className="mt-4 font-display text-lg font-bold">No resellers yet</h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            {can.create ? "Create a reseller account, fund it from your wallet and they can start buying at their price." : "Resellers you manage will appear here."}
          </p>
          {can.create ? (
            <Button className="mt-5" onClick={() => setCreating(true)}>
              <UserPlus /> Create first reseller
            </Button>
          ) : null}
        </Surface>
      ) : list.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No resellers match.</p>
      ) : (
        <Surface className="divide-y divide-white/[0.05] p-1.5">
          {list.map((r) => (
            <button key={r.id} type="button" onClick={() => setOpenId(r.id)} className="tap flex w-full items-center gap-3 rounded-2xl px-2.5 py-3 text-left transition-colors hover:bg-white/[0.03]">
              <span className={cn("relative shrink-0", r.banned && "opacity-50 grayscale")}>
                <RobotAvatar seed={r.username} className="size-11 rounded-2xl" />
                <span className={cn("absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-card", r.banned ? "bg-rose-400" : "bg-emerald-400")} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate font-semibold">{r.name || r.username}</span>
                  {r.banned ? <span className="rounded-md bg-rose-400/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">Suspended</span> : null}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  @{r.username} · {r.orders} {r.orders === 1 ? "order" : "orders"}
                  {r.lastOrderAt ? ` · last ${ago(r.lastOrderAt)}` : ""}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-display text-[15px] font-bold tabular-nums">{formatMoney(r.walletBalance)}</span>
                <span className="block text-[10.5px] uppercase tracking-wider text-muted-foreground">Wallet</span>
              </span>
            </button>
          ))}
        </Surface>
      )}

      <ResellerSheet r={open} can={can} walletBalance={walletBalance} onClose={() => setOpenId(null)} />
      {can.create ? <CreateSheet open={creating} onClose={() => setCreating(false)} minUsd={minUsd} walletBalance={walletBalance} /> : null}
    </div>
  );
}

function Hero({ resellers, walletBalance, active30, canCreate, onCreate }: { resellers: Reseller[]; walletBalance: number; active30: number; canCreate: boolean; onCreate: () => void }) {
  const combined = resellers.reduce((s, r) => s + r.walletBalance, 0);
  const spent = resellers.reduce((s, r) => s + r.spent, 0);
  const stats = [
    { label: "Resellers", value: String(resellers.length) },
    { label: "Their wallets", value: formatMoney(combined) },
    { label: "Spent", value: formatMoney(spent) },
    { label: "Active 30d", value: String(active30) },
  ];
  return (
    <section className="hero-card p-5 [--hero-a:#0ea5e9] [--hero-b:#8b5cf6] sm:p-6">
      <div aria-hidden className="anim-sheen-loop pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" />
      <UsersRound aria-hidden className="anim-float absolute -right-6 -top-6 -z-10 size-36 text-white/[0.07]" strokeWidth={1.25} />
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
        <UsersRound className="size-3.5" /> Seller panel
      </p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-white/60">Your wallet</p>
          <p className="font-display text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">{formatMoney(walletBalance)}</p>
        </div>
        {canCreate ? (
          <button type="button" onClick={onCreate} className="tap flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-[#0b1020] shadow-lg shadow-black/30">
            <UserPlus className="size-4" strokeWidth={2.5} /> New reseller
          </button>
        ) : null}
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2 border-t border-white/10 pt-4">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0">
            <p className="truncate font-display text-base font-bold leading-none tabular-nums sm:text-lg">{s.value}</p>
            <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-white/55">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
      <Icon className="size-4 text-muted-foreground" />
      <p className="mt-2 font-display text-[15px] font-bold tabular-nums">{value}</p>
      <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function ResellerSheet({ r, can, walletBalance, onClose }: { r: Reseller | null; can: Can; walletBalance: number; onClose: () => void }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // keep the last reseller rendered while the sheet animates out
  const [shown, setShown] = useState<Reseller | null>(r);
  if (r && r !== shown) setShown(r);
  const x = r ?? shown;

  function close() {
    setAmount("");
    setConfirmDelete(false);
    onClose();
  }

  async function run(key: string, fn: () => Promise<unknown>, ok: string, closeAfter = false) {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      setAmount("");
      router.refresh();
      if (closeAfter) close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(null);
    }
  }

  const n = Number(amount);
  const micro = n > 0 ? usdToMicrocents(n) : 0;

  return (
    <BottomSheet
      open={Boolean(r)}
      onClose={close}
      label="Reseller"
      title={x ? x.name || x.username : ""}
      subtitle={x ? `@${x.username}` : ""}
      icon={x ? <RobotAvatar seed={x.username} className="size-11 rounded-2xl" /> : null}
    >
      {x ? (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            <Stat icon={Wallet} label="Wallet" value={formatMoney(x.walletBalance)} />
            <Stat icon={ShoppingBag} label="Orders" value={String(x.orders)} />
            <Stat icon={RefreshCw} label="Spent" value={formatMoney(x.spent)} />
          </div>

          <div className="space-y-1.5 rounded-2xl border border-white/[0.06] p-1.5">
            {[
              ["Username", `@${x.username}`, x.username],
              ["Email", x.email, x.email],
            ].map(([k, v, c]) => (
              <button key={k} type="button" onClick={() => copy(c, `${k} copied`)} className="tap flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-white/[0.03]">
                <span className="text-muted-foreground">{k}</span>
                <span className="flex min-w-0 items-center gap-1.5 font-medium">
                  <span className="truncate">{v}</span> <Copy className="size-3.5 shrink-0 text-muted-foreground" />
                </span>
              </button>
            ))}
            <div className="flex justify-between px-2.5 py-2 text-sm">
              <span className="text-muted-foreground">Joined</span>
              <span className="font-medium">{new Date(x.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          </div>

          {can.fund ? (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Move funds</p>
              <div className="flex h-14 items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 focus-within:border-primary">
                <span className="font-display text-xl text-muted-foreground">$</span>
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0.00"
                  className="h-full flex-1 bg-transparent font-display text-2xl font-bold tabular-nums outline-none placeholder:text-muted-foreground/40"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CHIPS.map((c) => (
                  <button key={c} type="button" onClick={() => setAmount(String(c))} className={cn("tap rounded-full border px-3 py-1 text-xs font-semibold", n === c ? "border-primary bg-primary/15 text-primary" : "border-white/10 text-muted-foreground")}>
                    ${c}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Fund moves money from your wallet ({formatMoney(walletBalance)}). Reclaim pulls it back from theirs.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  size="lg"
                  disabled={!micro || micro > walletBalance || busy !== null}
                  onClick={() => run("fund", () => api(`/api/seller/sub-sellers/${x.id}/credit`, "POST", { amountUsd: n }), `Sent ${formatMoney(micro)} to @${x.username}.`)}
                >
                  {busy === "fund" ? <Loader2 className="animate-spin" /> : <Plus />} Fund
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  disabled={!micro || micro > x.walletBalance || busy !== null}
                  onClick={() => run("reclaim", () => api(`/api/seller/sub-sellers/${x.id}/credit`, "POST", { amountUsd: -n }), `Reclaimed ${formatMoney(micro)}.`)}
                >
                  {busy === "reclaim" ? <Loader2 className="animate-spin" /> : <Minus />} Reclaim
                </Button>
              </div>
            </div>
          ) : null}

          {can.manage ? (
            confirmDelete ? (
              <div className="rounded-2xl border border-rose-400/25 bg-rose-500/[0.07] p-4">
                <p className="flex items-center gap-2 font-semibold text-rose-200">
                  <AlertTriangle className="size-4" /> Delete @{x.username}?
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Their {formatMoney(x.walletBalance)} wallet balance comes back to you. This can&apos;t be undone.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={busy !== null}>
                    Cancel
                  </Button>
                  <Button variant="destructive" disabled={busy !== null} onClick={() => run("del", () => api(`/api/seller/sub-sellers/${x.id}`, "DELETE"), "Reseller deleted.", true)}>
                    {busy === "del" ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  disabled={busy !== null}
                  onClick={() => run("ban", () => api(`/api/seller/sub-sellers/${x.id}`, "PATCH", { banned: !x.banned }), x.banned ? "Reseller restored." : "Reseller suspended.")}
                >
                  {busy === "ban" ? <Loader2 className="animate-spin" /> : x.banned ? <Check /> : <Ban />} {x.banned ? "Restore" : "Suspend"}
                </Button>
                <Button variant="ghost" className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200" onClick={() => setConfirmDelete(true)} disabled={busy !== null}>
                  <Trash2 /> Delete
                </Button>
              </div>
            )
          ) : null}
        </div>
      ) : null}
    </BottomSheet>
  );
}

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const buf = new Uint32Array(12);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => chars[n % chars.length]).join("");
}

function CreateSheet({ open, onClose, minUsd, walletBalance }: { open: boolean; onClose: () => void; minUsd: number; walletBalance: number }) {
  const router = useRouter();
  const empty = { username: "", email: "", password: "", name: "", initialUsd: String(minUsd) };
  const [f, setF] = useState(empty);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ username: string; email: string; password: string } | null>(null);

  const fund = usdToMicrocents(Number(f.initialUsd) || 0);
  const after = walletBalance - fund;
  const valid = f.username.trim().length >= 3 && /\S+@\S+\.\S+/.test(f.email) && f.password.length >= 6 && Number(f.initialUsd) >= minUsd && after >= 0;

  function close() {
    onClose();
    window.setTimeout(() => {
      setF(empty);
      setCreated(null);
      setShow(false);
    }, 300);
  }

  async function submit() {
    setBusy(true);
    try {
      await api("/api/seller/sub-sellers", "POST", {
        username: f.username.trim(),
        email: f.email.trim(),
        password: f.password,
        name: f.name.trim() || undefined,
        initialUsd: Number(f.initialUsd),
      });
      setCreated({ username: f.username.trim(), email: f.email.trim(), password: f.password });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create reseller.");
    } finally {
      setBusy(false);
    }
  }

  const input = "h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-[15px] outline-none placeholder:text-muted-foreground/60 focus:border-primary";
  const login = created ? `Login: ${typeof window !== "undefined" ? window.location.origin : ""}/login\nUsername: ${created.username}\nEmail: ${created.email}\nPassword: ${created.password}` : "";

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={created ? "Reseller created" : "New reseller"}
      subtitle={created ? "Share these login details with them" : "Funded from your wallet"}
      icon={<IconTile icon={created ? Check : UserPlus} tone={created ? "emerald" : "sky"} />}
    >
      {created ? (
        <div className="space-y-4">
          <pre className="whitespace-pre-wrap rounded-2xl border border-white/[0.06] bg-black/30 p-4 font-mono text-[13px] leading-relaxed">{login}</pre>
          <Button size="lg" className="w-full" onClick={() => copy(login, "Login details copied")}>
            <Copy /> Copy login details
          </Button>
          <p className="text-center text-xs text-muted-foreground">The password isn&apos;t shown again after you close this.</p>
          <Button size="lg" variant="outline" className="w-full" onClick={close}>
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <input className={input} placeholder="Username" autoComplete="off" value={f.username} onChange={(e) => setF((p) => ({ ...p, username: e.target.value.replace(/\s/g, "") }))} />
          <input className={input} placeholder="Email" type="email" autoComplete="off" value={f.email} onChange={(e) => setF((p) => ({ ...p, email: e.target.value }))} />
          <div className="relative">
            <input className={cn(input, "pr-24")} placeholder="Password (min 6)" type={show ? "text" : "password"} autoComplete="new-password" value={f.password} onChange={(e) => setF((p) => ({ ...p, password: e.target.value }))} />
            <span className="absolute inset-y-0 right-2 flex items-center gap-1">
              <button type="button" onClick={() => setShow((s) => !s)} className="tap grid size-8 place-items-center rounded-lg text-muted-foreground" aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setF((p) => ({ ...p, password: genPassword() }));
                  setShow(true);
                }}
                className="tap grid size-8 place-items-center rounded-lg text-muted-foreground"
                aria-label="Generate password"
              >
                <RefreshCw className="size-4" />
              </button>
            </span>
          </div>
          <input className={input} placeholder="Display name (optional)" value={f.name} onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} />

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Starting balance</p>
            <div className="mt-1.5 flex items-center gap-1">
              <span className="font-display text-xl text-muted-foreground">$</span>
              <input
                inputMode="decimal"
                value={f.initialUsd}
                onChange={(e) => setF((p) => ({ ...p, initialUsd: e.target.value.replace(/[^0-9.]/g, "") }))}
                className="w-full bg-transparent font-display text-2xl font-bold tabular-nums outline-none"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CHIPS.filter((c) => c >= minUsd).map((c) => (
                <button key={c} type="button" onClick={() => setF((p) => ({ ...p, initialUsd: String(c) }))} className={cn("tap rounded-full border px-3 py-1 text-xs font-semibold", Number(f.initialUsd) === c ? "border-primary bg-primary/15 text-primary" : "border-white/10 text-muted-foreground")}>
                  ${c}
                </button>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-white/[0.06] pt-2.5 text-xs">
              <span className="text-muted-foreground">Your wallet after</span>
              <span className={cn("font-semibold tabular-nums", after < 0 && "text-destructive")}>{formatMoney(Math.max(0, after))}</span>
            </div>
            {Number(f.initialUsd) < minUsd ? <p className="mt-1.5 text-xs text-destructive">Minimum is ${minUsd}.</p> : null}
            {after < 0 ? <p className="mt-1.5 text-xs text-destructive">Not enough in your wallet.</p> : null}
          </div>

          <Button size="lg" className="w-full" disabled={!valid || busy} onClick={submit}>
            {busy ? <Loader2 className="animate-spin" /> : <UserPlus />} Create reseller
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}
