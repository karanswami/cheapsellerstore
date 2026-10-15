# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/special-prices`
- Page: `src/app/admin/(panel)/special-prices/page.tsx` (+ `loading.tsx`)
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx` (Users group → Special prices)
- Components: `src/components/admin/special-prices/special-prices-workspace.tsx`, `special-price-history-dialog.tsx`, `src/components/admin/use-admin-fetch.ts`, `src/components/ui/dialog-shell.tsx`
- Libs: `src/lib/pricing.ts` (`resolveUnitPrice`, `getSpecialPricesForUser`), `src/lib/special-price-history.ts` (record + paginated list), `src/lib/currencies.ts`, `src/lib/console-page-meta.ts`, `src/lib/activity-log.ts`
- Types: `src/types/special-price-history.ts`
- Schema: `UserSpecialPrice` (`userId` + `durationId` unique; `price` USD microcents); `UserSpecialPriceHistory` (SET/UPDATE/CLEAR audit; denormalized labels)
- APIs: `GET/PUT/DELETE /api/admin/special-prices` (`active=1` live list · `q` user search · `userId` overrides), `GET /api/admin/special-prices/catalog`, `GET /api/admin/special-prices/history`
- Pricing consumers (special overrides + flash/promo skip): `src/lib/orders.ts`, `src/lib/products.ts`, `src/app/api/flash-sales/quote/route.ts`, `src/app/api/promos/validate/route.ts`, `src/lib/seller-api/catalog.ts`, `src/lib/seller-api/orders.ts`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client never imports `@/lib/prisma`.
- Money is USD microcents only; Dialog USD input → `usdToMicrocents`.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN`.
- Any user can receive specials (not role-gated); admin searches username/email/name.
- Find-user + product catalog: list/search is read-only; set/clear prices only inside product duration Dialog.
- **Active specials** list (page bottom): live `UserSpecialPrice` rows; tap row → Dialog to change price or Clear (unset). Filter + Load more. Not the audit log.
- Special price is exact unit price — flash sales and promos do not apply to that duration line (checkout, cart quote, promo validate, Platform API).
- Catalog picker must paginate (`page`/`limit`); never dump full product tree unbounded.
- History Dialog is permanent audit (no 7-day purge); denormalized so it survives user/product deletes. List is read-only + Load more; filters by user / action / search.
- Every SET / UPDATE / CLEAR writes `UserSpecialPriceHistory` + `ActivityLog` (ADMIN).

## 3. Permitted Edit Scopes (Write Fields)
- Upsert: `userId`, `durationId`, `priceUsd` → `UserSpecialPrice.price` (+ history SET/UPDATE).
- Delete: `userId` + `durationId` clears override (+ history CLEAR).
- Active list GET: `active=1` + `page` / `limit` / optional `q` (user or product).
- History GET: filters `userId`, `action` (SET|UPDATE|CLEAR), `q`, `page`, `limit` — no mutate.
- Sidebar + console meta for `/admin/special-prices` only.
