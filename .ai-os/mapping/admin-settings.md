# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/settings`
- Page: `src/app/admin/(panel)/settings/page.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- Components: `src/components/admin/settings/settings-workspace.tsx`, `src/components/admin/settings/web-push-settings.tsx`, `src/components/admin/settings/support-bot-settings.tsx`, `src/components/admin/settings/manual-deposit-methods-settings.tsx`, `src/components/admin/settings/deposit-currencies-settings.tsx`, `src/components/admin/settings/feedback-sounds-settings.tsx`, `src/components/admin/settings/telegram-notify-settings.tsx`, `src/components/admin/use-admin-fetch.ts`
- Libs: `src/lib/settings.ts`, `src/lib/pages-enabled.ts` + `pages-enabled-shared.ts` (store page kill-switches), `src/lib/support-bot.ts`, `src/lib/auth-config.ts` (Google OAuth + Resend — DB first, env fallback), `src/lib/payment-provider-config.ts` (Binance / RamaShop QRIS / Cashfree — DB first, env fallback), `src/lib/deposit-currency-rates.ts` + `src/types/deposit-currency.ts` (dynamic currency registry: code/name/symbol/rate; locked USD/INR/IDR), `src/lib/deposit-quick-amounts.ts` (per-currency fast-amount chip presets), `src/lib/deposit-mins.ts` (user/reseller × registered currencies), `src/lib/deposit-methods.ts` (auto rails on/off + Binance QR), `src/lib/manual-deposit-methods.ts` (admin CRUD manual methods; currency must be registered), `src/lib/feedback-sounds.ts` (site haptics/sounds pack), `src/lib/feedback.ts` (client playback + preview), `src/lib/telegram-notify.ts` (Bot API channel pushes + `formatTelegramPurchaseLines`), `src/types/telegram-notify.ts`, `src/lib/public-uploads.ts` (`saveDepositQrUpload` → `/uploads/deposits/`; `saveFeedbackSoundUpload` → `/uploads/sounds/`), `src/types/feedback-sounds.ts`
- APIs: `src/app/api/admin/settings/route.ts`, `src/app/api/admin/settings/deposit-qr/route.ts`, `src/app/api/admin/settings/feedback-sound/route.ts`, `src/app/api/admin/settings/telegram-test/route.ts`, `src/app/api/admin/support-bot/route.ts`, `src/app/api/admin/support-bot/[id]/route.ts`
- Global apply: root `src/app/layout.tsx` loads `getFeedbackSoundConfig` → `InteractionFeedbackProvider feedbackPack`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX on catalog.
- Deposit minimums are **local currency amounts** (not a single USD gate) per audience: user vs reseller — keys follow the currency registry.
- Deposit methods: QRIS / BINANCE / UPI / ESEWA each have `enabled` (auto rails). BINANCE may upload a pay QR. **Manual proof methods** live in `manual_deposit_methods` JSON (separate Settings Dialog).
- **Flow:** register currency under Currencies & rates first → then attach a Manual deposit method to that code. Save rejects unregistered currency codes. Cannot delete a currency used by a manual method; USD/INR/IDR are locked for auto rails.
- `Deposit.payCurrency` is a **String** code (not enum) so admin-added currencies work.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN` via `src/app/admin/(panel)/layout.tsx` + `AdminShell`.
- List pages are read-only rows/badges; mutations only inside shadcn Dialog.
- Mobile-first compact lists; no inline wallet/status editors on list rows.
- Settings page body is read-only rows; edits Dialog-only (General / **Pages enable** (gift codes store kill-switch, default off) / **Support bot** / Deposit minimums / **Currencies & rates** / Auto deposit methods / **Manual deposit methods** / referral / **Shares & margins** / reseller (apply min + **create funding min**) / Premium / **Authentication** / **Payment API keys** / **Sound & haptics** / **Telegram notifications**).
- Currency registry Dialog is Dialog-only and feeds deposit conversion; does not change storefront/catalog USD pricing.
- Sound & haptics: site kill-switches + per-slot custom audio; empty slot = built-in synth; user profile mute still applies on top of site pack.
- Telegram notifications: master + per-event on/off; Bot API token + channel chat IDs (`-100…` from `t.me/c/{n}/…`); Test verifies bot is channel admin then sends ping; fire-and-forget from server event hooks; never expose unused key codes.
- Purchase channel messages include grouped product lines (`product — duration ×qty · $lineTotal`) via `formatTelegramPurchaseLines`; API purchases (`apiKeyTf`) include product name + unit price.

## 3. Permitted Edit Scopes (Write Fields)
- General: `maintenanceMode` (**enforced** via `src/lib/maintenance.ts` + `MaintenanceGate` → pinned landing banner + `/api/maintenance/enter` logout; admins bypass via normal Sign in).
- **Support & Direct Contact Channels** Dialog: `supportTelegram` (owner Telegram @username or t.me link) & `supportWhatsapp` (owner WhatsApp number with country code or wa.me link) + fallback `supportContact`; provides direct 1-tap customer support buttons across the site (maintenance modal, status pages, etc.) without email friction.
- **Pages enable** Dialog: `pagesEnabled` AppSetting JSON — `giftCodes` (default **false**); hides customer nav/deposit entry + blocks claim API when off; admin desk stays for create/history.
- Support bot Dialog: `SupportBotStep` CRUD — title, slug, messageText, isEntry, isFallback, active, sortOrder, buttons (step/link/back/input).
- Currencies & rates Dialog: `depositCurrencies` CRUD (code 2–8 letters, name, symbol, `1 USD = rate`; USD rate fixed) + `depositQuickAmounts` (up to 4 chips per registered code). Locked: USD / INR / IDR.
- Deposit minimums Dialog: `depositMins.user|reseller` × each registered currency code (AppSetting `deposit_mins` JSON).
- Auto deposit methods Dialog: QRIS / BINANCE / UPI only — per-method `enabled` Switch; BINANCE QR upload (JPG/PNG/WebP ≤ 4 MB) or clear to default asset. Legacy `ESEWA` hidden; NPR/eSewa uses Manual deposit methods.
- Manual deposit methods Dialog: CRUD list — currency **select from registered only**, optional name, **currency name** + **currency symbol** (defaults from registry), **method logo** (upload or Icons pack), optional account/QR/instructions, enabled.
- Referral / reseller program fields as before (incl. **child create funding min** `resellerCreateMinFunding`).
- Referral rates Dialog: three percents — User (`referral_percent`) · Seller (`seller_purchase_percent`) · Reseller (`reseller_purchase_percent`); rate applied by **buyer role** on fulfilled purchase.
- Shares & margins Dialog: `developerProfitSharePercent` (order gross profit → Development/Statistics), `premiumDeveloperSharePercent` (Premium revenue → Premium settlements), `supplierBuyPricePercent` (supplier catalog list → duration buy cost fill on Products Dialog). AppSetting int keys; defaults 10 / 50 / 50.
- Premium membership Dialog: `premiumPriceUsd` (whole USD dollars → AppSetting `premium_price_usd`).
- Authentication Dialog: `googleClientId`, `googleClientSecret`, `resendApiKey`, `resendFromEmail` (AppSetting keys; override `.env` when non-empty). Login/register titles use Site Config `siteName` (not Settings).
- Payment API keys Dialog: Binance (`binanceApiKey`, `binanceSecretKey`, `binancePayId`), AutoGoPay QRIS (`autogopayApiKey`, `autogopayBaseUrl`, Webhook URL display `${appUrl}/api/webhooks/autogopay`), FamGateway (`famgatewayApiKey`, `famgatewayBaseUrl`) — AppSetting keys; override `.env` when non-empty via `src/lib/payment-provider-config.ts`.
- **Platform API & Sandbox keys** Dialog: `apiSandboxEnabled` toggle (`SETTING_KEYS.apiSandboxEnabled`); allows developers to generate and test with Sandbox API keys without consuming real balance.
- Sound & haptics Dialog: `feedbackSounds` AppSetting JSON — `hapticsEnabled`, `soundsEnabled`, custom URLs for `tap` / `toggle` / `primary` / `selection` / `success` / `error` / `warning` (MP3/WAV/OGG/WebM/M4A/AAC ≤ 1 MB via `POST /api/admin/settings/feedback-sound`).
- Telegram notifications Dialog: `telegramNotifications` AppSetting JSON — `enabled`, `botToken`, per-event channels (`deposit` / `register` / `purchase` / `premium` / `ownerReseller` / `subReseller` / `manualDeposit` / `report` / `referral` / `apiKey` / `apiKeyTf` / `binanceDeposit` / `adminUpdate`) with `enabled` · `chatId` · `inviteLink` · `label`; Test via `POST /api/admin/settings/telegram-test`; env fallback `TELEGRAM_BOT_TOKEN`.
- **Web Push notifications** Dialog: Live subscriber stats (`totalSubs`, `userSubs`, `guestSubs`), current device subscribe/active status, and instant **Send Test Push Notification** dispatcher.
- No inline Input/Textarea on page body.
