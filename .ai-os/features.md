# Drip — Features Specification

> **Last synced:** 2026-07-29 (**Version 1.0 — shipped / launchable**)

## Product vision

Drip sells digital license keys. Public landing is a **storefront preview**. Customers register, use a hub console dashboard, deposit funds (multiple payment methods), checkout in **USD**, and receive keys instantly. Admins manage a full Guru-parity console (catalog, keys, promos, deposits, content, settings) with **Drip shadcn UI**.

**Version 1.0:** Feature-complete and VPS-launchable. Optional physical Android QA; deferred multi-language (post-v1).

## Personas

| Persona | Goal |
|---------|------|
| Guest | Browse landing catalog; open auth dialogs; ask support assistant |
| User | Register/login (email or Google), deposit (multi-method), shop at retail USD prices, get keys, leave verified reviews |
| Seller | Apply via Become a Seller; wholesale prices; may create/manage/fund Resellers if admin-granted caps |
| Reseller | Created by Seller/admin; same wholesale prices; shops under parent referral chain |
| Admin | Full inventory, deposits, promos, CMS, roles, reseller create; retail catalog prices when shopping |

## Feature status

| Area | Status |
|------|--------|
| Landing + dark-only shadcn theme | ✅ Forced dark; no light/system toggle |
| Install as app (PWA) | ✅ Manifest + SW v2 + `/offline.html` fallback + Install banner/menus/profile; iOS Add to Home Screen help; **Android → store-named APK download** |
| System status screens | ✅ Maintenance enforce + pinned landing banner + `/banned` / `/session-expired` / 404 / error / offline |
| Android APK (Capacitor) | ✅ WebView shell → production URL; adaptive + monochrome icon + Android 12 splash_logo densities (synced from Site Config logo); HTTPS `network_security_config`; cold-start offline.html + mid-session banner; Capacitor Haptics; Google OAuth Custom Tabs → `dripclient://` handoff; **v1.0.8** site download `/downloads/DRIP-CLIENT-OFFICIAL.apk` |
| Landing banners (same as `/app`) | ✅ Same flow as `/app` home: `BannerCarousel` → Store → catalog; no marketing bands |
| Catalog storefront (no Stock/Sold labels) | ✅ Stock still gates buy; labels hidden; premium 3D Neo Glow cards; Premium Verified seal; compact rating |
| Product Sheet + cart + promo UI | ✅ Purchase Dialog (optional version chips when ≥2 `Duration.version` values, then duration cards) + `/api/promos/validate` |
| Product ratings & reviews | ✅ Compact `RatingSummary` on cards/sheet → Review Drawer; 5-star + verified buyer; paginated `?page=&limit=&sort=`; buyers with PAID/FULFILLED only; storefront shows **APPROVED** only; customer submit → PENDING; `/admin/reviews` approve/edit/disable/delete + admin post-as-buyer |
| Button-only support bot | ✅ Lucide FAB + Drawer; `SupportBotStep` tree; Settings admin CRUD; notifications + optional text fallback |
| Auth dialogs + OTP | ✅ Glass AuthDialog; login title **DRIP CLIENT OFFICIAL**; brand logo header; Resend OTP |
| Google login + email verification | ✅ OAuth; Google `email_verified` required; polished env-gated button + status skeleton; APK Custom Tabs → `dripclient://` → WebView session |
| Two-factor authentication (2FA) | ✅ TOTP + backup codes on profile / login |
| Profile desk | ✅ `/app/profile` hero-first flowing mesh + glass panels; Dialog edits only |
| Premium membership | ✅ `/app/premium` — wallet one-time unlock (also sets `emailVerified`); customization + share + username/vanity referral + featured products; public `/{username}` neon premium show; admin grant/revoke on `/admin/users`; Telegram `premium` channel + `/admin/premium-settlements` 50% ledger |
| Customer hub console | ✅ Store / Wallet / Account (incl. Development API + Docs) |
| Customer activity history | ✅ `/app/history` — paginated orders/deposits/wallet + Load more + detail Dialog |
| Top Customer Leaderboard | ✅ `/app/leaderboard` — podium top-3 + ranked list; Premium/Verified badges + emoji status |
| Haptics + success/error sounds | ✅ Capacitor Haptics by impact; vibrate fallback on web; tiered taps; profile mute; **admin Settings Sound & haptics** (site on/off + custom uploads for tap/toggle/primary/selection/success/error/warning) |
| Premium tap interaction feedback | ✅ `data-pressed` spring scale + primary ripple; tiered clicks via `resolveTapFeedbackFromElement`; `InteractionFeedbackProvider` + `feedbackTap`/`feedbackImpact`; reduced-motion safe |
| Premium badge | ✅ Animated `PremiumBadge` (`src/components/ui/premium-badge.tsx`) — profile, public page, leaderboard, admin lists; avatar seal when premium |
| Neon notification toasts | ✅ Sonner redesigned — glass cards, neon accent bar, progress strip, type glow |
| Global visual foundation (phase 1) | ✅ Live wave blur + aurora neon ambient + floating glow blobs + radial glows + glass overlays + native/fallback page transitions + upgraded skeleton shimmer; reduced-motion and mobile perf guardrails applied |
| Content protection | ✅ Production deterrents: no right-click/select/drag; block F12 / Ctrl+Shift+I/J/C / Ctrl+U/S/P/C/A/X; docked DevTools blanks site; **`<noscript>` blanks site when JS is off**; skips `/admin` + localhost; form fields + button Copy still work; Android APK `FLAG_SECURE` (blocks screenshots in app — not possible in desktop browsers) |
| `/app/keys` data table | ✅ Multi-select, copy, .txt download, hide (local); server page/limit + Load more |
| `/app` + landing banners | ✅ Image-only carousel (active banners with `imageUrl`) |
| Wallet balance | ✅ `User.walletBalance` (USD microcents); live sync every 5s via `AuthProvider` `/api/auth/me` + tab focus |
| Multi-rail deposits | ✅ Cashfree INR (UPI+card) / QRIS / Binance / eSewa; Drip-original amount-first top-up + receipt-ticket invoice; auto confirm + cron; eSewa proof upload + admin; USD microcents wallet; **`User.depositsEnabled`** (resellers off by default; admin toggle any user) |
| Gift codes (USD) | ✅ Admin `/admin/gift-codes` create (open or username-locked) + claimer details; customer `/app/gift-codes` claim + history; deposit page entry card; wallet credit `TransactionType.GIFT_CODE` |
| Checkout + key delivery | ✅ Wallet-gated; hybrid supplier generate → local fallback; debit on claim; order success shadcn UI |
| Cart hydration | ✅ `hydrated` flag — no empty flash on checkout / after pay |
| Admin panel (Guru features, shadcn UI) | ✅ Sidebar nav live; Overview / Statistics / History / **Logs** (7-day ActivityLog) / Analytics / Orders / Users / Sellers / Premium / Settings (Support bot) / Site config / Icons / Cron / Banners / Promos / Flash Sale / Categories / Products / Keys / **Supplier** / Key Check / Reviews / FAQs / Static pages / Deposits / Reports / Broadcast live |
| Promos / flash sales | ✅ Admin Promos + Flash Sale CRUD (date+time windows); scopes GLOBAL / PRODUCT / DURATION; audience gate; promo discount only on matching units capped by per-user uses; storefront ticker + cart/checkout flash prices; checkout applies flash % + promo; **storefront special-offer banner** (`showBanner` toggle; flash wins over promo; optional display promo code on flash) |
| Banners / FAQs / static pages | ✅ Banners admin + `/` & `/app` carousel; Reviews admin moderation; FAQs admin + public `/faq` + footer/profile; Static pages admin + public `/pages/[slug]` + footer/profile |
| Categories / Products / Keys | ✅ Folder categories (orphan on delete); product Dialog (photo, active, creatable category, durations with optional **Version** + user/reseller/buy USD + supplier catalog Select / optional product id); keys page product/duration selects + paste import + review; exact key-check (sold view-only) |
| Supplier key API | ✅ `/admin/supplier` — master on/off, API key, balance, grouped searchable catalog + mapping badges, pipeline checklist, call logs with full request/response dump; hybrid fulfill + local inventory fallback; Products duration Select from cached catalog |
| Settings / site config / icons / cron / broadcast | ✅ Settings (General / **Currencies & rates** (add currency) / deposit mins / auto + **manual methods** (currency must be registered first) / referral / **Shares & margins** (developer / Premium / supplier buy %) / seller (apply min + **create funding min**) / Premium / Auth / Support bot / **Sound & haptics** / **Telegram notifications** — Dialog edits); Site config; Icons; Cron; Broadcast |
| Issue reports | ✅ Customer `/app/reports` submit-only KEY/DEPOSIT tickets; admin `/admin/reports` queue (status + note Dialog; no live chat) |
| Statistics / analytics / history | ✅ Overview control room; Statistics business performance (gross profit = sale−buy, developer share % from Settings); Development settlements (mark paid); **Premium settlements** (Premium share % from Settings, mark paid); Analytics composition; History multi-kind + server page/`limit` infinite scroll + Dialog |
| Activity logs | ✅ Admin `/admin/logs` — login → purchases audit (`ActivityLog`); category filters + search; **7-day retention** auto-purge via deposit cron |
| Seller applications & One-Click All Sellers | ✅ Profile CTA + `/app/become-seller` → `/admin/sellers` desk (status/balance filters, review Dialog approve/reject/disapprove) + **One-Click All Sellers batch engine** (caps, self-serve deposits, API access, Premium, verification, mass wallet bonus/debit, mass ban/unban, broadcast notifications) |
| Referral / tasks | ✅ `/app/referral` hub (invite link/code, network, rewards, weekly earners); Tasks = Coming soon; optional register `referralCode` + `?ref=` invite links; checkout commission live — **User / Seller / Reseller** % by buyer role |
| Wholesale pricing | ✅ `SELLER` + `RESELLER` pay `DurationPrice.resellerPrice`; `USER`/`ADMIN` pay retail `price` (catalog + checkout) |
| Special prices | ✅ Admin `/admin/special-prices` — any user by username; per-duration exact USD override; beats role tier; flash/promo do not apply on those lines; interactive Active specials list (change/clear) + permanent history (SET/UPDATE/CLEAR) |
| Seller / Reseller hierarchy | ✅ `RESELLER` accounts via `/app/seller` or admin create; manage status/delete + fund gated separately; private LB; **triple** referral percents (User / Seller / Reseller by buyer role) |
| Platform API (pay-as-you-use) | ✅ Flat SKUs + role price (public=retail; Bearer=your tier); private buy/wallet; **1 ACTIVE key / user**; `Idempotency-Key` required; orders list (no keys) + detail `keys[]`; microcents + GitBook-style `/developers` (demos · SDKs · OpenAPI · AI packs); 100 IP / 300 RPM + `BUSY`; `/app/development` + `/admin/seller-api` |
| Auto i18n | ⏳ Deferred |

## Currencies

**USD only.** All money amounts are integer **microcents** (`1 USD = 100_000_000`). Deposits may use multiple payment methods; wallet balance always displays in USD. **No FX.**

## Acceptance

### Version 1.0 (shipped)

- [x] Catalog never exposes unused key codes
- [x] Customer sees USD prices (microcents → `formatMoney`)
- [x] Checkout claims keys via hybrid supplier → local fallback and debits wallet (microcents)
- [x] Admin full Guru-parity nav (all desks live; no Coming soon stubs for v1 scope)
- [x] Deposit / wallet debit product rules (manual, multi-method + auto rails)
- [x] Google OAuth login with verified email
- [x] Optional TOTP 2FA with backup codes
- [x] Verified-buyer product reviews (5-star) + button-tree support bot
- [x] Admin review moderation (approve / edit / disable / delete) + post-as-buyer
- [x] Seller / Reseller hierarchy + Become a Seller + triple referral percents (User / Seller / Reseller)
- [x] Referral / tasks product rules (customer referral UI + optional register code)
- [x] Premium membership (wallet unlock verifies email + `/app/premium` customization / vanity tools + `/admin/users` grant/revoke)
- [x] Wholesale pricing (Seller + Reseller share `resellerPrice`)
- [x] Platform API (pay-as-you-use + developer margin %; 1-key slot; admin/user/docs rebuild)
- [x] Platform API v1 simplify — flat SKUs, role price, Idempotency-Key required, orders list, GitLab-style docs
- [x] GitBook-style `/developers` — full demos, AI prompt packs, downloadable SDKs + OpenAPI
- [x] Admin Broadcast + Reports desks + customer `/app/broadcast` + `/app/reports`
- [x] System status screens + maintenance gate + PWA offline
- [x] Telegram channel notifications (Settings + event hooks incl. **premium** channel)
- [x] Android release APK v1.0.8 (Google OAuth native handoff; `/downloads` no-store)
- [x] VPS deliverable (`setup.sh` nginx+SSL+SSH, `./deploy.sh`, README, package `1.0.0`)
- [ ] Physical Android device QA (optional post-ship)

### Post-v1

- [ ] Multi-language auto-translate (default pt-BR)
