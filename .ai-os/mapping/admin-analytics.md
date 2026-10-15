# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/analytics`
- Page: `src/app/admin/(panel)/analytics/page.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- Components: `src/components/admin/analytics/analytics-workspace.tsx`, `src/components/admin/use-admin-fetch.ts`
- Libs: `src/lib/admin-stats.ts`, `src/types/admin-stats.ts`
- APIs: `src/app/api/admin/analytics/route.ts`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN` via `src/app/admin/(panel)/layout.tsx` + `AdminShell`.
- List pages are read-only rows/badges; mutations only inside shadcn Dialog.
- Mobile-first compact lists; no inline wallet/status editors on list rows.
- Composition charts (roles/methods/statuses) — read-only.

## 3. Permitted Edit Scopes (Write Fields)
- Chart layout/filters only.
- No write actions.
