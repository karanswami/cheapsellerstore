# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/static-pages` — UI status: ✅ live
- Page: `src/app/admin/(panel)/static-pages/page.tsx` → `StaticPagesWorkspace`
- Loading: `src/app/admin/(panel)/static-pages/loading.tsx`
- Workspace: `src/components/admin/static-pages/static-pages-workspace.tsx` (compact list + Dialog create/edit; Switch active; delete confirm)
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- APIs: `src/app/api/admin/static-pages/route.ts` (GET/POST), `src/app/api/admin/static-pages/[id]/route.ts` (PATCH/DELETE)
- Schema: `StaticPage` (`slug`, `title`, `seoTitle?`, `seoDescription?`, `content`, `active`, `sortOrder`)
- Public consumers: `/pages/[slug]` + `/api/pages` + footer + profile help rows (`src/lib/static-pages.ts`)

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN` via `src/app/admin/(panel)/layout.tsx` + `AdminShell`.
- List pages are read-only rows/badges; mutations only inside shadcn Dialog.
- Mobile-first compact lists; no inline editors on list rows.
- Active pages feed storefront `/pages/[slug]`, footer nav, and profile help rows.
- Slug is set on create only (immutable in edit Dialog).

## 3. Permitted Edit Scopes (Write Fields)
- Page Dialog: `slug` (create), `title`, `content`, `seoTitle`, `seoDescription`, `active`, `sortOrder`.
- List row opens edit Dialog; delete via confirm.
- Do not invent a second CMS store — use `StaticPage` + existing admin APIs.
- Seed defaults: `npm run db:seed-pages` (privacy / payment / terms / refund / delivery / disclaimer).
