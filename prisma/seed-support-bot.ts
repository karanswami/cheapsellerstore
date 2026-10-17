/**
 * Idempotent upsert of default support bot steps (Telegram-style button tree).
 * Buttons use `row` for keyboard layout (same row = side-by-side).
 * Run: npm run db:seed-support-bot
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedButton = {
  id: string;
  label: string;
  type: "step" | "link" | "back" | "input";
  /** Telegram keyboard row (1-based). Same row = side-by-side. */
  row: number;
  targetSlug?: string;
  href?: string;
};

type SeedStep = {
  slug: string;
  title: string;
  messageText: string;
  isEntry?: boolean;
  isFallback?: boolean;
  sortOrder: number;
  buttons: SeedButton[];
};

const STEPS: SeedStep[] = [
  {
    slug: "welcome",
    title: "Welcome",
    messageText:
      "Hey! Welcome to Cheap Seller Support 👋\n\nTap a topic below — I'll guide you step by step. Prefer reading? Open FAQs anytime.",
    isEntry: true,
    sortOrder: 10,
    buttons: [
      { id: "deposit", label: "💰 Deposits", type: "step", row: 1, targetSlug: "deposit_menu" },
      { id: "buy", label: "🛒 Buy & checkout", type: "step", row: 1, targetSlug: "buy_menu" },
      { id: "keys", label: "🔑 Keys", type: "step", row: 2, targetSlug: "keys_menu" },
      { id: "account", label: "👤 Account", type: "step", row: 2, targetSlug: "account_menu" },
      { id: "referral", label: "🎁 Referral", type: "step", row: 3, targetSlug: "referral_menu" },
      { id: "policies", label: "📄 Policies", type: "step", row: 4, targetSlug: "policies_menu" },
      { id: "faq", label: "❓ FAQs", type: "link", row: 4, href: "/faq" },
      { id: "report", label: "🛠 Report an issue", type: "link", row: 5, href: "/app/reports" },
      { id: "other", label: "✍️ Type a question", type: "input", row: 6 },
    ],
  },

  // ── Deposits ──────────────────────────────────────────────
  {
    slug: "deposit_menu",
    title: "Deposits & wallet",
    messageText:
      "Your wallet is always in USD 💵\n\nTop up from Deposit, pay the exact amount, then wait for confirmation.\n\nWhat do you need?",
    sortOrder: 20,
    buttons: [
      { id: "how", label: "💳 How to deposit", type: "step", row: 1, targetSlug: "deposit_how" },
      { id: "pending", label: "⏳ Pending / slow", type: "step", row: 1, targetSlug: "deposit_pending" },
      { id: "rejected", label: "❌ Rejected", type: "step", row: 2, targetSlug: "deposit_rejected" },
      { id: "methods", label: "💱 Methods", type: "step", row: 2, targetSlug: "deposit_methods" },
      { id: "min", label: "📉 Minimum amount", type: "step", row: 3, targetSlug: "deposit_min" },
      { id: "go", label: "➡️ Open Deposit", type: "link", row: 4, href: "/app/deposit" },
      { id: "history", label: "📜 History", type: "link", row: 4, href: "/app/history" },
      { id: "back", label: "◀️ Main menu", type: "back", row: 5 },
    ],
  },
  {
    slug: "deposit_how",
    title: "How to deposit",
    messageText:
      "1. Sign in → open Deposit\n2. Enter an amount (at or above the minimum)\n3. Choose a payment rail\n4. Pay the exact amount / follow ticket instructions\n5. Manual methods → upload a clear screenshot\n\nFunds credit your USD wallet after auto-confirm or admin approval. Unpaid tickets expire.",
    sortOrder: 21,
    buttons: [
      { id: "go", label: "➡️ Open Deposit", type: "link", row: 1, href: "/app/deposit" },
      { id: "pending", label: "⏳ Still pending?", type: "step", row: 1, targetSlug: "deposit_pending" },
      { id: "back", label: "◀️ Deposits", type: "step", row: 2, targetSlug: "deposit_menu" },
    ],
  },
  {
    slug: "deposit_pending",
    title: "Deposit pending",
    messageText:
      "Pending = not credited yet.\n\n• Auto rails (QRIS / Binance / Cashfree) usually confirm in minutes after a correct payment\n• Manual proof waits for admin review — keep the ticket open, don't spam uploads\n• Always pay the exact amount on the ticket\n\nCheck your ticket or History. If it expired unpaid, start a new deposit.",
    sortOrder: 22,
    buttons: [
      { id: "history", label: "📜 History", type: "link", row: 1, href: "/app/history" },
      { id: "report", label: "🛠 Report issue", type: "link", row: 1, href: "/app/reports" },
      { id: "back", label: "◀️ Deposits", type: "step", row: 2, targetSlug: "deposit_menu" },
    ],
  },
  {
    slug: "deposit_rejected",
    title: "Deposit rejected",
    messageText:
      "Rejected = not credited to Cheap Seller.\n\nCommon causes: wrong amount, unclear screenshot, wrong account, or expired ticket.\n\nIf money left your bank/wallet but Cheap Seller rejected it, open Reports with deposit ID + clear proof. Don't chargeback before contacting us — that can suspend your account.",
    sortOrder: 23,
    buttons: [
      { id: "report", label: "🛠 Submit report", type: "link", row: 1, href: "/app/reports" },
      { id: "policy", label: "📄 Payment policy", type: "link", row: 1, href: "/pages/payment-policy" },
      { id: "back", label: "◀️ Deposits", type: "step", row: 2, targetSlug: "deposit_menu" },
    ],
  },
  {
    slug: "deposit_methods",
    title: "Payment methods",
    messageText:
      "Methods appear as chips on Deposit (auto rails and/or manual methods your admin enabled).\n\nYou may see: Cashfree (INR), QRIS, Binance Pay, eSewa, or manual bank/UPI/crypto with QR/account details.\n\nWallet balance is always USD after credit — local currency is only for the top-up step.",
    sortOrder: 24,
    buttons: [
      { id: "go", label: "➡️ Open Deposit", type: "link", row: 1, href: "/app/deposit" },
      { id: "back", label: "◀️ Deposits", type: "step", row: 2, targetSlug: "deposit_menu" },
    ],
  },
  {
    slug: "deposit_min",
    title: "Minimum deposit",
    messageText:
      "Minimums depend on your role (user vs seller/reseller) and the currency of the method you pick.\n\nThe Deposit page shows the live minimum + quick amount chips. Enter at least that amount before Continue.",
    sortOrder: 25,
    buttons: [
      { id: "go", label: "➡️ Open Deposit", type: "link", row: 1, href: "/app/deposit" },
      { id: "back", label: "◀️ Deposits", type: "step", row: 2, targetSlug: "deposit_menu" },
    ],
  },

  // ── Buying ────────────────────────────────────────────────
  {
    slug: "buy_menu",
    title: "Buying & checkout",
    messageText:
      "Shop from the Store, pick a duration, then checkout with your USD wallet 🛒\n\nWhat do you need?",
    sortOrder: 30,
    buttons: [
      { id: "how", label: "🛍 How to buy", type: "step", row: 1, targetSlug: "buy_how" },
      { id: "balance", label: "💸 Low balance", type: "step", row: 1, targetSlug: "buy_balance" },
      { id: "promo", label: "🏷 Promo / flash", type: "step", row: 2, targetSlug: "buy_promo" },
      { id: "wholesale", label: "📦 Wholesale", type: "step", row: 2, targetSlug: "buy_wholesale" },
      { id: "shop", label: "🏪 Open Shop", type: "link", row: 3, href: "/app" },
      { id: "back", label: "◀️ Main menu", type: "back", row: 4 },
    ],
  },
  {
    slug: "buy_how",
    title: "How to buy",
    messageText:
      "1. Browse Store → tap a product\n2. Choose duration → add to cart / Buy\n3. Checkout with enough USD wallet balance\n4. Confirm — keys deliver instantly on success\n5. Copy keys from success page or Keys vault\n\nStock gates purchases. If stock runs out mid-checkout, that line won't fulfill.",
    sortOrder: 31,
    buttons: [
      { id: "shop", label: "🏪 Open Shop", type: "link", row: 1, href: "/app" },
      { id: "keys", label: "🔑 My Keys", type: "link", row: 1, href: "/app/keys" },
      { id: "back", label: "◀️ Buying", type: "step", row: 2, targetSlug: "buy_menu" },
    ],
  },
  {
    slug: "buy_balance",
    title: "Not enough balance",
    messageText:
      "Checkout debits your USD wallet only. If balance is too low:\n\n1. Open Deposit and top up\n2. Wait until credited (not pending)\n3. Return to cart / checkout and pay again\n\nCart items stay until you clear them.",
    sortOrder: 32,
    buttons: [
      { id: "deposit", label: "💰 Go Deposit", type: "link", row: 1, href: "/app/deposit" },
      { id: "shop", label: "🏪 Shop", type: "link", row: 1, href: "/app" },
      { id: "back", label: "◀️ Buying", type: "step", row: 2, targetSlug: "buy_menu" },
    ],
  },
  {
    slug: "buy_promo",
    title: "Promos & flash sales",
    messageText:
      "Active flash sales show sale prices + countdowns on products. Promo codes apply at cart/checkout when valid for your account and products.\n\nAudience, date window, product scope, and per-user limits are enforced server-side. Invalid or expired codes won't discount.",
    sortOrder: 33,
    buttons: [
      { id: "shop", label: "🏪 Open Shop", type: "link", row: 1, href: "/app" },
      { id: "back", label: "◀️ Buying", type: "step", row: 2, targetSlug: "buy_menu" },
    ],
  },
  {
    slug: "buy_wholesale",
    title: "Wholesale pricing",
    messageText:
      "Sellers and Resellers see wholesale (reseller) prices on the catalog and at checkout.\n\nRegular users and admins pay retail.\n\nTo become a Seller, open Become a Seller and wait for admin approval.",
    sortOrder: 34,
    buttons: [
      { id: "become", label: "🤝 Become a Seller", type: "link", row: 1, href: "/app/become-seller" },
      { id: "back", label: "◀️ Buying", type: "step", row: 2, targetSlug: "buy_menu" },
    ],
  },

  // ── Keys ──────────────────────────────────────────────────
  {
    slug: "keys_menu",
    title: "Keys & delivery",
    messageText:
      "Keys are digital and delivered right after a successful wallet checkout 🔑\n\nWhat do you need?",
    sortOrder: 40,
    buttons: [
      { id: "where", label: "📍 Where are my keys?", type: "step", row: 1, targetSlug: "keys_where" },
      { id: "missing", label: "⚠️ Paid, no key", type: "step", row: 1, targetSlug: "keys_missing" },
      { id: "invalid", label: "🚫 Key not working", type: "step", row: 2, targetSlug: "keys_invalid" },
      { id: "replace", label: "♻️ Replace / refund", type: "step", row: 2, targetSlug: "keys_refund" },
      { id: "vault", label: "🗄 Open Keys vault", type: "link", row: 3, href: "/app/keys" },
      { id: "back", label: "◀️ Main menu", type: "back", row: 4 },
    ],
  },
  {
    slug: "keys_where",
    title: "Where are my keys?",
    messageText:
      "After checkout, copy keys from:\n\n• Order success screen\n• Account → Keys (vault)\n• Activity History → order detail\n\nTreat keys like passwords — don't share them in public chats.",
    sortOrder: 41,
    buttons: [
      { id: "vault", label: "🔑 Open Keys", type: "link", row: 1, href: "/app/keys" },
      { id: "history", label: "📜 History", type: "link", row: 1, href: "/app/history" },
      { id: "back", label: "◀️ Keys", type: "step", row: 2, targetSlug: "keys_menu" },
    ],
  },
  {
    slug: "keys_missing",
    title: "Paid but no key",
    messageText:
      "Rare, but it happens during stock races or brief outages.\n\n1. Refresh Keys and History\n2. Confirm order status is fulfilled/paid\n3. If wallet debited and no key — submit a KEY report with order ID (don't repurchase repeatedly)\n\nWe can check stock assignment from the admin side.",
    sortOrder: 42,
    buttons: [
      { id: "report", label: "🛠 Report key", type: "link", row: 1, href: "/app/reports" },
      { id: "vault", label: "🔑 Open Keys", type: "link", row: 1, href: "/app/keys" },
      { id: "back", label: "◀️ Keys", type: "step", row: 2, targetSlug: "keys_menu" },
    ],
  },
  {
    slug: "keys_invalid",
    title: "Key not working",
    messageText:
      "Before reporting:\n\n• Copy the full key with no extra spaces\n• Match the product + duration you bought\n• Follow install / activate notes on the product page\n\nAlready used or dead on delivery (stock error)? Open a KEY report with order ID. Game bans, detection, or wrong product choice are usually not replaceable — see Refund Policy.",
    sortOrder: 43,
    buttons: [
      { id: "report", label: "🛠 Report key", type: "link", row: 1, href: "/app/reports" },
      { id: "refund", label: "📄 Refund policy", type: "link", row: 1, href: "/pages/refund-policy" },
      { id: "back", label: "◀️ Keys", type: "step", row: 2, targetSlug: "keys_menu" },
    ],
  },
  {
    slug: "keys_refund",
    title: "Replacement / refund",
    messageText:
      "Digital keys are generally final once revealed.\n\nWe may replace or wallet-credit at our discretion for confirmed store-side errors (invalid stock, charged with no delivery).\n\nNot eligible: change of mind, wrong duration, shared/leaked keys, bans after successful delivery.\n\nFull rules → Refund Policy.",
    sortOrder: 44,
    buttons: [
      { id: "policy", label: "📄 Refund policy", type: "link", row: 1, href: "/pages/refund-policy" },
      { id: "report", label: "🛠 Submit report", type: "link", row: 1, href: "/app/reports" },
      { id: "back", label: "◀️ Keys", type: "step", row: 2, targetSlug: "keys_menu" },
    ],
  },

  // ── Account ───────────────────────────────────────────────
  {
    slug: "account_menu",
    title: "Account & login",
    messageText:
      "Need help signing in, securing your account, or updating your profile? 👤",
    sortOrder: 50,
    buttons: [
      { id: "login", label: "🔐 Can't log in", type: "step", row: 1, targetSlug: "account_login" },
      { id: "forgot", label: "🔑 Forgot password", type: "step", row: 1, targetSlug: "account_forgot" },
      { id: "google", label: "🔵 Google sign-in", type: "step", row: 2, targetSlug: "account_google" },
      { id: "banned", label: "🚫 Banned?", type: "step", row: 3, targetSlug: "account_banned" },
      { id: "profile", label: "👤 Open Profile", type: "link", row: 3, href: "/app/profile" },
      { id: "back", label: "◀️ Main menu", type: "back", row: 4 },
    ],
  },
  {
    slug: "account_login",
    title: "Can't log in",
    messageText:
      "Try this:\n\n1. Correct email + password (check Caps Lock)\n2. Forgot password → email OTP reset\n3. Google login only if Google verified your email\n\nStill stuck? Type a short message from the main menu after trying the steps above.",
    sortOrder: 51,
    buttons: [
      { id: "forgot", label: "🔑 Forgot password", type: "step", row: 1, targetSlug: "account_forgot" },
      { id: "back", label: "◀️ Account", type: "step", row: 2, targetSlug: "account_menu" },
    ],
  },
  {
    slug: "account_forgot",
    title: "Forgot password",
    messageText:
      "Login dialog → Forgot password → enter email → check inbox (and spam) for OTP → set a new password.\n\nOTP codes expire quickly — request a new one if timed out.\n\nWe never ask for your password or OTP in chat.",
    sortOrder: 52,
    buttons: [
      { id: "shop", label: "🏪 Back to Store", type: "link", row: 1, href: "/" },
      { id: "back", label: "◀️ Account", type: "step", row: 2, targetSlug: "account_menu" },
    ],
  },
  {
    slug: "account_google",
    title: "Google sign-in",
    messageText:
      "Google Sign-In appears when the store has OAuth configured.\n\nRequirements:\n• Google email must be verified by Google\n• We link or create an account with that email\n\nIf the button is missing, use email/password register instead.",
    sortOrder: 54,
    buttons: [
      { id: "shop", label: "🏪 Store / login", type: "link", row: 1, href: "/" },
      { id: "back", label: "◀️ Account", type: "step", row: 2, targetSlug: "account_menu" },
    ],
  },
  {
    slug: "account_banned",
    title: "Banned account",
    messageText:
      "Suspended accounts see a banned screen and cannot shop or deposit.\n\nCommon reasons: chargebacks, fraud, abuse, or policy violations.\n\nIf you believe this is a mistake, type a question from the main menu with your registered email + a short explanation — an admin will review when available.",
    sortOrder: 55,
    buttons: [
      { id: "tos", label: "📄 Terms of Service", type: "link", row: 1, href: "/pages/terms-of-service" },
      { id: "back", label: "◀️ Account", type: "step", row: 2, targetSlug: "account_menu" },
    ],
  },

  // ── Referral / seller ─────────────────────────────────────
  {
    slug: "referral_menu",
    title: "Referral & seller",
    messageText:
      "Earn from invites or apply to sell wholesale 🎁\n\nPick a topic:",
    sortOrder: 70,
    buttons: [
      { id: "ref", label: "🔗 How referral works", type: "step", row: 1, targetSlug: "referral_how" },
      { id: "seller", label: "🤝 Become a Seller", type: "step", row: 1, targetSlug: "seller_help" },
      { id: "api", label: "⚙️ Developer / API", type: "step", row: 2, targetSlug: "api_help" },
      { id: "hub", label: "🎁 Referral hub", type: "link", row: 2, href: "/app/referral" },
      { id: "back", label: "◀️ Main menu", type: "back", row: 3 },
    ],
  },
  {
    slug: "referral_how",
    title: "Referral",
    messageText:
      "Share your invite link or code from the Referral hub. When friends register with your code and purchase, you can earn rewards per admin-configured rates.\n\nTrack network, rewards, and weekly earners in Referral. Tasks may show as Coming soon.",
    sortOrder: 71,
    buttons: [
      { id: "hub", label: "🎁 Open Referral", type: "link", row: 1, href: "/app/referral" },
      { id: "back", label: "◀️ Referral", type: "step", row: 2, targetSlug: "referral_menu" },
    ],
  },
  {
    slug: "seller_help",
    title: "Become a Seller",
    messageText:
      "Apply at Become a Seller. Admins review applications (auto-approve may be enabled).\n\nApproved Sellers get wholesale pricing. Extra caps (create / manage / fund Resellers) are granted by admin separately.\n\nResellers are created by Sellers or admins — they share wholesale prices.",
    sortOrder: 72,
    buttons: [
      { id: "apply", label: "✅ Apply now", type: "link", row: 1, href: "/app/become-seller" },
      { id: "back", label: "◀️ Referral", type: "step", row: 2, targetSlug: "referral_menu" },
    ],
  },
  {
    slug: "api_help",
    title: "Platform API",
    messageText:
      "Developers can use the Platform API with one active API key per user.\n\nDocs are public at /developers. Manage your credential under Account → Development (role allowlist may apply).\n\nAPI purchases may include a developer margin set by admin.",
    sortOrder: 73,
    buttons: [
      { id: "docs", label: "📚 API docs", type: "link", row: 1, href: "/developers" },
      { id: "dev", label: "⚙️ Development", type: "link", row: 1, href: "/app/development" },
      { id: "back", label: "◀️ Referral", type: "step", row: 2, targetSlug: "referral_menu" },
    ],
  },

  // ── Policies ──────────────────────────────────────────────
  {
    slug: "policies_menu",
    title: "Policies",
    messageText:
      "Official policies — also in the footer and profile help rows 📄",
    sortOrder: 80,
    buttons: [
      { id: "privacy", label: "🔒 Privacy", type: "link", row: 1, href: "/pages/privacy-policy" },
      { id: "payment", label: "💳 Payment", type: "link", row: 1, href: "/pages/payment-policy" },
      { id: "tos", label: "📋 Terms", type: "link", row: 2, href: "/pages/terms-of-service" },
      { id: "refund", label: "♻️ Refund", type: "link", row: 2, href: "/pages/refund-policy" },
      { id: "delivery", label: "📦 Delivery", type: "link", row: 3, href: "/pages/delivery-policy" },
      { id: "disclaimer", label: "⚠️ Disclaimer", type: "link", row: 3, href: "/pages/disclaimer" },
      { id: "faq", label: "❓ All FAQs", type: "link", row: 4, href: "/faq" },
      { id: "back", label: "◀️ Main menu", type: "back", row: 5 },
    ],
  },

  // ── Fallback ──────────────────────────────────────────────
  {
    slug: "fallback",
    title: "Fallback",
    messageText:
      "Thanks for your message! 🙏 This helper works best with buttons.\n\nPick the closest topic below, browse FAQs, or try a short keyword like “deposit”, “key”, or “login”.",
    isFallback: true,
    sortOrder: 999,
    buttons: [
      { id: "menu", label: "🏠 Main menu", type: "step", row: 1, targetSlug: "welcome" },
      { id: "deposit", label: "💰 Deposits", type: "step", row: 2, targetSlug: "deposit_menu" },
      { id: "keys", label: "🔑 Keys", type: "step", row: 2, targetSlug: "keys_menu" },
      { id: "account", label: "👤 Account", type: "step", row: 3, targetSlug: "account_menu" },
      { id: "faq", label: "❓ FAQs", type: "link", row: 3, href: "/faq" },
      { id: "report", label: "🛠 Report an issue", type: "link", row: 4, href: "/app/reports" },
      { id: "other", label: "✍️ Type another question", type: "input", row: 5 },
    ],
  },
];

async function main() {
  const slugToId = new Map<string, string>();

  for (const step of STEPS) {
    const row = await prisma.supportBotStep.upsert({
      where: { slug: step.slug },
      create: {
        slug: step.slug,
        title: step.title,
        messageText: step.messageText,
        isEntry: step.isEntry ?? false,
        isFallback: step.isFallback ?? false,
        active: true,
        sortOrder: step.sortOrder,
        buttons: [],
      },
      update: {
        title: step.title,
        messageText: step.messageText,
        isEntry: step.isEntry ?? false,
        isFallback: step.isFallback ?? false,
        active: true,
        sortOrder: step.sortOrder,
      },
    });
    slugToId.set(step.slug, row.id);
  }

  for (const step of STEPS) {
    const stepId = slugToId.get(step.slug)!;
    const buttons = step.buttons.map((b) => {
      const base = {
        id: b.id,
        label: b.label,
        type: b.type,
        row: b.row,
      };
      if (b.type === "step" && b.targetSlug) {
        const targetId = slugToId.get(b.targetSlug);
        if (!targetId) throw new Error(`Unknown target slug: ${b.targetSlug}`);
        return { ...base, targetStepId: targetId };
      }
      if (b.type === "link" && b.href) {
        return { ...base, href: b.href };
      }
      return base;
    });

    await prisma.supportBotStep.update({
      where: { id: stepId },
      data: { buttons },
    });
  }

  // Deactivate obsolete default slugs from older thinner seeds (keep admin customs).
  const keep = new Set(STEPS.map((s) => s.slug));
  const obsolete = ["deposit_help", "keys_help"];
  for (const slug of obsolete) {
    if (keep.has(slug)) continue;
    await prisma.supportBotStep.updateMany({
      where: { slug },
      data: { active: false, isEntry: false, isFallback: false },
    });
  }

  const entryCount = await prisma.supportBotStep.count({
    where: { isEntry: true, active: true },
  });
  if (entryCount !== 1) {
    console.warn(`Warning: expected 1 entry step, found ${entryCount}`);
  }

  console.log(`Seeded ${STEPS.length} support bot steps (Telegram keyboard rows).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
