# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/banners`
- Page: `src/app/admin/(panel)/banners/page.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- Components: `src/components/admin/banners/banners-workspace.tsx`, `src/components/admin/use-admin-fetch.ts`
- Libs: `src/lib/banners.ts`, `src/lib/public-uploads.ts` (`saveBannerUpload`, `readPublicUpload`)
- APIs: `src/app/api/admin/banners/route.ts`, `src/app/api/admin/banners/[id]/route.ts`, `src/app/api/admin/banners/upload/route.ts`
- Serve: `src/app/uploads/[...path]/route.ts` for runtime `/uploads/banners/*`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN` via `src/app/admin/(panel)/layout.tsx` + `AdminShell`.
- List pages are read-only rows/badges; mutations only inside shadcn Dialog.
- Mobile-first compact lists; no inline wallet/status editors on list rows.
- Public banners power `/` and `/app` carousel; upload path `/uploads/banners/`.

## 3. Permitted Edit Scopes (Write Fields)
- Compact media divide-y rows; row tap opens CRUD Dialog (upload, active Switch, priority, delete).
- List read-only badges; mutations only inside Dialog.
