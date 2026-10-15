# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/app/seller/leaderboard`
- Shared shell: `app-console-shell.md`
- Page: `src/app/app/seller/leaderboard/page.tsx`
- Loading: **none** (no route `loading.tsx`; parent `/app` layout Suspense only)
- Components:
  - `src/components/app/seller/seller-leaderboard-view.tsx` — wraps shared board
  - `src/components/app/leaderboard/leaderboard-board.tsx` (+ `leaderboard-board.module.css`) — shared podium + ranked list
  - `src/components/app/leaderboard/leaderboard-trust-badges.tsx`
- Hub components:
  - `HubPageShell` (`maxWidth="lg"`, `wide`)
  - `HubHeaderBar` + `HubStatPill` (inside `LeaderboardBoard`: Sellers / Your rank / Top earn)
  - `HubEmptyPanel` (inside `LeaderboardBoard`)
- Libs:
  - `src/lib/auth/customer.ts` (`getCurrentUser`)
  - `src/lib/seller-leaderboard.ts` (`getSellerLeaderboard`, `SellerLeaderboardEntry`)
  - `src/lib/roles.ts` (`isWholesaleRole`)
  - `src/lib/currencies.ts` (`formatMoney`)
- APIs: none client — server `getSellerLeaderboard` only

## 2. Hard Governance Rules (Read-Only Guardrails)
- Shared shell rules: `app-console-shell.md`.
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only; use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Customer session required; guests redirect to `/?auth=login&next=...`.
- SELLER / RESELLER only (`isWholesaleRole`); others redirect to `/app/leaderboard`.
- Private seller LB is read-only; use `getSellerLeaderboard` server data only.
- Rank by completed referral earnings (`TransactionType.REFERRAL_REWARD`, `COMPLETED`); break ties by paid/fulfilled sales volume.
- Non-viewer usernames are masked server-side; only the current viewer sees their full username.
- Show Premium / Verified badges and emoji status from User fields when present.

## 3. Permitted Edit Scopes (Write Fields)
- `HubHeaderBar` hero stats, leaderboard presentation / highlight current user (same podium layout as customer LB).
- Do not reuse public leaderboard ranking rules blindly; seller board uses earnings, masked usernames, and wholesale-only access.
- Trust badges + emoji are display-only.
- Consider adding `loading.tsx` → `HubPageSkeleton` if SSR latency warrants it.
