# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/orders/[id]` — redirect shell → `/admin/orders?id=`
- Page: `src/app/admin/(panel)/orders/[id]/page.tsx`
- Target UI: `src/components/admin/orders/admin-orders-workspace.tsx` (opens detail Dialog via `?id=`)
- APIs: `GET /api/admin/orders/[id]` (`src/app/api/admin/orders/[id]/route.ts`)
- Libs: `src/lib/orders.ts` (`getAdminOrder`)

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN` via `src/app/admin/(panel)/layout.tsx` + `AdminShell`.
- List pages are read-only rows/badges; mutations only inside shadcn Dialog.
- Mobile-first compact lists; no inline wallet/status editors on list rows.
- This route is a **redirect** — do not rebuild a separate full-page detail UI here.
- History / overview links to `/admin/orders/[id]` resolve via redirect into the list Dialog.

## 3. Permitted Edit Scopes (Write Fields)
- Redirect only (`redirect(/admin/orders?id=…)`). Detail edits stay on the list workspace Dialog.
