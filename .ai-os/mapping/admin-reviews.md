# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/reviews`
- Page: `src/app/admin/(panel)/reviews/page.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- Components: `src/components/admin/reviews/admin-reviews-workspace.tsx`, `src/components/admin/reviews/admin-review-detail-dialog.tsx`, `src/components/admin/reviews/admin-create-review-dialog.tsx`, `src/components/admin/use-admin-fetch.ts`
- Libs: `src/lib/reviews.ts`
- APIs: `src/app/api/admin/reviews/route.ts`, `src/app/api/admin/reviews/[id]/route.ts`, `src/app/api/admin/products/route.ts`, public create: `src/app/api/products/[productId]/reviews/route.ts`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN` via `src/app/admin/(panel)/layout.tsx` + `AdminShell`.
- List pages are read-only rows/badges; mutations only inside shadcn Dialog.
- Mobile-first compact lists; no inline wallet/status editors on list rows.
- Customer submit → PENDING; storefront + Product.rating use APPROVED only.

## 3. Permitted Edit Scopes (Write Fields)
- Dialog: approve/edit/disable/delete; post-as-buyer OR post direct custom guest review → APPROVED.
- Author modes: Registered Buyer vs Custom Author (display name, optional avatar URL, Verified Buyer badge toggle).
- Filters only on list.
