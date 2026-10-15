# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/history`
- Page: `src/app/admin/(panel)/history/page.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- Components: `src/components/admin/history/history-workspace.tsx`, `src/components/admin/use-admin-fetch.ts`
- Libs: `src/lib/history.ts`, `src/lib/admin-stats.ts`
- APIs: `src/app/api/admin/history/route.ts`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN` via `src/app/admin/(panel)/layout.tsx` + `AdminShell`.
- List pages are read-only rows/badges; mutations only inside shadcn Dialog.
- Mobile-first compact lists; no inline wallet/status editors on list rows.
- Multi-kind activity; detail Dialog is inspect-only.
- **Do not load all history at once** — server `page`/`limit`/`q`; client infinite append (IntersectionObserver + Load more) with skeleton while fetching next page.

## 3. Permitted Edit Scopes (Write Fields)
- Kind filter chips (`FilterChip` / `FilterChipRow`), compact divide-y list (`max-w-3xl`), server-paginated infinite scroll (15/page), detail Dialog presentation.
- API: `GET /api/admin/history?kind=&page=&limit=&q=` → `{ events, page, limit, total, hasMore }`.
- Detail Dialog: flex column `max-h-[min(92dvh,…)]` + muted header band + scroll body + `DialogFooter` with `mx-0 mb-0` (Cancel/Close + optional Open related).
- No ledger mutations here.
