# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/app/referral`
- Shared shell: `app-console-shell.md`
- Page: `src/app/app/referral/page.tsx`
- Loading: `src/app/app/referral/loading.tsx` → `HubPageSkeleton` (`rows={3}`, `showChips={false}`)
- Components: `src/components/app/referral-view.tsx`
- Hub components:
  - `HubPageShell`
  - `HubHeaderBar` + `HubStatPill` (Invited / Orders / Network spend / Your rewards)
  - `HubPanelCard` (overview KPI cards)
  - `HubListStack`, `HubListRow` (network + rewards tabs)
  - `HubEmptyPanel`
  - `FilterChip` / `FilterChipRow` (section tabs)
- Types: `src/types/referral.ts`
- Libs: `src/lib/referrals.ts` (dashboard), `src/lib/referral-utils.ts`, `src/lib/clipboard.ts`, `src/lib/referral-code.ts`, `src/lib/referral-rewards.ts`, `src/lib/settings.ts` (commission %)
- APIs: `GET /api/referrals/check?code=` (public validate); register accepts optional `referralCode` via `POST /api/auth/register`
- Related auth: `src/components/auth/register-form.tsx`, `auth-dialog.tsx`, `auth-provider.tsx` (`?ref=` / `?auth=register&ref=`)

## 2. Hard Governance Rules (Read-Only Guardrails)
- Shared shell rules: `app-console-shell.md`.
- Prisma only on server; client components never import `@/lib/prisma` or `src/lib/referrals.ts` (use `referral-utils` on client).
- Money is USD microcents only; use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Customer session required; guests redirect to `/?auth=login&next=/app/referral`.
- Referral commission from AppSetting by **buyer role**: `referral_percent` (USER/ADMIN) · `seller_purchase_percent` (SELLER) · `reseller_purchase_percent` (RESELLER); checkout credits via `creditReferralReward`.
- Tasks UI is **Coming soon** only (no milestone/claim system).
- Network + reward lists capped (take 50); KPI counts/sums use aggregates.
- Dashboard shows all three commission rates (`commissionRates.user|seller|reseller`).

## 3. Permitted Edit Scopes (Write Fields)
- `HubHeaderBar` referral summary stats; tab chips; `HubPanelCard` / `HubListRow` dashboard presentation.
- Invite link format `/?auth=register&ref=CODE`; copy/share actions.
- Optional register referral field + live check API.
- Keep Tasks as Coming soon until product rules ship; commission stays checkout-driven.
