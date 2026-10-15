# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/order/[orderId]?token=`
- Page: `src/app/order/[orderId]/page.tsx`
- Components: `src/components/checkout/order-success.tsx`, `src/components/checkout/order-details.tsx` (if used), `src/components/product/key-reveal.tsx`
- Libs: `src/lib/orders.ts` (`getOrderByAccessToken`), `src/lib/currencies.ts`
- API (token fetch path): `src/app/api/orders/[orderId]/route.ts`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Access requires order token query; missing/invalid → `notFound()`.
- Key codes shown only for purchased order items owned by token access.
- Never expose unrelated AVAILABLE inventory codes.

## 3. Permitted Edit Scopes (Write Fields)
- Success UI: copy/download presentation, item list layout.
- Do not change claim/debit rules from this page — display only.
