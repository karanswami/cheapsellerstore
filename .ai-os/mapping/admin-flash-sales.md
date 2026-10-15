# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/flash-sales`
- Page: `src/app/admin/(panel)/flash-sales/page.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- Components: `src/components/admin/flash-sales/flash-sales-workspace.tsx`, `src/components/admin/flash-sales/admin-flash-sale-dialog.tsx`, `src/components/admin/use-admin-fetch.ts`
- Libs: `src/lib/flash-sales.ts` (active sale lookup, percent apply, datetime parse, notify), `src/lib/flash-sale-format.ts` (client-safe labels/countdown), `src/lib/offer-banner.ts` (storefront special-offer banners; up to 3 under carousel)
- Storefront banner: `src/components/catalog/flash-offer-banner.tsx` (+ module CSS) via `store-catalog-slots` `BannerSlot` — **below** image carousel; up to 3 stacked (`getActiveOfferBanners`)
- APIs: `src/app/api/admin/flash-sales/route.ts`, `src/app/api/admin/flash-sales/[id]/route.ts`, `src/app/api/admin/products/route.ts` (product/duration picker)
- Checkout pricing: `src/lib/orders.ts` uses `listActiveFlashSales` / `pickFlashSale` / `applyFlashPercent`
- Storefront quote: `src/app/api/flash-sales/quote/route.ts`
- Schema: `FlashSale` — `showBanner` (default true), `bannerDescription`, `displayPromoCode` (copy-only; optional)

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN` via `src/app/admin/(panel)/layout.tsx` + `AdminShell`.
- List pages are read-only rows/badges; mutations only inside shadcn Dialog.
- Mobile-first compact lists; no inline wallet/status editors on list rows.
- Scope mirrors promos: `GLOBAL` (whole store) · `PRODUCT` (one product, all durations) · `DURATION` (one duration).
- Flash sales are automatic (no code); percent-only; window via `startsAt` / `expiresAt` with **date + time** (`datetime-local`).
- `showBanner` is independent of `active` — turn banner off to hide the storefront card while discount still applies.
- `displayPromoCode` is display/copy only; checkout still needs a real `PromoCode` if redeeming.

## 3. Permitted Edit Scopes (Write Fields)
- Add/Edit Dialog: title, percent, audience, scope + product/duration pickers, start/end datetime, active, **storefront banner** (`showBanner` + description + optional display promo code), notify-on-save.
- List read-only; tap row → edit Dialog (delete in Dialog).
