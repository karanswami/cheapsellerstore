# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/promos`
- Page: `src/app/admin/(panel)/promos/page.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- Components: `src/components/admin/promos/promos-workspace.tsx`, `src/components/admin/promos/admin-promo-dialog.tsx`, `src/components/admin/use-admin-fetch.ts`
- Libs: `src/lib/promos.ts` (DB lookup / notify), `src/lib/promo-calc.ts` (client-safe discount math), `src/lib/flash-sale-format.ts` (datetime-local helpers), `src/lib/offer-banner.ts` (storefront banner; flash wins over promo)
- APIs: `src/app/api/admin/promos/route.ts`, `src/app/api/admin/promos/[id]/route.ts`, `src/app/api/admin/products/route.ts` (product picker)
- Schema: `PromoCode` — `startsAt` / `expiresAt` (datetime), `scope` GLOBAL|PRODUCT|DURATION, `targetRole`, `perUserLimit`, `showBanner` (default false)

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN` via `src/app/admin/(panel)/layout.tsx` + `AdminShell`.
- List pages are read-only rows/badges; mutations only inside shadcn Dialog.
- Mobile-first compact lists; no inline wallet/status editors on list rows.
- Promo windows use `datetime-local` (date + time), same pattern as Flash Sale.
- `showBanner` is independent of `active` — hide Home banner without disabling the code.
- When both flash + promo have banners on, up to **3** cards stack under the image carousel (flashes first, then promos).
- Discount applies only to scoped product/duration units; `perUserLimit` caps how many units get the discount; audience (`targetRole`) enforced at validate + checkout.
- Promo discounts USD microcents; validation via `src/app/api/promos/validate/route.ts` (login required).

## 3. Permitted Edit Scopes (Write Fields)
- Add/Edit Dialog: code, starts/ends datetime, audience, per-user uses, discount, scope + product/duration, total uses, active, **storefront banner**, description, notify.
- List read-only.
