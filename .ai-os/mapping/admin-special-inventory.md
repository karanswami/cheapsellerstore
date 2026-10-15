# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/special-inventory`
- Page: `src/app/admin/(panel)/special-inventory/page.tsx`
- Loading: `src/app/admin/(panel)/special-inventory/loading.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- Components: `src/components/admin/special-inventory/special-inventory-workspace.tsx`, `src/components/admin/stats/kpi-card.tsx`, `src/components/ui/empty-state.tsx`, `src/components/admin/use-admin-fetch.ts`
- Libs: `src/lib/special-inventory.ts`, `src/lib/developer-settlements.ts` (isolation logic from 10% store dev share), `src/lib/settings.ts` (`getSpecialStockDeveloperShareRate`), `src/lib/admin-stats.ts`
- Schema: `Key.isSpecialInventory`, `Key.specialBatchTag`, `SpecialStockSettlementDay` in `prisma/schema.prisma`
- APIs: `GET/POST /api/admin/special-inventory`, `GET/POST /api/admin/special-inventory/settlements`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client never imports `@/lib/prisma`.
- Money is USD microcents; display via `formatMoney`.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN`.
- **Special inventory keys sell normally on the store, and sales/gross profits from these keys are 100% excluded from standard `/admin/development` (0% standard dev share).**
- **50/50 Settlement System on `/admin/special-inventory`:** Daily special stock profit is computed live and split 50% Developer Share / 50% Owner Share.
- Settlement status is tracked via `SpecialStockSettlementDay` (PENDING / PAID with snapshot and adminId). Marking paid does not mutate customer wallets, deposits, or order lines.
- Admin import and Mark-Paid confirmations use Dialogs with header band, scroll body, and `DialogFooter`.

## 3. Permitted Edit Scopes (Write Fields)
- Search, status filter (`all` | `AVAILABLE` | `SOLD`), product filter, settlement date search, settlement selection.
- Import special keys: `POST /api/admin/special-inventory` with `{ durationId, rawKeys, batchTag }`.
- Mark special settlements paid: `POST /api/admin/special-inventory/settlements` with `{ dateKeys: string[] }`.
