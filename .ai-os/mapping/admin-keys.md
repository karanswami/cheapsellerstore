# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/keys`
- Page: `src/app/admin/(panel)/keys/page.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- Components: `src/components/admin/keys/keys-workspace.tsx`, `src/components/admin/admin-page-header.tsx`, `src/components/admin/use-admin-fetch.ts`
- Libs: `src/lib/keys.ts` (`countAvailableKeys*`, `releaseOrphanedSoldKeys`, claim/release)
- APIs: `src/app/api/admin/keys/route.ts` (groupBy status counts — no full key dump), `src/app/api/admin/keys/import/route.ts`, `src/app/api/admin/keys/[id]/route.ts`, `src/app/api/admin/products/route.ts`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN` via `src/app/admin/(panel)/layout.tsx` + `AdminShell`.
- List pages are read-only rows/badges; mutations only inside shadcn Dialog.
- Mobile-first compact lists; no inline wallet/status editors on list rows.
- Import paste + review; delete AVAILABLE only; statuses AVAILABLE|SOLD|DISABLED.

## 3. Permitted Edit Scopes (Write Fields)
- Product/duration selects, paste import Dialog, delete AVAILABLE keys.
- Nested product keys route redirects here with `?durationId=`.
