/**
 * Idempotent upsert of default legal / info static pages.
 * Run: npx tsx prisma/seed-static-pages.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PAGES = [
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    seoTitle: "Privacy Policy | Cheap Seller",
    seoDescription:
      "How Cheap Seller collects, uses, and protects your account and payment information.",
    sortOrder: 10,
    content: `Last updated: July 26, 2026

Cheap Seller (“we”, “us”) operates a digital product storefront. This Privacy Policy explains what information we collect and how we use it.

1. Information we collect
• Account details — name, email, username, and password (hashed).
• Wallet activity — deposits, balances, and purchase history in USD.
• Order data — products purchased and key delivery records.
• Support chats — messages you send to our assistant or team.
• Technical data — browser type, IP address, and basic device info needed for security and session management.
• Optional — Google account email if you sign in with Google.

2. How we use your information
• To create and secure your account.
• To process deposits, wallet balances, and order fulfillment.
• To deliver digital keys and show purchase history.
• To provide customer support and improve our store.
• To prevent fraud, abuse, and unauthorized access.

3. Sharing
We do not sell your personal data. We may share limited data with:
• Payment / deposit processors you choose when topping up.
• Email delivery providers (e.g. password-reset OTP).
• Hosting and infrastructure providers required to run the service.
• Authorities when required by law.

4. Cookies & sessions
We use secure session cookies to keep you signed in and protect your account. Theme and cart preferences may be stored locally in your browser.

5. Data retention
We keep account, order, and wallet records as long as needed to operate the store, meet legal obligations, and resolve disputes. You may request account-related updates via Support.

6. Security
We use industry-standard practices (hashed passwords, httpOnly session cookies). No method of transmission is 100% secure — protect your login and never share keys or OTPs.

7. Your choices
• Update profile details from your account.
• Contact Support to ask about your data or close an account when eligible.

8. Contact
Questions about privacy? Open Support from the store or your dashboard, or reach us through the channels listed on the site.

By using Cheap Seller, you agree to this Privacy Policy.`,
  },
  {
    slug: "payment-policy",
    title: "Payment Policy",
    seoTitle: "Payment Policy | Cheap Seller",
    seoDescription:
      "How deposits, wallet balance, and checkout work on Cheap Seller (USD only).",
    sortOrder: 20,
    content: `Last updated: July 26, 2026

Cheap Seller uses a wallet-based checkout. All catalog prices and balances are in United States Dollars (USD).

1. Wallet balance
• Your balance is stored in USD and shown in your account.
• Purchases debit your wallet at checkout — you must have enough balance to complete an order.
• There is no multi-currency conversion on the storefront.

2. Deposits
• You can top up using the deposit methods shown in your dashboard (for example manual / bank transfer / crypto / UPI / other, as available).
• Deposit proofs may require admin review before funds are credited.
• Always follow the on-screen instructions and upload a clear proof when asked.
• Credited amounts are applied to your USD wallet balance.

3. Checkout
• Orders are paid from your wallet balance at the time you confirm purchase.
• Digital keys are delivered after a successful wallet debit and fulfillment.
• Promo codes and flash sales (when active) apply according to their rules at checkout.

4. Failed or pending deposits
• Pending deposits are not available for spending until approved.
• Rejected deposits are not credited. Contact Support with your deposit reference if you believe a mistake occurred.
• Do not submit the same proof multiple times unless Support asks you to.

5. Chargebacks & disputes
• Opening a chargeback or payment dispute after receiving digital goods may result in account suspension and order review.
• Contact Support first so we can resolve wallet or deposit issues quickly.

6. Pricing
• Listed prices are in USD unless otherwise stated.
• We may update prices, durations, or promotions at any time; changes do not affect already fulfilled orders.

7. Contact
For payment or deposit help, open Support and choose Deposits & wallet, or submit a deposit report from Reports.`,
  },
  {
    slug: "terms-of-service",
    title: "Terms of Service",
    seoTitle: "Terms of Service | Cheap Seller",
    seoDescription:
      "Rules for using the Cheap Seller digital key store, accounts, and purchases.",
    sortOrder: 30,
    content: `Last updated: July 26, 2026

Welcome to Cheap Seller. By creating an account or buying from our store, you agree to these Terms of Service.

1. Eligibility
• You must be able to form a binding agreement and comply with applicable laws where you live.
• You are responsible for keeping your login and purchased keys confidential.

2. Accounts
• One person should use one account unless we approve otherwise.
• We may suspend or ban accounts for fraud, abuse, chargebacks, or policy violations.
• Impersonation, shared seller abuse, or attempts to bypass security are prohibited.

3. Products
• Cheap Seller sells digital license keys and related digital goods (such as mods, tools, or spoofers where offered).
• Descriptions, durations, and stock are provided as accurately as practical; availability can change.
• Keys are delivered digitally after a successful purchase — there is no physical shipping.

4. Orders & fulfillment
• An order is complete when payment from your wallet succeeds and keys are assigned.
• You can view purchased keys in your dashboard (Keys / order history).
• Lost keys due to sharing, leaks, or device issues are generally not replaceable unless we confirm a store-side error.

5. Acceptable use
• Use products only in ways that are legal in your jurisdiction.
• Do not attack, scrape, or disrupt Cheap Seller systems.
• Do not resell keys in violation of product or reseller program rules.

6. Reseller program
• Reseller / sub-seller features (when enabled) follow additional program rules set by admins.
• Caps such as creating, managing, or funding sub-sellers are granted only by administrators.

7. Changes
• We may update these Terms; the “Last updated” date will change when we do.
• Continued use of Cheap Seller after updates means you accept the revised Terms.

8. Contact
Questions? Open Support from the site or your account hub.`,
  },
  {
    slug: "refund-policy",
    title: "Refund Policy",
    seoTitle: "Refund Policy | Cheap Seller",
    seoDescription:
      "When refunds or wallet credits may apply for digital key purchases on Cheap Seller.",
    sortOrder: 40,
    content: `Last updated: July 26, 2026

Cheap Seller sells digital goods that are delivered instantly. Please read this policy before purchasing.

1. General rule
• Because keys are digital and revealed immediately after payment, all sales are generally final.
• Wallet deposits that were successfully credited are typically non-refundable once available for spending.

2. When we may help
We may offer a replacement key, wallet credit, or other remedy at our discretion if:
• The delivered key was invalid or already used before you received it (store-side stock error).
• Your wallet was debited but no key was delivered due to a confirmed system fault.
• A deposit was approved incorrectly (wrong amount) and Support verifies the error.

3. When refunds are not available
• Change of mind after keys are revealed.
• Product bans, detection, or game/platform updates after a successful delivery.
• Keys shared, leaked, or used on multiple devices against product rules.
• Incorrect duration or product selected by the buyer.
• Chargebacks filed without contacting Support first.

4. How to request a review
• Open Support within a reasonable time after purchase.
• Include your order ID, product name, and a short description of the issue.
• Do not post full key codes in public channels.

5. Deposit disputes
• Pending deposits are not refunds — they are awaiting review.
• Rejected deposits mean funds were not credited to Cheap Seller; resolve with your payment method if money left your account incorrectly.

6. Final decisions
• Approved remedies are applied as wallet credit or key replacement unless we state otherwise.
• Abuse of the refund process may result in account restrictions.

Contact Support anytime from the store or your dashboard.`,
  },
  {
    slug: "delivery-policy",
    title: "Delivery Policy",
    seoTitle: "Key Delivery Policy | Cheap Seller",
    seoDescription:
      "How digital keys are delivered after wallet checkout on Cheap Seller.",
    sortOrder: 50,
    content: `Last updated: July 26, 2026

Cheap Seller delivers digital license keys online — there is no physical shipping.

1. How delivery works
• Add products to your cart and checkout with a sufficient USD wallet balance.
• After a successful payment, keys are claimed from stock and attached to your order.
• You can copy or download keys from the order success page and from your Keys section in the dashboard.

2. Delivery time
• Most orders fulfill instantly after wallet debit.
• Rare delays may occur during high traffic, stock updates, or maintenance. If keys do not appear, refresh your Keys page and contact Support with your order ID.

3. Where to find your keys
• Order confirmation / success screen after checkout.
• Account → Keys (and activity history for related orders).
• Keep a private backup of keys you purchase — treat them like passwords.

4. Stock & availability
• Purchase is stock-gated. If stock runs out during checkout, the order may fail and your wallet should not be charged for unfulfilled lines.
• Durations and editions shown at purchase time are what you receive.

5. Failed delivery
• If your wallet was charged but keys never arrived, contact Support immediately with the order ID.
• Do not repurchase the same item repeatedly without checking Support — we can investigate stock and order status.

6. Sharing keys
• Keys are for your account use unless a product explicitly allows resale under our reseller program.
• Shared or leaked keys may be deactivated by the product vendor and are not our responsibility.

Need help? Open Support and choose Keys & delivery, or submit a KEY report from Reports.`,
  },
  {
    slug: "disclaimer",
    title: "Disclaimer",
    seoTitle: "Disclaimer | Cheap Seller",
    seoDescription:
      "Important legal and product-use disclaimers for the Cheap Seller store.",
    sortOrder: 60,
    content: `Last updated: July 26, 2026

Please read this disclaimer before using Cheap Seller or any digital products purchased here.

1. Informational storefront
• Product descriptions, ratings, and support answers are provided to help you choose — they are not a guarantee of uninterrupted performance on every device, game version, or region.

2. Your responsibility
• You are solely responsible for how you use purchased software, keys, mods, tools, or spoofers.
• You must comply with the laws, game terms, and platform rules that apply to you.
• Cheap Seller is not liable for bans, hardware issues, account losses, or third-party enforcement actions resulting from product use.

3. No warranty beyond delivery
• Except where we confirm a store-side delivery error (see Refund Policy), products are provided as delivered digital goods.
• We do not warrant that any product will remain undetected, updated forever, or compatible with future game patches.

4. Third-party services
• Deposits, OAuth (Google), email OTP, and similar services are provided by third parties. Their outages or policies may affect login or top-ups temporarily.

5. Limitation of liability
• To the fullest extent permitted by law, Cheap Seller and its operators are not liable for indirect, incidental, or consequential damages arising from store use or product use.
• Our total liability related to a purchase is limited to the amount paid for that order, except where law requires otherwise.

6. Support scope
• Support can help with deposits, account access, and key delivery issues.
• Support cannot guarantee game outcomes, bypass vendor bans, or restore keys lost through sharing.

By purchasing or using Cheap Seller, you acknowledge this Disclaimer together with our Terms, Privacy, Payment, Refund, and Delivery policies.`,
  },
] as const;

async function main() {
  for (const page of PAGES) {
    await prisma.staticPage.upsert({
      where: { slug: page.slug },
      create: {
        slug: page.slug,
        title: page.title,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        content: page.content,
        active: true,
        sortOrder: page.sortOrder,
      },
      update: {
        title: page.title,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        content: page.content,
        active: true,
        sortOrder: page.sortOrder,
      },
    });
    console.log(`Upserted static page: ${page.slug}`);
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
