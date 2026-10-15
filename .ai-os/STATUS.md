# Drip — Build Status

| Field | Value |
|-------|--------|
| **Last audited** | 2026-07-29 (**Version 1.0 — shipped / launchable**) |
| **Planning** | ✅ Full roadmap + Guru admin feature port |
| **AI-OS** | ✅ Synced for v1 launch |
| **Stack** | Next.js 16.2.10 · React 19.2.4 · Prisma 6.19.3 · MongoDB · Tailwind 4 · shadcn 4 · Capacitor 7 (Android) · Recharts · zod · jose · bcryptjs · resend · sonner · next-themes · otpauth · qrcode |
| **Theme** | ✅ Dark only (`forcedTheme=dark`) — Primary neon `#E84FFF` · Accent `#FF6AD5`; elevation/glow tokens; Card variants |
| **Current phase** | **Version 1.0 shipped** — deliverable + VPS-live; optional physical Android QA |
| **Launch readiness** | **100% product** — store, admin, deposits, API, PWA, APK publish, deploy scripts; optional device QA + deferred i18n |
| **Next task** | Optional: physical Android QA for APK 1.0.8 Google login; post-v1 i18n (pt-BR); supplier API credentials on VPS when using upstream keys; deploy Platform API v1 simplify if not live yet |
| **Gift codes** | ✅ Admin desk + customer claim; **store kill-switch** Settings → Pages enable (default **off**) |
| **Loading** | ✅ Progressive hub: route skeletons, Suspense-streamed store home, catalog/keys/history page+Load more |
| **Deposit UX** | ✅ Amount-first top-up + role×currency mins; auto rails (QRIS/Binance/INR); **currency registry** (admin Add currency → rate/name/symbol) then **manual methods** (account/QR/logo/`currencyName`/`currencySymbol`) → Dialog + required screenshot → admin approve queue with inline proof preview |
| **Promos** | ✅ Date+time window; audience; PRODUCT/DURATION scoped unit discount; per-user unit cap; checkout applies |
| **Email** | Resend OTP for forgot-password (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) |
| **Google OAuth** | Optional `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — button hidden when unset; APK uses Custom Tabs + `dripclient://` handoff so session lands in WebView |
| **Support** | Telegram-style button-tree bot (`SupportBotStep`); keyboard rows (`row` + emoji seed); Settings CRUD; Lucide FAB; notifications; text fallback; FAQs + `/pages/*` policies seeded |
| **Blocked on** | Nothing |
| **App UI** | ✅ Customer + Admin hub console + visual redesign (PageHeader, EmptyState, DialogShell, FilterChip, Card variants) + **Real-time sidebar pending & unread count badges** (deposits, reports, moderation queues, settlements) |
| **Deploy** | ✅ pm2 `drip-client-reseller` production (`npm run start`) on `:3102` → nginx/SSL `https://dripclientofficial.dev` (+ `www`); legacy `https://drip-client.gurugaminghub.store` still proxied; `NEXT_PUBLIC_APP_URL` set in ecosystem (not IP); runtime uploads via `/uploads/[...path]`; `sudo bash setup.sh` (nginx+SSL+GitHub SSH) · `./deploy.sh` (deps + Prisma + build + PM2 restart) |
| **Deposit cron** | ✅ VPS crontab `* * * * *` → `/home/kscoder/cron-deposits.sh` (Guru :3100/:3101 + Drip :3102); requires `CRON_SECRET` in `.env`; admin monitor/Run now at `/admin/cron` |
| **INR deposits** | ✅ FamGateway UPI API (dynamic UPI QR + deep intent links); webhook `/api/webhooks/famgateway` with HMAC-SHA256 signature verification; cron & verify-order status recheck |
| **Supplier catalog sync** | ✅ 10-minute TTL auto-refresh + in-flight deduplication + deposit cron sync + supplier balance-gated stock (out-of-stock when upstream balance is insufficient); accurate manual stock vs supplier stock count & maintenance mode; **out-of-stock Telegram alerts automatically bypassed for supplier-backed items** |
| **Redis Logging & DB Space Protection** | ✅ Local Redis stream (<1ms non-blocking activity logs) + MongoDB 512MB space safety cap & 7-day auto-purge + smart zero-loss fallback queue (`drip:logs:mongo_fallback_queue`) with cron drain + instant rich Telegram DB/server alerts |

---

## Version 1 launch snapshot

| Track | Status |
|-------|--------|
| Storefront browse → cart → wallet checkout → key delivery | ✅ |
| Auth (email, Google, 2FA, forgot OTP) | ✅ |
| Customer hub (`/app`) + Premium + referral + keys + history | ✅ |
| Multi-rail deposits + manual proof + admin approve | ✅ |
| Admin Guru-parity desks (catalog, promos, deposits, CMS, roles) | ✅ |
| Platform API (flat SKUs + secure orders) + GitBook-style `/developers` | ✅ |
| Support button-tree bot | ✅ |
| PWA + system status + maintenance gate | ✅ |
| Android release APK **v1.0.8** (Google OAuth → app session handoff) | ✅ published `/downloads` |
| Physical Android device QA | ⏸ Optional post-ship checklist |
| Multi-language auto-translate (pt-BR) | ⏸ Deferred post-v1 |

---

## Shipped

| Area | Status |
|------|--------|
| Landing store `/` | ✅ Guests only; logged-in → `/app`; same banner + catalog flow as `/app` home; lightweight flat product cards (mobile-first); Store `HubHeaderBar`; catalog sort pinned → bestseller → newest |
| Catalog stock labels | ✅ Hidden on storefront (purchase still stock-gated) |
| Top Customer Leaderboard | ✅ `/app/leaderboard` podium + badges/emoji; private seller LB same UI |
| Haptics + success/error sounds | ✅ Android-style vibration + tiered tap sounds; profile mute; admin **Sound & haptics** Dialog (site on/off + custom uploads) |
| Premium tap interaction feedback | ✅ `data-pressed` spring + ripple; tiered click/haptic via `feedbackImpact`; `InteractionFeedbackProvider` |
| Premium badge | ✅ Animated `PremiumBadge` component across profile, leaderboard, admin |
| Neon notification toasts | ✅ Mobile-notification Sonner — neon accent, glass card, progress strip |
| Global visual foundation (phase 1) | ✅ Live wave blur + aurora ambient + neon blobs + glass overlays + page transitions + upgraded skeleton motion with reduced-motion safeguards |
| Reseller 48h reminder popup | ✅ Scheduled popup every 48h for non-resellers; wholesale perks + direct `/app/become-seller` apply route |
| Product reviews + verified badge | ✅ 5-star `ProductReview`; verified buyers only; **admin approval required** before public; compact `RatingSummary` on card/ProductSheet opens paginated Review Drawer (sort + Load more); `/admin/reviews` moderate + post-as-buyer |
| Button-only support bot | ✅ Lucide FAB + Drawer; `SupportBotStep` tree; Settings admin CRUD; notifications + text fallback; seed `db:seed-support-bot` |
| Customer auth (login/register/forgot dialogs) | ✅ Premium glass AuthDialog; login title **DRIP CLIENT OFFICIAL**; polished register; Resend OTP |
| Google login + verification | ✅ OAuth; requires verified Google email; link/create user; polished env-gated button + status skeleton |
| Two-factor authentication (2FA) | ✅ TOTP + backup codes; login challenge; profile enable/disable |
| USD-only catalog + wallet (microcents) | ✅ `1 USD = 100_000_000` microcents; no INR/RP/NPR |
| Customer app `/app` + hub console | ✅ Store / Wallet / Account + Development nav; unified hub desk UI (`HubPageShell` + `HubHeaderBar`); keys vault reference pattern |
| Referral / tasks | ✅ Invite link/code, network, rewards, weekly earners; Tasks Coming soon; optional register referral code; **User / Seller / Reseller** commission % by buyer role |
| Roles USER / SELLER / RESELLER / ADMIN | ✅ DB role + JWT; `/admin` for ADMIN; seller panel via `canCreateResellers` |
| Seller / Reseller hierarchy | ✅ Sellers from applications; Resellers created by admin/Seller; create/manage/fund caps; dual percents; private LB; Become a Seller; **reseller self-deposit off by default** |
| Wholesale pricing | ✅ `SELLER` + `RESELLER` use `resellerPrice`; `USER`/`ADMIN` use retail `price` (storefront + checkout) |
| Special prices | ✅ Admin `/admin/special-prices` — any user; per-duration exact USD; flash/promo skipped; interactive Active specials list + permanent SET/UPDATE/CLEAR history Dialog |
| Platform API | ✅ Flat `items[]` SKUs; public=retail / Bearer=your tier; private me/balance/orders list+buy+detail; **Idempotency-Key required**; **1 ACTIVE key / user**; soft `duration`/`sku` aliases; `BUSY`; **exclusively available for SELLER & RESELLER accounts (completely hidden/disabled for normal USER)**; GitBook-style `/developers` (full demos · SDKs · OpenAPI · AI packs) + `/app/development` + `/admin/seller-api` |
| Admin Users / Sellers / Settings | ✅ Accounts Desk (roles + Premium/Verified + seller caps + **ban reason** + ban revokes API keys + **Self-serve deposits** toggle) + Seller applications + **One-Click All Sellers batch engine** + Settings (currency rates + deposit mins/methods + referral/seller config + **Shares & margins** + Premium + **Payment API keys** + **Telegram notifications**) |
| Wallet + deposits | ✅ Rails: AutoGoPay QRIS (IDR auto-credit webhook) · FamGateway (INR UPI) · Binance Pay (memo match) · eSewa NPR manual; wallet credit USD microcents; AutoGoPay HMAC-SHA256 webhook `/api/webhooks/autogopay`; admin approve/recheck; **`User.depositsEnabled`** (resellers default off — seller-funded) |
| Gift codes | ✅ Admin create USD codes (optional user lock) + claim history desk; customer claim tab; deposit entry link |
| Checkout + key delivery | ✅ Wallet-gated; hybrid supplier generate → local fallback; debit on claim; referral rewards on fulfill |
| Admin panel (Guru feature-set, Drip shadcn UI) | ✅ Nav live; Overview / Statistics / Development / **Special Stock Inventory & 50/50 Settlements** / **Premium settlements** / History / **Logs** / Analytics / Orders / Users / Special prices / Resellers / Premium / Settings (incl. Support bot) / Site config / Icons / Cron / Banners / Promos / Flash Sale / Categories / Products / Keys / **Supplier** / Key Check / Reviews / FAQs / Static pages / Deposits / Reports / Broadcast live |
| Site icons pack | ✅ Built-in `/icons/*.png`; admin `/admin/icons` Dialog replace/reset; `SiteIconsProvider` on cart, deposit logos (auto + **manual** pack keys); support FAB = Lucide; console nav = Lucide |
| Public FAQ + support FAQ | ✅ `/faq` + footer + profile help row; admin CRUD; link via support bot buttons |
| Public static pages | ✅ `/pages/[slug]` glass doc UI + sticky SiteFooter; footer + profile rows; admin CRUD at `/admin/static-pages` |
| Proxy guards | ✅ `/` guests-only → `/app`; `/app` session; `/admin` customer JWT `role=ADMIN` only (no separate admin login) |
| Dark-only theme | ✅ Forced dark; no site/console theme toggle |
| Boot splash | ✅ Centered logo + ring/breathe + indeterminate loader bar/dots while session hydrates |
| Install as app (PWA) | ✅ `manifest.ts` + `public/sw.js` v2 + icons; soft Install banner; `/offline.html` document fallback; header/user-menu/profile actions; iOS Share → Add to Home Screen Dialog |
| System status screens | ✅ Maintenance pinned banner (no admin CTA) + force-logout non-admins + `/banned` / `/session-expired`; premium 404/error; PWA SW v2 + `/offline.html`; web OfflineBanner |
| Android APK (Capacitor) | ✅ Thin shell loads `https://dripclientofficial.dev` via WebView; adaptive icon + Android 12 splash_logo density bitmaps synced from Site Config logo; Android 13 monochrome; `network_security_config` HTTPS-only; cold-start connectivity → `offline.html`; mid-session `NativeOfflineBanner`; Capacitor Haptics (no vibrate-gate); versioned SW cache clear; splash min 400ms; **release v1.0.7** via `/downloads/` route from `releases/` (`no-store` + CF BYPASS) |
| Interaction feedback | ✅ Tiered tap sounds + Android haptics; custom site pack from Settings; `data-pressed` spring; profile mute; neon toasts |
| Content protection | ✅ Production copy/inspect deterrents + `<noscript>` blank + Android `FLAG_SECURE`; `/admin` + localhost exempt |
| Store product cards | ✅ Flat card + border; green From price; equal Demo (red) + Buy CTAs; no Cart button; Demo opens in-site YouTube embed Dialog (`ProductDemoDialog`); `Product.demoUrl` or site default; whole-card click → ProductSheet; Premium Verified; reviews Drawer; PINNED / BESTSELLER |
| Product pin / sort | ✅ Admin Dialog `isPinned` + `isBestSeller`; storefront `getProductsPage` order: pinned → bestseller → newest (`createdAt` desc) |
| Product Details + reviews UX | ✅ Purchase-only Dialog (hero + optional version chips + duration cards); dedicated Review Drawer with histogram, sort, Load more, verified write form |
| Site footer socials | ✅ Compact premium bar pinned via SiteChrome `min-h-dvh`: brand+tagline · horizontal nav (quick + static pages) · Site Config socials · ©/Secure; also on `/app` home |
| Profile customization | ✅ Moved to `/app/premium` (gated); Share card; username + vanity referral; featured products; public `/{username}` premium show UI (Join with name → register+ref) + Premium badge |
| Profile desk UI | ✅ `/app/profile` hero-first flowing mesh stage + glass panels; Dialog-only edits (name/avatar/password/2FA); mute + Install app |
| Premium membership | ✅ One-time wallet unlock (`premium_price_usd`); sets `isPremium` + `emailVerified`; admin grant/revoke on `/admin/users` + Settings price Dialog |
| Broadcast | ✅ Pinned `Broadcast` announcements; admin desk + customer `/app/broadcast` bubbles (active only); optional notify → inbox; native Web Push broadcast |
| Issue reports | ✅ Submit-only `IssueReport` tickets (KEY / DEPOSIT); customer `/app/reports`; admin `/admin/reports` queue Dialog with full license key code copy, product/duration, order ID, purchase time & deposit amount/currency/method/time details |
| Telegram channel notifications | ✅ Settings Dialog (master + per-event); Bot API; Test as channel admin; hooks on register/deposit/purchase/**premium**/reseller/report/referral/apiKey/broadcast; **purchase** includes product — duration ×qty · $; **report** includes exact key code, product, duration, order ID, purchase date, deposit amount & method, and explanation |
| Web Push Notifications | ✅ Native VAPID Web Push protocol; Service Worker background handler (`push` & `notificationclick`); auto-generated VAPID keys; soft opt-in prompt `WebPushPrompt`; profile toggle; real-time transactional push on deposit credit, key delivery, & issue reports; admin push broadcast with double-push deduplication |

## Android APK — device QA checklist

Build machine needs **JDK 21** + **Android SDK** (one-time setup on this VPS):

```bash
npm run android:setup          # installs JDK + SDK into .tools/ (no sudo)
npm run android:build:debug    # → android/app/build/outputs/apk/debug/app-debug.apk
```

Release signing:

```bash
./scripts/android-generate-keystore.sh   # uses .tools/jdk-21 keytool
# edit android/keystore.properties with real passwords
./scripts/android-build-release.sh       # → releases/DRIP-CLIENT-OFFICIAL.apk (+ versioned copy)
```

| Check | Command / action |
|-------|------------------|
| Sync shell | `npm run cap:sync` |
| Debug APK | `npm run android:setup` (once) then `npm run android:build:debug` |
| Release APK | `./scripts/android-generate-keystore.sh` + `android/keystore.properties` + `./scripts/android-build-release.sh` |
| Site download | `https://dripclientofficial.dev/downloads/DRIP-CLIENT-OFFICIAL.apk` (also versioned `…-v1.0.8.apk`) |
| Cold start | Native splash → production site (clears stale PWA SW/cache on native; dark WebView bg; offline fallback on network/SSL errors) |
| Auth | Email/password, 2FA, Google (Custom Tabs → `dripclient://` → WebView session) |
| Commerce | Cart → wallet checkout → keys |
| Deposits | Manual screenshot upload, Cashfree if enabled |
| Offline | Airplane mode → offline screen (cold) or bottom banner (mid-session) → Retry |
| UX | No PWA install banner; no double web splash; native haptics + back button |

Automated on VPS: `./scripts/android-build-release.sh` succeeds; APK in `releases/` (v1.0.8 — Google OAuth native handoff); served with `no-store` via `/downloads/[file]`.

## Locked decisions

- Currency: **USD only** — balance + catalog prices always USD
- Money unit: **integer microcents** (`1 USD = 100_000_000`)
- Deposits: multiple methods (MANUAL / BANK_TRANSFER / CRYPTO / UPI / OTHER); credit always USD
- Prices: explicit USD `DurationPrice` — **no FX conversion**
- Payment: `PAYMENT_MODE=manual` + manual deposit proof approve/reject
- Reusable libs under `src/lib/*`; thin pages
- UI: clean shadcn dark-only — no Guru CSS Modules admin chrome
- Support: button-tree bot (`SupportBotStep`); admin Settings CRUD; notifications in inbox
