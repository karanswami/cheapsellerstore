# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/deposits` — live
- Page: `src/app/admin/(panel)/deposits/page.tsx`
- Components: `src/components/admin/deposits/deposits-workspace.tsx`
- APIs: `GET /api/admin/deposits?page=&limit=&status=`, `PATCH /api/admin/deposits/[id]`, `POST /api/admin/deposits/[id]/recheck`
- Libs: `src/lib/deposits.ts`, `src/lib/deposit-credit.ts` (`expireOldDeposits` mongo-safe optional filters; `completeDepositOnce` blocks `User.banned`), `src/lib/deposit-recheck.ts`, `src/lib/deposit-labels.ts`, `src/types/manual-deposit.ts` (`isManualProofDeposit`)
- Cron: `src/app/api/cron/deposits/poll/route.ts` → `src/lib/deposit-cron.ts` (`runDepositCronPoll` → `expireOldDeposits`); admin monitor/trigger at `/admin/cron`
- Soft-expire on read: `getDepositStatusForUser` (user visit) — cron must also expire without requiring a visit
- Deposit list `user` select includes `banned` for queue badges / Approve gate
- Related: gift codes gated by Settings → Pages enable (`admin-gift-codes.md` / `GiftCode`) — not Deposit rows

## 2. Hard Governance Rules (Read-Only Guardrails)
- Admin JWT `role=ADMIN` only.
- Manual (`MANUAL` + legacy `ESEWA`): Approve/Reject with proof preview; approve blocked without `proofImage`. Reject opens dedicated Dialog with reason presets + custom input (`PATCH /api/admin/deposits/[id]` with `action: "reject"`, `note: reason`).
- Auto rails: Recheck (Binance history / QRIS history+status / Cashfree order payments).
- Credit only via `completeDepositOnce` (credit lock + wallet microcents).
- **Banned user hold:** `completeDepositOnce` refuses credit when `User.banned` (`user_banned`). Admin Approve / Recheck disabled; list + detail show Banned badge. Unban first or Reject.
- Money display via `formatMoney` (USD microcents).
- Default list filter: open queue (`PENDING` + `PROCESSING`); paginated — never load all at once.

## 3. Permitted Edit Scopes (Write Fields)
- Filter chips: Pending queue · Processing · All.
- Compact divide-y list rows with **inline proof thumbnail** when `proofImage` present; **Banned** badge when `user.banned`.
- Row tap opens detail Dialog with embedded screenshot preview (tap opens full size), and previous rejection reason if rejected.
- Approve / Reject / Recheck live in Dialog footer; Reject prompts dedicated `Reject Deposit` Dialog with reason presets & text field.
- List is read-only (badges + key facts); all mutations stay Dialog-scoped.
