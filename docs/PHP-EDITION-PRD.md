# Drip Client — PHP Edition PRD

**Codename:** DripClient PHP Edition (resale product)
**Purpose:** A full feature-parity clone of the Next.js DripClient storefront, rewritten in raw PHP + MySQL so it can be sold/resold to buyers who only have cheap shared (cPanel-style) hosting and cannot afford Node.js hosting.
**Author:** generated for karanswami1506@gmail.com
**Date:** 2026-08-18
**Status:** Draft v1 — for review before implementation starts

---

## 1. Why this exists

The current product (`dripclientofficial.dev`) is a Next.js 16 + Prisma + MongoDB digital-key storefront. It runs on a VPS with PM2 + nginx. This is too expensive/complex for resale customers, most of whom only have:

- Shared PHP hosting (cPanel, MySQL, no shell/SSH, no Node runtime)
- Little to no DevOps knowledge — needs to be "upload via FTP/File Manager and go"

**Goal:** Reimplement the same product surface in **plain PHP + MySQL**, deployable by uploading files and importing one SQL file — no Composer, no build step, no Node.

Non-goal: this is not meant to be a literal transpile of the Next.js code. It's a from-scratch PHP implementation that reproduces the same *behavior and features*, using PHP-idiomatic patterns (server-rendered pages + PDO + sessions).

---

## 2. Target stack

| Layer | Choice | Notes |
|---|---|---|
| Language | PHP 8.1+ | Widely available on shared hosting; use typed properties, enums, match — but no framework |
| DB | MySQL 5.7+ / MariaDB 10.3+ | via PDO, prepared statements only |
| Sessions/Auth | Native PHP sessions + `password_hash()`/`password_verify()` | No JWT dependency; CSRF tokens per form |
| Frontend | Server-rendered PHP templates + Tailwind (CDN or prebuilt CSS) + vanilla JS / small Alpine.js sprinkles | No SPA, no build pipeline required to deploy |
| File uploads | Local `/uploads` directory, validated mime/size | Avatar, review images, deposit proof, ticket attachments |
| Cron | Standard cPanel cron hitting a PHP script over HTTP or CLI | Replaces Next.js `/api/cron/deposits/poll` |
| Email | PHPMailer (SMTP) or `mail()` fallback | OTP / password reset |
| 2FA | `spomky-labs/otphp`-equivalent hand-rolled TOTP (RFC 6238), no Composer required — vendor a single-file implementation | Keep zero-Composer promise |
| Payments | Cashfree, Binance Pay, manual UPI/QRIS/eSewa — same rails as original | Server-to-server webhook + polling cron |
| Money | Store as **integer cents** (not microcents) in `BIGINT` columns | Simpler for MySQL; avoids float rounding bugs common in PHP |
| Deployment | Zip upload + `install.php` wizard (writes `config.php`, imports `schema.sql`, creates first admin) | Mirrors WordPress-style installers buyers already understand |

**Explicit non-requirement:** no Composer, no npm, no build step. A buyer should be able to unzip, upload via FTP, visit `install.php`, fill a form, and be live.

---

## 3. Full feature scope (nothing dropped from the Next.js version)

Organized by module, mapped 1:1 to the current Prisma models/routes reviewed in `prisma/schema.prisma` and `src/app/**`.

### 3.1 Storefront (public)
- Home: categories, product grid, bestseller/new/pinned sorting, banners, flash-sale banner, promo banner
- Product detail: durations × versions, price table (user/reseller/special-price aware), stock indicator, reviews (approved only), demo URL
- Category browse
- FAQ page, static pages (CMS pages by slug)
- Public seller/user profile pages (`/[username]`) — bio, socials, featured products, profile border, emoji status, premium badge
- Leaderboard (top sellers/resellers)
- Developer docs page (Platform API reference, human-readable — see 3.9)

### 3.2 Auth & account
- Register / login (email + password), email verification
- Forgot password via emailed OTP (rate-limited, hashed OTP, expiry, attempt counter)
- Change email / change password from account settings
- Google OAuth login (optional; PHP: standard OAuth2 authorization-code flow, no SDK needed)
- 2FA (TOTP) enable/disable + hashed backup codes
- Avatar upload, bio, social links, public/private profile toggle
- Username change (Premium-only, 30-day cooldown)
- Session/device handling — plain PHP session, "remember me" cookie (hashed token in DB)
- Ban enforcement (banned users blocked at login/session-check with ban reason shown)

### 3.3 Wallet & payments
- Wallet balance (integer cents, USD only)
- Deposit rails: Binance Pay, QRIS, UPI, eSewa, Manual (admin-defined manual methods with instructions/QR)
- Deposit lifecycle: PENDING → PROCESSING → COMPLETED/FAILED/EXPIRED/CANCELLED
- Proof-of-payment upload for manual deposits, admin review (approve/reject with note)
- Deposit cron/poll: checks provider status for pending deposits, auto-expires stale ones, credits wallet on confirm (idempotent via `transaction_id` link)
- Ledger: `transactions` table — DEPOSIT, PURCHASE, REFUND, REFERRAL_REWARD, ADMIN_ADJUSTMENT, PREMIUM_PURCHASE, API_FEE, GIFT_CODE
- Gift codes: admin-generated wallet credit codes, optional user-assignment, redeem flow, kill-switch (disable code)
- Cashfree + Binance + manual webhook endpoints (`webhooks/cashfree.php`, `webhooks/binance.php`)

### 3.4 Catalog & inventory
- Categories (CRUD, sort order)
- Products (title, description, images, features list, bestseller/new/pinned/active flags, category)
- Durations per product (label, days, optional "version" grouping e.g. Lite/Brutal, `api_code` SKU, supplier linkage fields kept for parity)
- Duration prices: user price, reseller price, buy/cost price (admin-only), per-currency (USD only for now, schema allows extension)
- Keys: inventory of license keys per duration (AVAILABLE/SOLD/DISABLED), manual admin upload (bulk paste/CSV) **and** optional supplier auto-generation (3.10)
- Per-user special price overrides + audit history table
- Product reviews: star rating, body, verified-buyer flag (auto-set if user has a paid order for that product), PENDING→APPROVED/DISABLED moderation queue

### 3.5 Checkout & orders
- Cart-less direct buy (buy 1 duration at a time, matches current UX) with quantity
- Promo codes: global/product/duration scope, percent or flat discount, audience targeting (ALL/USER/SELLER), redemption caps (global + per-user), active window, storefront banner toggle
- Flash sales: same scoping model as promo, percent-only, banner with countdown
- Guest checkout by email (buyer_email) as well as logged-in wallet checkout
- Order states: PENDING → PAID → FULFILLED / FAILED / REFUNDED
- Key fulfillment: on PAID, atomically claim an AVAILABLE key (row-level lock via `SELECT ... FOR UPDATE`), attach to order item, mark SOLD
- Order access token (public order lookup without login, e.g. guest email checkout receipt page)
- Android ID / device-bound key support (`requires_android_id`, `device_id_name` on duration; stored on order item)

### 3.6 Reseller / Seller tiering (core resale value — do not drop)
- Roles: USER, SELLER, RESELLER, ADMIN
- Reseller application flow: user submits request (name, phone, country, socials, follower count, platform, reason) → PENDING → admin APPROVED/REJECTED
- Seller permissions granted by admin per-account: `can_create_resellers`, `can_manage_resellers`, `can_fund_resellers`
- Seller dashboard: create/manage own resellers, fund/cut their wallet balance, leaderboard of own downline
- Reseller-tier pricing automatically applied at checkout (falls back: special price > reseller price > user price)
- Seller "become a reseller/become a seller" application pages

### 3.7 Admin console (full parity)
Single admin area (role-gated), sections:
- Dashboard/analytics (revenue, orders, signups, top products — daily/weekly graphs)
- Products, Categories, Durations, Prices, Keys (bulk import), Special Prices (+ history log)
- Orders (search/filter/refund/mark fulfilled)
- Deposits (queue, manual approve/reject, recheck-requested flag, provider raw response viewer)
- Deposit cron run history (start/finish time, per-provider counts, errors)
- Gift codes (create single/batch, assign, disable/kill-switch, claim history)
- Promo codes, Flash sales, Banners
- Reviews moderation queue
- FAQs, Static pages (simple CMS/WYSIWYG-lite editor)
- Users (search, ban/unban with reason, role change, wallet adjustment, impersonate-as-user for support)
- Resellers/Sellers (approve requests, grant permissions, fund management)
- Support tickets inbox + replies; Issue reports (submit-only key/deposit problem tickets)
- Support bot builder: button-tree steps editor + keyword-route trainer (3.11)
- Broadcasts (pinned announcements by audience: ALL/USER/SELLER/ADMIN)
- Site config (branding, icons, maintenance mode toggle+message)
- Seller/Platform API admin: key issuance overview, usage stats, developer settlement ledgers (3.9)
- Activity/audit logs (auto-purge after 7 days), filterable by category/action/user
- Supplier API logs viewer (3.10)
- Settings: payment gateway keys, manual deposit method editor, sandbox toggle, general site settings

### 3.8 Notifications & support
- In-app notification bell (type/title/message/action link/read state)
- Support ticket system: user opens ticket (subject, message, optional attachment), admin replies threaded, status OPEN/IN_PROGRESS/RESOLVED/CLOSED, priority NORMAL/HIGH/CRITICAL, freeze-bot flag
- Persistent support inbox thread per user (chat-style: user/assistant/admin/notification/system messages), unread tracking
- Support "memory" per user (last issue summary, last admin reply summary, pending guided flow state) — used to make the bot/admin view context-aware
- Issue reports: submit-only reports tied to a key or deposit, admin review queue

### 3.9 Platform API (developer-facing REST API) — kept in scope
- Seller-issued API keys (LIVE/SANDBOX mode, prefix + hashed secret, scopes, IP allowlist, per-key rate limit)
- Endpoints: `me`, `balance`, `products`, `pricing`, `stock`, `orders` (create/list), `ai-prompt` helper, `sdk` download/reference, `openapi.json`
- Idempotency keys (dedupe repeated POSTs by key+hash for a TTL window)
- Per-request usage logging (status code, duration, fee applied) for admin analytics
- Webhooks: seller-registered URL + signing secret, event list, delivery fail-count + last-delivery tracking
- 1% developer margin fee (`API_FEE` transaction type) auto-applied on Platform API purchases; daily settlement ledger (`ApiDeveloperMarginDay`)
- Sandbox mode toggle (admin-level global switch + per-key mode)

### 3.10 Supplier auto-fulfillment — kept in scope
- Optional per-duration link to an upstream supplier catalog product id
- On stock-out, call supplier API (balance/catalog/generate/history) server-to-server to fetch a fresh key, insert as AVAILABLE, continue fulfillment
- Full request/response logging (`supplier_api_log` table) for admin debugging, with fallback flag when supplier call fails and a cached/manual key is used instead
- Manual key upload always remains available as the primary path — supplier integration is additive, not required for the shop to function

### 3.11 Support bot / "Little AI" router — kept in scope
- Two admin-authorable systems:
  1. **Button-tree bot** (`support_bot_step`): Telegram-style step/button flows (slug, message text, buttons of type step/link/back/input), one entry step, one fallback step
  2. **Keyword router** (`support_route`): trainable phrase→weight keyword matching against user free-text input, role-gated routes, canned reply + up to 3 buttons, fallback route
- No external LLM call required — pure keyword-weight matching in PHP (keeps hosting cost at zero and works on shared hosting with no outbound API budget)
- Escalation: router/bot can hand off to a live SupportTicket when `isSerious` route matched or user explicitly asks for a human

### 3.12 Premium membership
- One-time wallet purchase → lifetime `is_premium` flag, `premium_purchased_at`
- Premium perks: profile border, username-change ability, referral code page, premium-only purchased-products area
- Daily settlement ledger for the platform's revenue share (`PremiumSettlementDay`)

### 3.13 Referrals
- Referral code per user, referred-by linkage
- Reward transaction (`REFERRAL_REWARD`) triggered on referred user's qualifying action (first deposit/purchase — confirm business rule during build)
- Referral check endpoint (validate a code before signup)

### 3.14 Mobile/native shell parity (lower priority, Phase 4)
- The Next.js app ships a Capacitor Android WebView wrapper. PHP edition: same approach — the PHP site is mobile-responsive and can be wrapped in an identical minimal Capacitor/WebView shell. No PHP-side work beyond ensuring the site is a good "app-like" mobile web experience (native handoff endpoint for app-only session bridging).

---

## 4. Explicitly out of scope for v1 (confirm before build)

Nothing was cut per your instruction ("sab kuch daalo") — full list above is the target. The only true out-of-scope item is:

- **1:1 UI pixel parity** with the Next.js/shadcn design system. PHP edition gets its own server-rendered Tailwind UI inspired by the same layout, not a literal component port (React components don't translate to PHP).

If you want pixel-parity too, say so and we'll add a UI-parity pass as its own phase.

---

## 5. Data model (MySQL)

Direct translation of the Prisma/Mongo schema to normalized MySQL. Key differences from the source:

- `ObjectId` → `BIGINT UNSIGNED AUTO_INCREMENT` primary keys (or `CHAR(26)` ULIDs if you want sortable public-safe ids — recommend ULIDs for order/deposit ids that get shown in URLs)
- Money `Float` microcents → `BIGINT` **cents** (multiply/divide by 100, not 1e8 — simpler, still exact integer math)
- `String[]` arrays (features, scopes, backup codes, etc.) → child tables (`product_features`, `seller_api_key_scopes`, ...) or `JSON` columns where the array is opaque/admin-only (MySQL 5.7+ has native `JSON` type)
- `Json` fields (socialLinks, buttons, keywords, metadata) → `JSON` columns
- Enums → MySQL `ENUM(...)` columns
- Relations → standard FK constraints with `ON DELETE` rules matching current `onDelete: NoAction` behavior (mostly `RESTRICT`/`SET NULL` per field semantics reviewed above)

### Full table list (33 tables, matches 33 Prisma models 1:1)

```
users, password_reset_otps, categories, products, product_reviews,
durations, user_special_prices, user_special_price_history, duration_prices,
keys, orders, order_items, transactions, deposits, gift_codes,
deposit_cron_runs, promo_codes, promo_redemptions, flash_sales, banners,
faq_items, static_pages, reseller_requests, notifications, app_settings,
support_bot_steps, support_routes, support_tickets, support_ticket_replies,
support_inbox_messages, support_user_memory, developer_settlement_days,
premium_settlement_days, api_developer_margin_days, seller_api_keys,
seller_api_usage, seller_api_webhooks, seller_api_idempotency, broadcasts,
issue_reports, activity_logs, supplier_api_logs
```

(Full column-level DDL to be written as `schema.sql` at build time — this PRD fixes the shape; exact DDL is an implementation artifact, not a planning artifact.)

---

## 6. Proposed folder structure (no framework, no autoloader magic beyond a tiny PSR-4-lite loader)

```
/php-edition
  /config
    config.example.php        # DB creds, secrets, payment keys — copied to config.php by installer
  /install
    install.php                # web installer wizard (schema import + first admin + config write)
    schema.sql
  /public                       # web root — only this directory is exposed by the host
    index.php                   # front controller / router
    /assets (css, js, images)
    /uploads                    # avatars, proofs, attachments (writable)
  /src
    /Core        (Router, DB (PDO singleton), Session, Csrf, Request, Response, View)
    /Auth        (Login, Register, OTP, TOTP, Google OAuth, Ban check middleware)
    /Models      (one class per table, thin data-mapper, prepared statements only)
    /Services    (Wallet, Checkout, Deposits, GiftCodes, Promo, FlashSale, Referral,
                  SpecialPrice, SupportBot, SupplierApi, PlatformApi, Settlement)
    /Controllers (Storefront, Account, Wallet, Checkout, Admin\*, Api\V1\*, Webhooks\*)
    /Views       (plain PHP templates, layout.php + partials, Tailwind classes)
    /Cron        (deposits_poll.php, settlement_daily.php, activity_log_purge.php)
  /docs
    PRD.md (this file), API.md (Platform API reference), INSTALL.md
```

Routing: a single `public/index.php` front controller with a small hand-rolled router (regex route table → controller method), avoiding any Composer dependency.

---

## 7. Build phases

Sequenced for a working, sellable product as early as possible, with full parity reached by Phase 5.

| Phase | Scope | Outcome |
|---|---|---|
| **0** | Installer, config, DB schema, base Router/DB/Session/CSRF core | Empty app deploys and shows a working homepage shell |
| **1 — MVP storefront** | Auth (register/login/forgot-password), Categories/Products/Durations/Keys, Checkout (wallet + manual deposit only), Orders, basic Admin (products/orders/deposits/users) | Sellable minimum: buyer can list products, take wallet payments, fulfill keys |
| **2 — Money & growth** | Promo codes, Flash sales, Gift codes, Reviews, Banners, FAQs/Static pages, Referrals, Premium membership | Matches a typical competitor key-shop feature set |
| **3 — Reseller network** | Reseller requests, Seller/Reseller roles + permissions, special prices + history, seller dashboard | Unlocks the wholesale/reseller resale angle |
| **4 — Support & ops** | Notifications, Support tickets, Support inbox, Support bot (button-tree + keyword router), Issue reports, Broadcasts, Activity logs | Full support/ops parity |
| **5 — Platform API & supplier** | Seller API keys/webhooks/idempotency, Platform API v1 endpoints + OpenAPI doc, developer settlement ledgers, Supplier auto-fulfillment + logs | 100% feature parity with the Next.js edition |
| **6 — Mobile shell & polish** | Capacitor WebView wrapper, responsive QA pass, packaging for resale (demo data seeder, branding wizard in installer) | Ready to package and sell |

Each phase should end in a deployable, demo-able state — useful since this is a resale product and you'll likely want to show/sell progress before Phase 5 is done.

---

## 8. Open questions to confirm before Phase 0 starts

1. **IDs:** auto-increment ints (simplest, fastest) vs ULIDs (nicer for public URLs, avoids enumeration). Recommend ULIDs for `orders`, `deposits`, `gift_codes`; plain ints elsewhere.
2. **Multi-currency:** current system is USD-only by design (`Currency` enum has one value). Keep that constraint for v1?
3. **Licensing/anti-piracy for the resale product itself:** do you want a license-key check baked into the PHP app (since you're selling *this codebase* to others), or is that a separate concern outside this PRD?
4. **Branding:** should the installer include a "rebrand wizard" (site name/logo/colors) so each buyer can white-label without touching code?
5. **Payment gateways:** confirm which of Cashfree/Binance Pay/manual UPI/QRIS/eSewa are must-have for v1 vs can be admin-toggled off per deployment (some buyers may only need manual UPI, e.g.).

---

## 9. Summary

Everything in the current Next.js DripClient — storefront, wallet, checkout, reseller tiers, admin console, support bot, Platform API, supplier auto-fulfillment — is in scope for the PHP edition, built in 6 phases on plain PHP 8 + MySQL with zero Composer/npm/build-step dependencies, installable via a web wizard like a classic PHP script product. Phase 1 alone is enough to be sellable; full parity lands at Phase 5.
