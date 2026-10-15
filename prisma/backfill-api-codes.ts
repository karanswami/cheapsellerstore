/**
 * Backfill Product.apiCode + Duration.apiCode for Platform API.
 * Run: npx tsx prisma/backfill-api-codes.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "ITEM";
}

async function uniqueCode(
  candidate: string,
  taken: Set<string>,
): Promise<string> {
  let code = candidate;
  let n = 0;
  while (taken.has(code)) {
    n += 1;
    code = `${candidate}-${n}`;
  }
  taken.add(code);
  return code;
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, title: true, apiCode: true },
  });
  const durations = await prisma.duration.findMany({
    select: {
      id: true,
      label: true,
      days: true,
      apiCode: true,
      productId: true,
      product: { select: { title: true, apiCode: true } },
    },
  });

  const taken = new Set<string>();
  for (const p of products) {
    if (p.apiCode) taken.add(p.apiCode);
  }
  for (const d of durations) {
    if (d.apiCode) taken.add(d.apiCode);
  }

  let pUpdated = 0;
  for (const p of products) {
    if (p.apiCode) continue;
    const code = await uniqueCode(slugify(p.title), taken);
    await prisma.product.update({
      where: { id: p.id },
      data: { apiCode: code },
    });
    pUpdated += 1;
    console.log(`product ${p.id} → ${code}`);
  }

  const productCodes = new Map(
    (
      await prisma.product.findMany({
        select: { id: true, apiCode: true },
      })
    ).map((p) => [p.id, p.apiCode ?? slugify(p.id)]),
  );

  let dUpdated = 0;
  for (const d of durations) {
    if (d.apiCode) continue;
    const productCode = productCodes.get(d.productId) ?? "PRODUCT";
    const labelPart = d.days
      ? `${d.days}D`
      : slugify(d.label).slice(0, 16) || "DUR";
    const code = await uniqueCode(`${productCode}-${labelPart}`, taken);
    await prisma.duration.update({
      where: { id: d.id },
      data: { apiCode: code },
    });
    dUpdated += 1;
    console.log(`duration ${d.id} → ${code}`);
  }

  console.log(`Done. products=${pUpdated} durations=${dUpdated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
