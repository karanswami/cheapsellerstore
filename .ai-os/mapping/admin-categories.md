# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/categories`
- Page: `src/app/admin/(panel)/categories/page.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- Components: `src/components/admin/categories/categories-workspace.tsx`, `src/components/admin/categories/admin-category-dialog.tsx`, `src/components/admin/categories/category-icon-picker.tsx`, `src/components/admin/categories/admin-assign-products-dialog.tsx`, `src/components/admin/use-admin-fetch.ts`
- Libs: `src/lib/slug.ts`, `src/lib/products.ts`, `src/lib/category-icons.ts`
- APIs: `src/app/api/admin/categories/route.ts`, `src/app/api/admin/categories/[id]/route.ts`, `src/app/api/admin/products/route.ts`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN` via `src/app/admin/(panel)/layout.tsx` + `AdminShell`.
- List pages are read-only rows/badges; mutations only inside shadcn Dialog.
- Mobile-first compact lists; no inline wallet/status editors on list rows.
- Delete orphans products (`categoryId=null`); Dialog-only create/edit/assign.

## 3. Permitted Edit Scopes (Write Fields)
- Dialog: name/slug/icon/sortOrder/productIds membership.
- Redirect shells `/new` `/[id]` → this page.
