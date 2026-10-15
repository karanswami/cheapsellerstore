# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/orders` (+ `?id=` deep-link)
- Page: `src/app/admin/(panel)/orders/page.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- Components: `src/components/admin/orders/admin-orders-workspace.tsx`, `src/components/admin/admin-page-header.tsx`
- Libs: `src/lib/orders.ts` (`listAdminOrders`, `getAdminOrder`, audience/status parsers), `src/lib/currencies.ts`, `src/lib/roles.ts`
- Types: `src/types/admin-orders.ts`
- APIs: `GET /api/admin/orders?audience=&status=&page=&limit=&q=` → `{ orders, page, limit, total, hasMore }`; `GET /api/admin/orders/[id]` → order detail + keys

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN` via `src/app/admin/(panel)/layout.tsx` + `AdminShell`.
- List pages are read-only rows/badges; mutations only inside shadcn Dialog.
- Mobile-first compact lists; no inline wallet/status editors on list rows.
- **Do not load all orders at once** — server `page`/`limit` + infinite append; reset on filter/search change.
- Audience filters: All / Users / Resellers / Admins / Guests (`userId` null).
- Status filters: All / Fulfilled / Paid / Pending / Failed / Refunded.
- Detail Dialog is inspect-only (copy keys / order id / access token); no status mutations here.
- Never expose unused key codes on public APIs — admin detail may show delivered codes.

## 3. Permitted Edit Scopes (Write Fields)
- Audience + status filter chips, search (`q`), progressive list load.
- Detail Dialog presentation only (copy helpers). No order status / refund mutations from this page yet.
