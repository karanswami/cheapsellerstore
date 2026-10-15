# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/statistics`
- Page: `src/app/admin/(panel)/statistics/page.tsx`
- Loading: `src/app/admin/(panel)/statistics/loading.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- Components: `src/components/admin/statistics/statistics-workspace.tsx`, `src/components/admin/stats/kpi-card.tsx`, `src/components/admin/stats/admin-chart-card.tsx`, `src/components/admin/use-admin-fetch.ts`
- Libs: `src/lib/admin-stats.ts` (`getStatisticsStats`), `src/lib/settings.ts` (`getDeveloperProfitShareRate`), `src/types/admin-stats.ts`
- APIs: `GET /api/admin/statistics?period=today|7|30|90`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN`.
- Read-only report — no mutations.
- Paid orders = `PAID` + `FULFILLED`.
- **Gross profit** = sale (`OrderItem.unitPrice`) − buy (`DurationPrice.buyPrice`).
- **Developer** = Settings `developer_profit_share_percent` of gross profit (default 10%); **Owner** = remainder. Payload includes `shareRate`.
- Discount = max(0, catalog `DurationPrice.price` − `unitPrice`).
- Missing cost = line items with no USD price row or `buyPrice <= 0`.
- Charts/series are server-derived; no client-side aggregates beyond display.

## 3. Permitted Edit Scopes (Write Fields)
- Period filter (`today` / `7` / `30` / `90`), KPI/chart/product-row presentation.
- Profit-share % is edited in Settings → Shares & margins (not on this page).
- No write actions on this page.
