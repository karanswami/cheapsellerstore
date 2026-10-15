# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/key-check`
- Page: `src/app/admin/(panel)/key-check/page.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- Components: `src/components/admin/key-check/key-check-workspace.tsx`
- Libs: `src/lib/keys.ts`
- APIs: `src/app/api/admin/keys/check/route.ts`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN` via `src/app/admin/(panel)/layout.tsx` + `AdminShell`.
- List pages are read-only rows/badges; mutations only inside shadcn Dialog.
- Mobile-first compact lists; no inline wallet/status editors on list rows.
- Exact code lookup; sold keys view-only; admin-only surface.

## 3. Permitted Edit Scopes (Write Fields)
- Search UI + result presentation.
- Do not bulk-export unused codes publicly.
