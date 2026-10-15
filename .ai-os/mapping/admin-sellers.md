# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/sellers`
- Page: `src/app/admin/(panel)/sellers/page.tsx` (+ `loading.tsx`)
- Components: `src/components/admin/resellers/resellers-workspace.tsx`, `src/components/admin/resellers/reseller-review-dialog.tsx`, `src/components/admin/sellers/admin-bulk-sellers-dialog.tsx`, `src/components/admin/resellers/reseller-types.ts`, `src/components/admin/use-admin-fetch.ts`
- Libs: `src/lib/admin-bulk-sellers.ts`
- APIs: `GET /api/admin/resellers`, `PATCH /api/admin/resellers/[id]` (approve → `SELLER`), `GET/POST /api/admin/sellers/bulk-action` (One-Click All Sellers batch operations)
- Legacy redirect: `/admin/resellers` → this page

## 2. Hard Governance Rules (Read-Only Guardrails)
- Admin gate: customer JWT with `User.role === ADMIN`.
- List is read-only summaries; approve/reject/disapprove only in review Dialog.
- Approve promotes applicant to `SELLER`; caps remain admin-granted separately on Users desk.
- One-Click All Sellers applies batch operations (caps, self-serve deposits, API access, Premium, verification, mass wallet bonus/debit, mass ban/unban, broadcast notifications) exclusively through `AdminBulkSellersDialog` with preview stats and confirmation safeguards.

## 3. Permitted Edit Scopes (Write Fields)
- Review Dialog: status, notes, approve/reject/disapprove actions only.
- One-Click All Sellers Dialog: target audience (`SELLERS`, `RESELLERS`, `ALL_SELLERS_AND_RESELLERS`), batch action types, wallet adjustment amounts/notes, ban reasons, in-app notifications.
