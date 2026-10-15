# Drip — Routes Map

> **Last synced:** 2026-07-24 (**Version 1 — launch ready ~99%**)

## 1. Frontend pages

| URL | File | Auth | Status |
|-----|------|------|--------|
| `/` | `src/app/(store)/page.tsx` | Guests only (logged-in → `/app` or `/admin`) | ✅ Streamed banners + paginated catalog |
| `/faq` | `src/app/faq/page.tsx` | Public | ✅ Active FAQs (footer + profile + support) |
| `/pages/[slug]` | `src/app/pages/[slug]/page.tsx` | Public | ✅ Active static CMS pages (footer + profile) |
| `/robots.txt` | `src/app/robots.ts` | Public | ✅ Allow store/FAQ/pages/developers; disallow admin/app/api |
| `/sitemap.xml` | `src/app/sitemap.ts` | Public | ✅ Home + FAQ + active static pages |
| `/manifest.webmanifest` | `src/app/manifest.ts` | Public | ✅ PWA install (site name/icons from Site Config) |
| `/sw.js` | `public/sw.js` | Public | ✅ Service worker v2 — precache + `/offline.html` document fallback |
| `/offline.html` | `public/offline.html` | Public | ✅ Premium PWA offline fallback (SW) |
| `/downloads/DRIP-CLIENT-OFFICIAL.apk` | `src/app/downloads/[file]/route.ts` + `releases/DRIP-CLIENT-OFFICIAL.apk` | Public | ✅ APK v1.0.8 (no-store; preferred `/downloads/DRIP-CLIENT-OFFICIAL-v1.0.8.apk`); not under `public/` (CF was caching stale) |
| `/maintenance` | `src/app/maintenance/page.tsx` | Public | ✅ Redirects to `/api/maintenance/enter` → landing + pinned maintenance banner |
| `/banned` | `src/app/banned/page.tsx` | Public | ✅ Account suspended screen |
| `/session-expired` | `src/app/session-expired/page.tsx` | Public | ✅ Session timeout screen |
| `/checkout` | `src/app/checkout/page.tsx` | Customer | ✅ Wallet debit + hydration-safe cart |
| `/order/[orderId]` | `src/app/order/[orderId]/page.tsx` | Token | ✅ shadcn success UI (copy/download) |
| `/app` | `src/app/app/page.tsx` | Customer | ✅ Streamed banners + paginated store + Support FAB |
| `/app/deposit` | `src/app/app/deposit/page.tsx` | Customer | ✅ Amount-first top-up + pill rails → payment ticket (+ Gift code entry → `/app/gift-codes`) |
| `/app/deposit/[id]` | `src/app/app/deposit/[id]/page.tsx` | Customer | ✅ Receipt-ticket invoice + ring timer / proof / confirm |
| `/app/gift-codes` | `src/app/app/gift-codes/page.tsx` | Customer | ✅ Claim USD gift codes + own claim history |
| `/app/keys` | `src/app/app/keys/page.tsx` | Customer | ✅ Keys table — server page/limit + Load more |
| `/app/leaderboard` | `src/app/app/leaderboard/page.tsx` | Customer | ✅ Top spend ranks |
| `/app/seller` | `src/app/app/seller/page.tsx` | SELLER + create/manage/fund caps | ✅ Dialog create + manage status/delete + fund resellers |
| `/app/seller/leaderboard` | `src/app/app/seller/leaderboard/page.tsx` | SELLER / RESELLER | ✅ Private seller LB |
| `/app/become-seller` | `src/app/app/become-seller/page.tsx` | USER | ✅ Become a Seller application |
| `/app/become-reseller` | `src/app/app/become-reseller/page.tsx` | — | ✅ Redirect → `/app/become-seller` |
| `/app/profile` | `src/app/app/profile/page.tsx` | Customer | ✅ Hero-first flowing profile + glass panels; account security (name/avatar/password/2FA/mute) + Premium CTA + Join Reseller + FAQ + static page rows |
| `/app/bio` | `src/app/app/bio/page.tsx` | Customer | ✅ Bio Storefront Hub builder (Dialog-only settings + live interactive smartphone simulator) |
| `/app/premium` | `src/app/app/premium/page.tsx` | Customer | ✅ Wallet Premium unlock (also sets `emailVerified`) + share card + customization + username/vanity referral + featured products |
| `/{username}` (`username.dripclientofficial.dev`) | `src/app/[username]/page.tsx` | Public (optional session) | ✅ S-Tier Bento Bio Storefront Hub (wildcard subdomain rewrite, Cyberpunk theme presets, 1-click key checkout, verified vouches, promo pills) |
| `/app/users/[username]` | `src/app/app/users/[username]/page.tsx` | Customer | ✅ Redirect → `/{username}` |
| `/app/history` | `src/app/app/history/page.tsx` | Customer | ✅ Activity history — page/limit + infinite Load more |
| `/app/broadcast` | `src/app/app/broadcast/page.tsx` | Customer | ✅ Active pinned announcement bubbles |
| `/app/reports` | `src/app/app/reports/page.tsx` | Customer | ✅ Submit-only KEY/DEPOSIT issue tickets |
| `/app/referral` | `src/app/app/referral/page.tsx` | Customer | ✅ Referral hub (code, network, rewards); Tasks Coming soon |
| `/app/development` | `src/app/app/development/page.tsx` | Customer (role allowlist) | ✅ Platform API hub — one credential, calls, purchases, webhooks |
| `/app/api` | `src/app/app/api/page.tsx` | Customer | ✅ Redirect → `/app/development` |
| `/developers` | `src/app/developers/page.tsx` | Public | ✅ GitBook-style Platform API docs — full route demos, SDKs, OpenAPI, AI packs, live tester |
| `/docs` | `src/app/docs/page.tsx` | Public | ✅ Redirect → `/developers` |
| `/admin` | `src/app/admin/(panel)/page.tsx` | Customer JWT `role=ADMIN` only | ✅ Control room (health KPIs, 7d revenue, queues, recent deposits/orders) |
| `/admin/statistics` | …/statistics | Admin | ✅ Business performance (revenue/gross profit/deposits, sales vs profit, product rows) |
| `/admin/development` | …/development | Admin | ✅ Developer settlement control (daily 10% share, mark paid) |
| `/admin/premium-settlements` | …/premium-settlements | Admin | ✅ Premium membership settlement (daily 50% share, mark paid) |
| `/admin/seller-api` | …/seller-api | Admin | ✅ Platform API desk — Developers/Keys/Calls/Margin + 1-key policy |
| `/admin/history` | …/history | Admin | ✅ Multi-kind activity (filter + detail Dialog) |
| `/admin/logs` | …/logs | Admin | ✅ User activity audit (login → purchases; 7-day retention + auto-purge) |
| `/admin/categories` (+ `/new`, `/[id]` → list) | `…/categories` | Admin | ✅ Live Categories desk |
| `/admin/products` (+ nested → list / keys) | `…/products` | Admin | ✅ Live Products desk |
| `/admin/keys` | `…/keys` | Admin | ✅ Live Keys desk (product/duration select + paste import) |
| `/admin/special-inventory` | `…/special-inventory` | Admin | ✅ Special Stock desk (isolated bot inventory, 0% developer commission, stock & revenue matrix) |
| `/admin/supplier` | `…/supplier` | Admin | ✅ Upstream supplier API (settings, balance, catalog, call logs) |
| `/admin/key-check` | `…/key-check` | Admin | ✅ Live Key Check (exact; sold view-only) |
| `/admin/orders` (+ `/[id]` → `?id=`) | Admin | ✅ Orders desk (audience/status filters, paginated list, detail Dialog) |
| `/admin/promos` | …/promos | Admin | ✅ Live Promos desk (list + Add/Edit Dialog, notify, storefront banner toggle) |
| `/admin/flash-sales` | …/flash-sales | Admin | ✅ Live Flash Sale desk (list + Add/Edit Dialog; GLOBAL / PRODUCT / DURATION; storefront banner) |
| `/admin/deposits` | …/deposits | Admin | ✅ Paginated proof queue (inline thumbnails, Dialog preview, approve/reject/recheck) |
| `/admin/gift-codes` | …/gift-codes | Admin | ✅ Create USD gift codes (open or user-locked) + claim detail Dialog |
| `/admin/reports` | …/reports | Admin | ✅ Issue report queue (KEY/DEPOSIT; Dialog status + note) |
| `/admin/users` | …/users | Admin | ✅ Accounts Desk (roles, Premium/Verified badges + filters, seller caps, wallet Dialog, soft-delete) |
| `/admin/special-prices` | …/special-prices | Admin | ✅ Per-user duration special prices (username search → product → duration Dialog; flash/promo skipped) |
| `/admin/sellers` | …/sellers | Admin | ✅ Seller applications desk (status/balance filters, compact list, review Dialog) |
| `/admin/resellers` | …/resellers | Admin | ✅ Redirect → `/admin/sellers` |
| `/admin/premium` | …/premium | Admin | ✅ Redirect → `/admin/users` (Premium managed on Users desk) |
| `/admin/tickets` | …/tickets | Admin | ✅ Redirect → `/admin/settings` (legacy URL) |
| `/admin/banners` | …/banners | Admin | ✅ Live workspace (CRUD + image upload) |
| `/admin/reviews` | …/reviews | Admin | ✅ Live Reviews desk (approve/edit/disable/delete + post-as-buyer) |
| `/admin/support-routes` | …/support-routes | Admin | ✅ Redirect → `/admin/settings` (legacy URL) |
| `/admin/faqs` | …/faqs | Admin | ✅ Live FAQs desk (list + Dialog create/edit) |
| `/admin/static-pages` | …/static-pages | Admin | ✅ Live Static Pages desk (list + Dialog create/edit) |
| `/admin/settings` | …/settings | Admin | ✅ Currencies & rates · deposit mins/methods · referral · reseller · Premium · Auth · **Payment API keys** · Support bot · **Sound & haptics** · **Telegram notifications** (Dialog-only) |
| `/admin/site-config` | …/site-config | Admin | ✅ Brand/SEO + theme colours + logo/favicon/OG upload (Dialog-only) |
| `/admin/icons` | …/icons | Admin | ✅ Replaceable site icons (admin/customer/deposit) — Dialog upload/reset |
| `/admin/cron` | …/cron | Admin | ✅ Cron desk (job health, Run now Dialog, paginated `DepositCronRun` history) |
| `/admin/broadcast` | …/broadcast | Admin | ✅ Pinned announcements (create + activate/deactivate; optional notify) |
| `/admin/analytics` | …/analytics | Admin | ✅ Composition charts (roles, methods, statuses) |

**Customer auth UI:** Dialog modals (`AuthDialog`: login / register / forgot / 2fa).

**Global chrome:** Support FAB on `/` and `/app` (Lucide `MessageCircle` · button-tree Drawer + notifications + unread badge; not `/admin`).

## 2. API routes

### Auth / customer
| Method | Endpoint | Status |
|--------|----------|--------|
| POST | `/api/auth/*` | ✅ register (optional `referralCode`), login, logout, me (`reason: banned` \| `maintenance` when suspended / force-logged-out), forgot/reset/change-password, avatar upload (encrypted) |
| GET | `/api/maintenance` | ✅ Public `{ maintenance: boolean }` + syncs `drip_maintenance` cookie |
| GET | `/api/maintenance/enter` | ✅ Clears non-admin session, stamps cookie, redirects to `/` (or hub when off) |
| GET | `/api/referrals/check?code=` | ✅ Public validate referral code (register live check) |
| GET | `/api/auth/google` · `/api/auth/google/callback` | ✅ Google OAuth (verified email; APK → Custom Tabs + `dripclient://` handoff) |
| GET | `/api/auth/native-handoff` | ✅ Consumes native OAuth handoff JWT → session/2FA cookie in WebView |
| GET | `/api/auth/google/status` | ✅ Whether Google button is enabled |
| POST | `/api/auth/2fa/setup` · `enable` · `disable` · `verify` | ✅ TOTP 2FA |
| GET | `/api/media/avatar/[id]` | ✅ Session-only decrypted avatar stream |
| PATCH | `/api/auth/profile` | ✅ name + avatar + privacy always; bio/socials/border/emoji/featured require Premium |
| POST | `/api/premium/purchase` | ✅ One-time wallet debit → `isPremium` + `emailVerified` |
| PATCH | `/api/premium/username` | ✅ Premium username change (30-day cooldown) |
| PATCH | `/api/premium/referral-code` | ✅ Premium vanity referral code |
| GET | `/api/premium/purchased-products` | ✅ Premium purchased products for featured picker |
| GET | `/api/users/[username]` | ✅ Public profile payload (privacy-aware) |
| POST | `/api/checkout` | ✅ Wallet debit + key claim |
| GET | `/api/orders/[orderId]?token=` | ✅ |
| GET/POST | `/api/deposits` | ✅ List + create auto rails (BINANCE/QRIS/UPI/ESEWA) or **manual** `{ manualMethodKey, amount, proofImage }`; GET includes `methods` + `manualMethods` |
| GET/POST | `/api/gift-codes` | ✅ Customer claim `{ code }` + paginated own claims (`page`/`limit`); USD wallet credit |
| GET | `/api/deposits/[id]/status` | ✅ Owner status; auto-recheck for QRIS (≥5s), Binance (≥5s), and UPI (≥15s) |
| POST | `/api/deposits/[id]/verify` | ✅ QRIS / Binance / auto-rail instant verification with optional Order ID or Memo |
| POST | `/api/deposits/[id]/cancel` | ✅ Owner cancel PENDING without proof |
| POST | `/api/deposits/[id]/proof` | ✅ Manual/ESEWA proof replace |
| POST | `/api/webhooks/autogopay` | ✅ AutoGoPay HMAC-SHA256 signed webhook → complete/fail QRIS IDR |
| POST | `/api/webhooks/famgateway` | ✅ FamGateway HMAC-SHA256 signed webhook → complete/fail INR UPI |
| POST | `/api/webhooks/cashfree` | ⏸ Legacy/disabled Cashfree webhook |
| GET/POST | `/api/cron/deposits/poll` | ✅ Expire + poll Binance/INR (FamGateway) + `DepositCronRun` (`src/lib/deposit-cron.ts`) |
| GET | `/api/history?page=&limit=&filter=&q=` | ✅ Customer activity (paginated orders / deposits / wallet) |
| GET | `/api/broadcasts` | ✅ Active pinned broadcasts for session role |
| GET/POST | `/api/reports` | ✅ Own issue tickets + create (`?eligibleDeposits=1` for deposit picker) |
| GET | `/api/reports/[id]` | ✅ Own report detail |
| GET | `/api/keys?page=&limit=&q=` | ✅ Customer purchased keys page (client live-polls every 5s + focus) |
| GET | `/api/products?category=&page=&limit=` | ✅ Paginated catalog (role-aware prices; AVAILABLE stock via `_count`) |
| POST | `/api/stock/quote` | ✅ Live AVAILABLE counts for durationIds; periodic orphan-key repair |
| POST | `/api/promos/validate` | ✅ DB promo lookup |
| POST | `/api/flash-sales/quote` | ✅ Role-aware flash unit prices for cart lines |
| GET/POST | `/api/products/[productId]/reviews` | ✅ List APPROVED (`?page=&limit=&sort=newest|highest|lowest` + distribution) + create verified-buyer (PENDING until admin approves) |
| GET/POST | `/api/support/chat` | ✅ GET entry step · POST button navigate / free-text fallback (`SupportBotStep` tree) |
| GET/POST | `/api/support/inbox` | ✅ List / mark-read / clear (notifications + bot history) |
| GET | `/api/support/inbox/unread` | ✅ Unread count for FAB badge |
| POST | `/api/support/upload` | ✅ Deposit-proof image → `/uploads/support/` (not chat UI) |
| GET | `/uploads/[...path]` | ✅ Runtime public uploads (products/banners/site/icons/deposits/support) — required in prod because `next start` does not serve `public/` files written after boot |
| GET | `/api/faqs` | ✅ Public active FAQs for storefront / support chips |
| GET | `/api/pages` | ✅ Public active static pages (slug/title) for footer / profile |
| GET/POST | `/api/reseller-requests` | ✅ Status + apply (gates + auto-approve) |
| GET/POST | `/api/seller/resellers` (+ `/api/seller/sub-sellers` alias) | ✅ Reseller list/create (min $5); caps in GET |
| PATCH/DELETE | `/api/seller/resellers/[id]` | ✅ Status on/off + soft-delete (`canManageResellers`) |
| POST | `/api/seller/resellers/[id]/credit` | ✅ Add/remove balance (`canFundResellers`) |
| GET/POST | `/api/platform-api/{overview,keys,usage,purchases,webhooks}` | ✅ Customer Platform API hub (session; overview stats; usage filters; API purchases) |
| GET | `/api/v1/products` · `/products/{code}` · `/pricing` · `/stock` | ✅ Public flat SKUs (retail only; Bearer → your tier); `sku` query (+ `duration` alias); 100/min IP; `BUSY` when limited |
| GET | `/api/v1/me` · `/balance` | ✅ Bearer private (300 RPM/key; slim me + wallet `balance`/`balanceUsd`) |
| GET/POST | `/api/v1/orders` · GET `/orders/[id]` | ✅ List (no keys) + buy (`sku` + required `Idempotency-Key` → `keys[]`) + detail; role-tier price + fee; stock → `BUSY` |
| GET | `/api/push/public-key` | ✅ Public VAPID key for web push subscription |
| POST | `/api/push/subscribe` | ✅ Register / update browser Web Push subscription |
| POST | `/api/push/unsubscribe` | ✅ Unregister browser Web Push subscription |
| POST | `/api/admin/push/broadcast` | ✅ Admin send Web Push notification to all or targeted audience |
| GET | `/api/v1/sdk/[lang]` | ✅ Public SDK download (`python`\|`node`\|`php`\|`go`\|`curl`) — attachment |
| GET | `/api/v1/openapi.json` | ✅ Public OpenAPI 3.1 from docs catalog |
| GET | `/api/v1/ai-prompt?pack=` | ✅ Public AI prompt markdown (`full`\|`wire`\|lang); optional `key=` |
| POST | `/api/internal/migration` | ✅ Shared secret migration bridge (verify user, credit balance & auto-grant seller + reseller caps, sync role) |

### Admin
| Method | Endpoint | Status |
|--------|----------|--------|
| GET | `/api/admin/me` · dashboard · `sidebar-stats` | ✅ Role gate; dashboard = control-room KPIs + queues; sidebar-stats = live footer counts + navigation badges |
| GET/POST | `/api/admin/developer-settlements` | ✅ Daily developer share rows + mark paid (no wallet/order side effects) |
| GET/POST | `/api/admin/premium-settlements` | ✅ Daily Premium 50% share rows + mark paid (no wallet/Premium side effects) |
| GET/PATCH | `/api/admin/seller-api/settings` | ✅ Platform API access / fee % / RPM / sandbox (max keys fixed at 1) |
| GET | `/api/admin/seller-api/developers` | ✅ Paginated developers (`page`/`limit`/`q`/`status`) |
| GET/POST | `/api/admin/seller-api/keys` · `/keys/[id]` | ✅ Paginated keys + revoke |
| GET | `/api/admin/seller-api/usage` | ✅ Paginated usage + filters + 24h KPIs |
| GET/POST | `/api/admin/seller-api/developer-margin` | ✅ API fee % margin daily settle (mark paid; no wallet side effects) |
| CRUD | categories · products · durations · keys import/delete | ✅ Categories orphan on delete; product Delete archives if sold history (purge AVAILABLE); durations user/reseller/buy prices; key import dedupe |
| POST | `/api/admin/products/upload` | ✅ Product image → `/uploads/products/` |
| GET | `/api/admin/keys` · `/api/admin/keys/check` | ✅ Inventory + exact code lookup |
| GET/POST | `/api/admin/special-inventory` | ✅ Special stock matrix, KPI totals, paginated keys, and import |
| GET/POST | `/api/admin/special-inventory/settlements` | ✅ Daily 50/50 Developer & Owner settlement rows + mark paid |
| GET/PATCH | `/api/admin/supplier/settings` | ✅ Master on/off + API key (masked) + base URL |
| GET | `/api/admin/supplier/balance` | ✅ Live upstream balance |
| GET/POST | `/api/admin/supplier/catalog` | ✅ Cached catalog + summary + local duration mappings; POST refreshes from supplier |
| GET | `/api/admin/supplier/logs` | ✅ Paginated SupplierApiLog (`page`/`limit`/`ok`/`fallback`) |
| CRUD | `/api/admin/promos` · `/api/admin/flash-sales` | ✅ Promos + Flash Sale desks live (scopes GLOBAL / PRODUCT / DURATION) |
| GET/PATCH | `/api/admin/deposits` · `/api/admin/deposits/[id]` | ✅ Paginated list (`page`/`limit`/`status=open|PENDING|PROCESSING|all`) + race-safe approve/reject (proof required for manual) |
| GET/POST | `/api/admin/gift-codes` · `PATCH /api/admin/gift-codes/[id]` | ✅ Paginated gift codes + create (optional user lock) + disable |
| POST | `/api/admin/deposits/[id]/recheck` | ✅ Provider recheck (non-eSewa) |
| GET/PATCH | `/api/admin/issue-reports` · `/[id]` | ✅ Paginated KEY/DEPOSIT tickets; status + admin note |
| GET | `/api/admin/deposit-reports` | ✅ Legacy alias → open DEPOSIT issue reports |
| GET/PATCH | `/api/admin/deposit-reports/[id]` | ✅ Legacy deposit approve/reject/dismiss (deposit desk preferred) |
| GET | `/api/admin/history` · statistics · analytics | ✅ History `?kind=&page=&limit=&q=` → `{ events, page, limit, total, hasMore }` · statistics `?period=` · analytics composition |
| GET | `/api/admin/logs` | ✅ ActivityLog feed `?category=&page=&limit=&q=` (last 7 days only; older auto-purged by deposit cron) |
| GET/PATCH/DELETE | `/api/admin/users` · `/api/admin/users/[id]` | ✅ Role/ban/wallet/activity + seller caps + Premium/`emailVerified` + `apiEnabled` + soft-delete (history linked) |
| GET/PUT/DELETE | `/api/admin/special-prices` | ✅ `active=1` paginated live specials · `q` username search · `userId` overrides / upsert / clear (+ history + ActivityLog) |
| GET | `/api/admin/special-prices/catalog` | ✅ Paginated products + durations + overrides for picker (`userId`, `page`, `limit`, `q`) |
| GET | `/api/admin/special-prices/history` | ✅ Paginated special-price audit (`userId`, `action` SET|UPDATE|CLEAR, `q`, `page`, `limit`) |
| POST | `/api/admin/users/[id]/impersonate` | ✅ Login-as + restore cookie |
| GET/POST | `/api/admin/impersonation` | ✅ Status + exit (Return to Admin) |
| POST | `/api/admin/resellers/create` (+ `/api/admin/sub-sellers` alias) | ✅ Admin-created reseller (attached to admin) |
| GET/PATCH | `/api/admin/resellers` · `/api/admin/resellers/[id]` | ✅ Approve / reject / disapprove |
| GET/POST | `/api/admin/sellers/bulk-action` | ✅ One-Click All Sellers preview stats & batch execution engine |
| GET | `/api/admin/premium` | ✅ Legacy Premium list (still available) |
| PATCH | `/api/admin/premium/[id]` | ✅ Legacy grant/revoke (Users desk prefers `/api/admin/users/[id]`) |
| CRUD | banners · faqs · static-pages | ✅ Banners + FAQs + Static pages UI live |
| GET/POST/PATCH/DELETE | `/api/admin/support-bot` · `/[id]` | ✅ Support bot step tree CRUD |
| GET/POST/PATCH/DELETE | `/api/admin/reviews` · `/api/admin/reviews/[id]` | ✅ List/filter; create as buyer (APPROVED); approve/edit/disable/delete; `?productId=` buyer options |
| POST | `/api/admin/banners/upload` | ✅ Public banner image → `/uploads/banners/` |
| GET/PATCH | `/api/admin/settings` · `/api/admin/site-config` | ✅ Settings (**Currencies & rates** registry + deposit mins/methods + **manual deposit methods** + **feedback_sounds** + **telegram_notifications** + **payment API keys** Binance/RamaShop/Cashfree) + Site config UI live |
| POST | `/api/admin/settings/deposit-qr` | ✅ Pay QR upload → `/uploads/deposits/` |
| POST | `/api/admin/settings/feedback-sound` | ✅ Custom UI/toast audio → `/uploads/sounds/` (MP3/WAV/OGG/WebM/M4A/AAC ≤ 1 MB) |
| POST | `/api/admin/settings/telegram-test` | ✅ Verify bot is channel admin + send test ping |
| POST | `/api/admin/site-config/upload` | ✅ Site logo/favicon/OG → `/uploads/site/` |
| GET/PATCH | `/api/admin/icons` | ✅ List + replace/reset one `SiteIconKey` (`AppSetting` `site_icons`) |
| POST | `/api/admin/icons/upload` | ✅ Icon PNG → `/uploads/icons/` |
| GET | `/api/admin/cron` · `/api/admin/cron/runs` | ✅ Cron job overview + paginated run history |
| POST | `/api/admin/cron/run` | ✅ Admin-triggered deposit poll (`{ job: "deposits" }`) |
| GET | `/api/site-config` | ✅ Public brand + theme tokens |
| GET | `/api/site-icons` | ✅ Public resolved icon URL map |
| GET/POST | `/api/admin/broadcast` | ✅ List + create pinned Broadcast; optional notifyMany |
| PATCH | `/api/admin/broadcast/[id]` | ✅ Activate / deactivate |
| GET | `/api/admin/orders` · `/[id]` | ✅ List `?audience=&status=&page=&limit=&q=` → `{ orders, page, limit, total, hasMore }`; detail includes keys |

## 3. Middleware

`src/proxy.ts` — matcher `/`, `/admin/:path*`, `/app/:path*`.

- `/`: guests only
- `/admin/*`: customer JWT with `role=ADMIN` only (guests → `/?auth=login`; others → `/app`)
- `/admin/login`: redirects to normal login dialog
- `/app/*`: customer JWT
