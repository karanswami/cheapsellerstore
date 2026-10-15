# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/development`
- Page: `src/app/admin/(panel)/development/page.tsx`
- Loading: `src/app/admin/(panel)/development/loading.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- Components: `src/components/admin/development/development-workspace.tsx`, `src/components/admin/stats/kpi-card.tsx`, `src/components/admin/use-admin-fetch.ts`
- Libs: `src/lib/developer-settlements.ts`, `src/lib/admin-stats.ts` (date helpers), `src/lib/settings.ts` (`getDeveloperProfitShareRate`), `src/types/developer-settlements.ts`
- Schema: `DeveloperSettlementDay`, `DeveloperSettlementStatus` in `prisma/schema.prisma`
- APIs: `GET/POST /api/admin/developer-settlements`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client never imports `@/lib/prisma`.
- Money is USD microcents; display via `formatMoney`.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN`.
- **Settlement marks do not touch wallets, orders, deposits, or checkout.**
- Daily rows are live-computed from `PAID`/`FULFILLED` orders; `DeveloperSettlementDay` only stores paid status + amount snapshot.
- Date window: from site start (earliest user / paid order) through today, capped at 90 days — no pre-launch empty calendar days.
- Developer share = gross profit (sale − buy) × Settings `developer_profit_share_percent` (default 10%).
- Mark paid only via shadcn Dialog confirmation (single or batch).
- Confirm Dialog: `flex max-h-[min(92dvh,…)] flex-col gap-0 overflow-hidden p-0`; header band + icon; scroll body; `DialogFooter` with `mx-0 mb-0` (override default negative margins when `p-0`).
- List is read-only except selection + Dialog mutate; no inline edit forms.

## 3. Permitted Edit Scopes (Write Fields)
- Search, pagination, row selection, mark-paid Dialog.
- `POST` body: `{ dateKeys: string[] }` (UTC `YYYY-MM-DD`).
- Share % is edited in Settings → Shares & margins (not on this page).
- Do not invent wallet credits or order mutations from this page.
