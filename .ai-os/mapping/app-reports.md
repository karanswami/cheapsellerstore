# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/app/reports`
- Shared shell: `app-console-shell.md`
- Page: `src/app/app/reports/page.tsx`
- Loading: `src/app/app/reports/loading.tsx` → `HubPageSkeleton`
- Components: `src/components/app/reports-view.tsx`
- Hub: `HubPageShell`, `HubHeaderBar`, `HubListStack` / `HubListRow`, `HubEmptyPanel`, `DialogShell`
- Libs: `src/lib/issue-reports.ts`
- APIs:
  - `GET/POST /api/reports` (list own + create; `?eligibleDeposits=1` / `?eligibleKeys=1` for pickers)
  - `GET /api/reports/[id]`
  - Screenshot upload via `POST /api/support/upload` → `/uploads/support/`
- Nav: Account → Reports in `customer-sidebar.tsx` (Flag)

## 2. Hard Governance Rules (Read-Only Guardrails)
- Shared shell rules: `app-console-shell.md`.
- Submit-only tickets (`IssueReport`) — **no live replies**.
- Premium members (`isPremium: true`) are flagged with VIP Priority Support queue and expedited review.
- Kinds: `KEY` (select purchased key + explanation; screenshot optional) · `DEPOSIT` (select FAILED/EXPIRED deposit; screenshot + explanation required).
- Create/detail mutations only inside `DialogShell` — list is read-only rows.
- Past tickets show admin reply (`adminNote`) on list rows + detail (refetch on open); awaiting state when none.
- Paginated list (`page`/`limit`) + Load more; never dump all tickets.
- Detail modal and list rows render key details (product title, duration, masked code, purchased date) for KEY reports, and deposit details (amount, currency, method, status, date) for DEPOSIT reports.

## 3. Permitted Edit Scopes (Write Fields)
- List row presentation; create Dialog fields; detail read-only Dialog with key/deposit summary cards.
- Do not revive SupportTicket reply threads on this page.
