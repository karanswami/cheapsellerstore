# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/app/become-seller`
- Shared shell: `app-console-shell.md`
- Page: `src/app/app/become-seller/page.tsx`
- Loading: **none** (no route `loading.tsx`)
- Components: `src/components/app/become-reseller-form.tsx` (title: Become a Seller), `src/components/layout/reseller-apply-popup.tsx` (48-hour reminder modal for non-resellers)
- Hub components:
  - `HubPageShell` (`maxWidth="md"`)
  - `HubHeaderBar` (application hero)
  - `HubPanelCard` (application form body)
- Libs: `src/lib/settings.ts` (`isResellerProgramEnabled`, `getResellerApplyMinBalanceUsd`), `src/lib/auth/customer.ts`, `src/lib/currencies.ts`
- APIs: `POST /api/reseller-requests` (approve → `UserRole.SELLER`)
- Admin counterpart: `/admin/sellers` → `admin-sellers.md`
- Legacy redirect: `/app/become-reseller` → this page

## 2. Hard Governance Rules (Read-Only Guardrails)
- Shared shell rules: `app-console-shell.md`.
- Only `USER` role may apply; others redirect to `/app/profile`.
- Program enabled + min wallet balance from admin Settings (`AppSetting`) — never hardcode mins.
- Pending application redirects to `/app/profile`.
- Do not auto-promote role client-side; respect auto-approve setting on server.
- Approval sets `role: SELLER` (not RESELLER).
- Form fields live inside `HubPanelCard` — Dialog-only pattern not required for single-page apply flow.

## 3. Permitted Edit Scopes (Write Fields)
- `HubHeaderBar` + `HubPanelCard` layout; application fields only (socials, experience, reason, etc.).
- Do not change wallet/role here — approval path owns role promotion.
