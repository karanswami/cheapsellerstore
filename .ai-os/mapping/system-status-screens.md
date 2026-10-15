# System status screens

## 1. File Inventory
- Pages: `src/app/maintenance/page.tsx` (redirect → `/api/maintenance/enter`), `src/app/banned/page.tsx`, `src/app/session-expired/page.tsx`
- App errors: `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`
- Shared UI: `src/components/layout/system-status-screen.tsx` (+ `.module.css`)
- Maintenance: `src/lib/maintenance.ts`, `src/lib/maintenance-cookie.ts` (`drip_maintenance` edge cookie), `src/lib/system-status-paths.ts`, `src/components/layout/maintenance-gate.tsx`, `src/components/layout/maintenance-view.tsx` (**pinned** sticky banner — not dismissible Dialog)
- Enter: `GET /api/maintenance/enter` — clears non-admin session, stamps/clears `drip_maintenance`, redirects to `/` (or hub when maintenance ended)
- Offline: `public/offline.html`, `public/sw.js` (v2), `www/offline.html` (APK), `src/components/layout/offline-banner.tsx`, `src/components/layout/native-offline-banner.tsx`
- API: `GET /api/maintenance` (flag + syncs cookie), commerce blocks via `maintenanceApiBlock`; login/register/2FA/Google via `maintenanceLoginBlock`
- Auth signal: `GET /api/auth/me` may return `{ user: null, reason: "banned" | "maintenance" }`
- Proxy: `src/proxy.ts` stamps `x-drip-pathname`; on `drip_maintenance=1` + non-admin session → `/api/maintenance/enter` (no `/` ↔ `/app` loop); allows `/maintenance` `/banned` `/session-expired` without auth
- Chrome: `site-chrome.tsx` bare prefixes for system pages; admin Maintenance ON chip in `admin-shell.tsx`
- Root layout: `MaintenanceGate` takes optional `banner` (`InstallAppBanner`); banner hidden while maintenance notice is active on landing

## 2. Hard Governance Rules (Read-Only Guardrails)
- Maintenance setting is `AppSetting` key `maintenance_mode` (admin Settings Dialog only).
- Admins always bypass maintenance UI gate and commerce API block.
- Non-admins (and guests) see the **normal landing `/`** plus a **pinned** maintenance banner (Retry / auto-retry). Not dismissible; no install banner while notice is active.
- Other routes go through `/api/maintenance/enter` → `/` (legacy `/maintenance` also uses enter).
- During maintenance, **force-logout** every non-admin session (enter route + `/api/auth/me` `reason: maintenance`). Client must not send them to `/session-expired`.
- During maintenance, **only ADMIN** may sign in via email/password (login / 2FA); **Google login/register is fully blocked** (button hidden + OAuth start/callback reject before upsert). Register is closed.
- **AuthDialog warning:** opening login/register during maintenance shows a proactive warning Alert (`auth-maintenance-notice.tsx`) + register submit locked — before any API submit.
- **No public admin CTA** — guests use the regular header **Sign in** (`AuthDialog`). Non-admin auth failures return a soft “temporarily unavailable” message (never “only admins”).
- Logout uses hard `window.location.assign("/")` to avoid blank white from layout refresh races.
- Webhooks / cron / admin / auth / maintenance probe + enter APIs stay available during maintenance.
- Banned vs session-expired must not share the same toast — use dedicated routes. Maintenance logout is separate from session-expired.
- Status screens (banned / session / 404 / error) are full-viewport brand compositions (LiveWave + logo) — not dashboard cards. Maintenance uses pinned banner over landing.
- Do not cache `/api/*` in the service worker; document navigations fall back to `/offline.html`.
- Never self-fetch `/api/maintenance` from the proxy (hang risk) — use `drip_maintenance` cookie + enter route.

## 3. Permitted Edit Scopes (Write Fields)
- SystemStatusScreen variants / copy / CTAs
- Maintenance pinned banner copy / Retry behavior (`maintenance-view.tsx`)
- Maintenance gate exempt path list (`src/lib/maintenance.ts`) + `src/lib/system-status-paths.ts` + `src/lib/maintenance-cookie.ts`
- Offline HTML + SW cache version / precache list
- Auth-provider redirect targets for ban / session end / maintenance logout
- AI-OS routes / architecture when paths change
