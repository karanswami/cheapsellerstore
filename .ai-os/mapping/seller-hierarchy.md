# Feature Maps & Access Rules

## 1. File Inventory
- Pages: `src/app/app/seller/page.tsx`, `src/app/app/seller/leaderboard/page.tsx`, `src/app/app/become-seller/page.tsx`
- Workspaces / dialogs: `src/components/app/seller/seller-panel-view.tsx`, `src/components/app/seller/create-sub-seller-dialog.tsx`, `src/components/app/seller/sub-seller-detail-dialog.tsx`, `src/components/app/become-reseller-form.tsx`, `src/components/admin/resellers/resellers-workspace.tsx`, `src/components/admin/resellers/reseller-review-dialog.tsx`
- APIs: `src/app/api/reseller-requests/route.ts`, `src/app/api/seller/resellers/*`, `src/app/api/admin/resellers/*`, `src/app/api/admin/resellers/create/route.ts`, `src/app/api/admin/sub-sellers/route.ts` (alias)
- Core libs / schema: `src/lib/resellers.ts` (+ `sub-sellers.ts` re-exports), `src/lib/pricing.ts`, `src/lib/roles.ts`, `src/lib/referral-rewards.ts`, `src/lib/seller-leaderboard.ts`, `prisma/schema.prisma` (`User.role`, `canCreate/Manage/FundResellers`, `ResellerRequest`)

## 2. Hard Governance Rules (Read-Only Guardrails)
- Role hierarchy is DB-backed: `USER`, `SELLER`, `RESELLER`, `ADMIN`.
- Seller capabilities are separate booleans; create, manage, and fund cannot be conflated.
- Seller + Reseller share wholesale `resellerPrice`; User/Admin use retail `price`.
- A seller can only act on its own resellers; admin routes govern broader review/approval.
- Creates `RESELLER` accounts with `depositsEnabled: false` (self-serve deposit off until admin enables).
- Seller lists stay read-only summaries; status and balance changes happen in dialogs or action routes.
- Business mins/percents come from admin Settings — do not hardcode.
- Referral commission is **three rates by buyer role**: User / Seller / Reseller (`referral_percent` · `seller_purchase_percent` · `reseller_purchase_percent`).

## 3. Permitted Edit Scopes (Write Fields)
- Become-a-Seller forms may edit application fields only.
- Seller panel dialogs may create resellers, change status, delete, and fund/reclaim balance within capability limits.
- Admin seller review dialogs may approve, reject, or disapprove requests and adjust review notes.
