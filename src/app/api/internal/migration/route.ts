import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adjustWallet } from "@/lib/wallet";
import { TransactionType } from "@prisma/client";

const MIGRATION_SECRET = process.env.MIGRATION_SHARED_SECRET || "drip_migration_sec_key_994817293847";
const TG_BOT_TOKEN = "8838380567:AAEB_d0duKvGe6ENnGU9MYrzFjh2Jf5c3gg";
const ADMIN_CHAT_ID = "5337150824";

async function sendTelegramAlert(message: string) {
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
    const authHeader = req.headers.get("authorization");
    const secret = authHeader?.replace("Bearer ", "").trim();

    if (!secret || secret !== MIGRATION_SECRET) {
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

      if (!identifier || isNaN(amountCents) || amountCents <= 0) {
        return NextResponse.json({ ok: false, error: "INVALID_CREDIT_PAYLOAD" }, { status: 400 });
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

      // Check role upgrade / permission grant for Guru RESELLER / ADMIN -> Drip SELLER
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
      const refCode = `MIGRATE-${guruUserId.slice(-6)}-${Date.now()}`;

      const updated = await adjustWallet({
        userId: targetUser.id,
        amount: microcentsToAdd,
        type: TransactionType.DEPOSIT,
        note: `Migrated from GuruGamingHub (@${guruUsername})`,
        reference: refCode,
      });

      const oldBalanceUsd = (targetUser.walletBalance / 100_000_000).toFixed(2);
      const transferredUsd = (amountCents / 100).toFixed(2);
      const newBalanceUsd = (updated.walletBalance / 100_000_000).toFixed(2);
      const finalRole = roleUpgraded ? "SELLER" : targetUser.role;

      // Send Telegram alert
      const tgMsg = [
        `🚀 <b>GuruGamingHub Migration Transfer!</b>`,
        `━━━━━━━━━━━━━━━━━━`,
        `👤 <b>Guru User:</b> @${guruUsername} (<code>${guruEmail}</code> | Role: <b>${guruRole || "USER"}</b>)`,
        `🎯 <b>Target Drip User:</b> @${targetUser.username} (<code>${targetUser.email}</code>)`,
        roleUpgraded ? `⭐ <b>Role Upgraded:</b> ${oldRole} ➔ <b>SELLER</b> (Guru Reseller Perk)` : `🛡️ <b>Drip Role:</b> ${finalRole}`,
        `💰 <b>Amount Migrated:</b> <b>$${transferredUsd} USD</b>`,
        `💳 <b>Previous Balance:</b> $${oldBalanceUsd} USD`,
        `✨ <b>New Drip Balance:</b> <b>$${newBalanceUsd} USD</b>`,
        `🔖 <b>Ref:</b> <code>${refCode}</code>`,
        `🕒 <b>Time:</b> ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC`,
      ].join("\n");

      void sendTelegramAlert(tgMsg);

      return NextResponse.json({
        ok: true,
        transferredUsd,
        newBalanceUsd,
        targetUsername: targetUser.username,
        roleUpgraded,
        newRole: finalRole,
        reference: refCode,
      });
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
            `👤 <b>Guru User:</b> @${guruUsername} (<code>${guruEmail}</code>)`,
            `🎯 <b>Target Drip User:</b> @${targetUser.username} (<code>${targetUser.email}</code>)`,
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
    return NextResponse.json({ ok: false, error: error.message || "INTERNAL_ERROR" }, { status: 500 });
  }
}
