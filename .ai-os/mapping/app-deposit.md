# Feature Maps & Access Rules

## 1. File Inventory
- Routes: `/app/deposit` · `/app/deposit/[id]`
- Shared shell: `app-console-shell.md`
- Pages: `src/app/app/deposit/page.tsx`, `src/app/app/deposit/[id]/page.tsx`
- Loading: `src/app/app/deposit/loading.tsx` → `HubPageSkeleton` (`rows={3}`, `showChips={false}`); **no** `loading.tsx` on `[id]` (waiting view handles inline busy states)
- Components:
  - `src/components/app/deposit-view.tsx` — auto method chips + manual method chips + amount + Continue (manual opens Dialog); **Gift code** entry card → `/app/gift-codes` (only when Pages enable → gift codes on)
  - `src/components/app/manual-deposit-dialog.tsx` — pay QR/account + **required** screenshot upload → submit
  - `src/components/app/deposit-waiting-view.tsx` — payment ticket, timer, QR/Cashfree/manual proof, mobile sticky bar; full-screen success + terminal outcomes
  - `src/components/app/deposit-ui.module.css` — shared neo-glow panels, 3D CTAs, status pills
  - `src/components/app/deposit-method-meta.ts` — auto method order + logos; `formatDepositFailReason` / `closedDepositTitle`
- Hub components:
  - **deposit-view:** `HubPageShell` (`maxWidth="sm"`), `HubHeaderBar`, `HubListStack`, `HubListRow` (open tickets + history), `HubPanelCard` (create form card)
  - **deposit-waiting-view:** `HubPageShell` (`maxWidth="sm"`, ticket padding overrides), `HubHeaderBar` (pay amount + countdown stats)
- Libs:
  - `src/lib/deposits.ts`, `src/lib/deposit-credit.ts`, `src/lib/deposit-upi-return.ts`, `src/lib/deposit-recheck.ts`
  - `src/lib/deposit-currency-rates.ts`, `src/types/deposit-currency.ts`, `src/lib/deposit-mins.ts`, `src/lib/deposit-methods.ts`, `src/lib/deposit-quick-amounts.ts`
  - `src/lib/manual-deposit-methods.ts`, `src/types/manual-deposit.ts`
  - `src/lib/autogopay.ts`, `src/lib/famgateway.ts`, `src/lib/deposit-provider-http.ts`, `src/lib/deposit-providers/*`
- APIs:
  - `GET/POST /api/deposits` — GET returns `rates` + `minDeposits` + `methods` + `manualMethods` + `depositsEnabled`; POST auto rails or `{ manualMethodKey, amount, proofImage }`; POST blocked with `DEPOSITS_DISABLED` when `User.depositsEnabled` is off (resellers opt-in only)
  - `GET /api/deposits/[id]/status` (QRIS & Binance auto-recheck ≥5s, INR auto-recheck ≥15s)
  - `POST /api/deposits/[id]/verify` — Instant QRIS & Binance/auto verification with optional Order ID or Memo (5-min window, anti-duplicate protection)
  - `POST /api/deposits/[id]/cancel` · `/proof`
  - `POST /api/support/upload` — proof image
  - `POST /api/webhooks/autogopay` — AutoGoPay HMAC-SHA256 verified webhook (QRIS IDR)
  - `POST /api/webhooks/famgateway` — FamGateway HMAC-SHA256 verified webhook
  - `POST /api/webhooks/cashfree` — legacy webhook route
  - `GET/POST /api/cron/deposits/poll` — `src/lib/deposit-cron.ts`
- Schema: `Deposit` (`method` incl. `MANUAL`, `manualMethodKey`, `proofImage`), `DepositCronRun`; gate via `User.depositsEnabled` + `userCanSelfDeposit` (`lib/roles.ts`)
- Assets: `public/deposit/*`, default pay QRs overridable via admin upload

## 2. Hard Governance Rules (Read-Only Guardrails)
- Shared shell rules: `app-console-shell.md`.
- Prisma only on server; client never imports Prisma.
- Wallet credit always USD microcents; local pay amounts via registered currency codes (`payableAmount` + `payCurrency` string).
- No FX on catalog — deposit FX rates only (`wallet_currency_rates` AppSetting currency registry / defaults).
- Auto methods UI order + logos: QRIS → Binance → INR (FamGateway dynamic UPI QR & intent). Manual methods from `manual_deposit_methods` AppSetting (separate chip group); logos via `iconUrl` / `iconKey` / currency default (`deposit-manual` etc. from Icons desk). Customer amount UI uses each method’s admin `currencyName` / `currencySymbol` (defaults from currency registry).
- Legacy `ESEWA` auto chip hidden when manual method `esewa` is enabled.
- INR UPI: dynamic QR image + UPI intent link + checkout URL generated atomically via FamGateway API (`https://famgateway.in/api/create-order`). Webhooks verified via HMAC-SHA256 signature (`X-FamGateway-Signature`).
- `NEXT_PUBLIC_APP_URL` must be the public host for webhook notify / return URLs.
- Customer session required; both list and waiting views use `HubPageShell` + `HubHeaderBar` (not `PageHeader`).
- **Self-serve deposits gate:** `User.depositsEnabled` — resellers default off (seller-funded); admin toggle on `/admin/users`. When disabled: Deposit nav/menu hidden, create form replaced with EmptyState, POST returns `DEPOSITS_DISABLED`.
- Disabled methods hidden from chips; create API returns `METHOD_DISABLED` if posted anyway.
- Manual deposits: screenshot **required** at submit; status `PROCESSING` until admin approves; currency must exist in admin registry (`CURRENCY_MISSING` otherwise).
- Live: deposit list + waiting status poll every **5s** (skip when tab hidden); balance synced from `AuthProvider` `/api/auth/me`.

## 3. Permitted Edit Scopes (Write Fields)
- `HubHeaderBar` wallet/open-ticket stats; `HubListRow` resume rows; `HubPanelCard` create form.
- Manual flow: `ManualDepositDialog` only (no inline proof on deposit page body).
- Waiting ticket: `HubHeaderBar` pay/timer stats, QR / Cashfree **Pay now** (manual tap → Cashfree `_modal` popup on this page; **no** auto-redirect / `_self`), memo / **manual method label + instructions** (`whitespace-pre-line`), countdown (QRIS **10** / Binance **5** / INR **10** / MANUAL·ESEWA **30**), mobile sticky actions; **full-screen** success celebration + failed/cancelled/expired/rejected outcome screens (poll detects transitions + toast; rejected displays dedicated **Rejection Reason** alert box with admin note). Cancel confirm → stays on ticket and shows cancelled outcome (same layout as failed). Terminal CTAs: equal full-width `New top-up` + `Report` (`/app/reports`); success uses `Shop now` + `Done`. MANUAL tickets use API `label` (not QRIS meta fallback) + manual how-to steps. Binance tickets allow instant verification via **Order ID** submission or auto-memo within 5 minutes with duplicate protection.
- Deposit mins + auto method on/off at `/admin/settings`. Manual methods CRUD at `/admin/settings`. Currency registry + quick amount presets in `deposit-currency-rates.ts` / `deposit-quick-amounts.ts` for wallet USD credit + deposit chips only. **Add currency before adding a manual method for that currency.**
- Expiry vs grace: short user ticket windows above; after `expiresAt` cron still polls EXPIRED auto rails for `DEPOSIT_PROVIDER_GRACE_MINUTES` (default **60**) so late provider confirms can still credit.

