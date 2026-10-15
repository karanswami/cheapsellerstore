# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/cron` — live (System group)
- Page: `src/app/admin/(panel)/cron/page.tsx` · `loading.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `AdminShell` / `admin-sidebar.tsx` (Cron nav item)
- Components: `src/components/admin/cron/cron-workspace.tsx`, `admin-page-header.tsx`, `use-admin-fetch.ts`, `stats/kpi-card.tsx`
- Libs: `src/lib/admin-cron.ts` (overview + paginated runs), `src/lib/deposit-cron.ts` (`runDepositCronPoll`)
- Types: `src/types/admin-cron.ts`
- APIs:
  - `GET /api/admin/cron` — job cards + 24h stats + last run
  - `GET /api/admin/cron/runs?job=&page=&limit=&ok=` — paginated `DepositCronRun` history
  - `POST /api/admin/cron/run` — `{ job: "deposits" }` admin-triggered poll
- External cron (unchanged): `GET/POST /api/cron/deposits/poll` (`CRON_SECRET`) → same `runDepositCronPoll`
- Schema: `DepositCronRun` (1-hour rolling retention — auto-purged on each poll via `purgeExpiredDepositCronRuns`)
- User ticket windows: QRIS **10** / Binance **15** / INR **10** / MANUAL·ESEWA **30**; after expire, provider poll grace default **60 min** (`DEPOSIT_PROVIDER_GRACE_MINUTES`) so late confirms can still credit

## 2. Hard Governance Rules (Read-Only Guardrails)
- Admin JWT `role=ADMIN` only for `/api/admin/cron*`.
- Public cron endpoint still requires `CRON_SECRET` (Bearer / `x-cron-secret`).
- List is read-only rows/badges; **Run now** opens a confirm Dialog (no inline editors).
- Big list: server `page`/`limit` + Load more / infinite scroll; never dump all runs.
- Prisma only on server; client uses types from `@/types/admin-cron`.
- Money not shown here; deposit credit remains in deposit libs.

## 3. Permitted Edit Scopes (Write Fields)
- Trigger deposit poll via Dialog confirm → `POST /api/admin/cron/run`.
- Filter runs by ok/failed; open run detail Dialog (providers breakdown).
- No cron schedule editor in UI (schedule stays on VPS crontab).
