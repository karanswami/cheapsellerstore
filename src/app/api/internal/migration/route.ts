import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adjustWallet } from "@/lib/wallet";
import { TransactionType } from "@prisma/client";
import { createHash, timingSafeEqual } from "node:crypto";
import { claimIdempotency, completeIdempotency, releaseIdempotency } from "@/lib/idempotency";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";

// Secrets come from the environment ONLY. No in-code fallback: if MIGRATION_SHARED_SECRET is not set
// (or is too short) this endpoint is switched off.
const MIGRATION_SECRET = (process.env.MIGRATION_SHARED_SECRET ?? "").trim();
const TG_BOT_TOKEN = (process.env.MIGRATION_TELEGRAM_BOT_TOKEN ?? "").trim();
const ADMIN_CHAT_ID = (process.env.MIGRATION_TELEGRAM_CHAT_ID ?? "").trim();
const MAX_CREDIT_CENTS = 5_000_00; // $5,000 per call hard ceiling

function secretMatches(provided: string) {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(MIGRATION_SECRET).digest();
  return timingSafeEqual(a, b);
}

const esc = (v: unknown) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function sendTelegramAlert(message: string) {
  if (!TG_BOT_TOKEN || !ADMIN_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.error("Failed to send Telegram migration alert:", err);
  }
}

export async function POST(req: Request) {
  try {
    if (MIGRATION_SECRET.length < 32) {
      return NextResponse.json({ ok: false, error: "DISABLED" }, { status: 503 });
    }

    const rl = await rateLimit({
      key: `migration:${clientIpFromHeaders(req.headers)}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!rl.allowed) {
      return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });
    }

    const authHeader = req.headers.get("authorization");
    const secret = authHeader?.replace(/^Bearer\s+/i, "").trim();

    if (!secret || !secretMatches(secret)) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "verify-user") {
      const identifier = String(body.identifier || "").trim().toLowerCase();
      if (!identifier) {
        return NextResponse.json({ ok: false, error: "IDENTIFIER_REQUIRED" }, { status: 400 });
      }

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: identifier, mode: "insensitive" } },
            { username: { equals: identifier, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
          walletBalance: true,
          banned: true,
          canCreateResellers: true,
          canManageResellers: true,
          canFundResellers: true,
        },
      });

      if (!user) {
        return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
      }

      if (user.banned) {
        return NextResponse.json({ ok: false, error: "USER_BANNED" }, { status: 403 });
      }

      const guruRole = String(body.guruRole || "").trim().toUpperCase();
      const willUpgradeRole = (user.role === "USER" || user.role === "RESELLER") && (guruRole === "RESELLER" || guruRole === "ADMIN");

      return NextResponse.json({
        ok: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role,
          willUpgradeToSeller: willUpgradeRole,
          canCreateResellers: willUpgradeRole || user.canCreateResellers,
          canManageResellers: willUpgradeRole || user.canManageResellers,
          canFundResellers: willUpgradeRole || user.canFundResellers,
          walletBalanceUsd: (user.walletBalance / 100_000_000).toFixed(2),
        },
      });
    }

    if (action === "credit-balance") {
      const identifier = String(body.targetIdentifier || "").trim().toLowerCase();
      const amountCents = Number(body.amountCents);
      const guruUserId = String(body.guruUserId || "");
      const guruUsername = String(body.guruUsername || "unknown");
      const guruEmail = String(body.guruEmail || "unknown");
      const guruRole = String(body.guruRole || "").trim().toUpperCase();

      if (
        !identifier ||
        !Number.isInteger(amountCents) ||
        amountCents <= 0 ||
        amountCents > MAX_CREDIT_CENTS
      ) {
        return NextResponse.json({ ok: false, error: "INVALID_CREDIT_PAYLOAD" }, { status: 400 });
      }

      // A migration credit must carry a unique idempotencyKey; replays never credit twice.
      const idemKey = String(body.idempotencyKey || "").trim();
      if (!/^[A-Za-z0-9._:\-]{8,200}$/.test(idemKey)) {
        return NextResponse.json({ ok: false, error: "IDEMPOTENCY_KEY_REQUIRED" }, { status: 400 });
      }
      const claim = await claimIdempotency("migration-credit", idemKey, 3650 * 86_400_000);
      if (!claim.ok) {
        if (claim.inFlight || !claim.body) {
          return NextResponse.json({ ok: false, error: "REQUEST_IN_PROGRESS" }, { status: 409 });
        }
        return NextResponse.json(claim.body, { status: claim.statusCode ?? 200 });
      }

      const targetUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: identifier, mode: "insensitive" } },
            { username: { equals: identifier, mode: "insensitive" } },
          ],
        },
      });

      if (!targetUser) {
        await releaseIdempotency("migration-credit", idemKey);
        return NextResponse.json({ ok: false, error: "TARGET_USER_NOT_FOUND" }, { status: 404 });
      }

      if (targetUser.banned) {
        await releaseIdempotency("migration-credit", idemKey);
        return NextResponse.json({ ok: false, error: "TARGET_USER_BANNED" }, { status: 403 });
      }

      // Check role upgrade / permission grant for Guru RESELLER / ADMIN -> Cheap Seller SELLER
      let roleUpgraded = false;
      const oldRole = targetUser.role;
      if ((guruRole === "RESELLER" || guruRole === "ADMIN") && targetUser.role !== "ADMIN") {
        await prisma.user.update({
          where: { id: targetUser.id },
          data: {
            role: "SELLER",
            depositsEnabled: true,
            canCreateResellers: true,
            canManageResellers: true,
            canFundResellers: true,
          },
        });
        if (oldRole !== "SELLER") {
          roleUpgraded = true;
          await prisma.notification.create({
            data: {
              userId: targetUser.id,
              type: "MIGRATION_ROLE_UPGRADE",
              title: "Seller Status Activated 🎉",
              message: `Your account role has been upgraded to SELLER (Wholesale Tier) with full Reseller management permissions as part of your migration from GuruGamingHub (@${guruUsername}).`,
              actionUrl: "/app/seller",
            },
          });
        }
      }

      // Convert cents to microcents: 1 cent = 1,000,000 microcents
      const microcentsToAdd = Math.round(amountCents * 1_000_000);
      const refCode = `MIGRATE-${idemKey}`.slice(0, 120);

      let updated;
      try {
        updated = await adjustWallet({
          userId: targetUser.id,
          amount: microcentsToAdd,
          type: TransactionType.DEPOSIT,
          note: `Migrated from GuruGamingHub (@${guruUsername})`,
          reference: refCode,
        });
      } catch (e) {
        await releaseIdempotency("migration-credit", idemKey);
        throw e;
      }

      const oldBalanceUsd = (targetUser.walletBalance / 100_000_000).toFixed(2);
      const transferredUsd = (amountCents / 100).toFixed(2);
      const newBalanceUsd = (updated.walletBalance / 100_000_000).toFixed(2);
      const finalRole = roleUpgraded ? "SELLER" : targetUser.role;

      // Send Telegram alert
      const tgMsg = [
        `🚀 <b>GuruGamingHub Migration Transfer!</b>`,
        `━━━━━━━━━━━━━━━━━━`,
        `👤 <b>Guru User:</b> @${esc(guruUsername)} (<code>${esc(guruEmail)}</code> | Role: <b>${esc(guruRole || "USER")}</b>)`,
        `🎯 <b>Target Cheap Seller User:</b> @${targetUser.username} (<code>${targetUser.email}</code>)`,
        roleUpgraded ? `⭐ <b>Role Upgraded:</b> ${oldRole} ➔ <b>SELLER</b> (Guru Reseller Perk)` : `🛡️ <b>Cheap Seller Role:</b> ${finalRole}`,
        `💰 <b>Amount Migrated:</b> <b>$${transferredUsd} USD</b>`,
        `💳 <b>Previous Balance:</b> $${oldBalanceUsd} USD`,
        `✨ <b>New Cheap Seller Balance:</b> <b>$${newBalanceUsd} USD</b>`,
        `🔖 <b>Ref:</b> <code>${refCode}</code>`,
        `🕒 <b>Time:</b> ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC`,
      ].join("\n");

      void sendTelegramAlert(tgMsg);

      const result = {
        ok: true,
        transferredUsd,
        newBalanceUsd,
        targetUsername: targetUser.username,
        roleUpgraded,
        newRole: finalRole,
        reference: refCode,
      };
      await completeIdempotency("migration-credit", idemKey, 200, result, 3650 * 86_400_000);
      return NextResponse.json(result);
    }

    if (action === "sync-role") {
      const identifier = String(body.targetIdentifier || "").trim().toLowerCase();
      const guruUsername = String(body.guruUsername || "unknown");
      const guruEmail = String(body.guruEmail || "unknown");
      const guruRole = String(body.guruRole || "").trim().toUpperCase();

      if (!identifier) {
        return NextResponse.json({ ok: false, error: "IDENTIFIER_REQUIRED" }, { status: 400 });
      }

      if (guruRole !== "RESELLER" && guruRole !== "ADMIN") {
        return NextResponse.json({ ok: false, error: "Guru user does not have Reseller role." }, { status: 400 });
      }

      const targetUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: identifier, mode: "insensitive" } },
            { username: { equals: identifier, mode: "insensitive" } },
          ],
        },
      });

      if (!targetUser) {
        return NextResponse.json({ ok: false, error: "TARGET_USER_NOT_FOUND" }, { status: 404 });
      }

      if (targetUser.banned) {
        return NextResponse.json({ ok: false, error: "TARGET_USER_BANNED" }, { status: 403 });
      }

      let roleUpgraded = false;
      const oldRole = targetUser.role;

      if (targetUser.role !== "ADMIN") {
        await prisma.user.update({
          where: { id: targetUser.id },
          data: {
            role: "SELLER",
            depositsEnabled: true,
            canCreateResellers: true,
            canManageResellers: true,
            canFundResellers: true,
          },
        });

        if (oldRole !== "SELLER") {
          roleUpgraded = true;
          await prisma.notification.create({
            data: {
              userId: targetUser.id,
              type: "MIGRATION_ROLE_UPGRADE",
              title: "Seller Status Activated 🎉",
              message: `Your account role has been upgraded to SELLER (Wholesale Tier) with full Reseller management permissions migrated from GuruGamingHub (@${guruUsername}).`,
              actionUrl: "/app/seller",
            },
          });

          const tgMsg = [
            `⭐ <b>GuruGamingHub Reseller Role Sync!</b>`,
            `━━━━━━━━━━━━━━━━━━`,
            `👤 <b>Guru User:</b> @${esc(guruUsername)} (<code>${esc(guruEmail)}</code>)`,
            `🎯 <b>Target Cheap Seller User:</b> @${targetUser.username} (<code>${targetUser.email}</code>)`,
            `⭐ <b>Role Upgraded:</b> ${oldRole} ➔ <b>SELLER</b>`,
            `🔑 <b>Permissions Granted:</b> Create, Manage & Fund Resellers`,
            `🕒 <b>Time:</b> ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC`,
          ].join("\n");

          void sendTelegramAlert(tgMsg);
        }
      }

      return NextResponse.json({
        ok: true,
        roleUpgraded,
        oldRole,
        newRole: roleUpgraded ? "SELLER" : targetUser.role,
        targetUsername: targetUser.username,
      });
    }

    return NextResponse.json({ ok: false, error: "UNKNOWN_ACTION" }, { status: 400 });
  } catch (error: any) {
    console.error("Migration API Error:", error);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
