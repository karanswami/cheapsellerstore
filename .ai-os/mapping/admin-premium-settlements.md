# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/premium-settlements`
- Page: `src/app/admin/(panel)/premium-settlements/page.tsx`
- Loading: `src/app/admin/(panel)/premium-settlements/loading.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- Components: `src/components/admin/premium-settlements/premium-settlements-workspace.tsx`, `src/components/admin/stats/kpi-card.tsx`, `src/components/admin/use-admin-fetch.ts`
- Libs: `src/lib/premium-settlements.ts` (`getPremiumDeveloperShareRate` from settings), `src/types/premium-settlements.ts`
- Schema: `PremiumSettlementDay` (+ shared `DeveloperSettlementStatus`) in `prisma/schema.prisma`
- APIs: `GET/POST /api/admin/premium-settlements`
- Related: Telegram `premium` channel → `admin-settings.md`; wallet purchase → `app-premium.md`; order 10% ledger stays at `/admin/development`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client never imports `@/lib/prisma`.
- Money is USD microcents; display via `formatMoney`.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN`.
- **Settlement marks do not touch wallets, Premium status, or purchases.**
- Daily rows are live-computed from `TransactionType.PREMIUM_PURCHASE` + `COMPLETED`; `PremiumSettlementDay` only stores paid status + amount snapshot.
- Admin free grant/revoke of Premium does **not** create settlement rows (no `PREMIUM_PURCHASE` tx).
- Date window: from site start (earliest user / Premium purchase) through today, capped at 90 days.
- Developer share = Premium revenue (`abs(amount)`) × Settings `premium_developer_share_percent` (default 50%).
- Mark paid only via shadcn Dialog confirmation (single or batch).
- Confirm Dialog: `flex max-h-[min(92dvh,…)] flex-col gap-0 overflow-hidden p-0`; header band + icon; scroll body; `DialogFooter` with `mx-0 mb-0`.
- List is read-only except selection + Dialog mutate; no inline edit forms.

## 3. Permitted Edit Scopes (Write Fields)
- Search, pagination, row selection, mark-paid Dialog.
- `POST` body: `{ dateKeys: string[] }` (UTC `YYYY-MM-DD`).
- Share % is edited in Settings → Shares & margins (not on this page).
- Do not invent wallet credits or Premium status mutations from this page.
