# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/app/broadcast`
- Shared shell: `app-console-shell.md`
- Page: `src/app/app/broadcast/page.tsx`
- Loading: `src/app/app/broadcast/loading.tsx` → `HubPageSkeleton` (no toolbar/chips)
- Components: `src/components/app/broadcast-view.tsx`
- Hub: `HubPageShell` (`maxWidth="md"`), `HubHeaderBar`, `HubEmptyPanel`
- Libs: `src/lib/broadcasts.ts` (`listActiveBroadcastsForRole`)
- APIs: `GET /api/broadcasts` (session; active + audience-filtered)
- Nav: Account → Broadcast in `customer-sidebar.tsx` (Megaphone)

## 2. Hard Governance Rules (Read-Only Guardrails)
- Shared shell rules: `app-console-shell.md`.
- Shows **active** pinned `Broadcast` rows only (admin-managed); empty when none.
- Audience gate: ALL | USER | SELLER (incl. RESELLER) | ADMIN via `audiencesForRole`.
- Message bubbles only — no compose / reply UI.
- Optional `actionUrl` as Open CTA (internal Link or external anchor).

## 3. Permitted Edit Scopes (Write Fields)
- Bubble presentation; empty copy; header Active count.
- Do not add live chat or customer-created broadcasts.
