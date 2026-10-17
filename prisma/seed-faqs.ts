/**
 * Idempotent upsert of default FAQ items for /faq + support chips.
 * Match key = exact `question` string.
 * Run: npm run db:seed-faqs
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedFaq = {
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
};

const FAQS: SeedFaq[] = [
  // Getting started
  {
    category: "Getting started",
    sortOrder: 10,
    question: "What is Cheap Seller?",
    answer:
      "Cheap Seller is a digital key store. Browse Mods / Tools / Spoofers, deposit funds to your USD wallet, checkout, and receive license keys instantly in your Keys vault.",
  },
  {
    category: "Getting started",
    sortOrder: 20,
    question: "Do I need an account to buy?",
    answer:
      "Yes. Register or sign in (email/password or Google when available), deposit to your wallet, then checkout. Guests can browse the store but cannot purchase.",
  },
  {
    category: "Getting started",
    sortOrder: 30,
    question: "What currency does the store use?",
    answer:
      "Catalog prices and wallet balance are always USD. You may top up with local payment methods (INR, IDR, NPR, etc.), but credited balance and checkout are USD only.",
  },

  // Deposits
  {
    category: "Deposits",
    sortOrder: 110,
    question: "How do I add money to my wallet?",
    answer:
      "Open Deposit, enter an amount at or above the shown minimum, pick an available payment method, pay the exact ticket amount, and wait for confirmation. Manual methods require a clear screenshot proof before admin approval.",
  },
  {
    category: "Deposits",
    sortOrder: 120,
    question: "Why is my deposit still pending?",
    answer:
      "Pending means funds are not credited yet. Auto rails usually confirm within minutes after a correct payment. Manual proofs wait for admin review. Pay the exact amount, keep the ticket open, and check History. Unpaid tickets expire.",
  },
  {
    category: "Deposits",
    sortOrder: 130,
    question: "What payment methods are available?",
    answer:
      "Methods are configured by admin and shown as chips on the Deposit page. You may see Cashfree (INR), QRIS, Binance Pay, eSewa, and/or manual bank/UPI/crypto options with account or QR details.",
  },
  {
    category: "Deposits",
    sortOrder: 140,
    question: "My deposit was rejected — what now?",
    answer:
      "Rejected deposits are not credited. Common causes: wrong amount, unclear proof, wrong account, or expired ticket. If money left your account, submit a deposit report with ID and clear proof. Avoid chargebacks before contacting support.",
  },
  {
    category: "Deposits",
    sortOrder: 150,
    question: "What is the minimum deposit?",
    answer:
      "Minimums depend on your role and the method currency. The Deposit page shows the live minimum and quick amount chips for the method you select.",
  },

  // Buying
  {
    category: "Buying",
    sortOrder: 210,
    question: "How do I purchase a product?",
    answer:
      "Open the Store, tap a product, choose a duration, add to cart or buy, then checkout with sufficient USD wallet balance. Keys are delivered instantly after a successful debit.",
  },
  {
    category: "Buying",
    sortOrder: 220,
    question: "Checkout says I don't have enough balance",
    answer:
      "Top up via Deposit and wait until the deposit is credited (not pending). Then return to cart/checkout. Purchases always debit your USD wallet — there is no pay-at-checkout with a third-party card alone.",
  },
  {
    category: "Buying",
    sortOrder: 230,
    question: "How do promo codes and flash sales work?",
    answer:
      "Flash sales show discounted prices and countdowns when active. Promo codes apply at cart/checkout if they match audience, date window, product/duration scope, and per-user limits. Invalid codes are rejected server-side.",
  },
  {
    category: "Buying",
    sortOrder: 240,
    question: "Why are Seller/Reseller prices different?",
    answer:
      "Approved Sellers and Resellers pay wholesale (reseller) prices. Regular users pay retail. Apply via Become a Seller; admin approval (or auto-approve) is required.",
  },

  // Keys
  {
    category: "Keys",
    sortOrder: 310,
    question: "Where can I find my purchased keys?",
    answer:
      "Keys appear on the order success screen and in Account → Keys. You can also open the order from Activity History. Copy carefully and store them privately.",
  },
  {
    category: "Keys",
    sortOrder: 320,
    question: "I paid but didn't receive a key",
    answer:
      "Refresh Keys and History first. If the order shows paid/fulfilled with no key, submit a KEY report with the order ID — do not keep rebuying the same item. Support can check stock assignment.",
  },
  {
    category: "Keys",
    sortOrder: 330,
    question: "My key doesn't work",
    answer:
      "Confirm you copied the full key, bought the correct product/duration, and followed product instructions. If it was dead on delivery (stock error), report it with the order ID. Bans, detection, or wrong selection after a valid delivery are usually not replaceable.",
  },
  {
    category: "Keys",
    sortOrder: 340,
    question: "Can I get a refund?",
    answer:
      "Digital keys are generally final once revealed. We may replace or wallet-credit for confirmed store-side errors (invalid stock, charged with no delivery). Change of mind, shared keys, and post-delivery bans are not eligible. See Refund Policy.",
  },

  // Account
  {
    category: "Account",
    sortOrder: 410,
    question: "How do I reset my password?",
    answer:
      "On the login dialog, open Forgot password, enter your email, and use the OTP sent by email to set a new password. Check spam if it doesn't arrive. Codes expire quickly.",
  },
  {
    category: "Account",
    sortOrder: 430,
    question: "Can I sign in with Google?",
    answer:
      "Yes when Google OAuth is configured on the store. Your Google email must be verified. If the button is hidden, use email/password registration instead.",
  },
  {
    category: "Account",
    sortOrder: 440,
    question: "Why is my account banned?",
    answer:
      "Accounts may be suspended for chargebacks, fraud, abuse, or policy violations. If you believe it is a mistake, contact support with your registered email and a short explanation for admin review.",
  },

  // Referral / API
  {
    category: "Referral",
    sortOrder: 610,
    question: "How does the referral program work?",
    answer:
      "Share your invite link or code from the Referral hub. When invited users register with your code and buy, you can earn rewards based on admin-configured rates. Track network and rewards in Referral.",
  },
  {
    category: "Seller",
    sortOrder: 710,
    question: "How do I become a Seller?",
    answer:
      "Open Become a Seller, submit the application, and wait for admin review (auto-approve may be on). Sellers get wholesale pricing. Caps to create, manage, or fund Resellers are granted separately by admin.",
  },
  {
    category: "API",
    sortOrder: 810,
    question: "Is there a developer API?",
    answer:
      "Yes. Public docs are at /developers. Eligible accounts manage one active API key under Account → Development. Catalog checks and private buy/wallet endpoints are available; rate limits and a developer margin may apply.",
  },

  // Support / policies
  {
    category: "Support",
    sortOrder: 910,
    question: "How do I contact support?",
    answer:
      "Use the Support chat button (guided topics and FAQs). For key or deposit problems that need a ticket, open Reports and submit a KEY or DEPOSIT issue with IDs and proof. Policies are linked in the footer and Support → Policies.",
  },
  {
    category: "Support",
    sortOrder: 920,
    question: "Where are the store policies?",
    answer:
      "Privacy, Payment, Terms, Refund, Delivery, and Disclaimer pages are published under /pages/… and linked from the footer, profile help rows, and Support → Policies.",
  },
];

async function main() {
  let created = 0;
  let updated = 0;

  for (const faq of FAQS) {
    const existing = await prisma.faqItem.findFirst({
      where: { question: faq.question },
      select: { id: true },
    });

    if (existing) {
      await prisma.faqItem.update({
        where: { id: existing.id },
        data: {
          answer: faq.answer,
          category: faq.category,
          sortOrder: faq.sortOrder,
          active: true,
        },
      });
      updated += 1;
    } else {
      await prisma.faqItem.create({
        data: {
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          sortOrder: faq.sortOrder,
          active: true,
        },
      });
      created += 1;
    }
  }

  console.log(`Seeded FAQs: ${created} created, ${updated} updated (${FAQS.length} total).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
