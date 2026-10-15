# Drip — Architecture Map

> **Last synced:** 2026-07-24 (**Version 1 — launch ready ~99%**; APK via `releases/` + `/downloads/[file]`)

## 1. Source tree

```text
android/                          ← Capacitor Android shell (WebView → production URL)
capacitor.config.ts               ← appId, server.url, plugin config
www/                              ← minimal local shell (index.html, offline.html)
resources/                        ← icon-only.png + splash.png for @capacitor/assets
mobile-assets/                    ← source copies of PWA brand assets
scripts/android-build-release.sh  ← cap sync + Gradle assembleRelease
scripts/android-sync-adaptive-icons.sh ← foreground sync + monochrome adaptive XML
src/
├── proxy.ts
├── app/
│   ├── layout.tsx · error.tsx · global-error.tsx · not-found.tsx · globals.css · manifest.ts  ← PWA web manifest
│   ├── maintenance/page.tsx · banned/page.tsx · session-expired/page.tsx  ← premium system status screens
│   ├── api/maintenance/route.ts  ← public maintenance flag probe (+ cookie sync)
│   ├── api/maintenance/enter/route.ts  ← force-logout non-admins + stamp cookie → `/`
│   ├── (store)/                  ← Guest landing only (`/` + loading skeleton)
│   │   ├── page.tsx · loading.tsx
│   ├── [username]/               ← Public trust profile (`/{username}`, no login)
│   ├── faq/                      ← Public FAQ page
│   ├── pages/[slug]/             ← Public static CMS pages
│   ├── checkout/ · order/[orderId]/
│   ├── app/                      ← Customer console (route loading.tsx skeletons)
│   │   ├── page.tsx · loading.tsx · deposit/ · gift-codes/ · keys/ · leaderboard/ · profile/ · premium/ · history/
│   │   ├── broadcast/ · reports/
│   │   ├── users/[username]/ (redirect → /{username}) · referral/ · development/ (API credential hub) · api/ (→ development)
│   │   ├── seller/ · seller/leaderboard/ · become-seller/ (become-reseller → redirect)
│   ├── developers/ · docs/ (→ /developers)  ← Public Platform API docs
│   ├── admin/
│   │   └── (panel)/              ← AdminShell + Guru-parity routes
│   │       ├── tickets/ · support-routes/ (redirect → settings) · reviews/ · faqs/ · …
│   │       └── deposits/ · reports/ · broadcast/ … ← live; premium live; site-config live; cron live
│   ├── uploads/[...path]/        ← serve runtime `public/uploads/*` (prod; next start snapshot gap)
│   ├── downloads/[file]/         ← store-named Android APK (`DRIP-CLIENT-OFFICIAL.apk`)
│   └── api/
│       ├── auth/ · premium/ · checkout/ · orders/ · deposits/ · gift-codes/ · webhooks/cashfree · cron/deposits/poll · history/ · keys/ · products/ · promos/validate/
│       ├── broadcasts/ · reports/ · reports/[id]/
│       ├── faqs/ · pages/ · products/[productId]/reviews/ · media/avatar/
│       ├── support/chat/ · support/inbox/ · support/inbox/unread/ · support/upload/
│       ├── reseller-requests/
│       ├── seller/resellers/ · [id]/ · [id]/credit/ (sub-sellers aliases)
│       ├── internal/migration/ (GuruGamingHub migration bridge)
│       ├── platform-api/{overview,keys,usage,purchases,webhooks}/ · v1/ (public products|pricing|stock flat SKUs · private me|balance|orders list+buy)
│       └── admin/                ← catalog, keys, supplier, promos, users, special-prices, sellers, seller-api (+ developers), premium,
│                                   banners, reviews, support-bot, faqs, settings, statistics, gift-codes,
│                                   broadcast, issue-reports, deposit-reports (legacy alias), sidebar-stats, …
├── components/
│   ├── admin/                    ← shell, sidebar, users / special-prices / resellers (incl. One-Click All Sellers) / premium / settings /
│   │                             ← banners / promos / flash-sales / categories / products / keys / supplier /
│   │                             ← reviews / faqs / static-pages / orders / overview / statistics / development / premium-settlements /
│   │                             ← analytics / history / settings (Support bot Dialog)
│   │                             ← deposits / gift-codes / site-config / icons / cron / reports / broadcast / seller-api (Platform API desk)
│   ├── app/ · auth/ · cart/ · catalog/ · checkout/ · landing/ · developers/
│   │   ├── hub/ (hub-page-shell · hub-header-bar · hub-stat-pill · hub-toolbar · hub-list-row · hub-page-skeleton) ← shared desk neon pattern
│   │   ├── app-home-shell.tsx · app-shell.tsx · customer-sidebar.tsx · …
│   │   ├── leaderboard/ (podium board · trust badges) · seller/ · development/ (1-key API hub) · deposit-view · deposit-waiting-view · manual-deposit-dialog · deposit-method-meta · gift-codes-view ·
│   │   │   banner-carousel · app-page-skeleton · history-view · broadcast-view · reports-view · keys-list (+ keys-list.module.css ticket UX) ·
│   │   │   profile-view · profile-hero-stage (+ module CSS flowing mesh) · profile-dialogs · two-factor-dialog · …
│   │   ├── catalog/store-catalog-slots · flash-offer-carousel · flash-offer-banner · product-grid-feed · product-grid · product-card (+ module CSS) · …
│   ├── product/ (product-sheet purchase Dialog · product-demo-dialog YouTube embed · duration-picker cards · rating-summary · product-reviews-drawer · review-list · review-form · star-rating)
│   ├── auth/ (auth-dialog + module CSS glass header · auth-maintenance-notice · login/register/forgot/2fa forms · google-button · auth-field · auth-provider; APIs: google + native-handoff)
│   ├── support/support-chat-thread.tsx ← shared Message/Bubble thread
│   ├── layout/support-chat.tsx   ← Lucide FAB + button-tree Drawer (notifications + text fallback)
│   ├── layout/live-wave-background.tsx (+ .module.css) ← global fixed wave/aurora/blob ambient layer
│   ├── layout/page-transition-shell.tsx ← native View Transition click bridge + fallback enter motion
│   ├── layout/splash-screen.tsx (+ .module.css)  ← boot splash: logo ring + loader bar while auth hydrates (skipped in native APK)
│   ├── layout/native-app-bootstrap.tsx         ← Capacitor splash hide, status bar, back button, versioned cache clear, network reload
│   ├── layout/native-offline-banner.tsx        ← mid-session offline banner (native APK only)
│   ├── layout/offline-banner.tsx               ← mid-session offline banner (browser / PWA)
│   ├── layout/system-status-screen.tsx (+ .module.css) ← shared premium status composition
│   ├── layout/maintenance-gate.tsx · maintenance-view.tsx  ← enforce maintenance_mode + pinned banner on landing
│   ├── layout/pwa-provider.tsx · install-app-ui.tsx  ← PWA SW register + Install banner/Dialog/menus (hidden in native APK)
│   ├── layout/interaction-feedback-provider.tsx  ← global tap sound + haptic (site pack from Settings)
│   ├── layout/content-protection.tsx             ← production copy/inspect deterrents (skip /admin + localhost); Android FLAG_SECURE in MainActivity
│   ├── layout/content-protection-noscript.tsx    ← blanks SSR UI when JavaScript is disabled / blocked
│   ├── layout/page-header.tsx    ← public/admin only (not customer hub desks)
│   ├── layout/console-brand.tsx · console-nav.tsx (Lucide) · console-profile.tsx (hero + footer + quick stats) · console-header.tsx (+ module CSS, pathname meta via lib/console-page-meta.ts) · console-sidebar.module.css
│   └── ui/ (card variants · dialog-shell · empty-state · filter-chip · bubble · message · …)
├── lib/
│   ├── api.ts · currencies.ts · env.ts · prisma.ts · redis.ts (fast stream buffer · fallback queue · throttle) · system-alert.ts (instant rich Telegram DB/server alerts) · console-page-meta.ts (hub header titles per route) · pricing.ts (catalogUnitPrice + resolveUnitPrice + special prices) · special-price-history.ts (UserSpecialPriceHistory write/list) · products.ts (getProductsPage — sort pinned → bestseller → newest) · youtube.ts (Demo Dialog embed URL) · orders.ts (getUserKeysPage) · history.ts (getUserActivityHistoryPage) · activity-log.ts (ActivityLog write/list + 7-day & 5,000-row capped purge + Redis buffer & fallback drain) · sidebar-stats.ts (customer + admin footer counts)
│   ├── maintenance.ts ← isMaintenanceMode / assertNotMaintenance / maintenanceApiBlock / supportContactHref
│   ├── maintenance-cookie.ts ← drip_maintenance edge cookie helpers
│   ├── system-status-paths.ts ← isSystemStatusPath (client-safe)
│   ├── support-bot.ts · support-keyboard.ts · support-chat.ts · support-inbox.ts · notifications.ts · tickets.ts (legacy) · broadcasts.ts · issue-reports.ts · public-uploads.ts
│   ├── feedback.ts (tap tiers + Capacitor Haptics + custom URL pack + success/error/warning) · feedback-sounds.ts (AppSetting pack) · telegram-notify.ts (Bot API channel pushes) · payment-provider-config.ts (Binance/AutoGoPay/FamGateway DB→env) · autogopay.ts (AutoGoPay QRIS + webhook signature verify) · famgateway.ts (dynamic UPI orders + webhook signature verify) · supplier/* (upstream key API hybrid fulfill) · native-app.ts · toast.ts · …
│   ├── premium.ts · premium-utils.ts · referrals.ts · referral-utils.ts · referral-code.ts · referral-rewards.ts · …
│   ├── admin-stats.ts · admin-users.ts (soft-delete · revokeUserApiKeysOnBan · banReason) · admin-bulk-sellers.ts (One-Click All Sellers batch operations) · admin-products.ts (archive / purge AVAILABLE) · developer-settlements.ts · premium-settlements.ts · gift-codes.ts · seller-api/* (catalog flat SKUs · orders sku/keys/list · keys 1-slot · docs-catalog GitBook demos · sdk-packs · openapi · …) · …
│   └── auth/
├── hooks/
│   ├── use-interaction-feedback.ts ← imperative tap handlers for custom controls
│   ├── use-mobile.ts · use-cart.ts
└── types/ (support · faq · static-page · banner · history · review · product · user · referral · admin-premium · admin-stats · admin-orders · activity-log · special-price-history · developer-settlements · premium-settlements · …)
```

`prisma/schema.prisma` — MongoDB models including wallet, deposits (`expiresAt` / cancel / complete), **`DepositCronRun`**, **`ActivityLog`** (7-day audit trail), promos, CMS, Google/2FA, `ProductReview`, `SELLER` / `RESELLER` roles, **`SupportBotStep`**, legacy **`SupportRoute`** / **`SupportTicket`**, **`SupportInboxMessage`**, **`Broadcast`**, **`IssueReport`**, **`DeveloperSettlementDay`**, **`PremiumSettlementDay`**, **`SpecialStockSettlementDay`**.

Root ops helpers: `ecosystem.config.cjs` (PM2 app config), `setup.sh` (one-shot nginx + Let’s Encrypt for primary/legacy domains + GitHub SSH remote), `deploy.sh` (install deps → Prisma generate/push → build → PM2 startOrRestart), and `scripts/android-build-release.sh` (Capacitor sync → signed release APK → writes `releases/DRIP-CLIENT-OFFICIAL.apk` + versioned copy; served by `src/app/downloads/[file]/route.ts` with `no-store`; requires JDK 21 + Android SDK + `android/keystore.properties`). Client download helper: `src/lib/android-apk.ts`.

## 2. Schema (high level)

| Model / enum | Notes |
|--------------|--------|
| `Currency` | **USD only** |
| `UserRole` | `USER` \| `SELLER` \| `RESELLER` \| `ADMIN` |
| `PromoAudience` | `ALL` \| `USER` \| `SELLER` (SELLER = Seller + Reseller wholesale) |
| `User` | role, **walletBalance**, **banned** / **banReason** (admin-only; cleared on unban), **depositsEnabled** (self-serve rails; resellers default off), seller caps (`canCreate/Manage/FundResellers`), referrals, Google/2FA, **emailVerified**, bio/privacy/socials/border/emoji, **isPremium** / premiumPurchasedAt / usernameChangedAt, … + support + issueReports relations |
| `TransactionType` | includes `PREMIUM_PURCHASE`, `API_FEE` (1% Platform API developer margin), `GIFT_CODE` (USD wallet redeem) |
| `GiftCode` / `GiftCodeStatus` | Admin USD redeem codes; optional `assignedUserId` (user-locked) or open first-claimer; claim → wallet + ledger |
| `SellerApiKey` / `Usage` / `Webhook` / `Idempotency` | Platform API auth + logs (**1 ACTIVE key / user**) |
| `ApiDeveloperMarginDay` | Daily mark-paid for API_FEE (ops ledger) |
| `Product.apiCode` / `Duration.apiCode` | Stable Platform API SKUs |
| `Duration.version` | Optional storefront version group (`""` = none; e.g. Lite / Brutal). Unique with `(productId, version, label)`. ≥2 distinct versions → ProductSheet version-first UX |
| `Duration.supplierProductId` | Optional upstream catalog id for hybrid supplier fulfill |
| `SupplierApiLog` | Upstream API request/response audit (balance/catalog/generate/history) |
| `Product.demoUrl` | Optional demo / trailer link; empty → `default_product_demo_url` AppSetting → builtin YouTube |
| `SupportBotStep` | Button-tree bot: `messageText`, `buttons` JSON, `isEntry`, `isFallback` |
| `SupportRoute` | **Legacy** keyword routes (unused; replaced by `SupportBotStep`) |
| `SupportTicket` | **Legacy** tickets (no new creates; historical rows) |
| `SupportTicketReply` | **Legacy** admin replies |
| `SupportInboxMessage` | Persistent chat (user/assistant/notification/system) + unread |
| `Broadcast` / `BroadcastAudience` | Pinned announcements (`active`); customer `/app/broadcast` bubbles |
| `IssueReport` / `IssueReportKind` / `IssueReportStatus` | Submit-only KEY \| DEPOSIT tickets (no live replies) |
| `ActivityLog` | Platform audit trail (login → purchases); IP/UA + metadata; **auto-purge after 7 days** via deposit cron + write-time chance |
| `DurationPrice` | USD microcents — `price` (retail) + `resellerPrice` (Seller/Reseller wholesale) + `buyPrice` — **no FX** |
| `UserSpecialPrice` | Per-user exact sell price for a duration (USD microcents); beats role tier; flash/promo skipped on that line (`lib/pricing.ts`) |
| `UserSpecialPriceHistory` | Permanent audit of special-price SET / UPDATE / CLEAR (denormalized user/product/admin labels; `lib/special-price-history.ts`) |
| `Key` | AVAILABLE \| SOLD \| DISABLED |
| `ProductReview` / `ReviewStatus` | Verified buyer reviews; PENDING until admin APPROVED; public list paginated + sortable |
| `Banner` / `FaqItem` / `StaticPage` | Content — FAQ admin + public `/faq` + support; StaticPage admin + public `/pages/[slug]` + footer/profile |
| `ResellerRequest` / `Notification` / `AppSetting` | Ops — site brand/colours/assets + custom socials JSON (`site_social_links`); site icons JSON (`site_icons`); deposit mins (`deposit_mins`); deposit methods on/off + QR (`deposit_methods`); **currency registry** (`wallet_currency_rates` → `{ currencies: [{ code, name, symbol, rate }] }`); **manual deposit methods** (`manual_deposit_methods`); Premium price (`premium_price_usd`); **default product demo URL** (`default_product_demo_url`); **payment API keys** (binance_*/ramashop_*/cashfree_*); **supplier API** (`supplier_api_enabled` / `supplier_api_key` / `supplier_api_base_url` / `supplier_catalog_cache`) |
| `DeveloperSettlementDay` / `DeveloperSettlementStatus` | Admin developer payout ledger (PENDING/PAID); no wallet side effects |
| `PremiumSettlementDay` | Premium membership 50% developer-share ledger (PENDING/PAID); live from `PREMIUM_PURCHASE` txs; no wallet side effects |

## 3. State

| Concern | Approach |
|---------|----------|
| Theme | next-themes |
| Cart | Context + localStorage (`drip-cart-v2`) |
| Customer session | JWT `drip_customer_session` `{ sub, role }` |
| Admin impersonation | Cookie `drip_admin_impersonation` |
| Admin gate | `User.role === ADMIN` |
| Wallet | `User.walletBalance` + `Transaction` |
| Feedback | `lib/feedback.ts` + `lib/feedback-sounds.ts` — site pack (haptics/sounds kill-switch + custom uploads); Capacitor Haptics by impact; vibrate fallback; `InteractionFeedbackProvider`; profile mute; `lib/toast.ts` |
| Telegram notify | `lib/telegram-notify.ts` + AppSetting `telegram_notifications` — master/per-event channel pushes (incl. **premium**); purchase lines via `formatTelegramPurchaseLines`; admin Settings Dialog + `POST /api/admin/settings/telegram-test` |
| Payment API keys | `lib/payment-provider-config.ts` — Binance / RamaShop QRIS / Cashfree AppSetting keys (admin Settings Dialog); env fallback when DB empty |
| Supplier key API | `lib/supplier/*` (+ `catalog-admin.ts` summary/mappings) — hybrid generate → local fallback; transparent `/admin/supplier` desk; `Duration.supplierProductId`; env `SUPPLIER_API_KEY` / `SUPPLIER_API_BASE_URL` |
| Visual motion foundation | `app/globals.css` motion/transition tokens + reduced-motion policy; `layout/live-wave-background` global ambient layer (mobile: fewer layers + lower blur + static aurora); `layout/page-transition-shell` progressive page transitions (opacity/transform only) |
| Support chat | Button-tree `SupportBotStep` (Settings CRUD); text → fallback step; notifications in inbox; Lucide FAB |

## 4. Reuse rules

Thin pages; logic in `src/lib/*`; admin chrome via `layout/console-*` + shadcn Dialog/Sheet; money via `formatMoney` / `usdToMicrocents` (USD microcents only). Seed support bot: `npm run db:seed-support-bot`. Auth: Google OAuth + Resend OTP via admin Settings (`src/lib/auth-config.ts`) with optional `.env` fallback. Deposit rails: Binance / RamaShop / Cashfree credentials via admin Settings (`src/lib/payment-provider-config.ts`) with optional `.env` fallback.
