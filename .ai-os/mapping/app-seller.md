# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/app/seller`
- Shared shell: `app-console-shell.md`
- Page: `src/app/app/seller/page.tsx`
- Loading: `src/app/app/seller/loading.tsx` → `HubPageSkeleton` (`rows={4}`, `showChips={false}`)
- Components: `src/components/app/seller/seller-panel-view.tsx`, `src/components/app/seller/create-sub-seller-dialog.tsx`, `src/components/app/seller/sub-seller-detail-dialog.tsx`
- Hub components:
  - `HubPageShell` (`maxWidth="lg"`)
  - `HubHeaderBar` + `HubStatPill` (Resellers count) + header `actions` (Add reseller CTA)
  - `HubListStack`, `HubListRow` (interactive reseller rows)
  - `HubEmptyPanel`
- Libs: `src/lib/auth/customer.ts`, `src/lib/resellers.ts` (`sellerHasSellerPanel`)
- APIs: `GET/POST /api/seller/resellers`, `PATCH /api/seller/resellers/[id]`, `POST /api/seller/resellers/[id]/credit` (legacy `sub-sellers` aliases)

## 2. Hard Governance Rules (Read-Only Guardrails)
- Shared shell rules: `app-console-shell.md`.
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only; use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Customer session required; guests redirect to `/?auth=login&next=/app/seller`.
- Requires seller panel gate (`sellerHasSellerPanel` — role `SELLER` + any cap); else redirect `/app`.
- Caps are independent: `canCreateResellers` · `canManageResellers` · `canFundResellers`.
- Creates `RESELLER` accounts with `depositsEnabled: false` (self-serve deposit off — fund via seller); funding/create use USD microcents; min create funding from Settings `reseller_create_min_funding` (default $5); dialog-only mutations.
- `GET /api/seller/resellers` returns `createMinFundingUsd` for the create Dialog.

## 3. Permitted Edit Scopes (Write Fields)
- `HubHeaderBar` network summary + create action; `HubListRow` read-only list rows; create/manage/fund Dialog fields only.
- Do not collapse create/manage/fund into one permission.
