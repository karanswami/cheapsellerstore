# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/app/history`
- Shared shell: `app-console-shell.md`
- Page: `src/app/app/history/page.tsx`
- Loading: `src/app/app/history/loading.tsx` → `HubPageSkeleton` (`rows={6}` — default toolbar + chips)
- Components: `src/components/app/history-view.tsx`
- Hub components:
  - `HubPageShell`
  - `HubHeaderBar` + `HubStatPill` (Items / active Filter)
  - `HubToolbar`, `HubSearch`
  - `HubListStack`, `HubListRow` (interactive activity rows)
  - `HubEmptyPanel`
  - `FilterChip` / `FilterChipRow` inside toolbar
- Libs: `src/lib/auth/customer.ts`, `src/lib/history.ts` (`getUserActivityHistoryPage`)
- APIs: `GET /api/history?page=&limit=&filter=&q=` (paginated)

## 2. Hard Governance Rules (Read-Only Guardrails)
- Shared shell rules: `app-console-shell.md`.
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Customer session required; guests redirect to login dialog.
- Activity kinds: orders / deposits / wallet ledger — read-only detail Dialog.
- **Do not load all history at once** — server `page`/`limit`/`filter`/`q`; SSR page 1 + infinite Load more; reset on filter/search change.
- No balance edits from history.

## 3. Permitted Edit Scopes (Write Fields)
- `HubHeaderBar` summary stats; `HubToolbar` filter chips + search; `HubListRow` presentation; detail Dialog; progressive load UX.
- `HubPageSkeleton` row count in `loading.tsx` when list density changes.
- Do not mutate ledger/orders from this page.
