/**
 * One-shot Mongo migrate via Prisma $runCommandRaw:
 * - User.role: RESELLER → SELLER, then SUB_SELLER → RESELLER
 * - Cap fields: *SubSellers → *Resellers
 * - Promo / FlashSale targetRole: RESELLER → SELLER
 * - SupportRoute.requireRoles: remap role tokens
 *
 * Usage: npx tsx prisma/migrate-roles-seller-reseller.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type UpdateResult = { n?: number; nModified?: number; modifiedCount?: number };

function modified(result: unknown): number {
  const r = result as UpdateResult;
  return r.modifiedCount ?? r.nModified ?? r.n ?? 0;
}

async function updateMany(
  collection: string,
  q: Record<string, unknown>,
  u: Record<string, unknown>,
) {
  const result = await prisma.$runCommandRaw({
    update: collection,
    updates: [{ q, u, multi: true }],
  } as never);
  return modified(result);
}

async function main() {
  const resellerToSeller = await updateMany(
    "User",
    { role: "RESELLER" },
    { $set: { role: "SELLER" } },
  );
  const subToReseller = await updateMany(
    "User",
    { role: "SUB_SELLER" },
    { $set: { role: "RESELLER" } },
  );

  // Rename caps: set new from old, then unset old (two passes)
  const capCreateSet = await updateMany(
    "User",
    { canCreateSubSellers: { $exists: true } },
    [
      {
        $set: {
          canCreateResellers: "$canCreateSubSellers",
        },
      },
    ] as unknown as Record<string, unknown>,
  );

  // Aggregation pipeline updates may not work on all Mongo tiers — fall back to find/update
  void capCreateSet;

  const users = await prisma.$runCommandRaw({
    find: "User",
    filter: {
      $or: [
        { canCreateSubSellers: { $exists: true } },
        { canManageSubSellers: { $exists: true } },
        { canFundSubSellers: { $exists: true } },
      ],
    },
  });

  const batch = users as { cursor?: { firstBatch?: Array<Record<string, unknown>> } };
  const docs = batch.cursor?.firstBatch ?? [];
  let capsRenamed = 0;
  for (const doc of docs) {
    const id = doc._id;
    await prisma.$runCommandRaw({
      update: "User",
      updates: [
        {
          q: { _id: id },
          u: {
            $set: {
              canCreateResellers: Boolean(doc.canCreateSubSellers),
              canManageResellers: Boolean(doc.canManageSubSellers),
              canFundResellers: Boolean(doc.canFundSubSellers),
            },
            $unset: {
              canCreateSubSellers: "",
              canManageSubSellers: "",
              canFundSubSellers: "",
            },
          },
          multi: false,
        },
      ],
    } as never);
    capsRenamed += 1;
  }

  const promoAudience = await updateMany(
    "Promo",
    { targetRole: "RESELLER" },
    { $set: { targetRole: "SELLER" } },
  );
  const flashAudience = await updateMany(
    "FlashSale",
    { targetRole: "RESELLER" },
    { $set: { targetRole: "SELLER" } },
  );

  const routesRaw = await prisma.$runCommandRaw({
    find: "SupportRoute",
    filter: {},
  });
  const routesBatch = routesRaw as {
    cursor?: { firstBatch?: Array<Record<string, unknown>> };
  };
  const routes = routesBatch.cursor?.firstBatch ?? [];
  let routesUpdated = 0;
  for (const route of routes) {
    const roles = route.requireRoles;
    if (!Array.isArray(roles)) continue;
    let changed = false;
    const next = roles.map((r) => {
      if (r === "RESELLER") {
        changed = true;
        return "SELLER";
      }
      if (r === "SUB_SELLER") {
        changed = true;
        return "RESELLER";
      }
      return r;
    });
    if (!changed) continue;
    const unique = [...new Set(next)];
    await prisma.$runCommandRaw({
      update: "SupportRoute",
      updates: [
        {
          q: { _id: route._id },
          u: { $set: { requireRoles: unique } },
          multi: false,
        },
      ],
    } as never);
    routesUpdated += 1;
  }

  console.log(
    JSON.stringify(
      {
        users: {
          resellerToSeller,
          subSellerToReseller: subToReseller,
          capsRenamed,
        },
        promos: { targetRoleToSeller: promoAudience },
        flashSales: { targetRoleToSeller: flashAudience },
        supportRoutes: { updated: routesUpdated },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
