import "dotenv/config";
import { Currency, KeyStatus, PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "password123";

/** 1 USD = 100_000_000 microcents. */
const MICROCENTS_PER_USD = 100_000_000;

function usdToMicrocents(usd: number): number {
  return Math.round(usd * MICROCENTS_PER_USD);
}

/** USD-only catalog prices stored as microcents. */
function pricesFor(usd: number): { currency: Currency; price: number }[] {
  return [{ currency: Currency.USD, price: usdToMicrocents(usd) }];
}

type DurationSeed = { label: string; days: number | null; usd: number };

async function createProductWithDurations(input: {
  title: string;
  description: string;
  rating: number;
  features: string[];
  isBestSeller: boolean;
  isNew: boolean;
  categoryId: string;
  durations: DurationSeed[];
}) {
  const product = await prisma.product.create({
    data: {
      title: input.title,
      apiCode: input.title.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      description: input.description,
      rating: input.rating,
      features: input.features,
      isBestSeller: input.isBestSeller,
      isNew: input.isNew,
      categoryId: input.categoryId,
      durations: {
        create: input.durations.map((d) => ({
          label: d.label,
          days: d.days,
          apiCode: `${input.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${d.label.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
        })),
      },
    },
    include: { durations: true },
  });

  for (const duration of product.durations) {
    const seed = input.durations.find((d) => d.label === duration.label);
    if (!seed) continue;
    await prisma.durationPrice.createMany({
      data: pricesFor(seed.usd).map((row) => ({
        durationId: duration.id,
        currency: row.currency,
        price: row.price,
      })),
    });
  }

  return product;
}

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.key.deleteMany();
  await prisma.order.deleteMany();
  await prisma.userSpecialPriceHistory.deleteMany();
  await prisma.userSpecialPrice.deleteMany();
  await prisma.durationPrice.deleteMany();
  await prisma.duration.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.deposit.deleteMany();
  await prisma.productReview.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.promoRedemption.deleteMany();
  await prisma.user.deleteMany();

  const apkmod = await prisma.category.create({
    data: { name: "APKMOD", slug: "apkmod", sortOrder: 1 },
  });
  const root = await prisma.category.create({
    data: { name: "ROOT", slug: "root", sortOrder: 2 },
  });
  const ios = await prisma.category.create({
    data: { name: "iOS", slug: "ios", sortOrder: 3 },
  });

  const unlockPro = await createProductWithDurations({
    title: "APK Unlock Pro",
    description:
      "Premium APK unlock suite with instant delivery and safe install guides.",
    rating: 4.9,
    features: ["Safe", "Instant", "Updated"],
    isBestSeller: true,
    isNew: false,
    categoryId: apkmod.id,
    durations: [
      { label: "1 Day", days: 1, usd: 1.22 },
      { label: "7 Days", days: 7, usd: 5.0 },
      { label: "30 Days", days: 30, usd: 14.0 },
      { label: "Lifetime", days: null, usd: 34.0 },
    ],
  });

  const nightVision = await createProductWithDurations({
    title: "Night Vision Mod Pack",
    description:
      "Enhanced visibility mod with clean overlays and low detection risk.",
    rating: 4.8,
    features: ["Safe", "Instant", "Undetected"],
    isBestSeller: false,
    isNew: true,
    categoryId: apkmod.id,
    durations: [
      { label: "1 Day", days: 1, usd: 1.0 },
      { label: "7 Days", days: 7, usd: 5.0 },
      { label: "30 Days", days: 30, usd: 15.0 },
      { label: "Lifetime", days: null, usd: 39.0 },
    ],
  });

  const rootToolkit = await createProductWithDurations({
    title: "Root Toolkit Elite",
    description:
      "One-tap root utilities, HWID helpers, and recovery-safe workflows.",
    rating: 4.7,
    features: ["Instant", "Root Ready"],
    isBestSeller: true,
    isNew: false,
    categoryId: root.id,
    durations: [
      { label: "7 Days", days: 7, usd: 3.5 },
      { label: "30 Days", days: 30, usd: 9.99 },
      { label: "Lifetime", days: null, usd: 24.99 },
    ],
  });

  const hwidCleaner = await createProductWithDurations({
    title: "Phantom HWID Cleaner",
    description: "Temporary and permanent HWID options with one-click restore.",
    rating: 4.9,
    features: ["Safe", "Fast Setup"],
    isBestSeller: false,
    isNew: false,
    categoryId: root.id,
    durations: [
      { label: "1 Day", days: 1, usd: 2.5 },
      { label: "7 Days", days: 7, usd: 8.0 },
      { label: "Lifetime", days: null, usd: 49.0 },
    ],
  });

  const iosBypass = await createProductWithDurations({
    title: "iOS Bypass Suite",
    description:
      "Premium iOS unlock tools with guided setup and lifetime updates.",
    rating: 4.85,
    features: ["Instant", "24/7 Support"],
    isBestSeller: true,
    isNew: true,
    categoryId: ios.id,
    durations: [
      { label: "7 Days", days: 7, usd: 6.0 },
      { label: "30 Days", days: 30, usd: 18.0 },
      { label: "Lifetime", days: null, usd: 55.0 },
    ],
  });

  const iosSigner = await createProductWithDurations({
    title: "iOS Sideload Signer",
    description:
      "Fast certificate signing for IPA installs with renewal alerts.",
    rating: 4.6,
    features: ["Fast", "Guided"],
    isBestSeller: false,
    isNew: true,
    categoryId: ios.id,
    durations: [
      { label: "30 Days", days: 30, usd: 7.5 },
      { label: "Lifetime", days: null, usd: 29.0 },
    ],
  });

  const allDurations = [
    ...unlockPro.durations,
    ...nightVision.durations,
    ...rootToolkit.durations,
    ...hwidCleaner.durations,
    ...iosBypass.durations,
    ...iosSigner.durations,
  ];

  for (const duration of allDurations) {
    await prisma.key.createMany({
      data: Array.from({ length: 5 }, (_, index) => ({
        code: `${duration.label.replace(/\s+/g, "").toUpperCase()}-${duration.id.slice(-6)}-${index + 1}`,
        status: KeyStatus.AVAILABLE,
        durationId: duration.id,
      })),
    });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const demoAccounts: {
    name: string;
    username: string;
    email: string;
    role: UserRole;
    currency: Currency;
  }[] = [
    {
      name: "Karan Swami",
      username: "karanswami",
      email: "karanswami1506@gmail.com",
      role: UserRole.ADMIN,
      currency: Currency.USD,
    },
    {
      name: "Demo Admin",
      username: "demoadmin",
      email: "admin@demo.com",
      role: UserRole.ADMIN,
      currency: Currency.USD,
    },
    {
      name: "Demo User",
      username: "demouser",
      email: "user@demo.com",
      role: UserRole.USER,
      currency: Currency.USD,
    },
    {
      name: "Demo User",
      username: "demo_user",
      email: "user@drip.local",
      role: UserRole.USER,
      currency: Currency.USD,
    },
    {
      name: "Demo Seller",
      username: "demo_seller",
      email: "seller@drip.local",
      role: UserRole.SELLER,
      currency: Currency.USD,
    },
    {
      name: "Demo Reseller",
      username: "demo_reseller",
      email: "reseller@drip.local",
      role: UserRole.RESELLER,
      currency: Currency.USD,
    },
    {
      name: "Demo Admin",
      username: "demo_admin",
      email: "admin@drip.local",
      role: UserRole.ADMIN,
      currency: Currency.USD,
    },
  ];

  for (const account of demoAccounts) {
    const pwd = account.email === "karanswami1506@gmail.com" ? await bcrypt.hash("Swami123", 10) : passwordHash;
    await prisma.user.create({
      data: { ...account, passwordHash: pwd, emailVerified: true, walletBalance: account.role === UserRole.ADMIN ? 100000000000 : 50000000000 },
    });
  }

  console.log("Seed complete (USD microcents):");
  console.log(`- Categories: ${await prisma.category.count()}`);
  console.log(`- Products: ${await prisma.product.count()}`);
  console.log(`- Durations: ${await prisma.duration.count()}`);
  console.log(`- DurationPrices: ${await prisma.durationPrice.count()}`);
  console.log(`- Keys: ${await prisma.key.count()}`);
  console.log(`- Users: ${await prisma.user.count()}`);
  console.log(
    `  Demo logins (password: ${DEMO_PASSWORD}): user@drip.local, reseller@drip.local, admin@drip.local`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
