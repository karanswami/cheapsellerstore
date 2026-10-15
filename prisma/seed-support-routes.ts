/**
 * Idempotent upsert of default support keyword routes.
 * Run: npx tsx prisma/seed-support-routes.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_ROUTES = [
  {
    slug: "catalog",
    name: "Public catalog & help",
    replyText:
      "Welcome to Cheap Seller! Looking for premium digital products, working keys, or instant mod downloads? Choose an option below to get started!",
    isSerious: false,
    requireRoles: [] as string[],
    isFallback: false,
    active: true,
    sortOrder: 10,
    keywords: [
      { phrase: "hi", weight: 1 },
      { phrase: "hello", weight: 1 },
      { phrase: "hey", weight: 1 },
      { phrase: "yo", weight: 1 },
      { phrase: "hola", weight: 1 },
      { phrase: "oi", weight: 1 },
      { phrase: "buy", weight: 3 },
      { phrase: "shop", weight: 3 },
      { phrase: "catalog", weight: 3 },
      { phrase: "price", weight: 3 },
      { phrase: "pricing", weight: 3 },
      { phrase: "cheap", weight: 3 },
      { phrase: "store", weight: 3 },
      { phrase: "cost", weight: 3 },
      { phrase: "buying", weight: 3 },
      { phrase: "mod", weight: 2 },
      { phrase: "apkmod", weight: 2 },
      { phrase: "ios", weight: 2 },
      { phrase: "proxy", weight: 2 },
      { phrase: "panel", weight: 2 },
      { phrase: "hack", weight: 2 },
      { phrase: "free fire", weight: 2 },
    ],
    buttons: [
      { id: "browse", label: "Browse Catalog", href: "/app" },
      { id: "top", label: "View Top Mods", href: "/app" },
      { id: "ask", label: "Ask a Question", action: "focus_input" },
    ],
  },
  {
    slug: "tech",
    name: "Technical troubleshooting",
    replyText:
      "Need technical help? Check our step-by-step video tutorials. Most injector or file errors can be fixed by installing the latest mirror files below.",
    isSerious: false,
    requireRoles: [] as string[],
    isFallback: false,
    active: true,
    sortOrder: 20,
    keywords: [
      { phrase: "error", weight: 3 },
      { phrase: "crash", weight: 3 },
      { phrase: "not working", weight: 3 },
      { phrase: "broken", weight: 3 },
      { phrase: "black screen", weight: 3 },
      { phrase: "injector", weight: 3 },
      { phrase: "fail", weight: 3 },
      { phrase: "download", weight: 2 },
      { phrase: "link", weight: 2 },
      { phrase: "setup", weight: 2 },
      { phrase: "install", weight: 2 },
      { phrase: "apk", weight: 2 },
      { phrase: "zip", weight: 2 },
      { phrase: "file", weight: 2 },
      { phrase: "download link", weight: 2 },
      { phrase: "erro", weight: 2 },
      { phrase: "baixar", weight: 2 },
      { phrase: "instalar", weight: 2 },
      { phrase: "clave", weight: 2 },
      { phrase: "painel", weight: 2 },
      { phrase: "chave", weight: 2 },
    ],
    buttons: [
      { id: "videos", label: "View Video Demos", href: "/app" },
      { id: "key_issue", label: "Key Issue", action: "menu_key" },
      { id: "talk_owner", label: "Talk to Owner", action: "talk_to_owner" },
    ],
  },
  {
    slug: "wallet_crisis",
    name: "Wallet & account crisis",
    replyText:
      "This sounds like a serious account or payment issue. I’m opening a critical handoff so an admin can review it in this chat.",
    isSerious: true,
    requireRoles: [] as string[],
    isFallback: false,
    active: true,
    sortOrder: 30,
    // Only true-crisis phrases — casual wallet/balance Q&A is handled by the bot.
    keywords: [
      { phrase: "scam", weight: 4 },
      { phrase: "stolen", weight: 4 },
      { phrase: "fraud", weight: 4 },
      { phrase: "hacked", weight: 4 },
      { phrase: "banned", weight: 4 },
      { phrase: "locked out", weight: 4 },
      { phrase: "chargeback", weight: 4 },
      { phrase: "fake", weight: 3 },
      { phrase: "roubo", weight: 4 },
      { phrase: "estafa", weight: 4 },
      { phrase: "golpe", weight: 4 },
      { phrase: "fraude", weight: 4 },
    ],
    buttons: [
      { id: "wallet", label: "View Wallet Dashboard", href: "/app/deposit" },
      { id: "talk_owner", label: "Talk to Owner", action: "talk_to_owner" },
    ],
  },
  {
    slug: "seller",
    name: "Seller portal",
    replyText:
      "Seller Dashboard Access. Managing reseller rows, adjusting wallets, or tracking redemption counts must be done via your secured dashboard.",
    isSerious: false,
    requireRoles: ["SELLER", "RESELLER", "ADMIN"],
    isFallback: false,
    active: true,
    sortOrder: 40,
    keywords: [
      { phrase: "seller", weight: 4 },
      { phrase: "reseller", weight: 4 },
      { phrase: "sub-seller", weight: 3 },
      { phrase: "api", weight: 4 },
      { phrase: "dev", weight: 4 },
      { phrase: "panel admin", weight: 4 },
      { phrase: "bulk", weight: 4 },
      { phrase: "wholesale", weight: 4 },
    ],
    buttons: [
      { id: "portal", label: "Open Seller Portal", href: "/app/seller" },
      { id: "api", label: "Request API Key", href: "/app/seller" },
      { id: "talk_owner", label: "Talk to Owner", action: "talk_to_owner" },
    ],
  },
  {
    slug: "fallback",
    name: "Chitchat fallback",
    replyText:
      "I didn't quite catch that. Try using direct words like 'key', 'buy', 'download', or 'wallet'. / No entendí. Tente usar palavras como 'chave', 'comprar' ou 'carteira'.",
    isSerious: false,
    requireRoles: [] as string[],
    isFallback: true,
    active: true,
    sortOrder: 999,
    keywords: [] as { phrase: string; weight: number }[],
    buttons: [] as { id: string; label: string; href?: string; action?: string }[],
  },
];

async function main() {
  for (const route of DEFAULT_ROUTES) {
    await prisma.supportRoute.upsert({
      where: { slug: route.slug },
      create: route,
      update: {
        name: route.name,
        replyText: route.replyText,
        isSerious: route.isSerious,
        requireRoles: route.requireRoles,
        isFallback: route.isFallback,
        active: route.active,
        sortOrder: route.sortOrder,
        keywords: route.keywords,
        buttons: route.buttons,
      },
    });
    console.log(`Upserted support route: ${route.slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
