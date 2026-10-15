# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/checkout`
- Page: `src/app/checkout/page.tsx`
- Components: `src/components/checkout/checkout-view.tsx`, `src/components/checkout/order-details.tsx`, `src/components/checkout/checkout-skeleton.tsx`, `src/components/catalog/flash-sale-ticker.tsx`, `src/components/auth/login-form.tsx`, `src/components/auth/auth-provider.tsx`
- Hooks: `src/hooks/use-cart.ts` → `src/components/cart/cart-provider.tsx` (flash + stock quote refresh)
- Libs (via checkout-view / orders): `src/lib/orders.ts`, `src/lib/keys.ts` (`releaseKeysForOrder`), `src/lib/supplier/resolve-key.ts` (hybrid supplier → local), `src/lib/supplier/stock.ts` (effective stock), `src/lib/promos.ts`, `src/lib/promo-calc.ts`, `src/lib/flash-sales.ts`, `src/lib/wallet.ts`, `src/lib/currencies.ts`, `src/lib/feedback.ts`, `src/lib/telegram-notify.ts` (purchase channel: product ×qty · $ via `formatTelegramPurchaseLines`)
- APIs: `src/app/api/checkout/route.ts` (accepts `promoCode`; server re-validates audience/scope/window + applies unit-capped discount), promo via cart `src/app/api/promos/validate/route.ts`, flash via `src/app/api/flash-sales/quote/route.ts`, stock via `src/app/api/stock/quote/route.ts` (local + supplier virtual)
- Auth fallback uses AuthDialog views: login / register / forgot / 2fa

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Wallet-gated checkout; debit + key resolve server-side only (`resolveKeyForDuration`: supplier when enabled+mapped, else local `claimKey`; fallback to local on supplier fail). Supplier deliverable code = `full_value` when present.
- **Stock-gated:** cart/checkout must pass effective stock (`stockOk` via local AVAILABLE + supplier-eligible virtual); sold-out lines blocked from pay.
- Failed fulfill **releases** claimed keys (`releaseKeysForOrder`) + deletes order items — no stock leak (undelivered supplier keys return to AVAILABLE local stock).
- Balance display uses live `useAuth().user` (5s `/api/auth/me` sync) with server prop fallback.
- Cart must wait for `hydrated` — no empty-cart flash after pay.
- Prices/promo/flash math stay server-validated; no client FX.
- Cart/checkout show flash ticker + strikethrough list price; server re-applies flash at fulfill.
- Device-bound Android ID items: strictly limited to 1 item per checkout (`quantity: 1` capped in cart state and direct checkout flow).
- Promo: checkout body may include `promoCode`; discount only on scoped eligible units up to remaining `perUserLimit`; audience + datetime window enforced server-side.

## 3. Permitted Edit Scopes (Write Fields)
- Checkout UI layout, empty/login/stock states, pay button copy.
- Client may call checkout API with cart lines + promo; never claim keys client-side.
- Login/register switches via `openAuth(..., '/checkout')`.
