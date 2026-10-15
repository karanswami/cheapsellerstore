# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/reports` — live
- Page: `src/app/admin/(panel)/reports/page.tsx` → `ReportsWorkspace`
- Layout: `src/app/admin/(panel)/layout.tsx` → `AdminShell` + sidebar
- Components: `src/components/admin/reports/reports-workspace.tsx`
- Libs: `src/lib/issue-reports.ts`
- APIs:
  - `GET /api/admin/issue-reports?status=&kind=&page=&limit=&q=`
  - `PATCH /api/admin/issue-reports/[id]` `{ status, note }`
  - Legacy alias: `GET /api/admin/deposit-reports` (open DEPOSIT reports)
- Schema: `IssueReport` (KEY | DEPOSIT; OPEN → CLOSED)

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client never imports Prisma.
- Compact list + FilterChip status/kind; mutations only in detail Dialog.
- Reports from Premium users display a distinct **⭐ VIP Priority** badge in the list and detail modal.
- For KEY reports: displays product title, duration label, exact license key code with copy button, order ID, key ID, and exact purchase timestamp.
- For DEPOSIT reports: displays deposit ID, USD amount, local currency amount, payment rail/method, status, fail reason, deposit timestamp, and proof preview.
- Telegram push contains complete metadata (key code, product, duration, order ID, timestamps, deposit details, user info, explanation, screenshot link).
- No live reply thread — status + admin note only (visible to customer).
- Overview open-reports KPI counts IssueReport OPEN | IN_PROGRESS.

## 3. Permitted Edit Scopes (Write Fields)
- Filter chips; list row presentation; detail Dialog status actions + admin note; copy helpers for key/order/deposit IDs.
- Do not approve/reject deposits from this desk (use `/admin/deposits`).

