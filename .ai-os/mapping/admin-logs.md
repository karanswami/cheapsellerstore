# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/logs`
- Page: `src/app/admin/(panel)/logs/page.tsx` (+ `loading.tsx`)
- Layout: `src/app/admin/(panel)/layout.tsx` → `AdminShell` / `admin-sidebar.tsx` (Dashboard → Logs)
- Components: `src/components/admin/logs/logs-workspace.tsx`, `admin-page-header.tsx`
- Libs: `src/lib/activity-log.ts` (write + list + 7-day & 5,000-row capped purge + fallback drain), `src/lib/redis.ts` (local fast stream buffer + fallback queue), `src/lib/system-alert.ts` (instant Telegram alerts on DB/server errors), `src/lib/console-page-meta.ts`
- Types: `src/types/activity-log.ts`
- Schema: `ActivityLog`
- APIs: `GET /api/admin/logs?category=&page=&limit=&q=&success=`
- Writers (fire-and-forget `logActivity`): auth login/register/logout/2fa/google/password/profile; `orders.ts` purchase; `deposits.ts` create/cancel; `deposit-credit.ts` credit; `premium.ts`; admin users patch/delete/impersonate; `seller-api/keys.ts`
- Purge & Fallback Drain: `purgeExpiredActivityLogs` (7-day + 5000 max row cap) + `flushFallbackLogsToMongo` in deposit cron (`src/lib/deposit-cron.ts`) + opportunistic on write

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client never imports `@/lib/prisma`.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN`.
- List is read-only rows/badges; detail Dialog is inspect-only (no mutations).
- **Retention = 7 days & 5,000 capped rows** — queries filter `createdAt >= cutoff`; older rows and excess capped rows deleted by cron + occasional write-time purge to protect MongoDB 512MB free-tier space.
- **Smart Fallback** — writes buffer in Redis stream (<1ms, non-blocking); if MongoDB drops/errors, records buffer in `drip:logs:mongo_fallback_queue` (0% data loss) and replay on recovery.
- **Instant Telegram Alerts** — MongoDB/server/cron failures trigger immediate rich warning to Admin Telegram channel (`adminUpdate`) with Redis 60s throttling.
- Big list: server `page`/`limit` + infinite Load more; never dump all logs.
- `logActivity` must never throw to callers (auth/checkout/deposit must stay resilient).
- No unused key codes or secrets in metadata.

## 3. Permitted Edit Scopes (Write Fields)
- Filter chips by category (`AUTH` / `WALLET` / `ORDER` / `ACCOUNT` / `ADMIN` / `API` / `SECURITY`).
- Search `q` across message / username / email / action / IP / userId.
- Detail Dialog shows actor, IP, UA, metadata.
- No admin UI to edit/delete individual logs (retention purge only).
