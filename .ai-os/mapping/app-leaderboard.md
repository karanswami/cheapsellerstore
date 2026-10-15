# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/app/leaderboard`
- Shared shell: `app-console-shell.md`
- Page: `src/app/app/leaderboard/page.tsx`
- Loading: `src/app/app/leaderboard/loading.tsx` → `HubPageSkeleton` (`rows={5}`, `showToolbar={false}`, `showChips={false}`)
- Components:
  - `src/components/app/leaderboard-view.tsx` — wraps board in `HubPageShell`
  - `src/components/app/leaderboard/leaderboard-board.tsx` (+ `leaderboard-board.module.css`) — podium + ranked list
  - `src/components/app/leaderboard/leaderboard-trust-badges.tsx` — Premium/Verified/You badges
  - `src/components/ui/premium-badge.tsx` (+ `premium-badge.module.css`) — animated Premium chip/seal
- Hub components:
  - `HubPageShell` (`maxWidth="lg"`, `wide`)
  - `HubHeaderBar` + `HubStatPill` (inside `LeaderboardBoard`: Ranked / Your rank / Top spend)
  - `HubEmptyPanel` (empty board state)
- Libs: `src/lib/auth/customer.ts`, `src/lib/leaderboard.ts` (`getLeaderboard`)
- Types: `src/types/leaderboard.ts` (`isPremium`, `emailVerified`, `emojiStatus`, `keyCount`)
- APIs: none client — server `getLeaderboard` only

## 2. Hard Governance Rules (Read-Only Guardrails)
- Shared shell rules: `app-console-shell.md`.
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only; use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Customer session required; guests redirect to `/?auth=login&next=/app/leaderboard`.
- Rank by spend from FULFILLED/PAID orders only.
- Row meta shows **key purchase count** (`OrderItem` rows), not order row count.
- Read-only leaderboard; no wallet mutations here.
- Show Premium / Verified badges and emoji status from User fields when present.

## 3. Permitted Edit Scopes (Write Fields)
- `HubHeaderBar` hero stats, podium/list presentation, viewer highlight, `HubEmptyPanel` copy.
- Do not invent ranks client-side — use `getLeaderboard`.
- Trust badges + emoji are display-only (no grant/revoke here).
