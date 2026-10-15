# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/users`
- Page: `src/app/admin/(panel)/users/page.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- Components: `src/components/admin/users/admin-users-workspace.tsx`, `src/components/admin/users/admin-user-detail-sheet.tsx`, `src/components/admin/users/admin-wallet-dialog.tsx`, `src/components/admin/users/admin-create-subseller-dialog.tsx`, `src/components/admin/sellers/admin-bulk-sellers-dialog.tsx`, `src/components/admin/users/admin-user-types.ts`, `src/components/admin/use-admin-fetch.ts`
- Libs: `src/lib/auth/admin.ts`, `src/lib/wallet.ts`, `src/lib/admin-users.ts` (`deleteAdminUser` soft-delete · `revokeUserApiKeysOnBan` · `BAN_REASON_MAX`), `src/lib/admin-bulk-sellers.ts`, `src/types/user.ts`
- APIs: `src/app/api/admin/users/route.ts`, `src/app/api/admin/users/[id]/route.ts` (GET/PATCH + **DELETE** soft; role/ban/`banReason`/wallet/caps/`apiEnabled`/`depositsEnabled`/Premium), `src/app/api/admin/users/[id]/impersonate/route.ts`, `src/app/api/admin/impersonation/route.ts`, `src/app/api/admin/resellers/create/route.ts`, `src/app/api/admin/sellers/bulk-action/route.ts`
- Related: Premium price → `/admin/settings`; legacy `/admin/premium` redirects here
- Schema: `User.banned` · `User.banReason` (admin-only note; cleared on unban) · `User.depositsEnabled` (self-serve deposits; resellers default off)

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN` via `src/app/admin/(panel)/layout.tsx` + `AdminShell`.
- List pages are read-only rows/badges; mutations only inside shadcn Dialog.
- Mobile-first compact lists; no inline wallet/status editors on list rows.
- Compact list: status/role/Premium/Verified badges + read-only balance; edits only in Dialog.
- Roles: `USER` | `SELLER` | `RESELLER` | `ADMIN`. Filter chips: roles + Premium / Not Premium / Verified / Unverified / Banned.
- Seller caps independent (only when role is SELLER).
- Granting Premium also sets `emailVerified: true` (same as former Premium desk).
- Create reseller Dialog min funding from Settings `reseller_create_min_funding` (default $5); loaded from `/api/admin/settings` when opening create.
- **Ban** = soft lock (login/session cut → `/banned`; commerce + API blocked). On ban: revoke ACTIVE `SellerApiKey`s; optional admin `banReason`. Wallet/orders preserved. Unban clears `banReason`.
- Delete = **soft-delete** (ban + `banReason: Soft-deleted` + anonymize `del_*` / `@deleted.local`); orders/deposits/transactions stay linked via `userId`. Revokes/deletes API keys. Cannot delete ADMIN (incl. self) or already-deleted.
- Banned users cannot receive deposit wallet credit (`completeDepositOnce` → `user_banned`); admin approve/recheck disabled until unban.

## 3. Permitted Edit Scopes (Write Fields)
- Detail Dialog: role, ban (confirm + optional reason) / unban, ban reason edit while banned, wallet add/cut, seller caps, Platform API, **Self-serve deposits** toggle, Premium, email verified, impersonate, create reseller, **soft-delete user** (confirm).
- One-Click Sellers Dialog: target audience, permissions, deposits, API access, Premium, mass wallet adjustment, mass ban/unban, broadcast notifications.
- List filters/search/pagination only.
- Role → `RESELLER` auto-sets `depositsEnabled=false`; leaving `RESELLER` auto-sets `true` unless admin sends an explicit flag.
