import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { usdToMicrocents } from "@/lib/currencies";
import {
  DEFAULT_LOSE_LABEL,
  SPIN_MAX_SLOTS,
  SPIN_MIN_SLOTS,
  getSpinWinPct,
  isSpinEnabled,
  listDurationOptions,
  listPrizesAdmin,
  setSpinEnabled,
  setSpinWinPct,
} from "@/lib/spin";
import { z } from "zod";

export const dynamic = "force-dynamic";

async function guard() {
  try {
    await requireAdmin();
    return null;
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  const [enabled, winPct, prizes, durations, granted, used] = await Promise.all([
    isSpinEnabled(),
    getSpinWinPct(),
    listPrizesAdmin(),
    listDurationOptions(),
    prisma.referralSpin.count(),
    prisma.referralSpin.count({ where: { status: "USED" } }),
  ]);
  return jsonOk({ enabled, winPct, prizes, durations, stats: { granted, used, pending: granted - used } });
}

const prizeSchema = z.object({
  kind: z.enum(["KEY", "WALLET", "COUPON", "SPIN", "NONE"]),
  label: z.string().trim().max(60).default(""),
  durationId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
  /** Keys (KEY) or extra spins (SPIN). */
  quantity: z.number().int().min(1).max(100).default(1),
  /** USD decimals from the form; stored as microcents. */
  walletUsd: z.number().min(0).max(100000).default(0),
  couponPercent: z.number().min(0).max(100).default(0),
  couponUsd: z.number().min(0).max(100000).default(0),
  couponDays: z.number().int().min(1).max(365).default(7),
  weight: z.number().int().min(0).max(100000),
  active: z.boolean(),
});

const schema = z.object({
  enabled: z.boolean(),
  winPct: z.number().int().min(0).max(100),
  /** Wheel order = array order; slot numbers are reassigned 0..n-1. */
  prizes: z.array(prizeSchema).min(SPIN_MIN_SLOTS).max(SPIN_MAX_SLOTS),
});

export async function PUT(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path[0] === "prizes" && typeof issue.path[1] === "number" ? `Slot ${issue.path[1] + 1}: ` : "";
    const field = issue?.path[2] ? `${String(issue.path[2])} — ` : "";
    return jsonError("VALIDATION", `${where}${field}${issue?.message ?? "Invalid prize configuration."}`, 400);
  }
  const prizes = parsed.data.prizes;

  for (const [i, p] of prizes.entries()) {
    if (p.kind === "KEY" && !p.durationId) return jsonError("VALIDATION", `Slot ${i + 1}: pick a product duration.`, 400);
    if (p.kind === "WALLET" && !(p.walletUsd > 0)) return jsonError("VALIDATION", `Slot ${i + 1}: enter a wallet amount.`, 400);
    if (p.kind === "COUPON" && !(p.couponPercent > 0 || p.couponUsd > 0))
      return jsonError("VALIDATION", `Slot ${i + 1}: enter a coupon discount.`, 400);
  }

  const dIds = prizes.filter((p) => p.kind === "KEY").map((p) => p.durationId).filter((x): x is string => !!x);
  const durationRows = dIds.length
    ? await prisma.duration.findMany({ where: { id: { in: dIds } }, include: { product: { select: { title: true } } } })
    : [];
  if (durationRows.length !== new Set(dIds).size) return jsonError("VALIDATION", "A selected duration no longer exists.", 400);
  const durName = new Map(durationRows.map((d) => [d.id, `${d.product.title} ${d.label}`]));

  for (const [slot, p] of prizes.entries()) {
    const autoLabel =
      p.kind === "KEY"
        ? (durName.get(p.durationId ?? "") ?? "Key")
        : p.kind === "WALLET"
          ? `$${p.walletUsd.toFixed(2)} Wallet`
          : p.kind === "COUPON"
            ? p.couponPercent > 0
              ? `${p.couponPercent}% Coupon`
              : `$${p.couponUsd.toFixed(2)} Coupon`
            : p.kind === "SPIN"
              ? `+${p.quantity} Spin${p.quantity > 1 ? "s" : ""}`
              : DEFAULT_LOSE_LABEL;
    const data = {
      kind: p.kind,
      label: p.label || autoLabel,
      durationId: p.kind === "KEY" ? (p.durationId ?? null) : null,
      quantity: p.kind === "KEY" || p.kind === "SPIN" ? p.quantity : 1,
      walletAmount: p.kind === "WALLET" ? usdToMicrocents(p.walletUsd) : 0,
      couponPercent: p.kind === "COUPON" ? p.couponPercent : 0,
      couponAmount: p.kind === "COUPON" && !(p.couponPercent > 0) ? usdToMicrocents(p.couponUsd) : 0,
      couponDays: p.couponDays,
      weight: p.weight,
      active: p.active,
    };
    await prisma.spinPrize.upsert({ where: { slot }, create: { slot, ...data }, update: data });
  }
  await prisma.spinPrize.deleteMany({ where: { slot: { gte: prizes.length } } });
  await setSpinEnabled(parsed.data.enabled);
  await setSpinWinPct(parsed.data.winPct);
  return jsonOk({ ok: true });
}
