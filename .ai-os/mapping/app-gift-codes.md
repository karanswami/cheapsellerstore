# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/app/gift-codes`
- Shared shell: `app-console-shell.md`
- Page: `src/app/app/gift-codes/page.tsx`
- Loading: `src/app/app/gift-codes/loading.tsx` → `HubPageSkeleton` (no toolbar/chips)
- Components: `src/components/app/gift-codes-view.tsx`
- Hub: `HubPageShell` (`maxWidth="sm"`), `HubHeaderBar`, `HubPanelCard`, `HubEmptyPanel`
- Related: deposit entry link in `src/components/app/deposit-view.tsx` → `/app/gift-codes`
- Libs: `src/lib/gift-codes.ts` (`claimGiftCode`, `listMyGiftClaims`, `normalizeGiftCode`)
- APIs: `GET/POST /api/gift-codes` — list own claims (`page`/`limit`) + claim `{ code }`
- Schema: `GiftCode` · `GiftCodeStatus` · `TransactionType.GIFT_CODE`
- Nav: Wallet → Gift codes in `customer-sidebar.tsx` **only when** Settings Pages enable → Gift codes is on (default off)
- Gate: `isGiftCodesEnabled()` / `pages_enabled` AppSetting; claim API returns `GIFT_CODES_DISABLED`; page redirects to `/app` when off
- Meta: `src/lib/console-page-meta.ts` `/app/gift-codes`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Shared shell rules: `app-console-shell.md`.
- Credits **USD microcents only** (Binance USD wallet) via `adjustWallet` + `TransactionType.GIFT_CODE`.
- Race-safe claim: `updateMany` AVAILABLE + unclaimed → credit → attach `transactionId`.
- Assigned codes (`assignedUserId`) redeemable only by that user; open codes = first claimer.
- **Store kill-switch:** Gift codes default **off** in Settings → Pages enable; must be enabled for customers.
- Banned users cannot claim.
- Paginated claim history — never dump all claims.
- Customer session required; Prisma only on server.

## 3. Permitted Edit Scopes (Write Fields)
- Claim form Input + Submit inside `HubPanelCard` (single action page, not an admin list editor).
- Claim list read-only rows + Load more.
- Link back to `/app/deposit`.
- Do not add multi-currency gift amounts — USD only.
