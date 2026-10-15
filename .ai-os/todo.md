# Drip — Implementation Todo

> **Last synced:** 2026-07-29 (**Version 1.0 — shipped / launchable**)  

> **v1.0 deliverable shipped.** Phases 0–6 + Guru admin port complete. Store + admin + deposits + Platform API + support bot + APK **v1.0.7** + VPS deploy (`sudo bash setup.sh` · `./deploy.sh` · pm2 `:3102` · nginx). Optional: physical Android device QA. Deferred post-v1: multi-language auto-translate (pt-BR).

---

## Phase 0–6 — Baseline ✅

(See prior checklist — storefront, auth, customer hub, checkout, lean admin, hardening.)

## Guru admin port ✅

- [x] Schema: wallet, Transaction, Deposit, Promo, FlashSale, Banner, FAQ, StaticPage, ResellerRequest, Notification, AppSetting; KeyStatus.DISABLED
- [x] Admin sidebar groups (Dashboard / Store / Payments / Users / Content / System)
- [x] Stub + workspace pages for all new admin routes (shadcn Dialog/Sheet)
- [x] `/admin/keys`, `/admin/key-check`, `/admin/history`
- [x] Promos + flash sales CRUD + validate API + checkout flash pricing
- [x] Wallet balance + customer deposit + admin deposits/reports + checkout debit
- [x] Users ban/wallet Dialogs + reseller requests
- [x] Admin Users Accounts Desk polish (compact mobile list, status badges, detail Dialog wallet edit; History tab removed)
- [x] Banners / FAQs / static pages / settings / site-config / broadcast / statistics / analytics
- [x] AI-OS STATUS / routes / architecture / features sync

## Money model — USD microcents ✅

- [x] Currency enum USD-only; remove register currency picker
- [x] Store prices / wallet / orders / deposits as integer microcents (`1 USD = 1e8`)
- [x] Multi-method deposits (MANUAL / BANK_TRANSFER / CRYPTO / UPI / OTHER); balance always USD
- [x] `formatMoney` / `usdToMicrocents` helpers; cart storage `drip-cart-v2`
- [x] Migrate all existing users (+ orders/deposits/transactions) to USD — `prisma/migrate-currency-usd.ts`

## Admin UI — Coming soon placeholders ✅

- [x] Keep sidebar groups + nav entries
- [x] Replace all admin panel feature page UIs with `AdminComingSoon`
- [x] Sidebar item descriptions set to “Coming soon”
- [x] Nested catalog/order routes also gated to Coming soon

## Admin auth — role-only ✅

- [x] Remove `/admin/login`, admin password cookie, `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET`
- [x] `/admin` requires customer session with `User.role === ADMIN`
- [x] Non-admins redirected to `/app`; guests to login dialog

## Phase 1 — Store UX ✅

- [x] Hide Stock / Sold labels on product cards + duration picker (stock still gates purchase)
- [x] Landing `/` uses same `BannerCarousel` + `getActiveBanners` as `/app` home
- [x] Removed Live Buy notification popup (component + `/api/live-buys`)

## Phase 2 — Auth & Security ✅

- [x] Google Account login + verification (OAuth; requires Google `email_verified`; links/creates user)
- [x] Two-Factor Authentication (TOTP + backup codes; login challenge; profile setup/disable)

## Phase 3 — Engagement ✅

- [x] Top Customer Leaderboard (`/app/leaderboard` — spend from FULFILLED/PAID orders)
- [x] Haptic feedback + success/error sounds (`src/lib/feedback.ts`; mute on profile)
- [x] Premium tap interaction feedback (press scale 0.97 + soft UI click + light haptic; `InteractionFeedbackProvider` + `useInteractionFeedback`; CSS `.pressable`; profile mute)

## Phase 4 — Trust & Support ✅

- [x] Customer Ratings & Reviews — 5-star `ProductReview` + verified buyer badge (PAID/FULFILLED only)
- [x] AI live support chat — FAB + panel; FAQ/builtin knowledge; optional OpenRouter
- [x] Keyword support router — DB `SupportRoute` scoring + buttons; replace FAQ/OpenAI chat engine
- [x] Support tickets — `SupportTicket` + admin Support chats desk (`/admin/tickets` Drawer ↔ user inbox) + optional Discord webhook
- [x] Admin support training — `/admin/support-routes` Dialog CRUD for keywords/replies/buttons
- [x] Support AI live context — catalog + user wallet/orders/deposits/purchases; intent buttons on AI/fallback
- [x] Support inbox — persist chat; close keep/clear; unread FAB; admin + notifications as messages; Telegram-style Drawer (MessageScroller) on customer FAB + admin desk
- [x] Button-only support bot — `SupportBotStep` tree; Settings CRUD; Lucide FAB; notifications inbox; remove AI/admin live-chat desk

## Phase 5 — AI-OS sync ✅

- [x] Sync `.ai-os` STATUS / features / todo / routes / architecture / system-prompt for Phases 1–5
- [x] Docs audit 2026-07-19 — Coming soon vs live routes; `.cursorrules` roles/support/stack

## Backlog

- [x] Payment API keys admin — Settings Dialog for Binance / RamaShop QRIS / Cashfree (`payment-provider-config.ts`, DB first + env fallback)
- [x] `/app/keys` data table (multi-select, copy, .txt download, hide, pagination, newest-first)
- [x] Order success + cart/checkout loading polish (hydration-safe; no empty-cart flash after pay)
- [x] Re-enable admin Banners workspace (CRUD + image upload → `/app` carousel)
- [x] Re-enable admin Promos workspace (full Add/Edit Dialog + list; notify on save)
- [x] Promo apply rules — date+time window; audience gate; scoped product/duration discount; per-user unit cap at cart + checkout
- [x] Re-enable admin Categories / Products / Keys / Key Check (folder categories, product Dialog + durations with user/reseller/buy prices, key import review, exact key-check)
- [x] Admin Reviews workspace (approve / edit / disable / delete; customer submit → PENDING; admin post-as-buyer → APPROVED)
- [x] Admin Overview / Statistics / History / Analytics (hierarchical KPIs, Recharts + shadcn Chart, multi-kind history Dialog)
- [x] Re-enable admin Flash Sale workspace (Add/Edit Dialog; GLOBAL / PRODUCT / DURATION scopes; notify on save; checkout flash pricing)
- [x] Flash sale storefront — date+time windows; product countdown ticker; cart/checkout flash prices + `/api/flash-sales/quote`
- [x] Storefront special-offer banner — admin `showBanner` on Flash Sale / Promo; countdown card + optional promo code copy; SiteFooter compact premium bar (brand · nav · socials · ©) on public + `/app` home
- [x] Re-enable admin FAQs workspace + public `/faq` (footer, profile help row, support chips/match)
- [x] Re-enable admin Orders workspace (audience/status filters, paginated list, detail Dialog; `/[id]` → `?id=`)
- [x] Re-enable admin Static pages workspace + public `/pages/[slug]` (footer + profile rows)
- [x] Deposit lifecycle + cron (expiresAt, cancel/proof APIs, race-safe approve, `/api/cron/deposits/poll` + `DepositCronRun`)
- [x] Re-enable admin Deposits workspace
- [x] Live deposit rails: Cashfree INR (UPI+card) · RamaPay QRIS · Binance · eSewa NPR (providers + webhook + waiting page)
- [x] Re-enable admin Site Config workspace (brand/SEO, theme colours light+dark, logo/favicon/OG upload)
- [x] Admin Icons desk (`/admin/icons` — replaceable site PNG pack; Dialog upload/reset; wired to admin/customer nav, cart, support FAB, deposit logos)
- [x] Admin Cron desk (`/admin/cron` — job health, Run now Dialog, paginated deposit cron history)
- [x] Re-enable remaining admin feature workspaces (swap Coming soon → live UI per route):
  - Reports
  - Broadcast
- [x] Customer `/app/broadcast` (active pinned bubbles) + `/app/reports` (KEY/DEPOSIT submit-only tickets)
- [x] Referral / tasks business rules (`/app/referral` hub + optional register `referralCode` / `?ref=` invites; Tasks Coming soon)
- [x] Progressive native-app loading (route skeletons, Suspense store home, catalog/keys/history page+Load more, streamed sidebar stats)
- [x] Global visual foundation phase 1 (live wave blur background, aurora/neon layers, floating glow blobs, glass overlays, native/fallback page transitions, premium skeleton shimmer)
- [x] Store product cards — Demo + Buy CTAs (Cart removed); per-product `demoUrl` + admin Default demo (`default_product_demo_url`)
- [x] Store product cards premium 3D + Neo Glow; SiteFooter info + Site Config social URLs
- [x] Auth dialog redesign (login title **DRIP CLIENT OFFICIAL**) + Google Sign-In polish (env-gated)
- [x] Profile hero-first premium 3D flowing stage + glass account panels
- [x] Role rename + wholesale pricing (`USER`/`SELLER`/`RESELLER`/`ADMIN`; Seller+Reseller share `resellerPrice`; migrate script; Become Seller / `/admin/sellers`)
- [x] Admin Special prices (`/admin/special-prices` — any user by username; per-duration exact USD; flash/promo skipped; `UserSpecialPrice` + permanent `UserSpecialPriceHistory`)
- [x] Admin activity Logs (`/admin/logs` — `ActivityLog`; login→purchase audit; 7-day auto-purge via deposit cron)
- [x] Live payment providers (Cashfree / RamaPay QRIS / Binance / eSewa) — ported; needs `CASHFREE_*` env keys on VPS
- [x] Deposit methods admin — per-rail on/off + Binance/eSewa manual QR upload (Settings Dialog → `/uploads/deposits/`)
- [x] Manual deposit flow — dynamic admin methods (account/QR/logo); customer amount → Dialog → required screenshot → admin approve; `/admin/deposits` paginated queue + inline proof preview
- [x] Manual deposit method logos — Settings upload or Icons desk pack pick (`iconUrl` / `iconKey`); `deposit-manual` site icon; customer chips use logos
- [x] Manual deposit currency name + symbol — admin-editable per method; customer amount UI uses them (defaults per USD/INR/IDR/NPR)
- [x] Deposit currency registry — admin Add currency (code/name/symbol/rate); mins + quick amounts follow registry; manual methods gated to registered codes only; `Deposit.payCurrency` String
- [x] Banned-user hardening — `banReason`; ban revokes API keys; deposit credit hold while banned; admin Approve/Recheck gated

## Coming soon (deferred track)

- [x] Seller / Reseller hierarchy (`SELLER`/`RESELLER`, `/app/seller`, private seller LB, dual referral percents, Become a Seller application)
- [x] Platform API (pay-as-you-use) — `/api/v1` + `/app/development` (1 credential) + public `/developers` docs + `/admin/seller-api`; developer margin on purchases; apiCodes; rate limits; `db:enforce-single-api-key`
- [x] Platform API pro UI rebuild — admin Developers/Keys/Calls/Margin pagination; user credential hub; docs Auth 1-key callout
- [x] Platform API simplify + secure + GitLab-style `/developers` — flat SKUs, role price, Idempotency required, orders list, docs left-nav reference
- [x] GitBook-style `/developers` — full route demos (request/success/error), AI prompt packs (full/wire/lang), downloadable SDKs + OpenAPI (`/api/v1/sdk/[lang]`, `/openapi.json`, `/ai-prompt`)
- [ ] Multi-language auto-translate (default pt-BR)

---

- [x] Boot splash screen with centered Drip logo (hides after auth hydrate)
- [x] Install as app (PWA) — manifest + SW + Install banner/menus/profile + iOS help
- [x] Customer Account History (`/app/history` — orders / deposits / wallet activity)
- [x] APK native polish 1.0.4 — monochrome adaptive icon, Capacitor Haptics gate, network_security_config, cold+mid-session offline, faster splash/cache
- [x] Release APK site download 1.0.5 — signed build → `public/downloads/DRIP-CLIENT-OFFICIAL.apk`; Android Install/Download actions use APK; iOS/desktop stay on PWA
- [x] Premium system status screens — maintenance gate + `/maintenance` / `/banned` / `/session-expired`; premium 404/error; PWA SW v2 + `/offline.html`; web OfflineBanner
- [x] Telegram channel notifications — Settings Dialog (master + per-event on/off, bot token, chat IDs from post links); Bot API push; Test verifies channel admin; hooks on register/deposit/purchase/**premium**/reseller/report/referral/apiKey/broadcast
- [x] Optional product versions — `Duration.version`; admin Dialog; ProductSheet version-first when ≥2 versions; cart/order/API labels
- [x] Gift codes (USD) — admin create (open / user-locked) + claimer details desk; customer claim tab; deposit entry; wallet `GIFT_CODE` credit

---

## Current Execution Pointer

**Done (session):** QRIS Payment Auto-Polling & Instant Status Verification System — resolved automatic verification and webhook-dependency issues for QRIS deposits:
1. Enhanced AutoGoPay status client ([`src/lib/autogopay.ts`](file:///home/kscoder/dripclientofficial.dev/src/lib/autogopay.ts)) to accept both `transaction_id` and `order_id`, defensively parse multiple gateway status formats (`paid`, `success`, `settlement`, `completed`, `berhasil`), parse `paidAmount`, and handle HTTP errors gracefully without unhandled rejections.
2. Updated QRIS adapter ([`src/lib/deposit-providers/qris.ts`](file:///home/kscoder/dripclientofficial.dev/src/lib/deposit-providers/qris.ts)) to pass both IDs to `checkAutogopayStatus`, respect verified amounts, and auto-credit or fail accurately.
3. Added `DepositMethod.QRIS` auto-recheck to `/api/deposits/[id]/status` ([`src/app/api/deposits/[id]/status/route.ts`](file:///home/kscoder/dripclientofficial.dev/src/app/api/deposits/[id]/status/route.ts)) so the 5s frontend polling loop actively queries AutoGoPay live status and immediately triggers wallet credit on payment confirmation without depending on incoming webhooks.
4. Upgraded `/api/deposits/[id]/verify` ([`src/app/api/deposits/[id]/verify/route.ts`](file:///home/kscoder/dripclientofficial.dev/src/app/api/deposits/[id]/verify/route.ts)) to handle QRIS verification with customized, user-friendly responses.
5. Added high-tech "Auto-Polling & Instant Verify" card with a live pulsating status indicator and 1-tap "Verify Payment" button to the QRIS payment waiting screen ([`src/components/app/deposit-waiting-view.tsx`](file:///home/kscoder/dripclientofficial.dev/src/components/app/deposit-waiting-view.tsx)) for Binance-grade UX.
6. Verified with zero TypeScript errors and successful Next.js production build.

**Prior (session):** S-Tier Platform API Documentation & Interactive Portal UI Upgrade — redesigned and upgraded the public Developer API portal ([`src/components/developers/developers-docs-view.tsx`](file:///home/kscoder/dripclientofficial.dev/src/components/developers/developers-docs-view.tsx), [`src/components/developers/developers-docs-view.module.css`](file:///home/kscoder/dripclientofficial.dev/src/components/developers/developers-docs-view.module.css), [`src/lib/seller-api/docs-catalog.ts`](file:///home/kscoder/dripclientofficial.dev/src/lib/seller-api/docs-catalog.ts)). Built:
1. High-tech hero header with live latency, idempotency, microcents precision, and 0% VIP fee metric badges, quick search, and quick action buttons.
2. Interactive Real-Time Microcents ↔ USD Calculator tool embedded directly in the Money section.
3. Complete Webhooks Architecture Guide & Event Schema (`order.fulfilled`, HMAC-SHA256 signature verification).
4. Interactive multi-language endpoint cards with two-column preview (Request/Success/Error tabs + live code snippets for cURL, Python, Node.js, PHP, and Go with 1-click copy).
5. Postman-grade browser Live Playground with method & path selectors, auth token toggle, dynamic parameters, JSON body formatter, live execution latency meter (`ms`), HTTP status badges, and syntax-highlighted response viewer.
6. Enriched error matrix with `PRODUCT_MAINTENANCE`, `PRICE_MISSING`, etc.
7. Verified with successful Next.js production build.

**Prior (session):** API Access Restricted to Seller & Reseller Accounts — updated sidebar navigation ([`src/components/app/customer-sidebar.tsx`](file:///home/kscoder/dripclientofficial.dev/src/components/app/customer-sidebar.tsx)) to completely hide the "Development" section (Platform API & Docs) for normal `USER` accounts, showing it exclusively for `SELLER`, `RESELLER`, and `ADMIN` roles. Updated route handlers ([`src/app/app/development/page.tsx`](file:///home/kscoder/dripclientofficial.dev/src/app/app/development/page.tsx), [`src/app/app/api/page.tsx`](file:///home/kscoder/dripclientofficial.dev/src/app/app/api/page.tsx)) to redirect normal users to `/app`. Hardened backend validation in [`src/lib/seller-api/keys.ts`](file:///home/kscoder/dripclientofficial.dev/src/lib/seller-api/keys.ts), [`src/lib/seller-api/auth.ts`](file:///home/kscoder/dripclientofficial.dev/src/lib/seller-api/auth.ts), and [`src/lib/seller-api/settings.ts`](file:///home/kscoder/dripclientofficial.dev/src/lib/seller-api/settings.ts) with `user: false` default in `api_allowed_roles`. Updated database setting, revoked legacy active keys for normal users, updated [`src/components/app/premium-view.tsx`](file:///home/kscoder/dripclientofficial.dev/src/components/app/premium-view.tsx) and [`src/components/app/development/development-view.tsx`](file:///home/kscoder/dripclientofficial.dev/src/components/app/development/development-view.tsx), and verified with a clean production build.

**Prior (session):** One-Click All Sellers Batch Management System — created comprehensive backend library ([`src/lib/admin-bulk-sellers.ts`](file:///home/kscoder/dripclientofficial.dev/src/lib/admin-bulk-sellers.ts)) and admin API route ([`src/app/api/admin/sellers/bulk-action/route.ts`](file:///home/kscoder/dripclientofficial.dev/src/app/api/admin/sellers/bulk-action/route.ts)) supporting targeted batch updates across `SELLERS`, `RESELLERS`, or both. Built feature-rich, dark-theme `AdminBulkSellersDialog` component ([`src/components/admin/sellers/admin-bulk-sellers-dialog.tsx`](file:///home/kscoder/dripclientofficial.dev/src/components/admin/sellers/admin-bulk-sellers-dialog.tsx)) with real-time target audience preview statistics (active, banned, premium, verified, wallet balances), and seamless 1-click actions: Capabilities batch toggles (Create/Manage/Fund sub-resellers), Platform API & Self-Serve Deposits controls, Lifetime Premium & Email Verification perks, Mass Wallet Credit/Debit with ledger transactions, Mass Ban/Unban with reason & API key revocation, and direct in-app inbox & Web Push broadcast announcements. Integrated into both the Reseller desk ([`src/components/admin/resellers/resellers-workspace.tsx`](file:///home/kscoder/dripclientofficial.dev/src/components/admin/resellers/resellers-workspace.tsx)) and Accounts desk ([`src/components/admin/users/admin-users-workspace.tsx`](file:///home/kscoder/dripclientofficial.dev/src/components/admin/users/admin-users-workspace.tsx)) with full `ActivityLog` and Telegram admin notifications.

**Prior (session):** Category Lucide React Icon Selector & Save System — added `icon` field to `Category` Prisma schema ([`prisma/schema.prisma`](file:///home/kscoder/dripclientofficial.dev/prisma/schema.prisma)), created comprehensive Lucide React category icon registry and resolver helper ([`src/lib/category-icons.ts`](file:///home/kscoder/dripclientofficial.dev/src/lib/category-icons.ts)), built searchable and grouped `CategoryIconPicker` modal component ([`src/components/admin/categories/category-icon-picker.tsx`](file:///home/kscoder/dripclientofficial.dev/src/components/admin/categories/category-icon-picker.tsx)), updated Admin Category Dialog ([`src/components/admin/categories/admin-category-dialog.tsx`](file:///home/kscoder/dripclientofficial.dev/src/components/admin/categories/admin-category-dialog.tsx)) and Workspace ([`src/components/admin/categories/categories-workspace.tsx`](file:///home/kscoder/dripclientofficial.dev/src/components/admin/categories/categories-workspace.tsx)) with live icon previews and badges, updated Admin Category APIs ([`src/app/api/admin/categories/route.ts`](file:///home/kscoder/dripclientofficial.dev/src/app/api/admin/categories/route.ts), [`src/app/api/admin/categories/[id]/route.ts`](file:///home/kscoder/dripclientofficial.dev/src/app/api/admin/categories/[id]/route.ts)) with Redis cache invalidation, and dynamically connected storefront category tabs ([`src/components/catalog/category-tabs.tsx`](file:///home/kscoder/dripclientofficial.dev/src/components/catalog/category-tabs.tsx)).

**Prior (session):** Supplier-Linked Products Out-of-Stock Alert Fix — updated order fulfillment stock monitor in [`src/lib/orders.ts`](file:///home/kscoder/dripclientofficial.dev/src/lib/orders.ts) to verify whether purchased product durations are linked to an upstream supplier (`supplierProductId != null`). Out-of-stock Telegram alerts (`adminUpdate`) are now exclusively triggered for manual local stock items when `AVAILABLE` keys reach 0, completely eliminating unnecessary out-of-stock alerts for supplier-backed items.

**Prior (session):** Real-Time Pending & Unread Count Badges in Customer & Admin Sidebars — added dynamic, real-time pending & unread badges across user console ([src/components/app/customer-sidebar.tsx](file:///home/kscoder/dripclientofficial.dev/src/components/app/customer-sidebar.tsx)) and admin console ([src/components/admin/admin-sidebar.tsx](file:///home/kscoder/dripclientofficial.dev/src/components/admin/admin-sidebar.tsx)). Expanded `ConsoleNav` badge design system with `destructive` (rose glow) and `success` (emerald glow) tones ([src/components/layout/console-nav.tsx](file:///home/kscoder/dripclientofficial.dev/src/components/layout/console-nav.tsx)). Backend count engine in [src/lib/sidebar-stats.ts](file:///home/kscoder/dripclientofficial.dev/src/lib/sidebar-stats.ts) calculates `CustomerSidebarBadges` (pending deposits, active issue reports, unread notifications) and `AdminSidebarBadges` (pending deposits, open reports, pending reviews, pending seller applications, pending dev settlements, pending premium settlements, pending special stock settlements, pending orders). Seamlessly integrated into customer `/api/auth/me` 5s live session sync ([src/app/api/auth/me/route.ts](file:///home/kscoder/dripclientofficial.dev/src/app/api/auth/me/route.ts), [src/components/auth/auth-provider.tsx](file:///home/kscoder/dripclientofficial.dev/src/components/auth/auth-provider.tsx)) and admin live polling via new endpoint [src/app/api/admin/sidebar-stats/route.ts](file:///home/kscoder/dripclientofficial.dev/src/app/api/admin/sidebar-stats/route.ts) and [src/components/admin/admin-shell.tsx](file:///home/kscoder/dripclientofficial.dev/src/components/admin/admin-shell.tsx).

**Prior (session):** Comprehensive Issue Reports & Telegram Notifications — enhanced `IssueReport` handling across backend ([src/lib/issue-reports.ts](file:///home/kscoder/dripclientofficial.dev/src/lib/issue-reports.ts)), customer hub ([src/components/app/reports-view.tsx](file:///home/kscoder/dripclientofficial.dev/src/components/app/reports-view.tsx)), and admin panel ([src/components/admin/reports/reports-workspace.tsx](file:///home/kscoder/dripclientofficial.dev/src/components/admin/reports/reports-workspace.tsx)). For **KEY** reports: resolves and displays exact license key code (with copy button), product title, duration label, order ID, key ID, exact purchase/delivery timestamp, customer explanation, screenshot, and reported timestamp in both the admin reports desk and Telegram channel notifications. For **DEPOSIT** reports: resolves and displays deposit ID, USD amount, local requested amount & currency, payment rail/method, status, fail reason, deposit creation timestamp, original proof screenshot, customer explanation, and reported timestamp in both admin reports desk and Telegram channel notifications.

**Prior (session):** Web Push Optimization & Real-Time Event Triggers — corrected default notification icon & badge to valid `/pwa/icon-192.png` asset ([src/lib/web-push.ts](file:///home/kscoder/dripclientofficial.dev/src/lib/web-push.ts)), improved Service Worker URL resolution in `notificationclick` ([public/sw.js](file:///home/kscoder/dripclientofficial.dev/public/sw.js)), prevented duplicate web pushes during admin broadcasts via `skipWebPush` flag ([src/lib/notifications.ts](file:///home/kscoder/dripclientofficial.dev/src/lib/notifications.ts), [src/app/api/admin/broadcast/route.ts](file:///home/kscoder/dripclientofficial.dev/src/app/api/admin/broadcast/route.ts)), wired real-time user web push notifications for wallet deposit confirmations ([src/lib/deposit-credit.ts](file:///home/kscoder/dripclientofficial.dev/src/lib/deposit-credit.ts)), key fulfillment/order delivery ([src/lib/orders.ts](file:///home/kscoder/dripclientofficial.dev/src/lib/orders.ts)), and support issue report status updates ([src/lib/issue-reports.ts](file:///home/kscoder/dripclientofficial.dev/src/lib/issue-reports.ts)), and added push subscription stats endpoint ([src/app/api/admin/push/broadcast/route.ts](file:///home/kscoder/dripclientofficial.dev/src/app/api/admin/push/broadcast/route.ts)).

**Prior (session):** Redis Fast Local Logging, MongoDB 512MB Space Safety, Smart Fallback & Instant Telegram Alerts — implemented high-performance Redis logging client ([src/lib/redis.ts](file:///home/kscoder/dripclientofficial.dev/src/lib/redis.ts)) with `<1ms` non-blocking activity log stream (`LPUSH` + `LTRIM` 5,000 items + 7-day TTL), 100% space-safe MongoDB cap & 7-day auto-purge ([src/lib/activity-log.ts](file:///home/kscoder/dripclientofficial.dev/src/lib/activity-log.ts)), smart zero-loss Redis fallback queue (`drip:logs:mongo_fallback_queue`) with automatic cron drain ([src/lib/deposit-cron.ts](file:///home/kscoder/dripclientofficial.dev/src/lib/deposit-cron.ts)), and instant rich Telegram database/server alerts ([src/lib/system-alert.ts](file:///home/kscoder/dripclientofficial.dev/src/lib/system-alert.ts)) with 60-second Redis throttling across checkout, deposit credit, cron, and activity logs.

**Prior (session):** Supplier Catalog 10-Minute Auto-Refresh & Insufficient Balance Out-of-Stock Protection — updated supplier catalog TTL to 10 minutes (`SUPPLIER_CATALOG_CACHE_TTL_MS = 10 * 60 * 1000` in [src/lib/supplier/catalog-cache.ts](file:///home/kscoder/dripclientofficial.dev/src/lib/supplier/catalog-cache.ts)), added supplier balance caching (`getCachedSupplierBalance` / `setCachedSupplierBalance` / `SETTING_KEYS.supplierBalanceCache`), gated supplier stock calculation (`getSupplierStockInfoMap` & `getEffectiveStockByDuration` in [src/lib/supplier/stock.ts](file:///home/kscoder/dripclientofficial.dev/src/lib/supplier/stock.ts)) so that whenever the upstream supplier balance is insufficient to purchase an item (or balance <= 0), the item automatically shows as out of stock on the storefront to prevent user confusion, and updated [src/lib/supplier/resolve-key.ts](file:///home/kscoder/dripclientofficial.dev/src/lib/supplier/resolve-key.ts) to fallback to local stock directly when supplier balance is insufficient and sync `new_balance` on generate.

**Prior (session):** Special Stock Inventory & Developer Settlement Isolation System — created dedicated Admin workspace at `/admin/special-inventory` ([src/app/admin/(panel)/special-inventory/page.tsx](file:///home/kscoder/dripclientofficial.dev/src/app/admin/(panel)/special-inventory/page.tsx)) and component ([src/components/admin/special-inventory/special-inventory-workspace.tsx](file:///home/kscoder/dripclientofficial.dev/src/components/admin/special-inventory/special-inventory-workspace.tsx)), backend library ([src/lib/special-inventory.ts](file:///home/kscoder/dripclientofficial.dev/src/lib/special-inventory.ts)), and API ([src/app/api/admin/special-inventory/route.ts](file:///home/kscoder/dripclientofficial.dev/src/app/api/admin/special-inventory/route.ts)). Added `isSpecialInventory` and `specialBatchTag` fields to `Key` model in Prisma, tagged all 144 matched keys, isolated developer settlements (`src/lib/developer-settlements.ts`) and admin statistics profit split (`src/lib/admin-stats.ts`) so that all special inventory sales are 100% excluded from developer commissions (0% dev share), and added "Special Stock" nav link to Admin sidebar.

**Prior (session):** FamGateway INR UPI Integration & Webhook Verification — integrated `https://famgateway.in/docs.php` for seamless 0-fee UPI deposits. Replaced Cashfree with FamGateway in `upiDepositProvider` ([src/lib/deposit-providers/upi.ts](file:///home/kscoder/dripclientofficial.dev/src/lib/deposit-providers/upi.ts)), created [src/lib/famgateway.ts](file:///home/kscoder/dripclientofficial.dev/src/lib/famgateway.ts) (dynamic order generation, QR payload, deep intent link `upi://pay?...`, verify-order API check), created secure webhook listener [src/app/api/webhooks/famgateway/route.ts](file:///home/kscoder/dripclientofficial.dev/src/app/api/webhooks/famgateway/route.ts) with `X-FamGateway-Signature` HMAC-SHA256 verification and automatic deposit crediting, and added FamGateway API Key configuration to Admin Settings ([src/components/admin/settings/settings-workspace.tsx](file:///home/kscoder/dripclientofficial.dev/src/components/admin/settings/settings-workspace.tsx)).

**Prior (session):** Migration API Auto Seller Reseller Permissions — updated [src/app/api/internal/migration/route.ts](file:///home/kscoder/dripclientofficial.dev/src/app/api/internal/migration/route.ts) so that when a user receives/syncs the `SELLER` role via migration, `canCreateResellers: true`, `canManageResellers: true`, and `canFundResellers: true` (along with `depositsEnabled: true`) are automatically granted on their account.

**Prior (session):** Product Maintenance Mode — added `isMaintenance` boolean to `Product` Prisma model (`isMaintenance Boolean @default(false)`), updated admin `/admin/products` dialog with a **Maintenance Mode** toggle switch and list row badge (`Maintenance`), updated storefront product cards (`ProductCard`) with a frosted backdrop-blur overlay badge ("MAINTENANCE") and disabled Buy & Demo buttons, added a backdrop-blur warning alert in `ProductSheet` with disabled purchase controls, and enforced backend order protection blocking purchases in `/api/checkout` and `/api/v1/orders`.

**Prior (session):** Admin direct custom guest reviews — updated `ProductReview` schema (optional `userId`, `customAuthorName`, `customAvatarUrl`), `adminCreateReview` lib & API, `AdminCreateReviewDialog` with Author Mode switch (Custom Author with display name + avatar + Verified Buyer badge toggle vs Registered Buyer), and safe null-user handling across admin and storefront views.

**Prior (session):** Admin customizable Device Bound ID label (`Duration.deviceIdName`, default `"Android ID"`); admin Product Dialog Duration field; dynamic customer UI (ProductSheet, Cart, Checkout, Order details).

**Prior (session):** GitBook-style `/developers` — full Request/Success/Error demos for every `/api/v1` route; AI prompt packs (full / wire / lang) with copy + `.md` download; SDK starters (Python/Node/PHP/Go/cURL) + OpenAPI 3.1; endpoint search + right “On this page” rail.

**Prior (session):** Gift codes store kill-switch — Settings → **Pages enable** Dialog (`pages_enabled` JSON; `giftCodes` default **off**); hides customer nav/deposit entry; claim API blocked; admin desk warns when off.

**Prior (session):** Gift codes — admin creates USD wallet redeem codes (optional username lock, else first claimer); customer `/app/gift-codes` claim + history; deposit page Gift code entry; admin `/admin/gift-codes` desk with claimer details; `GiftCode` + `TransactionType.GIFT_CODE`.

**Prior (session):** Optional product versions — `Duration.version` (default `""`); unique `(productId, version, label)`; admin Duration Dialog Version field; ProductSheet version-first when ≥2 versions; cart/order labels `Lite · 1 Day`; Platform API SKU `version` + name.

**Prior (session):** Reseller self-serve deposits — `User.depositsEnabled` (resellers default off / opt-in); admin Users Dialog toggle for any account; deposit API/UI + nav gated; create-reseller sets false; backfill `npm run db:backfill-reseller-deposits`.

**Prior (session):** Shares & margins Settings — admin Dialog for order developer share %, Premium developer share %, supplier buy price % (AppSetting; wired to Development / Premium settlements / Statistics / Products catalog fill).

**Prior (session):** Premium Telegram channel + Premium settlements — Settings `premium` event; `notifyTelegram` on wallet unlock; `PremiumSettlementDay` + `/admin/premium-settlements` (50% share, mark paid); AI-OS maps synced.

**Prior (session):** Platform API simplify + secure + GitLab-style docs — flat SKU `items[]`, role/single price (public=retail), `sku` + required `Idempotency-Key`, orders list (no keys) + `keys[]` on create/detail, `/developers` left-nav reference.

**Prior (session):** Fix Android Google login — Custom Tabs completed OAuth in Chrome so the session cookie never reached the WebView; signed OAuth state + `dripclient://oauth` → `GET /api/auth/native-handoff` sets the cookie in-app. APK **v1.0.8** built + site deployed.

**Prior (session):** Special prices — interactive **Active specials** list on `/admin/special-prices` (tap row → Dialog change/clear); `GET ?active=1` paginated live overrides; History Dialog remains audit-only.

**Prior (session):** Banned-user hardening — `User.banReason` (admin Dialog confirm + edit); ban revokes ACTIVE API keys; deposit credit blocked for banned (`completeDepositOnce` / Approve / Recheck); seller reseller ban also revokes keys.

**Prior (session):** Special prices — permanent history (`UserSpecialPriceHistory`) for SET/UPDATE/CLEAR; History Dialog on `/admin/special-prices` (per-user or all; action filters + Load more); also ActivityLog ADMIN entries.

**Prior (session):** Soft-delete users (orders stay linked via `userId`) + product Delete archives when sold history exists (purges AVAILABLE/DISABLED stock only).

**Prior (session):** Maintenance — AuthDialog login/register show proactive warning Alert (`auth-maintenance-notice.tsx`); register submit locked; dialog description updated.

**Prior (session):** Admin Users desk — Delete user (now soft-delete; history kept).

**Prior (session):** Maintenance — Google login/register fully blocked (status hides button; OAuth start/callback reject before upsert).

**Prior (session):** Maintenance mode — force-logout non-admins, pinned landing banner only, `/api/maintenance/enter` + `drip_maintenance` cookie (fixes `/` ↔ `/app` too-many-redirects).

**Prior (session):** Supplier catalog → duration buy cost auto-fills at **50% off** supplier list price (partner discount).

**Prior (session):** Supplier desk polish — transparent admin pipeline, summary + duration mappings on catalog API, grouped catalog with mapped badges, richer call-log Dialog.

**Prior (session):** Supplier catalog UX — parse full `groups`/`products` catalog envelope; Products duration Dialog searchable grouped Select when catalog cached; Supplier desk shows group/validity/stock.

**Prior (session):** Upstream **Supplier API** hybrid fulfill — master on/off + API key at `/admin/supplier`; per-duration `supplierProductId`; checkout/Platform API try `generate.php` then local inventory fallback; full request/response `SupplierApiLog` history for API-owner support.

**Prior (session):** Referral rewards — **three role rates** (User / Seller / Reseller) by **buyer role** on fulfill; admin Settings Dialog + `/app/referral` show all three; fixed seller/reseller note + RESELLER no longer got User %.

**Prior (session):** Admin Settings **Seller program** — added **child reseller create funding min** (`reseller_create_min_funding`, default $5); enforced on Seller/Admin create APIs + create Dialogs; apply-min field kept separate.

**Version 1.0:** **Shipped** — product + admin + APK + VPS deploy deliverable ready (`README.md`, `setup.sh`, `./deploy.sh`, cron helper).

**Optional QA:** Device check — uninstall old app, download **https://dripclientofficial.dev/downloads/DRIP-CLIENT-OFFICIAL-v1.0.7.apk**, confirm version **1.0.7**, splash/launcher = Site Config logo.

**Post-v1 backlog:** Multi-language auto-translate (default pt-BR).

**Prior (session):** v1.0 launch packaging — README deliverable, package `1.0.0`, deploy health check, nginx + cron scripts, AI-OS launch sync; full VPS rebuild + GitHub push.

**Prior:** Admin **Logs** desk (`/admin/logs`) — `ActivityLog` from login through purchases; category filters + paginated infinite scroll; **7-day retention** with auto-purge on deposit cron (+ opportunistic on write).

**Prior:** Admin Settings **Payment API keys** Dialog — Binance / RamaShop (QRIS) / Cashfree credentials in AppSetting (`payment-provider-config.ts`, DB first + env fallback); deposit providers read admin values.

**Prior:** Admin **Special prices** desk (`/admin/special-prices`) — username search → any user → product durations Dialog; `UserSpecialPrice` model; exact USD overrides beat role tier; flash/promo skipped on those lines (checkout, cart quote, promo validate, Platform API).

**Prior:** Seeded live Mongo content — support bot (30 steps), FAQs (26), static policies (6). Scripts: `db:seed-support-bot` · `db:seed-faqs` · `db:seed-pages`.

**Prior:** AI-OS launch docs synced; git repo updated for v1. Prior: APK “still old D” root cause — density `splash_logo` leftovers + Cloudflare/static cache on `public/downloads`; moved APK to `releases/`, route `no-store` + versioned URL, CF `BYPASS`.

**Prior:** Telegram channel notifications — admin Settings → Telegram notifications Dialog; AppSetting `telegram_notifications`; `src/lib/telegram-notify.ts`; event hooks; `POST /api/admin/settings/telegram-test`.

**Prior:** Deposit currency registry — admin **Currencies & rates** Add currency (code/name/symbol/1 USD=rate); mins + quick amounts follow registry; manual methods Select only registered codes; `Deposit.payCurrency` String; cannot delete currency in use / locked USD·INR·IDR.

**Prior:** Manual deposit method logos — `iconUrl` / `iconKey` on `manual_deposit_methods`; Settings Dialog upload or pick Icons desk deposit pack; customer chips/dialog/waiting use logos; new `deposit-manual` site icon.

**Prior:** Broadcast + Issue Reports — Prisma `Broadcast` / `IssueReport`; customer `/app/broadcast` + `/app/reports`; admin desks live (Coming soon removed); optional notify on publish; deposit screenshot required / key screenshot optional.

**Prior:** Storefront special-offer banner + SiteFooter redesign — `FlashSale`/`PromoCode.showBanner` admin toggle; flash banner description + optional display promo code; `FlashOfferBanner` on `/` + `/app` (countdown + copy code); richer footer (brand/socials/quick links/payment/contact); footer also on `/app` home.

**Prior:** Stock + keys live sync — checkout rollback releases claimed keys; repaired 1 orphaned SOLD key on FAILED orders; catalog stock via `_count` AVAILABLE; `POST /api/stock/quote`; cart/checkout stock gate; product sheet live stock; `/app/keys` force-dynamic + 5s/focus poll.

**Prior:** APK native polish **v1.0.4** — adaptive + monochrome icon; Capacitor Haptics gate fix; `network_security_config` HTTPS-only; cold-start offline + mid-session `NativeOfflineBanner`; shorter splash + versioned cache clear + WebView `LOAD_DEFAULT`.

**Prior:** Store catalog — admin **Pin to top** + **Best seller** Dialog switches (`Product.isPinned` / `isBestSeller`); storefront + admin list sort **pinned → bestseller → newest**; Store section uses shared `HubHeaderBar` (parity with Keys / Deposit); PINNED card badge.

**Prior:** Manual deposit flow — `MANUAL` + `manualMethodKey` on `Deposit`; `manual_deposit_methods` AppSetting + `src/lib/manual-deposit-methods.ts`; customer `ManualDepositDialog` (required screenshot); admin Settings manual methods CRUD; `/admin/deposits` paginated queue with inline proof thumbnails + Dialog preview approve/reject.

**Prior:** Button-only support bot — `SupportBotStep` Prisma model + seed; `src/lib/support-bot.ts` navigation; Lucide FAB; customer Drawer (buttons + text fallback + notifications); admin **Settings → Support bot** Dialog CRUD; removed AI/keyword/guided flows, admin Support chats desk, Support training page; legacy `/admin/tickets` + `/admin/support-routes` redirect to settings.

**Prior:** Auth & Profile redesign — login title **DRIP CLIENT OFFICIAL**; glass AuthDialog with brand logo header; polished Login/Register + env-gated Google button (status skeleton, `next` path); `/app/profile` hero-first flowing mesh stage + glass panels (dialogs unchanged).

**Prior:** Product Details + dedicated Review System — purchase-only `ProductSheet` (larger hero + duration selection cards); compact tappable `RatingSummary` on cards + sheet opens premium Review Drawer (histogram, Newest/Highest/Lowest sort, Load more, verified write form); public reviews API `page`/`limit`/`sort` + star distribution + real `reviewCount`.

**Prior:** Store UI product cards — premium 3D glass + Neo Glow borders, contained responsive media, title typography, Premium Verified seal (`reviewCount > 0`), compact rating-only meta; SiteFooter tagline + social icons; Site Config Social links Dialog (Telegram/Discord/YouTube/X/Instagram URLs via AppSetting).

**Prior:** Global visual foundation phase 1 shipped — `LiveWaveBackground` (wave blur + aurora + blobs + radial glow), `PageTransitionShell` native View Transition progressive enhancement with fallback motion-safe enter animation, glass overlay refinements for Dialog/Sheet/Drawer, ambient wash harmonization for app/admin shells, upgraded skeleton shimmer + loader polish, and reduced-motion/mobile GPU safeguards.

**Prior:** Admin Settings currency-rate setup card+Dialog (`1 USD = INR/IDR/NPR`) wired to `/api/admin/settings` (`wallet_currency_rates`) for deposit conversion tuning; plus Premium AAA interaction feedback — global press scale (0.97 spring), soft UI click sound (Web Audio buffer), light Android haptic; `InteractionFeedbackProvider` event delegation + `feedbackTap`; wired Button/Tabs/Dropdown/Select/Sidebar/FilterChip/Switch/nav/product cards; profile mute; prefers-reduced-motion.

**Prior:** PWA install-as-app — web manifest, service worker, branded icons, Install banner + header/menu/profile actions, iOS Add to Home Screen help Dialog.

**Prior:** Rebuilt `/app/keys` list as license ticket cards (masked reveal + Copy, Select mode + sticky bulk bar); kept vault hero; dropped spreadsheet table / tanstack.

**Prior:** Dark-only theme — `forcedTheme=dark` + `html.dark`; removed ThemeToggle from site/console headers; Sonner dark; Site Config colours Dialog dark-only (light keys mirrored on save).

**Prior:** Progressive native-app loading — `/app` route skeletons; Suspense-streamed `/` + `/app` banners vs catalog; `getProductsPage` + `GET /api/products` + ProductGridFeed Load more; `getUserKeysPage` + `GET /api/keys`; history `page`/`limit`/`filter` + infinite Load more; sidebar stats Suspense-streamed (layout no longer awaits counts before children).

**Prior:** Admin Lucide nav icons (replaced SiteIcon `iconKey`); shared `ConsoleHeader` polish — Badge role, Separators, Lucide Home/PanelLeft/Menu, Lucide ThemeToggle; user-menu buttons aligned to `h-9`.

**Prior:** Admin sidebar chrome parity with `/app` — `ConsoleHeroProfile` + footer `ConsoleQuickStats` (store-wide orders / AVAILABLE keys / pending deposits via `getAdminSidebarStats`); 20rem width + safe-area footer; header titles via `consoleTitle` / `roleBadge`.

**Prior:** Advanced `/app/development` API Keys hub — KPI stats, tabbed Overview/Keys/Calls/Purchases/Webhooks, filtered recent calls + Load more, API product purchases list + detail Dialogs; `GET /api/platform-api/purchases`; overview `stats`; usage `filter`.

**Prior:** Split Development — `/app/development` API Keys only; public `/developers` (+ `/docs` redirect) with advanced docs, multi-lang copy snippets, live browser tester; sidebar section Development under Account; footer + robots/sitemap.

**Prior:** Customer Account → Development (`/app/development`) — API tab (keys/usage/webhooks) + Docs tab (endpoint reference + curl); `/app/api` redirects.

**Prior:** Platform API — Bearer `/api/v1` (catalog/pricing/stock/orders); 1% developer margin on purchases only; hashed keys + RPM; `/admin/seller-api` (role on/off, fee, margin mark-paid); Product/Duration `apiCode`; `npm run db:backfill-api-codes`.

**Prior:** Role rename + wholesale — `USER`/`SELLER`/`RESELLER`/`ADMIN`; caps `can*Resellers`; storefront/checkout use `resellerPrice` for Seller+Reseller; migrate script; `/app/become-seller` + `/admin/sellers`; JWT re-issue on `/api/auth/me`; no-hardcode admin-config rule in `.cursorrules`.

**Prior:** Fixed `/{username}` hydration — plain avatar img (no Radix AvatarBadge/Image SSR gap), `FlashSaleTicker` via `useSyncExternalStore`; moved emoji `AvatarBadge` outside Avatar on profile/premium.

**Prior:** Removed `ConsoleNav` mount/skeleton gate (was causing hydration mismatch vs real links); Premium dialogs footer + open-only form seed fixes.

**Prior:** Premium purchase sets `emailVerified`; admin `/admin/premium` desk (paginated grant/revoke + verify Dialog); Settings still holds price.

**Prior:** Public profiles at `/{username}` (no login); share links use domain/username; legacy `/app/users/[username]` redirects; reserved username blocklist.

**Prior:** Premium Account Page — `/app/premium` wallet one-time unlock (`isPremium` + `PREMIUM_PURCHASE`); moved share/customization off profile; username + vanity referral + featured products Dialogs; Premium badge on public profile; admin Settings `premium_price_usd`.

**Prior:** Profile system — Share card (copy public `/app/users/[username]` + referral invite, role/verified/privacy badges); public profile preview for owners; case-normalized username lookup; shared `getPublicProfileByUsername`; polished public view (bio, socials, seller/customer status, verified).

**Prior:** Profile customization fix — regenerated Prisma for bio/privacy/socials/border/emoji fields; `PATCH /api/auth/profile` accepts null clears + role-gated borders; polished customization Dialogs (muted header / scroll body / Switch privacy); avatar shows border ring + emoji badge.

**Prior:** Admin Cron desk — System `/admin/cron` monitors deposit poll health (24h KPIs, `CRON_SECRET` badge), Run now confirm Dialog, paginated `DepositCronRun` history + provider detail Dialog; poll logic in `src/lib/deposit-cron.ts` shared with `/api/cron/deposits/poll`.

**Prior:** Deposit methods admin — per-rail on/off (`deposit_methods` AppSetting); Binance/eSewa manual QR upload via Settings Dialog → `/uploads/deposits/`; customer chips hide disabled rails.

**Prior:** Deposit actions fixed — Refresh/Cancel clickable (z-40 solid mobile bar clear of FAB; desktop in-ticket); cancel confirm Dialog; cancel allows PROCESSING; Refresh busy state.

**Prior:** Waiting ticket — cap QR/logo PNG size; compact CompactTimer + floating actions.

**Prior:** Closed-ticket UX — humanize `cancelled_by_user` / expire codes; mute amount; hide memo/QR on CANCELLED; clearer closed banner.

**Prior:** Deposit waiting + success UI polish — richer ticket (pay-exact hierarchy, timer glow, sticky amount bar), confirming pulse, success burst + credit receipt card with balance / Shop now / Done.

**Prior:** Cashfree PG API upgrade to `2025-01-01` — hardened errors, Get Order PAID fallback, webhook v5 event sets + 401 on bad sig; env mode aligned to production keys; https return/notify upgrade for live Create Order.

**Prior:** Cashfree INR — replaced ZapUPI; Create Order + hosted checkout (UPI+card); webhook `/api/webhooks/cashfree`; cron/status recheck; `paymentSessionId` on waiting page via `@cashfreepayments/cashfree-js`.

**Prior:** UPI auto-credit fix — Mongo Prisma unset `transactionId`/`adminAction` broke credit lock (`credit_lock_active`); return handler + public `NEXT_PUBLIC_APP_URL`.

**Prior:** Deposit cron on VPS — `/home/kscoder/cron-deposits.sh` (crontab every minute) now also polls Drip `http://127.0.0.1:3102/api/cron/deposits/poll` with `CRON_SECRET`; verified ok + BINANCE/QRIS/UPI providers.

**Prior:** Live session sync — `AuthProvider` polls `/api/auth/me` every 5s + on tab focus; wallet/role/caps update in sidebar, user menu, checkout, deposit, profile; deposit waiting + support unread also 5s.

**Prior:** Referral hub live — invite link/code copy+share, network, reward history, weekly earners; Tasks marked Coming soon; optional referral code on register + `?ref=` invite prefills; `GET /api/referrals/check`.

**Prior:** Settings deposit minimums — per audience (user vs reseller) × per currency (USD/INR/IDR/NPR); deposit API + UI validate local mins (not single USD gate).

**Prior:** Admin Site Config live — Dialog-only Brand/SEO, theme colours (light+dark), logo/favicon/OG upload; applied site-wide via CSS vars + SiteConfigProvider.

**Prior:** Deposit waiting polish — receipt ticket notch, live status pill, urgency ring timer, sticky pay bar, clearer memo/QR/steps + success states.

**Prior:** Deposit UX — always-visible min (local + USD); quick amount chips start at live `deposit_min` then step up; default amount = min per method.

**Prior:** Deposit page finalized — single-card layout (4 logo chips + amount + Continue), slim resume rows + recent list; logos QRIS→Binance→INR→NPR.

**Prior:** Deposit rails ported — INR/Cashfree, QRIS/RamaPay, Binance, eSewa; waiting page; cron + webhook.

**Prior:** Deposit API lifecycle + cron — expire/cancel/proof; admin deposits desk.

**Prior:** Static pages — admin `/admin/static-pages` Dialog CRUD live; public `/pages/[slug]` + `/api/pages`; footer + profile rows below FAQ.

**Prior:** Admin Orders — paginated list with buyer audience + status filters, search, infinite load, detail Dialog (keys/token copy); `/admin/orders/[id]` redirects to `?id=`.

**Prior:** FAQs — admin `/admin/faqs` Dialog CRUD live; public `/faq` + footer + profile help row; support starter chips + FAQ match + AI live pack (`/api/faqs`).

**Prior:** Admin Support chats — scrollable paginated profile list + fixed-height Dialog chat (not full page); thread still `limit`/`before`/`after`.

**Prior:** Admin History — server `page`/`limit`/`q` + Instagram-style infinite append (skeleton / Load more); big-list “never load all at once” rule in `.cursorrules` + system-prompt.

**Prior:** Admin Development — developer settlement control at `/admin/development` (daily 10% share rows, search/pagination, Dialog mark paid; `DeveloperSettlementDay` ledger; no wallet/order side effects).

**Prior:** Admin Statistics business performance — period filter, revenue/gross profit (sale−buy)/deposit/buyers KPIs, sales vs profit chart, top product + owner/developer 10% split, product-wise rows.

**Prior:** Admin Overview control room — compact health KPIs, 7-day revenue (empty state), Needs attention queues, Latest activity deposits/orders columns; `getDashboardStats` payload reshaped.

**Prior:** Promo codes fixed — admin start/end datetime; audience + PRODUCT/DURATION scope; discount only on matching units capped by `perUserLimit` (qty 5 + uses 1 → 1 unit); validate + checkout server apply.

**Prior:** Flash sales fully wired — admin date+time windows; catalog countdown ticker + sale prices; cart/checkout flash display; `/api/flash-sales/quote` + checkout fulfill apply %.



## UI/UX visual redesign ✅ (2026-07-20)

- [x] Design tokens: elevation/glow/motion in `globals.css`
- [x] Card variants · Button gradient primary · Badge/Alert status · Dialog sizes · form h-9 align
- [x] Shared atoms: `PageHeader`, `EmptyState`, `DialogShell`, `FilterChip`
- [x] Chrome: console sidebar tokens, site footer site-config, support Drawer header
- [x] Storefront: landing hero, trust strip, product/cart/checkout/order/auth polish
- [x] Customer hub: deposit, history, keys, profile, premium, referral, development, leaderboards, seller
- [x] Leaderboard podium redesign — shared top-3 + ranked list on `/app/leaderboard` + `/app/seller/leaderboard`; Premium/Verified badges + emoji status
- [x] Admin: deposits list+Dialog actions, history/banners list conversion, desk sweep
- [x] AI-OS STATUS / architecture-map / mapping INDEX sync

## Special Stock Inventory & 50/50 Developer Settlements ✅ (2026-09-26)

- [x] Database: Added `SpecialStockSettlementDay` ledger model with `DeveloperSettlementStatus` (PENDING / PAID) & paid snapshot.
- [x] Settings & Margin: Added `specialStockDeveloperSharePercent` in `SETTING_KEYS` & `getSpecialStockDeveloperShareRate` (50% default) + Dialog control in Settings → Shares & margins.
- [x] Special Stock Daily Computation: Live calculation of daily sales, keys sold, cost, gross profit, Developer 50% Share, and Owner 50% Share from special stock batch orders.
- [x] Admin Special Inventory Hub: Upgraded `/admin/special-inventory` with dual tabs:
  - Tab 1: **50/50 Daily Settlements** (live daily profit breakdown, dev & owner shares, PENDING/PAID badges, single & batch "Mark Paid" confirmation dialog).
  - Tab 2: **Stock Inventory & Matrix** (Product/Duration matrix, filter chips, search, copy key code, and batch import dialog).
- [x] APIs: Added `GET/POST /api/admin/special-inventory/settlements` with admin auth + safe ops ledger update.
- [x] AI-OS sync: Updated mapping, routes, architecture-map, and status documentation.

## Reseller Apply 48-Hour Reminder Popup ✅ (2026-09-29)

- [x] Component: Added `src/components/layout/reseller-apply-popup.tsx` with neon dark glass aesthetic, partner invitation badge, wholesale discount perks list, and seamless direct application routing.
- [x] Schedule & Targeting: Configured 48-hour reminder interval using `localStorage` timestamp (`drip_reseller_apply_popup_last_seen`).
- [x] Audience Filter: Automatically targeted to non-reseller users (`USER` role and guests), skipping existing `SELLER`, `RESELLER`, and `ADMIN` users, as well as system status pages and active application routes.
- [x] Layout Integration: Mounted in `src/app/layout.tsx` for global store and customer hub coverage.
- [x] Profile Card: Redesigned `/app/profile` reseller application banner into a high-converting neon Partner Program Hero Card with wholesale perks, eligibility checks, min-balance notice, and deposit/apply actions.
- [x] AI-OS sync: Updated mapping `INDEX.md`, `app-become-seller.md`, `app-profile.md`, and `architecture-map.md`.

## GensPay QRIS Integration & Legacy Decommission ✅ (2026-10-08)

- [x] Decommissioned legacy QRIS providers: RamaPay/RamaShop and MGCloudPay removed from backend adapter layer, admin settings dialog, deposit methods config, and cron poller.
- [x] GensPay Core (`src/lib/genspay.ts`): Integrated `POST /transaction/create` with IDR limits (Rp 1,000–10,000,000) and generated dynamic QR PNG data URLs via `QRCode.toDataURL`.
- [x] Webhook (`src/app/api/webhooks/genspay/route.ts`): Implemented real-time webhook listener with HMAC-SHA256 signature verification (`X-GensPay-Signature`), exact amount validation, and atomic wallet crediting via `completeDepositOnce()`.
- [x] Adapter & Cron (`src/lib/deposit-providers/qris.ts` & `src/lib/deposit-cron.ts`): Updated QRIS provider adapter to use GensPay and cleaned up legacy polling/history loops.
- [x] Admin Desk (`src/components/admin/settings/settings-workspace.tsx`): Updated Payment API Keys dialog to configure GensPay API Key, Base URL, and display copyable Webhook URL (`/api/webhooks/genspay`).
- [x] API Key Trim & Aliases (`src/lib/payment-provider-config.ts`, `src/lib/genspay.ts`, `src/lib/supplier/config.ts`): Ensured all API keys/tokens are strictly trimmed of whitespace/newlines; supported fallback key aliases (`genspay_apikey`, `api_token`, `API_TOKEN_VENDOR`, `API_TOKEN`) across settings and environment.
- [x] AI-OS Sync: Updated STATUS.md, routes.md, architecture-map.md, mapping/app-deposit.md, and mapping/admin-settings.md.

## Storefront Zero-Duration Catalog Filtering ✅ (2026-10-10)

- [x] Products catalog query: Added `durations: { some: {} }` filter in `getProductsPage` and `getProductsByIds` (`src/lib/products.ts`) so storefront `/` and `/app` home never show products without durations or pricing.
- [x] Storefront API: `GET /api/products` guaranteed to never return products with empty duration lists (`durations: []`) or null starting prices.
- [x] AI-OS sync: Updated mapping `landing-home.md` and `app-home.md`.

**VPS:** pm2 `drip-client-reseller` on `:3102` — restart after schema/env changes. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` for Google sign-in. Optional Telegram notify settings in admin. Seed support bot: `npm run db:seed-support-bot` (30-step tree). Seed FAQs: `npm run db:seed-faqs` (26 Q&As). Seed legal pages: `npm run db:seed-pages` (privacy / payment / terms / refund / delivery / disclaimer). APK download: `/downloads/DRIP-CLIENT-OFFICIAL-v1.0.7.apk` (from `releases/`, not `public/`).


## Replace GensPay with AutoGoPay QRIS ✅ (2026-10-14)
- [x] `src/lib/autogopay.ts`: `POST {base}/qris/generate` (Bearer key, base `https://v1-gateway.autogopay.site`); gateway assigns `transaction_id`/`order_id` (stored as `providerDepositId`/`providerReference`).
- [x] Webhook `/api/webhooks/autogopay`: `X-Signature` = HMAC-SHA256(rawBody, apiKey); `transaction.status` PAID → credit, expire/cancel → fail.
- [x] Settings keys renamed `autogopay_api_key` / `autogopay_base_url` (re-enter key in admin; env `AUTOGOPAY_API_KEY`).

## Deposit review queue (Binance timestamp errors) ✅

- [x] Binance `-1021` / recvWindow error flags deposit `adminAction=REVIEW_TIMESTAMP` + one Telegram alert (`adminUpdate`, fallback `deposit`)
- [x] Flagged deposits skipped by cron / status poll / user Verify; admin Recheck only (24h lookback, memo/Order ID match + duplicate-reference guard)
- [x] Admin Deposits lists flagged auto deposits with "Needs review" banner
- No client clock-drift sync on purpose: time window must stay strict to avoid double credit
